import { NextRequest, NextResponse } from "next/server";
import { buildFinancialContext, generateMarketIntelligenceSummary } from "@/lib/finovaAI";
import { buildMarketIntelligence } from "@/lib/marketIntelligence";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const ctx = await buildFinancialContext(companyId);
    const result = buildMarketIntelligence(ctx);

    // Enhance summary with GPT — pass pre-built ctx to avoid a second DB round-trip.
    // Race against a 10s hard cap so we never stall the whole response.
    const aiSummary = await Promise.race([
      generateMarketIntelligenceSummary(companyId, result, ctx).catch(() => ""),
      new Promise<string>(resolve => setTimeout(() => resolve(""), 10_000)),
    ]);

    return NextResponse.json({
      ...result,
      summary: aiSummary || result.summary,
      aiEnhanced: Boolean(aiSummary),
    });
  } catch (err) {
    console.error("Market intelligence error:", err);
    return NextResponse.json({ error: "Failed to build market intelligence" }, { status: 500 });
  }
}
