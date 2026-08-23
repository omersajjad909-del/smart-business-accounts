-- ============================================================================
-- ADMIN CONSOLE HARDENING
-- ----------------------------------------------------------------------------
-- Run this once in the Supabase SQL editor, then `npx prisma generate`.
--
-- Adds three things the admin console had no way to express:
--   1. Mandatory TOTP (30-second authenticator code) per admin account.
--   2. Per-account brute-force lockout, so rotating IPs does not help.
--   3. A token version, so disabling an admin or changing a password kills
--      every live session immediately instead of leaving a 12-hour window.
-- ============================================================================

-- ── AdminUser (team members) ────────────────────────────────────────────────
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "totpSecret"        TEXT;
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "totpEnabled"       BOOLEAN      NOT NULL DEFAULT false;
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "failedAttempts"    INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "lockedUntil"       TIMESTAMP(3);
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "tokenVersion"      INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);

-- ── User (platform super admins live here) ──────────────────────────────────
-- Reuses the existing twoFactorSecret / twoFactorEnabled columns for the
-- authenticator secret; only the revocation counter is new.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminTokenVersion" INTEGER NOT NULL DEFAULT 0;
