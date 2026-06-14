import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openAITextResponse, FINOVA_SYSTEM_PROMPT } from "@/lib/finovaAI";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [company, purchaseInvoices, purchaseItemsRaw] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { name: true, baseCurrency: true } }),
      prisma.purchaseInvoice.findMany({
        where: { companyId, date: { gte: oneYearAgo } },
        select: { id: true, supplierId: true, total: true, date: true, supplier: { select: { name: true } } },
      }),
      prisma.purchaseInvoiceItem.findMany({
        where: { invoice: { companyId, date: { gte: oneYearAgo } } },
        select: { invoiceId: true, qty: true, rate: true, amount: true, item: { select: { name: true } }, invoice: { select: { supplierId: true, date: true, supplier: { select: { name: true } } } } },
      }),
    ]);
    const purchaseItems = purchaseItemsRaw;

    const c = company?.baseCurrency || "PKR";
    const fmt = (n: number) => `${c} ${Math.round(n).toLocaleString()}`;

    // Build per-supplier analysis
    const supplierMap = new Map<string, {
      name: string; totalSpend: number; invoiceCount: number;
      firstHalfSpend: number; secondHalfSpend: number;
      avgInvoiceValue: number; lastOrderDate: Date;
      items: Map<string, { totalQty: number; totalAmount: number; rates: number[] }>;
    }>();

    // Build supplier totals from invoice headers
    for (const inv of purchaseInvoices) {
      if (!inv.supplierId) continue;
      const invDate = new Date(inv.date);
      const existing = supplierMap.get(inv.supplierId) || {
        name: inv.supplier?.name || "Unknown",
        totalSpend: 0, invoiceCount: 0, firstHalfSpend: 0, secondHalfSpend: 0,
        avgInvoiceValue: 0, lastOrderDate: invDate,
        items: new Map(),
      };
      existing.totalSpend += inv.total;
      existing.invoiceCount += 1;
      if (invDate >= sixMonthsAgo) existing.secondHalfSpend += inv.total;
      else existing.firstHalfSpend += inv.total;
      if (invDate > existing.lastOrderDate) existing.lastOrderDate = invDate;
      supplierMap.set(inv.supplierId, existing);
    }

    // Add item-level detail
    for (const pi of purchaseItems) {
      const supplierId = pi.invoice.supplierId;
      if (!supplierId) continue;
      const existing = supplierMap.get(supplierId);
      if (!existing) continue;
      const itemName = pi.item?.name || "Unknown Item";
      const key = itemName.toLowerCase().trim();
      const itemData = existing.items.get(key) || { totalQty: 0, totalAmount: 0, rates: [] };
      itemData.totalQty += pi.qty;
      itemData.totalAmount += pi.amount;
      if (pi.rate > 0) itemData.rates.push(pi.rate);
      existing.items.set(key, itemData);
    }

    const suppliers: Array<{
      supplierId: string; name: string; totalSpend: number; invoiceCount: number;
      spendTrend: "increasing" | "stable" | "decreasing";
      spendTrendPct: number;
      negotiationOpportunity: "high" | "medium" | "low";
      negotiationReason: string;
      suggestedDiscount: string;
      topItems: Array<{ description: string; avgRate: number; totalQty: number; priceVariance: number }>;
      lastOrderDaysAgo: number;
      concentrationRisk: boolean;
    }> = [];

    const totalCompanySpend = Array.from(supplierMap.values()).reduce((s, v) => s + v.totalSpend, 0);

    for (const [supplierId, data] of supplierMap) {
      if (data.invoiceCount < 2) continue; // Skip one-time suppliers
      const spendTrendPct = data.firstHalfSpend > 0 ? Math.round(((data.secondHalfSpend - data.firstHalfSpend) / data.firstHalfSpend) * 100) : 0;
      const spendTrend: "increasing" | "stable" | "decreasing" = spendTrendPct > 10 ? "increasing" : spendTrendPct < -10 ? "decreasing" : "stable";
      const supplierSharePct = totalCompanySpend > 0 ? Math.round((data.totalSpend / totalCompanySpend) * 100) : 0;
      const lastOrderDaysAgo = Math.round((new Date().getTime() - data.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));

      // Negotiation opportunity
      let negotiationOpportunity: "high" | "medium" | "low" = "low";
      let negotiationReason = "";
      let suggestedDiscount = "";

      if (data.totalSpend > 500000 || spendTrend === "increasing") {
        negotiationOpportunity = "high";
        const potentialSaving = data.totalSpend * 0.05;
        negotiationReason = `High volume supplier (${fmt(data.totalSpend)}/yr)${spendTrend === "increasing" ? " with growing spend" : ""}`;
        suggestedDiscount = `Negotiate 5-8% volume discount — saves ${fmt(potentialSaving)}/yr`;
      } else if (data.invoiceCount >= 4 || data.totalSpend > 100000) {
        negotiationOpportunity = "medium";
        negotiationReason = `Regular supplier with ${data.invoiceCount} orders — loyalty should command better rates`;
        suggestedDiscount = `Request 2-3% loyalty discount`;
      } else {
        negotiationReason = "New/occasional supplier — build relationship first";
        suggestedDiscount = "Request price match if competitor offers better rate";
      }

      // Top items with price variance
      const topItems: Array<{ description: string; avgRate: number; totalQty: number; priceVariance: number }> = [];
      for (const [desc, itemData] of data.items) {
        if (itemData.rates.length === 0) continue;
        const avgRate = itemData.totalAmount / itemData.totalQty;
        const maxRate = Math.max(...itemData.rates);
        const minRate = Math.min(...itemData.rates);
        const priceVariance = maxRate > 0 ? Math.round(((maxRate - minRate) / minRate) * 100) : 0;
        topItems.push({ description: desc, avgRate: Math.round(avgRate), totalQty: Math.round(itemData.totalQty), priceVariance });
      }
      topItems.sort((a, b) => b.avgRate * b.totalQty - a.avgRate * a.totalQty);

      suppliers.push({
        supplierId, name: data.name, totalSpend: Math.round(data.totalSpend),
        invoiceCount: data.invoiceCount, spendTrend, spendTrendPct,
        negotiationOpportunity, negotiationReason, suggestedDiscount,
        topItems: topItems.slice(0, 5),
        lastOrderDaysAgo, concentrationRisk: supplierSharePct > 40,
      });
    }

    suppliers.sort((a, b) => {
      const opMap = { high: 3, medium: 2, low: 1 };
      return opMap[b.negotiationOpportunity] - opMap[a.negotiationOpportunity] || b.totalSpend - a.totalSpend;
    });

    const highOpportunityCount = suppliers.filter(s => s.negotiationOpportunity === "high").length;
    const totalPotentialSaving = suppliers.filter(s => s.negotiationOpportunity === "high").reduce((sum, s) => sum + s.totalSpend * 0.05, 0)
      + suppliers.filter(s => s.negotiationOpportunity === "medium").reduce((sum, s) => sum + s.totalSpend * 0.025, 0);

    let narrative = "";
    try {
      const top3 = suppliers.slice(0, 3).map(s => `${s.name}: ${fmt(s.totalSpend)}/yr, trend=${s.spendTrend}, opportunity=${s.negotiationOpportunity}`).join("; ");
      narrative = await openAITextResponse(FINOVA_SYSTEM_PROMPT, [{
        role: "user",
        content: `Supplier negotiation intelligence for ${company?.name}. Top suppliers: ${top3}. Total potential savings: ${fmt(totalPotentialSaving)}/yr. Write 3 specific negotiation tactics as bullet points.`,
      }], 250);
    } catch { narrative = `${highOpportunityCount} suppliers have high negotiation potential. Estimated savings: ${fmt(totalPotentialSaving)}/year with volume and loyalty discounts.`; }

    return NextResponse.json({
      suppliers: suppliers.slice(0, 20),
      summary: { highOpportunityCount, totalSuppliers: suppliers.length, totalPotentialSaving: Math.round(totalPotentialSaving), currency: c },
      narrative,
      generatedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
