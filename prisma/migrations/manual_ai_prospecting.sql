-- ================= AI PROSPECTING =================
-- Outbound client acquisition for FinovaOS itself. Platform-level, not
-- tenant-scoped: these rows belong to FinovaOS the vendor, not to any
-- Company using FinovaOS.
--
-- Pipeline: discover -> enrich -> score -> draft -> HUMAN REVIEW -> send.
-- Console at /admin/prospecting. See docs/AI-PROSPECTING.md.

CREATE TABLE IF NOT EXISTS "OutreachCampaign" (
  "id"          TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  -- The natural-language brief the admin typed, kept verbatim for audit.
  "command"     TEXT         NOT NULL,
  -- Parsed brief: industries, countries, cities, size band, language, tone.
  "brief"       JSONB        NOT NULL,
  "status"      TEXT         NOT NULL DEFAULT 'draft',
  "targetCount" INTEGER      NOT NULL DEFAULT 100,
  -- Hard ceiling on emails sent per calendar day for this campaign.
  "dailyCap"    INTEGER      NOT NULL DEFAULT 40,
  "sendFrom"    TEXT,
  "progress"    JSONB,
  "lastError"   TEXT,
  "createdBy"   TEXT,
  "startedAt"   TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutreachCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OutreachCampaign_status_createdAt_idx"
  ON "OutreachCampaign" ("status", "createdAt");


CREATE TABLE IF NOT EXISTS "ProspectCompany" (
  "id"              TEXT         NOT NULL,
  "campaignId"      TEXT         NOT NULL,
  "name"            TEXT         NOT NULL,
  "domain"          TEXT,
  "website"         TEXT,
  "industry"        TEXT,
  "country"         TEXT,
  "city"            TEXT,
  "address"         TEXT,
  "lat"             DOUBLE PRECISION,
  "lng"             DOUBLE PRECISION,
  "phone"           TEXT,
  "employeeCount"   INTEGER,
  "employeeBand"    TEXT,
  "warehouseCount"  INTEGER,
  "locationCount"   INTEGER,
  "branches"        JSONB,
  "revenueBand"     TEXT,
  -- What they appear to run today: the strongest displacement signal we have.
  "currentSoftware" TEXT,
  "source"          TEXT         NOT NULL,
  "sourceRef"       TEXT,
  "enrichment"      JSONB,
  "enrichedAt"      TIMESTAMP(3),
  "score"           INTEGER,
  "scoreBreakdown"  JSONB,
  "tier"            TEXT,
  "scoreReason"     TEXT,
  "scoredAt"        TIMESTAMP(3),
  "status"          TEXT         NOT NULL DEFAULT 'discovered',
  "rejectReason"    TEXT,
  -- Set once this prospect answers and becomes a real Lead row.
  "leadId"          TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProspectCompany_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProspectCompany_campaignId_fkey" FOREIGN KEY ("campaignId")
    REFERENCES "OutreachCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- One row per company per campaign, so reruns update instead of duplicating.
CREATE UNIQUE INDEX IF NOT EXISTS "ProspectCompany_campaignId_domain_key"
  ON "ProspectCompany" ("campaignId", "domain");
CREATE INDEX IF NOT EXISTS "ProspectCompany_campaignId_status_idx"
  ON "ProspectCompany" ("campaignId", "status");
CREATE INDEX IF NOT EXISTS "ProspectCompany_campaignId_tier_idx"
  ON "ProspectCompany" ("campaignId", "tier");
CREATE INDEX IF NOT EXISTS "ProspectCompany_campaignId_score_idx"
  ON "ProspectCompany" ("campaignId", "score");


CREATE TABLE IF NOT EXISTS "ProspectContact" (
  "id"           TEXT         NOT NULL,
  "prospectId"   TEXT         NOT NULL,
  "name"         TEXT,
  "title"        TEXT,
  "email"        TEXT         NOT NULL,
  "phone"        TEXT,
  "linkedin"     TEXT,
  "isPrimary"    BOOLEAN      NOT NULL DEFAULT false,
  -- Anything but 'valid' is held back: bounces cost domain reputation.
  "verifyStatus" TEXT         NOT NULL DEFAULT 'unverified',
  "verifiedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProspectContact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProspectContact_prospectId_fkey" FOREIGN KEY ("prospectId")
    REFERENCES "ProspectCompany" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProspectContact_prospectId_idx"
  ON "ProspectContact" ("prospectId");
CREATE INDEX IF NOT EXISTS "ProspectContact_email_idx"
  ON "ProspectContact" ("email");


CREATE TABLE IF NOT EXISTS "OutreachEmail" (
  "id"            TEXT         NOT NULL,
  "campaignId"    TEXT         NOT NULL,
  "prospectId"    TEXT         NOT NULL,
  "contactId"     TEXT,
  -- 1 = first touch, 2+ = follow-ups in the sequence.
  "step"          INTEGER      NOT NULL DEFAULT 1,
  "toEmail"       TEXT         NOT NULL,
  "toName"        TEXT,
  "subject"       TEXT         NOT NULL,
  "bodyText"      TEXT         NOT NULL,
  "bodyHtml"      TEXT         NOT NULL,
  "language"      TEXT         NOT NULL DEFAULT 'en',
  "aiModel"       TEXT,
  "generatedAt"   TIMESTAMP(3),
  "status"        TEXT         NOT NULL DEFAULT 'draft',
  "reviewedBy"    TEXT,
  "reviewedAt"    TIMESTAMP(3),
  "editedByHuman" BOOLEAN      NOT NULL DEFAULT false,
  "rejectReason"  TEXT,
  "scheduledFor"  TIMESTAMP(3),
  "sentAt"        TIMESTAMP(3),
  "providerId"    TEXT,
  "failReason"    TEXT,
  "openedAt"      TIMESTAMP(3),
  "clickedAt"     TIMESTAMP(3),
  "repliedAt"     TIMESTAMP(3),
  "openCount"     INTEGER      NOT NULL DEFAULT 0,
  -- Powers one-click unsubscribe; required by CAN-SPAM and PECR.
  "unsubToken"    TEXT         NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutreachEmail_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OutreachEmail_campaignId_fkey" FOREIGN KEY ("campaignId")
    REFERENCES "OutreachCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OutreachEmail_prospectId_fkey" FOREIGN KEY ("prospectId")
    REFERENCES "ProspectCompany" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "OutreachEmail_unsubToken_key"
  ON "OutreachEmail" ("unsubToken");
CREATE INDEX IF NOT EXISTS "OutreachEmail_campaignId_status_idx"
  ON "OutreachEmail" ("campaignId", "status");
CREATE INDEX IF NOT EXISTS "OutreachEmail_status_scheduledFor_idx"
  ON "OutreachEmail" ("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "OutreachEmail_prospectId_step_idx"
  ON "OutreachEmail" ("prospectId", "step");
CREATE INDEX IF NOT EXISTS "OutreachEmail_toEmail_idx"
  ON "OutreachEmail" ("toEmail");


CREATE TABLE IF NOT EXISTS "OutreachEvent" (
  "id"        TEXT         NOT NULL,
  "emailId"   TEXT         NOT NULL,
  -- queued | sent | delivered | open | click | reply | bounce | complaint
  -- | unsubscribe
  "type"      TEXT         NOT NULL,
  "meta"      JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutreachEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OutreachEvent_emailId_fkey" FOREIGN KEY ("emailId")
    REFERENCES "OutreachEmail" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OutreachEvent_emailId_createdAt_idx"
  ON "OutreachEvent" ("emailId", "createdAt");
CREATE INDEX IF NOT EXISTS "OutreachEvent_type_createdAt_idx"
  ON "OutreachEvent" ("type", "createdAt");


-- Never contact again: unsubscribes, bounces, complaints, existing customers.
CREATE TABLE IF NOT EXISTS "OutreachSuppression" (
  "id"        TEXT         NOT NULL,
  "email"     TEXT         NOT NULL,
  "domain"    TEXT,
  "reason"    TEXT         NOT NULL,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutreachSuppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OutreachSuppression_email_key"
  ON "OutreachSuppression" ("email");
CREATE INDEX IF NOT EXISTS "OutreachSuppression_domain_idx"
  ON "OutreachSuppression" ("domain");
