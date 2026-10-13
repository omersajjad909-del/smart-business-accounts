import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { SettlementError, raiseTravelSettlement } from "@/lib/travel/settlement";

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = (await req.json()) as { recordId?: string };
    const recordId = String(body.recordId || "").trim();
    if (!recordId) return NextResponse.json({ error: "recordId is required" }, { status: 400 });

    const result = await raiseTravelSettlement(req, companyId, recordId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create settlement" },
      { status: error instanceof SettlementError ? 400 : 500 },
    );
  }
}
