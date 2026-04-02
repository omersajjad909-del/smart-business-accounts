import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const invs = await prisma.salesInvoice.groupBy({
      by: ["companyId"],
      where: { date: { gte: since } },
      _count: { id: true },
      _sum: { total: true },
    } as any);
    const ids = invs.map((g: any) => g.companyId).filter(Boolean) as string[];
    const companies = ids.length
      ? await prisma.company.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, country: true } })
      : [];
    const map = new Map(companies.map(c => [c.id, c]));
    const rows = invs
      .map((g: any) => ({
        id: g.companyId,
        name: map.get(g.companyId)?.name || g.companyId,
        country: map.get(g.companyId)?.country || null,
        invoices: g._count.id || 0,
        amount: Number(g._sum.total || 0),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
