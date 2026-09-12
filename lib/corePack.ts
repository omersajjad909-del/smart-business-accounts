// ─────────────────────────────────────────────────────────────
//  Core Pack — "what shape of paperwork does this trade run?"
//
//  The dashboard used to hand every business type the same 132 core pages. A
//  travel agency got Purchase Order, GRN, Warehouse Transfers and Batch &
//  Serial; a salon would have got them too. Business type could only ever *add*
//  its industry pages on top — nothing subtracted, because nothing knew how.
//
//  Listing 132 pages per business type by hand is 8,000 decisions nobody can
//  keep true. So each business type instead declares seven facts about its
//  paperwork, and the core page list is derived from those. Adding a trade is
//  seven lines, not a hundred and thirty.
//
//  This is the ownership half of page access, and it is separate from the plan
//  half on purpose:
//
//    "does this trade use the page?"  → this file
//    "did they pay for it?"           → Plans → Pages & Modules
//
//  A page has to pass both. Neither can stand in for the other: a salon on the
//  Enterprise plan still has no use for a GRN, and a trading company on Starter
//  still does.
// ─────────────────────────────────────────────────────────────

import type { ModuleKey } from "./businessModules";

/**
 * How goods and money come *in*.
 *
 *   none    — buys nothing worth a document (an investor placing capital)
 *   invoice — buys, and books the bill directly (a salon buying colour, an
 *             agency buying airline stock): supplier bill, no approval chain
 *   po_grn  — the full chain: order the goods, receive them against the order,
 *             then book the bill
 */
export type PurchaseDepth = "none" | "invoice" | "po_grn";

/**
 * How goods and money go *out*.
 *
 *   none          — nothing is sold (an investor takes a share, not a sale)
 *   bill          — a bill at the counter, settled on the spot
 *   quote_invoice — quote first, invoice on acceptance (services, travel)
 *   order_challan — order → challan → invoice, because something physical is
 *                   dispatched and has to be signed for
 */
export type SalesDepth = "none" | "bill" | "quote_invoice" | "order_challan";

/**
 * What the business holds on a shelf.
 *
 *   none        — nothing (a law firm, a travel agency)
 *   consumables — things used up delivering the service, counted so they do not
 *                 run out mid-appointment (salon colour, restaurant provisions)
 *   full        — stock is the business: valued, moved, aged, reconciled
 */
export type StockDepth = "none" | "consumables" | "full";

export interface CorePack {
  purchaseDepth: PurchaseDepth;
  salesDepth: SalesDepth;
  stockDepth: StockDepth;
  /** Staff on a payroll, not just an owner drawing from capital. */
  payroll: boolean;
  /** More than one location worth separating in the books. */
  multiBranch: boolean;
  /** A sales pipeline worth tracking — leads, opportunities, follow-ups. */
  crm: boolean;
  /** Budgets and cost centres, i.e. costs are managed per unit, not just booked. */
  costing: boolean;
}

/**
 * The pack a business type gets when it has not declared one.
 *
 * Deliberately the widest pack rather than the narrowest: a trade nobody has
 * profiled yet should look the way the dashboard looked before packs existed,
 * so forgetting to add an entry here costs a cluttered sidebar and never a
 * customer locked out of a page they were using.
 */
export const DEFAULT_CORE_PACK: CorePack = {
  purchaseDepth: "po_grn",
  salesDepth: "order_challan",
  stockDepth: "full",
  payroll: true,
  multiBranch: true,
  crm: true,
  costing: true,
};

// ─────────────────────────────────────────────────────────────
//  Shapes
//
//  Most trades fall into one of a dozen paperwork shapes, so the shapes are
//  named once and the table below points at them. A trade that is genuinely
//  its own shape spells its pack out inline — that is the signal that it is
//  unusual, not an oversight.
// ─────────────────────────────────────────────────────────────

/** Stock is the business: ordered, received, valued, moved, aged. */
const GOODS_TRADER: CorePack = {
  purchaseDepth: "po_grn", salesDepth: "order_challan", stockDepth: "full",
  payroll: true, multiBranch: true, crm: true, costing: true,
};

