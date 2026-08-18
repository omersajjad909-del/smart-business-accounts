/**
 * lib/backupTables.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The single source of truth for what a company snapshot contains.
 *
 * Every table listed here is captured by createCompanyBackup() AND written back
 * by restoreCompanyBackup(). Keeping one list for both directions is the whole
 * point: the old restore deleted purchase orders, expense vouchers, payment
 * receipts and bank statements but only re-created a handful of tables, so
 * running it silently destroyed everything else.
 *
 * ORDER MATTERS. The list is topological — parents before children:
 *   • restore creates in this order
 *   • restore deletes in the exact reverse
 * Adding a table means finding its correct slot, not appending to the end.
 */

export type BackupTable = {
  /** Key this table occupies in the snapshot JSON. */
  key: string;
  /** Prisma delegate name, e.g. prisma.salesInvoiceItem. */
  model: string;
  /** Human label used in progress and error messages. */
  label: string;
  /**
   * Rows belonging to one company. Child tables that carry no companyId of
   * their own are reached through their parent relation.
   */
  where: (companyId: string) => Record<string, any>;
  /**
   * True when the model has its own companyId column, so restore can re-stamp
   * rows onto the target company (matters when a snapshot is restored into a
   * different workspace than the one it came from).
   */
  hasCompanyId: boolean;
};

export const BACKUP_TABLES: BackupTable[] = [
  // ── Masters ───────────────────────────────────────────────────────────────
  // Account.parentId is a self-reference, so restore inserts accounts over
  // several passes until every parent exists (see restoreCompanyBackup).
  { key: "accounts", model: "account", label: "Accounts", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "items", model: "itemNew", label: "Items", hasCompanyId: true, where: (c) => ({ companyId: c }) },

  // ── Banking masters ───────────────────────────────────────────────────────
  { key: "bankAccounts", model: "bankAccount", label: "Bank accounts", hasCompanyId: true, where: (c) => ({ companyId: c }) },

  // ── Tax links (TaxConfiguration itself is never wiped) ────────────────────
  { key: "taxAccounts", model: "taxAccount", label: "Tax accounts", hasCompanyId: false, where: (c) => ({ account: { companyId: c } }) },

  // ── Ledger ────────────────────────────────────────────────────────────────
  { key: "vouchers", model: "voucher", label: "Vouchers", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "voucherEntries", model: "voucherEntry", label: "Voucher entries", hasCompanyId: true, where: (c) => ({ voucher: { companyId: c } }) },

  // ── Purchase cycle ────────────────────────────────────────────────────────
  { key: "purchaseOrders", model: "purchaseOrder", label: "Purchase orders", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "purchaseOrderItems", model: "purchaseOrderItem", label: "Purchase order items", hasCompanyId: false, where: (c) => ({ po: { companyId: c } }) },
  { key: "purchaseInvoices", model: "purchaseInvoice", label: "Purchase invoices", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "purchaseInvoiceItems", model: "purchaseInvoiceItem", label: "Purchase invoice items", hasCompanyId: false, where: (c) => ({ invoice: { companyId: c } }) },
  { key: "goodsReceiptNotes", model: "goodsReceiptNote", label: "Goods receipt notes", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "goodsReceiptNoteItems", model: "goodsReceiptNoteItem", label: "GRN items", hasCompanyId: false, where: (c) => ({ grn: { companyId: c } }) },

  // ── Sales cycle ───────────────────────────────────────────────────────────
  { key: "quotations", model: "quotation", label: "Quotations", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "quotationItems", model: "quotationItem", label: "Quotation items", hasCompanyId: false, where: (c) => ({ quotation: { companyId: c } }) },
  { key: "salesInvoices", model: "salesInvoice", label: "Sales invoices", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "salesInvoiceItems", model: "salesInvoiceItem", label: "Sales invoice items", hasCompanyId: false, where: (c) => ({ invoice: { companyId: c } }) },
  { key: "saleReturns", model: "saleReturn", label: "Sale returns", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "saleReturnItems", model: "saleReturnItem", label: "Sale return items", hasCompanyId: false, where: (c) => ({ saleReturn: { companyId: c } }) },
  { key: "deliveryChallans", model: "deliveryChallan", label: "Delivery challans", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "deliveryChallanItems", model: "deliveryChallanItem", label: "Delivery challan items", hasCompanyId: false, where: (c) => ({ challan: { companyId: c } }) },
  { key: "outwards", model: "outward", label: "Outward gate passes", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "outwardItems", model: "outwardItem", label: "Outward items", hasCompanyId: false, where: (c) => ({ outward: { companyId: c } }) },

  // ── Notes & advances ──────────────────────────────────────────────────────
  { key: "creditNotes", model: "creditNote", label: "Credit notes", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "debitNotes", model: "debitNote", label: "Debit notes", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "advancePayments", model: "advancePayment", label: "Advance payments", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "advanceAdjustments", model: "advanceAdjustment", label: "Advance adjustments", hasCompanyId: false, where: (c) => ({ advancePayment: { companyId: c } }) },

  // ── Expenses ──────────────────────────────────────────────────────────────
  { key: "expenseVouchers", model: "expenseVoucher", label: "Expense vouchers", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "expenseItems", model: "expenseItem", label: "Expense items", hasCompanyId: false, where: (c) => ({ expenseVoucher: { companyId: c } }) },
  { key: "expenseAttachments", model: "expenseAttachment", label: "Expense attachments", hasCompanyId: false, where: (c) => ({ expenseVoucher: { companyId: c } }) },
  { key: "expenseApprovals", model: "expenseApproval", label: "Expense approvals", hasCompanyId: false, where: (c) => ({ expenseVoucher: { companyId: c } }) },

  // ── Money in / out ────────────────────────────────────────────────────────
  { key: "paymentReceipts", model: "paymentReceipt", label: "Payment receipts", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "bankReconciliations", model: "bankReconciliation", label: "Bank reconciliations", hasCompanyId: false, where: (c) => ({ bankAccount: { companyId: c } }) },
  // Statements point at a reconciliation, so they must land after it.
  { key: "bankStatements", model: "bankStatement", label: "Bank statements", hasCompanyId: true, where: (c) => ({ bankAccount: { companyId: c } }) },

  // ── Loans ─────────────────────────────────────────────────────────────────
  { key: "loans", model: "loan", label: "Loans", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "loanPayments", model: "loanPayment", label: "Loan payments", hasCompanyId: false, where: (c) => ({ loan: { companyId: c } }) },

  // ── Stock & ledger movement ───────────────────────────────────────────────
  { key: "inventoryTxns", model: "inventoryTxn", label: "Inventory transactions", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "stockRates", model: "stockRate", label: "Stock rates", hasCompanyId: true, where: (c) => ({ item: { companyId: c } }) },
  { key: "ledgerEntries", model: "ledgerEntry", label: "Ledger entries", hasCompanyId: true, where: (c) => ({ companyId: c }) },

  // ── Planning ──────────────────────────────────────────────────────────────
  { key: "budgets", model: "budget", label: "Budgets", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "recurringTransactions", model: "recurringTransaction", label: "Recurring transactions", hasCompanyId: true, where: (c) => ({ companyId: c }) },

  // ── Fixed assets ──────────────────────────────────────────────────────────
  { key: "fixedAssets", model: "fixedAsset", label: "Fixed assets", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "depreciations", model: "depreciation", label: "Depreciation", hasCompanyId: false, where: (c) => ({ fixedAsset: { companyId: c } }) },

  // ── HR ────────────────────────────────────────────────────────────────────
  { key: "employees", model: "employee", label: "Employees", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "attendances", model: "attendance", label: "Attendance", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "leaves", model: "leave", label: "Leaves", hasCompanyId: false, where: (c) => ({ employee: { companyId: c } }) },
  { key: "payrolls", model: "payroll", label: "Payroll", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "advanceSalaries", model: "advanceSalary", label: "Salary advances", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "employeeDocuments", model: "employeeDocument", label: "Employee documents", hasCompanyId: false, where: (c) => ({ employee: { companyId: c } }) },

  // ── CRM ───────────────────────────────────────────────────────────────────
  { key: "contacts", model: "contact", label: "Contacts", hasCompanyId: true, where: (c) => ({ companyId: c }) },
  { key: "interactions", model: "interaction", label: "Interactions", hasCompanyId: false, where: (c) => ({ contact: { companyId: c } }) },
  { key: "contactNotes", model: "contactNote", label: "Contact notes", hasCompanyId: false, where: (c) => ({ contact: { companyId: c } }) },
  { key: "contactDocuments", model: "contactDocument", label: "Contact documents", hasCompanyId: false, where: (c) => ({ contact: { companyId: c } }) },
  { key: "opportunities", model: "opportunity", label: "Opportunities", hasCompanyId: false, where: (c) => ({ contact: { companyId: c } }) },
  { key: "opportunityActivities", model: "opportunityActivity", label: "Opportunity activity", hasCompanyId: false, where: (c) => ({ opportunity: { contact: { companyId: c } } }) },
];

