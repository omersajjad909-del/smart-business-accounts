import { PERMISSIONS } from "@/lib/permissions";

type PermissionValue = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type PermissionCategory = {
  key: string;
  label: string;
  permissions: PermissionValue[];
};

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: "core",
    label: "Core",
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.VIEW_SETTINGS,
      PERMISSIONS.VIEW_LOGS,
      PERMISSIONS.VIEW_AUDIT_LOG,
    ],
  },
  {
    key: "accounts",
    label: "Accounts",
    permissions: [
      PERMISSIONS.VIEW_ACCOUNTS,
      PERMISSIONS.CREATE_CPV,
      PERMISSIONS.CREATE_CRV,
      PERMISSIONS.CREATE_JV,
      PERMISSIONS.CREATE_CONTRA,
      PERMISSIONS.VIEW_ACCOUNTING,
      PERMISSIONS.MANAGE_OPENING_BALANCES,
      PERMISSIONS.MANAGE_ADVANCE_PAYMENT,
      PERMISSIONS.MANAGE_PETTY_CASH,
      PERMISSIONS.CREATE_CREDIT_NOTE,
      PERMISSIONS.CREATE_DEBIT_NOTE,
      PERMISSIONS.MANAGE_LOANS,
      PERMISSIONS.MANAGE_RECURRING,
      PERMISSIONS.VIEW_FIXED_ASSETS,
    ],
  },
  {
    key: "inventory_sales",
    label: "Inventory & Sales",
    permissions: [
      PERMISSIONS.VIEW_CATALOG,
      PERMISSIONS.CREATE_ACCOUNTS,
      PERMISSIONS.CREATE_ITEMS,
      PERMISSIONS.CREATE_STOCK_RATE,
      PERMISSIONS.MANAGE_BARCODE,
      PERMISSIONS.VIEW_INVENTORY,
      PERMISSIONS.CREATE_PURCHASE_ORDER,
      PERMISSIONS.CREATE_PURCHASE_INVOICE,
      PERMISSIONS.CREATE_SALES_INVOICE,
      PERMISSIONS.CREATE_SALE_RETURN,
      PERMISSIONS.CREATE_OUTWARD,
      PERMISSIONS.CREATE_QUOTATION,
      PERMISSIONS.CREATE_DELIVERY_CHALLAN,
      PERMISSIONS.MANAGE_PRICE_LISTS,
      PERMISSIONS.MANAGE_PROMOTIONS,
    ],
  },
  {
    key: "reports",
    label: "Reports",
    permissions: [
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.VIEW_FINANCIAL_REPORTS,
      PERMISSIONS.VIEW_AGEING_REPORT,
      PERMISSIONS.VIEW_LEDGER_REPORT,
      PERMISSIONS.VIEW_TRIAL_BALANCE_REPORT,
      PERMISSIONS.VIEW_PROFIT_LOSS_REPORT,
      PERMISSIONS.VIEW_BALANCE_SHEET_REPORT,
      PERMISSIONS.VIEW_INVENTORY_REPORTS,
      PERMISSIONS.VIEW_INWARD,
      PERMISSIONS.VIEW_OUTWARD,
      PERMISSIONS.VIEW_SALES_REPORT,
      PERMISSIONS.VIEW_STOCK_LEDGER,
      PERMISSIONS.VIEW_STOCK_SUMMARY,
      PERMISSIONS.VIEW_LOW_STOCK,
      PERMISSIONS.VIEW_LOCATION,
    ],
  },
  {
    key: "banking",
    label: "Banking & Tax",
    permissions: [
      PERMISSIONS.BANK_RECONCILIATION,
      PERMISSIONS.PAYMENT_RECEIPTS,
      PERMISSIONS.EXPENSE_VOUCHERS,
      PERMISSIONS.TAX_CONFIGURATION,
      PERMISSIONS.BULK_PAYMENTS,
    ],
  },
  {
    key: "trading",
    label: "Trading Control",
    permissions: [
      PERMISSIONS.TRADING_OVERVIEW,
      PERMISSIONS.TRADING_ORDER_DESK,
      PERMISSIONS.TRADING_PROCUREMENT,
      PERMISSIONS.TRADING_STOCK_CONTROL,
      PERMISSIONS.TRADING_OUTSTANDINGS,
      PERMISSIONS.TRADING_DISPATCH_BOARD,
      PERMISSIONS.TRADING_CONVERSION_CENTER,
      PERMISSIONS.TRADING_ANALYTICS,
    ],
  },
  {
    key: "org",
    label: "Organization",
    permissions: [
      PERMISSIONS.MANAGE_USERS,
      PERMISSIONS.MANAGE_ROLES,
      PERMISSIONS.VIEW_HR_PAYROLL,
      PERMISSIONS.VIEW_CRM,
      PERMISSIONS.BUDGET_PLANNING,
      PERMISSIONS.RECURRING_TRANSACTIONS,
      PERMISSIONS.FINANCIAL_YEAR,
      PERMISSIONS.BACKUP_RESTORE,
      PERMISSIONS.EMAIL_SETTINGS,
      PERMISSIONS.MANAGE_APPROVALS,
    ],
  },
  {
    key: "scale",
    label: "Scale & Integrations",
    permissions: [
      PERMISSIONS.MULTI_BRANCH,
      PERMISSIONS.MULTI_CURRENCY,
      PERMISSIONS.API_ACCESS,
      PERMISSIONS.MANAGE_COST_CENTERS,
    ],
  },
  // ── AI Features ── (was missing from categories — now included)
  {
    key: "ai",
    label: "AI Features",
    permissions: [
      PERMISSIONS.AI_ASSISTANT,
      PERMISSIONS.AI_SMART_SUGGESTIONS,
      PERMISSIONS.AI_EXPENSE_CATEGORIZATION,
      PERMISSIONS.AI_FORECAST,
      PERMISSIONS.AI_ANOMALY_DETECTION,
      PERMISSIONS.AI_NATURAL_LANGUAGE,
      PERMISSIONS.AI_CASH_FLOW_PREDICTION,
      PERMISSIONS.AI_BUSINESS_OPERATOR,
    ],
  },
];

