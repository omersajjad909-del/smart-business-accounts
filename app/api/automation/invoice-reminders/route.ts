/**
 * Overdue Invoice Reminders — part of the Business Automation add-on.
 *
 * This is operational Accounts-Receivable follow-up, not a marketing tool:
 * it surfaces YOUR OWN sales invoices that are past their due date and lets
 * you send a one-off reminder email to that specific customer. Nothing is
 * sent without an explicit action here.
 *
 * GET  /api/automation/invoice-reminders          — list overdue invoices
 * POST /api/automation/invoice-reminders           — send a reminder { invoiceId }
 */
import { NextRequest, NextResponse } from "next/server";
import { getAutomationCompanyId } from "@/lib/automationHelpers";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, dueDate: { lt: now } },
      select: {
        id: true, invoiceNo: true, date: true, dueDate: true, total: true,
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 200,
    });

    // Last reminder sent per invoice, so the UI can show "already reminded".
    const logs = await prisma.activityLog.findMany({
      where: { companyId, action: "INVOICE_REMINDER_SENT" },
      select: { details: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const lastSentByInvoice = new Map<string, string>();
    for (const log of logs) {
      try {
        const d = JSON.parse(log.details || "{}");
        if (d.invoiceId && !lastSentByInvoice.has(d.invoiceId)) {
          lastSentByInvoice.set(d.invoiceId, log.createdAt.toISOString());
        }
      } catch {}
    }

    const rows = invoices
      .filter((inv) => inv.dueDate)
      .map((inv) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        date: inv.date,
        dueDate: inv.dueDate,
        total: inv.total,
        daysOverdue: daysBetween(now, inv.dueDate as Date),
        customerName: inv.customer?.name || "Unknown",
        customerEmail: inv.customer?.email || null,
        lastReminderSentAt: lastSentByInvoice.get(inv.id) || null,
      }));

    return NextResponse.json({ invoices: rows });
  } catch (e: any) {
    console.error("[automation/invoice-reminders GET]", e);
    return NextResponse.json({ error: e?.message || "Failed to load overdue invoices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const invoiceId = String(body?.invoiceId || "");
    if (!invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });

    const invoice = await prisma.salesInvoice.findFirst({
      where: { id: invoiceId, companyId },
      select: {
        id: true, invoiceNo: true, dueDate: true, total: true,
        company: { select: { name: true } },
        customer: { select: { name: true, email: true } },
      },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (!invoice.customer?.email) return NextResponse.json({ error: "This customer has no email on file" }, { status: 400 });

    const daysOverdue = invoice.dueDate ? daysBetween(new Date(), invoice.dueDate) : 0;
    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#1e293b;padding:24px;">
      <p>Dear ${invoice.customer.name || "Customer"},</p>
      <p>This is a friendly reminder that invoice <strong>${invoice.invoiceNo}</strong>
      for <strong>${invoice.total.toLocaleString()}</strong> is now <strong>${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue</strong>.</p>
      <p>Please arrange payment at your earliest convenience. If you have already paid, kindly disregard this message.</p>
      <p>Thank you,<br/>${invoice.company?.name || "Our team"}</p>
    </body></html>`;

    const result = await sendEmail({
      to: invoice.customer.email,
      subject: `Payment reminder — Invoice ${invoice.invoiceNo} (${daysOverdue} days overdue)`,
      html,
      companyId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send reminder" }, { status: 500 });
    }

    await prisma.activityLog.create({
      data: {
        companyId,
        action: "INVOICE_REMINDER_SENT",
        details: JSON.stringify({ invoiceId, invoiceNo: invoice.invoiceNo, sentTo: invoice.customer.email, daysOverdue }),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[automation/invoice-reminders POST]", e);
    return NextResponse.json({ error: e?.message || "Failed to send reminder" }, { status: 500 });
  }
}
