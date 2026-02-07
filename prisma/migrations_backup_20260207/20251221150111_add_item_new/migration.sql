/*
  Warnings:

  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "InventoryTxn" DROP CONSTRAINT "InventoryTxn_itemId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseInvoiceItem" DROP CONSTRAINT "PurchaseInvoiceItem_itemId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrderItem" DROP CONSTRAINT "PurchaseOrderItem_itemId_fkey";

-- DropForeignKey
ALTER TABLE "SalesInvoiceItem" DROP CONSTRAINT "SalesInvoiceItem_itemId_fkey";

-- DropTable
DROP TABLE "Item";

-- CreateTable
CREATE TABLE "ItemNew" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemNew_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemNew"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemNew"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTxn" ADD CONSTRAINT "InventoryTxn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemNew"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceItem" ADD CONSTRAINT "SalesInvoiceItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemNew"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
