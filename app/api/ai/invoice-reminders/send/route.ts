import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    const userId = req.headers.get("x-user-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    await prisma.activityLog.create({
      data: {
        companyId,
        userId: userId || null,
        action: "AI_INVOICE_REMINDER_SENT",
        details: JSON.stringify({
          customer: String(body?.customer || "Customer"),
          invoiceRef: String(body?.invoiceRef || "Invoice"),
          amount: Number(body?.amount || 0),
          channel: String(body?.channel || "email"),
          priority: String(body?.priority || "medium"),
          source: "ai-command-center",
          sentAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Reminder queued for ${String(body?.customer || "Customer")} against ${String(body?.invoiceRef || "Invoice")}.`,
    });
  } catch (err) {
    console.error("AI invoice reminder send error:", err);
    return NextResponse.json({ error: "Failed to send reminder" }, { status: 500 });
  }
}
