import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, parseDay, schoolGuard, str } from "@/lib/schoolApi";

const STATUSES = ["PRESENT", "ABSENT", "LATE", "LEAVE"];

/** GET ?classId=&date= → active students of the class with that day's mark (if any). */
export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false);
  if (isResponse(ctx)) return ctx;
  const sp = new URL(req.url).searchParams;
  const classId = str(sp.get("classId"));
  const date = parseDay(sp.get("date"));
  if (!classId || !date) return bad("classId and date are required");
  const students = await prisma.schoolStudent.findMany({
    where: { companyId: ctx.companyId, classId, status: "ACTIVE" },
    orderBy: { admissionNo: "asc" },
    select: { id: true, name: true, admissionNo: true, photoUrl: true, attendance: { where: { date }, select: { status: true, remark: true } } },
  });
  return NextResponse.json(students.map(({ attendance, ...s }) => ({ ...s, status: attendance[0]?.status ?? null, remark: attendance[0]?.remark ?? "" })));
}

/** POST { date, classId, entries:[{studentId,status}] } — upserts one row per student per day. */
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const date = parseDay(b.date);
  const classId = str(b.classId);
  const entries: { studentId: string; status: string; remark?: string }[] = Array.isArray(b.entries) ? b.entries : [];
  if (!date || !classId || entries.length === 0) return bad("date, classId and entries are required");
  if (entries.some((e) => !STATUSES.includes(str(e.status).toUpperCase()))) return bad("Invalid attendance status");

  const valid = await prisma.schoolStudent.findMany({
    where: { companyId: ctx.companyId, classId, id: { in: entries.map((e) => e.studentId) } },
    select: { id: true },
  });
  const ok = new Set(valid.map((s) => s.id));
  const rows = entries.filter((e) => ok.has(e.studentId));
  await prisma.$transaction(
    rows.map((e) =>
      prisma.schoolAttendance.upsert({
        where: { studentId_date: { studentId: e.studentId, date } },
        create: { companyId: ctx.companyId, studentId: e.studentId, date, status: str(e.status).toUpperCase(), remark: str(e.remark).slice(0, 200) || null },
        update: { status: str(e.status).toUpperCase(), remark: str(e.remark).slice(0, 200) || null },
      }),
    ),
  );
  return NextResponse.json({ saved: rows.length, ignored: entries.length - rows.length });
}
