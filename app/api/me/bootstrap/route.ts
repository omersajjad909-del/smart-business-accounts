import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { resolvePlanPermissions, PLAN_DEFAULT_PERMISSIONS } from "@/lib/planPermissions";
import { DASHBOARD_FEATURE_IDS, createDefaultDashboardFeatureFlags, readSavedDashboardFeatureFlags, resolveDashboardFeaturesForCompany, healSavedFeatureList, healSavedPlanFeatureFlags, resolvePlanWideFeatureFlags } from "@/lib/dashboardFeatureRegistry";
import { BUSINESS_PHASE_CONFIG } from "@/lib/businessModules";
import { currencyByCountry } from "@/lib/currency";
import { getCompanyAdminControlSettings } from "@/lib/companyAdminControl";
import { needsTwoFactorEnrollment } from "@/lib/securityPolicy";

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

// Shared with /api/admin/business-plan-modules so the Pages & Modules grid and
// the dashboard sidebar resolve an unconfigured business type identically.
const normalizeDashboardFeatureFlags = resolvePlanWideFeatureFlags;

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
      pkrPlanConfigLog,
      pageVisibilityLog,
      businessModuleLog,
      shortcutsLog,
      adminControl,
      businessPlanModulesLog,
      pkrBusinessPlanModulesLog,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, email: true, role: true,
          defaultCompanyId: true, avatar: true,
          // Needed for the company 2FA-enforcement gate below.
          twoFactorEnabled: true,
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
        where: { action: "PKR_PLAN_CONFIG" },
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
      prisma.activityLog.findFirst({
        where: { action: "BUSINESS_PLAN_MODULES_CONFIG" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      }).catch(() => null),
      prisma.activityLog.findFirst({
        where: { action: "PKR_BUSINESS_PLAN_MODULES_CONFIG" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      }).catch(() => null),
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

    // Detect PKR company (Pakistan-based: baseCurrency=PKR or country=PK/Pakistan)
    const isPkrCompany =
      company.baseCurrency === "PKR" ||
      String(company.country || "").toUpperCase() === "PK" ||
      String(company.country || "").toLowerCase() === "pakistan";

    // Plan permissions stay Pakistan-specific — PKR companies use the admin-set
    // PKR permission list when one exists.
    let planPermsMap: Record<string, string[]>;
    const activeConfigLog = isPkrCompany && pkrPlanConfigLog ? pkrPlanConfigLog : planConfigLog;
    if (activeConfigLog?.details) {
      planPermsMap = normalizePlanPermissions(JSON.parse(activeConfigLog.details).planPermissions);
    } else {
      planPermsMap = normalizePlanPermissions();
    }

    // The plan-wide page grid is currency-neutral: /admin/plans writes it once
    // and its PKR tab deliberately posts no dashboardFeatureFlags ("page access
    // is set once for all currencies"). Reading it from whichever config won
    // above therefore handed every PKR company — every demo sandbox included,
    // since those are built as PK/PKR — an empty grid, and an empty grid widens
    // into "every page on". A PKR config that does carry a grid is still
    // honoured; only the "carries nothing" case falls through to the world one.
    const savedFeatureFlags =
      (isPkrCompany ? readSavedDashboardFeatureFlags(pkrPlanConfigLog?.details) : null) ??
      readSavedDashboardFeatureFlags(planConfigLog?.details);
    const dashboardFlagsMap: Record<string, string[]> = savedFeatureFlags
      ? normalizeDashboardFeatureFlags(savedFeatureFlags)
      : normalizeDashboardFeatureFlags();

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

    // Page access: a per-business-type assignment made in Plans → Pages &
    // Modules wins over the plan-wide list. Before this, the two screens
    // disagreed — /admin/permissions could not reach most pages at all.
    const readPageConfig = (details?: string | null) => {
      if (!details) return null;
      try {
        return (JSON.parse(details)?.pageConfig as Record<string, Record<string, string[]>>) || null;
      } catch {
        return null;
      }
    };
    const worldPageFlags = readPageConfig(businessPlanModulesLog?.details);
    const pkrPageFlags = readPageConfig(pkrBusinessPlanModulesLog?.details);
    // PKR keeps its own grid, but only where it has actually been filled in.
    // A business type the PKR grid says nothing about falls through to the
    // world grid instead of losing its page gate altogether — that hole is why
    // pages switched off for a business type still showed up in the demo, whose
    // sandboxes are all PK/PKR companies.
    const businessPageFlags = isPkrCompany ? pkrPageFlags : worldPageFlags;
    const fallbackPageFlags = isPkrCompany ? worldPageFlags : null;

    let dashboardFeatures = resolveDashboardFeaturesForCompany({
      businessType: String(company.businessType || ""),
      planCode,
      planFlags: dashboardFlagsMap,
      businessFlags: businessPageFlags,
      fallbackBusinessFlags: fallbackPageFlags,
    });

    // Global page-visibility hides apply on top of whichever list won.
    if (dashboardFeatures && pageVisibilityLog?.details) {
      try {
        const hidden = new Set(JSON.parse(pageVisibilityLog.details) as string[]);
        if (hidden.size > 0) dashboardFeatures = dashboardFeatures.filter(id => !hidden.has(id));
      } catch {}
    }

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

    // Company-wide 2FA policy. Reported here rather than blocking the login,
    // because Security & Access — the only screen where 2FA can be enrolled —
    // lives behind the login.
    const mustEnable2FA = await needsTwoFactorEnrollment(companyId, user.twoFactorEnabled === true);

    return NextResponse.json({
      user: safeUser,
      company: companyData,
      shortcuts,
      branches: filteredBranches,
      planPerms: planPerms.length > 0 ? planPerms : null,
      dashboardFeatures,
      moduleStatus,
      bizFeatures,
      isPkrCompany,
      mustEnable2FA,
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Bootstrap failed" }, { status: 500 });
  }
}
