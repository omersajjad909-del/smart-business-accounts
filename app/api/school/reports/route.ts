import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceTotals, isResponse, schoolGuard } from "@/lib/schoolApi";

/** Class-wise strength, 30-day attendance and fee position. */
export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false);
  if (isResponse(ctx)) return ctx;
  const { companyId } = ctx;
  const since = new Date(); since.setUTCDate(since.getUTCDate() - 30); since.setUTCHours(0, 0, 0, 0);

  const [classes, students, invoices, att] = await Promise.all([
    prisma.schoolClass.findMany({ where: { companyId }, orderBy: [{ name: "asc" }, { section: "asc" }] }),
    prisma.schoolStudent.findMany({ where: { companyId, status: "ACTIVE" }, select: { classId: true } }),
    prisma.schoolFeeInvoice.findMany({ where: { companyId }, select: { amount: true, discount: true, lateFee: true, payments: { select: { amount: true } }, student: { select: { classId: true } } } }),
    prisma.schoolAttendance.findMany({ where: { companyId, date: { gte: since } }, select: { status: true, student: { select: { classId: true } } } }),
  ]);

  const rows = classes.map((c) => {
    const strength = students.filter((s) => s.classId === c.id).length;
    const fee = invoices.filter((i) => i.student.classId === c.id).reduce((s, i) => {
      const t = invoiceTotals(i);
      return { billed: s.billed + t.payable, collected: s.collected + t.paid, outstanding: s.outstanding + t.balance };
    }, { billed: 0, collected: 0, outstanding: 0 });
    const a = att.filter((x) => x.student.classId === c.id);
    const present = a.filter((x) => x.status === "PRESENT" || x.status === "LATE").length;
    return {
      classId: c.id, name: c.name, section: c.section, strength, ...fee,
      collectionRate: fee.billed ? Math.round((fee.collected / fee.billed) * 1000) / 10 : null,
      attendancePercent: a.length ? Math.round((present / a.length) * 1000) / 10 : null,
    };
  });
  return NextResponse.json({ rows, totalStudents: students.length });
}
