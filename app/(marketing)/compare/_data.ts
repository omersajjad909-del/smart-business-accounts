// FILE: app/(marketing)/compare/_data.ts
// Shared comparison data. It used to live inside the single /compare page, so
// the head-to-head pages under /compare/[competitor] had nothing to read from.
// Underscore prefix keeps Next from treating this as a route.

type Val = boolean | string | null;

interface FeatureRow {
  feature: string;
  category?: boolean;
  finova: Val;
  xero: Val;
  zoho: Val;
  wave: Val;
  quickbooks: Val;
  note?: string;
}

const ROWS: FeatureRow[] = [
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

const COMPETITORS = [
  { key: "finova",     label: "FinovaOS",    color: "#818cf8", logo: "F", highlight: true },
  { key: "xero",       label: "Xero",        color: "#4b5563", logo: "X" },
  { key: "zoho",       label: "Zoho Books",  color: "#4b5563", logo: "Z" },
  { key: "wave",       label: "Wave",        color: "#4b5563", logo: "W" },
  { key: "quickbooks", label: "QuickBooks",  color: "#4b5563", logo: "Q" },
];
