-- Booking / BookingItem / BookingTraveler — manual, idempotent
-- Run this in your Postgres / Supabase SQL editor. Safe to re-run.
--
-- One trip, however many services it is made of. Purely additive: three new
-- tables, their constraints and indexes. Nothing existing is altered or
-- dropped, and the vertical records (travel_ticket, travel_visa …) are left
-- exactly as they are — a BookingItem points at them.

CREATE TABLE IF NOT EXISTS "public"."Booking" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "companyId"         TEXT NOT NULL,
  "branchId"          TEXT,

  "bookingNo"         TEXT NOT NULL,

  "customerAccountId" TEXT,
  "customerName"      TEXT NOT NULL,

  "status"            TEXT NOT NULL DEFAULT 'draft',
  "source"            TEXT,

  "travelDate"        TIMESTAMP(3),
  "returnDate"        TIMESTAMP(3),

  -- Summed from the items on every write, never posted by a client.
  "saleTotal"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "costTotal"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "marginTotal"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paidTotal"         DOUBLE PRECISION NOT NULL DEFAULT 0,

  "invoiceId"         TEXT,
  "invoiceNo"         TEXT,
  "notes"             TEXT,

  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "public"."BookingItem" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "bookingId"         TEXT NOT NULL,

  "productType"       TEXT NOT NULL,
  "title"             TEXT NOT NULL,

  "supplierName"      TEXT,
  "supplierAccountId" TEXT,

  "sale"              DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cost"              DOUBLE PRECISION NOT NULL DEFAULT 0,
  "qty"               DOUBLE PRECISION NOT NULL DEFAULT 1,

  -- The vertical record this came from, so the existing desks keep working.
  "sourceCategory"    TEXT,
  "sourceRecordId"    TEXT,

  "data"              JSONB,
  "status"            TEXT NOT NULL DEFAULT 'pending',

  "serviceDate"       TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "public"."BookingTraveler" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "bookingId"  TEXT NOT NULL,
  "travelerId" TEXT NOT NULL,
  "role"       TEXT NOT NULL DEFAULT 'adult',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Two files under one reference is how a trip gets invoiced twice.
DO $$ BEGIN
  ALTER TABLE "public"."Booking"
    ADD CONSTRAINT "Booking_companyId_bookingNo_key" UNIQUE ("companyId", "bookingNo");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."Booking"
    ADD CONSTRAINT "Booking_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Services and travellers go with the booking they belong to.
DO $$ BEGIN
  ALTER TABLE "public"."BookingItem"
    ADD CONSTRAINT "BookingItem_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "public"."BookingTraveler"
    ADD CONSTRAINT "BookingTraveler_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- The same person twice on one booking is a passenger counted twice.
DO $$ BEGIN
  ALTER TABLE "public"."BookingTraveler"
    ADD CONSTRAINT "BookingTraveler_bookingId_travelerId_key" UNIQUE ("bookingId", "travelerId");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Booking_companyId_status_idx"            ON "public"."Booking"("companyId", "status");
CREATE INDEX IF NOT EXISTS "Booking_companyId_travelDate_idx"        ON "public"."Booking"("companyId", "travelDate");
CREATE INDEX IF NOT EXISTS "Booking_companyId_customerAccountId_idx" ON "public"."Booking"("companyId", "customerAccountId");
CREATE INDEX IF NOT EXISTS "BookingItem_bookingId_idx"               ON "public"."BookingItem"("bookingId");
CREATE INDEX IF NOT EXISTS "BookingItem_sourceRecordId_idx"          ON "public"."BookingItem"("sourceRecordId");
CREATE INDEX IF NOT EXISTS "BookingTraveler_travelerId_idx"          ON "public"."BookingTraveler"("travelerId");
