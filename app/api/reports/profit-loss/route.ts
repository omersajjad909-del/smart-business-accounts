import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";
import { requireEntitlement } from "@/lib/subscriptionGuard";
import { computeProfitLoss } from "@/lib/profitLoss";

export async function GET(req: NextRequest) {
  try {
    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");
    const fromDate = from ? new Date(from + "T00:00:00") : new Date("2000-01-01");
    const toDate   = to   ? new Date(to   + "T23:59:59.999") : new Date();

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const branchId = await resolveBranchId(req, companyId);

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_PROFIT_LOSS_REPORT, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const sub = await requireEntitlement(req, "advancedReports");
    if (sub) return sub;

    return NextResponse.json(await computeProfitLoss({ companyId, branchId, fromDate, toDate }));
  } catch (e) {
    console.error("P&L ERROR:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
