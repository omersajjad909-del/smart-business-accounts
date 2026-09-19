-- Traveler table — manual, idempotent
-- Run this in your Postgres / Supabase SQL editor. Safe to re-run.
--
-- The person who flies, as distinct from the customer who pays. Purely
-- additive: one new table and its indexes. Nothing existing is altered or
-- dropped, so this is safe against a live database.

CREATE TABLE IF NOT EXISTS "public"."Traveler" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "companyId"       TEXT NOT NULL,
  "branchId"        TEXT,

  -- The name exactly as the passport prints it.
  "title"           TEXT,
  "firstName"       TEXT NOT NULL,
  "lastName"        TEXT NOT NULL,
  -- Both names joined, so a search hits one indexed column.
  "fullName"        TEXT NOT NULL,

  "dob"             TIMESTAMP(3),
  "gender"          TEXT,
  "nationality"     TEXT,
  "cnic"            TEXT,

  "passportNo"      TEXT,
  "passportExpiry"  TIMESTAMP(3),
  "passportIssue"   TIMESTAMP(3),
  "passportCountry" TEXT,

  "email"           TEXT,
  "phone"           TEXT,
  "altPhone"        TEXT,

  "emergencyName"   TEXT,
  "emergencyPhone"  TEXT,

  "frequentFlyer"   JSONB,
  "billToAccountId" TEXT,
  "notes"           TEXT,

  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A traveller belongs to the company that recorded them, and goes with it.
DO $$ BEGIN
  ALTER TABLE "public"."Traveler"
    ADD CONSTRAINT "Traveler_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- The four ways a traveller is actually looked for: by name when somebody
-- rings up, by passport when a document arrives, by expiry when the six-month
-- rule bites, by phone when that is all the desk has.
CREATE INDEX IF NOT EXISTS "Traveler_companyId_fullName_idx"       ON "public"."Traveler"("companyId", "fullName");
CREATE INDEX IF NOT EXISTS "Traveler_companyId_passportNo_idx"     ON "public"."Traveler"("companyId", "passportNo");
CREATE INDEX IF NOT EXISTS "Traveler_companyId_passportExpiry_idx" ON "public"."Traveler"("companyId", "passportExpiry");
CREATE INDEX IF NOT EXISTS "Traveler_companyId_phone_idx"          ON "public"."Traveler"("companyId", "phone");
