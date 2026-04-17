import { prisma } from "@/lib/prisma";
import { normalizePlanCode } from "@/lib/planLimits";

const DEFAULT_BRANCH_LIMITS: Record<string, number | null> = {
  STARTER:    1,
  PRO:        3,
  ENTERPRISE: 10,
  CUSTOM:     null,
};

export function getDefaultBranchLimitForPlan(plan: string | null | undefined): number | null {
  const p = normalizePlanCode(plan);
  return DEFAULT_BRANCH_LIMITS[p] ?? 1;
}

export async function getBaseBranchLimitForPlan(plan: string | null | undefined): Promise<number | null> {
  let baseLimit = getDefaultBranchLimitForPlan(plan);
  try {
    const cfgRow = await prisma.activityLog.findFirst({
      where: { action: "PLAN_CONFIG" },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    if (cfgRow?.details) {
      const cfg = JSON.parse(cfgRow.details);
      const normalized = normalizePlanCode(plan).toLowerCase();
      const planKey = normalized === "pro" ? "pro" : normalized;
      const configured = cfg?.branchLimits?.[planKey];
      if (configured !== undefined) baseLimit = configured === null ? null : Number(configured);
    }
  } catch {}
  return baseLimit;
}

export async function getEffectiveBranchLimit(companyId: string, plan: string | null | undefined): Promise<number | null> {
  return getBaseBranchLimitForPlan(plan);
}

export async function getCompanyBranchCount(companyId: string): Promise<number> {
  try {
    return await prisma.branch.count({ where: { companyId, isActive: true } });
  } catch {
    return 0;
  }
}
