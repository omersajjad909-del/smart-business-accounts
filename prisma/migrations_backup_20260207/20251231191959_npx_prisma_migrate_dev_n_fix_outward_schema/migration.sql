-- AlterTable
ALTER TABLE "InventoryTxn" ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "ItemNew" ADD COLUMN     "minStock" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Outward" (
    "id" TEXT NOT NULL,
    "outwardNo" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "driverName" TEXT,
    "vehicleNo" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutwardItem" (
    "id" TEXT NOT NULL,
    "outwardId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,

    CONSTRAINT "OutwardItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Outward_outwardNo_key" ON "Outward"("outwardNo");

-- AddForeignKey
ALTER TABLE "Outward" ADD CONSTRAINT "Outward_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutwardItem" ADD CONSTRAINT "OutwardItem_outwardId_fkey" FOREIGN KEY ("outwardId") REFERENCES "Outward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutwardItem" ADD CONSTRAINT "OutwardItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemNew"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
