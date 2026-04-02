import { NextRequest, NextResponse } from "next/server";
import { generateInsights, buildFinancialContext } from "@/lib/finovaAI";
import { buildInsightCards } from "@/lib/aiAnalytics";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const [insights, ctx] = await Promise.all([
      generateInsights(companyId),
      buildFinancialContext(companyId),
    ]);

    return NextResponse.json({ insights, context: ctx, insightCards: buildInsightCards(ctx) });
  } catch (err) {
    console.error("AI insights error:", err);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
