// ────────────────────────────────────────────────────────────
//  PER-BUSINESS DASHBOARD LAYOUTS
//
//  The dashboard used to be identical for every business type: the same
//  Revenue / Expenses / Profit / Cash cards and the same
//  "+ Invoice / + Sale / + Expense / + Product" shortcuts, whether the
//  company ran a hospital or a factory.
//
//  This file is the config the dashboard renders from. One entry per
//  business type describes what that industry actually looks at:
//    - kpis      → the four headline cards
//    - opsStrip  → industry-specific operational counters under them
//    - actions   → the quick-action shortcuts that make sense there
//    - chart     → what the main trend chart is called in that industry
//
//  Adding a new vertical dashboard = adding one entry here. No new page.
//
//  Metric sources:
//    core     → /api/dashboard summary (financials, always available)
//    today    → /api/dashboard/secondary todayStats
//    vertical → the business type's own control-center endpoint
// ────────────────────────────────────────────────────────────
import type { BusinessType } from "@/lib/businessModules";

export type MetricSource = "core" | "today" | "vertical";
export type MetricFormat = "currency" | "number" | "percent";

export interface DashboardKpi {
  key: string;
  label: string;
  icon: string;
  color: string;
  source: MetricSource;
  /** Field name inside the chosen source payload. */
  metric: string;
  format: MetricFormat;
  /** Core growth field to render as the "vs last month" delta line. */
  deltaMetric?: "revenueGrowth" | "expensesGrowth" | "profitGrowth";
  /** Whether a rising delta is good (revenue) or bad (expenses). */
  deltaTone?: "up-good" | "up-bad";
  /** Caption shown when the card has no delta line. */
  caption?: string;
  href?: string;
}

export interface DashboardOpsMetric {
  label: string;
  icon: string;
  color: string;
  source: MetricSource;
  metric: string;
  format: MetricFormat;
  href?: string;
}

export interface DashboardAction {
  label: string;
  href: string;
  icon: string;
  /** Gradient used for the button background. */
  bg: string;
}

export interface DashboardLayout {
  /** Heading above the operations strip, e.g. "Factory floor". */
  opsTitle: string;
  /** Control-center endpoint for this vertical, if it has one. */
  verticalEndpoint?: string;
  kpis: DashboardKpi[];
  opsStrip: DashboardOpsMetric[];
  actions: DashboardAction[];
  chart: { title: string; revenueLabel: string; expensesLabel: string };
}

const GR = {
  indigo: "linear-gradient(135deg,#6366f1,#4f46e5)",
  sky:    "linear-gradient(135deg,#38bdf8,#0ea5e9)",
  amber:  "linear-gradient(135deg,#f59e0b,#d97706)",
  green:  "linear-gradient(135deg,#10b981,#059669)",
  rose:   "linear-gradient(135deg,#f87171,#dc2626)",
  violet: "linear-gradient(135deg,#a78bfa,#7c3aed)",
  teal:   "linear-gradient(135deg,#2dd4bf,#0d9488)",
};

// ── Generic fallback — any business type without its own layout ──
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  opsTitle: "Today at a glance",
  kpis: [
    { key: "balance",  label: "Total Balance",     icon: "💳", color: "#818cf8", source: "core", metric: "cashBalance", format: "currency", deltaMetric: "revenueGrowth",  deltaTone: "up-good" },
    { key: "revenue",  label: "Total Revenue",     icon: "📈", color: "#10b981", source: "core", metric: "revenue",     format: "currency", deltaMetric: "revenueGrowth",  deltaTone: "up-good" },
    { key: "expenses", label: "Total Expenses",    icon: "📉", color: "#f87171", source: "core", metric: "expenses",    format: "currency", deltaMetric: "expensesGrowth", deltaTone: "up-bad"  },
    { key: "profit",   label: "Profit This Month", icon: "🚀", color: "#10b981", source: "core", metric: "profit",      format: "currency", deltaMetric: "profitGrowth",   deltaTone: "up-good" },
  ],
  opsStrip: [
    { label: "Today's Sales",    icon: "💰", color: "#38bdf8", source: "today", metric: "todaySales",    format: "currency" },
    { label: "Today's Invoices", icon: "🧾", color: "#a78bfa", source: "today", metric: "todayOrders",   format: "number"   },
    { label: "Overdue Invoices", icon: "⏰", color: "#fbbf24", source: "today", metric: "pendingCount",  format: "number", href: "/dashboard/payment-followup" },
    { label: "Low Stock Items",  icon: "📦", color: "#f87171", source: "today", metric: "lowStockCount", format: "number", href: "/dashboard/reports/stock" },
  ],
  actions: [
    { label: "+ Invoice", href: "/dashboard/sales-invoice",    icon: "📄", bg: GR.indigo },
    { label: "+ Sale",    href: "/dashboard/sales-order",      icon: "🛒", bg: GR.sky    },
    { label: "+ Expense", href: "/dashboard/expense-vouchers", icon: "💰", bg: GR.amber  },
    { label: "+ Product", href: "/dashboard/items-new",        icon: "📦", bg: GR.green  },
  ],
  chart: { title: "Revenue vs Expenses", revenueLabel: "Revenue", expensesLabel: "Expenses" },
};

