-- Newsletter Subscribers
CREATE TABLE IF NOT EXISTS "NewsletterSubscriber" (
  "id"             TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "email"          TEXT         NOT NULL,
  "name"           TEXT,
  "source"         TEXT,
  "status"         TEXT         NOT NULL DEFAULT 'active',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unsubscribedAt" TIMESTAMP(3),
  CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_status_idx"    ON "NewsletterSubscriber"("status");
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_createdAt_idx" ON "NewsletterSubscriber"("createdAt");

-- Feedback (Complaints & Suggestions)
CREATE TABLE IF NOT EXISTS "Feedback" (
  "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "type"        TEXT         NOT NULL,
  "subject"     TEXT         NOT NULL,
  "message"     TEXT         NOT NULL,
  "email"       TEXT,
  "name"        TEXT,
  "status"      TEXT         NOT NULL DEFAULT 'open',
  "priority"    TEXT         NOT NULL DEFAULT 'normal',
  "userId"      TEXT,
  "companyId"   TEXT,
  "adminNote"   TEXT,
  "resolvedAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Feedback_status_createdAt_idx" ON "Feedback"("status","createdAt");
CREATE INDEX IF NOT EXISTS "Feedback_type_idx"             ON "Feedback"("type");
CREATE INDEX IF NOT EXISTS "Feedback_userId_idx"           ON "Feedback"("userId");
CREATE INDEX IF NOT EXISTS "Feedback_companyId_idx"        ON "Feedback"("companyId");
