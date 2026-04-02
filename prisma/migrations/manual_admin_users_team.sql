-- AdminUser (Team Members) migration — manual, idempotent
-- Run this in your Postgres (e.g., Supabase SQL editor). Safe to re-run.

CREATE TABLE IF NOT EXISTS "public"."AdminUser" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"         TEXT NOT NULL,
  "email"        TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "isSuperAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
  "allowedPages" TEXT NOT NULL DEFAULT '[]',
  "team"         TEXT,
  "active"       BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"    TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastLoginAt"  TIMESTAMP
);

DO $$ BEGIN
  ALTER TABLE "public"."AdminUser" ADD CONSTRAINT "AdminUser_email_key" UNIQUE ("email");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "AdminUser_email_idx"  ON "public"."AdminUser" ("email");
CREATE INDEX IF NOT EXISTS "AdminUser_active_idx" ON "public"."AdminUser" ("active");
