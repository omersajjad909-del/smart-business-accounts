import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.headers.get("x-company-id");
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity") || undefined;
  const action = searchParams.get("action") || undefined;
  const from   = searchParams.get("from");
  const to     = searchParams.get("to");
  const page   = parseInt(searchParams.get("page") || "1");
  const limit  = 50;

  const where: Record<string, unknown> = { companyId };
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to)   (where.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59Z");
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) });
}
