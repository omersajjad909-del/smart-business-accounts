import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, invoiceStatus, invoiceTotals, isResponse, schoolGuard } from "@/lib/schoolApi";

export function gradeFor(percent: number) {
  if (percent >= 90) return "A+";
  if (percent >= 80) return "A";
  if (percent >= 70) return "B";
  if (percent >= 60) return "C";
  if (percent >= 50) return "D";
  if (percent >= 40) return "E";
  return "F";
}

/** Full student profile: record, fee ledger, attendance summary and report card. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await schoolGuard(req, false, "SCHOOL_VIEW");
  if (isResponse(guard)) return guard;
  const { id } = await ctx.params;

  const student = await prisma.schoolStudent.findFirst({
    where: { id, companyId: guard.companyId },
    include: {
      class: { select: { name: true, section: true } },
      invoices: { orderBy: { dueDate: "desc" }, include: { payments: { orderBy: { paidAt: "asc" } } } },
      attendance: { orderBy: { date: "desc" }, take: 90 },
      promotions: { orderBy: { createdAt: "desc" } },
      results: { include: { exam: { select: { name: true, subject: true, totalMarks: true, passMarks: true, date: true } } } },
    },
  });
  if (!student) return bad("Student not found", 404);

  const now = new Date();
  const invoices = student.invoices.map((inv) => {
    const t = invoiceTotals(inv);
    return { ...inv, ...t, status: invoiceStatus(t.balance, t.paid, inv.dueDate, now) };
  });
  const fees = invoices.reduce((s, i) => ({ billed: s.billed + i.payable, paid: s.paid + i.paid, balance: s.balance + i.balance }), { billed: 0, paid: 0, balance: 0 });

  const counts: Record<string, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
  for (const a of student.attendance) counts[a.status] = (counts[a.status] ?? 0) + 1;
  const marked = student.attendance.length;

  // Report card: group subject results under their exam name.
  const byExam = new Map<string, { exam: string; subjects: { subject: string; marks: number; total: number; percent: number; grade: string; passed: boolean }[] }>();
  for (const r of student.results) {
    const e = byExam.get(r.exam.name) ?? { exam: r.exam.name, subjects: [] };
    const percent = Math.round((r.marks / r.exam.totalMarks) * 1000) / 10;
    e.subjects.push({ subject: r.exam.subject, marks: r.marks, total: r.exam.totalMarks, percent, grade: gradeFor(percent), passed: r.marks >= r.exam.passMarks });
    byExam.set(r.exam.name, e);
  }
  const reportCards = [...byExam.values()].map((e) => {
    const marks = e.subjects.reduce((s, x) => s + x.marks, 0);
    const total = e.subjects.reduce((s, x) => s + x.total, 0);
    const percent = total ? Math.round((marks / total) * 1000) / 10 : 0;
    return { ...e, marks, total, percent, grade: gradeFor(percent), passed: e.subjects.every((x) => x.passed) };
  });

  const { invoices: _i, attendance: _a, results: _r, promotions, ...profile } = student;
  void _i; void _a; void _r;
  return NextResponse.json({
    student: profile, fees, invoices,
    attendance: { ...counts, marked, percent: marked ? Math.round(((counts.PRESENT + counts.LATE) / marked) * 1000) / 10 : null },
    reportCards,
    promotions,
  });
}
