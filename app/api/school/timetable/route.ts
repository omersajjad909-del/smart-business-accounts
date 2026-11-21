import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, num, schoolGuard, str } from "@/lib/schoolApi";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** GET ?classId= or ?teacherId= → that class's / teacher's weekly periods. */
export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false, "SCHOOL_VIEW");
  if (isResponse(ctx)) return ctx;
  const sp = new URL(req.url).searchParams;
  const classId = str(sp.get("classId")), teacherId = str(sp.get("teacherId"));
  if (!classId && !teacherId) return bad("classId or teacherId is required");
  const rows = await prisma.schoolTimetableEntry.findMany({
    where: { companyId: ctx.companyId, ...(classId ? { classId } : {}), ...(teacherId ? { teacherId } : {}) },
    include: { subject: { select: { name: true } }, teacher: { select: { name: true } }, class: { select: { name: true, section: true } } },
    orderBy: [{ day: "asc" }, { periodNo: "asc" }],
  });
  return NextResponse.json(rows);
}

/** POST — sets one period. A teacher cannot be in two classes in the same period. */
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_ACADEMICS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const classId = str(b.classId), subjectId = str(b.subjectId), teacherId = str(b.teacherId) || null;
  const day = num(b.day), periodNo = num(b.periodNo);
  const startTime = str(b.startTime), endTime = str(b.endTime);
  if (!classId || !subjectId) return bad("Class and subject are required");
  if (!Number.isInteger(day) || day < 1 || day > 6) return bad("Day must be Monday to Saturday");
  if (!Number.isInteger(periodNo) || periodNo < 1 || periodNo > 12) return bad("Period number must be 1 to 12");
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime) || endTime <= startTime) return bad("Enter a valid start and end time (HH:MM)");

  const [cls, sub] = await Promise.all([
    prisma.schoolClass.findFirst({ where: { id: classId, companyId: ctx.companyId }, select: { id: true } }),
    prisma.schoolSubject.findFirst({ where: { id: subjectId, companyId: ctx.companyId }, select: { id: true } }),
  ]);
  if (!cls || !sub) return bad("Class or subject not found", 404);

  if (teacherId) {
    const teacher = await prisma.schoolTeacher.findFirst({ where: { id: teacherId, companyId: ctx.companyId, status: "ACTIVE" }, select: { id: true } });
    if (!teacher) return bad("Teacher not found or no longer active", 404);
    const clash = await prisma.schoolTimetableEntry.findFirst({
      where: { companyId: ctx.companyId, teacherId, day, periodNo, NOT: { classId } },
      include: { class: { select: { name: true, section: true } } },
    });
    if (clash) return bad(`This teacher already teaches ${clash.class.name}${clash.class.section ? ` ${clash.class.section}` : ""} in that period`, 409);
  }

  const row = await prisma.schoolTimetableEntry.upsert({
    where: { classId_day_periodNo: { classId, day, periodNo } },
    create: { companyId: ctx.companyId, classId, day, periodNo, startTime, endTime, subjectId, teacherId },
    update: { startTime, endTime, subjectId, teacherId },
  });
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_ACADEMICS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const id = new URL(req.url).searchParams.get("id") || "";
  const res = await prisma.schoolTimetableEntry.deleteMany({ where: { id, companyId: ctx.companyId } });
  if (!res.count) return bad("Not found", 404);
  return NextResponse.json({ ok: true });
}
