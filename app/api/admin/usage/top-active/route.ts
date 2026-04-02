import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sessions = await prisma.session.findMany({
      where: { createdAt: { gte: since } },
      select: { companyId: true },
    });
    const companyCounts: Record<string, number> = {};
    for (const s of sessions) {
      if (!s.companyId) continue;
      companyCounts[s.companyId] = (companyCounts[s.companyId] || 0) + 1;
    }
    const ids = Object.keys(companyCounts);
    const companies = ids.length
      ? await prisma.company.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, country: true } })
      : [];
    const info = companies
      .map(c => ({ id: c.id, name: c.name, country: c.country || null, activity: companyCounts[c.id] || 0 }))
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 10);

    return NextResponse.json({ rows: info });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
