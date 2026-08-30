export type AdminNavItem = {
  id: string;
  label: string;
  href: string;
  group: string;
  short: string;
  icon?: string;
  badge?: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  // ── MAIN ──────────────────────────────────────────────────────────────────
  { id: "dashboard",        label: "Dashboard",        href: "/admin",                    group: "Main",      short: "DB", icon: "grid" },
  { id: "companies",        label: "Companies",         href: "/admin/companies",           group: "Main",      short: "CO", icon: "building" },
  { id: "users",            label: "Users",             href: "/admin/users",               group: "Main",      short: "US", icon: "users" },
  { id: "subscriptions",    label: "Subscriptions",     href: "/admin/subscriptions",       group: "Main",      short: "SB", icon: "credit-card" },
  { id: "invoices",         label: "Invoices",          href: "/admin/invoices",            group: "Main",      short: "IN", icon: "list", badge: "NEW" },
  { id: "plans",            label: "Plans",             href: "/admin/plans",               group: "Main",      short: "PL", icon: "layers" },
  { id: "business-modules", label: "Modules",           href: "/admin/business-modules",    group: "Main",      short: "BM", icon: "box" },
  // Sits beside Plans on purpose: Plans sets the rule for everyone on a plan,
  // this records the exceptions for one company.
  { id: "company-pages",    label: "Company Pages",     href: "/admin/company-pages",       group: "Main",      short: "CP", icon: "monitor" },

  // ── ANALYTICS ─────────────────────────────────────────────────────────────
  { id: "revenue",          label: "Revenue",           href: "/admin/revenue",             group: "Analytics", short: "RV", icon: "chart" },
  { id: "geo",              label: "Geo Analytics",     href: "/admin/geo",                 group: "Analytics", short: "GE", icon: "globe" },
  { id: "geo-countries",    label: "Countries",         href: "/admin/geo/countries",       group: "Analytics", short: "CT", icon: "globe" },
  { id: "signup-analytics", label: "Signup Analytics",  href: "/admin/signup-analytics",    group: "Analytics", short: "SA", icon: "chart" },
  { id: "funnel",           label: "Funnel Analysis",   href: "/admin/funnel",              group: "Analytics", short: "FN", icon: "chart", badge: "NEW" },
  { id: "usage",            label: "Usage Insights",    href: "/admin/usage",               group: "Analytics", short: "UG", icon: "pulse" },
  { id: "audit-trail",      label: "Audit Trail",       href: "/admin/audit-trail",         group: "Analytics", short: "AT", icon: "list" },
  { id: "web",              label: "Web Metrics",       href: "/admin/web",                 group: "Analytics", short: "WB", icon: "monitor" },

  // ── AI ────────────────────────────────────────────────────────────────────
  // Grouped together rather than filed under the area each one serves. They
  // share a shape — read the live data, rank it, draft the thing you would have
  // written by hand — and someone who wants "the AI that helps with X" looks for
  // the AI, not for X. AI Prospecting moved here from Marketing for the same
  // reason; its id and route are unchanged, so permissions carry over.
  { id: "prospecting",         label: "AI Prospecting",     href: "/admin/prospecting",           group: "AI", short: "AP", icon: "target",    badge: "AI" },
  { id: "migration-wizard",    label: "Migration Wizard",   href: "/admin/migration-wizard",      group: "AI", short: "MW", icon: "box",       badge: "AI" },
  { id: "support-copilot",     label: "Support Copilot",    href: "/admin/support-copilot",       group: "AI", short: "SC", icon: "message",   badge: "AI" },
  { id: "churn-radar",         label: "Churn Radar",        href: "/admin/churn-radar",           group: "AI", short: "CR", icon: "pulse",     badge: "AI" },
  { id: "upgrade-finder",      label: "Upgrade Finder",     href: "/admin/upgrade-finder",        group: "AI", short: "UF", icon: "layers",    badge: "AI" },
  { id: "demo-watchdog",       label: "Demo Watchdog",      href: "/admin/demo-watchdog",         group: "AI", short: "DW", icon: "target",    badge: "AI" },
  { id: "onboarding-assistant", label: "Onboarding Assist", href: "/admin/onboarding-assistant",  group: "AI", short: "OA", icon: "spark",     badge: "AI" },
  { id: "anomaly-watch",       label: "Anomaly Watch",      href: "/admin/anomaly-watch",         group: "AI", short: "AW", icon: "alert",     badge: "AI" },
  { id: "revenue-analyst",     label: "Revenue Analyst",    href: "/admin/revenue-analyst",       group: "AI", short: "RA", icon: "chart",     badge: "AI" },
  { id: "report-explainer",    label: "Report Explainer",   href: "/admin/report-explainer",      group: "AI", short: "RE", icon: "list",      badge: "AI" },
  { id: "feedback-miner",      label: "Feedback Miner",     href: "/admin/feedback-miner",        group: "AI", short: "FM", icon: "message",   badge: "AI" },
  { id: "objection-library",   label: "Objection Library",  href: "/admin/objection-library",     group: "AI", short: "OL", icon: "briefcase", badge: "AI" },
  { id: "case-study-generator", label: "Case Studies AI",   href: "/admin/case-study-generator",  group: "AI", short: "CS", icon: "star",      badge: "AI" },
  { id: "seo-engine",          label: "SEO / GEO Engine",   href: "/admin/seo-engine",            group: "AI", short: "SE", icon: "globe",     badge: "AI" },
  { id: "competitor-watch",    label: "Competitor Watch",   href: "/admin/competitor-watch",      group: "AI", short: "CW", icon: "monitor",   badge: "AI" },
  { id: "error-triage",        label: "Error Triage",       href: "/admin/error-triage",          group: "AI", short: "ET", icon: "code",      badge: "AI" },

  // ── MARKETING ─────────────────────────────────────────────────────────────
  { id: "crm",              label: "CRM",               href: "/admin/crm",                 group: "Marketing", short: "CR", icon: "briefcase" },
  { id: "leads",            label: "Leads",             href: "/admin/leads",               group: "Marketing", short: "LD", icon: "target" },
  { id: "broadcasts",       label: "Broadcasts",        href: "/admin/broadcasts",          group: "Marketing", short: "BR", icon: "megaphone" },
  { id: "newsletter",       label: "Newsletter",        href: "/admin/newsletter",          group: "Marketing", short: "NL", icon: "mail" },
  { id: "social",           label: "Social",            href: "/admin/social",              group: "Marketing", short: "SO", icon: "share" },
  { id: "feedback",         label: "All Feedback",      href: "/admin/feedback",            group: "Marketing", short: "FB", icon: "message" },
  // One route, scoped by ?type=. See SCOPES in app/admin/feedback/page.tsx.
  { id: "fb-reviews",       label: "Reviews",           href: "/admin/feedback?type=feedback",   group: "Marketing", short: "RV", icon: "star" },
  { id: "fb-complaints",    label: "Complaints",        href: "/admin/feedback?type=complaint",  group: "Marketing", short: "CP", icon: "message" },
  { id: "fb-suggestions",   label: "Suggestions",       href: "/admin/feedback?type=suggestion", group: "Marketing", short: "SG", icon: "message" },
  { id: "fb-bugs",          label: "Bug Reports",       href: "/admin/feedback?type=bug",        group: "Marketing", short: "BG", icon: "message" },
  { id: "testimonials",     label: "Testimonials",      href: "/admin/testimonials",        group: "Marketing", short: "TS", icon: "star" },
  { id: "affiliates",       label: "Affiliates",        href: "/admin/affiliates",          group: "Marketing", short: "AF", icon: "share" },
  { id: "referrals",        label: "Referrals",         href: "/admin/referrals",           group: "Marketing", short: "RF", icon: "users" },
  { id: "coupons",          label: "Coupons",           href: "/admin/coupons",             group: "Marketing", short: "CP", icon: "list" },
  { id: "updates",          label: "Product Updates",   href: "/admin/updates",             group: "Marketing", short: "UP", icon: "spark" },

  // ── SYSTEM ────────────────────────────────────────────────────────────────
  { id: "settings",         label: "Settings",          href: "/admin/settings",            group: "System",    short: "ST", icon: "spark" },
  // Plan access lives in Plans → Pages & Modules; this entry used to open a
  // second, overlapping screen at /admin/permissions.
  { id: "permissions",      label: "Roles & Permissions", href: "/admin/plans?tab=pages",   group: "System",    short: "RP", icon: "lock" },
  { id: "team",             label: "Admin Team",        href: "/admin/team",                group: "System",    short: "TM", icon: "users" },
  { id: "sessions",         label: "User Sessions",     href: "/admin/sessions",            group: "System",    short: "SS", icon: "users" },
  { id: "api-keys",         label: "API Keys",          href: "/admin/api-keys",            group: "System",    short: "AK", icon: "lock" },
  { id: "business-types",   label: "Business Types",    href: "/admin/business-types",      group: "System",    short: "BT", icon: "box" },
  { id: "email-logs",       label: "Email Logs",        href: "/admin/email-logs",          group: "System",    short: "EM", icon: "mail" },
  { id: "tickets",          label: "Support Tickets",   href: "/admin/tickets",             group: "System",    short: "TK", icon: "message" },
  { id: "support-inbox",    label: "Support Inbox",     href: "/admin/chat",                group: "System",    short: "SI", icon: "message", badge: "LIVE" },
  { id: "logs",             label: "Activity Logs",     href: "/admin/logs",                group: "System",    short: "LG", icon: "activity" },
  { id: "system",           label: "System Health",     href: "/admin/system",              group: "System",    short: "SY", icon: "shield" },
  { id: "uptime",           label: "Uptime",            href: "/admin/uptime",              group: "System",    short: "UP", icon: "activity" },
  { id: "security-incidents", label: "Security Incidents", href: "/admin/security-incidents",  group: "System",    short: "SC", icon: "alert" },
  { id: "admin-security",   label: "Admin Security",    href: "/admin/security",            group: "System",    short: "AS", icon: "lock" },
  { id: "backup-restore",   label: "Backup & Restore",  href: "/admin/backup-restore",      group: "System",    short: "BK", icon: "archive" },

  // ── OTHERS ────────────────────────────────────────────────────────────────
  { id: "feature-flags",    label: "Feature Flags",     href: "/admin/feature-flags",       group: "Others",    short: "FF", icon: "flag" },
  { id: "automation",       label: "Automation",        href: "/admin/automation",          group: "Others",    short: "AU", icon: "spark",  badge: "NEW" },
  { id: "page-visibility",   label: "Page Visibility",   href: "/admin/page-visibility",     group: "Others",    short: "PV", icon: "monitor" },
  { id: "web-settings",     label: "Web Settings",      href: "/admin/web-settings",        group: "Others",    short: "WS", icon: "monitor" },
  { id: "marketing-autopilot", label: "Autopilot",      href: "/admin/marketing-autopilot", group: "Others",    short: "AI", icon: "spark",  badge: "AI" },
  { id: "fraud",            label: "Fraud Monitor",     href: "/admin/fraud",               group: "Others",    short: "FR", icon: "alert" },
  { id: "dev-test",         label: "Dev Test",          href: "/admin/dev-test",            group: "Others",    short: "DV", icon: "code",   badge: "DEV" },
];

export const ADMIN_NAV_GROUP_ORDER = ["Main", "AI", "Analytics", "Marketing", "System", "Others"] as const;
