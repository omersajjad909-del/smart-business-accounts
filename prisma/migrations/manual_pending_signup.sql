-- Hold unverified signups outside the real tables.
--
-- /api/onboarding/signup used to create Company + User + UserCompany before the
-- OTP was sent, so an unverified address could register a company and every
-- abandoned attempt left a half-built tenant behind. The submission now waits
-- here and is only promoted to real rows by /api/auth/verify/confirm.
--
-- Idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS "PendingSignup" (
  "id"           TEXT PRIMARY KEY,
  "email"        TEXT        NOT NULL,
  "payload"      TEXT        NOT NULL,
  "otpHash"      TEXT        NOT NULL,
  "otpExpiresAt" TIMESTAMP(3) NOT NULL,
  "channel"      TEXT        NOT NULL DEFAULT 'email',
  "attempts"     INTEGER     NOT NULL DEFAULT 0,
  "lastSentAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PendingSignup_email_key"
  ON "PendingSignup" ("email");

-- Expired rows are swept on the next signup for the same address; the index
-- keeps a periodic bulk cleanup cheap too.
CREATE INDEX IF NOT EXISTS "PendingSignup_otpExpiresAt_idx"
  ON "PendingSignup" ("otpExpiresAt");
