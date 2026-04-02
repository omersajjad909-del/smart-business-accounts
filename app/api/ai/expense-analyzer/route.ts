import { NextRequest, NextResponse } from "next/server";
import { buildFinancialContext, FINOVA_SYSTEM_PROMPT, openAITextResponse } from "@/lib/finovaAI";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const ctx = await buildFinancialContext(companyId);
    const c = ctx.company.currency;
    const fmt = (n: number) => `${c} ${Math.round(n).toLocaleString()}`;

    const prompt = `You are analyzing the expense data for ${ctx.company.name}.

EXPENSE DATA:
- This Month Total: ${fmt(ctx.expenses.thisMonth)} (${ctx.expenses.change > 0 ? "+" : ""}${ctx.expenses.change}% vs last month)
- Last Month Total: ${fmt(ctx.expenses.lastMonth)}
- Purchases (COGS) This Month: ${fmt(ctx.expenses.thisMonth - ctx.topExpenses.reduce((s,e) => s+e.amount, 0))}

TOP EXPENSE CATEGORIES THIS MONTH:
${ctx.topExpenses.map((e, i) => `${i+1}. ${e.category}: ${fmt(e.amount)} (${ctx.expenses.thisMonth > 0 ? Math.round((e.amount/ctx.expenses.thisMonth)*100) : 0}% of total expenses)`).join("\n") || "No expense data"}

MONTHLY TREND (Last 6 Months):
${ctx.monthlyRevenue.map(m => `${m.month}: Revenue ${fmt(m.revenue)}, Expenses ${fmt(m.expenses)}, Profit ${fmt(m.profit)}`).join("\n")}

REVENUE THIS MONTH: ${fmt(ctx.revenue.thisMonth)}
EXPENSE-TO-REVENUE RATIO: ${ctx.revenue.thisMonth > 0 ? Math.round((ctx.expenses.thisMonth/ctx.revenue.thisMonth)*100) : 0}%

Generate a detailed Expense Analysis Report with these sections:

## Expense Overview
(Total expenses, MoM change, expense-to-revenue ratio, and what it means)

## Category Breakdown
(Analyze each expense category — which is too high, which is normal, which can be reduced)

## Expense Trend Analysis
(6-month trend — increasing, decreasing, seasonal patterns)

## Unnecessary or High Expenses
(Identify expenses that seem unusually high or could be cut)

## Cost Control Recommendations
(5 specific, actionable ways to reduce expenses with estimated savings)

## Expense Health Score
(Score /100 for expense management — based on expense-to-revenue ratio and trends)

Be specific with actual numbers. Write in clear business language. Use bullet points.`;

    const analysis = await openAITextResponse(
      FINOVA_SYSTEM_PROMPT,
      [{ role: "user", content: prompt }],
      1500,
    );

    // Build chart data from monthly context
    const chartData = ctx.monthlyRevenue.map(m => ({
      month: m.month.split(" ")[0], // short month name
      expenses: m.expenses,
      revenue: m.revenue,
    }));

    // Expense categories for pie-like display
    const categories = ctx.topExpenses.map(e => ({
      name: e.category,
      amount: e.amount,
      pct: ctx.expenses.thisMonth > 0 ? Math.round((e.amount / ctx.expenses.thisMonth) * 100) : 0,
    }));

    return NextResponse.json({
      analysis,
      chartData,
      categories,
      summary: {
        thisMonth: ctx.expenses.thisMonth,
        lastMonth: ctx.expenses.lastMonth,
        change: ctx.expenses.change,
        ratio: ctx.revenue.thisMonth > 0 ? Math.round((ctx.expenses.thisMonth / ctx.revenue.thisMonth) * 100) : 0,
        currency: c,
      },
    });
  } catch (err) {
    console.error("Expense analyzer error:", err);
    return NextResponse.json({ error: "Failed to analyze expenses" }, { status: 500 });
  }
}
