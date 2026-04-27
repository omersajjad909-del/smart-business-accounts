import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const horizon = parseInt(req.nextUrl.searchParams.get("horizon") || "6");

    // Get last 12 months of actuals
    const now = new Date();
    const historyStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: historyStart } },
      select: { date: true, total: true },
    });

    // Aggregate by month
    const actualByMonth = new Map<string, number>();
    for (const inv of invoices) {
      const key = `${inv.date.getFullYear()}-${String(inv.date.getMonth() + 1).padStart(2, "0")}`;
      actualByMonth.set(key, (actualByMonth.get(key) || 0) + inv.total);
    }

    // Build sorted actuals array
    const sortedActuals = [...actualByMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, actual]) => ({ month, actual }));

    // Simple moving average forecast
    const windowSize = Math.min(3, sortedActuals.length);
    const recentValues = sortedActuals.slice(-windowSize).map((r) => r.actual);
    const avgRecent = windowSize > 0 ? recentValues.reduce((s, v) => s + v, 0) / windowSize : 0;

    // Growth rate from last 6 months
    const last6 = sortedActuals.slice(-6);
    let growthRatePct = 0;
    if (last6.length >= 2) {
      const first = last6[0].actual;
      const last = last6[last6.length - 1].actual;
      growthRatePct = first > 0 ? ((last - first) / first) * 100 : 0;
    }

    const monthlyGrowth = growthRatePct / Math.max(last6.length - 1, 1) / 100;

    // Generate forecast points
    const points: any[] = sortedActuals.map((r) => ({
      month: r.month,
      actual: r.actual,
      forecast: null,
      lowerBound: null,
      upperBound: null,
    }));

    let lastForecast = avgRecent;
    for (let i = 1; i <= horizon; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const month = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, "0")}`;
      lastForecast = lastForecast * (1 + monthlyGrowth);
      const variance = lastForecast * 0.15;
      points.push({
        month,
        actual: null,
        forecast: Math.round(lastForecast),
        lowerBound: Math.round(lastForecast - variance),
        upperBound: Math.round(lastForecast + variance),
      });
    }

    const nextMonthForecast = points.find((p) => p.forecast !== null)?.forecast || 0;
    const nextQuarterForecast = points.filter((p) => p.forecast !== null).slice(0, 3).reduce((s: number, p: any) => s + p.forecast, 0);

    return NextResponse.json({
      points,
      summary: {
        nextMonthForecast,
        nextQuarterForecast,
        growthRatePct,
        confidence: Math.max(40, 90 - horizon * 5),
      },
    });
  } catch (e: any) {
    console.error("FORECAST ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
