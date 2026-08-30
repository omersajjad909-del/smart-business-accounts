import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { createManualPlatformInvoice } from "@/lib/platformInvoice";

/*
  POST /api/admin/billing/override
  Actions:
    - EXTEND_TRIAL      — set currentPeriodEnd to future date, status → TRIALING
    - GRANT_FREE_ACCESS — set plan + status → ACTIVE + currentPeriodEnd
    - RESET_INTRO_OFFER — delete BILLING_OFFER_CLAIM log (lets them use 50% off again)
    - SET_STATUS        — manually override subscriptionStatus only
    - SET_EXTRA_SEATS   — set company-level additional seats on top of plan limit
    - ADD_NOTE          — add an internal audit note
*/

const ALLOWED_ACTIONS = ["EXTEND_TRIAL", "GRANT_FREE_ACCESS", "RESET_INTRO_OFFER", "SET_STATUS", "SET_EXTRA_SEATS", "ADD_NOTE"];

// Five years. Long enough for any prepaid deal worth signing, short enough that
// a typo cannot hand out access for a decade.
const MAX_GRANT_DAYS = 1825;

/**
 * When a granted period ends.
 *
 * A contract names a date, not a number of days, and counting days gets that
 * date wrong: 1095 days after 30 Aug 2026 is 29 Aug 2029, not 30 Aug, because
 * 2028 is a leap year. A customer who paid for three years would lose the last
 * day of them. So a real deal sends `until` and the date is stored exactly as
 * agreed — as the last moment of that day, so the whole of it is theirs.
 *
 * `days` still works, for quick grants and for anything already calling this.
 */