export const DASHBOARD_LAYOUTS: Partial<Record<BusinessType, DashboardLayout>> = {
  // ── TRADING ────────────────────────────────────────────────
  trading: {
    opsTitle: "Trading desk today",
    kpis: [
      { key: "today_sales", label: "Today's Sales", icon: "💰", color: "#38bdf8", source: "today", metric: "todaySales",  format: "currency", caption: "Billed since midnight", href: "/dashboard/sales-invoice" },
      { key: "stock_value", label: "Stock Value",   icon: "📦", color: "#34d399", source: "core",  metric: "stockValue",  format: "currency", caption: "Inventory on hand",     href: "/dashboard/reports/stock" },
      { key: "receivables", label: "Receivables",   icon: "🧾", color: "#fbbf24", source: "core",  metric: "receivables", format: "currency", caption: "Owed by customers",     href: "/dashboard/customer-statement" },
      { key: "payables",    label: "Payables",      icon: "💳", color: "#f87171", source: "core",  metric: "payables",    format: "currency", caption: "Owed to suppliers",     href: "/dashboard/supplier-statement" },
    ],
    opsStrip: [
      { label: "Revenue This Month", icon: "📈", color: "#10b981", source: "core",  metric: "revenue",       format: "currency" },
      { label: "Profit This Month",  icon: "🚀", color: "#818cf8", source: "core",  metric: "profit",        format: "currency" },
      { label: "Overdue Invoices",   icon: "⏰", color: "#fbbf24", source: "today", metric: "pendingCount",  format: "number", href: "/dashboard/payment-followup" },
      { label: "Low Stock Items",    icon: "⚠️", color: "#f87171", source: "today", metric: "lowStockCount", format: "number", href: "/dashboard/reports/stock" },
    ],
    actions: [
      { label: "New Sale",        href: "/dashboard/sales-invoice",    icon: "🧾", bg: GR.sky    },
      { label: "New Purchase",    href: "/dashboard/purchase-invoice", icon: "📦", bg: GR.green  },
      { label: "Receive Payment", href: "/dashboard/payment-receipts", icon: "💰", bg: GR.amber  },
      { label: "Stock Report",    href: "/dashboard/reports/stock",    icon: "📊", bg: GR.indigo },
    ],
    chart: { title: "Sales vs Purchases", revenueLabel: "Revenue", expensesLabel: "Expenses" },
  },

  // ── MANUFACTURING ──────────────────────────────────────────
  manufacturing: {
    opsTitle: "Factory floor",
    verticalEndpoint: "/api/manufacturing/control-center",
    kpis: [
      { key: "running_production", label: "Running Production", icon: "⚙️", color: "#f59e0b", source: "vertical", metric: "runningProduction", format: "number",   caption: "Orders in progress",     href: "/dashboard/manufacturing/production-orders" },
      { key: "raw_material_value", label: "Raw Material Value", icon: "📦", color: "#34d399", source: "vertical", metric: "materialValue",     format: "currency", caption: "Material stock on hand", href: "/dashboard/manufacturing/raw-materials" },
      { key: "finished_goods",     label: "Finished Goods",     icon: "✅", color: "#818cf8", source: "vertical", metric: "finishedQuantity",  format: "number",   caption: "Units ready to ship",    href: "/dashboard/manufacturing/finished-goods" },
      { key: "profit",             label: "Profit This Month",  icon: "🚀", color: "#10b981", source: "core",     metric: "profit",            format: "currency", deltaMetric: "profitGrowth", deltaTone: "up-good" },
    ],
    opsStrip: [
      { label: "Open Work Orders", icon: "🛠️", color: "#38bdf8", source: "vertical", metric: "openWorkOrders",    format: "number", href: "/dashboard/manufacturing/work-orders" },
      { label: "Blocked Orders",   icon: "🚧", color: "#f87171", source: "vertical", metric: "blockedProduction", format: "number", href: "/dashboard/manufacturing/production-orders" },
      { label: "Low Materials",    icon: "⚠️", color: "#fbbf24", source: "vertical", metric: "lowMaterials",      format: "number", href: "/dashboard/manufacturing/raw-materials" },
      { label: "QC Rejected",      icon: "❌", color: "#fb7185", source: "vertical", metric: "rejectedChecks",    format: "number", href: "/dashboard/manufacturing/quality" },
      { label: "Active BOMs",      icon: "🗂️", color: "#a78bfa", source: "vertical", metric: "bomCount",          format: "number", href: "/dashboard/manufacturing/bom" },
    ],
    actions: [
      { label: "New Production Order", href: "/dashboard/manufacturing/production-orders", icon: "⚙️", bg: GR.amber  },
      { label: "View BOM",             href: "/dashboard/manufacturing/bom",               icon: "🗂️", bg: GR.violet },
      { label: "Material Purchase",    href: "/dashboard/purchase-invoice",                icon: "📦", bg: GR.green  },
      { label: "Dispatch Goods",       href: "/dashboard/delivery-challan",                icon: "🚚", bg: GR.sky    },
    ],
    chart: { title: "Sales vs Production Cost", revenueLabel: "Revenue", expensesLabel: "Cost" },
  },

  // ── RETAIL ─────────────────────────────────────────────────
  retail: {
    opsTitle: "Counter today",
    kpis: [
      { key: "today_sales", label: "Today's Sales",     icon: "🛍️", color: "#f472b6", source: "today", metric: "todaySales",  format: "currency", caption: "Across all counters", href: "/dashboard/retail/sales-history" },
      { key: "today_bills", label: "Bills Today",       icon: "🧾", color: "#38bdf8", source: "today", metric: "todayOrders", format: "number",   caption: "Receipts issued",     href: "/dashboard/retail/sales-history" },
      { key: "stock_value", label: "Stock Value",       icon: "📦", color: "#34d399", source: "core",  metric: "stockValue",  format: "currency", caption: "Shelf + backroom",    href: "/dashboard/retail/catalog" },
      { key: "profit",      label: "Profit This Month", icon: "🚀", color: "#10b981", source: "core",  metric: "profit",      format: "currency", deltaMetric: "profitGrowth", deltaTone: "up-good" },
    ],
    opsStrip: [
      { label: "Revenue This Month",  icon: "📈", color: "#10b981", source: "core",  metric: "revenue",       format: "currency" },
      { label: "Expenses This Month", icon: "📉", color: "#f87171", source: "core",  metric: "expenses",      format: "currency" },
      { label: "Low Stock Items",     icon: "⚠️", color: "#fbbf24", source: "today", metric: "lowStockCount", format: "number", href: "/dashboard/retail/stock-adjustment" },
      { label: "Overdue Invoices",    icon: "⏰", color: "#a78bfa", source: "today", metric: "pendingCount",  format: "number", href: "/dashboard/payment-followup" },
    ],
    actions: [
      { label: "Open POS",      href: "/dashboard/retail/pos",            icon: "🖥️", bg: GR.rose   },
      { label: "Stock Receipt", href: "/dashboard/retail/stock-receipts", icon: "📦", bg: GR.green  },
      { label: "New Customer",  href: "/dashboard/retail/customers",      icon: "👤", bg: GR.sky    },
      { label: "Sales History", href: "/dashboard/retail/sales-history",  icon: "📊", bg: GR.indigo },
    ],
    chart: { title: "Sales vs Purchases", revenueLabel: "Sales", expensesLabel: "Purchases" },
  },

  // ── RESTAURANT ─────────────────────────────────────────────
  restaurant: {
    opsTitle: "Service right now",
    verticalEndpoint: "/api/restaurant/control-center",
    kpis: [
      { key: "occupied_tables", label: "Occupied Tables",   icon: "🍽️", color: "#f87171", source: "vertical", metric: "occupiedTables",  format: "number",   caption: "Seated right now",      href: "/dashboard/restaurant/tables" },
      { key: "kitchen_queue",   label: "Kitchen Queue",     icon: "🔥", color: "#f59e0b", source: "vertical", metric: "kitchenOrders",   format: "number",   caption: "Tickets on the pass",   href: "/dashboard/restaurant/kitchen" },
      { key: "today_sales",     label: "Today's Sales",     icon: "💰", color: "#34d399", source: "today",    metric: "todaySales",      format: "currency", caption: "Billed since midnight", href: "/dashboard/restaurant/orders" },
      { key: "recipe_margin",   label: "Avg Recipe Margin", icon: "📈", color: "#818cf8", source: "vertical", metric: "avgRecipeMargin", format: "percent",  caption: "Across the menu",       href: "/dashboard/restaurant/recipe-costing" },
    ],
    opsStrip: [
      { label: "Open Orders",       icon: "📋", color: "#38bdf8", source: "vertical", metric: "openOrders",       format: "number",  href: "/dashboard/restaurant/orders" },
      { label: "Ready to Serve",    icon: "🔔", color: "#34d399", source: "vertical", metric: "readyOrders",      format: "number",  href: "/dashboard/restaurant/kitchen" },
      { label: "Reservations",      icon: "📅", color: "#a78bfa", source: "vertical", metric: "reservations",     format: "number",  href: "/dashboard/restaurant/reservations" },
      { label: "Menu Items",        icon: "🍜", color: "#fbbf24", source: "vertical", metric: "menuItems",        format: "number",  href: "/dashboard/restaurant/menu" },
      { label: "Cancellation Rate", icon: "🚫", color: "#f87171", source: "vertical", metric: "cancellationRate", format: "percent" },
    ],
    actions: [
      { label: "New Order",       href: "/dashboard/restaurant/orders",       icon: "📝", bg: GR.rose   },
      { label: "Table Map",       href: "/dashboard/restaurant/tables",       icon: "🍽️", bg: GR.amber  },
      { label: "Kitchen Display", href: "/dashboard/restaurant/kitchen",      icon: "🔥", bg: GR.green  },
      { label: "Reservations",    href: "/dashboard/restaurant/reservations", icon: "📅", bg: GR.violet },
    ],
    chart: { title: "Sales vs Food Cost", revenueLabel: "Sales", expensesLabel: "Cost" },
  },

  // ── HOSPITAL ───────────────────────────────────────────────
  hospital: {
    opsTitle: "Wards & OPD today",
    verticalEndpoint: "/api/hospital/control-center",
    kpis: [
      { key: "today_appointments", label: "Today's Appointments", icon: "📅", color: "#38bdf8", source: "vertical", metric: "todayAppointments", format: "number",   caption: "Scheduled for today", href: "/dashboard/hospital/appointments" },
      { key: "admitted",           label: "Admitted Patients",    icon: "🛏️", color: "#34d399", source: "vertical", metric: "activePatients",    format: "number",   caption: "In ward or ICU",      href: "/dashboard/hospital/patients" },
      { key: "pending_labs",       label: "Pending Labs",         icon: "🧪", color: "#fbbf24", source: "vertical", metric: "pendingLabs",       format: "number",   caption: "Awaiting results",    href: "/dashboard/hospital/lab" },
      { key: "collections",        label: "Collections",          icon: "💰", color: "#10b981", source: "core",     metric: "revenue",           format: "currency", deltaMetric: "revenueGrowth", deltaTone: "up-good" },
    ],
    opsStrip: [
      { label: "Total Patients",       icon: "📇", color: "#38bdf8", source: "vertical", metric: "patients",              format: "number", href: "/dashboard/hospital/patients" },
      { label: "ICU Patients",         icon: "🚑", color: "#f87171", source: "vertical", metric: "icuPatients",           format: "number", href: "/dashboard/hospital/patients" },
      { label: "Urgent Labs",          icon: "⚡", color: "#fb7185", source: "vertical", metric: "urgentPendingLabs",     format: "number", href: "/dashboard/hospital/lab" },
      { label: "Active Prescriptions", icon: "💊", color: "#a78bfa", source: "vertical", metric: "activePrescriptions",   format: "number", href: "/dashboard/hospital/prescriptions" },
      { label: "Appointments Done",    icon: "✅", color: "#34d399", source: "vertical", metric: "completedAppointments", format: "number", href: "/dashboard/hospital/appointments" },
    ],
    actions: [
      { label: "New Patient",      href: "/dashboard/hospital/patients",      icon: "👤", bg: GR.teal   },
      { label: "Book Appointment", href: "/dashboard/hospital/appointments",  icon: "📅", bg: GR.sky    },
      { label: "New Prescription", href: "/dashboard/hospital/prescriptions", icon: "💊", bg: GR.violet },
      { label: "Lab Request",      href: "/dashboard/hospital/lab",           icon: "🧪", bg: GR.amber  },
    ],
    chart: { title: "Collections vs Operating Cost", revenueLabel: "Collections", expensesLabel: "Cost" },
  },
  // ── INVESTOR / PROFIT SHARING ──────────────────────────────
  investor: {
    opsTitle: "Portfolio today",
    verticalEndpoint: "/api/investors/control-center",
    kpis: [
      { key: "capital_placed", label: "Capital Placed",     icon: "💰", color: "#14b8a6", source: "vertical", metric: "capitalPlaced",     format: "currency", caption: "Net money at work",     href: "/dashboard/investors/capital" },
      { key: "month_earned",   label: "This Month's Share", icon: "📈", color: "#10b981", source: "vertical", metric: "monthEarned",       format: "currency", caption: "Earned so far this month", href: "/dashboard/investors/production" },
      { key: "outstanding",    label: "Outstanding",        icon: "🧾", color: "#fbbf24", source: "vertical", metric: "outstandingBalance", format: "currency", caption: "Owed to you",           href: "/dashboard/investors/settlements" },
      { key: "active_parties", label: "Active Investments", icon: "🤝", color: "#818cf8", source: "vertical", metric: "activeParties",      format: "number",   caption: "Parties holding capital", href: "/dashboard/investors/parties" },
    ],
    opsStrip: [
      { label: "Overdue Settlements",  icon: "⏰", color: "#f87171", source: "vertical", metric: "overdueSettlements",  format: "number",   href: "/dashboard/investors/settlements" },
      { label: "Open Production Lines", icon: "🏭", color: "#38bdf8", source: "vertical", metric: "openProductionLines", format: "number",   href: "/dashboard/investors/production" },
      { label: "Capital Invested",     icon: "📥", color: "#34d399", source: "vertical", metric: "capitalInvested",     format: "currency", href: "/dashboard/investors/capital" },
      { label: "Capital Withdrawn",    icon: "📤", color: "#fb7185", source: "vertical", metric: "capitalWithdrawn",    format: "currency", href: "/dashboard/investors/capital" },
    ],
    actions: [
      { label: "Add Capital",       href: "/dashboard/investors/capital",     icon: "💰", bg: GR.teal   },
      { label: "Record Production", href: "/dashboard/investors/production",  icon: "🏭", bg: GR.sky    },
      { label: "Settle Cycle",      href: "/dashboard/investors/settlements", icon: "🧾", bg: GR.amber  },
      { label: "View Statement",    href: "/dashboard/investors/statement",   icon: "📄", bg: GR.indigo },
    ],
    chart: { title: "Capital vs Returns", revenueLabel: "Returns", expensesLabel: "Capital" },
  },
};

export function getDashboardLayout(businessType: string | null | undefined): DashboardLayout {
  if (!businessType) return DEFAULT_DASHBOARD_LAYOUT;
  return DASHBOARD_LAYOUTS[businessType as BusinessType] || DEFAULT_DASHBOARD_LAYOUT;
}

/** Business types that currently ship a hand-tuned dashboard layout. */
export const CUSTOM_DASHBOARD_TYPES = Object.keys(DASHBOARD_LAYOUTS) as BusinessType[];
