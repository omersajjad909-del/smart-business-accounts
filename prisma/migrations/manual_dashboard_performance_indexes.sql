CREATE INDEX IF NOT EXISTS "PurchaseInvoice_companyId_branchId_deletedAt_date_idx"
  ON "PurchaseInvoice" ("companyId", "branchId", "deletedAt", "date");

CREATE INDEX IF NOT EXISTS "PurchaseInvoiceItem_invoiceId_idx"
  ON "PurchaseInvoiceItem" ("invoiceId");

CREATE INDEX IF NOT EXISTS "PurchaseInvoiceItem_itemId_idx"
  ON "PurchaseInvoiceItem" ("itemId");

CREATE INDEX IF NOT EXISTS "SalesInvoice_companyId_branchId_deletedAt_date_idx"
  ON "SalesInvoice" ("companyId", "branchId", "deletedAt", "date");

CREATE INDEX IF NOT EXISTS "SalesInvoiceItem_invoiceId_idx"
  ON "SalesInvoiceItem" ("invoiceId");

CREATE INDEX IF NOT EXISTS "SalesInvoiceItem_itemId_idx"
  ON "SalesInvoiceItem" ("itemId");

CREATE INDEX IF NOT EXISTS "ExpenseVoucher_companyId_deletedAt_date_idx"
  ON "ExpenseVoucher" ("companyId", "deletedAt", "date");

CREATE INDEX IF NOT EXISTS "ExpenseVoucher_companyId_costCenterId_deletedAt_date_idx"
  ON "ExpenseVoucher" ("companyId", "costCenterId", "deletedAt", "date");

CREATE INDEX IF NOT EXISTS "ExpenseItem_expenseVoucherId_idx"
  ON "ExpenseItem" ("expenseVoucherId");

CREATE INDEX IF NOT EXISTS "ExpenseItem_category_idx"
  ON "ExpenseItem" ("category");
