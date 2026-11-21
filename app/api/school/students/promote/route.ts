import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, invoiceTotals, isResponse, schoolGuard, str } from "@/lib/schoolApi";

/** GET ?classId= → active students of the class with their unpaid fee balance, so the review step can warn about it. */
export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false, "SCHOOL_VIEW");
  if (isResponse(ctx)) return ctx;
  const classId = str(new URL(req.url).searchParams.get("classId"));
  if (!classId) return bad("classId is required");
  const rows = await prisma.schoolStudent.findMany({
    where: { companyId: ctx.companyId, classId, status: "ACTIVE" },
    orderBy: { admissionNo: "asc" },
    select: { id: true, admissionNo: true, name: true, photoUrl: true, invoices: { select: { amount: true, discount: true, lateFee: true, payments: { select: { amount: true } } } } },
  });
  return NextResponse.json(rows.map(({ invoices, ...s }) => ({ ...s, balance: invoices.reduce((sum, i) => sum + invoiceTotals(i).balance, 0) })));
}

/** Class number from a name like "Class 9" / "Grade 10"; null for Nursery, Prep and so on. */
const gradeNo = (name: string) => { const m = /(\d+)/.exec(name); return m ? Number(m[1]) : null; };

/**
 * POST { fromClassId, moves: [{ studentId, toClassId | "GRADUATE" | "STAY", reason? }] }
 *
 * Each student gets their own destination, so one child can be moved two classes up
 * (Class 6 → Class 8 for outstanding progress) while the rest of the class goes to Class 7.
 * "STAY" leaves a student where they are. Every change is written to the promotion history.
 *
 * The old shape { fromClassId, toClassId, studentIds? } still works: everyone goes to one place.
 */
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_STUDENTS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const fromClassId = str(b.fromClassId);
  if (!fromClassId) return bad("Choose the class to promote");

  let moves: { studentId: string; to: string; reason: string }[];
  if (Array.isArray(b.moves)) {
    moves = b.moves.map((m: Record<string, unknown>) => ({ studentId: str(m.studentId), to: str(m.toClassId), reason: str(m.reason) }));
  } else {
    const to = str(b.toClassId);
    if (!to) return bad("Choose the class to promote into");
    const ids: string[] | null = Array.isArray(b.studentIds) ? b.studentIds.map(String) : null;
    const all = await prisma.schoolStudent.findMany({ where: { companyId: ctx.companyId, classId: fromClassId, status: "ACTIVE", ...(ids ? { id: { in: ids } } : {}) }, select: { id: true } });
    moves = all.map((s) => ({ studentId: s.id, to, reason: "" }));
  }
  moves = moves.filter((m) => m.studentId && m.to && m.to !== "STAY");
  if (moves.length === 0) return NextResponse.json({ moved: 0, graduated: 0, skipped: 0 });

  const [from, students, targets] = await Promise.all([
    prisma.schoolClass.findFirst({ where: { id: fromClassId, companyId: ctx.companyId }, select: { name: true, section: true } }),
    prisma.schoolStudent.findMany({ where: { companyId: ctx.companyId, classId: fromClassId, status: "ACTIVE", id: { in: moves.map((m) => m.studentId) } }, select: { id: true } }),
    prisma.schoolClass.findMany({ where: { companyId: ctx.companyId }, select: { id: true, name: true, section: true } }),
  ]);
  if (!from) return bad("Class not found", 404);
  const valid = new Set(students.map((s) => s.id));
  const label = (c: { name: string; section: string }) => (c.section ? `${c.name} - ${c.section}` : c.name);
  const classById = new Map(targets.map((c) => [c.id, c]));

  const logs: { companyId: string; studentId: string; fromClass: string; toClass: string; kind: string; reason: string | null }[] = [];
  const byTarget = new Map<string, string[]>(); // classId | "GRADUATE" → student ids
  for (const m of moves) {
    if (!valid.has(m.studentId)) continue;
    if (m.to === "GRADUATE") {
      logs.push({ companyId: ctx.companyId, studentId: m.studentId, fromClass: label(from), toClass: "Graduated", kind: "GRADUATED", reason: m.reason || null });
    } else {
      const target = classById.get(m.to);
      if (!target) return bad("A target class was not found", 404);
      if (m.to === fromClassId) continue;
      const a = gradeNo(from.name), z = gradeNo(target.name);
      const kind = a !== null && z !== null && z - a >= 2 ? "SKIPPED" : "PROMOTED";
      logs.push({ companyId: ctx.companyId, studentId: m.studentId, fromClass: label(from), toClass: label(target), kind, reason: m.reason || null });
    }
    byTarget.set(m.to, [...(byTarget.get(m.to) ?? []), m.studentId]);
  }

  await prisma.$transaction([
    ...[...byTarget.entries()].map(([to, ids]) =>
      to === "GRADUATE"
        ? prisma.schoolStudent.updateMany({ where: { companyId: ctx.companyId, id: { in: ids } }, data: { status: "GRADUATED" } })
        : prisma.schoolStudent.updateMany({ where: { companyId: ctx.companyId, id: { in: ids } }, data: { classId: to } }),
    ),
    prisma.schoolPromotionLog.createMany({ data: logs }),
  ]);
  return NextResponse.json({
    moved: logs.filter((l) => l.kind !== "GRADUATED").length,
    graduated: logs.filter((l) => l.kind === "GRADUATED").length,
    skipped: logs.filter((l) => l.kind === "SKIPPED").length,
  });
}
