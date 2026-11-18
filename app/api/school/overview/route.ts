import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceTotals, isResponse, schoolGuard } from "@/lib/schoolApi";

export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false);
  if (isResponse(ctx)) return ctx;
  const { companyId } = ctx;
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const [active, classes, invoices, monthPayments, todayMarks] = await Promise.all([
    prisma.schoolStudent.count({ where: { companyId, status: "ACTIVE" } }),
    prisma.schoolClass.count({ where: { companyId } }),
    prisma.schoolFeeInvoice.findMany({ where: { companyId }, include: { payments: { select: { amount: true } }, student: { select: { name: true, admissionNo: true } } } }),
    prisma.schoolPayment.aggregate({ where: { companyId, paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.schoolAttendance.groupBy({ by: ["status"], where: { companyId, date: today }, _count: true }),
  ]);

  let outstanding = 0, overdue = 0;
  const owed = new Map<string, { name: string; admissionNo: string; balance: number }>();
  for (const inv of invoices) {
    const { balance } = invoiceTotals(inv);
    if (balance <= 0.005) continue;
    outstanding += balance;
    if (inv.dueDate < today) {
      overdue += balance;
      const cur = owed.get(inv.studentId) ?? { name: inv.student.name, admissionNo: inv.student.admissionNo, balance: 0 };
      cur.balance += balance;
      owed.set(inv.studentId, cur);
    }
  }
  const att = Object.fromEntries(todayMarks.map((m) => [m.status, m._count]));
  const marked = todayMarks.reduce((s, m) => s + m._count, 0);

  return NextResponse.json({
    activeStudents: active, classes,
    collectedThisMonth: monthPayments._sum.amount ?? 0, outstanding, overdue,
    defaulters: [...owed.values()].sort((a, b) => b.balance - a.balance).slice(0, 8),
    attendanceToday: { marked, present: (att.PRESENT ?? 0) + (att.LATE ?? 0), absent: att.ABSENT ?? 0 },
  });
}
