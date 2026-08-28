-- Biometric attendance devices — manual, idempotent
-- Run this in your Postgres / Supabase SQL editor. Safe to re-run.
--
-- Adds:
--   Employee.biometricId   the enrollment number the machine knows a person by
--   BiometricDevice        one registered fingerprint / face machine
--   AttendancePunch        raw scans, kept forever; daily Attendance is derived

-- ── Employee.biometricId ────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "public"."Employee" ADD COLUMN "biometricId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- One enrollment number per company. NULLs stay distinct in Postgres, so every
-- unmapped employee is still allowed.
DO $$ BEGIN
  ALTER TABLE "public"."Employee"
    ADD CONSTRAINT "Employee_companyId_biometricId_key"
    UNIQUE ("companyId", "biometricId");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── BiometricDevice ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "public"."BiometricDevice" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "companyId"    TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "brand"        TEXT NOT NULL DEFAULT 'ZKTECO',
  "mode"         TEXT NOT NULL DEFAULT 'BRIDGE',
  "location"     TEXT,
  "ipAddress"    TEXT,
  "apiKeyHash"   TEXT NOT NULL,
  "apiKeyPrefix" TEXT NOT NULL,
  "tzOffsetMin"  INTEGER NOT NULL DEFAULT 300,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt"   TIMESTAMP(3),
  "lastPunchAt"  TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  ALTER TABLE "public"."BiometricDevice"
    ADD CONSTRAINT "BiometricDevice_companyId_serialNumber_key"
    UNIQUE ("companyId", "serialNumber");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lookup path for every bridge-agent request, so it must be indexed.
CREATE INDEX IF NOT EXISTS "BiometricDevice_apiKeyHash_idx"
  ON "public"."BiometricDevice" ("apiKeyHash");
CREATE INDEX IF NOT EXISTS "BiometricDevice_companyId_isActive_idx"
  ON "public"."BiometricDevice" ("companyId", "isActive");

DO $$ BEGIN
  ALTER TABLE "public"."BiometricDevice"
    ADD CONSTRAINT "BiometricDevice_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── AttendancePunch ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "public"."AttendancePunch" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "companyId"   TEXT NOT NULL,
  "deviceId"    TEXT NOT NULL,
  "biometricId" TEXT NOT NULL,
  "employeeId"  TEXT,
  "punchTime"   TIMESTAMP(3) NOT NULL,
  "direction"   TEXT NOT NULL DEFAULT 'AUTO',
  "verifyMode"  TEXT,
  "source"      TEXT NOT NULL DEFAULT 'BRIDGE',
  "raw"         TEXT,
  "processed"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The dedupe key. Without it a retried batch would double every check-in.
DO $$ BEGIN
  ALTER TABLE "public"."AttendancePunch"
    ADD CONSTRAINT "AttendancePunch_deviceId_biometricId_punchTime_key"
    UNIQUE ("deviceId", "biometricId", "punchTime");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "AttendancePunch_companyId_punchTime_idx"
  ON "public"."AttendancePunch" ("companyId", "punchTime");
CREATE INDEX IF NOT EXISTS "AttendancePunch_employeeId_punchTime_idx"
  ON "public"."AttendancePunch" ("employeeId", "punchTime");
CREATE INDEX IF NOT EXISTS "AttendancePunch_companyId_processed_idx"
  ON "public"."AttendancePunch" ("companyId", "processed");

DO $$ BEGIN
  ALTER TABLE "public"."AttendancePunch"
    ADD CONSTRAINT "AttendancePunch_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."AttendancePunch"
    ADD CONSTRAINT "AttendancePunch_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "public"."BiometricDevice"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Deleting an employee must not erase the scan itself — the punch stays as
-- evidence, it just stops pointing anywhere.
DO $$ BEGIN
  ALTER TABLE "public"."AttendancePunch"
    ADD CONSTRAINT "AttendancePunch_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
