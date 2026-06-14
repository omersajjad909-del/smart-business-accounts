import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openAITextResponse, FINOVA_SYSTEM_PROMPT } from "@/lib/finovaAI";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [company, allInvoices] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { name: true, baseCurrency: true } }),
      prisma.salesInvoice.findMany({
        where: { companyId, date: { gte: oneYearAgo } },
        select: { customerId: true, total: true, date: true, customer: { select: { name: true } } },
        orderBy: { date: "desc" },
      }),
    ]);

    const c = company?.baseCurrency || "PKR";
    const fmt = (n: number) => `${c} ${Math.round(n).toLocaleString()}`;

    // Build per-customer stats
    const customerMap = new Map<string, {
      name: string; totalRevenue: number; invoiceCount: number;
      lastInvoiceDate: Date; firstInvoiceDate: Date;
      revenueByHalf: [number, number]; // first 6mo vs last 6mo
    }>();

    for (const inv of allInvoices) {
      if (!inv.customerId) continue;
      const invDate = new Date(inv.date);
      const existing = customerMap.get(inv.customerId);
      if (!existing) {
        customerMap.set(inv.customerId, {
          name: inv.customer?.name || "Unknown",
          totalRevenue: inv.total,
          invoiceCount: 1,
          lastInvoiceDate: invDate,
          firstInvoiceDate: invDate,
          revenueByHalf: [invDate >= sixMonthsAgo ? 0 : inv.total, invDate >= sixMonthsAgo ? inv.total : 0],
        });
      } else {
        existing.totalRevenue += inv.total;
        existing.invoiceCount += 1;
        if (invDate > existing.lastInvoiceDate) existing.lastInvoiceDate = invDate;
        if (invDate < existing.firstInvoiceDate) existing.firstInvoiceDate = invDate;
        if (invDate >= sixMonthsAgo) existing.revenueByHalf[1] += inv.total;
        else existing.revenueByHalf[0] += inv.total;
      }
    }

    // Score each customer for churn risk
    const customers: Array<{
      customerId: string; name: string; totalRevenue: number; invoiceCount: number;
      daysSinceLastOrder: number; avgOrderFrequencyDays: number;
      revenueTrend: "growing" | "stable" | "declining" | "gone_silent";
      churnRisk: "critical" | "high" | "medium" | "low";
      churnScore: number; // 0-100, higher = more at risk
      reason: string; suggestedAction: string;
    }> = [];

    for (const [customerId, data] of customerMap) {
      const daysSinceLastOrder = Math.round((now.getTime() - data.lastInvoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      const customerLifespanDays = Math.max(1, Math.round((data.lastInvoiceDate.getTime() - data.firstInvoiceDate.getTime()) / (1000 * 60 * 60 * 24)));
      const avgOrderFrequencyDays = data.invoiceCount > 1 ? Math.round(customerLifespanDays / (data.invoiceCount - 1)) : 90;

      // Revenue trend: compare first half vs second half of year
      const first = data.revenueByHalf[0];
      const second = data.revenueByHalf[1];
      const revenueTrend = second === 0 ? "gone_silent" : second > first * 1.15 ? "growing" : second < first * 0.8 ? "declining" : "stable";

      // Churn score (0–100)
      let score = 0;
      if (daysSinceLastOrder > 90) score += 30;
      else if (daysSinceLastOrder > 60) score += 20;
      else if (daysSinceLastOrder > 30) score += 10;

      if (revenueTrend === "gone_silent") score += 35;
      else if (revenueTrend === "declining") score += 20;

      // If days since last order > 2x their normal frequency — they're late
      if (daysSinceLastOrder > avgOrderFrequencyDays * 2) score += 20;
      else if (daysSinceLastOrder > avgOrderFrequencyDays * 1.5) score += 10;

      // Low invoice count (new customer, less loyal)
      if (data.invoiceCount === 1) score += 15;
      else if (data.invoiceCount === 2) score += 5;

      score = Math.min(100, score);

      const churnRisk: "critical" | "high" | "medium" | "low" = score >= 70 ? "critical" : score >= 45 ? "high" : score >= 25 ? "medium" : "low";

      let reason = "";
      let suggestedAction = "";
      if (revenueTrend === "gone_silent") { reason = `No orders in ${daysSinceLastOrder} days — was active before`; suggestedAction = "Call immediately — offer loyalty discount or ask for feedback"; }
      else if (daysSinceLastOrder > avgOrderFrequencyDays * 2) { reason = `Overdue for reorder — usually orders every ${avgOrderFrequencyDays}d, last was ${daysSinceLastOrder}d ago`; suggestedAction = "WhatsApp check-in: 'Is everything okay with your last order?'"; }
      else if (revenueTrend === "declining") { reason = `Revenue dropped from ${fmt(first)} to ${fmt(second)} — reducing orders`; suggestedAction = "Visit in-person or call — understand what changed"; }
      else { reason = `Regular customer, last order ${daysSinceLastOrder} days ago`; suggestedAction = "Keep warm with monthly check-in"; }

      customers.push({ customerId, name: data.name, totalRevenue: data.totalRevenue, invoiceCount: data.invoiceCount, daysSinceLastOrder, avgOrderFrequencyDays, revenueTrend, churnRisk, churnScore: score, reason, suggestedAction });
    }

    customers.sort((a, b) => b.churnScore - a.churnScore);

    const criticalCount = customers.filter(c => c.churnRisk === "critical").length;
    const highCount     = customers.filter(c => c.churnRisk === "high").length;
    const atRiskRevenue = customers.filter(c => c.churnRisk !== "low").reduce((s, c) => s + c.totalRevenue, 0);

    let narrative = "";
    try {
      const top3 = customers.slice(0, 3).map(c => `${c.name}: ${c.reason}, score=${c.churnScore}`).join("; ");
      narrative = await openAITextResponse(FINOVA_SYSTEM_PROMPT, [{
        role: "user",
        content: `Customer churn prediction for ${company?.name}. ${criticalCount} critical, ${highCount} high risk. Top at-risk: ${top3}. At-risk revenue: ${fmt(atRiskRevenue)}. Write 3 bullet points on retention strategy.`,
      }], 250);
    } catch { narrative = `${criticalCount} customers are at critical churn risk. ${highCount} more are high risk. ${fmt(atRiskRevenue)} in annual revenue is at stake. Start with immediate outreach to critical customers.`; }

    return NextResponse.json({
      customers: customers.slice(0, 25),
      summary: { criticalCount, highCount, totalCustomers: customers.length, atRiskRevenue: Math.round(atRiskRevenue), currency: c },
      narrative,
      generatedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
