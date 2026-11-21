import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";

/** Common subjects of a Pakistani school, offered as a one-click starting point. */
const DEFAULT_SUBJECTS = ["English", "Urdu", "Mathematics", "General Science", "Islamiat", "Social Studies", "Computer Science", "Pakistan Studies", "Physics", "Chemistry", "Biology", "Drawing", "Nazra Quran"];

export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false, "SCHOOL_VIEW");
  if (isResponse(ctx)) return ctx;
  const rows = await prisma.schoolSubject.findMany({
    where: { companyId: ctx.companyId }, orderBy: { name: "asc" },
    include: { _count: { select: { classSubjects: true } } },
  });
  return NextResponse.json(rows.map(({ _count, ...r }) => ({ ...r, classes: _count.classSubjects })));
}

export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_ACADEMICS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  if (str(b.action) === "seed") {
    const res = await prisma.schoolSubject.createMany({ data: DEFAULT_SUBJECTS.map((name) => ({ companyId: ctx.companyId, name })), skipDuplicates: true });
    return NextResponse.json({ created: res.count });
  }
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
  const ctx = await schoolGuard(req, true, "SCHOOL_ACADEMICS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const id = new URL(req.url).searchParams.get("id") || "";
  const res = await prisma.schoolSubject.deleteMany({ where: { id, companyId: ctx.companyId } });
  if (!res.count) return bad("Subject not found", 404);
  return NextResponse.json({ ok: true });
}
