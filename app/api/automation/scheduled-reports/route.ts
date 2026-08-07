/**
 * Scheduled Financial Reports — part of the Business Automation add-on.
 *
 * Company sets a frequency + recipient list once. The cron endpoint
 * (/api/cron/automation-lifecycle can call sendScheduledReport, or a
 * dedicated cron entry) delivers a real summary — sales, purchases,
 * receivables, payables — pulled directly from the company's own ledger.
 * "Send Now" uses the exact same code path, so what you test is what
 * actually gets sent on schedule.
 *
 * GET  /api/automation/scheduled-reports          — get config
 * PUT  /api/automation/scheduled-reports           — save config { frequency, recipients }
 * POST /api/automation/scheduled-reports?action=send_now — send immediately
 */
import { NextRequest, NextResponse } from "next/server";
import { getAutomationCompanyId } from "@/lib/automationHelpers";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

type ReportConfig = { frequency: "weekly" | "monthly"; recipients: string[]; lastSentAt?: string };

async function getConfig(companyId: string): Promise<ReportConfig | null> {
  const log = await prisma.activityLog.findFirst({
    where: { action: "SCHEDULED_REPORT_CONFIG", companyId },
    orderBy: { createdAt: "desc" },
    select: { details: true },
  });
  return log?.details ? JSON.parse(log.details) : null;
}

async function buildSummary(companyId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [salesAgg, purchaseAgg, receivablesAgg, payablesAgg] = await Promise.all([
    prisma.salesInvoice.aggregate({ where: { companyId, date: { gte: monthStart } }, _sum: { total: true }, _count: true }),
    prisma.purchaseInvoice.aggregate({ where: { companyId, date: { gte: monthStart } }, _sum: { total: true }, _count: true }).catch(() => ({ _sum: { total: 0 }, _count: 0 } as any)),
    prisma.salesInvoice.aggregate({ where: { companyId, dueDate: { lt: now } }, _sum: { total: true }, _count: true }),
    prisma.purchaseInvoice.aggregate({ where: { companyId, dueDate: { lt: now } }, _sum: { total: true }, _count: true }).catch(() => ({ _sum: { total: 0 }, _count: 0 } as any)),
  ]);

  return {
    periodLabel: monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    salesThisMonth: salesAgg._sum.total || 0,
    salesInvoiceCount: salesAgg._count,
    purchasesThisMonth: purchaseAgg._sum?.total || 0,
    purchaseInvoiceCount: purchaseAgg._count || 0,
    overdueReceivables: receivablesAgg._sum.total || 0,
    overdueReceivablesCount: receivablesAgg._count,
    overduePayables: payablesAgg._sum?.total || 0,
    overduePayablesCount: payablesAgg._count || 0,
  };
}

function buildReportEmail(companyName: string, s: Awaited<ReturnType<typeof buildSummary>>) {
  const row = (label: string, value: string) => `
    <tr><td style="padding:10px 0;font-size:13px;color:#64748b;">${label}</td>
    <td style="padding:10px 0;font-size:15px;font-weight:700;color:#0f172a;text-align:right;">${value}</td></tr>`;
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f1f5f9;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;">
      <div style="background:#0f172a;padding:20px 28px;color:#fff;font-size:18px;font-weight:800;">FinovaOS — ${s.periodLabel} Summary</div>
      <div style="padding:24px 28px;">
        <p style="font-size:13px;color:#475569;margin:0 0 16px;">${companyName} — automated business summary</p>
        <table style="width:100%;border-collapse:collapse;">
          ${row("Sales this month", `${s.salesThisMonth.toLocaleString()} (${s.salesInvoiceCount} invoices)`)}
          ${row("Purchases this month", `${s.purchasesThisMonth.toLocaleString()} (${s.purchaseInvoiceCount} invoices)`)}
          ${row("Overdue receivables", `${s.overdueReceivables.toLocaleString()} (${s.overdueReceivablesCount} invoices)`)}
          ${row("Overdue payables", `${s.overduePayables.toLocaleString()} (${s.overduePayablesCount} invoices)`)}
        </table>
        <p style="font-size:11px;color:#94a3b8;margin:20px 0 0;">Sent automatically by your FinovaOS Business Automation add-on.</p>
      </div>
    </div>
  </body></html>`;
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const cfg = await getConfig(companyId);
    return NextResponse.json(cfg || { frequency: "monthly", recipients: [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const frequency = body?.frequency === "weekly" ? "weekly" : "monthly";
    const recipients = Array.isArray(body?.recipients) ? body.recipients.filter(Boolean) : [];
    if (recipients.length === 0) return NextResponse.json({ error: "At least one recipient required" }, { status: 400 });

    await prisma.activityLog.create({
      data: { companyId, action: "SCHEDULED_REPORT_CONFIG", details: JSON.stringify({ frequency, recipients }) },
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    if (searchParams.get("action") !== "send_now") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const cfg = await getConfig(companyId);
    if (!cfg?.recipients?.length) return NextResponse.json({ error: "Configure recipients first" }, { status: 400 });

    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
    const summary = await buildSummary(companyId);
    const html = buildReportEmail(company?.name || "Your company", summary);

    const result = await sendEmail({
      to: cfg.recipients,
      subject: `FinovaOS — ${summary.periodLabel} business summary`,
      html,
      companyId,
    });
    if (!result.success) return NextResponse.json({ error: result.error || "Send failed" }, { status: 500 });

    await prisma.activityLog.create({
      data: { companyId, action: "SCHEDULED_REPORT_CONFIG", details: JSON.stringify({ ...cfg, lastSentAt: new Date().toISOString() }) },
    }).catch(() => {});

    return NextResponse.json({ success: true, summary });
  } catch (e: any) {
    console.error("[automation/scheduled-reports POST]", e);
    return NextResponse.json({ error: e?.message || "Failed to send report" }, { status: 500 });
  }
}
