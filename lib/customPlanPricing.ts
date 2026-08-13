export const CUSTOM_PLAN_BASE_MONTHLY_USD = 15;
export const CUSTOM_PLAN_YEARLY_DISCOUNT = 0.2; // 20%

// Only modules that are a working product on their own are sold here.
//
// The list used to carry five more — Advanced Reports, Multi-Branch, WhatsApp &
// SMS, API Access, Tax & Compliance. Each of those is a layer over something
// else: Advanced Reports has nothing to report on by itself, Multi-Branch has
// nothing to branch, API Access has no data to expose. A customer could tick
// "Advanced Reports" alone, pay $8/mo and land in an app with no data in it.
//
// They are not gone from the product — CUSTOM_MODULE_PERMISSIONS still grants
// them, so every existing subscription keeps exactly what it bought. They are
// only off the self-serve menu until they can be sold as dependent add-ons
// that require a base module first.
// `pricePkr` is a real price, not a conversion.
//
// Pakistan pays about 29% of the global rate on every plan (Starter $49 vs
// PKR 3,999). Custom modules had no PKR price at all, so the page converted the
// USD one at the spot rate and charged a Pakistani customer the full
// international amount: all six modules came to PKR 25,020 against an
// Enterprise plan of PKR 19,999, and Accounting alone cost more than a whole
// Starter subscription. Nobody would have bought it.
export const CUSTOM_PLAN_MODULES = [
  { id: "accounting", name: "Accounting & Invoicing", price: 15, pricePkr: 2999 },
  { id: "inventory", name: "Inventory Management", price: 12, pricePkr: 2499 },
  { id: "crm", name: "CRM", price: 15, pricePkr: 2999 },
  { id: "hr_payroll", name: "HR & Payroll", price: 20, pricePkr: 3999 },
  { id: "trading", name: "Trading Desk", price: 18, pricePkr: 3499 },
  { id: "bank_reconciliation", name: "Bank Reconciliation", price: 10, pricePkr: 1999 },
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

/** The Pakistan list price for one module, or null if it has none. */
export function getModulePricePkr(id: string): number | null {
  const mod = CUSTOM_MODULE_MAP.get(id);
  return mod && "pricePkr" in mod ? (mod as { pricePkr: number }).pricePkr : null;
}

/**
 * Monthly total in rupees for a selection.
 *
 * Returns null when any chosen module has no PKR price of its own — callers
 * then fall back to the USD path rather than quietly billing a mix of a real
 * rupee price and a converted one.
 */
export function getCustomModulesMonthlyTotalPkr(moduleIds: string[]): number | null {
  let total = 0;
  for (const id of moduleIds) {
    const pkr = getModulePricePkr(id);
    if (pkr == null) return null;
    total += pkr;
  }
  return total;
}

export function getCustomPlanPerMonthForCyclePkr(
  moduleIds: string[],
  billingCycle: "MONTHLY" | "YEARLY",
): number | null {
  const monthly = getCustomModulesMonthlyTotalPkr(moduleIds);
  if (monthly == null) return null;
  return billingCycle === "YEARLY"
    ? Math.round(monthly * (1 - CUSTOM_PLAN_YEARLY_DISCOUNT))
    : monthly;
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
