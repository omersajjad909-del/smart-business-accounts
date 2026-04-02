// FILE: app/api/public/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, company, phone, subject, message, source } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Name, email and message are required" }, { status: 400 });
    }

    // Save as ActivityLog
    await prisma.activityLog.create({
      data: {
        action: "CONTACT_FORM",
        details: JSON.stringify({ name, email, company, phone, subject, message, submittedAt: new Date() }),
      },
    });

    // Create a Lead record
    try {
      await (prisma as any).lead.create({
        data: {
          name: name.trim(),
          email: email.trim(),
          phone: phone?.trim() || null,
          company: company?.trim() || null,
          message: message.trim(),
          source: source?.trim() || "contact_form",
          status: "new",
        },
      });
    } catch {}

    // Try creating a support ticket
    try {
      await (prisma as any).supportTicket.create({
        data: {
          subject: `[${subject?.toUpperCase()||"GENERAL"}] ${name}: ${message.slice(0,60)}...`,
          message,
          email,
          status: "OPEN",
        },
      });
    } catch {}

    // Try creating admin notification
    try {
      await (prisma as any).notification.create({
        data: {
          type: "INFO",
          title: `New Contact: ${name}`,
          message: `${email} — ${subject} — "${message.slice(0,80)}..."`,
          isRead: false,
        },
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}