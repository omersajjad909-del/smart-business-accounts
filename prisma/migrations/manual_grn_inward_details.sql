-- GRN inward / transport details. Manual, idempotent Postgres migration.
-- Run in the production database SQL editor before deploying this feature.
ALTER TABLE "GoodsReceiptNote"
  ADD COLUMN IF NOT EXISTS "partyBillNo" TEXT,
  ADD COLUMN IF NOT EXISTS "purchaseType" TEXT,
  ADD COLUMN IF NOT EXISTS "biltyNo" TEXT,
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "cargo" TEXT,
  ADD COLUMN IF NOT EXISTS "driver" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleNo" TEXT;
