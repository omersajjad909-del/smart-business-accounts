-- ============ ITEM BARCODE: GLOBAL UNIQUE → PER COMPANY ============
-- "ItemNew"."barcode" carried a bare UNIQUE constraint, which is global across
-- the whole database rather than scoped to a tenant. The first company to save
-- barcode "12345678" took that barcode away from every other company on the
-- platform: the next tenant to type it got "Barcode or Code already exists"
-- while looking at an empty item list, with nothing they could do about it.
--
-- It also leaked across the tenant boundary — the error told you a barcode was
-- in use somewhere, which is not yours to know.
--
-- lib/demoSeed.ts already had to work around this (it derives an all-numeric
-- prefix from the sandbox id so two live demo sandboxes do not collide on their
-- first item). That workaround stays valid; it simply stops being necessary.
--
-- This only RELAXES the constraint, so it cannot fail on existing rows: any
-- data that satisfied the global unique already satisfies the per-company one.
-- NULL barcodes stay unconstrained in both — Postgres treats NULLs as distinct
-- in a unique index, so any number of items may have no barcode.

ALTER TABLE "ItemNew" DROP CONSTRAINT IF EXISTS "ItemNew_barcode_key";
DROP INDEX IF EXISTS "ItemNew_barcode_key";

CREATE UNIQUE INDEX IF NOT EXISTS "ItemNew_companyId_barcode_key"
  ON "ItemNew" ("companyId", "barcode");
