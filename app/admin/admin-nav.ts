export type AdminNavItem = {
  id: string;
  label: string;
  href: string;
  group: string;
  short: string;
  badge?: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/admin", group: "Overview", short: "DB" },
  { id: "companies", label: "Companies", href: "/admin/companies", group: "Core", short: "CO" },
  { id: "users", label: "Users", href: "/admin/users", group: "Core", short: "US" },
  { id: "subscriptions", label: "Subscriptions", href: "/admin/subscriptions", group: "Core", short: "SB" },
  { id: "plans", label: "Plans", href: "/admin/plans", group: "Core", short: "PL" },
  { id: "permissions", label: "Permissions", href: "/admin/permissions", group: "Core", short: "PM" },
  { id: "business-modules", label: "Modules", href: "/admin/business-modules", group: "Core", short: "BM" },
  { id: "revenue", label: "Revenue", href: "/admin/revenue", group: "Analytics", short: "RV" },
  { id: "geo", label: "Geo Analytics", href: "/admin/geo", group: "Analytics", short: "GE" },
  { id: "usage", label: "Usage Insights", href: "/admin/usage", group: "Analytics", short: "UG" },
  { id: "audit-trail", label: "Audit Trail", href: "/admin/audit-trail", group: "Analytics", short: "AT" },
  { id: "web", label: "Web Metrics", href: "/admin/web", group: "Analytics", short: "WB" },
  { id: "crm", label: "CRM", href: "/admin/crm", group: "Growth", short: "CR" },
  { id: "leads", label: "Leads", href: "/admin/leads", group: "Growth", short: "LD" },
  { id: "broadcasts", label: "Broadcasts", href: "/admin/broadcasts", group: "Growth", short: "BR" },
  { id: "newsletter", label: "Newsletter", href: "/admin/newsletter", group: "Growth", short: "NL" },
  { id: "social", label: "Social", href: "/admin/social", group: "Growth", short: "SO" },
  { id: "feedback", label: "Feedback", href: "/admin/feedback", group: "Growth", short: "FB" },
  { id: "testimonials", label: "Testimonials", href: "/admin/testimonials", group: "Growth", short: "TS" },
  { id: "automation", label: "Automation", href: "/admin/automation", group: "Growth", short: "AU", badge: "NEW" },
  { id: "marketing-autopilot", label: "Autopilot", href: "/admin/marketing-autopilot", group: "Growth", short: "AI", badge: "AI" },
  { id: "system", label: "System", href: "/admin/system", group: "Security", short: "SY" },
  { id: "logs", label: "Audit Logs", href: "/admin/logs", group: "Security", short: "LG" },
  { id: "email-logs", label: "Email Logs", href: "/admin/email-logs", group: "Security", short: "EM" },
  { id: "feature-flags", label: "Feature Flags", href: "/admin/feature-flags", group: "Security", short: "FF" },
  { id: "fraud", label: "Fraud Monitor", href: "/admin/fraud", group: "Security", short: "FR" },
  { id: "dev-test", label: "Dev Test", href: "/admin/dev-test", group: "Security", short: "DV", badge: "DEV" },
];

export const ADMIN_NAV_GROUP_ORDER = [
  "Overview",
  "Core",
  "Analytics",
  "Growth",
  "Security",
] as const;
