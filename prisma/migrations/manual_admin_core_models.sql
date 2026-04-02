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

