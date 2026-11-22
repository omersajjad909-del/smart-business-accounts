import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveSession } from "@/lib/sessionGuard";
import { str } from "@/lib/schoolApi";

export async function POST(req: NextRequest) {
  const session = await requireActiveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.role !== "PARENT") return NextResponse.json({ error: "Parent access required" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const assignmentId = str(b.assignmentId), studentId = str(b.studentId);
  const attachment = str(b.attachmentUrl).slice(0, 2000);
  if (attachment && !/^https?:\/\//i.test(attachment)) return NextResponse.json({ error: "The attachment link must start with http:// or https://" }, { status: 400 });
  if (!assignmentId || !studentId) return NextResponse.json({ error: "Assignment and student are required" }, { status: 400 });
  const grant = await prisma.schoolGuardianAccess.findFirst({ where: { companyId: session.companyId, userId: session.userId, studentId, active: true } });
  if (!grant) return NextResponse.json({ error: "Guardian access denied" }, { status: 403 });
  const assignment = await prisma.schoolAssignment.findFirst({ where: { id: assignmentId, companyId: session.companyId } });
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  const student = await prisma.schoolStudent.findFirst({ where: { id: studentId, companyId: session.companyId, classId: assignment.classId } });
  if (!student) return NextResponse.json({ error: "Student is not in this assignment class" }, { status: 403 });
  const row = await prisma.schoolAssignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    create: { companyId: session.companyId, assignmentId, studentId, detail: str(b.detail).slice(0, 5000) || null, attachmentUrl: str(b.attachmentUrl).slice(0, 2000) || null, status: "SUBMITTED" },
    update: { detail: str(b.detail).slice(0, 5000) || null, attachmentUrl: str(b.attachmentUrl).slice(0, 2000) || null, status: "SUBMITTED", submittedAt: new Date(), gradedAt: null, marks: null, feedback: null },
  });
  return NextResponse.json(row, { status: 201 });
}
