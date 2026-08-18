-- ================= INTERNAL TEST WORKSPACES =================
-- Companies created by an admin from /admin/dev-test were indistinguishable
-- from real customers, so they piled up in /admin/companies and counted
-- towards signups, active plans and revenue seats on the dashboard.
--
-- Kept separate from "isDemo" deliberately: a demo sandbox is claimable by any
-- website visitor and is deleted by the cleanup sweep, which would pull an
-- admin's test workspace out from under them mid-test.

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "isInternalTest" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Company_isInternalTest_idx"
  ON "Company" ("isInternalTest");


-- Backfill: every company the dev-test launcher ever created. The ActivityLog
-- marker is the precise record; the second clause catches the orphans left by
-- the old non-transactional launcher, which crashed on the UserCompany foreign
-- key after the company row was already committed.
UPDATE "Company" c
SET "isInternalTest" = true
WHERE c."isDemo" = false
  AND c."isInternalTest" = false
  AND (
    EXISTS (
      SELECT 1 FROM "ActivityLog" a
      WHERE a."companyId" = c.id
        AND a."action" = 'ADMIN_DEV_TEST_COMPANY'
    )
    OR EXISTS (
      SELECT 1 FROM "UserCompany" uc
      JOIN "User" u ON u.id = uc."userId"
      WHERE uc."companyId" = c.id
        AND u."email" LIKE 'devtest+%@finovaos.local'
    )
    OR (
      -- Orphans: named by the launcher's fallback and never linked to a user.
      c."name" IN ('Admin''s', 'Admin''s (Test)')
      AND NOT EXISTS (SELECT 1 FROM "UserCompany" uc WHERE uc."companyId" = c.id)
    )
  );
