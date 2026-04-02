import { NextRequest, NextResponse } from "next/server";
import { buildFinancialContext } from "@/lib/finovaAI";
import { buildMarketIntelligence } from "@/lib/marketIntelligence";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const ctx = await buildFinancialContext(companyId);
    const result = buildMarketIntelligence(ctx);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Market intelligence error:", err);
    return NextResponse.json({ error: "Failed to build market intelligence" }, { status: 500 });
  }
}
