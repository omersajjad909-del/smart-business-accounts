-- UserPermission table — manual, idempotent
-- Run this in your Postgres / Supabase SQL editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS "public"."UserPermission" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     TEXT NOT NULL,
  "permission" TEXT NOT NULL,
  "companyId"  TEXT NOT NULL
);

-- Add companyId column if table exists but is missing the column (upgrade path)
DO $$ BEGIN
  ALTER TABLE "public"."UserPermission" ADD COLUMN "companyId" TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Unique constraint
DO $$ BEGIN
  ALTER TABLE "public"."UserPermission"
    ADD CONSTRAINT "UserPermission_userId_permission_companyId_key"
    UNIQUE ("userId", "permission", "companyId");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index
CREATE INDEX IF NOT EXISTS "UserPermission_companyId_idx" ON "public"."UserPermission" ("companyId");

-- FK -> User
DO $$ BEGIN
  ALTER TABLE "public"."UserPermission"
    ADD CONSTRAINT "UserPermission_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FK -> Company
DO $$ BEGIN
  ALTER TABLE "public"."UserPermission"
    ADD CONSTRAINT "UserPermission_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
