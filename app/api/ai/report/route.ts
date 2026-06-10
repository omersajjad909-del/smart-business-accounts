import { NextRequest, NextResponse } from "next/server";
import { buildFinancialContext, FINOVA_SYSTEM_PROMPT, openAITextResponse } from "@/lib/finovaAI";
import { buildForecastBundle, buildPredictiveSignals, buildRiskAnalyzer } from "@/lib/aiAnalytics";

export const runtime = "nodejs";
export const maxDuration = 90;

function buildFallbackReportText(
  reportLabel: string,
  monthName: string,
  ctx: Awaited<ReturnType<typeof buildFinancialContext>>,
  forecastBundle: ReturnType<typeof buildForecastBundle>,
  riskBundle: ReturnType<typeof buildRiskAnalyzer>,
) {
  const c = ctx.company.currency;
  const fmt = (n: number) => `${c} ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
  const sign = (n: number) => `${n >= 0 ? "+" : ""}${n}%`;
  const marginPct = ctx.revenue.thisMonth > 0 ? Math.round((ctx.profit.thisMonth / ctx.revenue.thisMonth) * 100) : 0;

  return [
    `# ${reportLabel} Board Report - ${monthName}`,
    ``,
    `## Executive Summary`,
    `${ctx.company.name} closed the month with revenue of ${fmt(ctx.revenue.thisMonth)} and net profit of ${fmt(ctx.profit.thisMonth)}. Revenue moved ${sign(ctx.revenue.change)} versus last month, while expenses moved ${sign(ctx.expenses.change)}.`,
    ``,
    `## Revenue Performance`,
    `- This month revenue: ${fmt(ctx.revenue.thisMonth)}`,
    `- Last month revenue: ${fmt(ctx.revenue.lastMonth)}`,
    `- Year-to-date revenue: ${fmt(ctx.revenue.thisYear)}`,
    `- Top customer: ${ctx.topCustomers[0]?.name || "n/a"}${ctx.topCustomers[0] ? ` (${fmt(ctx.topCustomers[0].amount)})` : ""}`,
    ``,
    `## Expense Analysis`,
    `- This month expenses: ${fmt(ctx.expenses.thisMonth)}`,
    `- Last month expenses: ${fmt(ctx.expenses.lastMonth)}`,
    `- Largest expense category: ${ctx.topExpenses[0]?.category || "n/a"}${ctx.topExpenses[0] ? ` (${fmt(ctx.topExpenses[0].amount)})` : ""}`,
    ``,
    `## Profitability`,
    `- Net profit: ${fmt(ctx.profit.thisMonth)}`,
    `- Net margin: ${marginPct}%`,
    `- Profit change vs last month: ${sign(ctx.profit.change)}`,
    ``,
    `## Cash Flow & Liquidity`,
    `- Receivables outstanding: ${fmt(ctx.receivables.total)}`,
    `- Overdue receivables: ${fmt(ctx.receivables.overdue)} across ${ctx.receivables.overdueCount} invoice(s)`,
    `- Payables outstanding: ${fmt(ctx.payables.total)}`,
    `- Forecast closing cash in 30 days: ${fmt(forecastBundle.projections.closingCash30d)}`,
    `- Cash risk: ${forecastBundle.projections.cashRisk}`,
    ``,
    `## Inventory Status`,
    `- Inventory value: ${fmt(ctx.inventory.stockValue)}`,
    `- Low stock items: ${ctx.inventory.lowStockItems}`,
    `- Dead stock items: ${ctx.deadStockItems.length}`,
    ``,
    `## Business Health Score`,
    `${riskBundle.healthScore}/100 (${riskBundle.scoreLabel} risk)`,
    ``,
    `## Key Risks`,
    ...riskBundle.items.slice(0, 3).map((item) => `- ${item.title}: ${item.note}`),
    ``,
    `## Recommended Actions`,
    `- Accelerate collections on overdue receivables.`,
    `- Review the highest expense categories before next month closes.`,
    `- Replenish low stock items that support active sales.`,
    `- Reduce exposure to dead or slow-moving inventory.`,
    `- Monitor 30-day closing cash against the recommended buffer.`,
    ``,
    `## Outlook for Next ${reportLabel}`,
    `If current trends continue, the next 30 to 90 days remain ${forecastBundle.projections.cashRisk === "high" ? "sensitive" : "manageable"}, but collections discipline and expense control will be important.`,
  ].join("\n");
}

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const period = (req.nextUrl.searchParams.get("period") || "monthly") as "weekly" | "monthly" | "quarterly";
    const periodLabel = period === "quarterly" ? "Quarterly" : period === "weekly" ? "Weekly" : "Monthly";

    const ctx = await buildFinancialContext(companyId);
    const forecastBundle = buildForecastBundle(ctx);
    const riskBundle = buildRiskAnalyzer(ctx);
    const c = ctx.company.currency;
    const fmt = (n: number) => `${c} ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
    const sign = (n: number) => (n >= 0 ? "▲ +" : "▼ ") + Math.abs(n) + "%";

    const now = new Date();
    const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    const quarterName = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;
    const weekLabel = `Week of ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    const periodName = period === "quarterly" ? quarterName : period === "weekly" ? weekLabel : monthName;

    const prompt = `Generate a comprehensive ${periodLabel} Financial Report for ${ctx.company.name} for ${periodName}.

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

# ${periodLabel} Financial Report — ${periodName}

## Executive Summary
(3-4 sentence high-level summary of the ${period}'s performance)

## Revenue Performance
(Detailed revenue analysis with trends, comparisons, key drivers)

## Expense Analysis
(Breakdown by category, trends, key drivers, comparison to prior ${period})

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
(Top 3 financial risks this ${period} with severity)

## Recommended Actions
(5 specific, prioritized actions for next ${period})

## Outlook for Next ${periodLabel}
(Brief prediction and preparation advice)

Write professionally but in plain language that a business owner can understand without accounting knowledge. Use actual numbers throughout.`;

    let reportText = buildFallbackReportText(monthName, ctx, forecastBundle, riskBundle);
    try {
      reportText = await openAITextResponse(
        FINOVA_SYSTEM_PROMPT,
        [{ role: "user", content: prompt }],
        2500,
      ) || reportText;
    } catch (error) {
      console.error("AI report narrative fallback:", error);
    }

    return NextResponse.json({
      report: reportText,
      month: periodName,
      period,
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
