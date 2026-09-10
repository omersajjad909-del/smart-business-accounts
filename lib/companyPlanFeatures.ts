/**
 * "Is this one page switched on for this one company?" — answered on the
 * server, from the same configs the dashboard itself resolves from.
 *
 * /api/me/bootstrap already works this out for the whole sidebar and hands the
 * list to the browser, so anything running in the browser should read that
 * list rather than come here. This exists for the other direction: an API route
 * that has to enforce a page gate before it writes, and therefore cannot take
 * the browser's word for it.
 *
 * The order matches bootstrap's exactly — plan-wide grid, then the per-business
 * type grid, then the company's own agreed exceptions, then the global hide
 * list last so a page retired platform-wide cannot be revived by any of them.
 * If that order ever changes there, it has to change here too; the two are kept
 * honest by both going through lib/dashboardFeatureRegistry.
 */

import { prisma } from "@/lib/prisma";
import {
  readSavedDashboardFeatureFlags,
  resolveDashboardFeaturesForCompany,
  resolvePlanWideFeatureFlags,
} from "@/lib/dashboardFeatureRegistry";
import {
  COMPANY_PAGE_OVERRIDES_ACTION,
  applyCompanyPageOverrides,
  parseCompanyPageOverrides,
} from "@/lib/companyPageOverrides";

function readPageConfig(details?: string | null) {
  if (!details) return null;
  try {
    return (JSON.parse(details)?.pageConfig as Record<string, Record<string, string[]>>) || null;
  } catch {
    return null;
  }
}

/** Every dashboard feature id this company is entitled to, or null if unknown. */
export async function resolveCompanyDashboardFeatures(companyId: string): Promise<string[] | null> {
  const [company, planConfigLog, pkrPlanConfigLog, pageVisibilityLog, businessPlanModulesLog, pkrBusinessPlanModulesLog, overrideLog] =
    await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { plan: true, businessType: true, baseCurrency: true, country: true },
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

  // A PKR grid that carries nothing falls through to the world one rather than
  // widening into "every page on" — the hole that used to show demo sandboxes
  // pages their business type had switched off.
  const savedFeatureFlags =
    (isPkrCompany ? readSavedDashboardFeatureFlags(pkrPlanConfigLog?.details) : null) ??
    readSavedDashboardFeatureFlags(planConfigLog?.details);
  const planFlags = savedFeatureFlags
    ? resolvePlanWideFeatureFlags(savedFeatureFlags)
    : resolvePlanWideFeatureFlags();

  const worldPageFlags = readPageConfig(businessPlanModulesLog?.details);
  const pkrPageFlags = readPageConfig(pkrBusinessPlanModulesLog?.details);

  let features = resolveDashboardFeaturesForCompany({
    businessType: String(company.businessType || ""),
    planCode,
    planFlags,
    businessFlags: isPkrCompany ? pkrPageFlags : worldPageFlags,
    fallbackBusinessFlags: isPkrCompany ? worldPageFlags : null,
  });

  features = applyCompanyPageOverrides(
    features,
    parseCompanyPageOverrides(overrideLog?.details),
    String(company.businessType || ""),
  );

  // Null means "no restriction configured", which callers read as full access.
  if (!features) return null;

  if (pageVisibilityLog?.details) {
    try {
      const hidden = new Set(JSON.parse(pageVisibilityLog.details) as string[]);
      if (hidden.size > 0) features = features.filter((id) => !hidden.has(id));
    } catch {}
  }

  return features;
}

/**
 * True only when the company's resolved list actually names `featureId`.
 *
 * Note the direction: elsewhere a null list means "no restriction configured"
 * and is read as full access. Here it is read as no. This is the check an API
 * route makes before letting a gated module write, and for a module that ships
 * switched off, an unreadable config must not be the thing that switches it on.
 */
export async function companyOwnsDashboardFeature(companyId: string, featureId: string): Promise<boolean> {
  const features = await resolveCompanyDashboardFeatures(companyId);
  return Array.isArray(features) && features.includes(featureId);
}
