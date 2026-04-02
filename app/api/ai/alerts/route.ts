import { NextRequest, NextResponse } from "next/server";
import { detectAnomalies } from "@/lib/finovaAI";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const alerts = await detectAnomalies(companyId);
    return NextResponse.json({ alerts });
  } catch (err) {
    console.error("AI alerts error:", err);
    return NextResponse.json({ error: "Failed to detect anomalies" }, { status: 500 });
  }
}
