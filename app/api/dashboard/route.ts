import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { currencyByCountry } from "@/lib/currency";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";
import { getSummary } from "@/lib/dashboardData";

// Critical-path dashboard data only (company + summary stat cards).
// Charts / expense breakdown / today's stats / due-this-week are fetched
// separately from /api/dashboard/secondary so the main stat cards can
// render without waiting on those heavier, below-the-fold queries.
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

    const [company, branches, summary] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          country: true,
          baseCurrency: true,
          plan: true,
          subscriptionStatus: true,
          activeModules: true,
          businessType: true,
          businessSetupDone: true,
          logoUrl: true,
        },
      }),
      prisma.branch.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      }),
      getSummary(companyId, branchId, period),
    ]);

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    return NextResponse.json({
      company: {
        ...company,
        baseCurrency: company.baseCurrency || currencyByCountry(company.country || "Pakistan"),
      },
      businessType: {
        businessType: company.businessType,
        businessSetupDone: company.businessSetupDone,
        name: company.name,
      },
      branches,
      summary,
    }, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=45" },
    });
  } catch (e: any) {
    console.error("DASHBOARD API ERROR:", e);
    return NextResponse.json({ error: e.message || "Dashboard failed" }, { status: 500 });
  }
}
