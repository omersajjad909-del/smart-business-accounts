import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";

const STATUSES = ["SUBMITTED", "REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"];
export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false); if (isResponse(ctx)) return ctx;
  const rows = await prisma.educationApplication.findMany({ where: { companyId: ctx.companyId }, include: { program: { select: { name: true } }, student: { select: { admissionNo: true, name: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(rows);
}
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true); if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({})); const applicantName = str(b.applicantName);
  if (!applicantName) return bad("Applicant name is required");
  const programId = str(b.programId) || null;
  if (programId && !(await prisma.educationProgram.findFirst({ where: { id: programId, companyId: ctx.companyId } }))) return bad("Program not found", 404);
  const count = await prisma.educationApplication.count({ where: { companyId: ctx.companyId } });
  const applicationNo = str(b.applicationNo) || `APP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  try { const row = await prisma.educationApplication.create({ data: { companyId: ctx.companyId, applicationNo, applicantName, phone: str(b.phone) || null, programId, note: str(b.note) || null } }); return NextResponse.json(row, { status: 201 }); }
  catch (e) { if ((e as { code?: string }).code === "P2002") return bad("Application number already exists", 409); throw e; }
}
export async function PATCH(req: NextRequest) {
  const ctx = await schoolGuard(req, true); if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({})); const id = str(b.id), status = str(b.status).toUpperCase();
  if (!id || !STATUSES.includes(status)) return bad("Valid application and status are required");
  const result = await prisma.educationApplication.updateMany({ where: { id, companyId: ctx.companyId }, data: { status, note: b.note === undefined ? undefined : str(b.note) || null } });
  if (!result.count) return bad("Application not found", 404); return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await schoolGuard(req, true); if (isResponse(ctx)) return ctx;
  const id = str(new URL(req.url).searchParams.get("id"));
  if (!id) return bad("Application id is required");
  const result = await prisma.educationApplication.deleteMany({ where: { id, companyId: ctx.companyId, studentId: null } });
  if (!result.count) return bad("Application not found or already enrolled", 409);
  return NextResponse.json({ ok: true });
}
