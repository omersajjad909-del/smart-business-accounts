-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT '',
    "monthlyFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolStudent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "classId" TEXT,
    "admissionNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "guardianName" TEXT,
    "phone" TEXT,
    "dob" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "admissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolFeeInvoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Tuition Fee',
    "amount" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolFeeInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolPayment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolAttendance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "SchoolAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolExam" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "passMarks" DOUBLE PRECISION NOT NULL DEFAULT 33,
    "date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolResult" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "marks" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SchoolResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_companyId_name_section_key" ON "SchoolClass"("companyId", "name", "section");

-- CreateIndex
CREATE INDEX "SchoolStudent_companyId_status_idx" ON "SchoolStudent"("companyId", "status");

-- CreateIndex
CREATE INDEX "SchoolStudent_classId_idx" ON "SchoolStudent"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolStudent_companyId_admissionNo_key" ON "SchoolStudent"("companyId", "admissionNo");

-- CreateIndex
CREATE INDEX "SchoolFeeInvoice_companyId_period_idx" ON "SchoolFeeInvoice"("companyId", "period");

-- CreateIndex
CREATE INDEX "SchoolFeeInvoice_companyId_dueDate_idx" ON "SchoolFeeInvoice"("companyId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolFeeInvoice_studentId_period_title_key" ON "SchoolFeeInvoice"("studentId", "period", "title");

-- CreateIndex
CREATE INDEX "SchoolPayment_invoiceId_idx" ON "SchoolPayment"("invoiceId");

-- CreateIndex
CREATE INDEX "SchoolPayment_companyId_paidAt_idx" ON "SchoolPayment"("companyId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolPayment_companyId_receiptNo_key" ON "SchoolPayment"("companyId", "receiptNo");

-- CreateIndex
CREATE INDEX "SchoolAttendance_companyId_date_idx" ON "SchoolAttendance"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolAttendance_studentId_date_key" ON "SchoolAttendance"("studentId", "date");

-- CreateIndex
CREATE INDEX "SchoolExam_companyId_idx" ON "SchoolExam"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolExam_classId_name_subject_key" ON "SchoolExam"("classId", "name", "subject");

-- CreateIndex
CREATE INDEX "SchoolResult_companyId_idx" ON "SchoolResult"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolResult_examId_studentId_key" ON "SchoolResult"("examId", "studentId");

-- AddForeignKey
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolStudent" ADD CONSTRAINT "SchoolStudent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolStudent" ADD CONSTRAINT "SchoolStudent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolFeeInvoice" ADD CONSTRAINT "SchoolFeeInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolFeeInvoice" ADD CONSTRAINT "SchoolFeeInvoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "SchoolStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolPayment" ADD CONSTRAINT "SchoolPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolPayment" ADD CONSTRAINT "SchoolPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SchoolFeeInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolAttendance" ADD CONSTRAINT "SchoolAttendance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolAttendance" ADD CONSTRAINT "SchoolAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "SchoolStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolExam" ADD CONSTRAINT "SchoolExam_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolExam" ADD CONSTRAINT "SchoolExam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolResult" ADD CONSTRAINT "SchoolResult_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolResult" ADD CONSTRAINT "SchoolResult_examId_fkey" FOREIGN KEY ("examId") REFERENCES "SchoolExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolResult" ADD CONSTRAINT "SchoolResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "SchoolStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

