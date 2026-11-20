import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, parseDay, schoolGuard, str } from "@/lib/schoolApi";

const TYPES = ["session", "department", "program", "course"] as const;
type Kind = typeof TYPES[number];
const kind = (v: unknown): Kind | null => TYPES.includes(str(v) as Kind) ? str(v) as Kind : null;

export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false); if (isResponse(ctx)) return ctx;
  const [sessions, departments, programs, courses] = await Promise.all([
    prisma.academicSession.findMany({ where: { companyId: ctx.companyId }, orderBy: [{ active: "desc" }, { startsOn: "desc" }] }),
    prisma.educationDepartment.findMany({ where: { companyId: ctx.companyId }, orderBy: { name: "asc" } }),
    prisma.educationProgram.findMany({ where: { companyId: ctx.companyId }, include: { department: { select: { name: true } }, _count: { select: { courses: true, enrollments: true } } }, orderBy: { name: "asc" } }),
    prisma.educationCourse.findMany({ where: { companyId: ctx.companyId }, include: { program: { select: { name: true } } }, orderBy: { name: "asc" } }),
  ]);
  return NextResponse.json({ sessions, departments, programs, courses });
}

export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true); if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({})); const type = kind(b.type);
  if (!type) return bad("Choose an academic record type");
  const name = str(b.name); if (!name) return bad("Name is required");
  if (type === "session") {
    const startsOn = parseDay(b.startsOn), endsOn = parseDay(b.endsOn);
    if (!startsOn || !endsOn || startsOn >= endsOn) return bad("Enter a valid session start and end date");
    const active = b.active === true;
    await prisma.$transaction(async (tx) => {
      if (active) await tx.academicSession.updateMany({ where: { companyId: ctx.companyId }, data: { active: false } });
      await tx.academicSession.create({ data: { companyId: ctx.companyId, name, startsOn, endsOn, active } });
    });
  } else if (type === "department") {
    await prisma.educationDepartment.create({ data: { companyId: ctx.companyId, name, code: str(b.code) || null } });
  } else if (type === "program") {
    const departmentId = str(b.departmentId) || null;
    if (departmentId && !(await prisma.educationDepartment.findFirst({ where: { id: departmentId, companyId: ctx.companyId } }))) return bad("Department not found", 404);
    await prisma.educationProgram.create({ data: { companyId: ctx.companyId, name, departmentId, code: str(b.code) || null, duration: str(b.duration) || null } });
  } else {
    const programId = str(b.programId) || null;
    if (programId && !(await prisma.educationProgram.findFirst({ where: { id: programId, companyId: ctx.companyId } }))) return bad("Program not found", 404);
    const creditHours = Number(b.creditHours || 0); if (!Number.isFinite(creditHours) || creditHours < 0) return bad("Credit hours must be zero or greater");
    await prisma.educationCourse.create({ data: { companyId: ctx.companyId, name, programId, code: str(b.code) || null, creditHours } });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await schoolGuard(req, true); if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const type = kind(b.type), id = str(b.id);
  if (!type || !id) return bad("Record type and id are required");
  if (type === "session") {
    const startsOn = parseDay(b.startsOn), endsOn = parseDay(b.endsOn);
    if (!startsOn || !endsOn || startsOn >= endsOn) return bad("Enter a valid session start and end date");
    const exists = await prisma.academicSession.findFirst({ where: { id, companyId: ctx.companyId }, select: { id: true } });
    if (!exists) return bad("Academic session not found", 404);
    await prisma.$transaction(async (tx) => {
      if (b.active === true) await tx.academicSession.updateMany({ where: { companyId: ctx.companyId }, data: { active: false } });
      await tx.academicSession.update({ where: { id }, data: { name: str(b.name), startsOn, endsOn, active: b.active === true } });
    });
  } else if (type === "department") {
    const r = await prisma.educationDepartment.updateMany({ where: { id, companyId: ctx.companyId }, data: { name: str(b.name), code: str(b.code) || null } });
    if (!r.count) return bad("Department not found", 404);
  } else if (type === "program") {
    const departmentId = str(b.departmentId) || null;
    if (departmentId && !(await prisma.educationDepartment.findFirst({ where: { id: departmentId, companyId: ctx.companyId } }))) return bad("Department not found", 404);
    const r = await prisma.educationProgram.updateMany({ where: { id, companyId: ctx.companyId }, data: { name: str(b.name), code: str(b.code) || null, duration: str(b.duration) || null, departmentId } });
    if (!r.count) return bad("Program not found", 404);
  } else {
    const programId = str(b.programId) || null;
    if (programId && !(await prisma.educationProgram.findFirst({ where: { id: programId, companyId: ctx.companyId } }))) return bad("Program not found", 404);
    const creditHours = Number(b.creditHours || 0);
    if (!Number.isFinite(creditHours) || creditHours < 0) return bad("Credit hours must be zero or greater");
    const r = await prisma.educationCourse.updateMany({ where: { id, companyId: ctx.companyId }, data: { name: str(b.name), code: str(b.code) || null, creditHours, programId } });
    if (!r.count) return bad("Course not found", 404);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await schoolGuard(req, true); if (isResponse(ctx)) return ctx;
  const sp = new URL(req.url).searchParams;
  const type = kind(sp.get("type")), id = str(sp.get("id"));
  if (!type || !id) return bad("Record type and id are required");
  let count = 0;
  if (type === "session") count = (await prisma.academicSession.deleteMany({ where: { id, companyId: ctx.companyId } })).count;
  if (type === "department") count = (await prisma.educationDepartment.deleteMany({ where: { id, companyId: ctx.companyId } })).count;
  if (type === "program") count = (await prisma.educationProgram.deleteMany({ where: { id, companyId: ctx.companyId } })).count;
  if (type === "course") count = (await prisma.educationCourse.deleteMany({ where: { id, companyId: ctx.companyId } })).count;
  if (!count) return bad("Record not found", 404);
  return NextResponse.json({ ok: true });
}
