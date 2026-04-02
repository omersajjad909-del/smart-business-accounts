/**
 * POST /api/public/feedback — submit complaint or suggestion (public, no auth needed)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

const db = prisma as any;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, subject, message, email, name } = body;

    if (!type || !subject?.trim() || !message?.trim())
      return NextResponse.json({ error: "type, subject and message are required" }, { status: 400 });

    if (!["complaint", "suggestion", "bug", "general"].includes(type))
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    if (message.trim().length < 20)
      return NextResponse.json({ error: "Message must be at least 20 characters" }, { status: 400 });

    // Try to get logged-in user context
    let userId: string | null = null;
    let companyId: string | null = null;
    try {
      const token = getTokenFromRequest(req as any);
      if (token) {
        const p = verifyJwt(token) as any;
        userId = p?.userId || p?.id || null;
        companyId = p?.companyId || null;
      }
    } catch {}

    const fb = await db.feedback.create({
      data: {
        type,
        subject: subject.trim(),
        message: message.trim(),
        email: email?.toLowerCase().trim() || null,
        name: name?.trim() || null,
        status: "open",
        priority: "normal",
        userId,
        companyId,
      },
    });

    return NextResponse.json({ success: true, id: fb.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
