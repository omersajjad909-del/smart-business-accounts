import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || undefined;
    const companyId = searchParams.get("companyId") || undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const country = searchParams.get("country") || undefined;
    const q = searchParams.get("q") || "";

    const where: any = {};
    if (action) where.action = action;
    if (companyId) where.companyId = companyId;
    if (from || to) where.createdAt = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const filtered = logs.filter((l: any) => {
      if (!q) return true;
      const blob = JSON.stringify(l || {});
      return blob.toLowerCase().includes(q.toLowerCase());
    });

    return NextResponse.json({ rows: filtered });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
