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
  { id: "dashboard", label: "Dashboard", href: "/admin", group: "Main", short: "DB", icon: "grid" },
  { id: "companies", label: "Companies", href: "/admin/companies", group: "Main", short: "CO", icon: "building" },
  { id: "users", label: "Users", href: "/admin/users", group: "Main", short: "US", icon: "users" },
  { id: "subscriptions", label: "Subscriptions", href: "/admin/subscriptions", group: "Main", short: "SB", icon: "credit-card" },
  { id: "plans", label: "Plans", href: "/admin/plans", group: "Main", short: "PL", icon: "layers" },
  { id: "business-modules", label: "Modules", href: "/admin/business-modules", group: "Main", short: "BM", icon: "box" },
  { id: "products", label: "Products", href: "/admin/products", group: "Business", short: "PR", icon: "box" },
  { id: "tax-rates", label: "Tax Rates", href: "/admin/tax-rates", group: "Business", short: "TX", icon: "list" },
  { id: "currencies", label: "Currencies", href: "/admin/currencies", group: "Business", short: "CU", icon: "globe" },
  { id: "payment-methods", label: "Payment Methods", href: "/admin/payment-methods", group: "Business", short: "PM", icon: "credit-card" },
  { id: "revenue", label: "Revenue", href: "/admin/revenue", group: "Business", short: "RV", icon: "chart" },
  { id: "geo", label: "Geo Analytics", href: "/admin/geo", group: "Business", short: "GE", icon: "globe" },
  { id: "usage", label: "Usage Insights", href: "/admin/usage", group: "Business", short: "UG", icon: "pulse" },
  { id: "audit-trail", label: "Audit Trail", href: "/admin/audit-trail", group: "Business", short: "AT", icon: "list" },
  { id: "web", label: "Web Metrics", href: "/admin/web", group: "Business", short: "WB", icon: "monitor" },
  { id: "crm", label: "CRM", href: "/admin/crm", group: "Business", short: "CR", icon: "briefcase" },
  { id: "leads", label: "Leads", href: "/admin/leads", group: "Business", short: "LD", icon: "target" },
  { id: "broadcasts", label: "Broadcasts", href: "/admin/broadcasts", group: "Business", short: "BR", icon: "megaphone" },
  { id: "newsletter", label: "Newsletter", href: "/admin/newsletter", group: "Business", short: "NL", icon: "mail" },
  { id: "social", label: "Social", href: "/admin/social", group: "Business", short: "SO", icon: "share" },
  { id: "feedback", label: "Feedback", href: "/admin/feedback", group: "Business", short: "FB", icon: "message" },
  { id: "testimonials", label: "Testimonials", href: "/admin/testimonials", group: "Business", short: "TS", icon: "star" },
  { id: "permissions", label: "Roles & Permissions", href: "/admin/permissions", group: "System", short: "PM", icon: "lock" },
  { id: "settings", label: "Settings", href: "/admin/settings", group: "System", short: "ST", icon: "spark" },
  { id: "system", label: "System Health", href: "/admin/system", group: "System", short: "SY", icon: "shield" },
  { id: "logs", label: "Activity Logs", href: "/admin/logs", group: "System", short: "LG", icon: "activity" },
  { id: "email-logs", label: "Email Logs", href: "/admin/email-logs", group: "System", short: "EM", icon: "mail" },
  { id: "automation", label: "Automation", href: "/admin/automation", group: "Others", short: "AU", icon: "spark", badge: "NEW" },
  { id: "marketing-autopilot", label: "Autopilot", href: "/admin/marketing-autopilot", group: "Others", short: "AI", icon: "spark", badge: "AI" },
  { id: "feature-flags", label: "Feature Flags", href: "/admin/feature-flags", group: "Others", short: "FF", icon: "flag" },
  { id: "fraud", label: "Fraud Monitor", href: "/admin/fraud", group: "Others", short: "FR", icon: "alert" },
  { id: "dev-test", label: "Dev Test", href: "/admin/dev-test", group: "Others", short: "DV", icon: "code", badge: "DEV" },
];

export const ADMIN_NAV_GROUP_ORDER = ["Main", "Business", "System", "Others"] as const;
