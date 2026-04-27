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
    const { start, end } = periodRange(period);

    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: start, lte: end }, salesmanId: { not: null } },
      include: {
        salesman: { select: { id: true, name: true } },
        items: { include: { item: { select: { purchaseRate: true } } } },
        customer: { select: { id: true } },
      },
    });

    const map = new Map<string, { name: string; totalSales: number; cogs: number; invoices: Set<string>; customers: Set<string> }>();

    for (const inv of invoices) {
      if (!inv.salesman) continue;
      const sid = inv.salesman.id;
      if (!map.has(sid)) map.set(sid, { name: inv.salesman.name, totalSales: 0, cogs: 0, invoices: new Set(), customers: new Set() });
      const rec = map.get(sid)!;
      rec.invoices.add(inv.id);
      rec.customers.add(inv.customer.id);
      for (const it of inv.items) {
        rec.totalSales += it.amount;
        rec.cogs       += it.qty * (it.item.purchaseRate || 0);
      }
    }

    const rows = [...map.entries()]
      .map(([id, r]) => {
        const profit  = r.totalSales - r.cogs;
        const margin  = r.totalSales > 0 ? (profit / r.totalSales) * 100 : 0;
        const invoices = r.invoices.size;
        const newCustomers = r.customers.size;
        return { id, salesman: r.name, totalSales: r.totalSales, profit, margin, invoices, newCustomers, target: 0, achievement: 0 };
      })
      .sort((a, b) => b.totalSales - a.totalSales);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("SALESMAN PERFORMANCE ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
