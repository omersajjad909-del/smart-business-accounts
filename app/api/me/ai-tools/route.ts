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

    // Page access IS currency-specific — /admin/plans keeps two independent
    // grids, "Pages & Modules" for the world and "PKR Pages & Modules" for
    // Pakistan, each writing its own config. This route used to read the world
    // keys only, so every toggle a Pakistani company's admin flipped in the PKR
    // grid was ignored here and the AI tab stayed on screen after being turned
    // off. Resolution below mirrors /api/me/bootstrap exactly — the two must
    // agree or the sidebar and the AI tab bar disagree about the same page.
    const [planConfigLog, pkrPlanConfigLog, businessPlanModulesLog, pkrBusinessPlanModulesLog, pageVisibilityLog] =
      await Promise.all([
        prisma.activityLog.findFirst({ where: { action: "PLAN_CONFIG" }, orderBy: { createdAt: "desc" }, select: { details: true } }).catch(() => null),
        prisma.activityLog.findFirst({ where: { action: "PKR_PLAN_CONFIG" }, orderBy: { createdAt: "desc" }, select: { details: true } }).catch(() => null),
        prisma.activityLog.findFirst({ where: { action: "BUSINESS_PLAN_MODULES_CONFIG" }, orderBy: { createdAt: "desc" }, select: { details: true } }).catch(() => null),
        prisma.activityLog.findFirst({ where: { action: "PKR_BUSINESS_PLAN_MODULES_CONFIG" }, orderBy: { createdAt: "desc" }, select: { details: true } }).catch(() => null),
        prisma.activityLog.findFirst({ where: { action: "PAGE_VISIBILITY_CONFIG" }, orderBy: { createdAt: "desc" }, select: { details: true } }).catch(() => null),
      ]);

    const isPkrCompany =
      company.baseCurrency === "PKR" ||
      String(company.country || "").toUpperCase() === "PK" ||
      String(company.country || "").toLowerCase() === "pakistan";

    const activeConfigLog = isPkrCompany && pkrPlanConfigLog ? pkrPlanConfigLog : planConfigLog;

    let dashboardFlagsMap: Record<string, string[]>;
    if (activeConfigLog?.details) {
      dashboardFlagsMap = normalizeDashboardFeatureFlags(JSON.parse(activeConfigLog.details).dashboardFeatureFlags);
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
    const activePageModulesLog =
      isPkrCompany && pkrBusinessPlanModulesLog ? pkrBusinessPlanModulesLog : businessPlanModulesLog;
    if (activePageModulesLog?.details) {
      try {
        businessPageFlags = JSON.parse(activePageModulesLog.details)?.pageConfig || null;
      } catch {}
    }

    let resolved = resolveDashboardFeaturesForCompany({
      businessType: String(company.businessType || ""),
      planCode,
      planFlags: dashboardFlagsMap,
      businessFlags: businessPageFlags,
    });

    // Global page-visibility hides apply on top of whichever list won, exactly
    // as in /api/me/bootstrap.
    if (resolved && pageVisibilityLog?.details) {
      try {
        const hidden = new Set(JSON.parse(pageVisibilityLog.details) as string[]);
        if (hidden.size > 0) resolved = resolved.filter((id) => !hidden.has(id));
      } catch {}
    }

    // `null` means no page config has ever been saved — that is the only case
    // where "no list" means full access. A saved list that grants zero AI tools
    // is a real answer and must be returned as an empty array, not widened.
    if (!resolved) {
      return NextResponse.json({ tools: [...AI_TOOL_IDS], plan: planCode, restricted: false });
    }

    const enabledFeatures = new Set(resolved);
    const enabledAiTools = (AI_TOOL_IDS as readonly string[]).filter((id) => enabledFeatures.has(id));

    return NextResponse.json({ tools: enabledAiTools, plan: planCode, restricted: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
