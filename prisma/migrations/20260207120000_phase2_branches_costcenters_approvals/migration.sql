-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_companyId_code_key" ON "Branch"("companyId", "code");
CREATE INDEX "Branch_companyId_isActive_idx" ON "Branch"("companyId", "isActive");
CREATE UNIQUE INDEX "CostCenter_companyId_code_key" ON "CostCenter"("companyId", "code");
CREATE INDEX "CostCenter_companyId_isActive_idx" ON "CostCenter"("companyId", "isActive");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PurchaseOrder
ALTER TABLE "PurchaseOrder" ADD COLUMN "branchId" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN "costCenterId" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "PurchaseOrder" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "PurchaseOrder" ADD COLUMN "approvalRemarks" TEXT;

-- PurchaseInvoice
ALTER TABLE "PurchaseInvoice" ADD COLUMN "branchId" TEXT;
ALTER TABLE "PurchaseInvoice" ADD COLUMN "costCenterId" TEXT;
ALTER TABLE "PurchaseInvoice" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "PurchaseInvoice" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "PurchaseInvoice" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "PurchaseInvoice" ADD COLUMN "approvalRemarks" TEXT;

-- SalesInvoice
ALTER TABLE "SalesInvoice" ADD COLUMN "branchId" TEXT;
ALTER TABLE "SalesInvoice" ADD COLUMN "costCenterId" TEXT;
ALTER TABLE "SalesInvoice" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "SalesInvoice" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "SalesInvoice" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "SalesInvoice" ADD COLUMN "approvalRemarks" TEXT;

-- Voucher
ALTER TABLE "Voucher" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Voucher" ADD COLUMN "costCenterId" TEXT;

-- PaymentReceipt
ALTER TABLE "PaymentReceipt" ADD COLUMN "branchId" TEXT;
ALTER TABLE "PaymentReceipt" ADD COLUMN "costCenterId" TEXT;
ALTER TABLE "PaymentReceipt" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "PaymentReceipt" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "PaymentReceipt" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "PaymentReceipt" ADD COLUMN "approvalRemarks" TEXT;

-- ExpenseVoucher
ALTER TABLE "ExpenseVoucher" ADD COLUMN "branchId" TEXT;
ALTER TABLE "ExpenseVoucher" ADD COLUMN "costCenterId" TEXT;
ALTER TABLE "ExpenseVoucher" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT';

-- Quotation
ALTER TABLE "Quotation" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "costCenterId" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Quotation" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Quotation" ADD COLUMN "approvalRemarks" TEXT;

-- DeliveryChallan
ALTER TABLE "DeliveryChallan" ADD COLUMN "branchId" TEXT;
ALTER TABLE "DeliveryChallan" ADD COLUMN "costCenterId" TEXT;
ALTER TABLE "DeliveryChallan" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "DeliveryChallan" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "DeliveryChallan" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "DeliveryChallan" ADD COLUMN "approvalRemarks" TEXT;

-- Add Foreign Keys
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExpenseVoucher" ADD CONSTRAINT "ExpenseVoucher_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpenseVoucher" ADD CONSTRAINT "ExpenseVoucher_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeliveryChallan" ADD CONSTRAINT "DeliveryChallan_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveryChallan" ADD CONSTRAINT "DeliveryChallan_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
