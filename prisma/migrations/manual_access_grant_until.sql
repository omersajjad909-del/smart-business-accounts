-- Manual access grants get an end date that is actually enforced.
--
-- Access is gated on Company.subscriptionStatus, and nothing ever moved a
-- company off ACTIVE when its period ran out: platform-dunning only looks at
-- paymentFailedAt, and the subscriptions-lifecycle cron works on the tenant's
-- own CustomerSubscription table, not on platform billing. So an admin who
-- granted "three years" was really granting forever.
--
-- Null for every gateway subscriber — their billing keeps working exactly as
-- it did. Additive and nullable, so this is instant and needs no rewrite.
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "accessGrantedUntil" TIMESTAMP(3);

-- The guards read this on request; the index keeps admin lists that sort or
-- filter by it from scanning the whole table.
CREATE INDEX IF NOT EXISTS "Company_accessGrantedUntil_idx"
  ON "Company" ("accessGrantedUntil");
