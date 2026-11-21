import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceTotals, isResponse, schoolGuard } from "@/lib/schoolApi";

export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false, "SCHOOL_VIEW");
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
  // Last 6 months: billed (by due month) vs collected (by payment month).
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) months.push(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  const trend = new Map(months.map((m) => [m, { month: m, invested: 0, earned: 0 }]));
  for (const inv of invoices) {
    const row = trend.get(inv.dueDate.toISOString().slice(0, 7));
    if (row) row.invested += invoiceTotals({ ...inv, payments: [] }).payable;
  }
  const recent = await prisma.schoolPayment.findMany({ where: { companyId, paidAt: { gte: new Date(`${months[0]}-01T00:00:00.000Z`) } }, select: { amount: true, paidAt: true } });
  for (const pay of recent) {
    const row = trend.get(pay.paidAt.toISOString().slice(0, 7));
    if (row) row.earned += pay.amount;
  }
  const att = Object.fromEntries(todayMarks.map((m) => [m.status, m._count]));
  const marked = todayMarks.reduce((s, m) => s + m._count, 0);

  const present = (att.PRESENT ?? 0) + (att.LATE ?? 0);
  return NextResponse.json({
    // Flat numeric block read by the main dashboard (lib/dashboardLayouts.ts).
    summary: {
      activeStudents: active, classes, collectedThisMonth: monthPayments._sum.amount ?? 0,
      outstanding, overdue, defaulterCount: owed.size, presentToday: present, absentToday: att.ABSENT ?? 0,
    },
    monthlyTrend: [...trend.values()],
    activeStudents: active, classes,
    collectedThisMonth: monthPayments._sum.amount ?? 0, outstanding, overdue,
    defaulters: [...owed.values()].sort((a, b) => b.balance - a.balance).slice(0, 8),
    attendanceToday: { marked, present: (att.PRESENT ?? 0) + (att.LATE ?? 0), absent: att.ABSENT ?? 0 },
  });
}
