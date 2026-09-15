/**
 * Pages a company has chosen not to use.
 *
 * Not the same thing as what a company is *allowed*, and the difference is the
 * whole point of the file. Entitlement is decided by three layers that belong
 * to us — the plan × business grid, per-company admin exceptions, and the
 * global kill switch. This is a fourth layer that belongs to the customer: a
 * trading company that never does job work switching the page off so their
 * sidebar stops carrying it.
 *
 *   1. plan × business-type grid   (/admin/plans → Pages & Modules)
 *   2. company overrides           (lib/companyPageOverrides.ts)
 *   3. global page-visibility hide (/admin/page-visibility)
 *   4. the customer's own choice   (this file)
 *
 * Last, because it can only ever subtract from what the first three allowed.
 * Turning a page on here cannot grant it — there is no "on" list, only
 * `hidden`, so a preference can never widen access however it is edited.
 *
 * Applied to the navigation and the route guard, deliberately NOT to
 * `companyOwnsDashboardFeature`. That function is the gate a module's own API
 * checks before it writes, and a page the customer has tidied out of their
 * sidebar is still a page they are paying for: hiding Job Work must not start
 * refusing job work API calls that some other screen makes on their behalf.
 * Preference is about what is on screen; entitlement is about what is allowed.
 *
 * Storage is an ActivityLog row per company, newest wins — the same way every
 * other config in this codebase is stored.
 */

import { DASHBOARD_FEATURE_IDS } from "@/lib/dashboardFeatureRegistry";

export const COMPANY_PAGE_PREFS_ACTION = "COMPANY_PAGE_PREFS";

export type CompanyPagePrefs = {
  /** Feature ids the customer has switched off for themselves. */
  hidden: string[];
};

export const EMPTY_COMPANY_PAGE_PREFS: CompanyPagePrefs = { hidden: [] };

const KNOWN_IDS = new Set(DASHBOARD_FEATURE_IDS);

/**
 * Pages a customer may not switch off.
 *
 * The Settings pages, because the screen that undoes all this lives among
 * them: a customer able to hide the way back has locked themselves out of
 * their own workspace and has to ring support to be let in again.
 *
 * The dashboard itself needs no entry — it is not a registry feature, and the
 * route guard lets `/dashboard` through by name. The preferences screen is
 * likewise deliberately absent from the registry, so there is no id by which
 * it could ever be hidden.
 */
const NEVER_HIDEABLE = new Set([
  "CORE_SETTINGS_APPEARANCE",
  "CORE_SETTINGS_HOLIDAYS",
]);

export function isPageHideable(featureId: string): boolean {
  return !NEVER_HIDEABLE.has(featureId);
}

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const raw of value) {
    const id = String(raw ?? "").trim();
    // Unknown ids are dropped rather than kept: a page that has been renamed
    // or retired would otherwise sit in the store for ever, counting towards
    // a total for something nobody can open.
    if (id && KNOWN_IDS.has(id) && isPageHideable(id)) seen.add(id);
  }
  return [...seen];
}

export function parseCompanyPagePrefs(details?: string | null): CompanyPagePrefs {
  if (!details) return EMPTY_COMPANY_PAGE_PREFS;
  try {
    const parsed = JSON.parse(details) as { hidden?: unknown };
    return { hidden: cleanIds(parsed?.hidden) };
  } catch {
    return EMPTY_COMPANY_PAGE_PREFS;
  }
}

export function serializeCompanyPagePrefs(prefs: CompanyPagePrefs): string {
  return JSON.stringify({ hidden: cleanIds(prefs.hidden) });
}

/**
 * Removes the customer's hidden pages from an already-decided list.
 *
 * `null` in means no restriction was configured at all, and stays `null` — a
 * preference must not be the thing that turns an unrestricted workspace into a
 * restricted one.
 */
export function applyCompanyPagePrefs(
  features: string[] | null,
  prefs: CompanyPagePrefs,
): string[] | null {
  if (!features || !prefs.hidden.length) return features;
  const hidden = new Set(prefs.hidden.filter(isPageHideable));
  if (!hidden.size) return features;
  return features.filter((id) => !hidden.has(id));
}
