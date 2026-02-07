/*
  Warnings:

  - Added the required column `remarks` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rate` to the `PurchaseOrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `SalesInvoice` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SaleReturn" DROP CONSTRAINT "SaleReturn_invoiceId_fkey";

-- AlterTable
ALTER TABLE "InventoryTxn" ADD COLUMN     "partyId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "remarks" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ADD COLUMN     "rate" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "SaleReturn" ALTER COLUMN "invoiceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN     "total" DOUBLE PRECISION NOT NULL;

-- AddForeignKey
ALTER TABLE "InventoryTxn" ADD CONSTRAINT "InventoryTxn_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
