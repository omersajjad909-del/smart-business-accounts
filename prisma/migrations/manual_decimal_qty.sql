-- Quantities become fractional.
--
-- A yarn or fabric business weighs its stock: 1,247.5 kg is an ordinary
-- figure, and an Int column silently refused it. Every quantity in the
-- trading and manufacturing document chain is widened to DOUBLE PRECISION.
--
-- Widening is loss-free — an integer is a valid double — so existing rows
-- carry over untouched and businesses that deal in whole units notice
-- nothing. Re-running the file is safe; ALTER ... TYPE to the type a column
-- already has is a no-op in Postgres.

-- Purchase chain: order → receipt → invoice
ALTER TABLE "PurchaseOrderItem"    ALTER COLUMN "qty"         TYPE DOUBLE PRECISION;
ALTER TABLE "PurchaseOrderItem"    ALTER COLUMN "invoicedQty" TYPE DOUBLE PRECISION;
ALTER TABLE "GoodsReceiptNoteItem" ALTER COLUMN "orderedQty"  TYPE DOUBLE PRECISION;
ALTER TABLE "GoodsReceiptNoteItem" ALTER COLUMN "receivedQty" TYPE DOUBLE PRECISION;
ALTER TABLE "PurchaseInvoiceItem"  ALTER COLUMN "qty"         TYPE DOUBLE PRECISION;

-- Sales chain: quotation → challan → invoice → return
ALTER TABLE "QuotationItem"        ALTER COLUMN "qty"         TYPE DOUBLE PRECISION;
ALTER TABLE "DeliveryChallanItem"  ALTER COLUMN "qty"         TYPE DOUBLE PRECISION;
ALTER TABLE "SalesInvoiceItem"     ALTER COLUMN "qty"         TYPE DOUBLE PRECISION;
ALTER TABLE "SaleReturnItem"       ALTER COLUMN "qty"         TYPE DOUBLE PRECISION;
ALTER TABLE "OutwardItem"          ALTER COLUMN "qty"         TYPE DOUBLE PRECISION;

-- Stock ledger. Shared by every business type, so it has to move with them:
-- stock on hand is SUM(InventoryTxn.qty), and a fractional invoice line that
-- posted to an Int ledger would round the balance away.
ALTER TABLE "InventoryTxn"         ALTER COLUMN "qty"         TYPE DOUBLE PRECISION;
