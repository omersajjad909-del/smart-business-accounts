import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

/** Teacher data is scoped through the signed-in user's teacher profile. */
export async function GET(req: NextRequest) {
  if (String(req.headers.get("x-user-role") || "").toUpperCase() !== "TEACHER") return NextResponse.json({ error: "Teacher access required" }, { status: 403 });
  const userId = req.headers.get("x-user-id") || "", companyId = await resolveCompanyId(req);
  if (!userId || !companyId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const teacher = await prisma.schoolTeacher.findFirst({ where: { companyId, userId, status: "ACTIVE" }, include: { classSubjects: { include: { class: { select: { name: true, section: true } }, subject: { select: { name: true, code: true } } }, orderBy: { class: { name: "asc" } } }, timetable: { include: { class: { select: { name: true, section: true } }, subject: { select: { name: true } } }, orderBy: [{ day: "asc" }, { periodNo: "asc" }] } } });
  if (!teacher) return NextResponse.json({ error: "No active teacher profile is linked to this account" }, { status: 404 });
  return NextResponse.json(teacher);
}
