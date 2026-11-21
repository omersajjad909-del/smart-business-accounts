import { PERMISSIONS } from "@/lib/permissions";

const ALL: string[] = Object.values(PERMISSIONS);

const only = (...perms: string[]) => perms.filter((p) => ALL.includes(p));
const except = (...perms: string[]) => ALL.filter((p) => !perms.includes(p));
const viewOnly = (...skip: string[]) => ALL.filter((p) => p.startsWith("VIEW_") && !skip.includes(p));

/**
 * What each role starts with. Intersect with the company's plan before use:
 * a role can never hold a permission the plan doesn't include.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ALL,

  MANAGER: except(
    "MANAGE_USERS", "MANAGE_ROLES", "BACKUP_RESTORE", "API_ACCESS",
    "EMAIL_SETTINGS", "FINANCIAL_YEAR", "TAX_CONFIGURATION",
  ),

  ACCOUNTANT: [
    ...only(
      "VIEW_DASHBOARD", "VIEW_ACCOUNTS", "VIEW_ACCOUNTING", "VIEW_CATALOG", "VIEW_FIXED_ASSETS",
      "CREATE_CPV", "CREATE_CRV", "CREATE_JV", "CREATE_CONTRA", "CREATE_CREDIT_NOTE", "CREATE_DEBIT_NOTE",
      "CREATE_ACCOUNTS", "CREATE_SALES_INVOICE", "CREATE_PURCHASE_INVOICE",
      "MANAGE_ADVANCE_PAYMENT", "MANAGE_PETTY_CASH", "MANAGE_LOANS", "MANAGE_RECURRING",
      "MANAGE_OPENING_BALANCES", "MANAGE_COST_CENTERS", "VIEW_AUDIT_LOG",
      "BANK_RECONCILIATION", "PAYMENT_RECEIPTS", "EXPENSE_VOUCHERS", "TAX_CONFIGURATION",
      "BULK_PAYMENTS", "BUDGET_PLANNING", "RECURRING_TRANSACTIONS", "MULTI_CURRENCY",
      "SCHOOL_VIEW", "SCHOOL_FEES_VIEW", "SCHOOL_FEES_COLLECT", "SCHOOL_FEES_MANAGE",
    ),
    ...ALL.filter((p) => /^VIEW_.*REPORT/.test(p) || p.startsWith("AI_")),
  ],

  HR_MANAGER: only(
    "VIEW_DASHBOARD", "VIEW_HR_PAYROLL", "VIEW_REPORTS",
    "MANAGE_ADVANCE_PAYMENT", "MANAGE_LOANS", "EXPENSE_VOUCHERS",
  ),

  SALES: only(
    "VIEW_DASHBOARD", "VIEW_CATALOG", "VIEW_CRM", "VIEW_ACCOUNTS", "VIEW_INVENTORY", "VIEW_OUTWARD",
    "VIEW_STOCK_SUMMARY", "VIEW_LOW_STOCK", "VIEW_REPORTS", "VIEW_SALES_REPORT",
    "CREATE_QUOTATION", "CREATE_DELIVERY_CHALLAN", "CREATE_SALES_INVOICE", "CREATE_SALE_RETURN",
    "CREATE_OUTWARD", "CREATE_CRV", "PAYMENT_RECEIPTS",
    "TRADING_OVERVIEW", "TRADING_ORDER_DESK", "TRADING_OUTSTANDINGS", "TRADING_DISPATCH_BOARD",
  ),

  INVENTORY_MANAGER: only(
    "VIEW_DASHBOARD", "VIEW_CATALOG", "VIEW_INVENTORY", "VIEW_INWARD", "VIEW_OUTWARD",
    "VIEW_STOCK_LEDGER", "VIEW_STOCK_SUMMARY", "VIEW_LOW_STOCK", "VIEW_LOCATION",
    "VIEW_INVENTORY_REPORTS", "VIEW_REPORTS",
    "CREATE_ITEMS", "CREATE_STOCK_RATE", "MANAGE_BARCODE", "CREATE_PURCHASE_ORDER",
    "CREATE_OUTWARD", "CREATE_DELIVERY_CHALLAN",
    "TRADING_PROCUREMENT", "TRADING_STOCK_CONTROL", "TRADING_DISPATCH_BOARD",
  ),

  CASHIER: only(
    "VIEW_DASHBOARD", "VIEW_ACCOUNTS", "VIEW_CATALOG",
    "CREATE_CPV", "CREATE_CRV", "CREATE_SALES_INVOICE",
    "MANAGE_PETTY_CASH", "PAYMENT_RECEIPTS", "EXPENSE_VOUCHERS",
  ),

  AUDITOR: viewOnly("VIEW_SETTINGS"),

  SECURITY: only("VIEW_DASHBOARD", "VIEW_LOGS", "VIEW_AUDIT_LOG", "VIEW_INWARD", "VIEW_OUTWARD", "VIEW_LOCATION"),

  VIEWER: only("VIEW_DASHBOARD", "VIEW_CATALOG", "VIEW_REPORTS", "SCHOOL_VIEW", "SCHOOL_FEES_VIEW"),

  // ── School staff ──
  // Principal runs the school but not the company: no users, roles, backups or billing.
  PRINCIPAL: only(
    "VIEW_DASHBOARD", "VIEW_REPORTS", "VIEW_HR_PAYROLL",
    "SCHOOL_VIEW", "SCHOOL_STUDENTS_MANAGE", "SCHOOL_FEES_VIEW", "SCHOOL_ATTENDANCE_MARK", "SCHOOL_EXAMS_MANAGE",
    "SCHOOL_ACADEMICS_MANAGE", "SCHOOL_MESSAGES_SEND", "SCHOOL_SETUP_MANAGE",
  ),

  // Fees and the books; cannot touch academics or admissions.
  SCHOOL_ACCOUNTANT: [
    ...only(
      "VIEW_DASHBOARD", "VIEW_ACCOUNTS", "VIEW_ACCOUNTING", "CREATE_CPV", "CREATE_CRV", "CREATE_JV",
      "PAYMENT_RECEIPTS", "EXPENSE_VOUCHERS", "VIEW_AUDIT_LOG",
      "SCHOOL_VIEW", "SCHOOL_FEES_VIEW", "SCHOOL_FEES_COLLECT", "SCHOOL_FEES_MANAGE", "SCHOOL_MESSAGES_SEND",
    ),
    ...ALL.filter((p) => /^VIEW_.*REPORT/.test(p)),
  ],

  // Front office: admissions, attendance, taking fees at the counter. No fee structure, no marks.
  OFFICE_CLERK: only(
    "VIEW_DASHBOARD", "SCHOOL_VIEW", "SCHOOL_STUDENTS_MANAGE", "SCHOOL_ATTENDANCE_MARK", "SCHOOL_FEES_VIEW", "SCHOOL_FEES_COLLECT",
  ),
};

export function defaultsForRole(role: string, planPermissions: string[] | null): string[] {
  const base = ROLE_DEFAULT_PERMISSIONS[role] || [];
  return planPermissions ? base.filter((p) => planPermissions.includes(p)) : base;
}
