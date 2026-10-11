import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/adminNotify";

export async function POST(req: NextRequest) {
  const { subject, message } = await req.json();
  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message required" }, { status: 400 });
  }
  // Store ticket in DB if SupportTicket model is available (best-effort)
  try {
    const anyPrisma = prisma as any;
    if (anyPrisma.supportTicket?.create) {
      await anyPrisma.supportTicket.create({
        data: {
          subject,
          message,
          status: "OPEN",
          createdAt: new Date(),
        },
      });
    }
  } catch {
    // Ignore if the model is not present; API still returns success
  }
  await notifyAdmins({
    title: "🎫 New support ticket",
    message: `${subject} — ${String(message).slice(0, 200)}`,
    type: "WARNING",
    link: "/admin/tickets",
  });
  return NextResponse.json({ success: true });
}