function resolveGrantEnd(payload: { until?: unknown; days?: unknown } | null | undefined):
  | { end: Date }
  | { error: string } {
  const rawUntil = typeof payload?.until === "string" ? payload.until.trim() : "";

  if (rawUntil) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawUntil)) {
      return { error: "until must be a date in YYYY-MM-DD form" };
    }
    const end = new Date(`${rawUntil}T23:59:59.999Z`);
    if (Number.isNaN(end.getTime())) {
      return { error: "until is not a real date" };
    }
    return { end };
  }

  const days = Number(payload?.days);
  if (!days || days < 1 || days > MAX_GRANT_DAYS) {
    return { error: `days must be 1–${MAX_GRANT_DAYS}` };
  }
  const end = new Date();
  end.setDate(end.getDate() + days);
  return { end };
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const adminId = admin.id;

    const { companyId, action, payload, note } = await req.json();

    if (!companyId || !action) {
      return NextResponse.json({ error: "companyId and action required" }, { status: 400 });
    }
    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    let result: any = {};

    /* ── EXTEND_TRIAL ── */
    if (action === "EXTEND_TRIAL") {
      const { days } = payload || {};
      if (!days || days < 1 || days > 365) {
        return NextResponse.json({ error: "days must be 1–365" }, { status: 400 });
      }
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + Number(days));

      result = await prisma.company.update({
        where: { id: companyId },
        data: {
          subscriptionStatus: "TRIALING",
          currentPeriodEnd: newEnd,
        },
      });
    }

    /* ── GRANT_FREE_ACCESS ── */
    // Also the way an offline multi-year deal is entered: a customer who pays
    // by bank transfer for two or three years never touches a payment gateway,
    // so their access is granted here instead. The old 365-day ceiling meant a
    // three-year deal had to be re-granted every year from memory, and a missed
    // renewal locked out a customer who had already paid in full.
    if (action === "GRANT_FREE_ACCESS") {
      const { plan } = payload || {};

      const resolved = resolveGrantEnd(payload);
      if ("error" in resolved) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }
      const newEnd = resolved.end;

      if (newEnd.getTime() <= Date.now()) {
        return NextResponse.json({ error: "That end date has already passed" }, { status: 400 });
      }
      const furthest = new Date();
      furthest.setDate(furthest.getDate() + MAX_GRANT_DAYS);
      if (newEnd.getTime() > furthest.getTime()) {
        return NextResponse.json(
          { error: `Access cannot be granted more than ${MAX_GRANT_DAYS} days ahead` },
          { status: 400 },
        );
      }

      const grantedPlan = (plan || company.plan || "PRO").toUpperCase();

      result = await prisma.company.update({
        where: { id: companyId },
        data: {
          subscriptionStatus: "ACTIVE",
          plan: grantedPlan,
          currentPeriodEnd: newEnd,
          // The date the guards actually enforce. currentPeriodEnd is read by
          // no guard, so without this the grant never ends.
          accessGrantedUntil: newEnd,
        },
      });

      // The paperwork half of the same deal.
      //
      // Granting access records what the customer may do and nothing about what
      // they paid, so an offline deal left the ledger empty — and an empty
      // ledger makes the customer's billing page fall back to a row derived
      // from the plan's USD list price. A customer who paid in rupees by bank
      // transfer was shown a dollar receipt for a figure nobody had agreed. The
      // invoice is written here, against the same dates as the grant, so the
      // two can never describe different deals.
      if (payload?.recordInvoice) {
        const invoiceResult = await createManualPlatformInvoice({
          companyId,
          companyName: company.name,
          plan: grantedPlan,
          billingCycle: payload?.billingCycle || "YEARLY",
          currency: payload?.currency,
          amount: Number(payload?.amount),
          discount: payload?.discount,
          discountPercent: payload?.discountPercent,
          taxRate: payload?.taxRate,
          taxName: payload?.taxName,
          customerName: company.name,
          customerCountry: company.country || null,
          customerTaxId: payload?.customerTaxId,
          status: "PAID",
          periodStart: new Date(),
          periodEnd: newEnd,
          // Re-applying the same grant must not mint a second number, but
          // moving the end date is a new deal and gets its own invoice.
          reference: `grant:${companyId}:${newEnd.toISOString().slice(0, 10)}`,
        });

        if (invoiceResult.ok) {
          result = {
            ...result,
            invoice: {
              number: invoiceResult.invoice.number,
              total: invoiceResult.invoice.total,
              currency: invoiceResult.invoice.currency,
              duplicate: invoiceResult.duplicate,
            },
          };
        } else {
          // The grant is already applied and must not be rolled back over a
          // bookkeeping failure — but the admin has to know the invoice is
          // missing, or they will believe the customer has one.
          result = { ...result, invoiceError: invoiceResult.error };
        }
      }
    }

    /* ── RESET_INTRO_OFFER ── */
    if (action === "RESET_INTRO_OFFER") {
      await prisma.activityLog.deleteMany({
        where: { companyId, action: "BILLING_OFFER_CLAIM" },
      });
      result = { reset: true };
    }

    /* ── SET_STATUS ── */
    if (action === "SET_STATUS") {
      const { status } = payload || {};
      const VALID = ["ACTIVE", "INACTIVE", "TRIALING", "PAST_DUE", "CANCELED"];
      if (!status || !VALID.includes(status.toUpperCase())) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const nextStatus = status.toUpperCase();
      result = await prisma.company.update({
        where: { id: companyId },
        data: {
          subscriptionStatus: nextStatus,
          // Putting an account back to ACTIVE by hand clears any grant that had
          // already run out. Leaving a stale date behind would let the guards
          // close the account again the moment the next request came in, and
          // the admin who just reactivated it would have no idea why.
          ...(nextStatus === "ACTIVE" ? { accessGrantedUntil: null } : {}),
        },
      });
    }

    /* —— SET_EXTRA_SEATS —— */
    if (action === "SET_EXTRA_SEATS") {
      const extraSeatsRaw = Number(payload?.extraSeats ?? 0);
      if (!Number.isFinite(extraSeatsRaw) || extraSeatsRaw < 0 || extraSeatsRaw > 10000) {
        return NextResponse.json({ error: "extraSeats must be between 0 and 10000" }, { status: 400 });
      }
      const extraSeats = Math.floor(extraSeatsRaw);
      await prisma.activityLog.create({
        data: {
          companyId,
          userId: adminId,
          action: "ADMIN_SEAT_OVERRIDE",
          details: JSON.stringify({
            extraSeats,
            note: note || null,
            adminId,
            adminEmail: admin.email,
            timestamp: new Date().toISOString(),
          }),
        },
      });
      result = { extraSeats };
    }

    /* ── Always log the override ── */
    await prisma.activityLog.create({
      data: {
        companyId,
        userId: adminId,
        action: "ADMIN_BILLING_OVERRIDE",
        details: JSON.stringify({
          action,
          payload: payload || null,
          note: note || null,
          adminId,
          companyName: company.name,
          previousPlan: company.plan,
          previousStatus: company.subscriptionStatus,
          previousPeriodEnd: company.currentPeriodEnd,
          timestamp: new Date().toISOString(),
        }),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Override failed" }, { status: 500 });
  }
}

/* GET — fetch override history for a company */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const logs = await prisma.activityLog.findMany({
    where: { companyId, action: "ADMIN_BILLING_OVERRIDE" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ logs });
}
