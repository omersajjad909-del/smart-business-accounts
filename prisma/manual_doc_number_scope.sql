-- FILE: prisma/manual_doc_number_scope.sql
--
-- Document numbers are unique per company, not per database.
--
-- challanNo, receiptNo, advanceNo and the rest were declared `@unique`, which
-- in a multi-tenant database means one number space shared by every company on
-- the platform. The generators count rows per company, so the second company
-- to create its first challan asks for DC-0001, finds the first company
-- already holding it, and the save fails with
--
--   Unique constraint failed on the fields: (`challanNo`)
--
-- which is what a client hit. Currency.code had the same shape and a worse
-- symptom: whichever company added PKR first was the only one that could.
--
-- Every statement here relaxes a constraint before tightening a narrower one,
-- so no existing row can violate it and nothing is dropped that carries data.
-- Written by hand rather than taken from `prisma migrate diff`, because the
-- generated diff also carries unrelated index renames this database has
-- drifted into and none of those belong in this change.
--
-- Safe to re-run: every statement is guarded.

BEGIN;

-- DeliveryChallan.challanNo — the one the client hit
DROP INDEX IF EXISTS "DeliveryChallan_challanNo_key";
CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryChallan_companyId_challanNo_key"
  ON "DeliveryChallan" ("companyId", "challanNo");

-- PaymentReceipt.receiptNo
DROP INDEX IF EXISTS "PaymentReceipt_receiptNo_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentReceipt_companyId_receiptNo_key"
  ON "PaymentReceipt" ("companyId", "receiptNo");

-- AdvancePayment.advanceNo
DROP INDEX IF EXISTS "AdvancePayment_advanceNo_key";
CREATE UNIQUE INDEX IF NOT EXISTS "AdvancePayment_companyId_advanceNo_key"
  ON "AdvancePayment" ("companyId", "advanceNo");

-- ExpenseVoucher.voucherNo
DROP INDEX IF EXISTS "ExpenseVoucher_voucherNo_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseVoucher_companyId_voucherNo_key"
  ON "ExpenseVoucher" ("companyId", "voucherNo");

-- TaxConfiguration.taxCode — "GST18" belongs to a company, not to the platform
DROP INDEX IF EXISTS "TaxConfiguration_taxCode_key";
CREATE UNIQUE INDEX IF NOT EXISTS "TaxConfiguration_companyId_taxCode_key"
  ON "TaxConfiguration" ("companyId", "taxCode");

-- BankAccount.accountNo
DROP INDEX IF EXISTS "BankAccount_accountNo_key";
CREATE UNIQUE INDEX IF NOT EXISTS "BankAccount_companyId_accountNo_key"
  ON "BankAccount" ("companyId", "accountNo");

-- Currency.code — every company gets its own PKR row
DROP INDEX IF EXISTS "Currency_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Currency_companyId_code_key"
  ON "Currency" ("companyId", "code");

COMMIT;
