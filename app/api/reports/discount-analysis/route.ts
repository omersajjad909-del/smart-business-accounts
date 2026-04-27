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
    const view = req.nextUrl.searchParams.get("view") || "item";
    const { start, end } = periodRange(period);

    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: start, lte: end } },
      include: {
        customer: { select: { id: true, name: true } },
        items: { include: { item: { select: { id: true, name: true, rate: true } } } },
      },
    });

    const map = new Map<string, { name: string; grossSales: number; invoiceCount: number }>();

    for (const inv of invoices) {
      const key = view === "customer" ? inv.customerId : "all";
      const label = view === "customer" ? (inv.customer?.name || "Unknown") : "All Items";

      if (!map.has(key)) map.set(key, { name: label, grossSales: 0, invoiceCount: 0 });
      const rec = map.get(key)!;
      rec.invoiceCount += 1;

      for (const it of inv.items) {
        const grossRate = it.item.rate || it.rate;
        const grossAmt = it.qty * grossRate;
        const actualAmt = it.amount;
        rec.grossSales += grossAmt;
      }
    }

    // Build item-level discount rows
    const itemMap = new Map<string, { name: string; grossSales: number; discountAmount: number; invoiceCount: number }>();

    for (const inv of invoices) {
      for (const it of inv.items) {
        const key = view === "item" ? it.itemId : (view === "customer" ? inv.customerId : it.itemId);
        const label = view === "item" ? (it.item?.name || "Unknown") : (view === "customer" ? (inv.customer?.name || "Unknown") : (it.item?.name || "Unknown"));

        if (!itemMap.has(key)) itemMap.set(key, { name: label, grossSales: 0, discountAmount: 0, invoiceCount: 0 });
        const rec = itemMap.get(key)!;
        const listPrice = it.item.rate || it.rate;
        const gross = it.qty * listPrice;
        const actual = it.amount;
        rec.grossSales += gross;
        rec.discountAmount += Math.max(0, gross - actual);
        rec.invoiceCount += 1;
      }
    }

    const rows = [...itemMap.entries()]
      .map(([, r]) => {
        const discountPct = r.grossSales > 0 ? (r.discountAmount / r.grossSales) * 100 : 0;
        const netSales = r.grossSales - r.discountAmount;
        return { name: r.name, grossSales: r.grossSales, discountAmount: r.discountAmount, discountPct, netSales, invoiceCount: r.invoiceCount };
      })
      .sort((a, b) => b.discountAmount - a.discountAmount);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("DISCOUNT ANALYSIS ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
