-- Compound index for getCompanyAdminControlSettings and apiHasPermission plan-config lookups
-- Covers: WHERE companyId = ? AND action = ? ORDER BY createdAt DESC
CREATE INDEX IF NOT EXISTS "ActivityLog_companyId_action_createdAt_idx"
  ON "ActivityLog" ("companyId", "action", "createdAt" DESC);

-- Index for BankAccount queries by companyId (aggregate + findMany)
CREATE INDEX IF NOT EXISTS "BankAccount_companyId_idx"
  ON "BankAccount" ("companyId");
