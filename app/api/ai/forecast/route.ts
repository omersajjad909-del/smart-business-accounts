import { NextRequest, NextResponse } from "next/server";
import { buildFinancialContext, FINOVA_SYSTEM_PROMPT, openAITextResponse } from "@/lib/finovaAI";
import { buildForecastBundle } from "@/lib/aiAnalytics";

export const runtime = "nodejs";
export const maxDuration = 60;

function buildFallbackForecastText(
  companyName: string,
  currency: string,
  bundle: ReturnType<typeof buildForecastBundle>,
) {
  const fmt = (n: number) => `${currency} ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
  const p = bundle.projections;
  const riskLabel = p.cashRisk === "high" ? "High" : p.cashRisk === "medium" ? "Medium" : "Low";

  return [
    `# Cash Flow Forecast`,
    ``,
    `## Summary`,
    `${companyName} is projected to close the next 30 days at ${fmt(p.closingCash30d)} and the next 90 days at ${fmt(p.closingCash90d)}.`,
    ``,
    `## Outlook`,
    `- Expected revenue in 30 days: ${fmt(p.revenue30d)}`,
    `- Expected expenses in 30 days: ${fmt(p.expense30d)}`,
    `- Receivables due: ${fmt(p.receivablesDue)}`,
    `- Payables due: ${fmt(p.payablesDue)}`,
    ``,
    `## Risk`,
    `- Cash risk level: ${riskLabel}`,
    `- Recommended buffer: ${fmt(p.recommendedBuffer)}`,
    `- ${p.daysUntilCashLow ? `Cash may tighten in around ${p.daysUntilCashLow} days if the current trend continues.` : "Current trend does not indicate an immediate cash crunch."}`,
    ``,
    `## Next Actions`,
    `- Accelerate receivable collections from overdue customers.`,
    `- Delay non-essential spending until cash coverage improves.`,
    `- Review supplier commitments against the next 30 days of cash cover.`,
  ].join("\n");
}

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const ctx = await buildFinancialContext(companyId);
    const bundle = buildForecastBundle(ctx);
    const c = ctx.company.currency;
    const fmt = (n: number) => `${c} ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

    let forecast = buildFallbackForecastText(ctx.company.name, c, bundle);
    try {
      const prompt = `Based on the financial data below, generate a 30-day cash flow forecast.

Include:
1. Expected cash inflows
2. Expected cash outflows
3. Projected net cash position
4. Cash risk assessment
5. Key assumptions
6. 3 actions to improve cash flow

Use plain business language, keep it practical, and use the actual figures below.

COMPANY: ${ctx.company.name}
- Revenue this month: ${fmt(ctx.revenue.thisMonth)}
- Expenses this month: ${fmt(ctx.expenses.thisMonth)}
- Cash position: ${fmt(ctx.cashPosition)}
- Receivables total: ${fmt(ctx.receivables.total)}
- Payables total: ${fmt(ctx.payables.total)}
- Forecast closing cash 30d: ${fmt(bundle.projections.closingCash30d)}
- Forecast closing cash 60d: ${fmt(bundle.projections.closingCash60d)}
- Forecast closing cash 90d: ${fmt(bundle.projections.closingCash90d)}
- Cash risk: ${bundle.projections.cashRisk}
- Recommended buffer: ${fmt(bundle.projections.recommendedBuffer)}
`;

      forecast = await openAITextResponse(
        FINOVA_SYSTEM_PROMPT,
        [{ role: "user", content: prompt }],
        900,
      ) || forecast;
    } catch (error) {
      console.error("AI forecast narrative fallback:", error);
    }

    return NextResponse.json({
      forecast,
      chartData: bundle.chartData,
      projections: bundle.projections,
      summary: bundle.summary,
    });
  } catch (err) {
    console.error("AI forecast error:", err);
    return NextResponse.json({ error: "Failed to generate forecast" }, { status: 500 });
  }
}
