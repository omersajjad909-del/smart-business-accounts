-- Encrypted vault for the FBR digital-invoicing bearer token.
--
-- Optional to run by hand: lib/companyAdminControl.ts creates this table
-- itself on first use (CREATE TABLE IF NOT EXISTS, same self-provisioning
-- convention as CompanyCommsVault in lib/companyCommsConfig.ts), so a deploy
-- does not depend on this file being applied first. Run it manually only if
-- you'd rather provision ahead of time — via your Postgres / Supabase SQL
-- editor, or `npx prisma db execute`. Safe to re-run.
--
-- Until now the token lived in plaintext inside ActivityLog.details (the
-- COMPANY_ADMIN_CONTROL JSON blob) — an audit-log table, readable by anyone
-- who can read activity logs. This table is the only place the token is
-- stored going forward, always AES-256-GCM encrypted (see lib/fieldEncrypt.ts,
-- FIELD_ENCRYPTION_KEY). lib/companyAdminControl.ts migrates any existing
-- plaintext token into this vault the first time it reads a company's
-- settings after this ships — see getCompanyAdminControlSettings.
--
-- The old plaintext copies already written into ActivityLog history are NOT
-- deleted by this migration (audit rows are not mutated automatically). If
-- any company has already saved a real FBR token, rotate it in FBR IRIS after
-- this ships and treat the old value as compromised, or manually redact the
-- historic ActivityLog rows with action = 'COMPANY_ADMIN_CONTROL'.

CREATE TABLE IF NOT EXISTS "CompanyFbrCredential" (
  "companyId" TEXT PRIMARY KEY REFERENCES "Company"("id") ON DELETE CASCADE,
  "tokenEnc" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
