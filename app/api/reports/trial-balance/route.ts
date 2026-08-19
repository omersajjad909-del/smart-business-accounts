import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";
import { computeTrialBalance } from "@/lib/trialBalance";

export async function GET(req: NextRequest) {
  try {
    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const branchId = await resolveBranchId(req, companyId);

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_TRIAL_BALANCE_REPORT, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    // The arithmetic lives in lib/trialBalance.ts, shared with /api/trial-balance
    // so the two can never answer the same question differently again.
    const { rows, totals } = await computeTrialBalance({
      companyId,
      branchId,
      from: from ? new Date(from + "T00:00:00") : undefined,
      to:   to   ? new Date(to   + "T23:59:59.999") : undefined,
    });

    return NextResponse.json({ rows, totals });
  } catch (e) {
    console.error("TRIAL BALANCE ERROR:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
