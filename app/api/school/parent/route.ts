import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceStatus, invoiceTotals } from "@/lib/schoolApi";
import { requireActiveSession } from "@/lib/sessionGuard";

/** A guardian sees only students explicitly linked to their signed-in user. */
export async function GET(req: NextRequest) {
  const session = await requireActiveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.role !== "PARENT") return NextResponse.json({ error: "Parent access required" }, { status: 403 });
  const companyId = session.companyId;
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  const userId = session.userId;
  const grants = await prisma.schoolGuardianAccess.findMany({ where: { companyId, userId, active: true }, include: { student: { include: { class: { select: { name: true, section: true } }, attendance: { orderBy: { date: "desc" }, take: 10 }, invoices: { include: { payments: { select: { amount: true } } }, orderBy: { dueDate: "desc" }, take: 25 } } } } });
  const classIds = grants.map((g) => g.student.classId).filter((id): id is string => Boolean(id));
  const announcements = await prisma.schoolAnnouncement.findMany({ where: { companyId, published: true, OR: [{ audience: "ALL" }, { classId: { in: classIds } }] }, include: { class: { select: { name: true, section: true } } }, orderBy: { createdAt: "desc" }, take: 20 });
  const assignments = await prisma.schoolAssignment.findMany({ where: { companyId, classId: { in: classIds } }, include: { class: { select: { name: true, section: true } }, subject: { select: { name: true } }, submissions: { where: { studentId: { in: grants.map((g) => g.studentId) } }, select: { id: true, studentId: true, status: true, marks: true, feedback: true, submittedAt: true } } }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], take: 30 });
  const now = new Date();
  return NextResponse.json({ announcements, assignments, students: grants.map(({ relation, student }) => ({ id: student.id, name: student.name, admissionNo: student.admissionNo, relation, class: student.class, attendance: student.attendance, invoices: student.invoices.map(i => { const t = invoiceTotals(i); return { id: i.id, title: i.title, period: i.period, dueDate: i.dueDate, ...t, status: invoiceStatus(t.balance, t.paid, i.dueDate, now) }; }) })) });
}
