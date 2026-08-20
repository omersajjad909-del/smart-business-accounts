/**
 * Stage 6 — actually sending, slowly and with the brakes on.
 *
 * Every guard in this file exists because the failure it prevents is expensive
 * and slow to undo. A blacklisted sending domain takes weeks to recover; an
 * email to someone who unsubscribed is a legal problem, not a metrics problem.
 *
 * Nothing here sends anything that an admin has not explicitly approved. The
 * approval lives in OutreachEmail.status === "approved"; this module refuses
 * every other status.
 */

import { prisma } from "@/lib/prisma";
import { sendOutreachEmail, outreachTransportProblem } from "./transport";

const db = prisma as any;

/** Reserved and test TLDs that must never receive mail. */
const UNSENDABLE_SUFFIXES = [
  ".invalid", ".test", ".example", ".localhost", "example.com", "example.org", "example.net",
];

export type SendGuardResult = { ok: true } | { ok: false; reason: string };

export function isSendableAddress(email: string): SendGuardResult {
  const address = String(email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(address)) {
    return { ok: false, reason: "Not a valid email address." };
  }
  if (UNSENDABLE_SUFFIXES.some((suffix) => address.endsWith(suffix))) {
    return {
      ok: false,
      reason: "Placeholder or reserved domain — this is sample data, not a real prospect.",
    };
  }
  return { ok: true };
}

/** Master kill switch. Sending stays off until it is deliberately turned on. */
export function sendingEnabled(): boolean {
  return String(process.env.OUTREACH_SENDING_ENABLED || "").toLowerCase() === "true";
}

/** Platform-wide ceiling across every campaign, on top of each campaign's cap. */
export function globalDailyCap(): number {
  const value = Number(process.env.OUTREACH_GLOBAL_DAILY_CAP || 100);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 100;
}

export function postalAddress(): string {
  return (
    process.env.OUTREACH_POSTAL_ADDRESS ||
    "FinovaOS — postal address not configured (set OUTREACH_POSTAL_ADDRESS)"
  );
}

export function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://finovaos.app";
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function sentTodayCount(campaignId?: string): Promise<number> {
  return db.outreachEmail.count({
    where: {
      status: "sent",
      sentAt: { gte: startOfToday() },
      ...(campaignId ? { campaignId } : {}),
    },
  });
}

export async function isSuppressed(email: string): Promise<string | null> {
  const address = email.toLowerCase();
  const domain = address.split("@")[1] || null;

  const hit = await db.outreachSuppression.findFirst({
    where: { OR: [{ email: address }, ...(domain ? [{ domain, email: "" }] : [])] },
    select: { reason: true },
  });
  if (hit) return hit.reason;

  // Never cold-email someone who is already a FinovaOS user.
  const existing = await db.user.findFirst({ where: { email: address }, select: { id: true } });
  return existing ? "existing_customer" : null;
}

export async function addSuppression(email: string, reason: string, note?: string) {
  const address = email.toLowerCase();
  await db.outreachSuppression.upsert({
    where: { email: address },
    create: { email: address, domain: address.split("@")[1] || null, reason, note: note || null },
    update: { reason, note: note || null },
  });
}

async function logEvent(emailId: string, type: string, meta?: Record<string, unknown>) {
  await db.outreachEvent.create({ data: { emailId, type, meta: meta || undefined } }).catch(() => {});
}

export type SendBatchResult = {
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
  blocked: string | null;
  details: Array<{ id: string; to: string; outcome: string; reason?: string }>;
};

/**
 * Sends up to `limit` approved emails, respecting every cap and guard.
 *
 * Called by the cron job on a schedule rather than in a loop from the UI, so
 * the send rate is a property of the schedule and cannot be accelerated by
 * clicking harder.
 */
