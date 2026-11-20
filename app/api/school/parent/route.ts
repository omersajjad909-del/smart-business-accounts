import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceStatus, invoiceTotals } from "@/lib/schoolApi";
import { resolveCompanyId } from "@/lib/tenant";

/** A guardian sees only students explicitly linked to their signed-in user. */
export async function GET(req: NextRequest) {
  if (String(req.headers.get("x-user-role") || "").toUpperCase() !== "PARENT") return NextResponse.json({ error: "Parent access required" }, { status: 403 });
  const companyId = await resolveCompanyId(req); if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  const userId = req.headers.get("x-user-id") || "";
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const grants = await prisma.schoolGuardianAccess.findMany({ where: { companyId, userId, active: true }, include: { student: { include: { class: { select: { name: true, section: true } }, attendance: { orderBy: { date: "desc" }, take: 10 }, invoices: { include: { payments: { select: { amount: true } } }, orderBy: { dueDate: "desc" }, take: 25 } } } } });
  const now = new Date();
  return NextResponse.json({ students: grants.map(({ relation, student }) => ({ id: student.id, name: student.name, admissionNo: student.admissionNo, relation, class: student.class, attendance: student.attendance, invoices: student.invoices.map(i => { const t = invoiceTotals(i); return { id: i.id, title: i.title, period: i.period, dueDate: i.dueDate, ...t, status: invoiceStatus(t.balance, t.paid, i.dueDate, now) }; }) })) });
}
