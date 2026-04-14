/**
 * GET /api/reports/budget-vs-actual
 * Compares Budget table amounts vs actual ExpenseVoucherItem spend
 * Query params: period (month|quarter|year), costCenterId (optional)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getPeriodMeta(period: string): { year: number; months: number[] | null; start: Date; end: Date } {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth(); // 0-indexed

  if (period === "year") {
    return { year: y, months: null, start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
  if (period === "quarter") {
    const q     = Math.floor(m / 3);
    const qMonths = [q * 3 + 1, q * 3 + 2, q * 3 + 3]; // 1-indexed
    return { year: y, months: qMonths, start: new Date(y, q * 3, 1), end: new Date(y, q * 3 + 3, 1) };
  }
  // month
  return { year: y, months: [m + 1], start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
}

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ rows: [], summary: { totalBudget: 0, totalActual: 0, variance: 0 } });

    const { searchParams } = new URL(req.url);
    const period       = searchParams.get("period")       || "month";
    const costCenterId = searchParams.get("costCenterId") || null;

    const { year, months, start, end } = getPeriodMeta(period);

    // 1. Fetch budgets for the period
    const budgets = await prisma.budget.findMany({
      where: {
        companyId,
        year,
        ...(months ? { month: { in: months } } : {}),
      },
      select: { category: true, amount: true },
    });

    // Aggregate budgets by category
    const budgetMap: Record<string, number> = {};
    for (const b of budgets) {
      const cat = b.category || "Uncategorized";
      budgetMap[cat] = (budgetMap[cat] ?? 0) + b.amount;
    }

    // 2. Fetch actual expenses for the period
    const actualItems = await prisma.expenseVoucherItem.findMany({
      where: {
        expenseVoucher: {
          companyId,
          date: { gte: start, lt: end },
          deletedAt: null,
          ...(costCenterId ? { costCenterId } : {}),
        },
      },
      select: { category: true, amount: true },
    });

    // Aggregate actuals by category
    const actualMap: Record<string, number> = {};
    for (const item of actualItems) {
      const cat = item.category || "Uncategorized";
      actualMap[cat] = (actualMap[cat] ?? 0) + item.amount;
    }

    // 3. Merge: all categories that appear in either budget or actual
    const allCats = Array.from(new Set([...Object.keys(budgetMap), ...Object.keys(actualMap)]));

    const rows = allCats.map(cat => {
      const budgeted    = budgetMap[cat]  ?? 0;
      const actual      = actualMap[cat]  ?? 0;
      const variance    = actual - budgeted;
      const variancePct = budgeted > 0 ? (variance / budgeted) * 100 : (actual > 0 ? 100 : 0);
      return { category: cat, budgeted, actual, variance, variancePct };
    }).sort((a, b) => b.budgeted - a.budgeted || b.actual - a.actual);

    const totalBudget = rows.reduce((s, r) => s + r.budgeted, 0);
    const totalActual = rows.reduce((s, r) => s + r.actual, 0);
    const variance    = totalActual - totalBudget;

    return NextResponse.json({ rows, summary: { totalBudget, totalActual, variance } });
  } catch (e: any) {
    console.error("budget-vs-actual error:", e.message);
    return NextResponse.json({ rows: [], summary: { totalBudget: 0, totalActual: 0, variance: 0 } }, { status: 500 });
  }
}
