/**
 * Website Chatbot Backend API
 *
 * POST /api/chatbot — send a message, get AI reply
 * Body: { widgetToken, message, sessionId? }
 *
 * GET  /api/chatbot            — get chatbot config (authenticated)
 * PUT  /api/chatbot            — save chatbot config (authenticated)
 * POST /api/chatbot?action=config — same as PUT (for form posts)
 *
 * The widgetToken identifies the company so the embed widget doesn't need auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";

async function getCompanyId(req: NextRequest): Promise<string | null> {
  try {
    const h = req.headers.get("x-company-id");
    if (h) return h;
    const uid = req.headers.get("x-user-id");
    if (uid) {
      const u = await prisma.user.findUnique({ where: { id: uid }, select: { defaultCompanyId: true } });
      if (u?.defaultCompanyId) return u.defaultCompanyId;
    }
    const cookie = req.headers.get("cookie") || "";
    const m = cookie.match(/sb_auth=([^;]+)/);
    if (m) {
      const parts = decodeURIComponent(m[1]).split(".");
      if (parts.length === 3) {
        const p = JSON.parse(Buffer.from(parts[1], "base64url").toString());
        if (p?.companyId) return p.companyId;
      }
    }
    return null;
  } catch { return null; }
}

async function ensureChatbotTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ChatbotConfig" (
      "companyId"    TEXT PRIMARY KEY,
      "widgetToken"  TEXT NOT NULL UNIQUE,
      "botName"      TEXT NOT NULL DEFAULT 'Assistant',
      "greeting"     TEXT NOT NULL DEFAULT 'Hi! How can I help you today?',
      "systemPrompt" TEXT NOT NULL DEFAULT '',
      "primaryColor" TEXT NOT NULL DEFAULT '#7c3aed',
      "active"       BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ChatbotConversation" (
      "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId"   TEXT NOT NULL,
      "sessionId"   TEXT NOT NULL,
      "messages"    TEXT NOT NULL DEFAULT '[]',
      "visitorInfo" TEXT NOT NULL DEFAULT '{}',
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});
}

// ─── GET — get chatbot config ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureChatbotTables();

    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "ChatbotConfig" WHERE "companyId" = ${companyId} LIMIT 1
    `.catch(() => []);

    if (!rows[0]) {
      // Auto-create config
      const token = crypto.randomBytes(20).toString("hex");
      await prisma.$executeRaw`
        INSERT INTO "ChatbotConfig" ("companyId", "widgetToken")
        VALUES (${companyId}, ${token})
      `.catch(() => {});
      return NextResponse.json({ companyId, widgetToken: token, botName: "Assistant", greeting: "Hi! How can I help you today?", systemPrompt: "", primaryColor: "#7c3aed", active: true });
    }

    return NextResponse.json(rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── PUT — save chatbot config ────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureChatbotTables();

    const body = await req.json();
    const { botName, greeting, systemPrompt, primaryColor, active } = body;

    await prisma.$executeRaw`
      UPDATE "ChatbotConfig"
      SET "botName"      = COALESCE(${botName      ?? null}, "botName"),
          "greeting"     = COALESCE(${greeting     ?? null}, "greeting"),
          "systemPrompt" = COALESCE(${systemPrompt ?? null}, "systemPrompt"),
          "primaryColor" = COALESCE(${primaryColor ?? null}, "primaryColor"),
          "active"       = COALESCE(${active       ?? null}, "active"),
          "updatedAt"    = CURRENT_TIMESTAMP
      WHERE "companyId" = ${companyId}
    `;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── POST — chat message ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await ensureChatbotTables();
    const body = await req.json();
    const { widgetToken, message, sessionId } = body;

    if (!widgetToken || !message?.trim()) {
      return NextResponse.json({ error: "widgetToken and message required" }, { status: 400 });
    }

    // Look up company by token
    const rows = await prisma.$queryRaw<{ companyId: string; botName: string; greeting: string; systemPrompt: string; active: boolean }[]>`
      SELECT "companyId", "botName", "greeting", "systemPrompt", "active"
      FROM "ChatbotConfig"
      WHERE "widgetToken" = ${widgetToken}
      LIMIT 1
    `.catch(() => [] as { companyId: string; botName: string; greeting: string; systemPrompt: string; active: boolean }[]);

    if (!rows[0]) return NextResponse.json({ error: "Invalid widget token" }, { status: 401 });

    const { companyId, botName, systemPrompt, active } = rows[0];
    if (!active) return NextResponse.json({ reply: "Chat is currently unavailable. Please try again later." });

    // Load or create conversation
    const sid = sessionId || crypto.randomBytes(12).toString("hex");
    const convRows = await prisma.$queryRaw<{ id: string; messages: string }[]>`
      SELECT id, messages FROM "ChatbotConversation"
      WHERE "companyId" = ${companyId} AND "sessionId" = ${sid}
      LIMIT 1
    `.catch(() => [] as { id: string; messages: string }[]);

    const existingMessages: { role: "user" | "assistant"; content: string }[] =
      convRows[0] ? JSON.parse(convRows[0].messages) : [];

    // Build message history (keep last 10 exchanges)
    const history = existingMessages.slice(-20);
    history.push({ role: "user", content: message });

    // Get company info for context
    const company = await prisma.company.findFirst({
      where: { id: companyId },
      select: { name: true },
    }).catch(() => null);

    const sysPrompt = systemPrompt ||
      `You are ${botName}, a helpful AI assistant for ${company?.name || "this business"}. ` +
      "Answer customer questions politely and concisely. If you don't know something, say so honestly. " +
      "Do not make up information. Keep responses under 150 words.";

    // Call Claude
    let reply = "I'm having trouble responding right now. Please try again.";
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: sysPrompt,
        messages: history.map(m => ({ role: m.role, content: m.content })),
      });
      reply = res.content.find(c => c.type === "text")?.text?.trim() || reply;
    } catch (e) {
      console.error("Chatbot AI error:", e);
    }

    // Save conversation
    const updatedMessages = [...history, { role: "assistant" as const, content: reply }];
    if (convRows[0]) {
      await prisma.$executeRaw`
        UPDATE "ChatbotConversation"
        SET "messages" = ${JSON.stringify(updatedMessages)}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${convRows[0].id}
      `.catch(() => {});
    } else {
      await prisma.$executeRaw`
        INSERT INTO "ChatbotConversation" ("companyId", "sessionId", "messages")
        VALUES (${companyId}, ${sid}, ${JSON.stringify(updatedMessages)})
      `.catch(() => {});
    }

    // Log
    await prisma.activityLog.create({
      data: { action: "CHATBOT_MESSAGE", companyId, details: JSON.stringify({ sessionId: sid, message, reply }) },
    }).catch(() => {});

    return NextResponse.json({ reply, sessionId: sid, botName });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