// Derived from PERMISSIONS, not from PERMISSION_CATEGORIES.
//
// It used to be the flatMap of the categories, which quietly made "Enterprise
// gets everything" mean "Enterprise gets everything someone remembered to put
// in a category". Nine permissions — JV, Contra, Petty Cash, Loans, Barcode,
// Credit/Debit Note, Advance Payment, Recurring — were in PERMISSIONS but in no
// category, so Enterprise never received them and the admin permissions screen
// (which renders the categories) had no checkbox for them either.
const ALL_PERMISSION_VALUES: PermissionValue[] = Object.values(PERMISSIONS);

// The categories drive the admin UI, so a permission missing from them is
// unassignable no matter what a plan grants. Fail loudly in development rather
// than shipping another invisible permission.
const UNCATEGORIZED_PERMISSIONS: PermissionValue[] = (() => {
  const categorized = new Set(PERMISSION_CATEGORIES.flatMap((c) => c.permissions));
  return ALL_PERMISSION_VALUES.filter((p) => !categorized.has(p));
})();

if (process.env.NODE_ENV !== "production" && UNCATEGORIZED_PERMISSIONS.length > 0) {
  console.error(
    `[planPermissions] ${UNCATEGORIZED_PERMISSIONS.length} permission(s) are in PERMISSIONS but no ` +
    `PERMISSION_CATEGORIES entry, so /dashboard/admin/permissions cannot assign them: ` +
    UNCATEGORIZED_PERMISSIONS.join(", ")
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PLAN DEFAULT PERMISSIONS — the ladder the pricing page sells
//
//  STARTER    → Core accounting + basic operations. "Start running your books."
//  PRO        → Intelligence + automation + complete operations.
//  ENTERPRISE → Scale + control + integrations. Everything.
//
//  These three lists are the enforcement side of the public comparison table in
//  app/(marketing)/pricing/page.tsx. A row there and an entry here have to move
//  together — if they disagree, we are either charging for something we lock or
//  giving away something we advertise as an upgrade.
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_DEFAULT_PERMISSIONS: Record<string, PermissionValue[]> = {

  // ── STARTER ────────────────────────────────────────────────────────────────
  // Basic accounting + catalog + sales/purchase + basic reports + payments.
  STARTER: [
    // Core
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_SETTINGS,
    // Starter sells "up to 3 users", so the owner has to be able to invite
    // them. The sidebar's Admin group is gated on MANAGE_USERS and plan gating
    // applies to admins too, so without this the seats were unsellable.
    PERMISSIONS.MANAGE_USERS,

    // Accounts — basic accounting, expense management
    PERMISSIONS.VIEW_ACCOUNTS,
    PERMISSIONS.CREATE_CPV,
    PERMISSIONS.CREATE_CRV,
    PERMISSIONS.CREATE_JV,
    PERMISSIONS.CREATE_CONTRA,
    PERMISSIONS.VIEW_ACCOUNTING,
    PERMISSIONS.MANAGE_OPENING_BALANCES,
    PERMISSIONS.MANAGE_ADVANCE_PAYMENT,
    PERMISSIONS.MANAGE_PETTY_CASH,

    // Inventory & Sales — catalog and documents, no advanced stock tooling
    PERMISSIONS.VIEW_CATALOG,
    PERMISSIONS.CREATE_ACCOUNTS,
    PERMISSIONS.CREATE_ITEMS,
    PERMISSIONS.CREATE_STOCK_RATE,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.CREATE_PURCHASE_ORDER,
    PERMISSIONS.CREATE_PURCHASE_INVOICE,
    PERMISSIONS.CREATE_SALES_INVOICE,
    PERMISSIONS.CREATE_SALE_RETURN,
    PERMISSIONS.CREATE_OUTWARD,
    PERMISSIONS.CREATE_QUOTATION,
    PERMISSIONS.CREATE_DELIVERY_CHALLAN,

    // Basic Reports only
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.VIEW_AGEING_REPORT,
    PERMISSIONS.VIEW_LEDGER_REPORT,
    PERMISSIONS.VIEW_TRIAL_BALANCE_REPORT,

    // Basic Banking
    PERMISSIONS.PAYMENT_RECEIPTS,
    PERMISSIONS.EXPENSE_VOUCHERS,

    // NO: Trading Control — it was fully open here while the pricing table sold
    //     it as an upgrade. Same story for AI_BUSINESS_OPERATOR, our most
    //     expensive feature, which Starter was getting for free.
    // NO: Bank reconciliation, bulk payments, tax config, barcode, price lists,
    //     promotions, credit/debit notes, loans, recurring, fixed assets,
    //     advanced reports, HR, CRM, budget, audit, backup, AI, multi-branch,
    //     multi-currency, API access.
  ],

  // ── PROFESSIONAL ───────────────────────────────────────────────────────────
  // Everything in Starter + advanced reports + HR/CRM + banking + working AI.
  PRO: [
    // Core
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_SETTINGS,

    // Accounts
    PERMISSIONS.VIEW_ACCOUNTS,
    PERMISSIONS.CREATE_CPV,
    PERMISSIONS.CREATE_CRV,
    PERMISSIONS.CREATE_JV,
    PERMISSIONS.CREATE_CONTRA,
    PERMISSIONS.VIEW_ACCOUNTING,
    PERMISSIONS.MANAGE_OPENING_BALANCES,
    PERMISSIONS.MANAGE_ADVANCE_PAYMENT,
    PERMISSIONS.MANAGE_PETTY_CASH,
    PERMISSIONS.CREATE_CREDIT_NOTE,
    PERMISSIONS.CREATE_DEBIT_NOTE,
    PERMISSIONS.MANAGE_LOANS,
    PERMISSIONS.MANAGE_RECURRING,
    PERMISSIONS.VIEW_FIXED_ASSETS,

    // Inventory & Sales
    PERMISSIONS.VIEW_CATALOG,
    PERMISSIONS.CREATE_ACCOUNTS,
    PERMISSIONS.CREATE_ITEMS,
    PERMISSIONS.CREATE_STOCK_RATE,
    PERMISSIONS.MANAGE_BARCODE,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.CREATE_PURCHASE_ORDER,
    PERMISSIONS.CREATE_PURCHASE_INVOICE,
    PERMISSIONS.CREATE_SALES_INVOICE,
    PERMISSIONS.CREATE_SALE_RETURN,
    PERMISSIONS.CREATE_OUTWARD,
    PERMISSIONS.CREATE_QUOTATION,
    PERMISSIONS.CREATE_DELIVERY_CHALLAN,
    PERMISSIONS.MANAGE_PRICE_LISTS,
    PERMISSIONS.MANAGE_PROMOTIONS,

    // Full Reports
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.VIEW_AGEING_REPORT,
    PERMISSIONS.VIEW_LEDGER_REPORT,
    PERMISSIONS.VIEW_TRIAL_BALANCE_REPORT,
    PERMISSIONS.VIEW_PROFIT_LOSS_REPORT,
    PERMISSIONS.VIEW_BALANCE_SHEET_REPORT,
    PERMISSIONS.VIEW_INVENTORY_REPORTS,
    PERMISSIONS.VIEW_INWARD,
    PERMISSIONS.VIEW_OUTWARD,
    PERMISSIONS.VIEW_SALES_REPORT,
    PERMISSIONS.VIEW_STOCK_LEDGER,
    PERMISSIONS.VIEW_STOCK_SUMMARY,
    PERMISSIONS.VIEW_LOW_STOCK,
    PERMISSIONS.VIEW_LOCATION,

    // Full Banking & Tax
    PERMISSIONS.BANK_RECONCILIATION,
    PERMISSIONS.PAYMENT_RECEIPTS,
    PERMISSIONS.EXPENSE_VOUCHERS,
    PERMISSIONS.TAX_CONFIGURATION,
    PERMISSIONS.BULK_PAYMENTS,

    // Trading Control
    PERMISSIONS.TRADING_OVERVIEW,
    PERMISSIONS.TRADING_ORDER_DESK,
    PERMISSIONS.TRADING_PROCUREMENT,
    PERMISSIONS.TRADING_STOCK_CONTROL,
    PERMISSIONS.TRADING_OUTSTANDINGS,
    PERMISSIONS.TRADING_DISPATCH_BOARD,
    PERMISSIONS.TRADING_CONVERSION_CENTER,
    PERMISSIONS.TRADING_ANALYTICS,

    // Organization — run the team, but governance stays Enterprise
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_HR_PAYROLL,
    PERMISSIONS.VIEW_CRM,
    PERMISSIONS.BUDGET_PLANNING,
    PERMISSIONS.RECURRING_TRANSACTIONS,
    PERMISSIONS.FINANCIAL_YEAR,

    // Scale — branches (capped at 3 by branchLimits), but not currencies,
    // cost centres or the API
    PERMISSIONS.MULTI_BRANCH,

    // AI — the assistant and the everyday helpers, not the autonomous agent
    // and not the predictive suite
    PERMISSIONS.AI_ASSISTANT,
    PERMISSIONS.AI_SMART_SUGGESTIONS,
    PERMISSIONS.AI_EXPENSE_CATEGORIZATION,

    // Deliberately NOT in Pro — this is what Enterprise is for. An earlier pass
    // pushed all of these down into Pro, which left Enterprise as "Pro plus a
    // bigger user count", i.e. nothing anyone would upgrade for.
    //
    // Governance:  VIEW_AUDIT_LOG, VIEW_LOGS, MANAGE_ROLES, MANAGE_APPROVALS,
    //              MANAGE_COST_CENTERS, BACKUP_RESTORE, EMAIL_SETTINGS
    // Integration: API_ACCESS, MULTI_CURRENCY
    // AI:          AI_BUSINESS_OPERATOR (also sold as an add-on to lower
    //              plans), AI_FORECAST, AI_ANOMALY_DETECTION,
    //              AI_NATURAL_LANGUAGE, AI_CASH_FLOW_PREDICTION
  ],

  // ── ENTERPRISE ─────────────────────────────────────────────────────────────
  // Everything — plus the governance, integration and predictive-AI block that
  // Pro deliberately does not get. See the note at the end of PRO.
  ENTERPRISE: [...ALL_PERMISSION_VALUES],
};

type ModulePermissionMap = Record<string, PermissionValue[]>;

export const CUSTOM_MODULE_PERMISSIONS: ModulePermissionMap = {
  accounting: [
    PERMISSIONS.VIEW_ACCOUNTS,
    PERMISSIONS.CREATE_CPV,
    PERMISSIONS.CREATE_CRV,
    PERMISSIONS.VIEW_ACCOUNTING,
    PERMISSIONS.MANAGE_OPENING_BALANCES,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.VIEW_LEDGER_REPORT,
    PERMISSIONS.VIEW_TRIAL_BALANCE_REPORT,
  ],
  crm: [
    PERMISSIONS.VIEW_CRM,
    PERMISSIONS.CREATE_QUOTATION,
    PERMISSIONS.CREATE_DELIVERY_CHALLAN,
  ],
  hr_payroll: [PERMISSIONS.VIEW_HR_PAYROLL],
  bank_reconciliation: [
    PERMISSIONS.BANK_RECONCILIATION,
    PERMISSIONS.PAYMENT_RECEIPTS,
    PERMISSIONS.EXPENSE_VOUCHERS,
    PERMISSIONS.BULK_PAYMENTS,
  ],
  bulk_payments: [PERMISSIONS.BULK_PAYMENTS],
  inventory: [
    PERMISSIONS.VIEW_CATALOG,
    PERMISSIONS.CREATE_ACCOUNTS,
    PERMISSIONS.CREATE_ITEMS,
    PERMISSIONS.CREATE_STOCK_RATE,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.CREATE_PURCHASE_ORDER,
    PERMISSIONS.CREATE_PURCHASE_INVOICE,
    PERMISSIONS.CREATE_SALES_INVOICE,
    PERMISSIONS.CREATE_SALE_RETURN,
    PERMISSIONS.CREATE_OUTWARD,
    PERMISSIONS.VIEW_INVENTORY_REPORTS,
    PERMISSIONS.VIEW_INWARD,
    PERMISSIONS.VIEW_OUTWARD,
    PERMISSIONS.VIEW_SALES_REPORT,
    PERMISSIONS.VIEW_STOCK_LEDGER,
    PERMISSIONS.VIEW_STOCK_SUMMARY,
    PERMISSIONS.VIEW_LOW_STOCK,
    PERMISSIONS.VIEW_LOCATION,
  ],
  reports: [
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.VIEW_AGEING_REPORT,
    PERMISSIONS.VIEW_LEDGER_REPORT,
    PERMISSIONS.VIEW_TRIAL_BALANCE_REPORT,
    PERMISSIONS.VIEW_PROFIT_LOSS_REPORT,
    PERMISSIONS.VIEW_BALANCE_SHEET_REPORT,
    PERMISSIONS.VIEW_INVENTORY_REPORTS,
    PERMISSIONS.VIEW_INWARD,
    PERMISSIONS.VIEW_OUTWARD,
    PERMISSIONS.VIEW_SALES_REPORT,
    PERMISSIONS.VIEW_STOCK_LEDGER,
    PERMISSIONS.VIEW_STOCK_SUMMARY,
    PERMISSIONS.VIEW_LOW_STOCK,
    PERMISSIONS.VIEW_LOCATION,
  ],
  ai_basic: [
    PERMISSIONS.AI_ASSISTANT,
    PERMISSIONS.AI_SMART_SUGGESTIONS,
    PERMISSIONS.AI_EXPENSE_CATEGORIZATION,
  ],
  ai_advanced: [
    PERMISSIONS.AI_ASSISTANT,
    PERMISSIONS.AI_SMART_SUGGESTIONS,
    PERMISSIONS.AI_EXPENSE_CATEGORIZATION,
    PERMISSIONS.AI_FORECAST,
    PERMISSIONS.AI_ANOMALY_DETECTION,
    PERMISSIONS.AI_NATURAL_LANGUAGE,
    PERMISSIONS.AI_CASH_FLOW_PREDICTION,
    PERMISSIONS.AI_BUSINESS_OPERATOR,
  ],
  trading: [
    PERMISSIONS.TRADING_OVERVIEW,
    PERMISSIONS.TRADING_ORDER_DESK,
    PERMISSIONS.TRADING_PROCUREMENT,
    PERMISSIONS.TRADING_STOCK_CONTROL,
    PERMISSIONS.TRADING_OUTSTANDINGS,
    PERMISSIONS.TRADING_DISPATCH_BOARD,
    PERMISSIONS.TRADING_CONVERSION_CENTER,
    PERMISSIONS.TRADING_ANALYTICS,
  ],
  operator: [PERMISSIONS.AI_BUSINESS_OPERATOR],
  // These three used to map to VIEW_SETTINGS, which is not a gate — every plan
  // has it, so buying the Multi-Branch or API Access add-on granted nothing and
  // not buying it withheld nothing. They have their own keys now.
  multi_branch: [
    PERMISSIONS.MULTI_BRANCH,
    PERMISSIONS.MANAGE_COST_CENTERS,
    PERMISSIONS.VIEW_SETTINGS,
  ],
  multi_currency: [PERMISSIONS.MULTI_CURRENCY, PERMISSIONS.VIEW_SETTINGS],
  api_access:   [PERMISSIONS.API_ACCESS, PERMISSIONS.VIEW_SETTINGS],
  tax_filing:   [PERMISSIONS.TAX_CONFIGURATION],
  whatsapp:     [PERMISSIONS.VIEW_SETTINGS],
};

function normalizeModuleId(id: string): string {
  return String(id || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
}

export function getCustomPlanPermissions(activeModules: string | null | undefined): string[] {
  const base = new Set<string>([PERMISSIONS.VIEW_DASHBOARD]);
  const modules = String(activeModules || "")
    .split(",")
    .map((m) => normalizeModuleId(m))
    .filter(Boolean);

  for (const mod of modules) {
    const perms = CUSTOM_MODULE_PERMISSIONS[mod] || [];
    for (const p of perms) base.add(p);
  }

  return Array.from(base);
}

export function normalizePlanCode(plan: string | null | undefined): string {
  const p = String(plan || "").toUpperCase();
  if (p === "PROFESSIONAL") return "PRO";
  return p || "STARTER";
}

export function resolvePlanPermissions(params: {
  plan: string | null | undefined;
  configuredPlanPermissions?: Record<string, string[]> | null;
  activeModules?: string | null;
  // Pass true when the company pays in PKR (Safepay) — uses PKR-specific permission config
  isPkrUser?: boolean;
  pkrPlanPermissions?: Record<string, string[]> | null;
}): string[] {
  const planCode = normalizePlanCode(params.plan);

  if (planCode === "CUSTOM") {
    return getCustomPlanPermissions(params.activeModules);
  }

  // PKR users get their own permission set (lower-priced, potentially restricted)
  if (params.isPkrUser && params.pkrPlanPermissions) {
    const pkrCfg = params.pkrPlanPermissions;
    const pkrConfigured =
      pkrCfg[planCode] ||
      pkrCfg[planCode.toLowerCase()] ||
      pkrCfg[planCode.toUpperCase()];
    if (Array.isArray(pkrConfigured) && pkrConfigured.length > 0) {
      return pkrConfigured;
    }
  }

  const cfg = params.configuredPlanPermissions || {};
  const configured =
    cfg[planCode] ||
    cfg[planCode.toLowerCase()] ||
    cfg[planCode.toUpperCase()];

  if (Array.isArray(configured) && configured.length > 0) {
    return configured;
  }

  return PLAN_DEFAULT_PERMISSIONS[planCode] || PLAN_DEFAULT_PERMISSIONS.STARTER;
}
