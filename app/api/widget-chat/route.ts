/**
 * /api/widget-chat — Simple, bulletproof chatbot for the marketing widget.
 * Never returns 400 or 500. Always returns { reply: "..." }.
 */
import { NextRequest, NextResponse } from "next/server";
import { runChatEngine } from "@/lib/chatEngine";
import OpenAI from "openai";

export const runtime = "nodejs";

const SYSTEM = `You are FinovaOS AI Assistant — support bot for FinovaOS, a cloud accounting & ERP platform for SMEs.

FinovaOS features: accounting, invoicing, inventory, HR & payroll, banking, CRM, reports, AI intelligence.
Plans: Starter (5 users), Professional (25 users), Enterprise (unlimited).
Website: finovaos.app | Email: finovaos.app@gmail.com | Phone: +92 304 7653693

Rules:
- Reply in the same language the user writes in (English, Roman Urdu, or Urdu).
- Be helpful, friendly, concise. Max 3-4 sentences per reply.
- Never use ### headings. Use plain text with numbers or bullets.
- If asked about pricing, mention the 3 plans.
- If user wants human help, say: "Type 'human agent' and I will connect you."`;

export async function POST(req: NextRequest) {
  // 1. Parse body safely
  let message = "";
  let conversationId = "";
  try {
    const body = await req.json();
    message = String(body?.message ?? body?.text ?? body?.userMessage ?? body?.question ?? "").trim();
    conversationId = String(body?.conversationId ?? "");
  } catch { /* empty body is fine */ }

  // 2. If no message, return greeting
  if (!message) {
    return NextResponse.json({
      reply: "Hello! I'm FinovaOS AI Assistant. Ask me anything about FinovaOS — accounting, invoicing, inventory, payroll, and more! 😊",
    });
  }

  // 3. Try local keyword engine first (no API key needed, always fast)
  try {
    const local = runChatEngine(message, []);
    if (local && local.confidence >= 0.72 && local.intentId !== "fallback") {
      return NextResponse.json({ reply: local.reply, conversationId });
    }
  } catch { /* fall through */ }

  // 4. Try OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        max_tokens: 350,
        temperature: 0.5,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user",   content: message },
        ],
      });
      const reply = res.choices[0]?.message?.content?.trim();
      if (reply) return NextResponse.json({ reply, conversationId });
    } catch { /* fall through to local */ }
  }

  // 5. Always return something from local engine
  try {
    const local = runChatEngine(message, []);
    return NextResponse.json({ reply: local.reply, conversationId });
  } catch { /* last resort */ }

  return NextResponse.json({
    reply: "FinovaOS is a complete cloud accounting & ERP platform. For details visit finovaos.app or email finovaos.app@gmail.com 😊",
  });
}
