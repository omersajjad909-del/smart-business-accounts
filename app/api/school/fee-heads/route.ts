import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, num, schoolGuard, str } from "@/lib/schoolApi";

const FREQUENCIES = ["MONTHLY", "TERM", "ANNUAL", "ONE_TIME"];

/** Common Pakistani school fee types, offered as a one-click starting point. */
const DEFAULT_HEADS: { name: string; frequency: string; optional?: boolean }[] = [
  { name: "Tuition Fee", frequency: "MONTHLY" },
  { name: "Admission Fee", frequency: "ONE_TIME" },
  { name: "Annual Charges", frequency: "ANNUAL" },
  { name: "Exam Fee", frequency: "TERM" },
  { name: "Computer / Lab Fee", frequency: "MONTHLY" },
  { name: "Library Fee", frequency: "ANNUAL" },
  { name: "Sports Fee", frequency: "ANNUAL" },
  { name: "Transport Fee", frequency: "MONTHLY", optional: true },
  { name: "Hostel Fee", frequency: "MONTHLY", optional: true },
  { name: "Uniform & Books", frequency: "ONE_TIME", optional: true },
];

/** GET → fee heads plus the class × head amount grid. */
export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false);
  if (isResponse(ctx)) return ctx;
  const [heads, classFees] = await Promise.all([
    prisma.schoolFeeHead.findMany({ where: { companyId: ctx.companyId }, orderBy: [{ createdAt: "asc" }] }),
    prisma.schoolClassFee.findMany({ where: { companyId: ctx.companyId }, select: { classId: true, headId: true, amount: true } }),
  ]);
  return NextResponse.json({ heads, classFees });
}

export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const action = str(b.action);

  if (action === "seed") {
    const res = await prisma.schoolFeeHead.createMany({
      data: DEFAULT_HEADS.map((h) => ({ companyId: ctx.companyId, name: h.name, frequency: h.frequency, optional: h.optional ?? false })),
      skipDuplicates: true,
    });
    return NextResponse.json({ created: res.count });
  }

  if (action === "create") {
    const name = str(b.name), frequency = str(b.frequency).toUpperCase() || "MONTHLY";
    if (!name) return bad("Fee name is required");
    if (!FREQUENCIES.includes(frequency)) return bad("Invalid frequency");
    try {
      const row = await prisma.schoolFeeHead.create({
        data: { companyId: ctx.companyId, name, frequency, optional: b.optional === true, defaultAmount: Math.max(0, num(b.defaultAmount)) },
      });
      return NextResponse.json(row, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") return bad("A fee with this name already exists", 409);
      throw e;
    }
  }

  // Set (or clear, with amount 0) what a class pays for a head.
  if (action === "set_class_fee") {
    const classId = str(b.classId), headId = str(b.headId), amount = num(b.amount, -1);
    if (!classId || !headId || amount < 0) return bad("Class, fee and a valid amount are required");
    const [cls, head] = await Promise.all([
      prisma.schoolClass.findFirst({ where: { id: classId, companyId: ctx.companyId }, select: { id: true } }),
      prisma.schoolFeeHead.findFirst({ where: { id: headId, companyId: ctx.companyId }, select: { id: true, optional: true } }),
    ]);
    if (!cls || !head) return bad("Class or fee not found", 404);
    if (head.optional) return bad("Optional fees are set per student, not per class");
    if (amount === 0) {
      await prisma.schoolClassFee.deleteMany({ where: { classId, headId, companyId: ctx.companyId } });
      return NextResponse.json({ cleared: true });
    }
    await prisma.schoolClassFee.upsert({
      where: { classId_headId: { classId, headId } },
      create: { companyId: ctx.companyId, classId, headId, amount },
      update: { amount },
    });
    return NextResponse.json({ ok: true });
  }

  return bad("Unknown action");
}

export async function PATCH(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const id = str(b.id);
  if (!id) return bad("id is required");
  const data: Record<string, unknown> = {};
  if (b.active !== undefined) data.active = b.active === true;
  if (b.defaultAmount !== undefined) data.defaultAmount = Math.max(0, num(b.defaultAmount));
  const res = await prisma.schoolFeeHead.updateMany({ where: { id, companyId: ctx.companyId }, data });
  if (!res.count) return bad("Fee not found", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const id = new URL(req.url).searchParams.get("id") || "";
  const res = await prisma.schoolFeeHead.deleteMany({ where: { id, companyId: ctx.companyId } });
  if (!res.count) return bad("Fee not found", 404);
  return NextResponse.json({ ok: true });
}
