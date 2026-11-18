import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";

/**
 * POST { fromClassId, toClassId | "GRADUATE", studentIds? }
 * Moves active students of a class up to the next class, or marks them graduated.
 * Without studentIds every active student of the class moves.
 */
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const fromClassId = str(b.fromClassId), to = str(b.toClassId);
  const ids: string[] | null = Array.isArray(b.studentIds) ? b.studentIds.map(String) : null;
  if (!fromClassId || !to) return bad("Choose the current class and the class to promote into");
  if (fromClassId === to) return bad("Source and target class are the same");

  const where = { companyId: ctx.companyId, classId: fromClassId, status: "ACTIVE", ...(ids ? { id: { in: ids } } : {}) };
  if (to === "GRADUATE") {
    const res = await prisma.schoolStudent.updateMany({ where, data: { status: "GRADUATED" } });
    return NextResponse.json({ moved: res.count, graduated: true });
  }
  if (!(await prisma.schoolClass.findFirst({ where: { id: to, companyId: ctx.companyId }, select: { id: true } }))) return bad("Target class not found", 404);
  const res = await prisma.schoolStudent.updateMany({ where, data: { classId: to } });
  return NextResponse.json({ moved: res.count, graduated: false });
}
