// GENERATED FILE — do not edit by hand.
// Source: app/dashboard/layout.tsx
// Regenerate: npm run gen:nav-order
//
// The dashboard sidebar's groups and links, in the exact order the sidebar
// renders them. /admin/plans groups its page grid by this so the two screens
// read the same way round.

export type DashboardNavGroup = { title: string; routes: string[] };

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    title: "Main",
    routes: [
      "/dashboard/business-guide",
      "/dashboard/owner-dashboard",
      "/dashboard/ai",
      "/dashboard/operator",
    ],
  },
  {
    title: "CRM",
    routes: [
      "/dashboard/crm",
      "/dashboard/crm/contacts",
      "/dashboard/crm/opportunities",
      "/dashboard/crm/interactions",
    ],
  },
  {
    title: "Sales & Purchase",
    routes: [
      "/dashboard/invoices",
      "/dashboard/purchase-order",
      "/dashboard/grn",
      "/dashboard/purchase-invoice",
      "/dashboard/quotation",
      "/dashboard/sales-order",
      "/dashboard/delivery-challan",
      "/dashboard/sales-invoice",
      "/dashboard/sale-return",
      "/dashboard/outward",
      "/dashboard/landed-cost",
      "/dashboard/credit-limits",
      "/dashboard/promotions",
    ],
  },
  {
    title: "Inventory",
    routes: [
      "/dashboard/inventory",
      "/dashboard/items-new",
      "/dashboard/warehouses",
      "/dashboard/warehouse-transfers",
      "/dashboard/product-variants",
      "/dashboard/batch-tracking",
      "/dashboard/price-lists",
      "/dashboard/stock-rate",
      "/dashboard/barcode",
    ],
  },
  {
    title: "Banking & Payments",
    routes: [
      "/dashboard/bank-reconciliation",
      "/dashboard/expense-vouchers",
      "/dashboard/tax-configuration",
      "/dashboard/bulk-payments",
    ],
  },
  {
    title: "Accounting",
    routes: [
      "/dashboard/accounts",
      "/dashboard/cpv",
      "/dashboard/crv",
      "/dashboard/jv",
      "/dashboard/opening-balances",
      "/dashboard/advance-payment",
      "/dashboard/contra",
      "/dashboard/petty-cash",
      "/dashboard/loans",
      "/dashboard/recurring-transactions",
    ],
  },
  {
    title: "HR & Payroll",
    routes: [
      "/dashboard/hr-payroll",
      "/dashboard/employees",
      "/dashboard/attendance",
      "/dashboard/payroll",
      "/dashboard/advance-salary",
    ],
  },
  {
    title: "🖥️ Point of Sale",
    routes: [
      "/dashboard/retail/pos",
      "/dashboard/retail/sales-history",
      "/dashboard/retail/pos-sessions",
      "/dashboard/retail/discounts",
      "/dashboard/retail/online-sync",
    ],
  },
  {
    title: "📋 Sales",
    routes: [
      "/dashboard/sales-invoice",
      "/dashboard/sale-return",
      "/dashboard/quotation",
      "/dashboard/delivery-challan",
      "/dashboard/crv",
    ],
  },
  {
    title: "🛒 Purchases",
    routes: [
      "/dashboard/purchase-order",
      "/dashboard/grn",
      "/dashboard/purchase-invoice",
      "/dashboard/purchase-return",
      "/dashboard/cpv",
    ],
  },
  {
    title: "📦 Inventory",
    routes: [
      "/dashboard/retail/catalog",
      "/dashboard/retail/categories",
      "/dashboard/retail/stock-receipts",
      "/dashboard/barcode",
      "/dashboard/retail/stock-transfer",
      "/dashboard/retail/stock-adjustment",
      "/dashboard/retail/batch-expiry",
      "/dashboard/batch-tracking",
      "/dashboard/product-variants",
      "/dashboard/reports/stock/low",
    ],
  },
  {
    title: "👥 Customers",
    routes: [
      "/dashboard/retail/customers",
      "/dashboard/retail/loyalty",
      "/dashboard/credit-limits",
    ],
  },
  {
    title: "🏭 Suppliers",
    routes: [
      "/dashboard/retail/suppliers",
      "/dashboard/retail/supplier-portal",
    ],
  },
  {
    title: "🏪 Multi-Store",
    routes: [
      "/dashboard/retail/branches",
      "/dashboard/retail/stock-transfer",
      "/dashboard/retail/branch-users",
      "/dashboard/retail/branch-reports",
    ],
  },
  {
    title: "Food Processing",
    routes: [
      "/dashboard/food-processing",
      "/dashboard/food-processing/recipe-costing",
      "/dashboard/manufacturing/bom",
      "/dashboard/manufacturing/production-orders",
      "/dashboard/manufacturing/raw-materials",
      "/dashboard/manufacturing/finished-goods",
      "/dashboard/food-processing/analytics",
    ],
  },
  {
    title: "Manufacturing",
    routes: [
      "/dashboard/manufacturing",
      "/dashboard/manufacturing/bom",
      "/dashboard/manufacturing/production-orders",
      "/dashboard/manufacturing/work-orders",
      "/dashboard/manufacturing/raw-materials",
      "/dashboard/manufacturing/finished-goods",
      "/dashboard/manufacturing/quality",
    ],
  },
  {
    title: "Costing",
    routes: [
      "/dashboard/costing",
      "/dashboard/costing/formulas",
    ],
  },
  {
    title: "Restaurant",
    routes: [
      "/dashboard/restaurant",
      "/dashboard/restaurant/orders",
      "/dashboard/restaurant/reservations",
      "/dashboard/restaurant/tables",
      "/dashboard/restaurant/menu",
      "/dashboard/restaurant/kitchen",
      "/dashboard/restaurant/recipe-costing",
      "/dashboard/restaurant/analytics",
    ],
  },
  {
    title: "Real Estate",
    routes: [
      "/dashboard/real-estate",
      "/dashboard/real-estate/properties",
      "/dashboard/real-estate/tenants",
      "/dashboard/real-estate/rent",
      "/dashboard/real-estate/leases",
      "/dashboard/real-estate/analytics",
    ],
  },
  {
    title: "Construction",
    routes: [
      "/dashboard/construction",
      "/dashboard/construction/projects",
      "/dashboard/construction/sites",
      "/dashboard/construction/materials",
      "/dashboard/construction/boq",
      "/dashboard/construction/billing",
      "/dashboard/construction/expenses",
      "/dashboard/construction/subcontractors",
      "/dashboard/construction/contractor-payments",
      "/dashboard/construction/analytics",
    ],
  },
  {
    title: "Distribution",
    routes: [
      "/dashboard/distribution/routes",
      "/dashboard/distribution/delivery",
      "/dashboard/distribution/van-sales",
      "/dashboard/distribution/stock-on-van",
      "/dashboard/distribution/collections",
      "/dashboard/distribution/analytics",
      "/dashboard/distribution/trip-sheet",
    ],
  },
  {
    title: "School",
    routes: [
      "/dashboard/school",
      "/dashboard/school/admissions",
      "/dashboard/school/students",
      "/dashboard/school/attendance",
      "/dashboard/school/teachers",
      "/dashboard/school/fees",
      "/dashboard/school/schedule",
      "/dashboard/school/exams",
      "/dashboard/school/analytics",
    ],
  },
  {
    title: "Hospital / Clinic",
    routes: [
      "/dashboard/hospital",
      "/dashboard/hospital/patients",
      "/dashboard/hospital/appointments",
      "/dashboard/hospital/prescriptions",
      "/dashboard/hospital/lab",
      "/dashboard/hospital/analytics",
    ],
  },
  {
    title: "Hotel",
    routes: [
      "/dashboard/hotel",
      "/dashboard/hotel/rooms",
      "/dashboard/hotel/front-desk",
      "/dashboard/hotel/housekeeping",
      "/dashboard/hotel/room-service",
      "/dashboard/hotel/folios",
      "/dashboard/hotel/guest-history",
      "/dashboard/hotel/laundry",
      "/dashboard/hotel/complaints",
      "/dashboard/hotel/analytics",
    ],
  },
  {
    title: "Pharmacy",
    routes: [
      "/dashboard/pharmacy",
      "/dashboard/pharmacy/inventory",
      "/dashboard/pharmacy/batches",
      "/dashboard/pharmacy/expiry",
      "/dashboard/pharmacy/purchases",
      "/dashboard/pharmacy/prescriptions",
      "/dashboard/pharmacy/counter-sales",
      "/dashboard/pharmacy/analytics",
    ],
  },
  {
    title: "Salon",
    routes: [
      "/dashboard/salon",
      "/dashboard/salon/appointments",
      "/dashboard/salon/stylists",
      "/dashboard/salon/services",
      "/dashboard/salon/packages",
      "/dashboard/salon/client-history",
      "/dashboard/salon/analytics",
    ],
  },
  {
    title: "Gym",
    routes: [
      "/dashboard/gym",
      "/dashboard/gym/memberships",
      "/dashboard/gym/classes",
      "/dashboard/gym/trainers",
      "/dashboard/gym/analytics",
    ],
  },
  {
    title: "Transport",
    routes: [
      "/dashboard/transport",
      "/dashboard/transport/fleet",
      "/dashboard/transport/trips",
      "/dashboard/transport/dispatch",
      "/dashboard/transport/drivers",
      "/dashboard/transport/fuel",
      "/dashboard/transport/maintenance",
      "/dashboard/transport/expenses",
      "/dashboard/transport/analytics",
    ],
  },
  {
    title: "Agriculture",
    routes: [
      "/dashboard/agriculture",
      "/dashboard/agriculture/crops",
      "/dashboard/agriculture/livestock",
      "/dashboard/agriculture/fields",
      "/dashboard/agriculture/harvest",
      "/dashboard/agriculture/analytics",
    ],
  },
  {
    title: "NGO",
    routes: [
      "/dashboard/ngo",
      "/dashboard/ngo/donors",
      "/dashboard/ngo/grants",
      "/dashboard/ngo/beneficiaries",
      "/dashboard/ngo/funds",
      "/dashboard/ngo/analytics",
    ],
  },
  {
    title: "E-Commerce",
    routes: [
      "/dashboard/ecommerce",
      "/dashboard/ecommerce/products",
      "/dashboard/ecommerce/orders",
      "/dashboard/ecommerce/returns",
      "/dashboard/ecommerce/shipping",
      "/dashboard/ecommerce/analytics",
    ],
  },
  {
    title: "Law Firm",
    routes: [
      "/dashboard/law-firm",
      "/dashboard/law-firm/cases",
      "/dashboard/law-firm/clients",
      "/dashboard/law-firm/billing",
      "/dashboard/law-firm/time-billing",
      "/dashboard/law-firm/analytics",
    ],
  },
  {
    title: "IT Projects",
    routes: [
      "/dashboard/it",
      "/dashboard/it/projects",
      "/dashboard/it/sprints",
      "/dashboard/it/contracts",
      "/dashboard/it/support",
      "/dashboard/it/analytics",
    ],
  },
  {
    title: "Showroom",
    routes: [
      "/dashboard/automotive",
      "/dashboard/automotive/vehicles",
      "/dashboard/automotive/test-drives",
      "/dashboard/automotive/deals",
      "/dashboard/automotive/analytics",
      "/dashboard/crm/contacts",
    ],
  },
  {
    title: "Workshop / Jobs",
    routes: [
      "/dashboard/workshop",
      "/dashboard/workshop/jobs",
      "/dashboard/workshop/parts",
      "/dashboard/workshop/mechanics",
      "/dashboard/workshop/warranty",
      "/dashboard/workshop/analytics",
    ],
  },
  {
    title: "Vehicle Rental",
    routes: [
      "/dashboard/rental/bookings",
      "/dashboard/transport/fleet",
      "/dashboard/rental/agreements",
      "/dashboard/transport/fuel",
    ],
  },
  {
    title: "Repair Jobs",
    routes: [
      "/dashboard/repair",
      "/dashboard/repair/jobs",
      "/dashboard/repair/parts",
      "/dashboard/repair/warranty",
      "/dashboard/repair/technicians",
      "/dashboard/repair/analytics",
    ],
  },
  {
    title: "Maintenance",
    routes: [
      "/dashboard/maintenance",
      "/dashboard/maintenance/contracts",
      "/dashboard/maintenance/schedule",
      "/dashboard/maintenance/jobs",
      "/dashboard/maintenance/parts",
      "/dashboard/maintenance/analytics",
    ],
  },
  {
    title: "Campaigns",
    routes: [
      "/dashboard/media",
      "/dashboard/media/campaigns",
      "/dashboard/media/clients",
      "/dashboard/media/media-plan",
      "/dashboard/media/analytics",
      "/dashboard/quotation",
    ],
  },
  {
    title: "Print Jobs",
    routes: [
      "/dashboard/printing/orders",
      "/dashboard/printing/paper-stock",
      "/dashboard/printing/delivery",
      "/dashboard/quotation",
    ],
  },
  {
    title: "Subscriptions",
    routes: [
      "/dashboard/subscriptions",
      "/dashboard/subscriptions/plans",
      "/dashboard/subscriptions/subscribers",
      "/dashboard/subscriptions/billing",
      "/dashboard/subscriptions/mrr",
      "/dashboard/subscriptions/content-tiers",
      "/dashboard/subscriptions/member-access",
      "/dashboard/subscriptions/box-catalog",
      "/dashboard/subscriptions/fulfillment",
    ],
  },
  {
    title: "ISP Management",
    routes: [
      "/dashboard/isp",
      "/dashboard/isp/connections",
      "/dashboard/isp/billing",
      "/dashboard/isp/packages",
      "/dashboard/isp/support",
    ],
  },
  {
    title: "Utilities",
    routes: [
      "/dashboard/utilities",
      "/dashboard/utilities/connections",
      "/dashboard/utilities/billing",
      "/dashboard/utilities/meters",
      "/dashboard/utilities/analytics",
    ],
  },
  {
    title: "Solar Projects",
    routes: [
      "/dashboard/solar",
      "/dashboard/solar/projects",
      "/dashboard/solar/equipment",
      "/dashboard/solar/amc",
      "/dashboard/solar/analytics",
      "/dashboard/quotation",
    ],
  },
  {
    title: "Import / Export",
    routes: [
      "/dashboard/trade",
      "/dashboard/trade/shipments",
      "/dashboard/trade/containers",
      "/dashboard/trade/freight",
      "/dashboard/commercial-invoice",
      "/dashboard/packing-list",
      "/dashboard/trade/certificate-of-origin",
      "/dashboard/trade/export-docs",
      "/dashboard/trade/lc",
      "/dashboard/trade/customs",
      "/dashboard/trade/hs-codes",
      "/dashboard/trade/costing",
      "/dashboard/trade/rebate",
      "/dashboard/reports/export-performance",
      "/dashboard/trade/analytics",
      "/dashboard/cnf",
    ],
  },
  {
    title: "Events",
    routes: [
      "/dashboard/events",
      "/dashboard/events/bookings",
      "/dashboard/events/vendors",
      "/dashboard/events/budget",
      "/dashboard/events/analytics",
      "/dashboard/quotation",
    ],
  },
  {
    title: "Travel",
    routes: [
      "/dashboard/travel",
      "/dashboard/travel/tickets",
      "/dashboard/travel/visas",
      "/dashboard/travel/hotel-packages",
      "/dashboard/travel/tours",
      "/dashboard/travel/settlements",
      "/dashboard/travel/passports",
      "/dashboard/travel/analytics",
      "/dashboard/quotation",
      "/dashboard/sales-invoice",
    ],
  },
  {
    title: "Rentals",
    routes: [
      "/dashboard/rentals",
      "/dashboard/rentals/items",
      "/dashboard/rentals/bookings",
      "/dashboard/rentals/agreements",
      "/dashboard/rentals/maintenance",
      "/dashboard/rentals/analytics",
    ],
  },
  {
    title: "Franchise",
    routes: [
      "/dashboard/franchise",
      "/dashboard/franchise/outlets",
      "/dashboard/franchise/royalty",
      "/dashboard/franchise/analytics",
      "/dashboard/retail/branch-reports",
      "/dashboard/retail/stock-transfer",
    ],
  },
  {
    title: "Audit / Accounting",
    routes: [
      "/dashboard/firm",
      "/dashboard/firm/clients",
      "/dashboard/firm/projects",
      "/dashboard/firm/billing",
      "/dashboard/firm/timesheets",
      "/dashboard/firm/audit-planning",
      "/dashboard/firm/findings",
      "/dashboard/firm/analytics",
    ],
  },
  {
    title: "Consultancy",
    routes: [
      "/dashboard/firm",
      "/dashboard/firm/clients",
      "/dashboard/firm/projects",
      "/dashboard/firm/proposals",
      "/dashboard/firm/deliverables",
      "/dashboard/firm/billing",
      "/dashboard/firm/timesheets",
      "/dashboard/firm/analytics",
    ],
  },
  {
    title: "Architecture",
    routes: [
      "/dashboard/firm",
      "/dashboard/firm/clients",
      "/dashboard/firm/projects",
      "/dashboard/firm/design-briefs",
      "/dashboard/firm/drawings",
      "/dashboard/firm/milestones",
      "/dashboard/firm/billing",
      "/dashboard/firm/timesheets",
      "/dashboard/firm/analytics",
    ],
  },
  {
    title: "Services & Agency",
    routes: [
      "/dashboard/services",
      "/dashboard/services/catalog",
      "/dashboard/services/projects",
      "/dashboard/services/delivery",
      "/dashboard/services/time-billing",
      "/dashboard/quotation",
      "/dashboard/crm/contacts",
      "/dashboard/crm/opportunities",
    ],
  },
  {
    title: "Trading Control",
    routes: [
      "/dashboard/trading",
      "/dashboard/trading/order-desk",
      "/dashboard/trading/procurement",
      "/dashboard/trading/stock-control",
      "/dashboard/trading/outstandings",
      "/dashboard/trading/dispatch-board",
      "/dashboard/trading/conversion-center",
      "/dashboard/trading/analytics",
      "/dashboard/delivery-order",
      "/dashboard/stock-movements",
      "/dashboard/product-categories",
      "/dashboard/purchase-requisition",
    ],
  },
  {
    title: "Wholesale",
    routes: [
      "/dashboard/wholesale",
      "/dashboard/sales-order",
      "/dashboard/credit-limits",
    ],
  },
  {
    title: "Financial Reports",
    routes: [
      "/dashboard/reports",
      "/dashboard/reports/trial-balance",
      "/dashboard/reports/profit-loss",
      "/dashboard/reports/balance-sheet",
      "/dashboard/reports/ledger",
      "/dashboard/reports/cash-flow",
      "/dashboard/reports/tax-summary",
      "/dashboard/customer-statement",
      "/dashboard/supplier-statement",
    ],
  },
  {
    title: "Advanced Financial",
    routes: [
      "/dashboard/reports/budget-vs-actual",
      "/dashboard/reports/cogs",
      "/dashboard/reports/gross-margin",
      "/dashboard/reports/expense-breakdown",
      "/dashboard/reports/breakeven",
      "/dashboard/reports/tax-forecast",
      "/dashboard/reports/audit-exception",
    ],
  },
  {
    title: "Inventory Intelligence",
    routes: [
      "/dashboard/reports/stock",
      "/dashboard/reports/stock-ledger",
      "/dashboard/reports/stock/movement",
      "/dashboard/reports/inventory/stock-summary",
      "/dashboard/reports/inventory/inward",
      "/dashboard/reports/outward",
      "/dashboard/reports/stock/dead",
      "/dashboard/reports/stock/turnover",
      "/dashboard/reports/stock/expiry",
      "/dashboard/reports/stock/valuation",
      "/dashboard/reports/stock/warehouse",
    ],
  },
  {
    title: "Sales Analytics",
    routes: [
      "/dashboard/reports/sales",
      "/dashboard/reports/customer-profitability",
      "/dashboard/reports/salesman-performance",
      "/dashboard/reports/discount-analysis",
      "/dashboard/reports/sales-region",
      "/dashboard/reports/product-profitability",
      "/dashboard/reports/returns-analysis",
    ],
  },
  {
    title: "Receivables & Payables",
    routes: [
      "/dashboard/reports/ageing",
      "/dashboard/reports/payment-history",
      "/dashboard/payment-followup",
      "/dashboard/reports/bad-debts",
      "/dashboard/reports/credit-analysis",
    ],
  },
  {
    title: "Operations Reports",
    routes: [
      "/dashboard/reports/order-fulfillment",
      "/dashboard/reports/delivery-performance",
      "/dashboard/reports/po-tracking",
      "/dashboard/reports/supplier-performance",
    ],
  },
  {
    title: "Strategic Reports",
    routes: [
      "/dashboard/reports/forecast",
      "/dashboard/reports/scenario",
    ],
  },
  {
    title: "Admin",
    routes: [
      "/dashboard/admin-control",
      "/dashboard/chat",
      "/dashboard/business-features",
      "/dashboard/notifications-config",
      "/dashboard/shortcuts",
      "/dashboard/users",
      "/dashboard/users/logs",
      "/dashboard/audit-trail",
      "/dashboard/fixed-assets",
      "/dashboard/approvals",
    ],
  },
  {
    title: "Automation",
    routes: [
      "/dashboard/automation",
    ],
  },
  {
    title: "Settings",
    routes: [
      "/dashboard/branches",
      "/dashboard/currencies",
      "/dashboard/cost-centers",
      "/dashboard/financial-year",
      "/dashboard/budget",
      "/dashboard/backup-restore",
      "/dashboard/email-settings",
      "/dashboard/notifications",
      "/dashboard/account-settings",
      "/dashboard/billing",
      "/dashboard/settings/appearance",
      "/dashboard/settings/holidays",
      "/dashboard/security-access",
      "/dashboard/integrations",
      "/dashboard/affiliate",
    ],
  },
];

/** route -> index of its sidebar group, and its position inside that group. */
const ROUTE_POSITION = new Map<string, { group: number; item: number }>();
DASHBOARD_NAV_GROUPS.forEach((group, gi) => {
  group.routes.forEach((route, ri) => {
    if (!ROUTE_POSITION.has(route)) ROUTE_POSITION.set(route, { group: gi, item: ri });
  });
});

/**
 * Where a route sits in the sidebar, or null when the sidebar never links it.
 * Query strings are stripped so /dashboard/ai?tab=x resolves like /dashboard/ai.
 */
export function navPositionForRoute(route: string): { group: number; item: number } | null {
  return ROUTE_POSITION.get(String(route || "").split("?")[0]) ?? null;
}

export function navGroupTitle(index: number): string {
  return DASHBOARD_NAV_GROUPS[index]?.title ?? "";
}
