import { NextRequest, NextResponse } from "next/server";
import { buildFinancialContext } from "@/lib/finovaAI";
import { buildBusinessAdvisor } from "@/lib/marketIntelligence";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const ctx = await buildFinancialContext(companyId);
    const result = buildBusinessAdvisor(ctx);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Business advisor error:", err);
    return NextResponse.json({ error: "Failed to build business advisor" }, { status: 500 });
  }
}
