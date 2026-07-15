-- AdminActionLog table
-- Run this in your Supabase SQL editor to enable the Admin Audit Trail.

CREATE TABLE IF NOT EXISTS "AdminActionLog" (
  "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "adminId"     TEXT         NOT NULL,
  "adminEmail"  TEXT         NOT NULL,
  "action"      TEXT         NOT NULL,
  "targetType"  TEXT         NOT NULL,
  "targetId"    TEXT,
  "targetLabel" TEXT,
  "companyId"   TEXT,
  "details"     TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminActionLog_adminId_createdAt_idx"  ON "AdminActionLog"("adminId",  "createdAt");
CREATE INDEX IF NOT EXISTS "AdminActionLog_companyId_createdAt_idx" ON "AdminActionLog"("companyId","createdAt");
CREATE INDEX IF NOT EXISTS "AdminActionLog_action_idx"              ON "AdminActionLog"("action");
