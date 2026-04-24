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
  { id: "plans",            label: "Plans",             href: "/admin/plans",               group: "Main",      short: "PL", icon: "layers" },
  { id: "business-modules", label: "Modules",           href: "/admin/business-modules",    group: "Main",      short: "BM", icon: "box" },

  // ── BUSINESS (exactly 4 items matching design) ────────────────────────────
  { id: "products",         label: "Products",          href: "/admin/products",            group: "Business",  short: "PR", icon: "box" },
  { id: "tax-rates",        label: "Tax Rates",         href: "/admin/tax-rates",           group: "Business",  short: "TX", icon: "list" },
  { id: "currencies",       label: "Currencies",        href: "/admin/currencies",          group: "Business",  short: "CU", icon: "globe" },
  { id: "payment-methods",  label: "Payment Methods",   href: "/admin/payment-methods",     group: "Business",  short: "PM", icon: "credit-card" },

  // ── ANALYTICS ─────────────────────────────────────────────────────────────
  { id: "revenue",          label: "Revenue",           href: "/admin/revenue",             group: "Analytics", short: "RV", icon: "chart" },
  { id: "geo",              label: "Geo Analytics",     href: "/admin/geo",                 group: "Analytics", short: "GE", icon: "globe" },
  { id: "usage",            label: "Usage Insights",    href: "/admin/usage",               group: "Analytics", short: "UG", icon: "pulse" },
  { id: "audit-trail",      label: "Audit Trail",       href: "/admin/audit-trail",         group: "Analytics", short: "AT", icon: "list" },
  { id: "web",              label: "Web Metrics",       href: "/admin/web",                 group: "Analytics", short: "WB", icon: "monitor" },

  // ── MARKETING ─────────────────────────────────────────────────────────────
  { id: "crm",              label: "CRM",               href: "/admin/crm",                 group: "Marketing", short: "CR", icon: "briefcase" },
  { id: "leads",            label: "Leads",             href: "/admin/leads",               group: "Marketing", short: "LD", icon: "target" },
  { id: "broadcasts",       label: "Broadcasts",        href: "/admin/broadcasts",          group: "Marketing", short: "BR", icon: "megaphone" },
  { id: "newsletter",       label: "Newsletter",        href: "/admin/newsletter",          group: "Marketing", short: "NL", icon: "mail" },
  { id: "social",           label: "Social",            href: "/admin/social",              group: "Marketing", short: "SO", icon: "share" },
  { id: "feedback",         label: "Feedback",          href: "/admin/feedback",            group: "Marketing", short: "FB", icon: "message" },
  { id: "testimonials",     label: "Testimonials",      href: "/admin/testimonials",        group: "Marketing", short: "TS", icon: "star" },

  // ── SYSTEM ────────────────────────────────────────────────────────────────
  { id: "settings",         label: "Settings",          href: "/admin/settings",            group: "System",    short: "ST", icon: "spark" },
  { id: "permissions",      label: "Roles & Permissions", href: "/admin/permissions",       group: "System",    short: "RP", icon: "lock" },
  { id: "email-logs",       label: "Email Logs",        href: "/admin/email-logs",          group: "System",    short: "EM", icon: "mail" },
  { id: "logs",             label: "Activity Logs",     href: "/admin/logs",                group: "System",    short: "LG", icon: "activity" },
  { id: "system",           label: "System Health",     href: "/admin/system",              group: "System",    short: "SY", icon: "shield" },
  { id: "backup-restore",   label: "Backup & Restore",  href: "/admin/backup-restore",      group: "System",    short: "BK", icon: "archive" },

  // ── OTHERS ────────────────────────────────────────────────────────────────
  { id: "feature-flags",    label: "Feature Flags",     href: "/admin/feature-flags",       group: "Others",    short: "FF", icon: "flag" },
  { id: "automation",       label: "Automation",        href: "/admin/automation",          group: "Others",    short: "AU", icon: "spark",  badge: "NEW" },
  { id: "web-settings",     label: "Web Settings",      href: "/admin/web-settings",        group: "Others",    short: "WS", icon: "monitor" },
  { id: "marketing-autopilot", label: "Autopilot",      href: "/admin/marketing-autopilot", group: "Others",    short: "AI", icon: "spark",  badge: "AI" },
  { id: "fraud",            label: "Fraud Monitor",     href: "/admin/fraud",               group: "Others",    short: "FR", icon: "alert" },
  { id: "dev-test",         label: "Dev Test",          href: "/admin/dev-test",            group: "Others",    short: "DV", icon: "code",   badge: "DEV" },
];

export const ADMIN_NAV_GROUP_ORDER = ["Main", "Business", "Analytics", "Marketing", "System", "Others"] as const;
