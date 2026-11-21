import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";

/** GET ?classId=&month=YYYY-MM → a register: every student's mark for every day, with totals. */
export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false, "SCHOOL_VIEW");
  if (isResponse(ctx)) return ctx;
  const sp = new URL(req.url).searchParams;
  const classId = str(sp.get("classId")), month = str(sp.get("month"));
  if (!classId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return bad("classId and month (YYYY-MM) are required");
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)), end = new Date(Date.UTC(y, m, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const students = await prisma.schoolStudent.findMany({
    where: { companyId: ctx.companyId, classId, status: "ACTIVE" },
    orderBy: { admissionNo: "asc" },
    select: { id: true, name: true, admissionNo: true, attendance: { where: { date: { gte: start, lt: end } }, select: { date: true, status: true } } },
  });
  const rows = students.map(({ attendance, ...s }) => {
    const marks: Record<number, string> = {};
    const t = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 } as Record<string, number>;
    for (const a of attendance) { marks[a.date.getUTCDate()] = a.status; t[a.status] = (t[a.status] ?? 0) + 1; }
    const marked = attendance.length;
    return { ...s, marks, present: t.PRESENT, absent: t.ABSENT, late: t.LATE, leave: t.LEAVE, percent: marked ? Math.round(((t.PRESENT + t.LATE) / marked) * 1000) / 10 : null };
  });
  const daysMarked = new Set(students.flatMap((s) => s.attendance.map((a) => a.date.getUTCDate()))).size;
  return NextResponse.json({ days, daysMarked, rows });
}
