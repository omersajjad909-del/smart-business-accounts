-- Booking → Quotation link — manual, idempotent
-- Run this in your Postgres / Supabase SQL editor. Safe to re-run.
--
-- A trip is quoted before it is invoiced, which is the order the conversation
-- actually happens in. Two nullable columns; nothing existing is altered.

DO $$ BEGIN
  ALTER TABLE "public"."Booking" ADD COLUMN "quotationId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."Booking" ADD COLUMN "quotationNo" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
