-- ================= BOT-TRAFFIC FLAGGING ON SITEVISIT =================
-- /api/track/visit now runs each visit through a few cheap heuristics
-- (bot user-agent, missing user-agent, known cloud-datacenter city) and
-- records why here instead of silently mixing bot hits into real traffic
-- numbers. NULL = looked like a real visitor.
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "botReason" TEXT;

CREATE INDEX IF NOT EXISTS "SiteVisit_botReason_idx" ON "SiteVisit"("botReason");
