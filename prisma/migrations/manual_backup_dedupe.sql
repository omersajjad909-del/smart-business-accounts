-- Backup de-duplication support.
--
-- Both columns are nullable and additive, so existing rows and the currently
-- deployed code keep working unchanged. Older snapshots simply have a NULL
-- contentHash and are treated as "unknown content", which just means the next
-- backup run stores a fresh snapshot once and dedupes from then on.

ALTER TABLE "SystemBackup" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;
ALTER TABLE "SystemBackup" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "SystemBackup_companyId_contentHash_idx"
  ON "SystemBackup" ("companyId", "contentHash");
