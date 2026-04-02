export function normalizePlanCode(plan: string | null | undefined): string {
  const p = String(plan || "").trim().toUpperCase();
  if (p === "PROFESSIONAL") return "PRO";
  return p || "STARTER";
}

export function getMaxUsersForPlan(plan: string | null | undefined): number | null {
  const p = normalizePlanCode(plan);
  if (p === "ENTERPRISE") return null;   // unlimited
  if (p === "CUSTOM")     return null;   // unlimited
  if (p === "PRO")        return 20;     // up to 20 users
  return 5;                              // STARTER: up to 5 users
}