export async function sendApprovedBatch(options: {
  campaignId?: string;
  limit?: number;
  dryRun?: boolean;
}): Promise<SendBatchResult> {
  const result: SendBatchResult = {
    attempted: 0, sent: 0, skipped: 0, failed: 0, blocked: null, details: [],
  };

  const dryRun = options.dryRun === true;

  if (!dryRun && !sendingEnabled()) {
    result.blocked = "Sending is disabled. Set OUTREACH_SENDING_ENABLED=true to turn it on.";
    return result;
  }

  // Checked once per batch rather than per email: if the outreach domain is not
  // set up, every email in the queue would fail for the same reason, and each
  // failure would mark a good prospect as permanently failed.
  if (!dryRun) {
    const transportProblem = outreachTransportProblem();
    if (transportProblem) {
      result.blocked = transportProblem;
      return result;
    }
  }

  const globalSent = await sentTodayCount();
  const globalRemaining = globalDailyCap() - globalSent;
  if (!dryRun && globalRemaining <= 0) {
    result.blocked = `Global daily cap reached (${globalDailyCap()} sent today).`;
    return result;
  }

  const campaigns = await db.outreachCampaign.findMany({
    where: {
      status: { in: ["sending", "review"] },
      ...(options.campaignId ? { id: options.campaignId } : {}),
    },
    select: { id: true, dailyCap: true, sendFrom: true, name: true },
  });

  let budget = Math.min(options.limit ?? globalRemaining, dryRun ? (options.limit ?? 10) : globalRemaining);

  for (const campaign of campaigns) {
    if (budget <= 0) break;

    const campaignSent = await sentTodayCount(campaign.id);
    const campaignRemaining = Math.max(campaign.dailyCap - campaignSent, 0);
    if (campaignRemaining <= 0) continue;

    const queue = await db.outreachEmail.findMany({
      where: {
        campaignId: campaign.id,
        status: "approved",
        OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
      },
      orderBy: [{ step: "asc" }, { reviewedAt: "asc" }],
      take: Math.min(campaignRemaining, budget),
      include: { prospect: { select: { id: true, name: true } } },
    });

    for (const email of queue) {
      if (budget <= 0) break;
      result.attempted++;

      const sendable = isSendableAddress(email.toEmail);
      if (!sendable.ok) {
        result.skipped++;
        result.details.push({ id: email.id, to: email.toEmail, outcome: "skipped", reason: sendable.reason });
        await db.outreachEmail.update({
          where: { id: email.id },
          data: { status: "failed", failReason: sendable.reason },
        });
        await logEvent(email.id, "bounce", { guard: sendable.reason });
        continue;
      }

      const suppressedReason = await isSuppressed(email.toEmail);
      if (suppressedReason) {
        result.skipped++;
        result.details.push({ id: email.id, to: email.toEmail, outcome: "skipped", reason: `suppressed: ${suppressedReason}` });
        await db.outreachEmail.update({
          where: { id: email.id },
          data: { status: "unsubscribed", failReason: `Suppressed: ${suppressedReason}` },
        });
        continue;
      }

      if (dryRun) {
        result.sent++;
        budget--;
        result.details.push({ id: email.id, to: email.toEmail, outcome: "would-send" });
        continue;
      }

      const delivery = await sendOutreachEmail({
        to: email.toEmail,
        subject: email.subject,
        html: email.bodyHtml,
        text: email.bodyText,
        from: campaign.sendFrom,
        unsubscribeUrl: email.unsubToken
          ? `${baseUrl().replace(/\/$/, "")}/api/public/outreach-unsubscribe?token=${email.unsubToken}`
          : null,
      });

      if (delivery.success) {
        result.sent++;
        budget--;
        await db.outreachEmail.update({
          where: { id: email.id },
          data: { status: "sent", sentAt: new Date(), providerId: delivery.messageId || null, failReason: null },
        });
        await db.prospectCompany.update({
          where: { id: email.prospectId },
          data: { status: "sent" },
        }).catch(() => {});
        await logEvent(email.id, "sent", { messageId: delivery.messageId });
        result.details.push({ id: email.id, to: email.toEmail, outcome: "sent" });
      } else {
        result.failed++;
        await db.outreachEmail.update({
          where: { id: email.id },
          data: { status: "failed", failReason: delivery.error || "Unknown delivery failure" },
        });
        await logEvent(email.id, "bounce", { error: delivery.error });
        result.details.push({ id: email.id, to: email.toEmail, outcome: "failed", reason: delivery.error });
      }
    }
  }

  return result;
}
