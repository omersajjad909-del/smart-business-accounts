/**
 * Batch Invoice Reminder SMS API
 *
 * POST /api/automation/sms/reminder
 * Body: {
 *   daysOverdue?:    number  (default 7)
 *   customMessage?:  string  — override template; use {name}, {amount}, {dueDate} placeholders
 *   limit?:          number  (default 50)
 * }
 *
 * Queries overdue SalesInvoices, looks up customer phone from Account,
 * sends an SMS reminder for each and returns { sent, failed, results }.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAutomationCompanyId } from "@/lib/automationHelpers";
import { sendSms } from "@/lib/sms";

interface OverdueRow {
  id: string;
  customerName: string;
  total: number | string;
  dueDate: Date | string;
  phone: string | null;
}

function buildReminderMessage(
  customMessage: string | undefined,
  row: OverdueRow,
): string {
  if (customMessage) {
    return customMessage
      .replace(/\{name\}/g, row.customerName || "Customer")
      .replace(/\{amount\}/g, String(row.total || ""))
      .replace(/\{dueDate\}/g, row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-GB") : "");
  }
  const due = row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-GB") : "unknown";
  return `Dear ${row.customerName || "Customer"}, your invoice of ${row.total} was due on ${due}. Please settle your payment. - FinovaOS`;
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const daysOverdue: number = Number(body.daysOverdue) || 7;
    const customMessage: string | undefined = body.customMessage || undefined;
    const limit: number = Math.min(Number(body.limit) || 50, 200);

    // Raw SQL — schema not fully known via Prisma
    const intervalExpr = `'${daysOverdue} days'`;
    const rows = await prisma.$queryRawUnsafe<OverdueRow[]>(
      `SELECT si.id, si."customerName", si.total, si."dueDate", a.phone
       FROM "SalesInvoice" si
       LEFT JOIN "Account" a
         ON a."companyId" = si."companyId" AND a.name = si."customerName"
       WHERE si."companyId" = $1
         AND si.status != 'PAID'
         AND si."dueDate" < NOW() - INTERVAL '${daysOverdue} days'
       LIMIT ${limit}`,
      companyId,
    ).catch(async () => {
      // Fallback: try without Account join (Account table may not exist)
      return prisma.$queryRawUnsafe<OverdueRow[]>(
        `SELECT id, "customerName", total, "dueDate", NULL::text AS phone
         FROM "SalesInvoice"
         WHERE "companyId" = $1
           AND status != 'PAID'
           AND "dueDate" < NOW() - INTERVAL '${daysOverdue} days'
         LIMIT ${limit}`,
        companyId,
      ).catch(() => [] as OverdueRow[]);
    });

    const results: Array<{
      invoiceId: string;
      customerName: string;
      phone: string;
      status: "sent" | "skipped" | "failed";
      provider?: string;
      error?: string;
    }> = [];

    let sent = 0;
    let failed = 0;

    for (const row of rows) {
      if (!row.phone) {
        results.push({
          invoiceId: row.id,
          customerName: row.customerName,
          phone: "",
          status: "skipped",
          error: "No phone number on record",
        });
        failed++;
        continue;
      }

      const message = buildReminderMessage(customMessage, row);
      const result = await sendSms({ to: row.phone, message });

      await prisma.activityLog.create({
        data: {
          action: "SMS_SENT",
          companyId,
          details: JSON.stringify({
            to: row.phone,
            message,
            type: "reminder",
            invoiceId: row.id,
            customerName: row.customerName,
            status: result.success ? "sent" : "failed",
            provider: result.provider,
            error: result.error || null,
          }),
        },
      }).catch(() => {});

      if (result.success) {
        sent++;
        results.push({
          invoiceId: row.id,
          customerName: row.customerName,
          phone: row.phone,
          status: "sent",
          provider: result.provider,
        });
      } else {
        failed++;
        results.push({
          invoiceId: row.id,
          customerName: row.customerName,
          phone: row.phone,
          status: "failed",
          error: result.error,
        });
      }
    }

    return NextResponse.json({ success: true, sent, failed, results });
  } catch (e: any) {
    console.error("[SMS reminder]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
