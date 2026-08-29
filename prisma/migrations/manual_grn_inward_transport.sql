-- ============ GRN: INWARD & TRANSPORT DETAILS ============
-- The "Inward & Transport Details" panel on /dashboard/grn writes seven fields
-- that were added to the Prisma schema but never added to the database. Every
-- GRN save therefore failed with
--
--   P2022  The column `partyBillNo` does not exist in the current database
--
-- which app/api/grn/route.ts swallowed into a flat 500 / "GRN save failed", so
-- the screen said nothing about what was actually wrong.
--
-- All seven are nullable text, so this is additive: existing rows get NULL and
-- no backfill is needed. Idempotent — safe to re-run.

ALTER TABLE "GoodsReceiptNote"
  ADD COLUMN IF NOT EXISTS "partyBillNo"  TEXT,
  ADD COLUMN IF NOT EXISTS "purchaseType" TEXT,  -- CASH | CREDIT
  ADD COLUMN IF NOT EXISTS "biltyNo"      TEXT,
  ADD COLUMN IF NOT EXISTS "location"     TEXT,
  ADD COLUMN IF NOT EXISTS "cargo"        TEXT,
  ADD COLUMN IF NOT EXISTS "driver"       TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleNo"    TEXT;
