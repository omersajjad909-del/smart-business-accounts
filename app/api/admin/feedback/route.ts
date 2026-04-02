/**
 * GET  /api/admin/feedback  — list all feedback with filters
 * POST /api/admin/feedback  — update status/priority/adminNote
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

const db = prisma as any;

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try {
    const p = verifyJwt(getTokenFromRequest(req as any)!);
    return String((p as any)?.role || "").toUpperCase() === "ADMIN";
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type   = searchParams.get("type");
  const page   = Math.max(1, Number(searchParams.get("page") || 1));
  const limit  = 25;

  const where: any = {};
  if (status) where.status = status;
  if (type)   where.type   = type;

  const [items, total] = await Promise.all([
    db.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.feedback.count({ where }),
  ]);

  // stats
  const stats = await db.feedback.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const byType = await db.feedback.groupBy({
    by: ["type"],
    _count: { id: true },
  });

  return NextResponse.json({ items, total, page, stats, byType });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, status, priority, adminNote } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: any = {};
  if (status)    { data.status = status; if (status === "resolved") data.resolvedAt = new Date(); }
  if (priority)  data.priority  = priority;
  if (adminNote !== undefined) data.adminNote = adminNote;

  const updated = await db.feedback.update({ where: { id }, data });
  return NextResponse.json({ success: true, feedback: updated });
}
