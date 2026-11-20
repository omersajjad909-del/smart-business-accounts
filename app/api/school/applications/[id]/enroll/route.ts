import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await schoolGuard(req, true); if (isResponse(ctx)) return ctx;
  const { id } = await params; const b = await req.json().catch(() => ({}));
  const sessionId = str(b.sessionId), classId = str(b.classId) || null;
  if (!sessionId) return bad("Academic session is required");
  const [application, session, schoolClass] = await Promise.all([
    prisma.educationApplication.findFirst({ where: { id, companyId: ctx.companyId } }),
    prisma.academicSession.findFirst({ where: { id: sessionId, companyId: ctx.companyId } }),
    classId ? prisma.schoolClass.findFirst({ where: { id: classId, companyId: ctx.companyId } }) : Promise.resolve(true),
  ]);
  if (!application || !session || !schoolClass) return bad("Application, session or class was not found", 404);
  if (application.status !== "ACCEPTED") return bad("Accept the application before enrolling the student", 409);
  if (application.studentId) return bad("This application has already been enrolled", 409);
  const result = await prisma.$transaction(async (tx) => {
    const count = await tx.schoolStudent.count({ where: { companyId: ctx.companyId } });
    const admissionNo = String(count + 1).padStart(4, "0");
    const student = await tx.schoolStudent.create({ data: { companyId: ctx.companyId, name: application.applicantName, phone: application.phone, classId, admissionNo, status: "ACTIVE" } });
    const enrollment = await tx.educationEnrollment.create({ data: { companyId: ctx.companyId, studentId: student.id, sessionId, programId: application.programId, semester: str(b.semester) || null, rollNo: str(b.rollNo) || null } });
    await tx.educationApplication.update({ where: { id }, data: { studentId: student.id } });
    return { student, enrollment };
  });
  return NextResponse.json(result, { status: 201 });
}
