import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveChatScope } from "@/lib/chatScope";

export const runtime = "nodejs";

// PATCH /api/chat/conversations/[id] — update status, assigned_agent
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await resolveChatScope(req);
  if (scope.error) return scope.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, assignedAgent } = body;

    // Any tenant admin could resolve or reassign anyone's conversation by id.
    const owned = await prisma.chatConversation.findFirst({
      where: { id, ...scope.where },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
//
// This had no guard of any kind: anyone who knew (or guessed) a conversation
// id could read the visitor's name and email straight off the public internet.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await resolveChatScope(req);
  if (scope.error) return scope.error;

  try {
    const { id } = await params;
    const conv = await prisma.chatConversation.findFirst({ where: { id, ...scope.where } });
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
