import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/chat/messages?conversationId= — fetch messages for a conversation
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    const data = messages.map(m => ({
      id:              m.id,
      conversation_id: m.conversationId,
      sender:          m.sender,
      text:            m.text,
      created_at:      m.createdAt,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/chat/messages error:", error);
    return NextResponse.json({ data: [] });
  }
}

// POST /api/chat/messages — save a message
export async function POST(req: NextRequest) {
  try {
    const { conversationId, sender, text } = await req.json();

    if (!conversationId || !sender || !text) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const msg = await prisma.chatMessage.create({
      data: {
        conversationId: String(conversationId),
        sender:         String(sender),
        text:           String(text),
      },
    });

    // Bump conversation updatedAt
    await prisma.chatConversation.update({
      where: { id: String(conversationId) },
      data:  {},  // updatedAt @updatedAt handles this automatically
    }).catch(() => {}); // ignore if conv doesn't exist

    return NextResponse.json({
      id:              msg.id,
      conversation_id: msg.conversationId,
      sender:          msg.sender,
      text:            msg.text,
      created_at:      msg.createdAt,
    });
  } catch (error) {
    console.error("POST /api/chat/messages error:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
