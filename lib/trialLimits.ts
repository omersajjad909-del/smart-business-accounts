/**
 * Usage caps for a company that is still on its free trial.
 *
 * A no-card trial costs real money per use: every AI call and every SMS is paid
 * for by us, and a trial user has paid nothing. These caps keep that bounded
 * without taking the feature away — a trial can still try an AI invoice or send
 * a payment reminder, just not a hundred of them.
 *
 * Only a company that is TRIALING with a trialEndsAt is capped. A paying
 * company, and every account that existed before trials launched, is never
 * touched. Each use writes one ActivityLog row, and the count is those rows
 * since the trial began, so no new table is needed.
 */

import { prisma } from "@/lib/prisma";

export type TrialQuotaKind = "AI" | "SMS";

function limitFor(kind: TrialQuotaKind): number {
  const env = Number(process.env[`TRIAL_${kind}_LIMIT`]);
  if (Number.isFinite(env) && env > 0) return env;
  return kind === "AI" ? 50 : 20;
}

export type TrialQuota = { ok: true } | { ok: false; message: string; limit: number };

/**
 * Take one use of `kind` for this company, or say why not. Call it immediately
 * before the paid action, and only do the action when `ok` is true.
 */
export async function consumeTrialQuota(companyId: string, kind: TrialQuotaKind): Promise<TrialQuota> {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { subscriptionStatus: true, trialStartedAt: true, trialEndsAt: true },
    });
    if (!company || !company.trialEndsAt) return { ok: true };
    if (String(company.subscriptionStatus || "").toUpperCase() !== "TRIALING") return { ok: true };

    const limit = limitFor(kind);
    const action = `TRIAL_USAGE_${kind}`;
    const used = await prisma.activityLog.count({
      where: {
        companyId,
        action,
        ...(company.trialStartedAt ? { createdAt: { gte: company.trialStartedAt } } : {}),
      },
    });
    if (used >= limit) {
      const what = kind === "AI" ? "AI requests" : "SMS messages";
      return {
        ok: false,
        limit,
        message: `Your free trial includes ${limit} ${what}, and you have used them all. Choose a plan to keep going.`,
      };
    }
    await prisma.activityLog.create({ data: { companyId, action } });
    return { ok: true };
  } catch (e) {
    // A failure of the meter must never cost a customer their feature.
    console.error("[trialLimits] check failed:", e);
    return { ok: true };
  }
}
