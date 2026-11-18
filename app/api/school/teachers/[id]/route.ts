import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, schoolGuard } from "@/lib/schoolApi";

/** Teacher profile with the classes/subjects they take and their weekly teaching load. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await schoolGuard(req, false);
  if (isResponse(guard)) return guard;
  const { id } = await ctx.params;
  const teacher = await prisma.schoolTeacher.findFirst({
    where: { id, companyId: guard.companyId },
    include: {
      classSubjects: { include: { class: { select: { id: true, name: true, section: true } }, subject: { select: { id: true, name: true } } } },
      timetable: { include: { class: { select: { name: true, section: true } }, subject: { select: { name: true } } }, orderBy: [{ day: "asc" }, { periodNo: "asc" }] },
    },
  });
  if (!teacher) return bad("Teacher not found", 404);
  const { classSubjects, timetable, ...profile } = teacher;
  return NextResponse.json({ teacher: profile, classSubjects, timetable, weeklyPeriods: timetable.length });
}
