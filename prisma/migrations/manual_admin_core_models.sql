-- Admin core models migration (manual, idempotent)
-- Run this in your Postgres (e.g., Supabase SQL editor). Safe to re-run.

-- 1) Company columns
ALTER TABLE "public"."Company" 
  ADD COLUMN IF NOT EXISTS "country"               TEXT,
  ADD COLUMN IF NOT EXISTS "plan"                  TEXT,
  ADD COLUMN IF NOT EXISTS "subscriptionStatus"    TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "stripeCustomerId"      TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId"  TEXT,
  ADD COLUMN IF NOT EXISTS "currentPeriodEnd"      TIMESTAMP;

-- 2) FeatureFlag
CREATE TABLE IF NOT EXISTS "public"."FeatureFlag" (
  "id"        TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "key"       TEXT NOT NULL,
  "enabled"   BOOLEAN NOT NULL DEFAULT FALSE,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unique composite for (companyId, key)
DO $$ BEGIN
  ALTER TABLE "public"."FeatureFlag" ADD CONSTRAINT "FeatureFlag_company_key_unique" UNIQUE ("companyId","key");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FK -> Company
DO $$ BEGIN
  ALTER TABLE "public"."FeatureFlag" ADD CONSTRAINT "FeatureFlag_company_fkey"
    FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) PaymentEvent
CREATE TABLE IF NOT EXISTS "public"."PaymentEvent" (
  "id"         TEXT PRIMARY KEY,
  "companyId"  TEXT,
  "status"     TEXT NOT NULL,         -- succeeded | failed
  "amount"     INTEGER NOT NULL,      -- cents
  "currency"   TEXT NOT NULL,         -- USD, AED, etc.
  "occurredAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "raw"        TEXT,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for queries
CREATE INDEX IF NOT EXISTS "PaymentEvent_company_occurred_idx" ON "public"."PaymentEvent" ("companyId", "occurredAt");

-- FK -> Company (nullable)
DO $$ BEGIN
  ALTER TABLE "public"."PaymentEvent" ADD CONSTRAINT "PaymentEvent_company_fkey"
    FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) LoginLog
CREATE TABLE IF NOT EXISTS "public"."LoginLog" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT,
  "companyId" TEXT,
  "ip"        TEXT,
  "country"   TEXT,
  "city"      TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "LoginLog_created_idx" ON "public"."LoginLog" ("createdAt");
CREATE INDEX IF NOT EXISTS "LoginLog_country_idx" ON "public"."LoginLog" ("country");

-- FK -> User (nullable)
DO $$ BEGIN
  ALTER TABLE "public"."LoginLog" ADD CONSTRAINT "LoginLog_user_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FK -> Company (nullable)
DO $$ BEGIN
  ALTER TABLE "public"."LoginLog" ADD CONSTRAINT "LoginLog_company_fkey"
    FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) AdminProductCategory
CREATE TABLE IF NOT EXISTS "public"."AdminProductCategory" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "color"       TEXT NOT NULL DEFAULT '#8b5cf6',
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminProductCategory_name_key"
  ON "public"."AdminProductCategory" ("name");

-- 6) AdminTaxPreset
CREATE TABLE IF NOT EXISTS "public"."AdminTaxPreset" (
  "id"          TEXT PRIMARY KEY,
  "country"     TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "region"      TEXT,
  "taxType"     TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "code"        TEXT NOT NULL,
  "rate"        DOUBLE PRECISION NOT NULL,
  "isDefault"   BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "description" TEXT,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminTaxPreset_code_key"
  ON "public"."AdminTaxPreset" ("code");

CREATE INDEX IF NOT EXISTS "AdminTaxPreset_countryCode_isActive_idx"
  ON "public"."AdminTaxPreset" ("countryCode", "isActive");

-- 7) PlatformCurrency
CREATE TABLE IF NOT EXISTS "public"."PlatformCurrency" (
  "id"           TEXT PRIMARY KEY,
  "code"         TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "symbol"       TEXT NOT NULL,
  "flag"         TEXT,
  "isEnabled"    BOOLEAN NOT NULL DEFAULT TRUE,
  "isDefault"    BOOLEAN NOT NULL DEFAULT FALSE,
  "rateSource"   TEXT NOT NULL DEFAULT 'MANUAL',
  "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "createdAt"    TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformCurrency_code_key"
  ON "public"."PlatformCurrency" ("code");

CREATE INDEX IF NOT EXISTS "PlatformCurrency_isEnabled_idx"
  ON "public"."PlatformCurrency" ("isEnabled");

-- 8) AdminPaymentGateway
CREATE TABLE IF NOT EXISTS "public"."AdminPaymentGateway" (
  "id"          TEXT PRIMARY KEY,
  "key"         TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "category"    TEXT NOT NULL DEFAULT 'OTHER',
  "isEnabled"   BOOLEAN NOT NULL DEFAULT FALSE,
  "configJson"  TEXT,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminPaymentGateway_key_key"
  ON "public"."AdminPaymentGateway" ("key");

