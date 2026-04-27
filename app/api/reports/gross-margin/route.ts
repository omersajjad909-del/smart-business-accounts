import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function periodRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  if (period === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) };
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return { start: new Date(now.getFullYear(), q * 3, 1), end: new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59) };
  }
  return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59) };
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const period = req.nextUrl.searchParams.get("period") || "year";
    const view = req.nextUrl.searchParams.get("view") || "month";
    const { start, end } = periodRange(period);

    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: start, lte: end } },
      include: { items: { include: { item: { select: { purchaseRate: true } } } } },
    });

    if (view === "month") {
      const monthMap = new Map<string, { revenue: number; cogs: number }>();

      for (const inv of invoices) {
        const key = `${inv.date.getFullYear()}-${String(inv.date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap.has(key)) monthMap.set(key, { revenue: 0, cogs: 0 });
        const rec = monthMap.get(key)!;
        rec.revenue += inv.total;
        for (const it of inv.items) rec.cogs += it.qty * (it.item.purchaseRate || 0);
      }

      const rows = [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, r]) => {
          const grossProfit = r.revenue - r.cogs;
          const marginPct = r.revenue > 0 ? (grossProfit / r.revenue) * 100 : 0;
          return { name, revenue: r.revenue, cogs: r.cogs, grossProfit, marginPct };
        });

      return NextResponse.json({ rows });
    }

    // By category
    const catMap = new Map<string, { revenue: number; cogs: number }>();
    for (const inv of invoices) {
      for (const it of inv.items) {
        const key = (it.item as any).category || "TRADING";
        if (!catMap.has(key)) catMap.set(key, { revenue: 0, cogs: 0 });
        const rec = catMap.get(key)!;
        rec.revenue += it.amount;
        rec.cogs += it.qty * (it.item.purchaseRate || 0);
      }
    }

    const rows = [...catMap.entries()]
      .map(([name, r]) => {
        const grossProfit = r.revenue - r.cogs;
        const marginPct = r.revenue > 0 ? (grossProfit / r.revenue) * 100 : 0;
        return { name, revenue: r.revenue, cogs: r.cogs, grossProfit, marginPct };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("GROSS MARGIN ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
