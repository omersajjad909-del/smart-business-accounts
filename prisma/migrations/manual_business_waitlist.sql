-- Business Waitlist: stores "notify me when live" entries for coming-soon business types
CREATE TABLE IF NOT EXISTS "BusinessWaitlist" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "email"        TEXT        NOT NULL,
  "businessType" TEXT        NOT NULL,
  "name"         TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notified"     BOOLEAN     NOT NULL DEFAULT false,
  "notifiedAt"   TIMESTAMP(3),

  CONSTRAINT "BusinessWaitlist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessWaitlist_email_businessType_key"
  ON "BusinessWaitlist"("email", "businessType");

CREATE INDEX IF NOT EXISTS "BusinessWaitlist_businessType_idx"
  ON "BusinessWaitlist"("businessType");

CREATE INDEX IF NOT EXISTS "BusinessWaitlist_notified_idx"
  ON "BusinessWaitlist"("notified");
