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
  { id: "modules", label: "Modules", href: "/admin/business-modules", group: "Main", short: "MO", icon: "box" },

  { id: "products", label: "Products", href: "/admin/products", group: "Business", short: "PR", icon: "package" },
  { id: "tax-rates", label: "Tax Rates", href: "/admin/tax-rates", group: "Business", short: "TX", icon: "receipt" },
  { id: "currencies", label: "Currencies", href: "/admin/currencies", group: "Business", short: "CU", icon: "coins" },
  { id: "payment-methods", label: "Payment Methods", href: "/admin/payment-methods", group: "Business", short: "PM", icon: "wallet" },

  { id: "settings", label: "Settings", href: "/admin/settings", group: "System", short: "ST", icon: "settings" },
  { id: "roles", label: "Roles & Permissions", href: "/admin/roles", group: "System", short: "RP", icon: "lock" },
  { id: "email-logs", label: "Email Logs", href: "/admin/email-logs", group: "System", short: "EL", icon: "mail" },
  { id: "activity-logs", label: "Activity Logs", href: "/admin/logs", group: "System", short: "AL", icon: "activity" },
  { id: "system-health", label: "System Health", href: "/admin/system", group: "System", short: "SH", icon: "shield" },
  { id: "backup-restore", label: "Backup & Restore", href: "/admin/backup-restore", group: "System", short: "BR", icon: "database" },

  { id: "feature-flags", label: "Feature Flags", href: "/admin/feature-flags", group: "Others", short: "FF", icon: "flag" },
  { id: "automation", label: "Automation", href: "/admin/automation", group: "Others", short: "AU", icon: "spark", badge: "NEW" },
  { id: "web-settings", label: "Web Settings", href: "/admin/web-settings", group: "Others", short: "WS", icon: "globe" },
];

export const ADMIN_NAV_GROUP_ORDER = ["Main", "Business", "System", "Others"] as const;
