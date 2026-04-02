import { NextRequest, NextResponse } from "next/server";
import { buildFinancialContext } from "@/lib/finovaAI";
import { buildInventoryIntelligence } from "@/lib/aiAnalytics";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const ctx = await buildFinancialContext(companyId);
    return NextResponse.json(buildInventoryIntelligence(ctx));
  } catch (err) {
    console.error("AI inventory intelligence error:", err);
    return NextResponse.json({ error: "Failed to analyze inventory" }, { status: 500 });
  }
}