/** The same, for a shop that sells rather than plans — no budgets or cost centres. */
const GOODS_SHOP: CorePack = { ...GOODS_TRADER, costing: false };

/** Buys goods, sells across a counter: spare parts, a repair shop's bench stock. */
const PARTS_COUNTER: CorePack = {
  purchaseDepth: "invoice", salesDepth: "bill", stockDepth: "full",
  payroll: true, multiBranch: true, crm: true, costing: false,
};

/** A kitchen: provisions in on order, plates out at the table, recipes costed. */
const KITCHEN: CorePack = {
  purchaseDepth: "po_grn", salesDepth: "bill", stockDepth: "consumables",
  payroll: true, multiBranch: true, crm: true, costing: true,
};

/** Quotes work, invoices on acceptance, holds nothing on a shelf. */
const SERVICE_FIRM: CorePack = {
  purchaseDepth: "invoice", salesDepth: "quote_invoice", stockDepth: "none",
  payroll: true, multiBranch: true, crm: true, costing: false,
};

/** The same, where the work is a project with a budget to hold it to. */
const PROJECT_FIRM: CorePack = { ...SERVICE_FIRM, costing: true };

/** Service delivered over a counter, with consumables used up doing it. */
const COUNTER_SERVICE: CorePack = {
  purchaseDepth: "invoice", salesDepth: "bill", stockDepth: "consumables",
  payroll: true, multiBranch: true, crm: true, costing: false,
};

/** Bills on a cycle rather than per job: subscriptions, memberships, meters. */
const RECURRING_BILLER: CorePack = {
  purchaseDepth: "invoice", salesDepth: "bill", stockDepth: "none",
  payroll: true, multiBranch: true, crm: true, costing: false,
};

/** Meter-read utilities — recurring billing, but with plant and spares to fund. */
const UTILITY: CorePack = {
  purchaseDepth: "invoice", salesDepth: "bill", stockDepth: "consumables",
  payroll: true, multiBranch: true, crm: true, costing: true,
};

/** Hires an asset out and back: the asset is not stock, the spares are. */
const RENTAL: CorePack = {
  purchaseDepth: "invoice", salesDepth: "quote_invoice", stockDepth: "consumables",
  payroll: true, multiBranch: true, crm: true, costing: false,
};

/** Beds, wards and classrooms: ordered supplies, billed at a desk, budgeted. */
const INSTITUTION: CorePack = {
  purchaseDepth: "po_grn", salesDepth: "bill", stockDepth: "consumables",
  payroll: true, multiBranch: true, crm: true, costing: true,
};

