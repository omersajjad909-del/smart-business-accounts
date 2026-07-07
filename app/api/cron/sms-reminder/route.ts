import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel cron: daily at 10:00 UTC
// Replaces: /api/automation/sms/reminder?action=cron
// Sends overdue invoice SMS reminders across all active companies
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const companies = await prisma.company.findMany({
      where: { isActive: true, subscriptionStatus: "ACTIVE" },
      select: { id: true, name: true },
    });

    let totalSent = 0;
    let totalFailed = 0;

    for (const co of companies) {
      try {
        const daysOverdue = 7;
        const rows = await prisma.$queryRawUnsafe<Array<{
          id: string; customerName: string; total: number; dueDate: Date; phone: string | null;
        }>>(
          `SELECT si.id, si."customerName", si.total, si."dueDate", a.phone
           FROM "SalesInvoice" si
           LEFT JOIN "Account" a ON a."companyId" = si."companyId" AND a.name = si."customerName"
           WHERE si."companyId" = $1
             AND si.status != 'PAID'
             AND si."dueDate" < NOW() - INTERVAL '${daysOverdue} days'
           LIMIT 50`,
          co.id,
        ).catch(() => []);

        for (const row of rows) {
          if (!row.phone) { totalFailed++; continue; }

          const due = row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-GB") : "N/A";
          const message = `Dear ${row.customerName || "Customer"}, your invoice of ${row.total} was due on ${due}. Please settle your payment. - ${co.name}`;

          const result = await sendSms({ to: row.phone, message });
          result.success ? totalSent++ : totalFailed++;

          await prisma.activityLog.create({
            data: {
              action: "SMS_SENT",
              companyId: co.id,
              details: JSON.stringify({ to: row.phone, type: "cron_reminder", invoiceId: row.id, status: result.success ? "sent" : "failed" }),
            },
          }).catch(() => {});
        }
      } catch {
        // continue for next company
      }
    }

    return NextResponse.json({ ok: true, companiesProcessed: companies.length, totalSent, totalFailed });
  } catch (err: any) {
    console.error("[cron] sms-reminder error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
