import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// POST /api/chat/escalate — public endpoint for widget to request human agent
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = (await req.json()) ?? {}; } catch { /* ok */ }

  const conversationId = String(body.conversationId ?? "").trim();

  // Silently ignore tmp- or missing IDs
  if (!conversationId || conversationId.startsWith("tmp-")) {
    return NextResponse.json({ ok: true });
  }

  try {
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data:  { status: "human" },
    });
  } catch { /* ignore — conversation may not exist yet */ }

  return NextResponse.json({ ok: true });
}
