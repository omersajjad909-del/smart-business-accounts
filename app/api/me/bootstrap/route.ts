import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { resolvePlanPermissions, PLAN_DEFAULT_PERMISSIONS } from "@/lib/planPermissions";
import { DASHBOARD_FEATURE_IDS, createDefaultDashboardFeatureFlags } from "@/lib/dashboardFeatureRegistry";
import { BUSINESS_PHASE_CONFIG } from "@/lib/businessModules";
import { currencyByCountry } from "@/lib/currency";
import { getCompanyAdminControlSettings } from "@/lib/companyAdminControl";

const DEFAULT_SHORTCUTS = [
  { id: "search",    keys: ["Alt","S"], label: "Global Search",     action: "focus_search",  enabled: true },
  { id: "sidebar",   keys: ["Alt","B"], label: "Toggle Sidebar",    action: "toggle_sidebar", enabled: true },
  { id: "invoice",   keys: ["Alt","I"], label: "New Sales Invoice",  action: "navigate", route: "/dashboard/sales-invoice",   enabled: true },
  { id: "purchase",  keys: ["Alt","P"], label: "Purchase Invoice",   action: "navigate", route: "/dashboard/purchase-invoice", enabled: true },
  { id: "dashboard", keys: ["Alt","H"], label: "Dashboard",          action: "navigate", route: "/dashboard",                  enabled: true },
  { id: "inventory", keys: ["Alt","V"], label: "Inventory",          action: "navigate", route: "/dashboard/inventory",        enabled: true },
];

function normalizePlanPermissions(saved: Record<string, string[]> = {}) {
  const get = (k: string): string[] => saved[k] || saved[k.toLowerCase()] || [];
  const hasAny = ["STARTER","PRO","ENTERPRISE","CUSTOM"].some(k => Array.isArray(get(k)) && get(k).length > 0);
  if (!hasAny) {
    return {
      STARTER: PLAN_DEFAULT_PERMISSIONS.STARTER as string[],
      PRO: PLAN_DEFAULT_PERMISSIONS.PRO as string[],
      ENTERPRISE: PLAN_DEFAULT_PERMISSIONS.ENTERPRISE as string[],
      CUSTOM: [],
    };
  }
  return { STARTER: get("STARTER"), PRO: get("PRO"), ENTERPRISE: get("ENTERPRISE"), CUSTOM: get("CUSTOM") };
}

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

