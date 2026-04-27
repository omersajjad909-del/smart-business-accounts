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
  // year
  return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59) };
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const period = req.nextUrl.searchParams.get("period") || "year";
    const { start, end } = periodRange(period);

    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: start, lte: end } },
      include: {
        customer: { select: { id: true, name: true } },
        items: { include: { item: { select: { purchaseRate: true } } } },
      },
    });

    const map = new Map<string, { name: string; revenue: number; cogs: number; orders: Set<string> }>();

    for (const inv of invoices) {
      const cid = inv.customer.id;
      if (!map.has(cid)) map.set(cid, { name: inv.customer.name, revenue: 0, cogs: 0, orders: new Set() });
      const rec = map.get(cid)!;
      rec.orders.add(inv.id);
      for (const it of inv.items) {
        rec.revenue += it.amount;
        rec.cogs    += it.qty * (it.item.purchaseRate || 0);
      }
    }

    const rows = [...map.entries()]
      .map(([id, r]) => {
        const gp     = r.revenue - r.cogs;
        const margin = r.revenue > 0 ? (gp / r.revenue) * 100 : 0;
        const orders = r.orders.size;
        const avgOrder = orders > 0 ? r.revenue / orders : 0;
        const segment = r.revenue > 500000 ? "High Value" : r.revenue > 100000 ? "Mid Value" : "Low Value";
        return { id, customer: r.name, revenue: r.revenue, cogs: r.cogs, grossProfit: gp, marginPct: margin, orders, avgOrder, segment };
      })
      .sort((a, b) => b.grossProfit - a.grossProfit);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("CUSTOMER PROFITABILITY ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
