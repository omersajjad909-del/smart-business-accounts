/**
 * lib/adminPages.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Which admin console page does a given /api/admin/* route belong to?
 *
 * `AdminUser.allowedPages` has always existed, but it was only ever consulted
 * by the sidebar — the API accepted any admin cookie for any endpoint. A team
 * member limited to "Leads" could still call /api/admin/companies from the
 * console. This map is what lets `requireAdmin` enforce that list server-side.
 *
 * Page ids match `ADMIN_NAV_ITEMS[].id` in app/admin/admin-nav.ts, so a page
 * ticked in Admin Team is the same string checked here.
 */

/**
 * Page ids that were stored before the nav settled on its current spelling.
 *
 * `allowedPages` was only ever read by the sidebar, so a typo cost nothing and
 * a few rows carry ids that match no nav item. Now that the list is enforced,
 * those would silently lock the member out of pages they were granted — so the
 * old spellings are translated rather than dropped.
 */
const LEGACY_PAGE_IDS: Record<string, string> = {
  apikeys: "api-keys",
  flags: "feature-flags",
  emaillogs: "email-logs",
  featureflags: "feature-flags",
  businessmodules: "business-modules",
  businesstypes: "business-types",
  pagevisibility: "page-visibility",
  securityincidents: "security-incidents",
  signupanalytics: "signup-analytics",
  audittrail: "audit-trail",
  backuprestore: "backup-restore",
  websettings: "web-settings",
};

/** Canonicalise a stored `allowedPages` list to current nav ids. */
export function normalizeAllowedPages(pages: string[]): string[] {
  const out = new Set<string>();
  for (const raw of pages) {
    const id = String(raw).trim();
    if (!id) continue;
    out.add(LEGACY_PAGE_IDS[id.toLowerCase()] ?? id);
  }
  return [...out];
}

/** Pages only a super admin may reach, however `allowedPages` is configured. */
export const SUPER_ADMIN_ONLY_PAGES = new Set<string>([
  "admin-security", // who must type a page password, and what it is
  "team", // creating/disabling other admins
  "api-keys", // platform credentials
  "backup-restore", // full database export/import
  "dev-test", // sandbox launcher
]);

/**
 * First matching prefix wins, so longer paths are listed before their parents
 * (`geo/countries` before `geo`).
 *
 * A route absent from this map is treated as "super admin only" by
 * `adminPageForApiPath` returning null — fail closed, so a new endpoint is
 * never silently reachable by a scoped team member.
 */
