-- Purchase Invoice is linked to the actual GRN that it bills.
-- Existing invoices remain valid and simply have a NULL grnId.
ALTER TABLE "PurchaseInvoice" ADD COLUMN IF NOT EXISTS "grnId" TEXT;
CREATE INDEX IF NOT EXISTS "PurchaseInvoice_companyId_grnId_idx"
  ON "PurchaseInvoice" ("companyId", "grnId");
DO $$ BEGIN
  ALTER TABLE "PurchaseInvoice"
    ADD CONSTRAINT "PurchaseInvoice_grnId_fkey"
    FOREIGN KEY ("grnId") REFERENCES "GoodsReceiptNote"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
