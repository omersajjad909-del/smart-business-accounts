-- FBR export/zero-rated filing + pending-sync retry fields — manual, idempotent.
-- Run in your Postgres / Supabase SQL editor, or via `npx prisma db execute`.
-- Safe to re-run. Adds nullable/defaulted columns only, so every existing row
-- keeps filing exactly as it did before this shipped.
--
-- See lib/fbrEInvoice.ts, app/api/e-invoice/[id]/route.ts and
-- app/api/cron/fbr-retry.

ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrSaleType" TEXT;
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrSroScheduleNo" TEXT;
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrRetryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrLastRetryAt" TIMESTAMP(3);
