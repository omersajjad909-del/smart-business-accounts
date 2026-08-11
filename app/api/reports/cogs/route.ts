import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { getAverageCosts } from "@/lib/manufacturingPosting";

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

    // Cost basis is the same weighted average the ledger posts at.
    //
    // This used to multiply by `item.purchaseRate`. For anything manufactured
    // that number is 0 — a PVC bag is never bought, it is made — so the report
    // showed zero cost and 100% gross margin on exactly the products whose cost
    // matters most. Purchase rate is now only the fallback for items with no
    // costed movements at all.
    const itemIds = [...new Set(soldItems.map((it) => it.itemId).filter(Boolean) as string[])];
    const avgCosts = await getAverageCosts(prisma, companyId, itemIds);

    const map = new Map<string, { name: string; category: string; qtySold: number; totalCost: number; revenue: number }>();

    for (const it of soldItems) {
      const key = it.itemId;
      if (!map.has(key)) map.set(key, { name: it.item.name, category: it.item.category, qtySold: 0, totalCost: 0, revenue: 0 });
      const rec = map.get(key)!;
      const unitCost = avgCosts.get(key) ?? it.item.purchaseRate ?? 0;
      rec.qtySold += it.qty;
      rec.totalCost += it.qty * unitCost;
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
  } catch (e: unknown) {
    console.error("COGS ERROR:", e);
    return NextResponse.json({ error: "Failed to build COGS report" }, { status: 500 });
  }
}
