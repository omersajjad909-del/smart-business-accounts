import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openAITextResponse, FINOVA_SYSTEM_PROMPT } from "@/lib/finovaAI";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [company, salesItems, inventoryTxns, items] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { name: true, baseCurrency: true } }),
      prisma.salesInvoiceItem.findMany({
        where: {
          invoice: { companyId, date: { gte: sixMonthsAgo } },
        },
        select: { itemId: true, qty: true, rate: true, amount: true, invoice: { select: { date: true } } },
      }),
      prisma.inventoryTxn.findMany({
        where: { companyId, date: { gte: sixMonthsAgo } },
        select: { itemId: true, qty: true, type: true, date: true },
      }),
      prisma.itemNew.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true, name: true, minStock: true },
        take: 200,
      }),
    ]);

    const c = company?.baseCurrency || "PKR";
    const fmt = (n: number) => `${c} ${Math.round(n).toLocaleString()}`;

    // Build per-item sales by month
    const itemSalesMap = new Map<string, { name: string; monthlySales: number[]; totalQty: number; totalRevenue: number; lastSaleDate: Date | null; minStock: number }>();
    const itemIdToName = new Map(items.map(i => [i.id, i.name]));
    const itemIdToMinStock = new Map(items.map(i => [i.id, i.minStock ?? 0]));

    for (const si of salesItems) {
      if (!si.itemId) continue;
      const name = itemIdToName.get(si.itemId) || si.itemId;
      const monthIndex = new Date(si.invoice.date).getMonth();
      const existing = itemSalesMap.get(si.itemId) || { name, monthlySales: new Array(12).fill(0), totalQty: 0, totalRevenue: 0, lastSaleDate: null, minStock: itemIdToMinStock.get(si.itemId) || 0 };
      existing.monthlySales[monthIndex] += si.qty;
      existing.totalQty += si.qty;
      existing.totalRevenue += si.amount;
      const saleDate = new Date(si.invoice.date);
      if (!existing.lastSaleDate || saleDate > existing.lastSaleDate) existing.lastSaleDate = saleDate;
      itemSalesMap.set(si.itemId, existing);
    }

    // Current stock from inventory transactions
    const stockMap = new Map<string, number>();
    for (const txn of inventoryTxns) {
      if (!txn.itemId) continue;
      const cur = stockMap.get(txn.itemId) || 0;
      stockMap.set(txn.itemId, cur + (txn.type === "OUT" ? -txn.qty : txn.qty));
    }

    // Compute forecasts per item
    const forecasts: Array<{
      itemId: string; name: string; currentStock: number; minStock: number;
      avgMonthlySales: number; nextMonthForecast: number; suggestedReorder: number;
      daysOfStock: number; urgency: "critical" | "warning" | "ok";
      trend: "growing" | "stable" | "declining"; lastSaleDate: string | null;
      totalRevenue: number;
    }> = [];

    for (const [itemId, data] of itemSalesMap) {
      if (data.totalQty === 0) continue;
      const currentStock = Math.max(0, stockMap.get(itemId) || 0);
      const avgMonthlySales = data.totalQty / 6;
      // Simple linear trend: compare first 3 months vs last 3 months
      const first3 = data.monthlySales.slice(0, 3).reduce((a, b) => a + b, 0);
      const last3  = data.monthlySales.slice(-3).reduce((a, b) => a + b, 0);
      const trend = last3 > first3 * 1.1 ? "growing" : last3 < first3 * 0.9 ? "declining" : "stable";
      // Seasonal adjustment: boost forecast if trend growing
      const trendMultiplier = trend === "growing" ? 1.15 : trend === "declining" ? 0.9 : 1;
      const nextMonthForecast = Math.ceil(avgMonthlySales * trendMultiplier);
      const daysOfStock = avgMonthlySales > 0 ? Math.round((currentStock / avgMonthlySales) * 30) : 999;
      const suggestedReorder = Math.max(0, nextMonthForecast * 2 - currentStock); // 2-month buffer
      const urgency: "critical" | "warning" | "ok" = daysOfStock < 15 ? "critical" : daysOfStock < 30 ? "warning" : "ok";

      forecasts.push({
        itemId, name: data.name, currentStock, minStock: data.minStock,
        avgMonthlySales: Math.round(avgMonthlySales * 10) / 10,
        nextMonthForecast, suggestedReorder, daysOfStock,
        urgency, trend, lastSaleDate: data.lastSaleDate?.toISOString() || null,
        totalRevenue: data.totalRevenue,
      });
    }

    forecasts.sort((a, b) => a.daysOfStock - b.daysOfStock);

    const criticalCount = forecasts.filter(f => f.urgency === "critical").length;
    const warningCount  = forecasts.filter(f => f.urgency === "warning").length;
    const totalReorderValue = forecasts.reduce((s, f) => s + f.suggestedReorder * (f.totalRevenue / Math.max(f.avgMonthlySales * 6, 1)) / 6, 0);

    // AI narrative (optional)
    let narrative = "";
    try {
      const top5 = forecasts.slice(0, 5).map(f => `${f.name}: stock=${f.currentStock}, forecast=${f.nextMonthForecast}/mo, ${f.daysOfStock}d left, trend=${f.trend}`).join("\n");
      narrative = await openAITextResponse(FINOVA_SYSTEM_PROMPT, [{
        role: "user",
        content: `Inventory demand forecast for ${company?.name}. Top critical items:\n${top5}\nTotal critical: ${criticalCount}, warning: ${warningCount}. Write 3 bullet points of actionable inventory planning advice.`,
      }], 300);
    } catch { narrative = `${criticalCount} items need urgent reorder (stock < 15 days). ${warningCount} items need reorder within 30 days.`; }

    return NextResponse.json({
      forecasts: forecasts.slice(0, 30),
      summary: { criticalCount, warningCount, totalItems: forecasts.length, estimatedReorderValue: Math.round(totalReorderValue), currency: c, reorderValueFormatted: fmt(totalReorderValue) },
      narrative,
      generatedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
