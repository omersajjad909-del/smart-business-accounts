-- Applied manually via Prisma client (shadow DB unreachable through the
-- Supabase pooler for `prisma migrate dev`). Kept here for schema history,
-- matching the other manual_*.sql files in this folder.

CREATE TABLE IF NOT EXISTS "GoogleAdsAuth" (
  "id" TEXT PRIMARY KEY,
  "refreshToken" TEXT NOT NULL,
  "connectedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "GoogleAdsAuth_createdAt_idx" ON "GoogleAdsAuth"("createdAt");
