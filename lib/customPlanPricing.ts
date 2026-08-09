export const CUSTOM_PLAN_BASE_MONTHLY_USD = 15;
export const CUSTOM_PLAN_YEARLY_DISCOUNT = 0.2; // 20%

export const CUSTOM_PLAN_MODULES = [
  { id: "accounting", name: "Accounting & Invoicing", price: 15 },
  { id: "inventory", name: "Inventory Management", price: 12 },
  { id: "crm", name: "CRM", price: 15 },
  { id: "hr_payroll", name: "HR & Payroll", price: 20 },
  { id: "trading", name: "Trading Desk", price: 18 },
  { id: "bank_reconciliation", name: "Bank Reconciliation", price: 10 },
  { id: "reports", name: "Advanced Reports", price: 8 },
  { id: "multi_branch", name: "Multi-Branch", price: 15 },
  { id: "whatsapp", name: "WhatsApp & SMS", price: 8 },
  { id: "api_access", name: "API Access", price: 20 },
  { id: "tax_filing", name: "Tax & Compliance", price: 10 },
] as const;

// Modules that are a usable product on their own — a company can subscribe to
// just this one and still get a working app (payroll-only, CRM-only, …).
// Everything not listed here only makes sense layered on top of another module
// (Advanced Reports has nothing to report on by itself, Multi-Branch has
// nothing to branch, API Access has no data to expose).
export const STANDALONE_MODULE_IDS: readonly string[] = [
  "accounting",
  "inventory",
  "crm",
  "hr_payroll",
  "trading",
  "bank_reconciliation",
];

export function isStandaloneModule(id: string): boolean {
  return STANDALONE_MODULE_IDS.includes(String(id || "").trim().toLowerCase().replace(/-/g, "_"));
}

const CUSTOM_MODULE_MAP = new Map<string, typeof CUSTOM_PLAN_MODULES[number]>(CUSTOM_PLAN_MODULES.map((m) => [m.id, m]));

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
