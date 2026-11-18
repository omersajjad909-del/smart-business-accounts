import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, num, schoolGuard, str } from "@/lib/schoolApi";

/** GET ?studentId= → the optional fees (transport, hostel …) this student is enrolled in. */
export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false);
  if (isResponse(ctx)) return ctx;
  const studentId = str(new URL(req.url).searchParams.get("studentId"));
  if (!studentId) return bad("studentId is required");
  const rows = await prisma.schoolStudentFee.findMany({
    where: { companyId: ctx.companyId, studentId },
    include: { head: { select: { name: true, frequency: true } } },
  });
  return NextResponse.json(rows);
}

/** POST { studentId, headId, amount } — enrol (or change the amount). */
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const studentId = str(b.studentId), headId = str(b.headId), amount = num(b.amount, -1);
  if (!studentId || !headId || amount <= 0) return bad("Student, fee and a positive amount are required");
  const [student, head] = await Promise.all([
    prisma.schoolStudent.findFirst({ where: { id: studentId, companyId: ctx.companyId }, select: { id: true } }),
    prisma.schoolFeeHead.findFirst({ where: { id: headId, companyId: ctx.companyId, active: true }, select: { id: true, optional: true } }),
  ]);
  if (!student || !head) return bad("Student or fee not found", 404);
  if (!head.optional) return bad("This fee applies to the whole class — set it under Fee Structure");
  const row = await prisma.schoolStudentFee.upsert({
    where: { studentId_headId: { studentId, headId } },
    create: { companyId: ctx.companyId, studentId, headId, amount },
    update: { amount },
  });
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const id = new URL(req.url).searchParams.get("id") || "";
  const res = await prisma.schoolStudentFee.deleteMany({ where: { id, companyId: ctx.companyId } });
  if (!res.count) return bad("Not found", 404);
  return NextResponse.json({ ok: true });
}
