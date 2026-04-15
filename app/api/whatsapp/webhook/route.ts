import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";
import Anthropic from "@anthropic-ai/sdk";

// GET — Meta webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "finovaos_webhook_verify";
  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST — receive incoming WhatsApp messages from Meta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    for (const entry of body?.entry || []) {
      for (const change of entry?.changes || []) {
        const value = change?.value;
        if (!value) continue;
        const phoneNumberId: string = value.metadata?.phone_number_id || "";
        for (const msg of value.messages || []) {
          await handleIncomingMessage(phoneNumberId, msg).catch(console.error);
        }
      }
    }
    return NextResponse.json({ status: "ok" });
  } catch (e: any) {
    console.error("WhatsApp webhook error:", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

async function handleIncomingMessage(phoneNumberId: string, msg: any) {
  const from: string = msg.from;
  let incomingText = "";
  if (msg.type === "text") incomingText = msg.text?.body || "";
  else if (msg.type === "interactive") {
    incomingText =
      msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.title || "";
  }
  if (!incomingText.trim()) return;

  // Find company by phoneNumberId
  const company = await findCompanyByPhoneId(phoneNumberId);
  if (!company) return;

  await prisma.activityLog.create({
    data: {
      action: "WHATSAPP_INBOUND",
      companyId: company.id,
      details: JSON.stringify({ from, text: incomingText }),
    },
  }).catch(() => {});

  const cfg = await getAutoReplyConfig(company.id);
  if (!cfg?.enabled) return;

  const reply = await generateAIReply(cfg.systemPrompt, incomingText);
  if (!reply) return;

  await sendWhatsApp(company.id, { to: from, type: "text", text: reply });

  await prisma.activityLog.create({
    data: {
      action: "WHATSAPP_OUTBOUND",
      companyId: company.id,
      details: JSON.stringify({ to: from, text: reply }),
    },
  }).catch(() => {});
}

async function findCompanyByPhoneId(phoneNumberId: string): Promise<{ id: string } | null> {
  try {
    // Try index table first
    const rows = await prisma.$queryRaw<{ companyId: string }[]>`
      SELECT "companyId" FROM "WhatsAppPhoneIndex"
      WHERE "phoneNumberId" = ${phoneNumberId} LIMIT 1
    `.catch(() => [] as { companyId: string }[]);
    if (rows[0]?.companyId) return { id: rows[0].companyId };

    // Fallback: activity log
    const log = await prisma.activityLog.findFirst({
      where: { action: "WHATSAPP_PHONE_REGISTERED", details: { contains: phoneNumberId } },
      orderBy: { createdAt: "desc" },
      select: { companyId: true },
    });
    return log?.companyId ? { id: log.companyId } : null;
  } catch { return null; }
}

async function getAutoReplyConfig(companyId: string): Promise<{ enabled: boolean; systemPrompt: string } | null> {
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: "WHATSAPP_AUTOREPLY_CONFIG", companyId },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    if (!log?.details) return null;
    const cfg = JSON.parse(log.details);
    return {
      enabled: Boolean(cfg.enabled),
      systemPrompt: cfg.systemPrompt ||
        "You are a helpful business assistant. Reply politely and concisely. Keep replies under 200 words.",
    };
  } catch { return null; }
}

async function generateAIReply(systemPrompt: string, userMessage: string): Promise<string | null> {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    return res.content.find(c => c.type === "text")?.text?.trim() || null;
  } catch (e) {
    console.error("AI reply error:", e);
    return null;
  }
}
