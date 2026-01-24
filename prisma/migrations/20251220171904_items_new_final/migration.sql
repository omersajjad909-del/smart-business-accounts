/*
  Warnings:

  - You are about to drop the `InventoryTxnNew` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ItemNew` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "InventoryTxnNew" DROP CONSTRAINT "InventoryTxnNew_itemId_fkey";

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "rate" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "InventoryTxnNew";

-- DropTable
DROP TABLE "ItemNew";