// ─────────────────────────────────────────────────────────────
//  Per-business packs
//
//  Two id vocabularies reach this table: BUSINESS_PHASE_CONFIG in
//  businessModules.ts (what business-setup writes to company.businessType) and
//  ALL_BUSINESS_TYPES in businessTypes.ts (what the admin panel lists), which
//  spell several trades differently — "service" / "services", "car_workshop" /
//  "automotive". Both spellings are entered so a company lands on its real pack
//  whichever list it was created from, rather than silently on the wide default.
// ─────────────────────────────────────────────────────────────
export const CORE_PACKS: Record<string, CorePack> = {

  // ── Commerce — stock is the business ──────────────────────
  trading: GOODS_TRADER,
  wholesale: GOODS_TRADER,
  distribution: GOODS_TRADER,
  import_company: GOODS_TRADER,
  export_company: GOODS_TRADER,
  manufacturing: GOODS_TRADER,
  food_processing: GOODS_TRADER,
  garments: GOODS_TRADER,
  textile_mill: GOODS_TRADER,
  steel_mill: GOODS_TRADER,
  chemical: GOODS_TRADER,
  mining: GOODS_TRADER,
  oil_gas: GOODS_TRADER,
  printing_press: GOODS_TRADER,
  printing: GOODS_TRADER,
  agriculture: GOODS_TRADER,
  construction: GOODS_TRADER,
  solar_company: GOODS_TRADER,
  solar: GOODS_TRADER,
  chain_store: GOODS_TRADER,
  enterprise: GOODS_TRADER,
  general: GOODS_TRADER,

  // Retail sells over a counter, but its own Sales group links Quotation and
  // Delivery Challan for the shop that also supplies trade customers — so the
  // sales depth stays the full ladder. Budgets and cost centres are the one
  // thing a shop floor does not run.
  retail: GOODS_SHOP,
  supermarket: GOODS_SHOP,
  ecommerce: GOODS_SHOP,
  subscription_box: GOODS_SHOP,
  hardware: GOODS_SHOP,
  spare_parts: GOODS_SHOP,
  car_showroom: GOODS_SHOP,
  bakery: GOODS_SHOP,
  cold_storage: GOODS_SHOP,
  water_plant: GOODS_SHOP,
  shipping: GOODS_SHOP,

  // Batch and expiry decide whether a pharmacy is compliant, so it keeps the
  // full stock ladder even though it bills at a counter.
  pharmacy: { ...GOODS_SHOP, salesDepth: "bill" },

  // ── Workshops and parts counters ──────────────────────────
  car_workshop: PARTS_COUNTER,
  automotive: PARTS_COUNTER,
  mobile_repair: PARTS_COUNTER,
  computer_repair: PARTS_COUNTER,
  electronics_repair: PARTS_COUNTER,
  repair: PARTS_COUNTER,

  // ── Food service ──────────────────────────────────────────
  restaurant: KITCHEN,
  franchise_restaurant: KITCHEN,

  // ── Beds, wards, classrooms ───────────────────────────────
  hotel: INSTITUTION,
  hospital: INSTITUTION,
  hospital_chain: INSTITUTION,
  school: INSTITUTION,
  university: INSTITUTION,

  // A clinic is a consulting room, not a ward: supplies arrive on a bill.
  clinic: COUNTER_SERVICE,

  // ── Counter services — consumables used up serving the customer ──
  //
  // A salon buys colour, shampoo and consumables and needs to know when they
  // are running out — so it gets a supplier bill and a light stock count. What
  // it does not get is the goods pipeline: no purchase order to raise, no GRN
  // to receive against, no delivery challan, no warehouse, no stock valuation.
  // That distinction — "buys, but does not trade" — is the whole reason this
  // file exists.
  salon: COUNTER_SERVICE,
  gym: COUNTER_SERVICE,
  security: COUNTER_SERVICE,
  courier: COUNTER_SERVICE,

  // ── Professional and creative firms ───────────────────────
  service: SERVICE_FIRM,
  services: SERVICE_FIRM,
  law_firm: SERVICE_FIRM,
  accounting_firm: SERVICE_FIRM,
  audit_firm: SERVICE_FIRM,
  consultancy_firm: SERVICE_FIRM,
  insurance: SERVICE_FIRM,
  microfinance: SERVICE_FIRM,

  architecture_firm: PROJECT_FIRM,
  it_company: PROJECT_FIRM,
  advertising_agency: PROJECT_FIRM,
  advertising: PROJECT_FIRM,
  digital_marketing: PROJECT_FIRM,
  media_house: PROJECT_FIRM,
  production_house: PROJECT_FIRM,
  media: PROJECT_FIRM,
  equipment_maintenance: PROJECT_FIRM,
  aviation: PROJECT_FIRM,

  // Per-trip costing is the whole game in transport, and the vehicles run on
  // fuel, tyres and spares rather than saleable stock.
  transport: { ...PROJECT_FIRM, stockDepth: "consumables" },

  // A C&F agent's "goods" belong to the client and never enter its own stock.
  // It buys services — port charges, transport — on a direct bill.
  clearing_forwarding: SERVICE_FIRM,

  // A travel agency holds no stock at all: a ticket is issued, not shipped. It
  // buys — airline settlements, embassy fees — but on a direct bill, with no
  // order to receive against. Branches stay on: agencies run city offices.
  travel: SERVICE_FIRM,

  // Events are quoted, budgeted and then consume decor, catering and hire.
  event_planner: { ...PROJECT_FIRM, stockDepth: "consumables" },
  wedding_planner: { ...PROJECT_FIRM, stockDepth: "consumables" },
  events: { ...PROJECT_FIRM, stockDepth: "consumables" },
  decorator: { ...PROJECT_FIRM, stockDepth: "consumables" },
  sound_services: RENTAL,

  // ── Rentals — the asset is not stock, the spares are ──────
  equipment_rental: RENTAL,
  generator_rental: RENTAL,
  car_rental: RENTAL,
  property_rental: { ...RENTAL, stockDepth: "none" },
  real_estate: { ...RENTAL, stockDepth: "none" },

  // ── Billed on a cycle, not per job ────────────────────────
  saas_company: RECURRING_BILLER,
  saas: RECURRING_BILLER,
  membership_website: RECURRING_BILLER,
  telecom: RECURRING_BILLER,
  isp: { ...RECURRING_BILLER, stockDepth: "consumables" },
  cable_network: { ...RECURRING_BILLER, stockDepth: "consumables" },

  // Royalty and brand compliance, billed to outlets that hold their own stock.
  franchise_brand: { ...PROJECT_FIRM },
  franchise: { ...PROJECT_FIRM },

  // ── Metered utilities ─────────────────────────────────────
  electric_company: UTILITY,
  gas_distribution: UTILITY,
  water_supply: UTILITY,
  power_plant: UTILITY,

  // ── Donor-funded ──────────────────────────────────────────
  //
  // Money arrives as a donation, not a sale, and leaves against a grant line.
  // The receipt side is the only "selling" an NGO does.
  ngo: {
    purchaseDepth: "invoice", salesDepth: "bill", stockDepth: "consumables",
    payroll: true, multiBranch: true, crm: true, costing: true,
  },

  // ── Finance ───────────────────────────────────────────────
  //
  // An investor neither buys nor sells: capital goes in, a share of someone
  // else's output comes back. Every sales and purchase document is noise, and
  // the whole workspace is the investor pages plus the ledger behind them.
  investor: {
    purchaseDepth: "none", salesDepth: "none", stockDepth: "none",
    payroll: true, multiBranch: false, crm: false, costing: false,
  },
};

