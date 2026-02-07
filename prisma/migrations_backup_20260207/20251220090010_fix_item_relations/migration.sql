/*
  Warnings:

  - Added the required column `unit` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "description" TEXT,
ADD COLUMN     "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unit" TEXT NOT NULL;
