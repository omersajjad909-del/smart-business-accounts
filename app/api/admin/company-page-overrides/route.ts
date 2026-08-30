/**
 * /api/admin/company-page-overrides
 *
 * GET  ?companyId=<companyNo|uuid>
 *      Every page this company's business type owns, with three facts each:
 *      what the plan says, what the admin has overridden, and what the company
 *      actually sees once both are applied.
 *
 * POST { companyId, id, state: "on" | "off" | "default" }   — move one page
 *      { companyId, action: "RESET" }                       — drop every override
 *
 * Storage: ActivityLog per company, action = COMPANY_PAGE_OVERRIDES, newest wins.
 *
 * This screen does not replace /admin/plans → Pages & Modules. That grid still
 * decides what a plan grants; this only records the exceptions for one company,
 * and the resolution order lives in lib/companyPageOverrides.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { resolveCompanyRef } from "@/lib/companyRefServer";
import {
  dashboardFeaturesForBusinessType,
  readSavedDashboardFeatureFlags,
  resolveDashboardFeaturesForCompany,
  resolvePlanWideFeatureFlags,
} from "@/lib/dashboardFeatureRegistry";
import {
  COMPANY_PAGE_OVERRIDES_ACTION,
  applyCompanyPageOverrides,
  overrideStateFor,
  parseCompanyPageOverrides,
  setCompanyPageOverride,
  type CompanyPageOverrideState,
} from "@/lib/companyPageOverrides";

const VALID_STATES: CompanyPageOverrideState[] = ["on", "off", "default"];

function readPageConfig(details?: string | null) {
  if (!details) return null;
  try {
    return (JSON.parse(details)?.pageConfig as Record<string, Record<string, string[]>>) || null;
  } catch {
    return null;
  }
}

async function loadCompanyContext(companyRef: string) {
  const companyId = await resolveCompanyRef(companyRef);
  if (!companyId) return null;

  const [company, planConfigLog, pkrPlanConfigLog, pageVisibilityLog, businessPlanModulesLog, pkrBusinessPlanModulesLog, overrideLog] =
    await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, companyNo: true, name: true, plan: true, businessType: true, baseCurrency: true, country: true },
      }),
      prisma.activityLog.findFirst({ where: { action: "PLAN_CONFIG" }, orderBy: { createdAt: "desc" }, select: { details: true } }).catch(() => null),
      prisma.activityLog.findFirst({ where: { action: "PKR_PLAN_CONFIG" }, orderBy: { createdAt: "desc" }, select: { details: true } }).catch(() => null),
      prisma.activityLog.findFirst({ where: { action: "PAGE_VISIBILITY_CONFIG" }, orderBy: { createdAt: "desc" }, select: { details: true } }).catch(() => null),
      prisma.activityLog.findFirst({ where: { action: "BUSINESS_PLAN_MODULES_CONFIG" }, orderBy: { createdAt: "desc" }, select: { details: true } }).catch(() => null),
      prisma.activityLog.findFirst({ where: { action: "PKR_BUSINESS_PLAN_MODULES_CONFIG" }, orderBy: { createdAt: "desc" }, select: { details: true } }).catch(() => null),
      prisma.activityLog
        .findFirst({ where: { companyId, action: COMPANY_PAGE_OVERRIDES_ACTION }, orderBy: { createdAt: "desc" }, select: { details: true } })
        .catch(() => null),
    ]);

  if (!company) return null;

  const isPkrCompany =
    company.baseCurrency === "PKR" ||
    String(company.country || "").toUpperCase() === "PK" ||
    String(company.country || "").toLowerCase() === "pakistan";

  const planCode = String(company.plan || "STARTER").toUpperCase() === "PROFESSIONAL"
    ? "PRO"
    : String(company.plan || "STARTER").toUpperCase();

  // Same order the dashboard itself resolves in — see /api/me/bootstrap, which
  // aliases resolvePlanWideFeatureFlags as normalizeDashboardFeatureFlags. This
  // screen has to agree with what the customer actually sees, so the two read
  // the same configs through the same functions.
  const savedFeatureFlags =
    (isPkrCompany ? readSavedDashboardFeatureFlags(pkrPlanConfigLog?.details) : null) ??
    readSavedDashboardFeatureFlags(planConfigLog?.details);
  const dashboardFlagsMap: Record<string, string[]> = savedFeatureFlags
    ? resolvePlanWideFeatureFlags(savedFeatureFlags)
    : resolvePlanWideFeatureFlags();

  const worldPageFlags = readPageConfig(businessPlanModulesLog?.details);
  const pkrPageFlags = readPageConfig(pkrBusinessPlanModulesLog?.details);

  const planAllowed = resolveDashboardFeaturesForCompany({
    businessType: String(company.businessType || ""),
    planCode,
    planFlags: dashboardFlagsMap,
    businessFlags: isPkrCompany ? pkrPageFlags : worldPageFlags,
    fallbackBusinessFlags: isPkrCompany ? worldPageFlags : null,
  });

  let globallyHidden = new Set<string>();
  if (pageVisibilityLog?.details) {
    try {
      globallyHidden = new Set(JSON.parse(pageVisibilityLog.details) as string[]);
    } catch {}
  }

  return {
    companyId,
    company,
    planCode,
    isPkrCompany,
    planAllowed,
    globallyHidden,
    overrides: parseCompanyPageOverrides(overrideLog?.details),
  };
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const ref = String(new URL(req.url).searchParams.get("companyId") || "").trim();
  if (!ref) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const ctx = await loadCompanyContext(ref);
  if (!ctx) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const { company, planAllowed, globallyHidden, overrides } = ctx;
  const businessType = String(company.businessType || "");
  const effective = applyCompanyPageOverrides(planAllowed, overrides, businessType);

  const features = dashboardFeaturesForBusinessType(businessType).map((f) => {
    const state = overrideStateFor(overrides, f.id);
    const hidden = globallyHidden.has(f.id);
    return {
      id: f.id,
      label: f.label,
      route: f.route,
      section: f.section,
      businessLabel: f.businessLabel,
      core: !!f.core,
      // Null plan list means no grid was ever saved, which reads as "allow all".
      allowedByPlan: planAllowed === null ? true : planAllowed.includes(f.id),
      override: state,
      // The global kill switch is applied after everything, so a page hidden
      // there is off no matter what this screen says.
      globallyHidden: hidden,
      effective: hidden ? false : effective === null ? true : effective.includes(f.id),
    };
  });

  return NextResponse.json({
    company: {
      id: company.id,
      companyNo: company.companyNo,
      name: company.name,
      plan: ctx.planCode,
      businessType,
      isPkrCompany: ctx.isPkrCompany,
    },
    features,
    overrides,
    planGridSaved: planAllowed !== null,
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => null);
  const ref = String(body?.companyId || "").trim();
  if (!ref) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const ctx = await loadCompanyContext(ref);
  if (!ctx) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const action = String(body?.action || "SET").toUpperCase();
  let next = ctx.overrides;

  if (action === "RESET") {
    next = { on: [], off: [] };
  } else {
    const id = String(body?.id || "").trim();
    const state = String(body?.state || "").trim() as CompanyPageOverrideState;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (!VALID_STATES.includes(state)) {
      return NextResponse.json({ error: `state must be one of ${VALID_STATES.join(", ")}` }, { status: 400 });
    }
    const owned = new Set(dashboardFeaturesForBusinessType(String(ctx.company.businessType || "")).map((f) => f.id));
    // Turning on a page this trade does not own would put a link in the sidebar
    // that the route guard then bounces, so it is refused here rather than
    // half-working later.
    if (!owned.has(id)) {
      return NextResponse.json({ error: "That page does not belong to this business type" }, { status: 400 });
    }
    next = setCompanyPageOverride(ctx.overrides, id, state);
  }

  await prisma.activityLog.create({
    data: {
      companyId: ctx.companyId,
      userId: admin.id,
      action: COMPANY_PAGE_OVERRIDES_ACTION,
      details: JSON.stringify(next),
    },
  });

  await logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "COMPANY_PAGE_OVERRIDE",
    targetType: "Company",
    targetId: ctx.companyId,
    targetLabel: ctx.company.name,
    companyId: ctx.companyId,
    details: { action, id: body?.id ?? null, state: body?.state ?? null, on: next.on.length, off: next.off.length },
  }).catch(() => {});

  return NextResponse.json({ ok: true, overrides: next });
}
