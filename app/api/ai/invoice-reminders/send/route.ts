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
    const invoiceId = String(body?.invoiceId || "").trim();
    const invoiceRef = String(body?.invoiceRef || "Invoice");
    const customer = String(body?.customer || "Customer");
    const channel = String(body?.channel || "email");
    const priority = String(body?.priority || "medium");
    const note = `AI queued ${priority} ${channel} follow-up for ${customer} / ${invoiceRef}.`;

    const invoice = invoiceId
      ? await prisma.salesInvoice.findFirst({
          where: { id: invoiceId, companyId, deletedAt: null },
          select: { id: true },
        })
      : await prisma.salesInvoice.findFirst({
          where: { invoiceNo: invoiceRef, companyId, deletedAt: null },
          select: { id: true },
        });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found for follow-up queue" }, { status: 404 });
    }

    await Promise.allSettled([
      prisma.paymentFollowUpLog.upsert({
        where: { companyId_invoiceId: { companyId, invoiceId: invoice.id } },
        update: {
          status: "CONTACTED",
          note,
          updatedBy: userId || null,
        },
        create: {
          companyId,
          invoiceId: invoice.id,
          status: "CONTACTED",
          note,
          updatedBy: userId || null,
        },
      }),
      prisma.activityLog.create({
        data: {
          companyId,
          userId: userId || null,
          action: "AI_INVOICE_REMINDER_SENT",
          details: JSON.stringify({
            invoiceId: invoice.id,
            customer,
            invoiceRef,
            amount: Number(body?.amount || 0),
            channel,
            priority,
            source: "ai-command-center",
            sentAt: new Date().toISOString(),
          }),
        },
      }),
      prisma.notification.create({
        data: {
          userId: userId || undefined,
          type: "SUCCESS",
          title: "AI reminder queued",
          message: note,
          link: "/dashboard/ai?tab=reminders",
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message: `Reminder queued for ${customer} against ${invoiceRef}.`,
    });
  } catch (err) {
    console.error("AI invoice reminder send error:", err);
    return NextResponse.json({ error: "Failed to send reminder" }, { status: 500 });
  }
}
