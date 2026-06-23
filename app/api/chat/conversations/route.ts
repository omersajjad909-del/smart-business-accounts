import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

export const runtime = "nodejs";

// GET /api/chat/conversations — list all (admin dashboard only)
export async function GET(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT", "SUPPORT"]);
  if (guard) return guard;

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
  // Parse body — never crash on empty/malformed body
  let body: Record<string, unknown> = {};
  try { body = (await req.json()) ?? {}; } catch { /* ok */ }

  const customerName =
    typeof body.customerName    === "string" ? body.customerName :
    typeof body.name            === "string" ? body.name :
    typeof body.customer_name   === "string" ? body.customer_name :
    "";
  const customerEmail =
    typeof body.customerEmail   === "string" ? body.customerEmail :
    typeof body.email           === "string" ? body.email :
    typeof body.customer_email  === "string" ? body.customer_email :
    "";

  const safeName  = customerName.trim()  || "Website Visitor";
  const safeEmail = customerEmail.trim() || null;

  try {
    const conv = await prisma.chatConversation.create({
      data: { customerName: safeName, customerEmail: safeEmail, status: "bot" },
    });
    return NextResponse.json({
      id:             conv.id,
      customer_name:  conv.customerName,
      customer_email: conv.customerEmail,
      status:         conv.status,
      created_at:     conv.createdAt,
      updated_at:     conv.updatedAt,
    });
  } catch {
    // DB unavailable — return a temp ID so the widget keeps working
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return NextResponse.json({
      id:             tempId,
      customer_name:  safeName,
      customer_email: safeEmail,
      status:         "bot",
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    });
  }
}
