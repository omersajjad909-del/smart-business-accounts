-- ONE-TIME rename: put companyNo in existing backup filenames.
--
-- lib/backup.ts used to name a snapshot after the first 8 hex characters of the
-- company UUID ("backup-9806c891-2026-08-19T02-09-30-909Z.json"). Two companies
-- sharing a name then produced two files no human could tell apart, and neither
-- token matched the "#100004" badge shown for that same company everywhere else
-- in the admin UI. backupFileNameRef() now writes companyNo instead; this
-- brings the rows already stored into the same form.
--
-- Nothing parses fileName — it is a display string and the browser's download
-- name (app/admin/backup-restore/page.tsx, app/dashboard/backup-restore/page.tsx)
-- and restore keys off SystemBackup.id — so rewriting it cannot break a restore.
--
-- Safe to run before or after the code deploy: the two naming schemes coexist,
-- and the WHERE clause only touches names still in the old UUID-slice form.

BEGIN;

UPDATE "SystemBackup" sb
SET "fileName" = 'backup-' || c."companyNo"::text || SUBSTRING(sb."fileName" FROM 16)
FROM "Company" c
WHERE sb."companyId" = c."id"
  -- 'backup-' is 7 chars and the UUID slice is 8, so character 16 onwards is
  -- the '-<timestamp>.json' tail that carries over unchanged. Rows whose
  -- company is already gone are skipped by the join and keep their old name.
  AND sb."fileName" ~ '^backup-[0-9a-f]{8}-'
  -- A companyNo can itself be 8 digits, which the hex pattern above matches, so
  -- exclude anything already carrying the correct prefix rather than rewriting
  -- a new-form name into a mangled one.
  AND sb."fileName" NOT LIKE 'backup-' || c."companyNo"::text || '-%';

COMMIT;

-- Verify (expect no rows):
--   SELECT sb."fileName" FROM "SystemBackup" sb JOIN "Company" c ON c."id" = sb."companyId"
--   WHERE sb."fileName" ~ '^backup-[0-9a-f]{8}-'
--     AND sb."fileName" NOT LIKE 'backup-' || c."companyNo"::text || '-%';
--
-- And spot-check the new form:
--   SELECT c."companyNo", sb."fileName"
--   FROM "SystemBackup" sb JOIN "Company" c ON c."id" = sb."companyId"
--   ORDER BY sb."createdAt" DESC LIMIT 10;
