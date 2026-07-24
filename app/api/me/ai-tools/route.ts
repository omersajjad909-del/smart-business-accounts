import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { AI_TOOL_IDS, DASHBOARD_FEATURE_IDS, createDefaultDashboardFeatureFlags } from "@/lib/dashboardFeatureRegistry";

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
      select: { plan: true, country: true, baseCurrency: true },
    });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const isPkr =
      company.baseCurrency === "PKR" ||
      String(company.country || "").toUpperCase() === "PK" ||
      String(company.country || "").toLowerCase() === "pakistan";

    const [planConfigLog, pkrPlanConfigLog] = await Promise.all([
      prisma.activityLog.findFirst({ where: { action: "PLAN_CONFIG" }, orderBy: { createdAt: "desc" } }),
      isPkr
        ? prisma.activityLog.findFirst({ where: { action: "PKR_PLAN_CONFIG" }, orderBy: { createdAt: "desc" } })
        : Promise.resolve(null),
    ]);

    const activeLog = isPkr && pkrPlanConfigLog ? pkrPlanConfigLog : planConfigLog;
    let dashboardFlagsMap: Record<string, string[]>;
    if (activeLog?.details) {
      const saved = JSON.parse(activeLog.details);
      dashboardFlagsMap = normalizeDashboardFeatureFlags(saved.dashboardFeatureFlags);
    } else {
      dashboardFlagsMap = normalizeDashboardFeatureFlags();
    }

    const planCode =
      String(company.plan || "STARTER").toUpperCase() === "PROFESSIONAL"
        ? "PRO"
        : String(company.plan || "STARTER").toUpperCase();

    const enabledFeatures = new Set(
      dashboardFlagsMap[planCode] || dashboardFlagsMap[planCode.toLowerCase()] || []
    );

    const enabledAiTools = (AI_TOOL_IDS as readonly string[]).filter((id) => enabledFeatures.has(id));

    return NextResponse.json({ tools: enabledAiTools, plan: planCode });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
