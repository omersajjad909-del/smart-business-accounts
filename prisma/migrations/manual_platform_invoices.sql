-- PlatformInvoice: FinovaOS's own sales ledger — one immutable row per
-- subscription payment collected, numbered once and never recomputed.
--
-- Replaces receipts that were derived on the fly from ActivityLog PAYMENT_EVENT
-- rows, where the number was the row's position in a per-company list: every
-- company's first payment was "INV-2026-001", and existing invoices were
-- renumbered whenever a newer payment arrived.

CREATE TABLE IF NOT EXISTS "PlatformInvoice" (
  "id"                     TEXT NOT NULL,
  "number"                 TEXT NOT NULL,

  "companyId"              TEXT NOT NULL,
  "companyName"            TEXT,

  "provider"               TEXT NOT NULL,
  "providerEventId"        TEXT,
  "providerOrderId"        TEXT,
  "providerSubscriptionId" TEXT,

  "plan"                   TEXT NOT NULL,
  "billingCycle"           TEXT NOT NULL DEFAULT 'MONTHLY',

  "currency"               TEXT NOT NULL DEFAULT 'USD',
  "subtotal"               DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount"               DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxRate"                DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxAmount"              DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxName"                TEXT,
  "total"                  DOUBLE PRECISION NOT NULL DEFAULT 0,

  "customerName"           TEXT,
  "customerEmail"          TEXT,
  "customerCountry"        TEXT,
  "customerTaxId"          TEXT,

  "cardBrand"              TEXT,
  "cardLast4"              TEXT,

  "status"                 TEXT NOT NULL DEFAULT 'PAID',
  "refundedAmount"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "refundedAt"             TIMESTAMP(3),

  "periodStart"            TIMESTAMP(3),
  "periodEnd"              TIMESTAMP(3),

  "issuedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformInvoice_pkey" PRIMARY KEY ("id")
);

-- The number is the document identity — a duplicate would mean two different
-- charges claiming to be the same invoice.
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformInvoice_number_key"
  ON "PlatformInvoice"("number");

-- Idempotency: a provider retrying its webhook must not mint a second number.
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformInvoice_providerEventId_key"
  ON "PlatformInvoice"("providerEventId");

CREATE INDEX IF NOT EXISTS "PlatformInvoice_companyId_issuedAt_idx"
  ON "PlatformInvoice"("companyId", "issuedAt");
CREATE INDEX IF NOT EXISTS "PlatformInvoice_status_issuedAt_idx"
  ON "PlatformInvoice"("status", "issuedAt");
CREATE INDEX IF NOT EXISTS "PlatformInvoice_provider_issuedAt_idx"
  ON "PlatformInvoice"("provider", "issuedAt");
CREATE INDEX IF NOT EXISTS "PlatformInvoice_issuedAt_idx"
  ON "PlatformInvoice"("issuedAt");
