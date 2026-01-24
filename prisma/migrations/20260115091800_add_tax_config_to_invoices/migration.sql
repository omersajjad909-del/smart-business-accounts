-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "taxConfigId" TEXT;

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN     "taxConfigId" TEXT;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_taxConfigId_fkey" FOREIGN KEY ("taxConfigId") REFERENCES "TaxConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_taxConfigId_fkey" FOREIGN KEY ("taxConfigId") REFERENCES "TaxConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
