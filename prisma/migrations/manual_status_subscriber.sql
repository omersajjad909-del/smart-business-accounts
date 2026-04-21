CREATE TABLE IF NOT EXISTS "StatusSubscriber" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "email"     TEXT NOT NULL,
  "confirmed" BOOLEAN NOT NULL DEFAULT false,
  "token"     TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StatusSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StatusSubscriber_email_key" ON "StatusSubscriber"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "StatusSubscriber_token_key" ON "StatusSubscriber"("token");
