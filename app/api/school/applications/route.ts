import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, parseDay, schoolGuard, str } from "@/lib/schoolApi";
import { nextDocNo } from "@/lib/docNumber";

const STATUSES = ["SUBMITTED", "REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"];
export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false); if (isResponse(ctx)) return ctx;
  const rows = await prisma.educationApplication.findMany({ where: { companyId: ctx.companyId }, include: { program: { select: { name: true } }, applyClass: { select: { name: true, section: true } }, student: { select: { admissionNo: true, name: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(rows);
}
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true); if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({})); const applicantName = str(b.applicantName);
  if (!applicantName) return bad("Applicant name is required");
  const programId = str(b.programId) || null;
  const applyClassId = str(b.applyClassId) || null;
  if (applyClassId && !(await prisma.schoolClass.findFirst({ where: { id: applyClassId, companyId: ctx.companyId }, select: { id: true } }))) return bad("Class not found", 404);
  const phoneDigits = str(b.phone).replace(/\D/g, "");
  if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 13)) return bad("Enter a valid phone number");
  const dob = parseDay(b.dob);
  if (b.dob && !dob) return bad("Enter a valid date of birth");
  if (programId && !(await prisma.educationProgram.findFirst({ where: { id: programId, companyId: ctx.companyId } }))) return bad("Program not found", 404);
  // One past the highest number issued (a row count repeats a number once an application has been deleted).
  const year = new Date().getFullYear();
  const issued = await prisma.educationApplication.findMany({ where: { companyId: ctx.companyId, applicationNo: { startsWith: `APP-${year}-` } }, select: { applicationNo: true } });
  const applicationNo = str(b.applicationNo) || nextDocNo(issued, "applicationNo", `APP-${year}-`);
  try { const row = await prisma.educationApplication.create({ data: { companyId: ctx.companyId, applicationNo, applicantName, phone: str(b.phone) || null, programId, note: str(b.note) || null, applyClassId, guardianName: str(b.guardianName) || null, gender: str(b.gender).toUpperCase() || null, dob, previousSchool: str(b.previousSchool) || null } }); return NextResponse.json(row, { status: 201 }); }
  catch (e) { if ((e as { code?: string }).code === "P2002") return bad("Application number already exists", 409); throw e; }
}
export async function PATCH(req: NextRequest) {
  const ctx = await schoolGuard(req, true); if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({})); const id = str(b.id);
  if (!id) return bad("Application is required");

  // Link the application to the student who was admitted from it — this also closes it as ACCEPTED.
  if (b.studentId !== undefined) {
    const studentId = str(b.studentId);
    if (!(await prisma.schoolStudent.findFirst({ where: { id: studentId, companyId: ctx.companyId }, select: { id: true } }))) return bad("Student not found", 404);
    const r = await prisma.educationApplication.updateMany({ where: { id, companyId: ctx.companyId, studentId: null }, data: { studentId, status: "ACCEPTED" } });
    if (!r.count) return bad("Application not found, or it is already linked to a student", 409);
    return NextResponse.json({ ok: true });
  }

  const status = str(b.status).toUpperCase();
  if (!STATUSES.includes(status)) return bad("Valid application and status are required");
  const result = await prisma.educationApplication.updateMany({ where: { id, companyId: ctx.companyId, studentId: null }, data: { status, note: b.note === undefined ? undefined : str(b.note) || null } });
  if (!result.count) return bad("Application not found, or the student is already enrolled", 409); return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await schoolGuard(req, true); if (isResponse(ctx)) return ctx;
  const id = str(new URL(req.url).searchParams.get("id"));
  if (!id) return bad("Application id is required");
  const result = await prisma.educationApplication.deleteMany({ where: { id, companyId: ctx.companyId, studentId: null } });
  if (!result.count) return bad("Application not found or already enrolled", 409);
  return NextResponse.json({ ok: true });
}
