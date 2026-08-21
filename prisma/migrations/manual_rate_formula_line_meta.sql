-- Formula-driven line rates — per-line dimension storage.
-- Manual, idempotent. Run in your Postgres / Supabase SQL editor. Safe to re-run.
--
-- Adds a nullable JSONB column to every document line table. A company that has
-- not set up a rate formula never writes to it, so every existing row and every
-- existing code path is untouched: the column simply stays NULL.
--
-- Shape of the value, when present:
--   { "gauge": 7, "width": 56, "length": 100, "phr": 24, "shade": 15, "rtmm": 12 }
-- The keys are whatever columns the company defined in
-- /dashboard/rate-formula. See lib/rateFormula.ts.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'PurchaseOrderItem',
    'PurchaseInvoiceItem',
    'SalesInvoiceItem',
    'QuotationItem',
    'GoodsReceiptNoteItem',
    'SaleReturnItem',
    'DeliveryChallanItem',
    'OutwardItem',
    'InventoryTxn',
    'ItemNew'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS "meta" JSONB', 'public', t);
    END IF;
  END LOOP;
END $$;
