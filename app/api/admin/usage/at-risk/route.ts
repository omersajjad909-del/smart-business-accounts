import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const days = Number(new URL(req.url).searchParams.get("days") || 14);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const lastSessions = await prisma.session.groupBy({
      by: ["companyId"],
      _max: { createdAt: true },
    } as any);

    const riskyIds = lastSessions
      .filter((g: any) => g.companyId && (!g._max.createdAt || g._max.createdAt < cutoff))
      .map((g: any) => g.companyId as string);

    const companies = riskyIds.length
      ? await prisma.company.findMany({ where: { id: { in: riskyIds } }, select: { id: true, name: true, plan: true } })
      : [];

    const lastMap = new Map<string, Date | null>();
    for (const g of lastSessions as any[]) {
      if (!g.companyId) continue;
      lastMap.set(g.companyId, g._max?.createdAt || null);
    }
    const rows = companies.map(c => {
      const last = lastMap.get(c.id) || null;
      return {
        id: c.id,
        name: c.name,
        plan: c.plan || "STARTER",
        lastLogin: last,
      };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
