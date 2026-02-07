-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastReconcile" TIMESTAMP(3),
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatement" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "statementNo" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "referenceNo" TEXT,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciliationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "reconcileDate" TIMESTAMP(3) NOT NULL,
    "systemBalance" DOUBLE PRECISION NOT NULL,
    "bankBalance" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "narration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "partyId" TEXT,
    "referenceNo" TEXT,
    "narration" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "voucherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseVoucher" (
    "id" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "expenseAccountId" TEXT NOT NULL,
    "paymentAccountId" TEXT NOT NULL,
    "voucherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseItem" (
    "id" TEXT NOT NULL,
    "expenseVoucherId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "ExpenseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAttachment" (
    "id" TEXT NOT NULL,
    "expenseVoucherId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseApproval" (
    "id" TEXT NOT NULL,
    "expenseVoucherId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approvalStatus" TEXT NOT NULL,
    "remarks" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxConfiguration" (
    "id" TEXT NOT NULL,
    "taxType" TEXT NOT NULL,
    "taxCode" TEXT NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxAccount" (
    "id" TEXT NOT NULL,
    "taxConfigurationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "taxType" TEXT NOT NULL,

    CONSTRAINT "TaxAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceTax" (
    "id" TEXT NOT NULL,
    "invoiceType" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "taxConfigurationId" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceTax_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_accountNo_key" ON "BankAccount"("accountNo");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_receiptNo_key" ON "PaymentReceipt"("receiptNo");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseVoucher_voucherNo_key" ON "ExpenseVoucher"("voucherNo");

-- CreateIndex
CREATE UNIQUE INDEX "TaxConfiguration_taxCode_key" ON "TaxConfiguration"("taxCode");

-- CreateIndex
CREATE UNIQUE INDEX "TaxAccount_taxConfigurationId_accountId_taxType_key" ON "TaxAccount"("taxConfigurationId", "accountId", "taxType");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "BankReconciliation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseVoucher" ADD CONSTRAINT "ExpenseVoucher_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseVoucher" ADD CONSTRAINT "ExpenseVoucher_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseVoucher" ADD CONSTRAINT "ExpenseVoucher_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_expenseVoucherId_fkey" FOREIGN KEY ("expenseVoucherId") REFERENCES "ExpenseVoucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAttachment" ADD CONSTRAINT "ExpenseAttachment_expenseVoucherId_fkey" FOREIGN KEY ("expenseVoucherId") REFERENCES "ExpenseVoucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApproval" ADD CONSTRAINT "ExpenseApproval_expenseVoucherId_fkey" FOREIGN KEY ("expenseVoucherId") REFERENCES "ExpenseVoucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxAccount" ADD CONSTRAINT "TaxAccount_taxConfigurationId_fkey" FOREIGN KEY ("taxConfigurationId") REFERENCES "TaxConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxAccount" ADD CONSTRAINT "TaxAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceTax" ADD CONSTRAINT "InvoiceTax_taxConfigurationId_fkey" FOREIGN KEY ("taxConfigurationId") REFERENCES "TaxConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
