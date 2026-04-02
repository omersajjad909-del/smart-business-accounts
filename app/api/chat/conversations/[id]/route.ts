import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// PATCH /api/chat/conversations/[id] — update status, assigned_agent
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, assignedAgent } = body;

    const updated = await prisma.chatConversation.update({
      where: { id },
      data: {
        ...(status !== undefined        ? { status }        : {}),
        ...(assignedAgent !== undefined ? { assignedAgent } : {}),
      },
    });

    return NextResponse.json({
      id:             updated.id,
      status:         updated.status,
      assigned_agent: updated.assignedAgent,
      updated_at:     updated.updatedAt,
    });
  } catch (error) {
    console.error("PATCH /api/chat/conversations/[id] error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// GET /api/chat/conversations/[id] — single conversation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conv = await prisma.chatConversation.findUnique({ where: { id } });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      id:             conv.id,
      customer_name:  conv.customerName,
      customer_email: conv.customerEmail,
      status:         conv.status,
      assigned_agent: conv.assignedAgent,
      created_at:     conv.createdAt,
      updated_at:     conv.updatedAt,
    });
  } catch (error) {
    console.error("GET /api/chat/conversations/[id] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
