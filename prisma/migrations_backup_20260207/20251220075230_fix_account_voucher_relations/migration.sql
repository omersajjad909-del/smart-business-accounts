/*
  Warnings:

  - You are about to drop the column `createdAt` on the `PurchaseInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `PurchaseInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SalesInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `SalesInvoice` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_parentId_fkey";

-- DropIndex
DROP INDEX "Account_code_key";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "city" TEXT,
ADD COLUMN     "creditDays" INTEGER,
ADD COLUMN     "creditLimit" DOUBLE PRECISION,
ADD COLUMN     "openCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "openDate" TIMESTAMP(3),
ADD COLUMN     "openDebit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "PurchaseInvoice" DROP COLUMN "createdAt",
DROP COLUMN "totalAmount";

-- AlterTable
ALTER TABLE "SalesInvoice" DROP COLUMN "createdAt",
DROP COLUMN "totalAmount";
