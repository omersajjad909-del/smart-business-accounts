import { NextRequest, NextResponse } from "next/server";
import { buildFinancialContext, generateAdvisorQuickWins } from "@/lib/finovaAI";
import { buildBusinessAdvisor } from "@/lib/marketIntelligence";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const ctx = await buildFinancialContext(companyId);
    const result = buildBusinessAdvisor(ctx);

    // Enhance quick wins with GPT — falls back to rule-based if GPT fails
    const aiQuickWins = await generateAdvisorQuickWins(companyId, result).catch(() => [] as string[]);

    return NextResponse.json({
      ...result,
      quickWins: aiQuickWins.length > 0 ? aiQuickWins : (result.quickWins ?? []),
      aiEnhanced: aiQuickWins.length > 0,
    });
  } catch (err) {
    console.error("Business advisor error:", err);
    return NextResponse.json({ error: "Failed to build business advisor" }, { status: 500 });
  }
}
