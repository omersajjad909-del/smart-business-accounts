-- PkPaymentRequest: manual JazzCash / Easypaisa payment submissions

CREATE TABLE IF NOT EXISTS "PkPaymentRequest" (
  "id"           TEXT NOT NULL,
  "companyId"    TEXT,
  "userId"       TEXT,
  "email"        TEXT NOT NULL,
  "plan"         TEXT NOT NULL,
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "method"       TEXT NOT NULL,
  "mobileNumber" TEXT NOT NULL,
  "txId"         TEXT NOT NULL,
  "amountPkr"    DOUBLE PRECISION NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'PENDING',
  "adminNote"    TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PkPaymentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PkPaymentRequest_status_idx" ON "PkPaymentRequest"("status");
CREATE INDEX IF NOT EXISTS "PkPaymentRequest_email_idx"  ON "PkPaymentRequest"("email");
