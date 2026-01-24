/*
  Warnings:

  - You are about to drop the column `accountId` on the `Voucher` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `Voucher` table. All the data in the column will be lost.
  - You are about to drop the column `cashId` on the `Voucher` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Voucher" DROP CONSTRAINT "Voucher_accountId_fkey";

-- DropForeignKey
ALTER TABLE "Voucher" DROP CONSTRAINT "Voucher_cashId_fkey";

-- AlterTable
ALTER TABLE "Voucher" DROP COLUMN "accountId",
DROP COLUMN "amount",
DROP COLUMN "cashId";

-- CreateTable
CREATE TABLE "VoucherEntry" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "VoucherEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VoucherEntry" ADD CONSTRAINT "VoucherEntry_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherEntry" ADD CONSTRAINT "VoucherEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
