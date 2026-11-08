-- Tax codes on invoice lines — manual, idempotent
-- Run this in your Postgres / Supabase SQL editor. Safe to re-run.
--
-- Purely additive: one new column on TaxConfiguration and four nullable
-- columns on each of the sales and purchase invoice line tables. Nothing
-- existing is altered, dropped or backfilled, so it is safe against a live
-- database, and every existing invoice reads exactly as before.
--
-- Tax stays optional: a line with no tax code keeps using its own taxPercent.

-- How a tax return treats the code: STANDARD | ZERO_RATED | EXEMPT |
-- OUT_OF_SCOPE | REVERSE_CHARGE. Existing codes are all STANDARD.
ALTER TABLE "public"."TaxConfiguration"
  ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'STANDARD';

-- Per-line snapshot of the code picked and the amounts it produced.
ALTER TABLE "public"."SalesInvoiceItem"
  ADD COLUMN IF NOT EXISTS "taxCodeId"     TEXT,
  ADD COLUMN IF NOT EXISTS "taxCategory"   TEXT,
  ADD COLUMN IF NOT EXISTS "taxableAmount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "taxAmount"     DOUBLE PRECISION;

ALTER TABLE "public"."PurchaseInvoiceItem"
  ADD COLUMN IF NOT EXISTS "taxCodeId"     TEXT,
  ADD COLUMN IF NOT EXISTS "taxCategory"   TEXT,
  ADD COLUMN IF NOT EXISTS "taxableAmount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "taxAmount"     DOUBLE PRECISION;
