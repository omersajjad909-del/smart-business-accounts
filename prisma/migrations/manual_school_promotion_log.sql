-- CreateTable
CREATE TABLE "SchoolPromotionLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromClass" TEXT NOT NULL,
    "toClass" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolPromotionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolPromotionLog_studentId_idx" ON "SchoolPromotionLog"("studentId");

-- CreateIndex
CREATE INDEX "SchoolPromotionLog_companyId_createdAt_idx" ON "SchoolPromotionLog"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "SchoolPromotionLog" ADD CONSTRAINT "SchoolPromotionLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolPromotionLog" ADD CONSTRAINT "SchoolPromotionLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "SchoolStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

