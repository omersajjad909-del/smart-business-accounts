import { NextRequest, NextResponse } from "next/server";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { buildSmartReconciliationSuggestions } from "@/lib/smartReconciliation";
import { resolveCompanyId } from "@/lib/tenant";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const allowed = await apiHasPermission(
      req.headers.get("x-user-id"),
      req.headers.get("x-user-role"),
      PERMISSIONS.BANK_RECONCILIATION,
      companyId,
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bankAccountId = req.nextUrl.searchParams.get("bankAccountId");
    const suggestions = await buildSmartReconciliationSuggestions(companyId, bankAccountId);
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      suggestions,
      summary: {
        total: suggestions.length,
        highConfidence: suggestions.filter((item) => item.candidates[0]?.confidence >= 90).length,
        needsReview: suggestions.filter((item) => item.risk === "high").length,
      },
    });
  } catch (error) {
    console.error("AI reconciliation error:", error);
    return NextResponse.json({ error: "Failed to build reconciliation suggestions" }, { status: 500 });
  }
}
