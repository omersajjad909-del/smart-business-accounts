import { prisma } from "@/lib/prisma";
import { normalizePlanCode } from "@/lib/planLimits";

// ─── Active-student limit per plan ───────────────────────────────────────────
// Only ACTIVE students count. Left / graduated / applicant students are free, so a
// school is never punished for keeping its history.
//
// Defaults below; an admin can override per plan from the saved PLAN_CONFIG
// (`studentLimits: { starter, pro, enterprise, custom }`, null = no cap), the same
// way branch limits work. ENTERPRISE and CUSTOM default to no cap — capacity for
// those is agreed per customer, so it is set through that override, not promised here.

const DEFAULT_STUDENT_LIMITS: Record<string, number | null> = {
  STARTER: 300,
  PRO: 1000,
  ENTERPRISE: null,
  CUSTOM: null,
};

const PLAN_LABEL: Record<string, string> = { STARTER: "Starter", PRO: "Professional", ENTERPRISE: "Enterprise", CUSTOM: "Custom" };

export async function getStudentLimit(plan: string | null | undefined): Promise<number | null> {
  const code = normalizePlanCode(plan);
  let limit = DEFAULT_STUDENT_LIMITS[code] ?? DEFAULT_STUDENT_LIMITS.STARTER;
  try {
    const row = await prisma.activityLog.findFirst({ where: { action: "PLAN_CONFIG" }, orderBy: { createdAt: "desc" }, select: { details: true } });
    if (row?.details) {
      const configured = JSON.parse(row.details)?.studentLimits?.[code.toLowerCase()];
      if (configured !== undefined) limit = configured === null ? null : Number(configured);
    }
  } catch {}
  return limit;
}

export type StudentUsage = { plan: string; planLabel: string; limit: number | null; active: number; remaining: number | null; percent: number | null };

export async function getStudentUsage(companyId: string): Promise<StudentUsage> {
  const [company, active] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } }),
    prisma.schoolStudent.count({ where: { companyId, status: "ACTIVE" } }),
  ]);
  const plan = normalizePlanCode(company?.plan);
  const limit = await getStudentLimit(plan);
  return {
    plan, planLabel: PLAN_LABEL[plan] ?? plan, limit, active,
    remaining: limit === null ? null : Math.max(0, limit - active),
    percent: limit === null || limit === 0 ? null : Math.round((active / limit) * 100),
  };
}

/** Returns an error message when adding `adding` more active students would pass the plan limit, else null. */
export async function checkStudentLimit(companyId: string, adding = 1): Promise<string | null> {
  const u = await getStudentUsage(companyId);
  if (u.limit === null || u.active + adding <= u.limit) return null;
  return `Your ${u.planLabel} plan allows ${u.limit} active students and ${u.active} are in use. Upgrade your plan, or mark students who have left, to add more.`;
}
