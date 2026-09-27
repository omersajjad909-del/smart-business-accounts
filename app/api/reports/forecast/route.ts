import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { invoiceRevenue } from "@/lib/invoiceAmounts";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const horizon = Math.min(24, Math.max(1, parseInt(req.nextUrl.searchParams.get("horizon") || "6") || 6));

    // Get last 12 months of actuals
    const now = new Date();
    const historyStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: historyStart } },
      select: { date: true, total: true, discount: true, discountType: true, freight: true, items: { select: { qty: true, rate: true } } },
    });

    // Every month of the window, empty ones as 0 — skipping them used to make
    // a quiet month vanish and the trend jump across it.
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const actualByMonth = new Map<string, number>();
    for (let i = 0; i < 12; i++) actualByMonth.set(monthKey(new Date(historyStart.getFullYear(), historyStart.getMonth() + i, 1)), 0);
    for (const inv of invoices) {
      const key = monthKey(inv.date);
      // Revenue net of tax (lib/invoiceAmounts.ts) — GST is not sales.
      if (actualByMonth.has(key)) actualByMonth.set(key, actualByMonth.get(key)! + invoiceRevenue(inv));
    }
    const sortedActuals = [...actualByMonth.entries()].map(([month, actual]) => ({ month, actual: Math.round(actual) }));

    // Fit on complete months only, from the first month with any sales: the
    // current month is still running, and months before the business started
    // selling would drag the trend down.
    const complete = sortedActuals.slice(0, -1);
    const firstActive = complete.findIndex((r) => r.actual > 0);
    const series = firstActive < 0 ? [] : complete.slice(firstActive).map((r) => r.actual);

    // Straight-line trend (least squares). This used to compound the change
    // between the first and last month every month — three months of data
    // turned a good quarter into an 85%-a-month growth curve.
    const n = series.length;
    const xMean = (n - 1) / 2;
    const yMean = n ? series.reduce((s, v) => s + v, 0) / n : 0;
    let sxx = 0, sxy = 0;
    series.forEach((y, x) => { sxx += (x - xMean) ** 2; sxy += (x - xMean) * (y - yMean); });
    const slope = n >= 3 && sxx > 0 ? sxy / sxx : 0;
    const intercept = yMean - slope * xMean;
    const fitted = (x: number) => Math.max(0, intercept + slope * x);

    const residuals = series.map((y, x) => y - fitted(x));
    const sd = n >= 2 ? Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 2)) : yMean * 0.25;
    const ssTot = series.reduce((s, y) => s + (y - yMean) ** 2, 0);
    const r2 = ssTot > 0 ? Math.max(0, 1 - residuals.reduce((s, r) => s + r * r, 0) / ssTot) : 0;

    const points: any[] = sortedActuals.map((r) => ({ month: r.month, actual: r.actual, forecast: null, lowerBound: null, upperBound: null }));
    for (let i = 1; i <= horizon; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      // x of this month in the fitted series: the current month is x = n.
      const f = n ? fitted(n + i) : 0;
      const spread = sd * Math.sqrt(1 + i / Math.max(n, 1));
      points.push({
        month: monthKey(forecastDate),
        actual: null,
        forecast: Math.round(f),
        lowerBound: Math.round(Math.max(0, f - spread)),
        upperBound: Math.round(f + spread),
      });
    }

    const nextMonthForecast = points.find((p) => p.forecast !== null)?.forecast || 0;
    const nextQuarterForecast = points.filter((p) => p.forecast !== null).slice(0, 3).reduce((s: number, p: any) => s + p.forecast, 0);
    // Trend per month as a share of the average month.
    const growthRatePct = yMean > 0 ? Math.round((slope / yMean) * 1000) / 10 : 0;
    // Few months of history or a poor fit is a guess, and says so.
    const confidence = n < 3 ? 20 : Math.round(Math.min(90, 30 + Math.min(n, 12) * 3 + r2 * 25) - horizon * 2);

    return NextResponse.json({
      points,
      summary: {
        nextMonthForecast,
        nextQuarterForecast,
        growthRatePct,
        confidence: Math.max(10, confidence),
        monthsOfHistory: n,
      },
    });
  } catch (e: any) {
    console.error("FORECAST ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
