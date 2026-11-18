import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, num, parseDay, schoolGuard, str } from "@/lib/schoolApi";

const STATUSES = ["APPLICANT", "ACTIVE", "LEFT", "GRADUATED"];

export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false);
  if (isResponse(ctx)) return ctx;
  const sp = new URL(req.url).searchParams;
  const q = str(sp.get("q"));
  const status = str(sp.get("status")).toUpperCase();
  const classId = str(sp.get("classId"));
  const students = await prisma.schoolStudent.findMany({
    where: {
      companyId: ctx.companyId,
      ...(STATUSES.includes(status) ? { status } : {}),
      ...(classId ? { classId } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { admissionNo: { contains: q, mode: "insensitive" } }, { guardianName: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { admissionNo: "asc" },
    take: 2000,
    include: { class: { select: { name: true, section: true } } },
  });
  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const name = str(b.name);
  if (!name) return bad("Student name is required");
  const classId = str(b.classId) || null;
  if (classId && !(await prisma.schoolClass.findFirst({ where: { id: classId, companyId: ctx.companyId }, select: { id: true } }))) {
    return bad("Class not found", 404);
  }
  const status = STATUSES.includes(str(b.status).toUpperCase()) ? str(b.status).toUpperCase() : "ACTIVE";

  // Admission number: use the supplied one, else next in sequence.
  let admissionNo = str(b.admissionNo);
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!admissionNo || attempt > 0) {
      const count = await prisma.schoolStudent.count({ where: { companyId: ctx.companyId } });
      admissionNo = String(count + 1 + attempt).padStart(4, "0");
    }
    try {
      const row = await prisma.schoolStudent.create({
        data: {
          companyId: ctx.companyId, classId, admissionNo, name, status,
          guardianName: str(b.guardianName) || null, phone: str(b.phone) || null,
          gender: str(b.gender).toUpperCase() || null, address: str(b.address) || null,
          dob: parseDay(b.dob), admissionDate: parseDay(b.admissionDate) ?? new Date(),
          discount: Math.max(0, num(b.discount)),
        },
      });
      return NextResponse.json(row, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
      if (str(b.admissionNo)) return bad("This admission number already exists", 409);
    }
  }
  return bad("Could not allocate an admission number, try again", 409);
}

export async function PATCH(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const id = str(b.id);
  if (!id) return bad("id is required");
  const data: Record<string, unknown> = {};
  if (b.name !== undefined) { if (!str(b.name)) return bad("Name cannot be empty"); data.name = str(b.name); }
  if (b.classId !== undefined) {
    const classId = str(b.classId) || null;
    if (classId && !(await prisma.schoolClass.findFirst({ where: { id: classId, companyId: ctx.companyId }, select: { id: true } }))) return bad("Class not found", 404);
    data.classId = classId;
  }
  if (b.status !== undefined) {
    const s = str(b.status).toUpperCase();
    if (!STATUSES.includes(s)) return bad("Invalid status");
    data.status = s;
  }
  for (const k of ["guardianName", "phone", "address", "gender"] as const) if (b[k] !== undefined) data[k] = str(b[k]) || null;
  if (b.discount !== undefined) data.discount = Math.max(0, num(b.discount));
  if (b.dob !== undefined) data.dob = parseDay(b.dob);
  const res = await prisma.schoolStudent.updateMany({ where: { id, companyId: ctx.companyId }, data });
  if (!res.count) return bad("Student not found", 404);
  return NextResponse.json({ ok: true });
}
