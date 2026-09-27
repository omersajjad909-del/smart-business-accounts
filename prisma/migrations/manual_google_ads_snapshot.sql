-- Applied manually via Prisma client (shadow DB unreachable through the
-- Supabase pooler for `prisma migrate dev`). Kept here for schema history,
-- matching the other manual_*.sql files in this folder.

CREATE TABLE IF NOT EXISTS "GoogleAdsSnapshot" (
  "id" TEXT PRIMARY KEY,
  "campaignName" TEXT NOT NULL,
  "dateRangeFrom" TIMESTAMP(3) NOT NULL,
  "dateRangeTo" TIMESTAMP(3) NOT NULL,
  "impressions" INTEGER NOT NULL,
  "clicks" INTEGER NOT NULL,
  "costPkr" DOUBLE PRECISION NOT NULL,
  "conversions" DOUBLE PRECISION NOT NULL,
  "ctr" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "GoogleAdsSnapshot_recordedAt_idx" ON "GoogleAdsSnapshot"("recordedAt");
