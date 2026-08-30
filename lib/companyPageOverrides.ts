/**
 * Per-company page exceptions.
 *
 * Page access is decided by the plan and the business type — a Starter trading
 * company gets whatever /admin/plans → Pages & Modules says Starter trading
 * gets. That is the rule, and it stays the rule. But a rule needs exceptions:
 * one Starter customer negotiates Ledger, another loses a page they abused, and
 * neither should force a change to what every other Starter company sees.
 *
 * This is that exception layer, and deliberately nothing more. It does not
 * decide access on its own — it edits the answer the plan already gave, for one
 * company, and records why. The order is fixed and the whole design depends on
 * it:
 *
 *   1. plan × business-type grid   (/admin/plans → Pages & Modules)
 *   2. company overrides           (this file)
 *   3. global page-visibility hide (/admin/page-visibility)
 *
 * Global hide is last on purpose. It is the kill switch for a page that is
 * broken or retired, so no per-company exception may bring it back.
 *
 * Storage is an ActivityLog row per company, the same way every other admin
 * config in this codebase is stored — newest row wins.
 */

import { DASHBOARD_FEATURE_IDS, dashboardFeaturesForBusinessType } from "@/lib/dashboardFeatureRegistry";

export const COMPANY_PAGE_OVERRIDES_ACTION = "COMPANY_PAGE_OVERRIDES";

export type CompanyPageOverrideState = "on" | "off" | "default";

export type CompanyPageOverrides = {
  /** Pages forced on for this company even though the plan withholds them. */
  on: string[];
  /** Pages forced off for this company even though the plan grants them. */
  off: string[];
};

export const EMPTY_COMPANY_PAGE_OVERRIDES: CompanyPageOverrides = { on: [], off: [] };

const KNOWN_IDS = new Set(DASHBOARD_FEATURE_IDS);

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const raw of value) {
    const id = String(raw ?? "").trim();
    // A page that no longer exists in the registry is dropped rather than kept.
    // Stale ids outlive renames and would otherwise sit in the store forever,
    // showing up in counts for a page nobody can open.
    if (id && KNOWN_IDS.has(id)) seen.add(id);
  }
  return [...seen];
}

export function parseCompanyPageOverrides(details?: string | null): CompanyPageOverrides {
  if (!details) return EMPTY_COMPANY_PAGE_OVERRIDES;
  try {
    const parsed = JSON.parse(details) as { on?: unknown; off?: unknown };
    const on = cleanIds(parsed?.on);
    const offRaw = cleanIds(parsed?.off);
    // "On" wins if an id somehow landed in both — an explicit grant is the more
    // deliberate of the two, and leaving a page in both lists would make the
    // result depend on the order the lists happened to be read in.
    const onSet = new Set(on);
    return { on, off: offRaw.filter((id) => !onSet.has(id)) };
  } catch {
    return EMPTY_COMPANY_PAGE_OVERRIDES;
  }
}

export function hasAnyCompanyPageOverride(overrides: CompanyPageOverrides): boolean {
  return overrides.on.length > 0 || overrides.off.length > 0;
}

export function overrideStateFor(overrides: CompanyPageOverrides, featureId: string): CompanyPageOverrideState {
  if (overrides.on.includes(featureId)) return "on";
  if (overrides.off.includes(featureId)) return "off";
  return "default";
}

/** Move one page to a state, returning a fresh object. */
export function setCompanyPageOverride(
  overrides: CompanyPageOverrides,
  featureId: string,
  state: CompanyPageOverrideState,
): CompanyPageOverrides {
  const on = overrides.on.filter((id) => id !== featureId);
  const off = overrides.off.filter((id) => id !== featureId);
  if (state === "on") on.push(featureId);
  if (state === "off") off.push(featureId);
  return { on, off };
}

/**
 * Apply one company's exceptions to the list the plan produced.
 *
 * `features` arrives as null when no page grid has been saved at all, and null
 * means "no gate — show everything". Forcing a page off for such a company has
 * to turn that null into a real list first, otherwise the instruction is
 * quietly ignored; the list it becomes is what the business type owns, so
 * switching one page off cannot hand the company somebody else's pages.
 *
 * Forcing a page *on* never materialises a list: null already shows everything,
 * so there is nothing to add.
 */
export function applyCompanyPageOverrides(
  features: string[] | null,
  overrides: CompanyPageOverrides,
  businessType: string,
): string[] | null {
  if (!hasAnyCompanyPageOverride(overrides)) return features;

  let base = features;
  if (base === null) {
    if (overrides.off.length === 0) return null;
    base = dashboardFeaturesForBusinessType(businessType).map((f) => f.id);
  }

  const result = new Set(base);
  for (const id of overrides.on) result.add(id);
  for (const id of overrides.off) result.delete(id);
  return [...result];
}
