export const CUSTOM_PLAN_BASE_MONTHLY_USD = 15;
export const CUSTOM_PLAN_YEARLY_DISCOUNT = 0.2; // 20%

export const CUSTOM_PLAN_MODULES = [
  { id: "accounting", name: "Accounting & Invoicing", price: 15 },
  { id: "inventory", name: "Inventory Management", price: 12 },
  { id: "crm", name: "CRM", price: 15 },
  { id: "hr_payroll", name: "HR & Payroll", price: 20 },
  { id: "bank_reconciliation", name: "Bank Reconciliation", price: 10 },
  { id: "reports", name: "Advanced Reports", price: 8 },
  { id: "multi_branch", name: "Multi-Branch", price: 15 },
  { id: "whatsapp", name: "WhatsApp & SMS", price: 8 },
  { id: "api_access", name: "API Access", price: 20 },
  { id: "tax_filing", name: "Tax & Compliance", price: 10 },
] as const;

const CUSTOM_MODULE_MAP = new Map(CUSTOM_PLAN_MODULES.map((m) => [m.id, m]));

export function parseCustomModules(modules: unknown): string[] {
  const raw =
    Array.isArray(modules)
      ? modules
      : typeof modules === "string"
        ? modules.split(",")
        : [];
  const unique = new Set<string>();
  for (const item of raw) {
    const id = String(item || "").trim();
    if (!id) continue;
    if (!CUSTOM_MODULE_MAP.has(id)) continue;
    unique.add(id);
  }
  return Array.from(unique);
}

export function getCustomModulesMonthlyTotalUsd(moduleIds: string[]): number {
  return moduleIds.reduce((sum, id) => sum + (CUSTOM_MODULE_MAP.get(id)?.price || 0), 0);
}

export function getCustomPlanMonthlyUsd(moduleIds: string[]): number {
  return CUSTOM_PLAN_BASE_MONTHLY_USD + getCustomModulesMonthlyTotalUsd(moduleIds);
}

export function getCustomPlanPerMonthForCycleUsd(
  moduleIds: string[],
  billingCycle: "MONTHLY" | "YEARLY",
): number {
  const monthly = getCustomPlanMonthlyUsd(moduleIds);
  return billingCycle === "YEARLY"
    ? Math.round(monthly * (1 - CUSTOM_PLAN_YEARLY_DISCOUNT))
    : monthly;
}

export function getCustomPlanCycleAmountUsd(
  moduleIds: string[],
  billingCycle: "MONTHLY" | "YEARLY",
): number {
  const perMonthForCycle = getCustomPlanPerMonthForCycleUsd(moduleIds, billingCycle);
  return billingCycle === "YEARLY" ? perMonthForCycle * 12 : perMonthForCycle;
}
