import { NextRequest, NextResponse } from "next/server";
import { generateForecast, buildFinancialContext } from "@/lib/finovaAI";
import { buildForecastBundle } from "@/lib/aiAnalytics";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const [forecast, ctx] = await Promise.all([
      generateForecast(companyId),
      buildFinancialContext(companyId),
    ]);
    const bundle = buildForecastBundle(ctx);

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
