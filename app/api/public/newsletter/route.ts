/**
 * POST /api/public/newsletter  — subscribe
 * DELETE /api/public/newsletter — unsubscribe (by email query param)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

export async function POST(req: NextRequest) {
  try {
    const { email, name, source } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });

    await db.newsletterSubscriber.upsert({
      where: { email: email.toLowerCase().trim() },
      update: { status: "active", name: name?.trim() || undefined, unsubscribedAt: null },
      create: { email: email.toLowerCase().trim(), name: name?.trim() || null, source: source || "website", status: "active" },
    });

    return NextResponse.json({ success: true, message: "You're subscribed! We'll keep you updated." });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const email = new URL(req.url).searchParams.get("email")?.toLowerCase().trim();
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    await db.newsletterSubscriber.updateMany({
      where: { email },
      data: { status: "unsubscribed", unsubscribedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
