import { NextRequest, NextResponse } from "next/server";
import { buildFinancialContext, FINOVA_SYSTEM_PROMPT, openAITextResponse } from "@/lib/finovaAI";
import { buildForecastBundle, buildRiskAnalyzer } from "@/lib/aiAnalytics";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const ctx = await buildFinancialContext(companyId);
    const forecastBundle = buildForecastBundle(ctx);
    const riskBundle = buildRiskAnalyzer(ctx);
    const c = ctx.company.currency;
    const fmt = (n: number) => `${c} ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
    const sign = (n: number) => (n >= 0 ? "▲ +" : "▼ ") + Math.abs(n) + "%";

    const now = new Date();
    const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });

    const prompt = `Generate a comprehensive Monthly Financial Report for ${ctx.company.name} for ${monthName}.

FINANCIAL DATA:
- Revenue This Month: ${fmt(ctx.revenue.thisMonth)} (${sign(ctx.revenue.change)} vs last month)
- Revenue Last Month: ${fmt(ctx.revenue.lastMonth)}
- Revenue This Year: ${fmt(ctx.revenue.thisYear)}
- Expenses This Month: ${fmt(ctx.expenses.thisMonth)} (${sign(ctx.expenses.change)} vs last month)
- Net Profit This Month: ${fmt(ctx.profit.thisMonth)} (${sign(ctx.profit.change)} vs last month)
- Outstanding Receivables: ${fmt(ctx.receivables.total)} (Overdue: ${fmt(ctx.receivables.overdue)}, ${ctx.receivables.overdueCount} invoices)
- Outstanding Payables: ${fmt(ctx.payables.total)}
- Low Stock Items: ${ctx.inventory.lowStockItems} (${ctx.inventory.lowStockNames.join(", ") || "None"})
- Top Customers: ${ctx.topCustomers.map((c, i) => `${i + 1}. ${c.name} (${fmt(c.amount)})`).join(", ") || "No data"}
- Top Expenses: ${ctx.topExpenses.map((e, i) => `${i + 1}. ${e.category} (${fmt(e.amount)})`).join(", ") || "No data"}
- Forecast Closing Cash 30d: ${fmt(forecastBundle.projections.closingCash30d)}
- Forecast Closing Cash 60d: ${fmt(forecastBundle.projections.closingCash60d)}
- Forecast Closing Cash 90d: ${fmt(forecastBundle.projections.closingCash90d)}
- Cash Risk Level: ${forecastBundle.projections.cashRisk}

Generate a structured, professional financial report with:

# Monthly Financial Report — ${monthName}

## Executive Summary
(3-4 sentence high-level summary of the month's performance)

## Revenue Performance
(Detailed revenue analysis with trends, comparisons, key drivers)

## Expense Analysis
(Breakdown by category, trends, key drivers, comparison to last month)

## Profitability
(Profit margin analysis, trends, concerns if any)

## Cash Flow & Liquidity
(Receivables, payables, cash position, risk assessment)

## Customer & Sales Insights
(Top customers, sales patterns, recommendations)

## Inventory Status
(Stock levels, low stock risks, reorder recommendations)

## Business Health Score
(Score /100 with breakdown: Revenue Health, Expense Control, Cash Flow, Profitability)

## Key Risks
(Top 3 financial risks this month with severity)

## Recommended Actions
(5 specific, prioritized actions for next month)

## Outlook for Next Month
(Brief prediction and preparation advice)

Write professionally but in plain language that a business owner can understand without accounting knowledge. Use actual numbers throughout.`;

    const reportText = await openAITextResponse(
      FINOVA_SYSTEM_PROMPT,
      [{ role: "user", content: prompt }],
      2500,
    );

    return NextResponse.json({
      report: reportText,
      month: monthName,
      company: ctx.company.name,
      generatedAt: new Date().toISOString(),
      summary: {
        revenue: ctx.revenue.thisMonth,
        expenses: ctx.expenses.thisMonth,
        profit: ctx.profit.thisMonth,
        revenueChange: ctx.revenue.change,
        expenseChange: ctx.expenses.change,
        profitChange: ctx.profit.change,
      },
      highlights: {
        topCustomer: ctx.topCustomers[0],
        topExpense: ctx.topExpenses[0],
        lowStockCount: ctx.inventory.lowStockItems,
        overdueReceivables: ctx.receivables.overdue,
        cashRisk: forecastBundle.projections.cashRisk,
      },
      riskSnapshot: {
        score: riskBundle.healthScore,
        label: riskBundle.scoreLabel,
        items: riskBundle.items,
      },
    });
  } catch (err) {
    console.error("AI report error:", err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