export function getCorePack(businessType: string): CorePack {
  return CORE_PACKS[String(businessType || "").trim()] || DEFAULT_CORE_PACK;
}

/** True when this business type has a profiled pack rather than the fallback. */
export function hasCorePack(businessType: string): boolean {
  return Object.prototype.hasOwnProperty.call(CORE_PACKS, String(businessType || "").trim());
}

// ─────────────────────────────────────────────────────────────
//  Rules — one table, read top to bottom
//
//  Each rule names the registry page ids it covers and the question the pack
//  has to answer for them. A page listed in no rule is universal: every trade
//  keeps its own books, pays its own taxes and reads its own P&L.
// ─────────────────────────────────────────────────────────────

type PackTest = (p: CorePack) => boolean;

const buys: PackTest = (p) => p.purchaseDepth !== "none";
const buysOnOrder: PackTest = (p) => p.purchaseDepth === "po_grn";
const sells: PackTest = (p) => p.salesDepth !== "none";
const quotes: PackTest = (p) => p.salesDepth === "quote_invoice" || p.salesDepth === "order_challan";
const dispatches: PackTest = (p) => p.salesDepth === "order_challan";
const holdsStock: PackTest = (p) => p.stockDepth !== "none";
const tradesStock: PackTest = (p) => p.stockDepth === "full";
const hasPayroll: PackTest = (p) => p.payroll;
const hasCrm: PackTest = (p) => p.crm;
const hasCosting: PackTest = (p) => p.costing;
const hasBranches: PackTest = (p) => p.multiBranch;

