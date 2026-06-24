import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/chat/messages?conversationId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    if (!conversationId) return NextResponse.json({ data: [] });

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      data: messages.map(m => ({
        id:              m.id,
        conversation_id: m.conversationId,
        sender:          m.sender,
        text:            m.text,
        created_at:      m.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

// POST /api/chat/messages — never returns 400 or 500
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = (await req.json()) ?? {}; } catch { /* ok */ }

  const conversationId = String(body.conversationId ?? body.conversation_id ?? "").trim();
  const sender         = String(body.sender ?? "").trim();
  const text           = String(body.text ?? body.message ?? "").trim();

  // Silently skip invalid or tmp- conversations
  if (!conversationId || !sender || !text) {
    return NextResponse.json({ ok: true });
  }
  if (conversationId.startsWith("tmp-")) {
    return NextResponse.json({ ok: true, id: `tmp-msg-${Date.now()}` });
  }

  try {
    const msg = await prisma.chatMessage.create({
      data: {
        conversationId: conversationId,
        sender:         sender,
        text:           text,
      },
    });

    // Bump conversation updatedAt (ignore failure)
    prisma.chatConversation.update({
      where: { id: conversationId },
      data:  {},
    }).catch(() => {});

    return NextResponse.json({
      ok:              true,
      id:              msg.id,
      conversation_id: msg.conversationId,
      sender:          msg.sender,
      text:            msg.text,
      created_at:      msg.createdAt,
    });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
