import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";
import { getCharts, getExpenseBreakdown, getTodayStats, getDueThisWeek } from "@/lib/dashboardData";

// Below-the-fold dashboard widgets (charts, expense breakdown, today's
// stats, due-this-week). Fetched by the client after the critical
// /api/dashboard response has already rendered the main stat cards.
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const period = req.nextUrl.searchParams.get("period") || "month";

    const [allowed, branchId] = await Promise.all([
      apiHasPermission(userId, userRole, PERMISSIONS.VIEW_DASHBOARD, companyId),
      resolveBranchId(req, companyId),
    ]);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [charts, expenses, todayStats, dueData] = await Promise.all([
      getCharts(companyId, branchId, period),
      getExpenseBreakdown(companyId),
      getTodayStats(companyId, branchId),
      getDueThisWeek(companyId),
    ]);

    return NextResponse.json({ charts, expenses, todayStats, dueData }, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=45" },
    });
  } catch (e: any) {
    console.error("DASHBOARD SECONDARY API ERROR:", e);
    return NextResponse.json({ error: e.message || "Dashboard secondary failed" }, { status: 500 });
  }
}
