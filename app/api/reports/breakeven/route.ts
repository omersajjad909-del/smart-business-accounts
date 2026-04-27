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

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalUnits = 0;

    for (const inv of invoices) {
      totalRevenue += inv.total;
      for (const it of inv.items) {
        totalCogs += it.qty * (it.item.purchaseRate || 0);
        totalUnits += it.qty;
      }
    }

    const fixedCosts = expenses.reduce((s, e) => s + e.totalAmount, 0);
    const avgSellingPrice = totalUnits > 0 ? totalRevenue / totalUnits : 0;
    const variableCostPerUnit = totalUnits > 0 ? totalCogs / totalUnits : 0;
    const contributionMargin = avgSellingPrice - variableCostPerUnit;
    const breakevenUnits = contributionMargin > 0 ? Math.ceil(fixedCosts / contributionMargin) : 0;
    const breakevenRevenue = breakevenUnits * avgSellingPrice;
    const marginOfSafety = totalRevenue > 0 ? ((totalRevenue - breakevenRevenue) / totalRevenue) * 100 : 0;

    return NextResponse.json({
      breakevenUnits,
      breakevenRevenue,
      marginOfSafety,
      fixedCosts,
      variableCostPerUnit,
      avgSellingPrice,
      totalRevenue,
      totalUnits,
    });
  } catch (e: any) {
    console.error("BREAKEVEN ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
