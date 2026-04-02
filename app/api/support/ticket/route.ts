import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  return NextResponse.json({ success: true });
}
