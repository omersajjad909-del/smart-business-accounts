import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, num, schoolGuard, str } from "@/lib/schoolApi";

export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false);
  if (isResponse(ctx)) return ctx;
  const classes = await prisma.schoolClass.findMany({
    where: { companyId: ctx.companyId },
    orderBy: [{ name: "asc" }, { section: "asc" }],
    include: { _count: { select: { students: { where: { status: "ACTIVE" } } } } },
  });
  return NextResponse.json(classes.map(({ _count, ...c }) => ({ ...c, activeStudents: _count.students })));
}

export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const name = str(b.name);
  if (!name) return bad("Class name is required");
  const monthlyFee = num(b.monthlyFee);
  if (monthlyFee < 0) return bad("Monthly fee cannot be negative");
  try {
    const row = await prisma.schoolClass.create({
      data: { companyId: ctx.companyId, name, section: str(b.section), monthlyFee },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return bad("This class and section already exists", 409);
    throw e;
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const id = str(b.id);
  if (!id) return bad("id is required");
  const monthlyFee = num(b.monthlyFee, -1);
  if (monthlyFee < 0) return bad("Valid monthly fee required");
  const res = await prisma.schoolClass.updateMany({ where: { id, companyId: ctx.companyId }, data: { monthlyFee } });
  if (!res.count) return bad("Class not found", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const id = new URL(req.url).searchParams.get("id") || "";
  const inUse = await prisma.schoolStudent.count({ where: { companyId: ctx.companyId, classId: id } });
  if (inUse > 0) return bad("Move or remove the students in this class first", 409);
  const res = await prisma.schoolClass.deleteMany({ where: { id, companyId: ctx.companyId } });
  if (!res.count) return bad("Class not found", 404);
  return NextResponse.json({ ok: true });
}
