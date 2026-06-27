/**
 * /api/widget-chat — Single endpoint for the marketing chatbot widget.
 * Handles conversation creation, message saving, and AI replies.
 * NEVER returns 400 or 500. Always returns { reply, conversationId }.
 */
import { NextRequest, NextResponse } from "next/server";
import { runChatEngine } from "@/lib/chatEngine";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export const runtime = "nodejs";

const SYSTEM = `You are FinovaOS AI Assistant — support bot for FinovaOS, a cloud accounting & ERP platform for SMEs.

FinovaOS features: accounting, invoicing, inventory, HR & payroll, banking, CRM, reports, AI intelligence.
Plans: Starter (5 users), Professional (25 users), Enterprise (unlimited), Custom (pay per module).
Website: finovaos.app | Email: finovaos.app@gmail.com | Phone: +92 304 7653693

Rules:
- Reply in the same language the user writes in (English, Roman Urdu, or Urdu).
- Be helpful, friendly, concise. Max 3-4 sentences per reply.
- Never use ### headings. Use plain text with numbers or bullets.
- If asked about pricing, mention the 4 plans briefly.
- If user wants human help, say: "Type 'human agent' and I will connect you."`;

async function getOrCreateConversation(
  conversationId: string | null,
  name: string,
  email: string | null
): Promise<string> {
  // Valid existing conversation
  if (conversationId && !conversationId.startsWith("tmp-")) {
    return conversationId;
  }
  // Create new conversation in DB
  try {
    const conv = await prisma.chatConversation.create({
      data: {
        customerName:  name || "Website Visitor",
        customerEmail: email || null,
        status:        "bot",
      },
    });
    return conv.id;
  } catch {
    return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
}

function saveMessageSilently(conversationId: string, sender: string, text: string) {
  if (!conversationId || conversationId.startsWith("tmp-")) return;
  prisma.chatMessage.create({
    data: { conversationId, sender, text },
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  // Parse body — never throw
  let message       = "";
  let conversationId: string | null = null;
  let customerName  = "Website Visitor";
  let customerEmail: string | null = null;

  try {
    const body = await req.json();
    message        = String(body?.message ?? body?.text ?? body?.userMessage ?? "").trim();
    conversationId = body?.conversationId ? String(body.conversationId) : null;
    customerName   = String(body?.name ?? body?.customerName ?? "Website Visitor").trim() || "Website Visitor";
    customerEmail  = body?.email ? String(body.email).trim() : null;
  } catch { /* ok */ }

  // Empty message — return greeting
  if (!message) {
    return NextResponse.json({
      reply: "Hello! I'm FinovaOS AI Assistant. Ask me anything about FinovaOS — accounting, invoicing, inventory, payroll, and more! 😊",
      conversationId: conversationId || null,
    });
  }

  // Get or create conversation (non-blocking for response)
  const convId = await getOrCreateConversation(conversationId, customerName, customerEmail);

  // Save user message (fire & forget)
  saveMessageSilently(convId, "customer", message);

  let reply = "";
  let source = "kb";

  // 1. Try OpenAI first (real AI)
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.chat.completions.create({
        model:       process.env.OPENAI_MODEL || "gpt-4o-mini",
        max_tokens:  350,
        temperature: 0.5,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user",   content: message },
        ],
      });
      reply  = res.choices[0]?.message?.content?.trim() ?? "";
      source = "openai";
    } catch (err) {
      console.error("[widget-chat] OpenAI error:", err);
    }
  } else {
    console.warn("[widget-chat] OPENAI_API_KEY not set");
  }

  // 2. Fallback: local keyword engine
  if (!reply) {
    try {
      const local = runChatEngine(message, []);
      reply  = local.reply;
      source = "local-engine";
    } catch (err) {
      console.error("[widget-chat] local engine error:", err);
    }
  }

  // 3. Last resort
  if (!reply) {
    reply  = "FinovaOS is a complete cloud accounting & ERP platform. For details visit finovaos.app or contact finovaos.app@gmail.com 😊";
    source = "fallback";
  }

  // Save bot reply (fire & forget)
  saveMessageSilently(convId, "bot", reply);

  return NextResponse.json({ reply, conversationId: convId, source });
}

// Health check
export async function GET() {
  return NextResponse.json({ ok: true, service: "widget-chat" });
}
