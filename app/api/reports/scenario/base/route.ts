import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [invoices, expenses] = await Promise.all([
      prisma.salesInvoice.findMany({
        where: { companyId, deletedAt: null, date: { gte: start, lte: end } },
        include: { items: { include: { item: { select: { purchaseRate: true } } } } },
      }),
      prisma.expenseVoucher.findMany({
        where: { companyId, deletedAt: null, date: { gte: start, lte: end } },
        select: { totalAmount: true },
      }),
    ]);

    let revenue = 0;
    let cogs = 0;
    for (const inv of invoices) {
      revenue += inv.total;
      for (const it of inv.items) cogs += it.qty * (it.item.purchaseRate || 0);
    }

    const expenses_total = expenses.reduce((s, e) => s + e.totalAmount, 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses_total;
    const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return NextResponse.json({
      base: {
        revenue,
        cogs,
        expenses: expenses_total,
        netProfit,
        marginPct,
      },
    });
  } catch (e: any) {
    console.error("SCENARIO BASE ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
