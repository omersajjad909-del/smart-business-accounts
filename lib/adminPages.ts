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

/** Pages only a super admin may reach, however `allowedPages` is configured. */
export const SUPER_ADMIN_ONLY_PAGES = new Set<string>([
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
  ["/api/admin/geo/countries", "geo-countries"],
  ["/api/admin/geo", "geo"],
  ["/api/admin/companies", "companies"],
  ["/api/admin/users", "users"],
  ["/api/admin/gdpr", "users"],
  ["/api/admin/subscriptions", "subscriptions"],
  ["/api/admin/billing", "subscriptions"],
  ["/api/admin/invoices", "invoices"],
  ["/api/admin/pk-payments", "pk-payments"],
  ["/api/admin/pkr-plan-config", "plans"],
  ["/api/admin/plan-config", "plans"],
  ["/api/admin/custom-plans", "plans"],
  ["/api/admin/analyze-plan-modules", "plans"],
  ["/api/admin/sync-plan-permissions", "plans"],
  ["/api/admin/business-plan-modules", "business-modules"],
  ["/api/admin/business-modules", "business-modules"],
  ["/api/admin/module-prices", "business-modules"],
  ["/api/admin/product-categories", "products"],
  ["/api/admin/platform-currencies", "currencies"],
  ["/api/admin/payment-gateways", "payment-methods"],
  ["/api/admin/lemonsqueezy", "payment-methods"],
  ["/api/admin/signup-analytics", "signup-analytics"],
  ["/api/admin/funnel", "funnel"],
  ["/api/admin/usage", "usage"],
  ["/api/admin/audit-trail", "audit-trail"],
  ["/api/admin/visitors", "web"],
  ["/api/admin/web", "web"],
  ["/api/admin/leads", "leads"],
  ["/api/admin/prospecting", "prospecting"],
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
  return rest.split("/")[0];
}
