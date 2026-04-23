export type AdminSectionConfig = {
  title: string;
  subtitle: string;
  primaryAction: string;
  secondaryAction: string;
  stats: { label: string; value: string; helper: string }[];
  managementTitle: string;
  managementItems: { title: string; detail: string; badge?: string }[];
  summaryTitle: string;
  summaryPoints: string[];
  activityTitle: string;
  activityItems: { title: string; detail: string; badge?: string }[];
};

export const adminSectionConfigs: Record<string, AdminSectionConfig> = {
  products: {
    title: "Products",
    subtitle: "Manage catalog structure, publishing status, and platform-level product defaults.",
    primaryAction: "Add Product",
    secondaryAction: "Import Catalog",
    stats: [
      { label: "Total Products", value: "128", helper: "+9 this week" },
      { label: "Published", value: "114", helper: "89% active" },
      { label: "Drafts", value: "14", helper: "Needs review" },
      { label: "Categories", value: "12", helper: "Structured" },
    ],
    managementTitle: "Catalog Management",
    managementItems: [
      { title: "Core Product Catalog", detail: "Maintain names, SKUs, pricing models, and product grouping.", badge: "Live" },
      { title: "Product Visibility Rules", detail: "Control which plans or companies can access a product.", badge: "Ready" },
      { title: "Bulk Product Imports", detail: "Support spreadsheet onboarding for large business catalogs.", badge: "Enabled" },
    ],
    summaryTitle: "Catalog Health",
    summaryPoints: ["Publishing workflow", "Category mapping", "SKU consistency", "Plan-based access"],
    activityTitle: "Recent Product Updates",
    activityItems: [
      { title: "Inventory Suite updated", detail: "Feature list and bundle price revised for premium plan.", badge: "2 min ago" },
      { title: "Sales Pro added", detail: "New product template created for subscription launch.", badge: "15 min ago" },
      { title: "CRM Essentials synced", detail: "Catalog synced with plan module matrix.", badge: "1 hour ago" },
    ],
  },
  "tax-rates": {
    title: "Tax Rates",
    subtitle: "Configure tax percentages, jurisdictions, and compliance-ready defaults.",
    primaryAction: "Add Tax Rate",
    secondaryAction: "Export Rules",
    stats: [
      { label: "Active Rates", value: "18", helper: "Across 6 regions" },
      { label: "Default Rules", value: "7", helper: "Auto-applied" },
      { label: "Jurisdictions", value: "6", helper: "Configured" },
      { label: "Compliance", value: "100%", helper: "Verified" },
    ],
    managementTitle: "Tax Configuration",
    managementItems: [
      { title: "VAT and GST Rates", detail: "Set standard, reduced, and zero-rated tax profiles.", badge: "Live" },
      { title: "Regional Mapping", detail: "Attach each tax rate to country or province level rules.", badge: "Ready" },
      { title: "Invoice Defaults", detail: "Define how tax appears on invoices and reports.", badge: "Enabled" },
    ],
    summaryTitle: "Compliance Coverage",
    summaryPoints: ["Regional assignments", "Invoice presentation", "Tax reporting export", "Override protection"],
    activityTitle: "Recent Tax Activity",
    activityItems: [
      { title: "Pakistan GST updated", detail: "Standard tax profile revised for current billing cycle.", badge: "5 min ago" },
      { title: "UAE VAT rule created", detail: "5% tax rate added to export-ready template.", badge: "30 min ago" },
      { title: "Reduced rate archived", detail: "Legacy rule removed from new company setup.", badge: "Today" },
    ],
  },
  currencies: {
    title: "Currencies",
    subtitle: "Enable global currency support, default display settings, and financial consistency.",
    primaryAction: "Add Currency",
    secondaryAction: "Update Rates",
    stats: [
      { label: "Supported", value: "24", helper: "Multi-region ready" },
      { label: "Default", value: "PKR", helper: "Primary platform base" },
      { label: "Live Rates", value: "18", helper: "Synced today" },
      { label: "Formatting Rules", value: "12", helper: "Locale based" },
    ],
    managementTitle: "Currency Operations",
    managementItems: [
      { title: "Currency Catalog", detail: "Manage ISO codes, symbols, and rounding precision.", badge: "Live" },
      { title: "Exchange Preferences", detail: "Choose base currency and lock conversion behavior.", badge: "Ready" },
      { title: "Regional Formatting", detail: "Apply locale-specific separators and symbol placement.", badge: "Enabled" },
    ],
    summaryTitle: "Financial Consistency",
    summaryPoints: ["Base currency", "Formatting standards", "Rate refresh", "Precision controls"],
    activityTitle: "Recent Currency Events",
    activityItems: [
      { title: "USD exchange refreshed", detail: "Primary conversion table synced from today's rate sheet.", badge: "Now" },
      { title: "AED enabled", detail: "New Gulf region companies can now onboard with AED.", badge: "18 min ago" },
      { title: "Formatting preset revised", detail: "European decimal style added for reporting.", badge: "Today" },
    ],
  },
  "payment-methods": {
    title: "Payment Methods",
    subtitle: "Control accepted payment channels, labels, and operational settings.",
    primaryAction: "Add Method",
    secondaryAction: "Sort Methods",
    stats: [
      { label: "Active Methods", value: "9", helper: "Customer-ready" },
      { label: "Digital Wallets", value: "3", helper: "Enabled" },
      { label: "Bank Channels", value: "4", helper: "Configured" },
      { label: "Default Methods", value: "2", helper: "Auto-selected" },
    ],
    managementTitle: "Payment Setup",
    managementItems: [
      { title: "Online Collections", detail: "Cards, transfers, wallets, and digital checkout labels.", badge: "Live" },
      { title: "Manual Settlement Methods", detail: "Cash and cheque workflows for local operations.", badge: "Ready" },
      { title: "Display Ordering", detail: "Set which methods appear first during collection.", badge: "Enabled" },
    ],
    summaryTitle: "Collection Readiness",
    summaryPoints: ["Checkout visibility", "Settlement rules", "Method ordering", "Default fallback"],
    activityTitle: "Recent Payment Updates",
    activityItems: [
      { title: "JazzCash enabled", detail: "Wallet method exposed to new business accounts.", badge: "4 min ago" },
      { title: "Bank transfer renamed", detail: "Label updated for cleaner invoice instructions.", badge: "22 min ago" },
      { title: "Cash collection pinned", detail: "Local branch default method reordered.", badge: "Today" },
    ],
  },
  settings: {
    title: "Settings",
    subtitle: "Central platform settings for admin controls, branding defaults, and operational behavior.",
    primaryAction: "Save Settings",
    secondaryAction: "Reset Draft",
    stats: [
      { label: "Global Settings", value: "42", helper: "Stored centrally" },
      { label: "Brand Profiles", value: "3", helper: "Managed" },
      { label: "Updated Today", value: "7", helper: "Recent changes" },
      { label: "Sync Status", value: "OK", helper: "All environments" },
    ],
    managementTitle: "Platform Preferences",
    managementItems: [
      { title: "Brand and Logo Defaults", detail: "Manage global brand settings for admin and public surfaces.", badge: "Live" },
      { title: "System Preferences", detail: "Timezone, locale, and onboarding defaults for new accounts.", badge: "Ready" },
      { title: "Operational Toggles", detail: "Fine tune admin workflows without touching code.", badge: "Enabled" },
    ],
    summaryTitle: "Configuration Status",
    summaryPoints: ["Brand defaults", "Onboarding setup", "Locale control", "Admin preferences"],
    activityTitle: "Recent Setting Changes",
    activityItems: [
      { title: "Timezone default updated", detail: "New business accounts now start with Asia/Karachi.", badge: "9 min ago" },
      { title: "Logo profile synced", detail: "Latest branded asset pushed to platform shell.", badge: "1 hour ago" },
      { title: "Admin preference saved", detail: "Sidebar display and quick actions refined.", badge: "Today" },
    ],
  },
  roles: {
    title: "Roles & Permissions",
    subtitle: "Define access control, role templates, and permission coverage across the admin platform.",
    primaryAction: "Create Role",
    secondaryAction: "View Matrix",
    stats: [
      { label: "Admin Roles", value: "8", helper: "Permission groups" },
      { label: "Permissions", value: "64", helper: "Granular rules" },
      { label: "Assigned Users", value: "24", helper: "Mapped" },
      { label: "Coverage", value: "100%", helper: "Protected areas" },
    ],
    managementTitle: "Access Control",
    managementItems: [
      { title: "Role Templates", detail: "Prebuilt permission sets for support, finance, and operations.", badge: "Live" },
      { title: "Scoped Permissions", detail: "Control create, edit, delete, export, and view actions.", badge: "Ready" },
      { title: "Audit-Friendly Grants", detail: "Track changes to sensitive admin access rules.", badge: "Enabled" },
    ],
    summaryTitle: "Security Coverage",
    summaryPoints: ["Role templates", "Scoped actions", "Permission review", "Audit support"],
    activityTitle: "Recent Access Changes",
    activityItems: [
      { title: "Support Admin role updated", detail: "Billing override permission removed from support role.", badge: "12 min ago" },
      { title: "Finance role created", detail: "Revenue reporting and invoice export access enabled.", badge: "42 min ago" },
      { title: "Permission matrix reviewed", detail: "No orphan permissions detected in latest audit.", badge: "Today" },
    ],
  },
  "backup-restore": {
    title: "Backup & Restore",
    subtitle: "Monitor backups, retention windows, and controlled restore operations.",
    primaryAction: "Run Backup",
    secondaryAction: "Download Snapshot",
    stats: [
      { label: "Latest Backup", value: "2h", helper: "Ago" },
      { label: "Retention", value: "30d", helper: "Protected" },
      { label: "Snapshots", value: "64", helper: "Available" },
      { label: "Integrity", value: "100%", helper: "Verified" },
    ],
    managementTitle: "Backup Operations",
    managementItems: [
      { title: "Automated Schedules", detail: "Daily and weekly snapshots stored with retention rules.", badge: "Live" },
      { title: "Restore Preparation", detail: "Controlled recovery flow for admin-supervised rollback.", badge: "Ready" },
      { title: "Integrity Checks", detail: "Every backup is validated before marked restorable.", badge: "Enabled" },
    ],
    summaryTitle: "Recovery Readiness",
    summaryPoints: ["Backup cadence", "Retention policy", "Restore access", "Snapshot verification"],
    activityTitle: "Recent Backup Events",
    activityItems: [
      { title: "Nightly backup completed", detail: "Production snapshot stored and verified successfully.", badge: "2 hours ago" },
      { title: "Weekly archive rotated", detail: "Old archive removed according to retention rule.", badge: "Today" },
      { title: "Restore point tagged", detail: "Pre-release snapshot locked for safe recovery.", badge: "Today" },
    ],
  },
  "web-settings": {
    title: "Web Settings",
    subtitle: "Manage public site defaults, admin-facing web controls, and marketing display settings.",
    primaryAction: "Publish Changes",
    secondaryAction: "Preview Site",
    stats: [
      { label: "Published Blocks", value: "19", helper: "Homepage ready" },
      { label: "SEO Rules", value: "14", helper: "Configured" },
      { label: "Social Links", value: "7", helper: "Connected" },
      { label: "Update Queue", value: "3", helper: "Pending publish" },
    ],
    managementTitle: "Web Experience Controls",
    managementItems: [
      { title: "Homepage Sections", detail: "Control hero, pricing, modules, testimonials, and CTA order.", badge: "Live" },
      { title: "SEO and Metadata", detail: "Update titles, descriptions, and share previews from admin.", badge: "Ready" },
      { title: "Public Contact Settings", detail: "Configure forms, social links, and newsletter visibility.", badge: "Enabled" },
    ],
    summaryTitle: "Publishing Status",
    summaryPoints: ["Homepage blocks", "SEO defaults", "Contact forms", "Social presence"],
    activityTitle: "Recent Web Updates",
    activityItems: [
      { title: "Landing hero updated", detail: "Admin panel preview now matches latest design system.", badge: "7 min ago" },
      { title: "SEO metadata synced", detail: "Title and meta descriptions refreshed for pricing page.", badge: "34 min ago" },
      { title: "Social footer published", detail: "New contact links visible on marketing site.", badge: "Today" },
    ],
  },
};
