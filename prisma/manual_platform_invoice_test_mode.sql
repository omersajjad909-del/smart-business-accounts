-- PlatformInvoice.testMode
--
-- A charge the provider made in its own test mode: a real webhook, a real
-- ledger row, and money nobody paid. Without this column those rows are
-- indistinguishable from customers — two of them were being counted in the
-- admin ledger's invoice count, its company count and its currency totals.
--
-- Applied by hand, like every other migration in this project.

ALTER TABLE "PlatformInvoice"
  ADD COLUMN IF NOT EXISTS "testMode" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "PlatformInvoice_testMode_issuedAt_idx"
  ON "PlatformInvoice" ("testMode", "issuedAt");

-- Backfill for rows written before the column existed.
--
-- Deliberately narrow: only Lemon Squeezy rows whose company no longer exists.
-- A test charge is made against a throwaway workspace, so the company is gone;
-- a real customer's is not. Nothing is matched on amount or plan — a genuine
-- small invoice must never be swept up as a test.
--
-- Check what it will touch before running it:
--
--   SELECT "number", "issuedAt", "customerEmail", "currency", "total"
--   FROM "PlatformInvoice" i
--   WHERE i."provider" = 'LEMONSQUEEZY'
--     AND NOT EXISTS (SELECT 1 FROM "Company" c WHERE c."id" = i."companyId");
--
UPDATE "PlatformInvoice" i
   SET "testMode" = true
 WHERE i."provider" = 'LEMONSQUEEZY'
   AND i."testMode" = false
   AND NOT EXISTS (SELECT 1 FROM "Company" c WHERE c."id" = i."companyId");
