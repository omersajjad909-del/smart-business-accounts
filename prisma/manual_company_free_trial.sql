-- Company free-trial columns
--
-- A no-card 14-day trial: the company is created TRIALING with an end date, and
-- the subscription guards read trialEndsAt (see lib/trial.ts). Every column is
-- nullable, so companies that already exist keep trialEndsAt = null and are not
-- touched by any trial rule.
--
--   trialStartedAt / trialEndsAt  the window itself
--   trialSource                   where the signup came from, for the funnel
--   trialPhone                    normalised signup phone — one trial per phone
--
-- Applied by hand, like every other migration in this project. Apply it BEFORE
-- deploying the code that writes these columns, or signup will fail.

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "trialStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trialEndsAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trialSource"    TEXT,
  ADD COLUMN IF NOT EXISTS "trialPhone"     TEXT;

CREATE INDEX IF NOT EXISTS "Company_trialPhone_idx"
  ON "Company" ("trialPhone");

CREATE INDEX IF NOT EXISTS "Company_subscriptionStatus_trialEndsAt_idx"
  ON "Company" ("subscriptionStatus", "trialEndsAt");
