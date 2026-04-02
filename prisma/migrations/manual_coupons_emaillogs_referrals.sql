-- Coupons, EmailLogs, Referrals migration (manual, idempotent)
-- Run this in your Postgres (e.g., Supabase SQL editor). Safe to re-run.

-- 1) Coupon
CREATE TABLE IF NOT EXISTS "public"."Coupon" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code"         TEXT NOT NULL,
  "type"         TEXT NOT NULL,          -- percent | fixed
  "value"        DOUBLE PRECISION NOT NULL,
  "maxUses"      INTEGER,
  "usedCount"    INTEGER NOT NULL DEFAULT 0,
  "expiresAt"    TIMESTAMP,
  "applicableTo" TEXT,                   -- null = all plans
  "active"       BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"    TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE "public"."Coupon" ADD CONSTRAINT "Coupon_code_key" UNIQUE ("code");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Coupon_active_idx" ON "public"."Coupon" ("active");

-- 2) CouponRedemption
CREATE TABLE IF NOT EXISTS "public"."CouponRedemption" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "couponId"  TEXT NOT NULL,
  "userId"    TEXT,
  "companyId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE "public"."CouponRedemption"
    ADD CONSTRAINT "CouponRedemption_coupon_fkey"
    FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "CouponRedemption_coupon_idx" ON "public"."CouponRedemption" ("couponId");

-- 3) EmailLog
CREATE TABLE IF NOT EXISTS "public"."EmailLog" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "to"        TEXT NOT NULL,
  "subject"   TEXT NOT NULL,
  "status"    TEXT NOT NULL,   -- sent | failed
  "error"     TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "EmailLog_status_idx"  ON "public"."EmailLog" ("status");
CREATE INDEX IF NOT EXISTS "EmailLog_created_idx" ON "public"."EmailLog" ("createdAt" DESC);

-- 4) Referral
CREATE TABLE IF NOT EXISTS "public"."Referral" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "referrerId"   TEXT NOT NULL,
  "refereeEmail" TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'pending',  -- pending | signed_up | converted
  "reward"       DOUBLE PRECISION,
  "createdAt"    TIMESTAMP NOT NULL DEFAULT NOW(),
  "convertedAt"  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Referral_referrer_idx" ON "public"."Referral" ("referrerId");
CREATE INDEX IF NOT EXISTS "Referral_status_idx"   ON "public"."Referral" ("status");
