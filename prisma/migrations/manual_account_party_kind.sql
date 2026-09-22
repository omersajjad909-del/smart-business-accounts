-- Account.partyKind — the trade's own word for a party ("Hotel", "Airline /
-- Consolidator"). partyType only knows CUSTOMER and SUPPLIER, which cannot
-- tell a hotel from an airline, so every booking screen that wanted a hotel
-- had to offer every payable on file.
--
-- Additive and idempotent: existing accounts keep NULL, which reads as "not
-- categorised" and is still offered everywhere, so nothing disappears.
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "partyKind" TEXT;

CREATE INDEX IF NOT EXISTS "Account_companyId_partyKind_idx"
  ON "Account" ("companyId", "partyKind");
