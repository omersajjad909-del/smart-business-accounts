-- AlterTable
ALTER TABLE "SchoolFeeInvoice" ADD COLUMN     "accruedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SchoolSettings" ADD COLUMN     "feeAccounting" TEXT NOT NULL DEFAULT 'CASH';

