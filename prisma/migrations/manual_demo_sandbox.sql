-- Demo sandbox support.
-- Every demo visitor gets a throwaway Company seeded from lib/demoSeed.ts.
-- isDemo marks it as disposable; demoExpiresAt is the hard deadline the
-- cleanup cron (/api/cron/demo-cleanup) sweeps on.
--
-- Additive and idempotent — safe to run on a live database.

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "demoExpiresAt" TIMESTAMP(3);

-- The sweep query filters on both columns together.
CREATE INDEX IF NOT EXISTS "Company_isDemo_demoExpiresAt_idx"
  ON "Company" ("isDemo", "demoExpiresAt");
