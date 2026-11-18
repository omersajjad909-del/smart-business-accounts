import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";

export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false);
  if (isResponse(ctx)) return ctx;
  const rows = await prisma.schoolSubject.findMany({
    where: { companyId: ctx.companyId }, orderBy: { name: "asc" },
    include: { _count: { select: { classSubjects: true } } },
  });
  return NextResponse.json(rows.map(({ _count, ...r }) => ({ ...r, classes: _count.classSubjects })));
}

export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const name = str(b.name);
  if (!name) return bad("Subject name is required");
  try {
    const row = await prisma.schoolSubject.create({ data: { companyId: ctx.companyId, name, code: str(b.code) || null } });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return bad("This subject already exists", 409);
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const id = new URL(req.url).searchParams.get("id") || "";
  const res = await prisma.schoolSubject.deleteMany({ where: { id, companyId: ctx.companyId } });
  if (!res.count) return bad("Subject not found", 404);
  return NextResponse.json({ ok: true });
}
