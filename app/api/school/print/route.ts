import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, invoiceTotals, isResponse, schoolGuard, str } from "@/lib/schoolApi";

/**
 * Data for the printable documents.
 *   ?kind=receipt&id=<paymentId>
 *   ?kind=challan&period=YYYY-MM[&classId=][&studentId=]   unpaid balances only
 *   ?kind=idcards&classId=<id>   |   ?kind=idcards&studentId=<id>
 *   ?kind=certificate&studentId=<id>
 */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const kind = str(sp.get("kind"));
  // Receipts and challans show money; ID cards and certificates only need the school module.
  const ctx = await schoolGuard(req, false, kind === "receipt" || kind === "challan" ? "SCHOOL_FEES_VIEW" : "SCHOOL_VIEW");
  if (isResponse(ctx)) return ctx;
  const company = await prisma.company.findUnique({ where: { id: ctx.companyId }, select: { name: true, logoUrl: true } });
  const school = { name: company?.name ?? "School", logoUrl: company?.logoUrl ?? null };
  const cls = (c?: { name: string; section: string } | null) => (c ? (c.section ? `${c.name} - ${c.section}` : c.name) : "");

  if (kind === "receipt") {
    const p = await prisma.schoolPayment.findFirst({
      where: { id: str(sp.get("id")), companyId: ctx.companyId },
      include: { invoice: { include: { payments: { select: { amount: true } }, student: { select: { name: true, admissionNo: true, guardianName: true, class: { select: { name: true, section: true } } } } } } },
    });
    if (!p) return bad("Receipt not found", 404);
    const t = invoiceTotals(p.invoice);
    return NextResponse.json({ school, receipt: {
      receiptNo: p.receiptNo, paidAt: p.paidAt, amount: p.amount, method: p.method, note: p.note,
      student: p.invoice.student.name, admissionNo: p.invoice.student.admissionNo, guardian: p.invoice.student.guardianName, className: cls(p.invoice.student.class),
      feeTitle: p.invoice.title, period: p.invoice.period, payable: t.payable, paidTotal: t.paid, balance: t.balance,
    } });
  }

  if (kind === "challan") {
    const period = str(sp.get("period")), classId = str(sp.get("classId")), studentId = str(sp.get("studentId"));
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return bad("period (YYYY-MM) is required");
    const invoices = await prisma.schoolFeeInvoice.findMany({
      where: { companyId: ctx.companyId, period, ...(studentId ? { studentId } : {}), ...(classId ? { student: { classId } } : {}) },
      include: { payments: { select: { amount: true } }, student: { select: { id: true, name: true, admissionNo: true, guardianName: true, class: { select: { name: true, section: true } } } } },
      orderBy: [{ student: { admissionNo: "asc" } }],
    });
    const byStudent = new Map<string, { student: string; admissionNo: string; guardian: string | null; className: string; dueDate: Date; lines: { title: string; amount: number; discount: number; lateFee: number; paid: number; balance: number }[] }>();
    for (const inv of invoices) {
      const t = invoiceTotals(inv);
      if (t.balance <= 0.005) continue; // nothing left to collect
      const cur = byStudent.get(inv.studentId) ?? { student: inv.student.name, admissionNo: inv.student.admissionNo, guardian: inv.student.guardianName, className: cls(inv.student.class), dueDate: inv.dueDate, lines: [] };
      cur.lines.push({ title: inv.title, amount: inv.amount, discount: inv.discount, lateFee: inv.lateFee, paid: t.paid, balance: t.balance });
      if (inv.dueDate < cur.dueDate) cur.dueDate = inv.dueDate;
      byStudent.set(inv.studentId, cur);
    }
    return NextResponse.json({ school, period, challans: [...byStudent.values()] });
  }

  if (kind === "idcards") {
    const classId = str(sp.get("classId")), studentId = str(sp.get("studentId"));
    if (!classId && !studentId) return bad("classId or studentId is required");
    const students = await prisma.schoolStudent.findMany({
      where: { companyId: ctx.companyId, status: "ACTIVE", ...(studentId ? { id: studentId } : { classId }) },
      orderBy: { admissionNo: "asc" },
      select: { name: true, admissionNo: true, rollNo: true, photoUrl: true, guardianName: true, phone: true, bloodGroup: true, dob: true, address: true, city: true, emergencyPhone: true, class: { select: { name: true, section: true } } },
    });
    return NextResponse.json({ school, students: students.map(({ class: c, city, address, ...s }) => ({ ...s, address: [address, city].filter(Boolean).join(", ") || null, className: cls(c) })) });
  }

  if (kind === "certificate") {
    const s = await prisma.schoolStudent.findFirst({
      where: { id: str(sp.get("studentId")), companyId: ctx.companyId },
      select: { name: true, admissionNo: true, guardianName: true, guardianRelation: true, dob: true, gender: true, admissionDate: true, status: true, class: { select: { name: true, section: true } } },
    });
    if (!s) return bad("Student not found", 404);
    const { class: c, ...rest } = s;
    return NextResponse.json({ school, student: { ...rest, className: cls(c) } });
  }

  return bad("Unknown document type");
}
