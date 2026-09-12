-- Packing material held as stock, and named on the challan that consumed it.
-- Manual, idempotent. Run in your Postgres / Supabase SQL editor. Safe to re-run.
--
-- Until now "Packaging Source" on a delivery challan was a free-text label
-- (BAGS / CARTON / PACKET) that touched nothing. This adds a nullable link to
-- the item the goods were packed in, so dispatching a challan can take the
-- bags or cartons out of the godown the way it takes the goods out.
--
-- The old "packagingType" column is deliberately left in place and untouched:
-- every challan written before this migration still carries its label there,
-- and the printed challan falls back to it.
--
-- Packing items are ordinary ItemNew rows with category = 'PACKAGING'; no
-- enum or lookup table is needed, so nothing else changes.

ALTER TABLE "public"."DeliveryChallan"
  ADD COLUMN IF NOT EXISTS "packagingItemId" TEXT;

CREATE INDEX IF NOT EXISTS "DeliveryChallan_packagingItemId_idx"
  ON "public"."DeliveryChallan" ("packagingItemId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DeliveryChallan_packagingItemId_fkey'
  ) THEN
    ALTER TABLE "public"."DeliveryChallan"
      ADD CONSTRAINT "DeliveryChallan_packagingItemId_fkey"
      FOREIGN KEY ("packagingItemId") REFERENCES "public"."ItemNew"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