const CORE_PAGE_RULES: { when: PackTest; ids: string[] }[] = [
  // ── Sales & Purchase ──────────────────────────────────────
  { when: buysOnOrder, ids: [
    "CORE_PURCHASE_ORDER",
    "CORE_GRN",
    "CORE_LANDED_COST",
    "CORE_REPORTS_PO_TRACKING",
  ] },
  { when: buys, ids: [
    "CORE_PURCHASE_INVOICE",
    "CORE_SUPPLIER_STATEMENT",
    "CORE_BULK_PAYMENTS",
    "CORE_REPORTS_SUPPLIER_PERFORMANCE",
  ] },
  { when: sells, ids: [
    "CORE_INVOICES",
    "CORE_SALES_INVOICE",
    "CORE_CUSTOMER_STATEMENT",
    "CORE_PAYMENT_FOLLOWUP",
    "CORE_REPORTS_SALES",
    "CORE_REPORTS_CUSTOMER_PROFITABILITY",
    "CORE_REPORTS_DISCOUNT_ANALYSIS",
    "CORE_REPORTS_BAD_DEBTS",
    "CORE_REPORTS_CREDIT_ANALYSIS",
  ] },
  { when: quotes, ids: [
    "CORE_QUOTATION",
    "CORE_REPORTS_SALESMAN_PERFORMANCE",
  ] },
  // A challan is a receipt for something physical leaving the building. A trade
  // that issues tickets or bills at a counter has nothing to dispatch.
  { when: dispatches, ids: [
    "CORE_DELIVERY_CHALLAN",
    "CORE_OUTWARD",
    "CORE_REPORTS_OUTWARD",
    "CORE_REPORTS_ORDER_FULFILLMENT",
    "CORE_REPORTS_DELIVERY_PERFORMANCE",
    "CORE_REPORTS_SALES_REGION",
  ] },

  // ── Inventory ─────────────────────────────────────────────
  // Consumables get the pages that answer "am I about to run out?" and nothing
  // that treats stock as an asset class.
  { when: holdsStock, ids: [
    "CORE_INVENTORY",
    "CORE_ITEMS_NEW",
    "CORE_STOCK_RATE",
    "CORE_REPORTS_STOCK",
    "CORE_REPORTS_STOCK_LOW",
    "CORE_REPORTS_STOCK_EXPIRY",
    "CORE_REPORTS_INVENTORY_STOCK_SUMMARY",
    "CORE_REPORTS_COGS",
    "CORE_REPORTS_PRODUCT_PROFITABILITY",
  ] },
  { when: tradesStock, ids: [
    "CORE_PRODUCT_VARIANTS",
    "CORE_BATCH_TRACKING",
    "CORE_BARCODE",
    "WHOLESALE_PRICE_LISTS",
    "CORE_PROMOTIONS",
    "CORE_PURCHASE_RETURN",
    "CORE_SALE_RETURN",
    "CORE_REPORTS_RETURNS_ANALYSIS",
    "CORE_REPORTS_STOCK_LEDGER",
    "CORE_REPORTS_STOCK_MOVEMENT",
    "CORE_REPORTS_INVENTORY_INWARD",
    "CORE_REPORTS_STOCK_DEAD",
    "CORE_REPORTS_STOCK_TURNOVER",
    "CORE_REPORTS_STOCK_VALUATION",
    "CORE_REPORTS_STOCK_WAREHOUSE",
    "JOB_WORK",
  ] },
  // A warehouse is a warehouse whatever you sell — but only once there is more
  // than one place to keep it and something physical to put there.
  { when: (p) => tradesStock(p) && hasBranches(p), ids: [
    "WHOLESALE_WAREHOUSES",
    "TRADING_WAREHOUSE_TRANSFERS",
  ] },

  // ── People, pipeline, planning ────────────────────────────
  { when: hasPayroll, ids: [
    "CORE_HR_PAYROLL",
    "CORE_EMPLOYEES",
    "CORE_ATTENDANCE",
    "CORE_ATTENDANCE_DEVICES",
    "CORE_PAYROLL",
    "CORE_ADVANCE_SALARY",
  ] },
  { when: hasCrm, ids: [
    "CORE_CRM",
    "CORE_CRM_CONTACTS",
    "CORE_CRM_OPPORTUNITIES",
    "CORE_CRM_INTERACTIONS",
  ] },
  { when: hasCosting, ids: [
    "CORE_BUDGET",
    "CORE_COST_CENTERS",
    "CORE_DEPARTMENT_BUDGETS",
    "CORE_REPORTS_BUDGET_VS_ACTUAL",
  ] },
  { when: hasBranches, ids: [
    "CORE_BRANCHES",
  ] },
];

