import { NextRequest, NextResponse } from "next/server";
import { buildFinancialContext } from "@/lib/finovaAI";
import { buildRevenueAnalyzer } from "@/lib/aiAnalytics";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const ctx = await buildFinancialContext(companyId);
    return NextResponse.json(buildRevenueAnalyzer(ctx));
  } catch (err) {
    console.error("AI revenue analyzer error:", err);
    return NextResponse.json({ error: "Failed to analyze revenue" }, { status: 500 });
  }
}