/** Snapshot format written by the current code. */
export const BACKUP_FORMAT_VERSION = "3.0";

/** Tables whose absence means the file is not a FinovaOS snapshot at all. */
const RECOGNISABLE_KEYS = ["accounts", "items", "vouchers", "salesInvoices", "purchaseInvoices", "bankAccounts"];

export function looksLikeSnapshot(raw: any): boolean {
  if (!raw || typeof raw !== "object") return false;
  return RECOGNISABLE_KEYS.some((k) => Array.isArray(raw[k]));
}

/**
 * Older snapshots (v2.0) nested children inside their parent and never held the
 * tables added in v3.0. Flatten them so one restore path handles both formats.
 */
export function normalizeSnapshot(raw: any): Record<string, any[]> {
  const out: Record<string, any[]> = {};
  for (const t of BACKUP_TABLES) {
    out[t.key] = Array.isArray(raw?.[t.key]) ? raw[t.key] : [];
  }

  const lift = (parentKey: string, childField: string, childKey: string, fk: string) => {
    const parents = out[parentKey];
    if (!parents.length) return;
    const lifted: any[] = [];
    out[parentKey] = parents.map((p: any) => {
      const { [childField]: children, ...rest } = p || {};
      if (Array.isArray(children)) {
        for (const child of children) lifted.push({ ...child, [fk]: p.id });
      }
      return rest;
    });
    // Only adopt lifted rows when the flat key is empty — a v3 snapshot already
    // carries them separately and must not end up with duplicates.
    if (lifted.length && !out[childKey].length) out[childKey] = lifted;
  };

  lift("vouchers", "entries", "voucherEntries", "voucherId");
  lift("salesInvoices", "items", "salesInvoiceItems", "invoiceId");
  lift("purchaseInvoices", "items", "purchaseInvoiceItems", "invoiceId");
  lift("purchaseOrders", "items", "purchaseOrderItems", "poId");
  lift("expenseVouchers", "items", "expenseItems", "expenseVoucherId");

  // v2.0 stored CRM contacts under a different key.
  if (!out.contacts.length && Array.isArray(raw?.crmContacts)) out.contacts = raw.crmContacts;

  return out;
}
