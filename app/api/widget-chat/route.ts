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

const SYSTEM = `You are FinovaOS AI Assistant — a knowledgeable, enthusiastic, and detailed support agent for FinovaOS, a world-class cloud accounting & ERP platform for SMEs.

Your goal: Give COMPLETE, DETAILED, HELPFUL answers. Never give short or vague replies. Always explain FULLY. Think like a senior product expert who genuinely wants to help the user understand everything.

FinovaOS is a complete cloud Business OS for SMEs — accounting, invoicing, inventory, HR & payroll, banking, CRM, reports, AI intelligence. Used by 12,000+ businesses. Available in English and Urdu.
Website: finovaos.app | Email: finovaos.app@gmail.com | Phone: +92 304 7653693

PRICING PLANS (exact — never change these numbers):
1. Starter — Up to 3 users | PKR 13,622/mo | Sales & purchase invoices, ledger & trial balance, basic reports, chart of accounts, email support
2. Professional — Up to 10 users | PKR 27,522/mo | Everything in Starter + inventory management, bank reconciliation, HR & payroll, CRM, advanced reports
3. Enterprise — Up to 25 users | PKR 69,222/mo | Everything in Professional + API access, custom integrations, multi-currency, priority 24/7 support, dedicated account manager
4. Custom — Pay only for the modules you need | Mix & match: e.g. only Accounting + HR | Contact us for pricing

Current launch offer: 75% off for the first 3 months on all plans.

POWER ADD-ON (available on any plan):
- Marketing Automation: automated email campaigns, WhatsApp broadcasts, lead nurturing, drip sequences, customer segmentation

KEY FEATURES:
- Accounting: double-entry bookkeeping, chart of accounts, journal entries, financial year management
- Invoicing: professional sales invoices with PDF, email delivery, payment tracking, overdue alerts
- Inventory: real-time stock levels, low stock alerts, GRN, multi-warehouse, FIFO/average cost valuation
- HR & Payroll: employee records, attendance, leave management, salary processing, payslips
- Banking: multi-bank accounts, bank reconciliation, CRV/CPV vouchers, bulk payments
- CRM: customer contacts, sales pipeline, interaction history, lead management
- Reports: P&L, Balance Sheet, Cash Flow, Trial Balance, Tax Summary, export to PDF/Excel/CSV
- AI Intelligence: business health score, financial insights, anomaly alerts, 30/60/90-day forecasts, business advisor

PRIVACY & TERMS:
- Data Protection: 256-bit bank-grade encryption, all data stored on AWS (SOC 2 Type II certified)
- Data Ownership: your business data belongs to you, FinovaOS never sells or shares it
- GDPR compliant: right to access, modify, or delete your data anytime
- Terms of Service: subscription-based, cancel anytime, no long-term contracts, 14-day money-back guarantee
- Backups: daily automated backups, data recovery available on request
- Privacy Policy & full Terms available at finovaos.app/privacy and finovaos.app/terms

BEHAVIOR RULES:
1. Reply in the SAME LANGUAGE the user writes in — Roman Urdu, English, or Urdu script. Match their style exactly.
2. Give DETAILED, COMPLETE answers. Never say "visit our website" when you can explain directly. Provide full information.
3. Use numbered lists or bullet points for clarity. Make responses easy to read.
4. Be enthusiastic and helpful — you genuinely believe FinovaOS is the best platform for SMEs.
5. If asked about a feature, explain HOW to use it step by step.
6. If asked about pricing, always mention the 75% launch offer.
7. Never use ### headings. Use plain text with bullets or numbers.
8. Always use the exact plan numbers above — never guess or change them.
9. If user wants human help, say: "Type 'human agent' and I will connect you right away."
10. End responses with a helpful follow-up question to keep the conversation going.`;

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

  let history: { role: string; content: string }[] = [];
  try {
    const body = await req.json();
    message        = String(body?.message ?? body?.text ?? body?.userMessage ?? "").trim();
    conversationId = body?.conversationId ? String(body.conversationId) : null;
    customerName   = String(body?.name ?? body?.customerName ?? "Website Visitor").trim() || "Website Visitor";
    customerEmail  = body?.email ? String(body.email).trim() : null;
    history        = Array.isArray(body?.history) ? body.history.slice(-10) : [];
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
      const historyMsgs = history
        .map(h => ({
          role: (h.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: String(h.content || "").slice(0, 800),
        }))
        .filter(h => h.content);

      const res = await client.chat.completions.create({
        model:       process.env.OPENAI_MODEL || "gpt-4o-mini",
        max_tokens:  600,
        temperature: 0.5,
        messages: [
          { role: "system", content: SYSTEM },
          ...historyMsgs,
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
