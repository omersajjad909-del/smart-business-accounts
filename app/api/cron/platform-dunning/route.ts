import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

// Two independent platform-access sweeps, both daily.
//
// Platform dunning state machine — Terms of Service promise:
//   * 7 days after first failed platform payment  → READ_ONLY
//   * 30 days after first failed platform payment → SUSPENDED
//
// Manual grant expiry — the offline equivalent, keyed on accessGrantedUntil:
//   * the day a granted period ends → READ_ONLY
//   * 30 days after that            → INACTIVE
// It lives here rather than in a cron of its own because this route is already
// scheduled daily; a new route would need its own cron-job.org entry, and an
// access gate that silently never runs is worse than no gate at all.
//
// Fire-and-forget so the response returns immediately (well under
// cron-job.org's 30s timeout) while the transition sweep continues in the
// background up to maxDuration. Intended schedule: daily at 15:00 UTC
// (3pm Karachi = 10am UTC, or use `0 15 * * *` for 3pm Karachi = 10am UTC).
//
// NOTE: relies on `Company.paymentFailedAt` — see webhook route + schema note.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const result = await processPlatformDunning();
      console.log("[cron] platform-dunning complete:", result);
    } catch (err: any) {
      console.error("[cron] platform-dunning error:", err);
    }

    // Runs even if the dunning sweep above threw — the two are independent
    // states and one failing must not leave the other unenforced.
    try {
      const result = await processExpiredManualGrants();
      console.log("[cron] manual-grant-expiry complete:", result);
    } catch (err: any) {
      console.error("[cron] manual-grant-expiry error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://usefinova.app";

// Statuses considered "healthy" — a company in one of these is not eligible
// for dunning transitions even if paymentFailedAt is set (edge case: user
// paid via alternate method but the reset webhook was missed).
const HEALTHY_STATUSES = new Set(["ACTIVE", "TRIALING"]);

// Statuses that mean the account is already in the terminal read-only or
// suspended state. Used to avoid re-emailing on every daily run.
const READ_ONLY_STATE = "READ_ONLY";
const SUSPENDED_STATE = "SUSPENDED";

type CompanyRow = {
  id: string;
  subscriptionStatus: string | null;
  paymentFailedAt: Date | null;
};

async function processPlatformDunning() {
  let transitionedToReadOnly = 0;
  let transitionedToSuspended = 0;
  let skipped = 0;

  // Raw query because `paymentFailedAt` may not be a Prisma-managed field yet.
  // If the column is missing at runtime this throws and the cron becomes a
  // no-op (logged in the outer catch above) — safe fallback.
  const rows = await prisma.$queryRawUnsafe<CompanyRow[]>(`
    SELECT "id", "subscriptionStatus", "paymentFailedAt"
      FROM "Company"
     WHERE "paymentFailedAt" IS NOT NULL
       AND ("subscriptionStatus" IS NULL OR "subscriptionStatus" NOT IN ('ACTIVE','TRIALING'))
  `).catch((err: any) => {
    console.error("[cron] platform-dunning query failed:", err?.message || err);
    return [] as CompanyRow[];
  });

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  for (const row of rows) {
    if (!row.paymentFailedAt) { skipped++; continue; }
    const currentStatus = (row.subscriptionStatus || "").toUpperCase();
    if (HEALTHY_STATUSES.has(currentStatus)) { skipped++; continue; }

    const daysSinceFailure = (now - new Date(row.paymentFailedAt).getTime()) / DAY;

    // 30-day suspension — checked first so accounts that skipped a day still
    // land in the correct terminal state.
    if (daysSinceFailure >= 30 && currentStatus !== SUSPENDED_STATE) {
      await prisma.company.update({
        where: { id: row.id },
        data:  { subscriptionStatus: SUSPENDED_STATE },
      }).catch(() => {});

      await prisma.activityLog.create({
        data: {
          companyId: row.id, userId: null,
          action: "PLATFORM_DUNNING_SUSPENDED",
          details: JSON.stringify({
            fromStatus: currentStatus,
            toStatus: SUSPENDED_STATE,
            paymentFailedAt: row.paymentFailedAt,
            daysSinceFailure: Math.floor(daysSinceFailure),
          }),
        },
      }).catch(() => {});

      await sendDunningTransitionEmail(row.id, "SUSPENDED");
      transitionedToSuspended++;
      continue;
    }

    // 7-day read-only lock
    if (daysSinceFailure >= 7 && currentStatus !== READ_ONLY_STATE && currentStatus !== SUSPENDED_STATE) {
      await prisma.company.update({
        where: { id: row.id },
        data:  { subscriptionStatus: READ_ONLY_STATE },
      }).catch(() => {});

      await prisma.activityLog.create({
        data: {
          companyId: row.id, userId: null,
          action: "PLATFORM_DUNNING_READ_ONLY",
          details: JSON.stringify({
            fromStatus: currentStatus,
            toStatus: READ_ONLY_STATE,
            paymentFailedAt: row.paymentFailedAt,
            daysSinceFailure: Math.floor(daysSinceFailure),
          }),
        },
      }).catch(() => {});

      await sendDunningTransitionEmail(row.id, "READ_ONLY");
      transitionedToReadOnly++;
      continue;
    }

    skipped++;
  }

  return {
    scanned: rows.length,
    transitionedToReadOnly,
    transitionedToSuspended,
    skipped,
  };
}

// ─── Manual grant expiry ──────────────────────────────────────────────────────

/** Read-only window after a granted period ends, matching the cancellation one. */
const GRANT_GRACE_DAYS = 30;
const EXPIRED_STATE = "INACTIVE";

/**
 * Closes access when a hand-granted period runs out.
 *
 * `GRANT_FREE_ACCESS` writes `accessGrantedUntil` and sets the company ACTIVE,
 * and nothing ever moved it back — so the date was real but unenforced almost
 * everywhere. `subscriptionGuard` does read it, but only 6 of the ~526 API
 * routes call that guard, and the dashboard's own paywall tests
 * `subscriptionStatus`, which stayed ACTIVE forever. A customer given 30 days
 * kept full use of the product after day 30.
 *
 * Rather than add a second gate, this moves the account onto the status the
 * product already understands: READ_ONLY for the grace window, then INACTIVE.
 * Both the paywall and the guard then do the right thing on their own.
 *
 * No email is sent. The admin already sees these accounts in the "expiring
 * within 7 days" banner on /admin/subscriptions, and a manual deal is renewed
 * by a conversation, not by a payment link.
 */
async function processExpiredManualGrants() {
  let transitionedToReadOnly = 0;
  let transitionedToInactive = 0;
  let skipped = 0;

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // A gateway subscriber never has this set, and the billing webhook clears it
  // when someone converts to a paid plan — so this only ever sees offline deals
  // whose agreed period has already passed.
  const rows = await prisma.company.findMany({
    where: { accessGrantedUntil: { not: null, lt: new Date() } },
    select: { id: true, subscriptionStatus: true, accessGrantedUntil: true },
  }).catch((err: any) => {
    console.error("[cron] manual-grant-expiry query failed:", err?.message || err);
    return [] as { id: string; subscriptionStatus: string | null; accessGrantedUntil: Date | null }[];
  });

  for (const row of rows) {
    if (!row.accessGrantedUntil) { skipped++; continue; }
    const currentStatus = (row.subscriptionStatus || "").toUpperCase();

    // Suspension is the terminal state of the payment-failure ladder above.
    // Nothing here should pull an account back out of it.
    if (currentStatus === SUSPENDED_STATE) { skipped++; continue; }

    const daysPastEnd = (now - row.accessGrantedUntil.getTime()) / DAY;
    const target = daysPastEnd > GRANT_GRACE_DAYS ? EXPIRED_STATE : READ_ONLY_STATE;

    // Already where it belongs — the sweep runs daily and must be a no-op on
    // every run after the first.
    if (currentStatus === target) { skipped++; continue; }

    await prisma.company.update({
      where: { id: row.id },
      data:  { subscriptionStatus: target },
    }).catch(() => {});

    await prisma.activityLog.create({
      data: {
        companyId: row.id, userId: null,
        action: target === EXPIRED_STATE ? "GRANT_EXPIRED_CLOSED" : "GRANT_EXPIRED_READ_ONLY",
        details: JSON.stringify({
          fromStatus: currentStatus,
          toStatus: target,
          accessGrantedUntil: row.accessGrantedUntil,
          daysPastEnd: Math.floor(daysPastEnd),
        }),
      },
    }).catch(() => {});

    if (target === EXPIRED_STATE) transitionedToInactive++;
    else transitionedToReadOnly++;
  }

  return {
    scanned: rows.length,
    transitionedToReadOnly,
    transitionedToInactive,
    skipped,
  };
}

async function sendDunningTransitionEmail(companyId: string, phase: "READ_ONLY" | "SUSPENDED") {
  try {
    const uc = await prisma.userCompany.findFirst({
      where:   { companyId, user: { role: { in: ["ADMIN", "OWNER"] } } },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!uc?.user?.email) return;

    const name = uc.user.name || "there";
    const updateUrl = `${APP_URL}/dashboard/settings/subscription`;

    const subject = phase === "READ_ONLY"
      ? "Your FinovaOS account is now read-only — update billing to restore access"
      : "Your FinovaOS account has been suspended — action required";

    const heading = phase === "READ_ONLY"
      ? "Account switched to read-only"
      : "Account suspended";

    const bodyMain = phase === "READ_ONLY"
      ? `Your platform payment has been failing for 7 days. As outlined in our Terms of Service, your account is now in <strong>read-only</strong> mode: you can view and export your data, but you cannot create or edit records. Update your payment method to restore full access.`
      : `Your platform payment has been failing for 30 days. As outlined in our Terms of Service, your account has been <strong>suspended</strong>. To restore access and prevent data purge, please update your payment method as soon as possible.`;

    const cta = phase === "READ_ONLY" ? "Update payment method" : "Restore access";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
        <h2 style="color:${phase === "READ_ONLY" ? "#b45309" : "#b91c1c"};">${heading}</h2>
        <p>Hi ${name},</p>
        <p>${bodyMain}</p>
        <p style="margin:24px 0;">
          <a href="${updateUrl}"
             style="display:inline-block;background:#0f766e;color:#fff;padding:12px 20px;
                    text-decoration:none;border-radius:6px;font-weight:600;">
            ${cta}
          </a>
        </p>
        <p style="color:#666;font-size:12px;margin-top:24px;">
          If you believe this is a mistake, reply to this email or contact
          <a href="https://finovaos.app/support" style="color:#0f766e;">finovaos.app/support</a>.
        </p>
      </div>
    `;

    await sendEmail({ to: uc.user.email, subject, html });
  } catch {}
}
