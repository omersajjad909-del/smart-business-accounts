import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, num, parseDay, schoolGuard, str } from "@/lib/schoolApi";

/** GET → exams list; GET ?examId= → students of the exam's class with marks. */
export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false);
  if (isResponse(ctx)) return ctx;
  const examId = str(new URL(req.url).searchParams.get("examId"));

  if (!examId) {
    const exams = await prisma.schoolExam.findMany({
      where: { companyId: ctx.companyId },
      orderBy: [{ createdAt: "desc" }],
      include: { class: { select: { name: true, section: true } }, _count: { select: { results: true } } },
    });
    return NextResponse.json(exams.map(({ _count, ...e }) => ({ ...e, resultsEntered: _count.results })));
  }

  const exam = await prisma.schoolExam.findFirst({ where: { id: examId, companyId: ctx.companyId } });
  if (!exam) return bad("Exam not found", 404);
  const students = await prisma.schoolStudent.findMany({
    where: { companyId: ctx.companyId, classId: exam.classId, status: "ACTIVE" },
    orderBy: { admissionNo: "asc" },
    select: { id: true, name: true, admissionNo: true, results: { where: { examId }, select: { marks: true } } },
  });
  const rows = students.map(({ results, ...s }) => {
    const marks = results[0]?.marks ?? null;
    return { ...s, marks, passed: marks === null ? null : marks >= exam.passMarks, percent: marks === null ? null : Math.round((marks / exam.totalMarks) * 1000) / 10 };
  });
  const entered = rows.filter((r) => r.marks !== null);
  return NextResponse.json({
    exam, rows,
    summary: { entered: entered.length, total: rows.length, passed: entered.filter((r) => r.passed).length, passRate: entered.length ? Math.round((entered.filter((r) => r.passed).length / entered.length) * 1000) / 10 : 0 },
  });
}

export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));

  if (str(b.action) === "exam") {
    const classId = str(b.classId), name = str(b.name), subject = str(b.subject);
    const totalMarks = num(b.totalMarks, 100), passMarks = num(b.passMarks, 33);
    if (!classId || !name || !subject) return bad("Class, exam name and subject are required");
    if (totalMarks <= 0 || passMarks < 0 || passMarks > totalMarks) return bad("Check total and pass marks");
    if (!(await prisma.schoolClass.findFirst({ where: { id: classId, companyId: ctx.companyId }, select: { id: true } }))) return bad("Class not found", 404);
    try {
      const row = await prisma.schoolExam.create({ data: { companyId: ctx.companyId, classId, name, subject, totalMarks, passMarks, date: parseDay(b.date) } });
      return NextResponse.json(row, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") return bad("This exam and subject already exists for the class", 409);
      throw e;
    }
  }

  if (str(b.action) === "marks") {
    const examId = str(b.examId);
    const entries: { studentId: string; marks: number | null }[] = Array.isArray(b.entries) ? b.entries : [];
    const exam = await prisma.schoolExam.findFirst({ where: { id: examId, companyId: ctx.companyId } });
    if (!exam) return bad("Exam not found", 404);
    const valid = await prisma.schoolStudent.findMany({ where: { companyId: ctx.companyId, classId: exam.classId, id: { in: entries.map((e) => e.studentId) } }, select: { id: true } });
    const ok = new Set(valid.map((s) => s.id));
    const rows = entries.filter((e) => ok.has(e.studentId) && e.marks !== null && e.marks !== undefined && String(e.marks) !== "");
    if (rows.some((e) => num(e.marks, -1) < 0 || num(e.marks, -1) > exam.totalMarks)) return bad(`Marks must be between 0 and ${exam.totalMarks}`);
    await prisma.$transaction(
      rows.map((e) =>
        prisma.schoolResult.upsert({
          where: { examId_studentId: { examId, studentId: e.studentId } },
          create: { companyId: ctx.companyId, examId, studentId: e.studentId, marks: num(e.marks) },
          update: { marks: num(e.marks) },
        }),
      ),
    );
    return NextResponse.json({ saved: rows.length });
  }
  return bad("Unknown action");
}
