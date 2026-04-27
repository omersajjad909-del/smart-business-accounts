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

    const period = req.nextUrl.searchParams.get("period") || "month";
    const view = req.nextUrl.searchParams.get("view") || "customer";
    const { start, end } = periodRange(period);

    const returns = await prisma.saleReturn.findMany({
      where: { companyId, date: { gte: start, lte: end } },
      include: {
        customer: { select: { id: true, name: true } },
        items: { include: { item: { select: { name: true } } } },
      },
    });

    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: start, lte: end } },
      select: { customerId: true, total: true },
    });

    const salesByCustomer = new Map<string, number>();
    for (const inv of invoices) {
      salesByCustomer.set(inv.customerId, (salesByCustomer.get(inv.customerId) || 0) + inv.total);
    }

    const map = new Map<string, { name: string; returnCount: number; returnValue: number }>();

    for (const ret of returns) {
      const key = view === "item"
        ? (ret.items[0]?.item?.name || "Unknown")
        : ret.customerId;
      const label = view === "item"
        ? (ret.items[0]?.item?.name || "Unknown")
        : (ret.customer?.name || "Unknown");

      if (!map.has(key)) map.set(key, { name: label, returnCount: 0, returnValue: 0 });
      const rec = map.get(key)!;
      rec.returnCount += 1;
      rec.returnValue += ret.total;
    }

    const rows = [...map.entries()]
      .map(([key, r]) => {
        const salesValue = view === "customer" ? (salesByCustomer.get(key) || 0) : 0;
        const returnRatePct = salesValue > 0 ? (r.returnValue / salesValue) * 100 : 0;
        return { name: r.name, returnCount: r.returnCount, returnValue: r.returnValue, salesValue, returnRatePct, topReason: "Quality Issue" };
      })
      .sort((a, b) => b.returnValue - a.returnValue);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("RETURNS ANALYSIS ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