const API_PATH_TO_PAGE: Array<[string, string]> = [
  // ── AI console ──
  // Each AI page owns exactly one endpoint of the same name, so a team member
  // granted "Churn Radar" can call the churn endpoint and nothing else. Missing
  // entries here fail closed to super-admin-only, which would have made every
  // one of these pages silently dead for scoped admins.
  ["/api/admin/prospecting", "prospecting"],
  ["/api/admin/market-scanner", "market-scanner"],
  ["/api/admin/migration-wizard", "migration-wizard"],
  ["/api/admin/support-copilot", "support-copilot"],
  ["/api/admin/churn-radar", "churn-radar"],
  ["/api/admin/upgrade-finder", "upgrade-finder"],
  ["/api/admin/demo-watchdog", "demo-watchdog"],
  ["/api/admin/onboarding-assistant", "onboarding-assistant"],
  ["/api/admin/anomaly-watch", "anomaly-watch"],
  ["/api/admin/revenue-analyst", "revenue-analyst"],
  ["/api/admin/report-explainer", "report-explainer"],
  ["/api/admin/feedback-miner", "feedback-miner"],
  ["/api/admin/objection-library", "objection-library"],
  ["/api/admin/case-study-generator", "case-study-generator"],
  ["/api/admin/seo-engine", "seo-engine"],
  ["/api/admin/competitor-watch", "competitor-watch"],
  ["/api/admin/error-triage", "error-triage"],

  ["/api/admin/geo/countries", "geo-countries"],
  ["/api/admin/geo", "geo"],
  ["/api/admin/companies", "companies"],
  ["/api/admin/users", "users"],
  ["/api/admin/gdpr", "users"],
  ["/api/admin/subscriptions", "subscriptions"],
  ["/api/admin/billing", "subscriptions"],
  ["/api/admin/invoices", "invoices"],
  ["/api/admin/pkr-plan-config", "plans"],
  ["/api/admin/plan-config", "plans"],
  ["/api/admin/custom-plans", "plans"],
  ["/api/admin/analyze-plan-modules", "plans"],
  ["/api/admin/sync-plan-permissions", "plans"],
  ["/api/admin/business-plan-modules", "business-modules"],
  ["/api/admin/business-modules", "business-modules"],
  ["/api/admin/module-prices", "business-modules"],
  ["/api/admin/signup-analytics", "signup-analytics"],
  ["/api/admin/funnel", "funnel"],
  ["/api/admin/usage", "usage"],
  ["/api/admin/audit-trail", "audit-trail"],
  ["/api/admin/visitors", "web"],
  ["/api/admin/web", "web"],
  ["/api/admin/leads", "leads"],
  ["/api/admin/broadcasts", "broadcasts"],
  ["/api/admin/newsletter", "newsletter"],
  ["/api/admin/social", "social"],
  ["/api/admin/feedback", "feedback"],
  ["/api/admin/testimonials", "testimonials"],
  ["/api/admin/affiliates", "affiliates"],
  ["/api/admin/referrals", "referrals"],
  ["/api/admin/coupons", "coupons"],
  ["/api/admin/updates", "updates"],
  ["/api/admin/marketing-autopilot", "marketing-autopilot"],
  ["/api/admin/automation-addon", "automation"],
  ["/api/admin/automation-stats", "automation"],
  ["/api/admin/feature-flags", "feature-flags"],
  ["/api/admin/page-visibility", "page-visibility"],
  ["/api/admin/fraud", "fraud"],
  ["/api/admin/security-incidents", "security-incidents"],
  ["/api/admin/security", "admin-security"],
  ["/api/admin/uptime", "uptime"],
  ["/api/admin/system", "system"],
  ["/api/admin/launch", "system"],
  ["/api/admin/email-logs", "email-logs"],
  ["/api/admin/tickets", "tickets"],
  ["/api/admin/sessions", "sessions"],
  ["/api/admin/business-types", "business-types"],
  ["/api/admin/api-keys", "api-keys"],
  ["/api/admin/team", "team"],
  ["/api/admin/settings", "settings"],
  ["/api/admin/send-test-welcome", "settings"],
  ["/api/admin/dashboard", "dashboard"],
  ["/api/admin/dev-test", "dev-test"],
  ["/api/admin/logs", "logs"],
];

/**
 * Endpoints every signed-in admin may call regardless of `allowedPages` —
 * their own profile and their own sign-out. Nothing here reads or writes
 * another account.
 */
const ALWAYS_ALLOWED: string[] = [
  "/api/admin/profile",
  "/api/admin/auth/",
  "/api/admin/notifications",
];

export function isAlwaysAllowedAdminApi(pathname: string): boolean {
  return ALWAYS_ALLOWED.some((p) => pathname.startsWith(p));
}

/**
 * Resolve an API path to the console page it belongs to.
 * `null` means "unmapped" — callers must treat that as super-admin-only.
 */
export function adminPageForApiPath(pathname: string): string | null {
  for (const [prefix, page] of API_PATH_TO_PAGE) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`)) {
      return page;
    }
  }
  return null;
}

/** Resolve a console *page* URL (/admin/leads) to its page id. */
export function adminPageForConsolePath(pathname: string): string {
  const rest = pathname.replace(/^\/admin\/?/, "").split("?")[0];
  if (!rest) return "dashboard";
  // Two-segment pages that have their own nav entry.
  if (rest.startsWith("geo/countries")) return "geo-countries";
  if (rest.startsWith("chat")) return "support-inbox";
  // /admin/security-incidents is its own page; /admin/security is the lock
  // screen, whose id is prefixed so it cannot be confused with the former.
  if (rest === "security" || rest.startsWith("security/")) return "admin-security";
  return rest.split("/")[0];
}
