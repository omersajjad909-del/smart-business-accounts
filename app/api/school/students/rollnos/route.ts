import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";

/**
 * POST { classId, order: "name" | "admission" } — gives every active student of the class a roll number 1…n.
 * Schools do this at the start of a session, usually alphabetically. Existing roll numbers in that class are replaced.
 */
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_STUDENTS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const classId = str(b.classId);
  if (!classId) return bad("Choose a class");
  const order = str(b.order) === "admission" ? "admission" : "name";
  const students = await prisma.schoolStudent.findMany({
    where: { companyId: ctx.companyId, classId, status: "ACTIVE" },
    orderBy: order === "name" ? [{ name: "asc" }, { admissionNo: "asc" }] : [{ admissionNo: "asc" }],
    select: { id: true },
  });
  if (students.length === 0) return bad("This class has no active students", 404);
  await prisma.$transaction(students.map((s, i) => prisma.schoolStudent.update({ where: { id: s.id }, data: { rollNo: String(i + 1) } })));
  return NextResponse.json({ assigned: students.length, order });
}
