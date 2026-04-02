import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/chat/conversations — list all (for admin dashboard)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // optional filter
    const limit  = Number(searchParams.get("limit") || "100");

    const conversations = await prisma.chatConversation.findMany({
      where: status && status !== "all" ? { status } : undefined,
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { text: true, sender: true, createdAt: true },
        },
      },
    });

    // Shape for frontend
    const data = conversations.map(c => ({
      id:            c.id,
      customer_name: c.customerName,
      customer_email:c.customerEmail,
      status:        c.status,
      assigned_agent:c.assignedAgent,
      created_at:    c.createdAt,
      updated_at:    c.updatedAt,
      last_message:  c.messages[0]?.text ?? "",
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/chat/conversations error:", error);
    return NextResponse.json({ data: [] });
  }
}

// POST /api/chat/conversations — create new conversation
export async function POST(req: NextRequest) {
  try {
    const { customerName, customerEmail } = await req.json();

    if (!customerName?.trim()) {
      return NextResponse.json({ error: "customerName required" }, { status: 400 });
    }

    const conv = await prisma.chatConversation.create({
      data: {
        customerName:  customerName.trim(),
        customerEmail: customerEmail?.trim() || null,
        status: "bot",
      },
    });

    return NextResponse.json({
      id:             conv.id,
      customer_name:  conv.customerName,
      customer_email: conv.customerEmail,
      status:         conv.status,
      created_at:     conv.createdAt,
      updated_at:     conv.updatedAt,
    });
  } catch (error) {
    console.error("POST /api/chat/conversations error:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