function computeModuleStatus(overrides: Record<string, string>) {
  const statusMap: Record<string, "live" | "coming_soon"> = {};
  const enabledTypes: string[] = [];
  for (const [id, cfg] of Object.entries(BUSINESS_PHASE_CONFIG)) {
    const effective = overrides[id] || (cfg as any).status;
    const isLive = effective === "live" || effective === "beta";
    statusMap[id] = isLive ? "live" : "coming_soon";
    if (isLive) enabledTypes.push(id);
  }
  return { enabledTypes, statusMap };
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyJwt(token);
    if (!payload?.userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const userId = payload.userId;
    const companyId = payload.companyId || null;
    if (!companyId) return NextResponse.json({ error: "No company context" }, { status: 400 });

    // All DB queries in parallel — one round-trip instead of 8+ client HTTP calls
    const [
      user,
      companiesRaw,
      company,
      branches,
      planConfigLog,
      pageVisibilityLog,
      businessModuleLog,
      shortcutsLog,
      adminControl,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, email: true, role: true,
          defaultCompanyId: true, avatar: true,
          permissions: { select: { permission: true, companyId: true } },
        },
      }),
      prisma.userCompany.findMany({
        where: { userId },
        include: { company: { select: { id: true, name: true, code: true } } },
      }).catch(() => [] as any[]),
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true, name: true, country: true, baseCurrency: true,
          plan: true, subscriptionStatus: true, activeModules: true,
          currentPeriodEnd: true, businessType: true, businessSetupDone: true,
          logoUrl: true, createdAt: true,
        },
      }),
      prisma.branch.findMany({
        where: { companyId, isActive: true },
        select: { id: true, code: true, name: true, city: true, isActive: true },
        orderBy: { name: "asc" },
      }).catch(() => [] as any[]),
      prisma.activityLog.findFirst({
        where: { action: "PLAN_CONFIG" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      }).catch(() => null),
      prisma.activityLog.findFirst({
        where: { action: "PAGE_VISIBILITY_CONFIG" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      }).catch(() => null),
      prisma.activityLog.findFirst({
        where: { action: "BUSINESS_MODULE_CONFIG" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      }).catch(() => null),
      prisma.activityLog.findFirst({
        where: { companyId, action: "COMPANY_SHORTCUTS_V1" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      }).catch(() => null),
      getCompanyAdminControlSettings(companyId).catch(() => null),
    ]);

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    // Build user object
    const userPermissions = (user.permissions || [])
      .filter((p: any) => !companyId || p.companyId === companyId)
      .map((p: any) => p.permission);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role || "VIEWER").toUpperCase(),
      companyId,
      avatar: user.avatar || null,
      permissions: userPermissions,
      rolePermissions: [] as string[],
      companies: (companiesRaw as any[]).map((c: any) => ({
        id: c.companyId,
        name: c.company?.name,
        code: c.company?.code,
        isDefault: c.isDefault,
      })),
    };

    // Company data
    const baseCurrency = company.baseCurrency || currencyByCountry(company.country);
    const companyData = { ...company, baseCurrency };

    // Shortcuts
    let shortcuts: any[] = DEFAULT_SHORTCUTS;
    if (shortcutsLog?.details) {
      try {
        const parsed = JSON.parse(shortcutsLog.details);
        if (Array.isArray(parsed)) shortcuts = parsed;
      } catch {}
    }

    // Plan config: permissions + dashboard features
    let planPermsMap: Record<string, string[]>;
    let dashboardFlagsMap: Record<string, string[]>;
    if (planConfigLog?.details) {
      const saved = JSON.parse(planConfigLog.details);
      planPermsMap = normalizePlanPermissions(saved.planPermissions);
      dashboardFlagsMap = normalizeDashboardFeatureFlags(saved.dashboardFeatureFlags);
    } else {
      planPermsMap = normalizePlanPermissions();
      dashboardFlagsMap = normalizeDashboardFeatureFlags();
    }

    // Apply global page visibility overrides
    if (pageVisibilityLog?.details) {
      try {
        const hidden = new Set(JSON.parse(pageVisibilityLog.details) as string[]);
        if (hidden.size > 0) {
          for (const plan of Object.keys(dashboardFlagsMap)) {
            dashboardFlagsMap[plan] = dashboardFlagsMap[plan].filter(id => !hidden.has(id));
          }
        }
      } catch {}
    }

    // Resolve for this company's plan
    const planCode = String(company.plan || "STARTER").toUpperCase() === "PROFESSIONAL"
      ? "PRO"
      : String(company.plan || "STARTER").toUpperCase();

    const planPerms = resolvePlanPermissions({
      plan: company.plan,
      configuredPlanPermissions: planPermsMap,
      activeModules: company.activeModules,
    });

    const dashboardFeatures =
      dashboardFlagsMap[planCode] ||
      dashboardFlagsMap[planCode.toLowerCase()] ||
      null;

    // Business module status
    let moduleOverrides: Record<string, string> = {};
    if (businessModuleLog?.details) {
      try { moduleOverrides = JSON.parse(businessModuleLog.details); } catch {}
    }
    const moduleStatus = computeModuleStatus(moduleOverrides);

    // Branches: filter by assignment for non-admin users
    const isAdmin = safeUser.role === "ADMIN";
    const bizFeatures = (adminControl as any)?.features || {};
    let filteredBranches = branches as any[];
    if (!isAdmin && adminControl) {
      const assignments: Record<string, string[]> = (adminControl as any)?.branchAssignments || {};
      const allowedIds = assignments[userId] || [];
      if (allowedIds.length > 0) {
        filteredBranches = filteredBranches.filter((b: any) => allowedIds.includes(b.id));
      }
    }

    return NextResponse.json({
      user: safeUser,
      company: companyData,
      shortcuts,
      branches: filteredBranches,
      planPerms: planPerms.length > 0 ? planPerms : null,
      dashboardFeatures,
      moduleStatus,
      bizFeatures,
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Bootstrap failed" }, { status: 500 });
  }
}
