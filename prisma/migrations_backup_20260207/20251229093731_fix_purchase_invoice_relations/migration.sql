-- DropForeignKey
ALTER TABLE "PurchaseInvoice" DROP CONSTRAINT "PurchaseInvoice_poId_fkey";

-- AlterTable
ALTER TABLE "PurchaseInvoice" ALTER COLUMN "poId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
