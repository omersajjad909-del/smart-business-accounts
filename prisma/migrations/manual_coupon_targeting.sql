-- Add coupon targeting fields
-- allowedEmails:        JSON array of emails  e.g. '["ali@gmail.com","sara@co.com"]'
-- allowedCompanyIds:    JSON array of company UUIDs
-- allowedBusinessTypes: JSON array of business type slugs e.g. '["trading","distribution"]'
-- allowedCountries:     JSON array of ISO-2 country codes e.g. '["PK","AE","SA"]'

ALTER TABLE "Coupon"
  ADD COLUMN IF NOT EXISTS "allowedEmails"        TEXT,
  ADD COLUMN IF NOT EXISTS "allowedCompanyIds"    TEXT,
  ADD COLUMN IF NOT EXISTS "allowedBusinessTypes" TEXT,
  ADD COLUMN IF NOT EXISTS "allowedCountries"     TEXT;
