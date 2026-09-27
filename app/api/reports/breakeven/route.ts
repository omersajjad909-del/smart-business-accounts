import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { computeProfitLoss } from "@/lib/profitLoss";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Money from the P&L (lib/profitLoss.ts), so this agrees with it: revenue
    // net of tax, variable cost = cost of sales, fixed cost = operating and
    // finance expenses. It used to take revenue with GST in it and "fixed
    // costs" from expense vouchers alone, which left out salaries, rent paid by
    // journal and everything else not keyed as an expense voucher.
    const [pl, invoices] = await Promise.all([
      computeProfitLoss({ companyId, fromDate: start, toDate: end }),
      prisma.salesInvoice.findMany({
        where: { companyId, deletedAt: null, date: { gte: start, lte: end } },
        select: { items: { select: { qty: true } } },
      }),
    ]);

    const totalRevenue = pl.netSales;
    const totalCogs = pl.cogs;
    const totalUnits = invoices.reduce((s, inv) => s + inv.items.reduce((t, it) => t + Number(it.qty || 0), 0), 0);
    const fixedCosts = pl.totalOpEx + pl.totalFinanceExpenses;
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
