-- FBR digital e-invoicing fields on SalesInvoice — manual, idempotent.
-- Run in your Postgres / Supabase SQL editor, or via `npx prisma db execute`.
-- Safe to re-run.
--
-- Adds nullable columns only. A company that never opens the E-Invoice page
-- never writes to them, so every existing row and code path is untouched:
-- fbrStatus simply defaults to 'NOT_FILED' and the rest stay NULL.
-- See lib/fbrEInvoice.ts and app/dashboard/e-invoice.

ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrStatus" TEXT DEFAULT 'NOT_FILED';
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrInvoiceNo" TEXT;
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrIrn" TEXT;
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrQrPayload" TEXT;
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrFiledAt" TIMESTAMP(3);
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrResponse" JSONB;
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrScenarioId" TEXT;
