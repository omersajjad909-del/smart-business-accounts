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
    const { start, end } = periodRange(period);

    const soldItems = await prisma.salesInvoiceItem.findMany({
      where: {
        invoice: { companyId, deletedAt: null, date: { gte: start, lte: end } },
      },
      include: {
        item: { select: { id: true, name: true, category: true, purchaseRate: true } },
      },
    });

    const map = new Map<string, { name: string; category: string; qtySold: number; totalCost: number; revenue: number }>();

    for (const it of soldItems) {
      const key = it.itemId;
      if (!map.has(key)) map.set(key, { name: it.item.name, category: it.item.category, qtySold: 0, totalCost: 0, revenue: 0 });
      const rec = map.get(key)!;
      rec.qtySold += it.qty;
      rec.totalCost += it.qty * (it.item.purchaseRate || 0);
      rec.revenue += it.amount;
    }

    const rows = [...map.values()]
      .map((r) => {
        const costPerUnit = r.qtySold > 0 ? r.totalCost / r.qtySold : 0;
        const grossProfit = r.revenue - r.totalCost;
        const grossMarginPct = r.revenue > 0 ? (grossProfit / r.revenue) * 100 : 0;
        return { itemName: r.name, category: r.category, qtySold: r.qtySold, costPerUnit, totalCost: r.totalCost, revenue: r.revenue, grossProfit, grossMarginPct };
      })
      .sort((a, b) => b.totalCost - a.totalCost);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("COGS ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
