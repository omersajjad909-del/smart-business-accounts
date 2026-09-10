-- Buyer province for FBR digital invoicing.
-- Manual, idempotent. Safe to re-run. Nullable, so every existing row and code
-- path is untouched until a company actually fills it in.

-- The province the party is registered in. Distinct from "city": FBR matches
-- this against its own list, and the city was being sent in its place — see
-- lib/pkProvinces.ts and lib/fbrEInvoice.ts.
ALTER TABLE "Account"
  ADD COLUMN IF NOT EXISTS "province" TEXT;
