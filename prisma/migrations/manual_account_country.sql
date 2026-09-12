-- The country a party is registered in.
-- Manual, idempotent. Safe to re-run. Nullable, so every existing row and code
-- path is untouched until a company actually fills it in.

-- "province" (manual_account_province.sql) was added for FBR, which made it
-- implicitly Pakistani: the customer form offered the seven FBR provinces to
-- everyone, so a company in Dubai picking its customer's emirate had nowhere to
-- put it. The party's own country is what decides which list that field should
-- show — see lib/subdivisions.ts — and a Pakistani exporter's buyer in Sharjah
-- is a normal case, not an edge one.
--
-- Left NULL rather than backfilled with the company's own country: an empty
-- country reads as "nobody has said", which is true, while a guessed one reads
-- as confirmed. The form falls back to the company's country for *new* parties
-- only, where there is nothing to overwrite.
ALTER TABLE "Account"
  ADD COLUMN IF NOT EXISTS "country" TEXT;
