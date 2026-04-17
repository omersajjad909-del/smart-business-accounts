export function normalizePlanCode(plan: string | null | undefined): string {
  const p = String(plan || "").trim().toUpperCase();
  if (p === "PROFESSIONAL") return "PRO";
  return p || "STARTER";
}

export function getMaxUsersForPlan(plan: string | null | undefined): number | null {
  const p = normalizePlanCode(plan);
  if (p === "ENTERPRISE") return 25;
  if (p === "CUSTOM")     return null;   // unlimited
  if (p === "PRO")        return 10;
  return 3;                              // STARTER: up to 3 users
}
