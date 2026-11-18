import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";

/** GET ?classId= → subjects of that class with the assigned teacher. */
export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false);
  if (isResponse(ctx)) return ctx;
  const classId = str(new URL(req.url).searchParams.get("classId"));
  if (!classId) return bad("classId is required");
  const rows = await prisma.schoolClassSubject.findMany({
    where: { companyId: ctx.companyId, classId },
    include: { subject: { select: { id: true, name: true } }, teacher: { select: { id: true, name: true } } },
    orderBy: { subject: { name: "asc" } },
  });
  return NextResponse.json(rows);
}

/** POST { classId, subjectId, teacherId|null } — adds the subject to the class or changes its teacher. */
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const classId = str(b.classId), subjectId = str(b.subjectId), teacherId = str(b.teacherId) || null;
  if (!classId || !subjectId) return bad("Class and subject are required");
  const [cls, sub, teacher] = await Promise.all([
    prisma.schoolClass.findFirst({ where: { id: classId, companyId: ctx.companyId }, select: { id: true } }),
    prisma.schoolSubject.findFirst({ where: { id: subjectId, companyId: ctx.companyId }, select: { id: true } }),
    teacherId ? prisma.schoolTeacher.findFirst({ where: { id: teacherId, companyId: ctx.companyId, status: "ACTIVE" }, select: { id: true } }) : Promise.resolve(true),
  ]);
  if (!cls || !sub) return bad("Class or subject not found", 404);
  if (!teacher) return bad("Teacher not found or no longer active", 404);
  const row = await prisma.schoolClassSubject.upsert({
    where: { classId_subjectId: { classId, subjectId } },
    create: { companyId: ctx.companyId, classId, subjectId, teacherId },
    update: { teacherId },
  });
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const id = new URL(req.url).searchParams.get("id") || "";
  const res = await prisma.schoolClassSubject.deleteMany({ where: { id, companyId: ctx.companyId } });
  if (!res.count) return bad("Not found", 404);
  return NextResponse.json({ ok: true });
}