/** Every core id any rule mentions — used to tell "gated" from "universal". */
const RULED_IDS: Set<string> = new Set(CORE_PAGE_RULES.flatMap((rule) => rule.ids));

/**
 * The core pages a pack owns.
 *
 * Universal pages — the ledger, the vouchers, the P&L, settings, the AI tools —
 * are not in the rules table at all, so they are answered by the `core` flag
 * alone and stay available to every trade. `coreIds` is passed in rather than
 * imported so this file does not have to depend on the registry, which depends
 * on the plan ladder, which depends on permissions.
 */
export function corePackAllows(pack: CorePack, featureId: string): boolean {
  if (!RULED_IDS.has(featureId)) return true;
  return CORE_PAGE_RULES.some((rule) => rule.ids.includes(featureId) && rule.when(pack));
}

/** Same question, keyed by business type. */
export function businessOwnsCoreFeature(businessType: string, featureId: string): boolean {
  return corePackAllows(getCorePack(businessType), featureId);
}

// ─────────────────────────────────────────────────────────────
//  Sidebar modules
//
//  `hasModule` gates the industry NavGroups and a handful of individual links.
//  Deriving the core half of every module list from the same pack is what keeps
//  the two answers from drifting: before this, travel's list was built from an
//  older CORE constant and claimed the agency had no payroll and no P&L, while
//  the sidebar showed it both.
// ─────────────────────────────────────────────────────────────

/** Every trade keeps books, pays tax, runs reports and reads its own numbers. */
const UNIVERSAL_MODULES: ModuleKey[] = [
  "dashboard", "ai_assistant",
  "business_guide", "owner_dashboard", "ai_intelligence", "business_operator", "automation",
  "chart_of_accounts", "cpv", "crv", "jv", "contra", "advance_payment",
  "petty_cash", "credit_note", "debit_note", "bank_reconciliation",
  "payment_receipts", "expense_vouchers", "tax_configuration",
  "loans", "recurring", "admin_settings", "opening_balances",
  "ledger", "trial_balance", "profit_loss", "balance_sheet", "ageing_report", "cash_flow",
  "audit_trail", "fixed_assets",
];

const MODULE_RULES: { when: PackTest; keys: ModuleKey[] }[] = [
  { when: hasPayroll, keys: ["employees", "payroll", "attendance", "advance_salary", "hr_payroll"] },
  { when: hasCrm, keys: ["crm"] },
  { when: hasCosting, keys: ["budget", "cost_centers"] },
  { when: buys, keys: ["purchase_invoice", "supplier_statement", "bulk_payments"] },
  { when: buysOnOrder, keys: ["purchase_order", "purchase_requisition"] },
  { when: sells, keys: ["sales_invoice", "customer_statement", "payment_followup"] },
  { when: quotes, keys: ["quotation"] },
  { when: dispatches, keys: ["sales_order", "delivery_challan", "outward"] },
  { when: holdsStock, keys: ["inventory_items", "stock_rates", "reports_inventory"] },
  { when: tradesStock, keys: [
    "barcode", "stock_movements", "stock_ledger", "price_lists",
    "purchase_return", "sale_return", "warehouses", "warehouse_transfers",
  ] },
];

/** The core module keys a business type's pack grants. */
export function coreModulesFor(businessType: string): ModuleKey[] {
  const pack = getCorePack(businessType);
  const keys: ModuleKey[] = [...UNIVERSAL_MODULES];
  for (const rule of MODULE_RULES) {
    if (rule.when(pack)) keys.push(...rule.keys);
  }
  return keys;
}

/** Human-readable pack summary, for the admin grid and the diff script. */
export function describeCorePack(pack: CorePack): string {
  const purchase = { none: "no purchasing", invoice: "direct supplier bills", po_grn: "PO → GRN → bill" }[pack.purchaseDepth];
  const sales = { none: "no selling", bill: "counter billing", quote_invoice: "quote → invoice", order_challan: "order → challan → invoice" }[pack.salesDepth];
  const stock = { none: "no stock", consumables: "consumables only", full: "full inventory" }[pack.stockDepth];
  return [purchase, sales, stock].join(" · ");
}
