import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { AI_TOOL_IDS, DASHBOARD_FEATURE_IDS, createDefaultDashboardFeatureFlags, resolveDashboardFeaturesForCompany } from "@/lib/dashboardFeatureRegistry";

function normalizeDashboardFeatureFlags(saved: Record<string, string[]> = {}) {
  const defaults = createDefaultDashboardFeatureFlags();
  const clean = (list: string[] | undefined, fallback: string[]) =>
    Array.isArray(list) ? list.filter((id) => DASHBOARD_FEATURE_IDS.includes(id)) : fallback;
  const get = (k: string) => saved[k] || saved[k.toLowerCase()];
  return {
    STARTER:    clean(get("STARTER"),    defaults.STARTER),
    PRO:        clean(get("PRO"),        defaults.PRO),
    ENTERPRISE: clean(get("ENTERPRISE"), defaults.ENTERPRISE),
    CUSTOM:     clean(get("CUSTOM"),     defaults.CUSTOM),
  };
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true, country: true, baseCurrency: true, businessType: true },
    });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    // No PKR branch here any more: page access is currency-neutral, so the
    // PKR_PLAN_CONFIG lookup this used to do had nothing left to contribute.
    const [planConfigLog, businessPlanModulesLog] = await Promise.all([
      prisma.activityLog.findFirst({ where: { action: "PLAN_CONFIG" }, orderBy: { createdAt: "desc" } }),
      prisma.activityLog.findFirst({
        where: { action: "BUSINESS_PLAN_MODULES_CONFIG" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      }).catch(() => null),
    ]);

    // Page access is not currency-specific — see the same note in
    // /api/me/bootstrap. The PKR config no longer carries a page list.
    let dashboardFlagsMap: Record<string, string[]>;
    if (planConfigLog?.details) {
      dashboardFlagsMap = normalizeDashboardFeatureFlags(JSON.parse(planConfigLog.details).dashboardFeatureFlags);
    } else {
      dashboardFlagsMap = normalizeDashboardFeatureFlags();
    }

    const planCode =
      String(company.plan || "STARTER").toUpperCase() === "PROFESSIONAL"
        ? "PRO"
        : String(company.plan || "STARTER").toUpperCase();

    // Same resolution the sidebar uses — a per-business-type assignment from
    // /admin/permissions wins over the plan-wide list from /admin/plans.
    let businessPageFlags: Record<string, Record<string, string[]>> | null = null;
    if (businessPlanModulesLog?.details) {
      try {
        businessPageFlags = JSON.parse(businessPlanModulesLog.details)?.pageConfig || null;
      } catch {}
    }

    const enabledFeatures = new Set(
      resolveDashboardFeaturesForCompany({
        businessType: String(company.businessType || ""),
        planCode,
        planFlags: dashboardFlagsMap,
        businessFlags: businessPageFlags,
      }) || []
    );

    const enabledAiTools = (AI_TOOL_IDS as readonly string[]).filter((id) => enabledFeatures.has(id));

    return NextResponse.json({ tools: enabledAiTools, plan: planCode });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
