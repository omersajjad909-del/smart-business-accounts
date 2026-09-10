-- FBR Sales Tax Invoice format support + Delivery Challan particulars.
-- Manual, idempotent. Safe to re-run. All new columns are nullable, so every
-- existing row and code path is untouched until a company/item actually uses
-- them.

-- Item master: FBR tariff heading, and the secondary unit a line can also be
-- billed in (e.g. pieces + kg).
ALTER TABLE "ItemNew"
  ADD COLUMN IF NOT EXISTS "hsCode" TEXT,
  ADD COLUMN IF NOT EXISTS "secondaryUnit" TEXT,
  ADD COLUMN IF NOT EXISTS "secondaryUnitRatio" DOUBLE PRECISION;

-- Sales invoice line: buyer's own PO reference for that line, and the
-- secondary-unit figures actually billed (independent of the item's default
-- ratio, so a later change to the item never rewrites a past invoice).
ALTER TABLE "SalesInvoiceItem"
  ADD COLUMN IF NOT EXISTS "hsCode" TEXT,
  ADD COLUMN IF NOT EXISTS "poNo" TEXT,
  ADD COLUMN IF NOT EXISTS "secondaryUnit" TEXT,
  ADD COLUMN IF NOT EXISTS "secondaryQty" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "secondaryRate" DOUBLE PRECISION;

-- Delivery challan: the buyer's own serial/order/PO references, and how the
-- goods were packed for dispatch.
ALTER TABLE "DeliveryChallan"
  ADD COLUMN IF NOT EXISTS "serialNo" TEXT,
  ADD COLUMN IF NOT EXISTS "orderNo" TEXT,
  ADD COLUMN IF NOT EXISTS "poNo" TEXT,
  ADD COLUMN IF NOT EXISTS "packagingType" TEXT,
  ADD COLUMN IF NOT EXISTS "packagingQty" DOUBLE PRECISION;
