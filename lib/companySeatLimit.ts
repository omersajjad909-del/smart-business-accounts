import { prisma } from "@/lib/prisma";
import { getMaxUsersForPlan, normalizePlanCode } from "@/lib/planLimits";

type PlanLimitsConfig = Record<string, number | null | undefined>;

function getPlanLimitFromConfig(plan: string | null | undefined, planLimits?: PlanLimitsConfig): number | null | undefined {
  if (!planLimits) return undefined;
  const normalized = normalizePlanCode(plan);
  const planKey = normalized === "PRO" ? "pro" : normalized.toLowerCase();
  return planLimits[planKey];
}

export async function getBaseUserLimitForPlan(plan: string | null | undefined): Promise<number | null> {
  let baseLimit = getMaxUsersForPlan(plan);
  try {
    const cfgRow = await prisma.activityLog.findFirst({
      where: { action: "PLAN_CONFIG" },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    if (cfgRow?.details) {
      const cfg = JSON.parse(cfgRow.details);
      const configuredLimit = getPlanLimitFromConfig(plan, cfg?.planLimits);
      if (configuredLimit !== undefined) {
        baseLimit = configuredLimit;
      }
    }
  } catch {}
  return baseLimit;
}

export async function getCompanyExtraSeats(companyId: string): Promise<number> {
  try {
    const seatOverride = await prisma.activityLog.findFirst({
      where: { companyId, action: "ADMIN_SEAT_OVERRIDE" },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    if (!seatOverride?.details) return 0;
    const parsed = JSON.parse(seatOverride.details || "{}");
    const extra = Number(parsed?.extraSeats ?? 0);
    return Number.isFinite(extra) ? Math.max(0, Math.floor(extra)) : 0;
  } catch {
    return 0;
  }
}

export async function getEffectiveUserLimitForCompany(companyId: string, plan: string | null | undefined): Promise<number | null> {
  const baseLimit = await getBaseUserLimitForPlan(plan);
  if (baseLimit === null) return null; // Unlimited base plan remains unlimited
  const extraSeats = await getCompanyExtraSeats(companyId);
  return Math.max(0, baseLimit + extraSeats);
}
