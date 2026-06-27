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
Website: finovaos.app | Email: finovaos.app@gmail.com | Phone: +92 304 7653693

PRICING PLANS (exact — never change these numbers):
1. Starter — Up to 3 users | PKR 13,622/mo | Sales & purchase invoices, ledger, basic reports, chart of accounts, email support
2. Professional — Up to 10 users | PKR 27,522/mo | Everything in Starter + inventory management, bank reconciliation, HR & payroll, CRM, advanced reports
3. Enterprise — Up to 25 users | PKR 69,222/mo | Everything in Professional + API access, custom integrations, multi-currency, priority 24/7 support
4. Custom — Pay only for the modules you need | Contact us for pricing

Current launch offer: 75% off for the first 3 months on all plans.

Rules:
- Reply in the same language the user writes in (English, Roman Urdu, or Urdu).
- Be helpful, friendly, concise. Max 3-4 sentences per reply.
- Never use ### headings. Use plain text with numbers or bullets.
- Always use the exact plan details above — never guess or make up plan info.
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

// Health check + OpenAI connectivity test
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get("test") === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, reason: "OPENAI_API_KEY not set in environment" });
    }
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.chat.completions.create({
        model:      process.env.OPENAI_MODEL || "gpt-4o-mini",
        max_tokens: 10,
        messages:   [{ role: "user", content: "Say: ok" }],
      });
      return NextResponse.json({
        ok:    true,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        reply: res.choices[0]?.message?.content,
      });
    } catch (err) {
      return NextResponse.json({ ok: false, error: String(err) });
    }
  }

  return NextResponse.json({
    ok:      true,
    service: "widget-chat",
    hasKey:  !!process.env.OPENAI_API_KEY,
    model:   process.env.OPENAI_MODEL || "gpt-4o-mini",
  });
}
