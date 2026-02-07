-- CreateTable
CREATE TABLE "StockRate" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockRate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StockRate" ADD CONSTRAINT "StockRate_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemNew"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
