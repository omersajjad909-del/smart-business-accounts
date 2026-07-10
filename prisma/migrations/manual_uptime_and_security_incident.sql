-- ================= UPTIME MONITORING =================
-- Records every scheduled probe from /api/cron/uptime-probe.
-- /status page reads real 30-day rolling uptime from this table.

CREATE TABLE IF NOT EXISTS "UptimeCheck" (
  "id"        TEXT         NOT NULL,
  "serviceId" TEXT         NOT NULL,
  "ok"        BOOLEAN      NOT NULL,
  "latencyMs" INTEGER,
  "error"     TEXT,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UptimeCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UptimeCheck_serviceId_checkedAt_idx"
  ON "UptimeCheck" ("serviceId", "checkedAt");

CREATE INDEX IF NOT EXISTS "UptimeCheck_checkedAt_idx"
  ON "UptimeCheck" ("checkedAt");


-- ================= SECURITY / BREACH INCIDENTS =================
-- Backs the 72-hour breach notification commitment made in
-- /legal/privacy and /legal/dpa. /api/cron/breach-notify enforces
-- the deadline automatically.

CREATE TABLE IF NOT EXISTS "SecurityIncident" (
  "id"                TEXT         NOT NULL,
  "severity"          TEXT         NOT NULL,
  "category"          TEXT         NOT NULL,
  "title"             TEXT         NOT NULL,
  "summary"           TEXT         NOT NULL,
  "affectedScope"     TEXT,
  "status"            TEXT         NOT NULL DEFAULT 'DETECTED',
  "detectedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deadlineAt"        TIMESTAMP(3) NOT NULL,
  "notifiedAt"        TIMESTAMP(3),
  "resolvedAt"        TIMESTAMP(3),
  "resolution"        TEXT,
  "notificationCount" INTEGER      NOT NULL DEFAULT 0,
  "lastNotifyError"   TEXT,
  "createdBy"         TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SecurityIncident_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SecurityIncident_status_deadlineAt_idx"
  ON "SecurityIncident" ("status", "deadlineAt");

CREATE INDEX IF NOT EXISTS "SecurityIncident_detectedAt_idx"
  ON "SecurityIncident" ("detectedAt");

CREATE INDEX IF NOT EXISTS "SecurityIncident_severity_idx"
  ON "SecurityIncident" ("severity");
