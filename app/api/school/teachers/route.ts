import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, parseDay, schoolGuard, str } from "@/lib/schoolApi";

export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false);
  if (isResponse(ctx)) return ctx;
  const status = str(new URL(req.url).searchParams.get("status")).toUpperCase();
  const rows = await prisma.schoolTeacher.findMany({
    where: { companyId: ctx.companyId, ...(status ? { status } : {}) },
    orderBy: { employeeNo: "asc" },
    include: { classSubjects: { select: { class: { select: { name: true, section: true } }, subject: { select: { name: true } } } } },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const name = str(b.name);
  if (!name) return bad("Teacher name is required");
  let employeeNo = str(b.employeeNo);
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!employeeNo || attempt > 0) {
      const n = await prisma.schoolTeacher.count({ where: { companyId: ctx.companyId } });
      employeeNo = `T-${String(n + 1 + attempt).padStart(3, "0")}`;
    }
    try {
      const row = await prisma.schoolTeacher.create({
        data: { companyId: ctx.companyId, employeeNo, name, phone: str(b.phone) || null, email: str(b.email) || null, qualification: str(b.qualification) || null, joiningDate: parseDay(b.joiningDate) ?? new Date() },
      });
      return NextResponse.json(row, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
      if (str(b.employeeNo)) return bad("This employee number already exists", 409);
    }
  }
  return bad("Could not allocate an employee number, try again", 409);
}

export async function PATCH(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const id = str(b.id);
  if (!id) return bad("id is required");
  const data: Record<string, unknown> = {};
  if (b.name !== undefined) { if (!str(b.name)) return bad("Name cannot be empty"); data.name = str(b.name); }
  if (b.status !== undefined) { const s = str(b.status).toUpperCase(); if (!["ACTIVE", "LEFT"].includes(s)) return bad("Invalid status"); data.status = s; }
  for (const k of ["phone", "email", "qualification"] as const) if (b[k] !== undefined) data[k] = str(b[k]) || null;
  const res = await prisma.schoolTeacher.updateMany({ where: { id, companyId: ctx.companyId }, data });
  if (!res.count) return bad("Teacher not found", 404);
  return NextResponse.json({ ok: true });
}
