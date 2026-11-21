import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, schoolGuard } from "@/lib/schoolApi";

/** Progress of the school's setup, worked out from what actually exists — nothing to keep in sync. */
export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false, "SCHOOL_VIEW");
  if (isResponse(ctx)) return ctx;
  const { companyId } = ctx;
  const [settings, session, classes, heads, classFees, subjects, allocations, teachers, students, timetable] = await Promise.all([
    prisma.schoolSettings.findUnique({ where: { companyId } }),
    prisma.academicSession.count({ where: { companyId } }),
    prisma.schoolClass.count({ where: { companyId } }),
    prisma.schoolFeeHead.count({ where: { companyId } }),
    prisma.schoolClassFee.count({ where: { companyId } }),
    prisma.schoolSubject.count({ where: { companyId } }),
    prisma.schoolClassSubject.count({ where: { companyId } }),
    prisma.schoolTeacher.count({ where: { companyId, status: "ACTIVE" } }),
    prisma.schoolStudent.count({ where: { companyId } }),
    prisma.schoolTimetableEntry.count({ where: { companyId } }),
  ]);
  const hasFeeAmounts = classFees > 0 || (await prisma.schoolClass.count({ where: { companyId, monthlyFee: { gt: 0 } } })) > 0;
  const steps = [
    { key: "profile", done: Boolean(settings?.address || settings?.phone) },
    { key: "session", done: session > 0 },
    { key: "classes", done: classes > 0 },
    { key: "fees", done: heads > 0 && hasFeeAmounts },
    { key: "subjects", done: subjects > 0 && allocations > 0 },
    { key: "people", done: teachers > 0 && students > 0 },
  ];
  return NextResponse.json({
    steps, doneCount: steps.filter((s) => s.done).length, total: steps.length,
    complete: steps.every((s) => s.done), dismissed: Boolean(settings?.setupDismissedAt),
    counts: { session, classes, heads, classFees, subjects, allocations, teachers, students, timetable },
  });
}
