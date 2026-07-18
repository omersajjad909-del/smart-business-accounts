-- Add Safepay fields to Subscription table
ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "provider"       TEXT NOT NULL DEFAULT 'LEMONSQUEEZY',
  ADD COLUMN IF NOT EXISTS "safepayTracker" TEXT,
  ADD COLUMN IF NOT EXISTS "safepayOrderId" TEXT;

-- Backfill existing rows that have Stripe data
UPDATE "Subscription" SET "provider" = 'STRIPE'
  WHERE "stripeCustomerId" IS NOT NULL
    AND "stripeCustomerId" LIKE 'cus_%';

CREATE INDEX IF NOT EXISTS "Subscription_provider_status_idx"
  ON "Subscription" ("provider", "status");
