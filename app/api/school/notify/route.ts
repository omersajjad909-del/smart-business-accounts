import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { consumeTrialQuota } from "@/lib/trialLimits";
import { bad, invoiceTotals, isResponse, parseDay, schoolGuard, str } from "@/lib/schoolApi";

/**
 * Guardian messages. Nothing is ever sent without an explicit { send: true } —
 * the page first calls with send:false to show who would receive what.
 *
 *   POST { kind: "fee_due" }                      → guardians of students with overdue fees
 *   POST { kind: "absent", date: "YYYY-MM-DD" }   → guardians of students marked absent that day
 *   body.send === true actually sends (max 200 per request).
 */
const MAX_SEND = 200;

type Recipient = { studentId: string; student: string; phone: string; message: string };

const money = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;

export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_MESSAGES_SEND");
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const kind = str(b.kind);
  const send = b.send === true;
  const company = await prisma.company.findUnique({ where: { id: ctx.companyId }, select: { name: true } });
  const school = company?.name ?? "School";

  const recipients: Recipient[] = [];
  let skippedNoPhone = 0;

  if (kind === "fee_due") {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const invoices = await prisma.schoolFeeInvoice.findMany({
      where: { companyId: ctx.companyId, dueDate: { lt: today }, student: { status: "ACTIVE" } },
      include: { payments: { select: { amount: true } }, student: { select: { id: true, name: true, guardianName: true, phone: true } } },
    });
    const owed = new Map<string, { student: (typeof invoices)[number]["student"]; balance: number }>();
    for (const inv of invoices) {
      const { balance } = invoiceTotals(inv);
      if (balance <= 0.005) continue;
      const cur = owed.get(inv.studentId) ?? { student: inv.student, balance: 0 };
      cur.balance += balance;
      owed.set(inv.studentId, cur);
    }
    for (const { student, balance } of owed.values()) {
      if (!student.phone) { skippedNoPhone++; continue; }
      recipients.push({
        studentId: student.id, student: student.name, phone: student.phone,
        message: `Dear ${student.guardianName || "Parent"}, fee of ${money(balance)} for ${student.name} is overdue. Please clear it at the school office. - ${school}`,
      });
    }
  } else if (kind === "absent") {
    const date = parseDay(b.date);
    if (!date) return bad("Choose a date");
    const rows = await prisma.schoolAttendance.findMany({
      where: { companyId: ctx.companyId, date, status: "ABSENT" },
      include: { student: { select: { id: true, name: true, guardianName: true, phone: true } } },
    });
    for (const { student } of rows) {
      if (!student.phone) { skippedNoPhone++; continue; }
      recipients.push({
        studentId: student.id, student: student.name, phone: student.phone,
        message: `Dear ${student.guardianName || "Parent"}, ${student.name} was absent from school on ${str(b.date)}. - ${school}`,
      });
    }
  } else {
    return bad("Unknown message type");
  }

  if (!send) return NextResponse.json({ recipients, skippedNoPhone, willSend: Math.min(recipients.length, MAX_SEND) });

  const batch = recipients.slice(0, MAX_SEND);
  let sent = 0;
  const failed: { student: string; error: string }[] = [];
  for (const r of batch) {
    const quota = await consumeTrialQuota(ctx.companyId, "SMS");
    if (!quota.ok) { failed.push({ student: r.student, error: quota.message }); break; }
    const res = await sendSms({ to: r.phone, message: r.message });
    if (res.success) sent++; else failed.push({ student: r.student, error: res.error || "Failed" });
  }
  return NextResponse.json({ sent, failed, notAttempted: recipients.length - sent - failed.length, skippedNoPhone });
}
