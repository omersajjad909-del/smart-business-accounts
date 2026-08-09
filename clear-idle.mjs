// Retire the idle (unclaimed) demo sandboxes so the next demo is seeded by the
// current code. Only touches companies flagged isDemo with no deadline stamped,
// which are by definition unclaimed and disposable.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TABLES = [
  "LedgerEntry", "BankStatement", "BankReconciliation", "BankAccount",
  "SalesInvoiceItem", "SalesInvoice", "PurchaseInvoiceItem", "PurchaseInvoice",
  "GoodsReceiptNoteItem", "GoodsReceiptNote", "PurchaseOrderItem", "PurchaseOrder",
  "QuotationItem", "Quotation", "InventoryTxn", "StockRate",
  "ExpenseItem", "ExpenseVoucher", "PaymentReceipt", "VoucherEntry", "Voucher",
  "TaxAccount", "TaxConfiguration", "Contact", "Attendance", "Payroll",
  "AdvanceSalary", "Employee", "ItemNew", "Account", "Branch",
  "ActivityLog", "Session", "UserCompany",
];

const CHILD = {
  SalesInvoiceItem: ["invoiceId", "SalesInvoice"],
  PurchaseInvoiceItem: ["invoiceId", "PurchaseInvoice"],
  PurchaseOrderItem: ["poId", "PurchaseOrder"],
  QuotationItem: ["quotationId", "Quotation"],
  GoodsReceiptNoteItem: ["grnId", "GoodsReceiptNote"],
  ExpenseItem: ["expenseVoucherId", "ExpenseVoucher"],
  TaxAccount: ["taxConfigurationId", "TaxConfiguration"],
  BankReconciliation: ["bankAccountId", "BankAccount"],
};

const idle = await prisma.company.findMany({
  where: { isDemo: true, demoExpiresAt: null },
  select: { id: true, businessType: true },
});
console.log("idle sandboxes:", idle.length);

for (const c of idle) {
  for (const t of TABLES) {
    const child = CHILD[t];
    try {
      if (child) {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "${t}" WHERE "${child[0]}" IN (SELECT id FROM "${child[1]}" WHERE "companyId" = $1)`,
          c.id,
        );
      } else {
        await prisma.$executeRawUnsafe(`DELETE FROM "${t}" WHERE "companyId" = $1`, c.id);
      }
    } catch {}
  }
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "Company" WHERE id = $1 AND "isDemo" = true`, c.id);
    console.log("  retired", c.businessType, c.id.slice(0, 8));
  } catch (e) {
    console.log("  FAILED", c.id.slice(0, 8), String(e).slice(0, 120));
  }
}

const left = await prisma.company.count({ where: { isDemo: true, demoExpiresAt: null } });
console.log("idle remaining:", left);
await prisma.$disconnect();
