-- ================= MARKET SIGNAL (AI Growth Department, Agent #1) =================
-- Public pain signals a human reads and replies to publicly first — see
-- docs/growth/manual-lead-round.md, section 4, for why a cold DM is a ban.
-- This table only stores what the scanner found; nothing here sends anything.
-- Platform-level, like OutreachCampaign/ProspectCompany. See lib/prospecting/marketScanner.ts.

CREATE TABLE IF NOT EXISTS "MarketSignal" (
  "id"              TEXT         NOT NULL,
  "source"          TEXT         NOT NULL,
  "subreddit"       TEXT,
  "externalId"      TEXT         NOT NULL,
  "url"             TEXT         NOT NULL,
  "title"           TEXT         NOT NULL,
  "snippet"         TEXT,
  "author"          TEXT,
  "matchedIndustry" JSONB,
  "matchedPain"     JSONB,
  "matchedSoftware" JSONB,
  "tier"            TEXT         NOT NULL,
  "status"          TEXT         NOT NULL DEFAULT 'new',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketSignal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketSignal_source_externalId_key"
  ON "MarketSignal" ("source", "externalId");
CREATE INDEX IF NOT EXISTS "MarketSignal_tier_status_createdAt_idx"
  ON "MarketSignal" ("tier", "status", "createdAt");
