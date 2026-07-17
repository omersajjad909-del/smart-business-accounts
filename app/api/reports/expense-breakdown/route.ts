/**
 * GET /api/reports/expense-breakdown
 * Groups expense voucher items by category | costCenter
 * Query params: period (month|quarter|year), groupBy (category|costCenter)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getPeriodRange(period: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = now.getMonth(); // 0-indexed

  let start: Date, end: Date, prevStart: Date, prevEnd: Date;

  if (period === "year") {
    start     = new Date(y, 0, 1);
    end       = new Date(y + 1, 0, 1);
    prevStart = new Date(y - 1, 0, 1);
    prevEnd   = new Date(y, 0, 1);
  } else if (period === "quarter") {
    const q   = Math.floor(m / 3);
    start     = new Date(y, q * 3, 1);
    end       = new Date(y, q * 3 + 3, 1);
    prevStart = new Date(y, (q - 1) * 3, 1);
    prevEnd   = new Date(y, q * 3, 1);
  } else {
    // month (default)
    start     = new Date(y, m, 1);
    end       = new Date(y, m + 1, 1);
    prevStart = new Date(y, m - 1, 1);
    prevEnd   = new Date(y, m, 1);
  }
  return { start, end, prevStart, prevEnd };
}

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ rows: [] });

    const { searchParams } = new URL(req.url);
    const period  = searchParams.get("period")  || "month";
    const groupBy = searchParams.get("groupBy") || "category"; // category | costCenter

    const { start, end, prevStart, prevEnd } = getPeriodRange(period);

    if (groupBy === "costCenter") {
      // Group ExpenseVouchers (total) by cost center
      const [current, previous, costCenters] = await Promise.all([
        prisma.expenseVoucher.groupBy({
          by: ["costCenterId"],
          where: { companyId, date: { gte: start, lt: end }, deletedAt: null },
          _sum: { totalAmount: true },
        }),
        prisma.expenseVoucher.groupBy({
          by: ["costCenterId"],
          where: { companyId, date: { gte: prevStart, lt: prevEnd }, deletedAt: null },
          _sum: { totalAmount: true },
        }),
        prisma.costCenter.findMany({ where: { companyId }, select: { id: true, name: true, code: true } }),
      ]);

      const ccMap = Object.fromEntries(costCenters.map(c => [c.id, `${c.code} — ${c.name}`]));
      const prevMap = Object.fromEntries(previous.map(r => [r.costCenterId ?? "__none__", r._sum.totalAmount ?? 0]));
      const total   = current.reduce((s, r) => s + (r._sum.totalAmount ?? 0), 0);

      const rows = current.map(r => {
        const key    = r.costCenterId ?? "__none__";
        const label  = r.costCenterId ? (ccMap[r.costCenterId] || "Unknown") : "No Cost Center";
        const amount = r._sum.totalAmount ?? 0;
        const prev   = prevMap[key] ?? 0;
        const change = prev > 0 ? ((amount - prev) / prev) * 100 : 0;
        return { department: label, category: label, amount, pct: total > 0 ? (amount / total) * 100 : 0, prevAmount: prev, change };
      }).sort((a, b) => b.amount - a.amount);

      return NextResponse.json({ rows });
    }

    // Default: group by ExpenseItem.category in SQL, not by loading all rows into JS.
    const [currentItems, previousItems] = await Promise.all([
      prisma.$queryRaw<{ category: string; amount: number }[]>`
        SELECT COALESCE(ei."category", 'Other') AS category,
               COALESCE(SUM(ei."amount"), 0)::float AS amount
        FROM "ExpenseItem" ei
        INNER JOIN "ExpenseVoucher" ev ON ev."id" = ei."expenseVoucherId"
        WHERE ev."companyId" = ${companyId}
          AND ev."date" >= ${start}
          AND ev."date" < ${end}
          AND ev."deletedAt" IS NULL
        GROUP BY COALESCE(ei."category", 'Other')
      `,
      prisma.$queryRaw<{ category: string; amount: number }[]>`
        SELECT COALESCE(ei."category", 'Other') AS category,
               COALESCE(SUM(ei."amount"), 0)::float AS amount
        FROM "ExpenseItem" ei
        INNER JOIN "ExpenseVoucher" ev ON ev."id" = ei."expenseVoucherId"
        WHERE ev."companyId" = ${companyId}
          AND ev."date" >= ${prevStart}
          AND ev."date" < ${prevEnd}
          AND ev."deletedAt" IS NULL
        GROUP BY COALESCE(ei."category", 'Other')
      `,
    ]);

    const aggCurrent = Object.fromEntries(currentItems.map((item) => [item.category || "Other", Number(item.amount || 0)]));
    const aggPrev = Object.fromEntries(previousItems.map((item) => [item.category || "Other", Number(item.amount || 0)]));

    const total = Object.values(aggCurrent).reduce((s, v) => s + v, 0);
    const rows = Object.entries(aggCurrent).map(([cat, amount]) => {
      const prev   = aggPrev[cat] ?? 0;
      const change = prev > 0 ? ((amount - prev) / prev) * 100 : 0;
      return { department: cat, category: cat, amount, pct: total > 0 ? (amount / total) * 100 : 0, prevAmount: prev, change };
    }).sort((a, b) => b.amount - a.amount);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("expense-breakdown error:", e.message);
    return NextResponse.json({ rows: [] }, { status: 500 });
  }
}
