// FILE: app/(marketing)/compare/_data.ts
// Shared comparison data. It used to live inside the single /compare page, so
// the head-to-head pages under /compare/[competitor] had nothing to read from.
// Underscore prefix keeps Next from treating this as a route.

export type Val = boolean | string | null;

export interface FeatureRow {
  feature: string;
  category?: boolean;
  finova: Val;
  xero: Val;
  zoho: Val;
  wave: Val;
  quickbooks: Val;
  note?: string;
}

export const ROWS: FeatureRow[] = [
  // Pricing
  { feature: "💰 PRICING", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Starting price",      finova: "$49/mo",  xero: "$13/mo",  zoho: "$15/mo",  wave: "Free*",   quickbooks: "$30/mo", note: "FinovaOS includes far more at base tier" },
  { feature: "Free plan available", finova: false,     xero: false,     zoho: true,      wave: true,      quickbooks: false },
  { feature: "Regional pricing",    finova: true,      xero: false,     zoho: false,     wave: false,     quickbooks: false, note: "Localized pricing for PKR, AED, SAR & more" },
  { feature: "Multi-currency",      finova: true,      xero: true,      zoho: true,      wave: false,     quickbooks: true },
  { feature: "Per-user pricing",    finova: false,     xero: true,      zoho: true,      wave: false,     quickbooks: true, note: "FinovaOS: unlimited users, no extra cost" },

  // Core Accounting
  { feature: "📊 CORE ACCOUNTING", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "General Ledger",          finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Trial Balance",           finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "P&L / Income Statement",  finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Balance Sheet",           finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Journal Vouchers",        finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "Bank Reconciliation",     finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Cost Centers",            finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: false },
  { feature: "Financial Year Close",    finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "Budget vs Actual",        finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },

  // Sales & Invoicing
  { feature: "🧾 SALES & INVOICING", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Sales Invoices",          finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Quotations",              finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "Sales Orders",            finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Delivery Challan",        finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Sale Returns",            finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "Payment Receipts",        finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "WhatsApp invoice sharing",finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "AI Invoice Generator",    finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Customer Portal",         finova: false, xero: true,  zoho: true,  wave: false, quickbooks: true },

  // Purchasing
  { feature: "🛒 PURCHASING", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Purchase Invoices",       finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Purchase Orders",         finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "GRN (Goods Receipt)",     finova: true,  xero: false, zoho: true,  wave: false, quickbooks: false },
  { feature: "Advance Payments",        finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Expense Vouchers",        finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Supplier Aging Report",   finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },

  // Inventory
  { feature: "📦 INVENTORY", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Stock Management",        finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Low Stock Alerts",        finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Multi-warehouse",         finova: true,  xero: false, zoho: true,  wave: false, quickbooks: false },
  { feature: "Barcode / SKU",           finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "AI Demand Forecasting",   finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Stock Valuation (Weighted Avg)",  finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },

  // HR & Payroll
  { feature: "👥 HR & PAYROLL", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Employee Management",     finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "Salary Processing",       finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "Attendance Tracking",     finova: true,  xero: false, zoho: true,  wave: false, quickbooks: false },
  { feature: "Leave Management",        finova: true,  xero: false, zoho: true,  wave: false, quickbooks: false },
  { feature: "Statutory deductions",    finova: true,  xero: false, zoho: false, wave: false, quickbooks: false, note: "EOBI (PK), GOSI (KSA), GPSSA (UAE) & more" },
  { feature: "Salary Slip PDF",         finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },

  // AI Features
  { feature: "🤖 AI FEATURES", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "AI receipt scanning",     finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "AI invoice generation",   finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Churn prediction",        finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Supplier negotiation AI", finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Cash flow optimization",  finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "GL auto-suggest",         finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Inventory AI forecast",   finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },

  // Multi-branch
  { feature: "🏢 MULTI-BRANCH", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Multi-branch support",    finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Consolidated reports",    finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Per-branch P&L",         finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Inter-branch transfers",  finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },

  // Support & Localisation
  { feature: "🌍 LOCALISATION & SUPPORT", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Regional GST/Tax support",finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true, note: "FBR (PK), VAT (UAE/KSA), GCC tax compliance" },
  { feature: "FBR integration",         finova: "Soon",xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Arabic / Urdu UI",        finova: "Soon",xero: false, zoho: "AR",  wave: false, quickbooks: false },
  { feature: "WhatsApp support",        finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "24/7 support",            finova: false, xero: false, zoho: false, wave: false, quickbooks: true },
  { feature: "Multi-region support",    finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true, note: "Pakistan, UAE, Saudi Arabia, Global" },
];

export const COMPETITORS = [
  { key: "finova",     label: "FinovaOS",    color: "#818cf8", logo: "F", highlight: true },
  { key: "xero",       label: "Xero",        color: "#4b5563", logo: "X" },
  { key: "zoho",       label: "Zoho Books",  color: "#4b5563", logo: "Z" },
  { key: "wave",       label: "Wave",        color: "#4b5563", logo: "W" },
  { key: "quickbooks", label: "QuickBooks",  color: "#4b5563", logo: "Q" },
];

/** Column key of a rival — anything in COMPETITORS except FinovaOS itself. */
export type RivalKey = "xero" | "zoho" | "wave" | "quickbooks";

export type Rival = {
  slug: string;
  key: RivalKey;
  name: string;
  logo: string;
  /** Shown in <title> and the H1. */
  headline: string;
  tagline: string;
  /** Where the rival is genuinely a reasonable choice. Stated plainly. */
  goodFor: string;
  /** Where FinovaOS differs. Each point must be backed by a row in ROWS. */
  switchReasons: string[];
};

/**
 * Only the four rivals the feature table actually holds data for.
 *
 * Tally and Odoo are deliberately absent: publishing a feature-by-feature
 * comparison against a named company requires real verified data, and there is
 * none for them in ROWS. Add the columns first, then a rival here.
 */
export const RIVALS: Rival[] = [
  {
    slug: "xero",
    key: "xero",
    name: "Xero",
    logo: "X",
    headline: "FinovaOS vs Xero",
    tagline: "Clean books either way — the difference is everything around them.",
    goodFor:
      "Xero is a mature, well-designed accounting ledger with a large accountant network and a deep app marketplace. If you only need bookkeeping and your inventory and payroll live elsewhere, it does that job well.",
    switchReasons: [
      "Inventory, manufacturing and multi-warehouse stock are built in rather than bolted on through a third-party app.",
      "Users are included in the plan instead of being charged per seat.",
      "Regional pricing and tax handling for Pakistan and the Gulf, including FBR-ready invoicing.",
      "AI tools — receipt scanning, cash-flow optimisation, demand forecasting — are part of the product, not an add-on.",
    ],
  },
  {
    slug: "zoho-books",
    key: "zoho",
    name: "Zoho Books",
    logo: "Z",
    headline: "FinovaOS vs Zoho Books",
    tagline: "The closest comparison on features — the split is depth and locality.",
    goodFor:
      "Zoho Books is genuinely broad, covers inventory and multi-branch, and slots into the wider Zoho suite. If your business already runs on Zoho CRM and Zoho People, staying inside that ecosystem is a fair reason on its own.",
    switchReasons: [
      "Production: bill of materials, production orders and absorbed labour and overhead, which Zoho Books does not cover.",
      "Statutory payroll deductions for Pakistan, Saudi Arabia and the UAE (EOBI, GOSI, GPSSA) out of the box.",
      "Inter-branch stock transfers alongside per-branch P&L.",
      "Local pricing in PKR rather than a converted dollar figure, and WhatsApp as a first-class delivery channel.",
    ],
  },
  {
    slug: "quickbooks",
    key: "quickbooks",
    name: "QuickBooks",
    logo: "Q",
    headline: "FinovaOS vs QuickBooks",
    tagline: "The default in some markets — but priced and scoped for a different one.",
    goodFor:
      "QuickBooks is the most widely recognised small-business accounting product, with 24/7 support and an enormous accountant and bookkeeper base, particularly in the US and UK.",
    switchReasons: [
      "Multi-warehouse stock, inter-branch transfers and production costing, none of which QuickBooks handles natively.",
      "Attendance and leave management inside the same system as payroll.",
      "No per-user pricing — team size does not change the bill.",
      "Built for Pakistani and Gulf tax and compliance rather than adapted to it.",
    ],
  },
  {
    slug: "wave",
    key: "wave",
    name: "Wave",
    logo: "W",
    headline: "FinovaOS vs Wave",
    tagline: "Free is the right answer, until the business outgrows it.",
    goodFor:
      "Wave is free and perfectly adequate for a freelancer or a very small service business that invoices, tracks expenses, and needs nothing else. If that is you, there is no reason to pay for anything.",
    switchReasons: [
      "Any inventory at all — Wave has no stock management, so goods businesses hit a wall immediately.",
      "Purchase orders, goods receipts and supplier ageing for businesses that buy to resell.",
      "Payroll, attendance and statutory deductions.",
      "Multi-branch operations and consolidated reporting.",
    ],
  },
];

export function getRival(slug: string): Rival | undefined {
  return RIVALS.find((r) => r.slug === slug);
}

/** Feature rows where FinovaOS has it and the rival does not. */
export function winsAgainst(key: RivalKey): FeatureRow[] {
  return ROWS.filter((r) => !r.category && r.finova === true && r[key] === false);
}
