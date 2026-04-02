-- Live Chat tables migration (manual, idempotent)
-- Run this in your Postgres (e.g., Supabase SQL editor). Safe to re-run.

-- 1) ChatConversation
CREATE TABLE IF NOT EXISTS "public"."ChatConversation" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "customerName"  TEXT NOT NULL,
  "customerEmail" TEXT,
  "status"        TEXT NOT NULL DEFAULT 'bot',   -- bot | waiting | agent | closed
  "assignedAgent" TEXT,
  "companyId"     TEXT,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ChatConversation_status_idx"    ON "public"."ChatConversation" ("status");
CREATE INDEX IF NOT EXISTS "ChatConversation_updatedAt_idx" ON "public"."ChatConversation" ("updatedAt" DESC);

-- Auto-update updatedAt on row changes
CREATE OR REPLACE FUNCTION "public"."set_chat_conversation_updated_at"()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_chat_conversation_updated_at" ON "public"."ChatConversation";
CREATE TRIGGER "trg_chat_conversation_updated_at"
  BEFORE UPDATE ON "public"."ChatConversation"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_chat_conversation_updated_at"();

-- 2) ChatMessage
CREATE TABLE IF NOT EXISTS "public"."ChatMessage" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "conversationId" TEXT NOT NULL,
  "sender"         TEXT NOT NULL,   -- customer | bot | agent
  "text"           TEXT NOT NULL,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ChatMessage_conversation_idx" ON "public"."ChatMessage" ("conversationId");
CREATE INDEX IF NOT EXISTS "ChatMessage_created_idx"      ON "public"."ChatMessage" ("createdAt");

-- FK: ChatMessage -> ChatConversation (cascade delete)
DO $$ BEGIN
  ALTER TABLE "public"."ChatMessage"
    ADD CONSTRAINT "ChatMessage_conversation_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "public"."ChatConversation"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
