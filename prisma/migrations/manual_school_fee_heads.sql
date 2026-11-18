-- CreateTable
CREATE TABLE "SchoolFeeHead" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "defaultAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolFeeHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClassFee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "headId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SchoolClassFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolStudentFee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "headId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SchoolStudentFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolFeeHead_companyId_name_key" ON "SchoolFeeHead"("companyId", "name");

-- CreateIndex
CREATE INDEX "SchoolClassFee_companyId_idx" ON "SchoolClassFee"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClassFee_classId_headId_key" ON "SchoolClassFee"("classId", "headId");

-- CreateIndex
CREATE INDEX "SchoolStudentFee_companyId_idx" ON "SchoolStudentFee"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolStudentFee_studentId_headId_key" ON "SchoolStudentFee"("studentId", "headId");

-- AddForeignKey
ALTER TABLE "SchoolFeeHead" ADD CONSTRAINT "SchoolFeeHead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClassFee" ADD CONSTRAINT "SchoolClassFee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClassFee" ADD CONSTRAINT "SchoolClassFee_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClassFee" ADD CONSTRAINT "SchoolClassFee_headId_fkey" FOREIGN KEY ("headId") REFERENCES "SchoolFeeHead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolStudentFee" ADD CONSTRAINT "SchoolStudentFee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolStudentFee" ADD CONSTRAINT "SchoolStudentFee_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "SchoolStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolStudentFee" ADD CONSTRAINT "SchoolStudentFee_headId_fkey" FOREIGN KEY ("headId") REFERENCES "SchoolFeeHead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

