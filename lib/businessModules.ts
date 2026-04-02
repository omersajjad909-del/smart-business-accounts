// ─────────────────────────────────────────────────────────────
//  Business Module Configuration — Complete System
//  61 business types, each with:
//    - modules (sidebar features)
//    - defaultAccounts (Chart of Accounts to pre-create)
//    - kpis (dashboard metrics)
//    - quickActions (homepage shortcuts)
// ─────────────────────────────────────────────────────────────

export type BusinessType =
  | "trading" | "manufacturing" | "distribution" | "retail"
  | "service" | "restaurant" | "real_estate" | "construction"
  | "school" | "hospital" | "hotel" | "pharmacy" | "salon"
  | "gym" | "transport" | "agriculture" | "ngo" | "ecommerce"
  | "law_firm" | "it_company" | "food_processing" | "clinic"
  // Automotive
  | "car_showroom" | "car_workshop" | "spare_parts" | "car_rental"
  // Media & Advertising
  | "advertising_agency" | "digital_marketing" | "media_house" | "production_house" | "printing_press"
  // Subscription
  | "saas_company" | "membership_website" | "subscription_box" | "isp" | "cable_network"
  // Professional Firms
  | "accounting_firm" | "audit_firm" | "consultancy_firm" | "architecture_firm"
  // Repair & Maintenance
  | "mobile_repair" | "computer_repair" | "electronics_repair" | "equipment_maintenance"
  // Energy & Utilities
  | "solar_company" | "electric_company" | "gas_distribution" | "water_supply"
  // Import / Export
  | "import_company" | "export_company" | "clearing_forwarding"
  // Event Management
  | "event_planner" | "wedding_planner" | "decorator" | "sound_services"
  // Rental Business
  | "equipment_rental" | "property_rental" | "generator_rental"
  // Franchise
  | "chain_store" | "franchise_restaurant" | "franchise_brand";

export type ModuleKey =
  | "dashboard" | "ai_assistant"
  | "sales_invoice" | "purchase_invoice" | "purchase_order" | "quotation"
  | "delivery_challan" | "sale_return" | "outward"
  | "bank_reconciliation" | "payment_receipts" | "expense_vouchers"
  | "tax_configuration" | "cpv" | "crv" | "jv" | "contra"
  | "advance_payment" | "petty_cash" | "credit_note" | "debit_note"
  | "loans" | "recurring" | "opening_balances"
  | "chart_of_accounts" | "inventory_items" | "stock_rates" | "barcode"
  | "reports_financial" | "reports_inventory"
  | "crm" | "hr_payroll" | "admin_settings"
  | "bom" | "production_orders" | "work_orders" | "raw_materials"
  | "restaurant_tables" | "restaurant_menu" | "kitchen_orders" | "recipe_costing"
  | "re_properties" | "re_tenants" | "re_rent" | "re_leases"
  | "projects" | "site_management" | "material_requests" | "subcontractors"
  | "routes" | "delivery_tracking" | "van_sales"
  | "pos" | "loyalty_points" | "product_catalog" | "stock_transfer" | "branch_reports" | "online_store_sync" | "supplier_portal"
  | "student_mgmt" | "fee_collection" | "class_schedule" | "exam_results"
  | "patient_records" | "appointments" | "prescriptions" | "lab_tests"
  | "room_booking" | "housekeeping" | "room_service" | "front_desk"
  | "drug_inventory" | "prescriptions_pharmacy" | "expiry_tracking"
  | "appointments_salon" | "stylist_mgmt" | "service_menu"
  | "memberships" | "class_schedule_gym" | "trainer_mgmt"
  | "fleet_mgmt" | "trips" | "driver_mgmt" | "fuel_tracking"
  | "crop_mgmt" | "livestock" | "field_mgmt" | "harvest"
  | "donor_mgmt" | "grant_tracking" | "beneficiary_mgmt" | "fund_accounting"
  | "product_listings" | "order_mgmt" | "returns_mgmt" | "shipping"
  | "case_mgmt" | "billing_legal" | "client_portal" | "time_billing"
  | "project_mgmt" | "sprint_tracking" | "client_contracts" | "tech_support"
  | "vehicle_inventory" | "service_jobs" | "parts_inventory" | "vehicle_rental"
  | "ad_campaigns" | "media_planning" | "content_production" | "print_jobs"
  | "subscriptions" | "mrr_tracking" | "bandwidth_mgmt" | "billing_recurring"
  | "audit_files" | "consulting_projects" | "architectural_drawings"
  | "repair_jobs" | "spare_parts_repair" | "warranty_tracking"
  | "solar_projects" | "utility_billing" | "meter_reading"
  | "shipments" | "customs_clearance" | "lc_management"
  | "event_bookings" | "vendor_management" | "event_budget"
  | "rental_items" | "rental_agreements" | "maintenance_schedule"
  | "franchise_outlets" | "royalty_tracking" | "brand_compliance";

export interface DefaultAccount {
  code: string;
  name: string;
  type: string; // Asset | Liability | Equity | Revenue | Expense
  parentType?: string;
}

export interface KPI {
  key: string;
  label: string;
  icon: string;
  color: string;
}

export interface QuickAction {
  label: string;
  href: string;
  icon: string;
  color: string;
}

export type PhaseStatus = "live" | "coming_soon" | "beta";

export interface BusinessTypeMeta {
  id: BusinessType;
  label: string;
  icon: string;
  emoji: string;
  description: string;
  tagline: string;
  color: string;
  gradient: string;
  category: string;
  phase?: 1 | 2 | 3 | 4;           // which release phase
  status?: PhaseStatus;              // live | coming_soon | beta
  modules: ModuleKey[];
  defaultAccounts: DefaultAccount[];
  kpis: KPI[];
  quickActions: QuickAction[];
}

// ── Core modules every business type gets ───────────────────
const CORE: ModuleKey[] = [
  "dashboard", "ai_assistant",
  "chart_of_accounts", "cpv", "crv", "jv", "contra", "advance_payment",
  "petty_cash", "credit_note", "debit_note", "bank_reconciliation",
  "payment_receipts", "expense_vouchers", "tax_configuration",
  "loans", "recurring", "reports_financial", "admin_settings", "opening_balances",
];

// ── Common accounts every business needs ───────────────────
const COMMON_ACCOUNTS: DefaultAccount[] = [
  { code: "1001", name: "Cash in Hand", type: "Asset" },
  { code: "1002", name: "Bank Account", type: "Asset" },
  { code: "1003", name: "Petty Cash", type: "Asset" },
  { code: "2001", name: "Accounts Payable", type: "Liability" },
  { code: "2002", name: "Tax Payable", type: "Liability" },
  { code: "3001", name: "Owner's Capital", type: "Equity" },
  { code: "4001", name: "Sales Revenue", type: "Revenue" },
  { code: "5001", name: "Salaries & Wages", type: "Expense" },
  { code: "5002", name: "Rent Expense", type: "Expense" },
  { code: "5003", name: "Utilities Expense", type: "Expense" },
  { code: "5004", name: "Office Expenses", type: "Expense" },
  { code: "5005", name: "Miscellaneous Expense", type: "Expense" },
];

// ────────────────────────────────────────────────────────────
//  ALL BUSINESS TYPES
// ────────────────────────────────────────────────────────────
export const BUSINESS_TYPES: BusinessTypeMeta[] = [

  // ── TRADING ───────────────────────────────────────────────
  {
    id: "trading", label: "Trading", icon: "🛒", emoji: "🛒",
    description: "Buy & sell goods — general merchandise, hardware, electronics, wholesale",
    tagline: "Purchase → Sell → Profit",
    color: "#38bdf8", gradient: "linear-gradient(135deg,#0ea5e9,#38bdf8)", category: "Commerce",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","quotation","delivery_challan","sale_return","outward","inventory_items","stock_rates","barcode","reports_inventory","crm","hr_payroll"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Accounts Receivable", type: "Asset" },
      { code: "1200", name: "Inventory / Stock", type: "Asset" },
      { code: "4002", name: "Sales Returns", type: "Revenue" },
      { code: "5100", name: "Cost of Goods Sold", type: "Expense" },
      { code: "5101", name: "Purchase Returns", type: "Expense" },
      { code: "5102", name: "Freight & Carriage", type: "Expense" },
      { code: "5103", name: "Packaging Expense", type: "Expense" },
    ],
    kpis: [
      { key: "daily_sales", label: "Today's Sales", icon: "💰", color: "#38bdf8" },
      { key: "stock_value", label: "Stock Value", icon: "📦", color: "#34d399" },
      { key: "receivables", label: "Receivables", icon: "🧾", color: "#fbbf24" },
      { key: "payables", label: "Payables", icon: "💳", color: "#f87171" },
    ],
    quickActions: [
      { label: "New Sale", href: "/dashboard/sales-invoice", icon: "🧾", color: "#38bdf8" },
      { label: "New Purchase", href: "/dashboard/purchase-invoice", icon: "📦", color: "#34d399" },
      { label: "Receive Payment", href: "/dashboard/payment-receipts", icon: "💰", color: "#fbbf24" },
      { label: "Stock Report", href: "/dashboard/reports/stock", icon: "📊", color: "#818cf8" },
    ],
  },

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── MANUFACTURING ──────────────────────────────────────────
  {
    id: "manufacturing", label: "Manufacturing", icon: "🏭", emoji: "🏭",
    description: "Produce goods from raw materials — factories, garments, food processing",
    tagline: "Raw Material → Production → Finished Goods",
    color: "#f59e0b", gradient: "linear-gradient(135deg,#d97706,#f59e0b)", category: "Production",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","quotation","delivery_challan","sale_return","outward","inventory_items","stock_rates","barcode","reports_inventory","crm","hr_payroll","bom","production_orders","work_orders","raw_materials"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Accounts Receivable", type: "Asset" },
      { code: "1200", name: "Raw Material Stock", type: "Asset" },
      { code: "1201", name: "Work In Progress", type: "Asset" },
      { code: "1202", name: "Finished Goods", type: "Asset" },
      { code: "1203", name: "Factory Equipment", type: "Asset" },
      { code: "5100", name: "Raw Material Cost", type: "Expense" },
      { code: "5101", name: "Factory Labour", type: "Expense" },
      { code: "5102", name: "Manufacturing Overhead", type: "Expense" },
      { code: "5103", name: "Machine Maintenance", type: "Expense" },
      { code: "5104", name: "Quality Control", type: "Expense" },
      { code: "5105", name: "Factory Electricity", type: "Expense" },
    ],
    kpis: [
      { key: "production_today", label: "Units Produced", icon: "⚙️", color: "#f59e0b" },
      { key: "raw_material_value", label: "Raw Material Value", icon: "📦", color: "#34d399" },
      { key: "production_cost", label: "Production Cost", icon: "🏭", color: "#f87171" },
      { key: "finished_goods", label: "Finished Goods", icon: "✅", color: "#818cf8" },
    ],
    quickActions: [
      { label: "New Production Order", href: "/dashboard/manufacturing/production-orders", icon: "⚙️", color: "#f59e0b" },
      { label: "View BOM", href: "/dashboard/manufacturing/bom", icon: "🗂️", color: "#fbbf24" },
      { label: "Raw Material Purchase", href: "/dashboard/purchase-invoice", icon: "📦", color: "#34d399" },
      { label: "Dispatch Goods", href: "/dashboard/delivery-challan", icon: "🚚", color: "#38bdf8" },
    ],
  },
  */

  // ── DISTRIBUTION ───────────────────────────────────────────
  {
    id: "distribution", label: "Distribution / Wholesale", icon: "🚚", emoji: "🚚",
    description: "Distribute products to retailers — FMCG, pharma, electronics distribution",
    tagline: "Warehouse → Routes → Delivery",
    color: "#8b5cf6", gradient: "linear-gradient(135deg,#7c3aed,#8b5cf6)", category: "Commerce",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","quotation","delivery_challan","sale_return","outward","inventory_items","stock_rates","barcode","reports_inventory","crm","hr_payroll","routes","delivery_tracking","van_sales"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Accounts Receivable", type: "Asset" },
      { code: "1200", name: "Warehouse Inventory", type: "Asset" },
      { code: "1201", name: "Vehicles / Fleet", type: "Asset" },
      { code: "5100", name: "Cost of Goods Sold", type: "Expense" },
      { code: "5101", name: "Fuel & Transport", type: "Expense" },
      { code: "5102", name: "Vehicle Maintenance", type: "Expense" },
      { code: "5103", name: "Warehouse Expense", type: "Expense" },
      { code: "5104", name: "Delivery Staff Wages", type: "Expense" },
    ],
    kpis: [
      { key: "deliveries_today", label: "Deliveries Today", icon: "🚚", color: "#8b5cf6" },
      { key: "daily_sales", label: "Today's Sales", icon: "💰", color: "#34d399" },
      { key: "stock_value", label: "Stock Value", icon: "📦", color: "#fbbf24" },
      { key: "receivables", label: "Receivables", icon: "🧾", color: "#f87171" },
    ],
    quickActions: [
      { label: "New Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#8b5cf6" },
      { label: "Delivery Challan", href: "/dashboard/delivery-challan", icon: "🚚", color: "#38bdf8" },
      { label: "Purchase Stock", href: "/dashboard/purchase-invoice", icon: "📦", color: "#34d399" },
      { label: "Route Management", href: "/dashboard/distribution/routes", icon: "🗺️", color: "#fbbf24" },
    ],
  },

  // ── RETAIL ────────────────────────────────────────────────
  {
    id: "retail", label: "Retail / Multi-Store", icon: "🏪", emoji: "🏪",
    description: "Sell directly to consumers — shops, supermarkets, boutiques, pharmacies",
    tagline: "Customer In → Sale → Repeat",
    color: "#ec4899", gradient: "linear-gradient(135deg,#db2777,#ec4899)", category: "Commerce",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","sale_return","outward","inventory_items","stock_rates","barcode","reports_inventory","crm","hr_payroll","pos","loyalty_points","product_catalog","stock_transfer","branch_reports","online_store_sync","supplier_portal"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Accounts Receivable", type: "Asset" },
      { code: "1200", name: "Merchandise Inventory", type: "Asset" },
      { code: "5100", name: "Cost of Goods Sold", type: "Expense" },
      { code: "5101", name: "Shop Rent", type: "Expense" },
      { code: "5102", name: "Packaging & Bags", type: "Expense" },
      { code: "5103", name: "POS System Charges", type: "Expense" },
      { code: "5104", name: "Sales Commission", type: "Expense" },
      { code: "5105", name: "Online Marketplace Fees", type: "Expense" },
    ],
    kpis: [
      { key: "daily_sales", label: "Today's Sales", icon: "🛍️", color: "#ec4899" },
      { key: "online_orders", label: "Online Orders", icon: "🌐", color: "#38bdf8" },
      { key: "stock_value", label: "Stock Value", icon: "📦", color: "#fbbf24" },
      { key: "supplier_pending", label: "Pending Deliveries", icon: "🚚", color: "#f87171" },
    ],
    quickActions: [
      { label: "POS Sale", href: "/dashboard/retail/pos", icon: "🖥️", color: "#ec4899" },
      { label: "Sync Store", href: "/dashboard/retail/sync", icon: "🔄", color: "#38bdf8" },
      { label: "Stock Transfer", href: "/dashboard/retail/stock-transfer", icon: "🔄", color: "#34d399" },
      { label: "Supplier Portal", href: "/dashboard/retail/suppliers", icon: "🤝", color: "#f59e0b" },
    ],
  },

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── RESTAURANT ────────────────────────────────────────────
  {
    id: "restaurant", label: "Restaurant / Café", icon: "🍽️", emoji: "🍽️",
    description: "Food service — restaurants, cafes, bakeries, catering, food courts",
    tagline: "Order → Cook → Serve → Bill",
    color: "#f87171", gradient: "linear-gradient(135deg,#dc2626,#f87171)", category: "Food & Beverage",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","expense_vouchers","inventory_items","stock_rates","hr_payroll","restaurant_tables","restaurant_menu","kitchen_orders","recipe_costing"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1200", name: "Food & Beverage Stock", type: "Asset" },
      { code: "1201", name: "Kitchen Equipment", type: "Asset" },
      { code: "4001", name: "Dine-In Revenue", type: "Revenue" },
      { code: "4002", name: "Takeaway Revenue", type: "Revenue" },
      { code: "4003", name: "Delivery Revenue", type: "Revenue" },
      { code: "5100", name: "Food Cost", type: "Expense" },
      { code: "5101", name: "Chef & Kitchen Staff", type: "Expense" },
      { code: "5102", name: "Gas & Fuel (Kitchen)", type: "Expense" },
      { code: "5103", name: "Disposables & Packaging", type: "Expense" },
      { code: "5104", name: "Delivery Charges", type: "Expense" },
    ],
    kpis: [
      { key: "tables_occupied", label: "Tables Occupied", icon: "🪑", color: "#f87171" },
      { key: "daily_revenue", label: "Today's Revenue", icon: "💰", color: "#34d399" },
      { key: "avg_order_value", label: "Avg Order Value", icon: "🧾", color: "#fbbf24" },
      { key: "kitchen_orders", label: "Pending Orders", icon: "👨‍🍳", color: "#f59e0b" },
    ],
    quickActions: [
      { label: "Table Management", href: "/dashboard/restaurant/tables", icon: "🪑", color: "#f87171" },
      { label: "Kitchen Orders", href: "/dashboard/restaurant/kitchen", icon: "👨‍🍳", color: "#f59e0b" },
      { label: "New Bill", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Menu", href: "/dashboard/restaurant/menu", icon: "📋", color: "#818cf8" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── HOTEL ─────────────────────────────────────────────────
  {
    id: "hotel", label: "Hotel / Guest House", icon: "🏨", emoji: "🏨",
    description: "Hospitality — hotels, motels, guest houses, resorts, B&B",
    tagline: "Check-In → Stay → Check-Out → Bill",
    color: "#0891b2", gradient: "linear-gradient(135deg,#0e7490,#0891b2)", category: "Hospitality",
    modules: [...CORE, "sales_invoice","purchase_invoice","expense_vouchers","inventory_items","hr_payroll","room_booking","housekeeping","room_service","front_desk","crm"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1201", name: "Furniture & Fixtures", type: "Asset" },
      { code: "1202", name: "Hotel Equipment", type: "Asset" },
      { code: "4001", name: "Room Revenue", type: "Revenue" },
      { code: "4002", name: "Restaurant Revenue", type: "Revenue" },
      { code: "4003", name: "Laundry Revenue", type: "Revenue" },
      { code: "4004", name: "Event/Banquet Revenue", type: "Revenue" },
      { code: "5100", name: "Housekeeping Supplies", type: "Expense" },
      { code: "5101", name: "Laundry Expense", type: "Expense" },
      { code: "5102", name: "Guest Amenities", type: "Expense" },
      { code: "5103", name: "Maintenance & Repairs", type: "Expense" },
    ],
    kpis: [
      { key: "rooms_occupied", label: "Rooms Occupied", icon: "🛏️", color: "#0891b2" },
      { key: "occupancy_rate", label: "Occupancy Rate", icon: "📊", color: "#34d399" },
      { key: "daily_revenue", label: "Today's Revenue", icon: "💰", color: "#fbbf24" },
      { key: "checkouts_today", label: "Check-outs Today", icon: "🚪", color: "#f87171" },
    ],
    quickActions: [
      { label: "Room Booking", href: "/dashboard/hotel/rooms", icon: "🛏️", color: "#0891b2" },
      { label: "Front Desk", href: "/dashboard/hotel/front-desk", icon: "🏨", color: "#38bdf8" },
      { label: "New Bill", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Housekeeping", href: "/dashboard/hotel/housekeeping", icon: "🧹", color: "#818cf8" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── HOSPITAL / CLINIC ─────────────────────────────────────
  {
    id: "hospital", label: "Hospital / Healthcare", icon: "🏥", emoji: "🏥",
    description: "Healthcare — hospitals, clinics, diagnostic centers, specialist practices",
    tagline: "Patient → Diagnosis → Treatment → Bill",
    color: "#10b981", gradient: "linear-gradient(135deg,#059669,#10b981)", category: "Healthcare",
    modules: [...CORE, "sales_invoice","expense_vouchers","hr_payroll","patient_records","appointments","prescriptions","lab_tests","crm"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Patient Receivables", type: "Asset" },
      { code: "1201", name: "Medical Equipment", type: "Asset" },
      { code: "1202", name: "Medicine Inventory", type: "Asset" },
      { code: "4001", name: "OPD Revenue", type: "Revenue" },
      { code: "4002", name: "IPD Revenue", type: "Revenue" },
      { code: "4003", name: "Laboratory Revenue", type: "Revenue" },
      { code: "4004", name: "Surgery Revenue", type: "Revenue" },
      { code: "5100", name: "Medicine Cost", type: "Expense" },
      { code: "5101", name: "Doctor Fees", type: "Expense" },
      { code: "5102", name: "Medical Supplies", type: "Expense" },
      { code: "5103", name: "Lab Chemicals", type: "Expense" },
    ],
    kpis: [
      { key: "patients_today", label: "Patients Today", icon: "🏥", color: "#10b981" },
      { key: "appointments_pending", label: "Appointments", icon: "📅", color: "#38bdf8" },
      { key: "daily_revenue", label: "Today's Revenue", icon: "💰", color: "#fbbf24" },
      { key: "lab_tests_pending", label: "Lab Tests Pending", icon: "🔬", color: "#818cf8" },
    ],
    quickActions: [
      { label: "New Patient", href: "/dashboard/clinic/patients", icon: "👤", color: "#10b981" },
      { label: "Appointments", href: "/dashboard/clinic/appointments", icon: "📅", color: "#38bdf8" },
      { label: "New Bill", href: "/dashboard/sales-invoice", icon: "🧾", color: "#fbbf24" },
      { label: "Prescriptions", href: "/dashboard/clinic/prescriptions", icon: "💊", color: "#818cf8" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── CLINIC (smaller than hospital) ─────────────────────────
  {
    id: "clinic", label: "Clinic / Doctor Practice", icon: "🩺", emoji: "🩺",
    description: "Small clinic, GP practice, dental, eye, skin specialist",
    tagline: "Appointment → Consult → Prescribe → Bill",
    color: "#06b6d4", gradient: "linear-gradient(135deg,#0891b2,#06b6d4)", category: "Healthcare",
    modules: [...CORE, "sales_invoice","expense_vouchers","hr_payroll","patient_records","appointments","prescriptions","crm"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Patient Receivables", type: "Asset" },
      { code: "1202", name: "Medical Supplies Stock", type: "Asset" },
      { code: "4001", name: "Consultation Revenue", type: "Revenue" },
      { code: "4002", name: "Procedure Revenue", type: "Revenue" },
      { code: "5100", name: "Medical Supplies", type: "Expense" },
      { code: "5101", name: "Equipment Maintenance", type: "Expense" },
    ],
    kpis: [
      { key: "patients_today", label: "Patients Today", icon: "🩺", color: "#06b6d4" },
      { key: "appointments_today", label: "Appointments", icon: "📅", color: "#818cf8" },
      { key: "daily_revenue", label: "Revenue Today", icon: "💰", color: "#34d399" },
      { key: "pending_bills", label: "Pending Bills", icon: "🧾", color: "#fbbf24" },
    ],
    quickActions: [
      { label: "New Appointment", href: "/dashboard/clinic/appointments", icon: "📅", color: "#06b6d4" },
      { label: "Patient Records", href: "/dashboard/clinic/patients", icon: "👤", color: "#38bdf8" },
      { label: "Issue Bill", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Prescriptions", href: "/dashboard/clinic/prescriptions", icon: "💊", color: "#818cf8" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── PHARMACY ──────────────────────────────────────────────
  {
    id: "pharmacy", label: "Pharmacy / Medical Store", icon: "💊", emoji: "💊",
    description: "Retail pharmacy, medical store, chemist, drug store",
    tagline: "Prescription → Dispense → Bill",
    color: "#0d9488", gradient: "linear-gradient(135deg,#0f766e,#0d9488)", category: "Healthcare",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","sale_return","inventory_items","stock_rates","barcode","reports_inventory","hr_payroll","drug_inventory","prescriptions_pharmacy","expiry_tracking","pos"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Customer Receivables", type: "Asset" },
      { code: "1200", name: "Medicine Inventory", type: "Asset" },
      { code: "4001", name: "Medicine Sales", type: "Revenue" },
      { code: "4002", name: "OTC Sales", type: "Revenue" },
      { code: "5100", name: "Medicine Purchase Cost", type: "Expense" },
      { code: "5101", name: "Drug Disposal Cost", type: "Expense" },
      { code: "5102", name: "Cold Storage Cost", type: "Expense" },
    ],
    kpis: [
      { key: "daily_sales", label: "Today's Sales", icon: "💊", color: "#0d9488" },
      { key: "prescriptions_filled", label: "Rx Filled Today", icon: "📋", color: "#38bdf8" },
      { key: "expiring_soon", label: "Expiring Soon", icon: "⚠️", color: "#f87171" },
      { key: "low_stock_items", label: "Low Stock Items", icon: "📦", color: "#fbbf24" },
    ],
    quickActions: [
      { label: "POS Sale", href: "/dashboard/retail/pos", icon: "🖥️", color: "#0d9488" },
      { label: "Expiry Check", href: "/dashboard/pharmacy/expiry", icon: "⚠️", color: "#f87171" },
      { label: "Purchase Medicine", href: "/dashboard/purchase-invoice", icon: "📦", color: "#34d399" },
      { label: "Stock Report", href: "/dashboard/reports/stock", icon: "📊", color: "#818cf8" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── SCHOOL / EDUCATION ────────────────────────────────────
  {
    id: "school", label: "School / Academy", icon: "🏫", emoji: "🏫",
    description: "Educational institutions — schools, colleges, academies, coaching centers",
    tagline: "Enroll → Teach → Exam → Result",
    color: "#6366f1", gradient: "linear-gradient(135deg,#4f46e5,#6366f1)", category: "Education",
    modules: [...CORE, "sales_invoice","expense_vouchers","hr_payroll","student_mgmt","fee_collection","class_schedule","exam_results","crm"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Fee Receivables", type: "Asset" },
      { code: "1201", name: "School Equipment", type: "Asset" },
      { code: "4001", name: "Tuition Fee", type: "Revenue" },
      { code: "4002", name: "Admission Fee", type: "Revenue" },
      { code: "4003", name: "Exam Fee", type: "Revenue" },
      { code: "4004", name: "Transport Fee", type: "Revenue" },
      { code: "5100", name: "Teacher Salaries", type: "Expense" },
      { code: "5101", name: "Books & Stationery", type: "Expense" },
      { code: "5102", name: "School Transport", type: "Expense" },
      { code: "5103", name: "Exam Expenses", type: "Expense" },
    ],
    kpis: [
      { key: "students_enrolled", label: "Total Students", icon: "👨‍🎓", color: "#6366f1" },
      { key: "fee_collected_month", label: "Fee This Month", icon: "💰", color: "#34d399" },
      { key: "fee_pending", label: "Fee Pending", icon: "⏳", color: "#f87171" },
      { key: "attendance_today", label: "Attendance Today", icon: "📋", color: "#38bdf8" },
    ],
    quickActions: [
      { label: "Collect Fee", href: "/dashboard/school/fees", icon: "💰", color: "#6366f1" },
      { label: "Attendance", href: "/dashboard/attendance", icon: "📋", color: "#38bdf8" },
      { label: "New Student", href: "/dashboard/school/students", icon: "👤", color: "#34d399" },
      { label: "Exam Results", href: "/dashboard/school/results", icon: "📊", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── CONSTRUCTION ──────────────────────────────────────────
  {
    id: "construction", label: "Construction / Contractor", icon: "🏗️", emoji: "🏗️",
    description: "Construction & contracting — builders, civil contractors, infrastructure",
    tagline: "Project → Build → Complete → Bill",
    color: "#fb923c", gradient: "linear-gradient(135deg,#ea580c,#fb923c)", category: "Construction",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","expense_vouchers","inventory_items","stock_rates","hr_payroll","crm","projects","site_management","material_requests","subcontractors"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Client Receivables", type: "Asset" },
      { code: "1200", name: "Construction Materials", type: "Asset" },
      { code: "1201", name: "Heavy Machinery", type: "Asset" },
      { code: "4001", name: "Contract Revenue", type: "Revenue" },
      { code: "4002", name: "Retention Money", type: "Revenue" },
      { code: "5100", name: "Material Cost", type: "Expense" },
      { code: "5101", name: "Labour Wages", type: "Expense" },
      { code: "5102", name: "Equipment Rental", type: "Expense" },
      { code: "5103", name: "Subcontractor Payments", type: "Expense" },
      { code: "5104", name: "Site Expenses", type: "Expense" },
    ],
    kpis: [
      { key: "active_projects", label: "Active Projects", icon: "🏗️", color: "#fb923c" },
      { key: "this_month_billing", label: "Month Billing", icon: "🧾", color: "#34d399" },
      { key: "pending_receivables", label: "Pending Bills", icon: "💰", color: "#fbbf24" },
      { key: "labour_count", label: "Workers On Site", icon: "👷", color: "#818cf8" },
    ],
    quickActions: [
      { label: "New Project", href: "/dashboard/projects", icon: "📁", color: "#fb923c" },
      { label: "Bill Client", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Purchase Material", href: "/dashboard/purchase-invoice", icon: "📦", color: "#38bdf8" },
      { label: "Pay Labour", href: "/dashboard/cpv", icon: "💰", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── REAL ESTATE ───────────────────────────────────────────
  {
    id: "real_estate", label: "Real Estate", icon: "🏢", emoji: "🏢",
    description: "Property business — rental, development, property management",
    tagline: "Property → Tenant → Rent → Income",
    color: "#818cf8", gradient: "linear-gradient(135deg,#4f46e5,#818cf8)", category: "Real Estate",
    modules: [...CORE, "sales_invoice","expense_vouchers","crm","hr_payroll","re_properties","re_tenants","re_rent","re_leases"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Rent Receivables", type: "Asset" },
      { code: "1200", name: "Properties (Land)", type: "Asset" },
      { code: "1201", name: "Buildings & Structures", type: "Asset" },
      { code: "2100", name: "Security Deposits Held", type: "Liability" },
      { code: "4001", name: "Rental Income", type: "Revenue" },
      { code: "4002", name: "Property Sale Income", type: "Revenue" },
      { code: "4003", name: "Commission Income", type: "Revenue" },
      { code: "5100", name: "Property Maintenance", type: "Expense" },
      { code: "5101", name: "Property Tax", type: "Expense" },
      { code: "5102", name: "Insurance Expense", type: "Expense" },
      { code: "5103", name: "Marketing & Advertising", type: "Expense" },
    ],
    kpis: [
      { key: "total_properties", label: "Total Properties", icon: "🏢", color: "#818cf8" },
      { key: "monthly_rent", label: "Monthly Rent", icon: "💰", color: "#34d399" },
      { key: "vacant_units", label: "Vacant Units", icon: "🔑", color: "#fbbf24" },
      { key: "rent_overdue", label: "Rent Overdue", icon: "⚠️", color: "#f87171" },
    ],
    quickActions: [
      { label: "Record Rent", href: "/dashboard/real-estate/rent", icon: "💰", color: "#818cf8" },
      { label: "Add Property", href: "/dashboard/real-estate/properties", icon: "🏢", color: "#6366f1" },
      { label: "Tenant List", href: "/dashboard/real-estate/tenants", icon: "👤", color: "#38bdf8" },
      { label: "Lease Agreements", href: "/dashboard/real-estate/leases", icon: "📄", color: "#34d399" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── SERVICE / AGENCY ──────────────────────────────────────
  {
    id: "service", label: "Service / Agency", icon: "💼", emoji: "💼",
    description: "Professional services — consultants, agencies, marketing, design firms",
    tagline: "Contract → Deliver → Invoice → Repeat",
    color: "#34d399", gradient: "linear-gradient(135deg,#059669,#34d399)", category: "Services",
    modules: [...CORE, "sales_invoice","quotation","expense_vouchers","crm","hr_payroll","projects","reports_financial"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Client Receivables", type: "Asset" },
      { code: "4001", name: "Service Revenue", type: "Revenue" },
      { code: "4002", name: "Project Revenue", type: "Revenue" },
      { code: "4003", name: "Retainer Income", type: "Revenue" },
      { code: "5100", name: "Freelancer / Outsource", type: "Expense" },
      { code: "5101", name: "Software Subscriptions", type: "Expense" },
      { code: "5102", name: "Marketing Expense", type: "Expense" },
      { code: "5103", name: "Travel & Meetings", type: "Expense" },
    ],
    kpis: [
      { key: "active_projects", label: "Active Projects", icon: "📁", color: "#34d399" },
      { key: "monthly_revenue", label: "Monthly Revenue", icon: "💰", color: "#38bdf8" },
      { key: "outstanding_invoices", label: "Outstanding Invoices", icon: "🧾", color: "#fbbf24" },
      { key: "new_clients", label: "New Clients", icon: "🤝", color: "#818cf8" },
    ],
    quickActions: [
      { label: "New Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "New Quotation", href: "/dashboard/quotation", icon: "📄", color: "#38bdf8" },
      { label: "Projects", href: "/dashboard/projects", icon: "📁", color: "#818cf8" },
      { label: "CRM Contacts", href: "/dashboard/crm/contacts", icon: "🤝", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── IT COMPANY ────────────────────────────────────────────
  {
    id: "it_company", label: "IT Company / Software House", icon: "💻", emoji: "💻",
    description: "Technology companies — software development, IT services, SaaS, web design",
    tagline: "Requirement → Develop → Deploy → Invoice",
    color: "#7c3aed", gradient: "linear-gradient(135deg,#6d28d9,#7c3aed)", category: "Technology",
    modules: [...CORE, "sales_invoice","quotation","expense_vouchers","crm","hr_payroll","project_mgmt","sprint_tracking","client_contracts","tech_support","reports_financial"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Client Receivables", type: "Asset" },
      { code: "1201", name: "Computer Equipment", type: "Asset" },
      { code: "4001", name: "Development Revenue", type: "Revenue" },
      { code: "4002", name: "SaaS / Subscription Revenue", type: "Revenue" },
      { code: "4003", name: "Maintenance Revenue", type: "Revenue" },
      { code: "5100", name: "Developer Salaries", type: "Expense" },
      { code: "5101", name: "Cloud / Hosting", type: "Expense" },
      { code: "5102", name: "Software Licenses", type: "Expense" },
      { code: "5103", name: "Training & Courses", type: "Expense" },
    ],
    kpis: [
      { key: "active_projects", label: "Active Projects", icon: "💻", color: "#7c3aed" },
      { key: "monthly_mrr", label: "MRR", icon: "💰", color: "#34d399" },
      { key: "open_tickets", label: "Open Tickets", icon: "🎫", color: "#f87171" },
      { key: "team_size", label: "Team Members", icon: "👥", color: "#38bdf8" },
    ],
    quickActions: [
      { label: "New Project", href: "/dashboard/projects", icon: "📁", color: "#7c3aed" },
      { label: "Invoice Client", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Send Quotation", href: "/dashboard/quotation", icon: "📄", color: "#38bdf8" },
      { label: "Support Tickets", href: "/dashboard/projects/tickets", icon: "🎫", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── LAW FIRM ──────────────────────────────────────────────
  {
    id: "law_firm", label: "Law Firm / Consultancy", icon: "⚖️", emoji: "⚖️",
    description: "Legal services, consultancy, accounting firms, auditors",
    tagline: "Case → Work → Time → Bill",
    color: "#92400e", gradient: "linear-gradient(135deg,#78350f,#92400e)", category: "Services",
    modules: [...CORE, "sales_invoice","quotation","expense_vouchers","crm","hr_payroll","case_mgmt","billing_legal","client_portal","time_billing"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Client Receivables", type: "Asset" },
      { code: "2100", name: "Retainer Received", type: "Liability" },
      { code: "4001", name: "Legal Fees", type: "Revenue" },
      { code: "4002", name: "Retainer Income", type: "Revenue" },
      { code: "4003", name: "Court Filing Fees Recovered", type: "Revenue" },
      { code: "5100", name: "Court Filing Fees", type: "Expense" },
      { code: "5101", name: "Legal Research", type: "Expense" },
      { code: "5102", name: "Bar Association Fees", type: "Expense" },
    ],
    kpis: [
      { key: "active_cases", label: "Active Cases", icon: "⚖️", color: "#92400e" },
      { key: "monthly_billing", label: "Month Billing", icon: "💰", color: "#34d399" },
      { key: "pending_receivables", label: "Pending Fees", icon: "🧾", color: "#fbbf24" },
      { key: "clients", label: "Total Clients", icon: "👤", color: "#818cf8" },
    ],
    quickActions: [
      { label: "New Case", href: "/dashboard/cases", icon: "📁", color: "#92400e" },
      { label: "Bill Client", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Client Retainer", href: "/dashboard/payment-receipts", icon: "💰", color: "#38bdf8" },
      { label: "Time Log", href: "/dashboard/cases/time", icon: "⏱️", color: "#818cf8" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── SALON / BEAUTY ────────────────────────────────────────
  {
    id: "salon", label: "Salon / Beauty Parlour", icon: "💇", emoji: "💇",
    description: "Beauty & grooming — hair salon, spa, barbershop, nail studio, skincare",
    tagline: "Appointment → Service → Pay → Return",
    color: "#db2777", gradient: "linear-gradient(135deg,#be185d,#db2777)", category: "Beauty & Wellness",
    modules: [...CORE, "sales_invoice","expense_vouchers","inventory_items","hr_payroll","appointments_salon","stylist_mgmt","service_menu","pos","crm"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1200", name: "Beauty Products Stock", type: "Asset" },
      { code: "4001", name: "Service Revenue", type: "Revenue" },
      { code: "4002", name: "Product Sales", type: "Revenue" },
      { code: "5100", name: "Beauty Products Cost", type: "Expense" },
      { code: "5101", name: "Stylist Commission", type: "Expense" },
      { code: "5102", name: "Salon Equipment Maintenance", type: "Expense" },
    ],
    kpis: [
      { key: "appointments_today", label: "Appointments Today", icon: "📅", color: "#db2777" },
      { key: "daily_revenue", label: "Today's Revenue", icon: "💰", color: "#34d399" },
      { key: "stylists_active", label: "Stylists Working", icon: "💇", color: "#818cf8" },
      { key: "products_low_stock", label: "Low Stock Products", icon: "⚠️", color: "#fbbf24" },
    ],
    quickActions: [
      { label: "New Appointment", href: "/dashboard/salon/appointments", icon: "📅", color: "#db2777" },
      { label: "Quick Bill", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Service Menu", href: "/dashboard/salon/services", icon: "📋", color: "#818cf8" },
      { label: "Stock Check", href: "/dashboard/reports/stock", icon: "📦", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── GYM / FITNESS ────────────────────────────────────────
  {
    id: "gym", label: "Gym / Fitness Center", icon: "🏋️", emoji: "🏋️",
    description: "Fitness — gym, sports club, yoga studio, martial arts, swimming pool",
    tagline: "Member → Attend → Renew → Grow",
    color: "#16a34a", gradient: "linear-gradient(135deg,#15803d,#16a34a)", category: "Beauty & Wellness",
    modules: [...CORE, "sales_invoice","expense_vouchers","hr_payroll","memberships","class_schedule_gym","trainer_mgmt","crm"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1201", name: "Gym Equipment", type: "Asset" },
      { code: "4001", name: "Membership Fees", type: "Revenue" },
      { code: "4002", name: "Personal Training Revenue", type: "Revenue" },
      { code: "4003", name: "Supplement Sales", type: "Revenue" },
      { code: "5100", name: "Equipment Maintenance", type: "Expense" },
      { code: "5101", name: "Trainer Commission", type: "Expense" },
      { code: "5102", name: "Supplement Purchase Cost", type: "Expense" },
    ],
    kpis: [
      { key: "active_members", label: "Active Members", icon: "🏋️", color: "#16a34a" },
      { key: "monthly_revenue", label: "Monthly Revenue", icon: "💰", color: "#34d399" },
      { key: "renewals_due", label: "Renewals Due", icon: "⏰", color: "#f87171" },
      { key: "classes_today", label: "Classes Today", icon: "📅", color: "#38bdf8" },
    ],
    quickActions: [
      { label: "New Membership", href: "/dashboard/gym/memberships", icon: "🏋️", color: "#16a34a" },
      { label: "Renewing Members", href: "/dashboard/gym/renewals", icon: "⏰", color: "#f87171" },
      { label: "Class Schedule", href: "/dashboard/gym/classes", icon: "📅", color: "#38bdf8" },
      { label: "Collect Fee", href: "/dashboard/payment-receipts", icon: "💰", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── TRANSPORT / LOGISTICS ─────────────────────────────────
  {
    id: "transport", label: "Transport / Logistics", icon: "🚛", emoji: "🚛",
    description: "Freight & logistics — truck operators, courier, cargo, logistics companies",
    tagline: "Consignment → Deliver → Bill → Repeat",
    color: "#0369a1", gradient: "linear-gradient(135deg,#0c4a6e,#0369a1)", category: "Transport",
    modules: [...CORE, "sales_invoice","purchase_invoice","expense_vouchers","hr_payroll","fleet_mgmt","trips","driver_mgmt","fuel_tracking","crm"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Client Receivables", type: "Asset" },
      { code: "1201", name: "Vehicles / Trucks", type: "Asset" },
      { code: "4001", name: "Freight Revenue", type: "Revenue" },
      { code: "4002", name: "Courier Revenue", type: "Revenue" },
      { code: "5100", name: "Fuel Expense", type: "Expense" },
      { code: "5101", name: "Driver Salaries", type: "Expense" },
      { code: "5102", name: "Vehicle Maintenance", type: "Expense" },
      { code: "5103", name: "Toll & Road Taxes", type: "Expense" },
      { code: "5104", name: "Insurance Premium", type: "Expense" },
    ],
    kpis: [
      { key: "trips_today", label: "Trips Today", icon: "🚛", color: "#0369a1" },
      { key: "revenue_today", label: "Revenue Today", icon: "💰", color: "#34d399" },
      { key: "fuel_cost", label: "Fuel Cost (Month)", icon: "⛽", color: "#fbbf24" },
      { key: "active_vehicles", label: "Active Vehicles", icon: "🚚", color: "#818cf8" },
    ],
    quickActions: [
      { label: "New Trip", href: "/dashboard/transport/trips", icon: "🚛", color: "#0369a1" },
      { label: "Bill Client", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Fuel Entry", href: "/dashboard/transport/fuel", icon: "⛽", color: "#fbbf24" },
      { label: "Fleet Status", href: "/dashboard/transport/fleet", icon: "🚚", color: "#818cf8" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── AGRICULTURE / FARM ────────────────────────────────────
  {
    id: "agriculture", label: "Agriculture / Farm", icon: "🌾", emoji: "🌾",
    description: "Farming & agribusiness — crop farming, livestock, poultry, dairy",
    tagline: "Sow → Grow → Harvest → Sell",
    color: "#65a30d", gradient: "linear-gradient(135deg,#4d7c0f,#65a30d)", category: "Agriculture",
    modules: [...CORE, "sales_invoice","purchase_invoice","expense_vouchers","inventory_items","hr_payroll","crop_mgmt","livestock","field_mgmt","harvest"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1200", name: "Crop Inventory", type: "Asset" },
      { code: "1201", name: "Livestock", type: "Asset" },
      { code: "1202", name: "Farm Equipment", type: "Asset" },
      { code: "1203", name: "Land", type: "Asset" },
      { code: "4001", name: "Crop Sales", type: "Revenue" },
      { code: "4002", name: "Livestock Sales", type: "Revenue" },
      { code: "4003", name: "Dairy / Poultry Revenue", type: "Revenue" },
      { code: "5100", name: "Seed & Fertilizer", type: "Expense" },
      { code: "5101", name: "Pesticides", type: "Expense" },
      { code: "5102", name: "Irrigation Cost", type: "Expense" },
      { code: "5103", name: "Harvesting Labour", type: "Expense" },
      { code: "5104", name: "Veterinary Expense", type: "Expense" },
    ],
    kpis: [
      { key: "active_crops", label: "Active Crops", icon: "🌾", color: "#65a30d" },
      { key: "harvest_this_season", label: "Season Harvest", icon: "🌽", color: "#34d399" },
      { key: "revenue_month", label: "Month Revenue", icon: "💰", color: "#fbbf24" },
      { key: "livestock_count", label: "Livestock Count", icon: "🐄", color: "#818cf8" },
    ],
    quickActions: [
      { label: "Record Harvest", href: "/dashboard/farm/harvest", icon: "🌾", color: "#65a30d" },
      { label: "Sell Crop", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Buy Supplies", href: "/dashboard/purchase-invoice", icon: "📦", color: "#38bdf8" },
      { label: "Crop Status", href: "/dashboard/farm/crops", icon: "🌱", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── NGO / NON-PROFIT ──────────────────────────────────────
  {
    id: "ngo", label: "NGO / Non-Profit", icon: "❤️", emoji: "❤️",
    description: "Non-profit organizations — charities, trusts, foundations, welfare organizations",
    tagline: "Donate → Fund → Serve → Report",
    color: "#e11d48", gradient: "linear-gradient(135deg,#be123c,#e11d48)", category: "Non-Profit",
    modules: [...CORE, "expense_vouchers","hr_payroll","donor_mgmt","grant_tracking","beneficiary_mgmt","fund_accounting","reports_financial"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Grant Receivables", type: "Asset" },
      { code: "2100", name: "Restricted Funds", type: "Liability" },
      { code: "3001", name: "General Fund", type: "Equity" },
      { code: "3002", name: "Restricted Fund", type: "Equity" },
      { code: "4001", name: "Donation Income", type: "Revenue" },
      { code: "4002", name: "Grant Income", type: "Revenue" },
      { code: "4003", name: "Zakat Received", type: "Revenue" },
      { code: "5100", name: "Program Expenses", type: "Expense" },
      { code: "5101", name: "Beneficiary Aid", type: "Expense" },
      { code: "5102", name: "Fundraising Expense", type: "Expense" },
      { code: "5103", name: "Admin & Overhead", type: "Expense" },
    ],
    kpis: [
      { key: "donations_month", label: "Donations (Month)", icon: "❤️", color: "#e11d48" },
      { key: "beneficiaries_served", label: "Beneficiaries", icon: "👥", color: "#34d399" },
      { key: "active_programs", label: "Active Programs", icon: "📁", color: "#818cf8" },
      { key: "grant_utilization", label: "Grant Utilization", icon: "📊", color: "#fbbf24" },
    ],
    quickActions: [
      { label: "Record Donation", href: "/dashboard/payment-receipts", icon: "❤️", color: "#e11d48" },
      { label: "Donor List", href: "/dashboard/ngo/donors", icon: "👤", color: "#38bdf8" },
      { label: "Program Expense", href: "/dashboard/expense-vouchers", icon: "💸", color: "#fbbf24" },
      { label: "Fund Report", href: "/dashboard/reports/trial-balance", icon: "📊", color: "#818cf8" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── E-COMMERCE ────────────────────────────────────────────
  {
    id: "ecommerce", label: "E-Commerce / Online Store", icon: "🛍️", emoji: "🛍️",
    description: "Online selling — Daraz sellers, Amazon, Shopify, own website store",
    tagline: "List → Order → Pack → Ship → Review",
    color: "#f59e0b", gradient: "linear-gradient(135deg,#d97706,#f59e0b)", category: "Commerce",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","sale_return","inventory_items","stock_rates","barcode","reports_inventory","hr_payroll","product_listings","order_mgmt","returns_mgmt","shipping","crm"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Platform Receivables", type: "Asset" },
      { code: "1200", name: "Product Inventory", type: "Asset" },
      { code: "4001", name: "Online Sales Revenue", type: "Revenue" },
      { code: "5100", name: "Cost of Products Sold", type: "Expense" },
      { code: "5101", name: "Platform Commission", type: "Expense" },
      { code: "5102", name: "Shipping & Courier", type: "Expense" },
      { code: "5103", name: "Packaging Cost", type: "Expense" },
      { code: "5104", name: "Returns & Refunds", type: "Expense" },
      { code: "5105", name: "Digital Advertising", type: "Expense" },
    ],
    kpis: [
      { key: "orders_today", label: "Orders Today", icon: "🛍️", color: "#f59e0b" },
      { key: "daily_revenue", label: "Today's Revenue", icon: "💰", color: "#34d399" },
      { key: "pending_shipments", label: "Pending Shipments", icon: "📦", color: "#38bdf8" },
      { key: "return_requests", label: "Return Requests", icon: "↩️", color: "#f87171" },
    ],
    quickActions: [
      { label: "New Order", href: "/dashboard/ecommerce/orders", icon: "🛍️", color: "#f59e0b" },
      { label: "Add Product", href: "/dashboard/items-new", icon: "📦", color: "#34d399" },
      { label: "Process Returns", href: "/dashboard/sale-return", icon: "↩️", color: "#f87171" },
      { label: "Stock Report", href: "/dashboard/reports/stock", icon: "📊", color: "#818cf8" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ── FOOD PROCESSING ───────────────────────────────────────
  {
    id: "food_processing", label: "Food Processing / Packaged Food", icon: "🥫", emoji: "🥫",
    description: "Food manufacturing — packaged food, beverages, spices, confectionery",
    tagline: "Raw Food → Process → Package → Sell",
    color: "#c2410c", gradient: "linear-gradient(135deg,#9a3412,#c2410c)", category: "Production",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","quotation","delivery_challan","sale_return","outward","inventory_items","stock_rates","barcode","reports_inventory","crm","hr_payroll","bom","production_orders","raw_materials","recipe_costing"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Customer Receivables", type: "Asset" },
      { code: "1200", name: "Raw Ingredients Stock", type: "Asset" },
      { code: "1201", name: "Packaging Materials", type: "Asset" },
      { code: "1202", name: "Finished Food Products", type: "Asset" },
      { code: "5100", name: "Raw Ingredient Cost", type: "Expense" },
      { code: "5101", name: "Packaging Cost", type: "Expense" },
      { code: "5102", name: "Processing Labour", type: "Expense" },
      { code: "5103", name: "Quality Testing", type: "Expense" },
      { code: "5104", name: "Cold Chain / Storage", type: "Expense" },
    ],
    kpis: [
      { key: "batches_produced", label: "Batches Today", icon: "🥫", color: "#c2410c" },
      { key: "daily_sales", label: "Today's Sales", icon: "💰", color: "#34d399" },
      { key: "inventory_value", label: "Inventory Value", icon: "📦", color: "#fbbf24" },
      { key: "expiring_stock", label: "Expiring Stock", icon: "⚠️", color: "#f87171" },
    ],
    quickActions: [
      { label: "Start Batch", href: "/dashboard/manufacturing/production-orders", icon: "⚙️", color: "#c2410c" },
      { label: "New Sale", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Recipe (BOM)", href: "/dashboard/manufacturing/bom", icon: "🗂️", color: "#fbbf24" },
      { label: "Stock Check", href: "/dashboard/reports/stock", icon: "📊", color: "#818cf8" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  // ════════════════════════════════════════════════════════════
  //  AUTOMOTIVE
  // ════════════════════════════════════════════════════════════

  {
    id: "car_showroom", label: "Car Showroom", icon: "🚗", emoji: "🚗",
    description: "New & used vehicle sales — cars, SUVs, bikes, dealerships",
    tagline: "Enquiry → Test Drive → Finance → Sale",
    color: "#0ea5e9", gradient: "linear-gradient(135deg,#0284c7,#0ea5e9)", category: "Automotive",
    modules: [...CORE, "sales_invoice","purchase_invoice","crm","hr_payroll","vehicle_inventory","reports_inventory"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Vehicle Inventory", type: "Asset" },
      { code: "1101", name: "Showroom Equipment", type: "Asset" },
      { code: "4001", name: "Vehicle Sales Revenue", type: "Revenue" },
      { code: "4002", name: "Finance Commission", type: "Revenue" },
      { code: "4003", name: "Insurance Commission", type: "Revenue" },
      { code: "5100", name: "Vehicle Purchase Cost", type: "Expense" },
      { code: "5101", name: "Showroom Rent", type: "Expense" },
      { code: "5102", name: "Advertising & Display", type: "Expense" },
    ],
    kpis: [
      { key: "vehicles_sold", label: "Vehicles Sold", icon: "🚗", color: "#0ea5e9" },
      { key: "monthly_revenue", label: "Monthly Revenue", icon: "💰", color: "#34d399" },
      { key: "test_drives", label: "Test Drives", icon: "🔑", color: "#fbbf24" },
      { key: "vehicles_in_stock", label: "Stock Units", icon: "🅿️", color: "#818cf8" },
    ],
    quickActions: [
      { label: "New Sale", href: "/dashboard/sales-invoice", icon: "🚗", color: "#0ea5e9" },
      { label: "Vehicle Stock", href: "/dashboard/inventory", icon: "🅿️", color: "#34d399" },
      { label: "Customer List", href: "/dashboard/parties", icon: "👤", color: "#818cf8" },
      { label: "Financials", href: "/dashboard/reports/profit-loss", icon: "📊", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "car_workshop", label: "Car Workshop / Garage", icon: "🔧", emoji: "🔧",
    description: "Auto repair & service — workshop, garage, mechanic shop, body shop",
    tagline: "Intake → Diagnose → Repair → Deliver",
    color: "#64748b", gradient: "linear-gradient(135deg,#475569,#64748b)", category: "Automotive",
    modules: [...CORE, "sales_invoice","purchase_invoice","inventory_items","hr_payroll","service_jobs","spare_parts_repair","crm"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1200", name: "Spare Parts Inventory", type: "Asset" },
      { code: "4001", name: "Service / Labour Revenue", type: "Revenue" },
      { code: "4002", name: "Parts Sales Revenue", type: "Revenue" },
      { code: "5100", name: "Parts Purchase Cost", type: "Expense" },
      { code: "5101", name: "Mechanic Wages", type: "Expense" },
      { code: "5102", name: "Workshop Tools", type: "Expense" },
    ],
    kpis: [
      { key: "jobs_today", label: "Jobs Today", icon: "🔧", color: "#64748b" },
      { key: "revenue_today", label: "Today Revenue", icon: "💰", color: "#34d399" },
      { key: "pending_jobs", label: "Pending Jobs", icon: "⏳", color: "#fbbf24" },
      { key: "parts_low_stock", label: "Low Parts", icon: "⚠️", color: "#f87171" },
    ],
    quickActions: [
      { label: "New Job Card", href: "/dashboard/sales-invoice", icon: "🔧", color: "#64748b" },
      { label: "Parts Stock", href: "/dashboard/inventory", icon: "📦", color: "#34d399" },
      { label: "Collect Payment", href: "/dashboard/payment-receipts", icon: "💳", color: "#818cf8" },
      { label: "Purchase Parts", href: "/dashboard/purchase-invoice", icon: "🛒", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "spare_parts", label: "Spare Parts Store", icon: "⚙️", emoji: "⚙️",
    description: "Auto parts retail — spare parts, accessories, tyres, batteries",
    tagline: "Search Part → Check Stock → Sell → Reorder",
    color: "#78716c", gradient: "linear-gradient(135deg,#57534e,#78716c)", category: "Automotive",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","inventory_items","stock_rates","barcode","reports_inventory","crm"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1200", name: "Spare Parts Inventory", type: "Asset" },
      { code: "4001", name: "Parts Sales Revenue", type: "Revenue" },
      { code: "5100", name: "Cost of Parts Sold", type: "Expense" },
      { code: "5101", name: "Freight & Import", type: "Expense" },
      { code: "5102", name: "Storage & Handling", type: "Expense" },
    ],
    kpis: [
      { key: "daily_sales", label: "Today's Sales", icon: "⚙️", color: "#78716c" },
      { key: "stock_value", label: "Stock Value", icon: "📦", color: "#fbbf24" },
      { key: "low_stock", label: "Low Stock", icon: "⚠️", color: "#f87171" },
      { key: "customers", label: "Customers", icon: "👥", color: "#818cf8" },
    ],
    quickActions: [
      { label: "New Sale", href: "/dashboard/sales-invoice", icon: "🧾", color: "#78716c" },
      { label: "Stock Check", href: "/dashboard/inventory", icon: "📦", color: "#34d399" },
      { label: "Purchase Order", href: "/dashboard/purchase-order", icon: "🛒", color: "#fbbf24" },
      { label: "Barcode Print", href: "/dashboard/barcode", icon: "🔲", color: "#818cf8" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "car_rental", label: "Car Rental / Leasing", icon: "🚙", emoji: "🚙",
    description: "Vehicle rental — daily, weekly, monthly car hire, leasing, chauffeur service",
    tagline: "Book → Handover → Use → Return → Bill",
    color: "#7c3aed", gradient: "linear-gradient(135deg,#6d28d9,#7c3aed)", category: "Automotive",
    modules: [...CORE, "sales_invoice","expense_vouchers","hr_payroll","vehicle_rental","vehicle_inventory","crm","fleet_mgmt"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Fleet Vehicles (Assets)", type: "Asset" },
      { code: "4001", name: "Rental Income", type: "Revenue" },
      { code: "4002", name: "Leasing Income", type: "Revenue" },
      { code: "5100", name: "Vehicle Depreciation", type: "Expense" },
      { code: "5101", name: "Fuel Expense", type: "Expense" },
      { code: "5102", name: "Vehicle Maintenance", type: "Expense" },
      { code: "5103", name: "Insurance Premium", type: "Expense" },
    ],
    kpis: [
      { key: "vehicles_rented", label: "Rented Today", icon: "🚙", color: "#7c3aed" },
      { key: "utilization_rate", label: "Fleet Utilization", icon: "📊", color: "#34d399" },
      { key: "monthly_revenue", label: "Monthly Revenue", icon: "💰", color: "#fbbf24" },
      { key: "overdue_returns", label: "Overdue Returns", icon: "⚠️", color: "#f87171" },
    ],
    quickActions: [
      { label: "New Booking", href: "/dashboard/sales-invoice", icon: "🚙", color: "#7c3aed" },
      { label: "Fleet Status", href: "/dashboard/transport/fleet", icon: "📋", color: "#34d399" },
      { label: "Collect Rent", href: "/dashboard/payment-receipts", icon: "💳", color: "#818cf8" },
      { label: "Maintenance", href: "/dashboard/expense-vouchers", icon: "🔧", color: "#fbbf24" },
    ],
  },
  */

  // ════════════════════════════════════════════════════════════
  //  MEDIA & ADVERTISING
  // ════════════════════════════════════════════════════════════

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "advertising_agency", label: "Advertising Agency", icon: "📢", emoji: "📢",
    description: "Full-service agency — branding, campaigns, ATL/BTL, outdoor advertising",
    tagline: "Brief → Concept → Execute → Report → Invoice",
    color: "#f43f5e", gradient: "linear-gradient(135deg,#e11d48,#f43f5e)", category: "Media & Advertising",
    modules: [...CORE, "sales_invoice","purchase_invoice","quotation","hr_payroll","crm","ad_campaigns","project_mgmt"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Client Receivables", type: "Asset" },
      { code: "4001", name: "Agency Service Fee", type: "Revenue" },
      { code: "4002", name: "Media Commission", type: "Revenue" },
      { code: "4003", name: "Production Revenue", type: "Revenue" },
      { code: "5100", name: "Media Buying Cost", type: "Expense" },
      { code: "5101", name: "Production Cost", type: "Expense" },
      { code: "5102", name: "Freelancer Payments", type: "Expense" },
    ],
    kpis: [
      { key: "active_campaigns", label: "Active Campaigns", icon: "📢", color: "#f43f5e" },
      { key: "monthly_billing", label: "Monthly Billing", icon: "💰", color: "#34d399" },
      { key: "clients", label: "Active Clients", icon: "👥", color: "#818cf8" },
      { key: "pending_invoices", label: "Pending Invoices", icon: "🧾", color: "#fbbf24" },
    ],
    quickActions: [
      { label: "New Campaign", href: "/dashboard/sales-invoice", icon: "📢", color: "#f43f5e" },
      { label: "Client Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Media Purchase", href: "/dashboard/purchase-invoice", icon: "📺", color: "#818cf8" },
      { label: "Quotation", href: "/dashboard/quotation", icon: "📄", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "digital_marketing", label: "Digital Marketing Agency", icon: "📱", emoji: "📱",
    description: "Online marketing — SEO, social media, PPC, content, email marketing",
    tagline: "Strategy → Execute → Optimise → Report",
    color: "#06b6d4", gradient: "linear-gradient(135deg,#0891b2,#06b6d4)", category: "Media & Advertising",
    modules: [...CORE, "sales_invoice","quotation","hr_payroll","crm","ad_campaigns","project_mgmt","billing_recurring"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Client Receivables", type: "Asset" },
      { code: "4001", name: "Retainer Income", type: "Revenue" },
      { code: "4002", name: "Project Revenue", type: "Revenue" },
      { code: "4003", name: "Ad Spend Management Fee", type: "Revenue" },
      { code: "5100", name: "Ad Platform Spend", type: "Expense" },
      { code: "5101", name: "Tools & Software", type: "Expense" },
      { code: "5102", name: "Content Creation", type: "Expense" },
    ],
    kpis: [
      { key: "active_clients", label: "Active Clients", icon: "📱", color: "#06b6d4" },
      { key: "mrr", label: "Monthly Retainer", icon: "💰", color: "#34d399" },
      { key: "campaigns_running", label: "Campaigns", icon: "📊", color: "#818cf8" },
      { key: "overdue", label: "Overdue Invoices", icon: "⚠️", color: "#f87171" },
    ],
    quickActions: [
      { label: "Send Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#06b6d4" },
      { label: "New Client", href: "/dashboard/parties", icon: "👤", color: "#34d399" },
      { label: "Quotation", href: "/dashboard/quotation", icon: "📄", color: "#818cf8" },
      { label: "Expense Log", href: "/dashboard/expense-vouchers", icon: "💸", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "printing_press", label: "Printing Press", icon: "🖨️", emoji: "🖨️",
    description: "Commercial printing — offset, digital, flex, screen, packaging, stationery",
    tagline: "Order → Design Proof → Print → Deliver → Bill",
    color: "#1e40af", gradient: "linear-gradient(135deg,#1e3a8a,#1e40af)", category: "Media & Advertising",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","quotation","inventory_items","hr_payroll","crm","print_jobs"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1200", name: "Paper & Ink Stock", type: "Asset" },
      { code: "1201", name: "Printing Machinery", type: "Asset" },
      { code: "4001", name: "Printing Revenue", type: "Revenue" },
      { code: "4002", name: "Design Service Revenue", type: "Revenue" },
      { code: "5100", name: "Paper & Material Cost", type: "Expense" },
      { code: "5101", name: "Ink & Chemicals", type: "Expense" },
      { code: "5102", name: "Machine Maintenance", type: "Expense" },
      { code: "5103", name: "Delivery Charges", type: "Expense" },
    ],
    kpis: [
      { key: "orders_today", label: "Orders Today", icon: "🖨️", color: "#1e40af" },
      { key: "monthly_revenue", label: "Monthly Revenue", icon: "💰", color: "#34d399" },
      { key: "pending_jobs", label: "Pending Jobs", icon: "⏳", color: "#fbbf24" },
      { key: "stock_value", label: "Stock Value", icon: "📦", color: "#818cf8" },
    ],
    quickActions: [
      { label: "New Order", href: "/dashboard/sales-invoice", icon: "🖨️", color: "#1e40af" },
      { label: "Quotation", href: "/dashboard/quotation", icon: "📄", color: "#34d399" },
      { label: "Buy Paper/Ink", href: "/dashboard/purchase-order", icon: "🛒", color: "#fbbf24" },
      { label: "Collect Payment", href: "/dashboard/payment-receipts", icon: "💳", color: "#818cf8" },
    ],
  },
  */

  // ════════════════════════════════════════════════════════════
  //  SUBSCRIPTION-BASED
  // ════════════════════════════════════════════════════════════

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "saas_company", label: "SaaS Company", icon: "☁️", emoji: "☁️",
    description: "Software as a Service — cloud apps, platforms, B2B/B2C SaaS products",
    tagline: "Trial → Subscribe → Renew → Expand",
    color: "#6366f1", gradient: "linear-gradient(135deg,#4f46e5,#6366f1)", category: "Technology",
    modules: [...CORE, "sales_invoice","hr_payroll","crm","subscriptions","mrr_tracking","billing_recurring","project_mgmt","tech_support"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Subscription Receivables", type: "Asset" },
      { code: "2100", name: "Deferred Revenue", type: "Liability" },
      { code: "4001", name: "Monthly Subscription Revenue", type: "Revenue" },
      { code: "4002", name: "Annual Subscription Revenue", type: "Revenue" },
      { code: "4003", name: "Setup & Onboarding Fee", type: "Revenue" },
      { code: "5100", name: "Server & Hosting Cost", type: "Expense" },
      { code: "5101", name: "Third-party API Cost", type: "Expense" },
      { code: "5102", name: "Customer Acquisition Cost", type: "Expense" },
    ],
    kpis: [
      { key: "mrr", label: "MRR", icon: "☁️", color: "#6366f1" },
      { key: "active_subscribers", label: "Active Subscribers", icon: "👥", color: "#34d399" },
      { key: "churn_rate", label: "Churn Rate", icon: "📉", color: "#f87171" },
      { key: "arr", label: "ARR", icon: "💰", color: "#fbbf24" },
    ],
    quickActions: [
      { label: "New Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#6366f1" },
      { label: "Subscriptions", href: "/dashboard/billing", icon: "☁️", color: "#34d399" },
      { label: "CRM", href: "/dashboard/crm/contacts", icon: "👤", color: "#818cf8" },
      { label: "Revenue Report", href: "/dashboard/reports/profit-loss", icon: "📊", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "isp", label: "Internet Service Provider (ISP)", icon: "🌐", emoji: "🌐",
    description: "Internet & broadband — ISP, fiber optic, wireless internet, PTCL reseller",
    tagline: "Connect → Activate → Bill Monthly → Support",
    color: "#0284c7", gradient: "linear-gradient(135deg,#0369a1,#0284c7)", category: "Technology",
    modules: [...CORE, "sales_invoice","expense_vouchers","hr_payroll","crm","subscriptions","billing_recurring","bandwidth_mgmt"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Customer Receivables", type: "Asset" },
      { code: "1200", name: "Network Equipment", type: "Asset" },
      { code: "4001", name: "Monthly Internet Charges", type: "Revenue" },
      { code: "4002", name: "Connection Fee", type: "Revenue" },
      { code: "4003", name: "Static IP Fee", type: "Revenue" },
      { code: "5100", name: "Bandwidth Cost (Upstream)", type: "Expense" },
      { code: "5101", name: "Network Maintenance", type: "Expense" },
      { code: "5102", name: "Tower/Pole Rent", type: "Expense" },
    ],
    kpis: [
      { key: "active_connections", label: "Active Connections", icon: "🌐", color: "#0284c7" },
      { key: "monthly_revenue", label: "Monthly Revenue", icon: "💰", color: "#34d399" },
      { key: "new_connections", label: "New This Month", icon: "📶", color: "#818cf8" },
      { key: "overdue_bills", label: "Overdue Bills", icon: "⚠️", color: "#f87171" },
    ],
    quickActions: [
      { label: "New Connection", href: "/dashboard/sales-invoice", icon: "🌐", color: "#0284c7" },
      { label: "Monthly Bills", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Collect Payment", href: "/dashboard/payment-receipts", icon: "💳", color: "#818cf8" },
      { label: "Customer List", href: "/dashboard/parties", icon: "👥", color: "#fbbf24" },
    ],
  },
  */

  // ════════════════════════════════════════════════════════════
  //  PROFESSIONAL FIRMS
  // ════════════════════════════════════════════════════════════

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "accounting_firm", label: "Accounting Firm", icon: "📒", emoji: "📒",
    description: "Accounting & bookkeeping — CA firm, tax consultants, bookkeepers",
    tagline: "Engage → Process Books → File Tax → Invoice",
    color: "#059669", gradient: "linear-gradient(135deg,#047857,#059669)", category: "Services",
    modules: [...CORE, "sales_invoice","quotation","hr_payroll","crm","project_mgmt","billing_recurring","time_billing"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Client Receivables", type: "Asset" },
      { code: "4001", name: "Professional Fee Income", type: "Revenue" },
      { code: "4002", name: "Tax Filing Fee", type: "Revenue" },
      { code: "4003", name: "Audit Fee", type: "Revenue" },
      { code: "5100", name: "Professional Subscriptions", type: "Expense" },
      { code: "5101", name: "Accounting Software Cost", type: "Expense" },
    ],
    kpis: [
      { key: "active_clients", label: "Active Clients", icon: "📒", color: "#059669" },
      { key: "monthly_billing", label: "Monthly Billing", icon: "💰", color: "#34d399" },
      { key: "pending_invoices", label: "Pending Invoices", icon: "🧾", color: "#fbbf24" },
      { key: "overdue", label: "Overdue", icon: "⚠️", color: "#f87171" },
    ],
    quickActions: [
      { label: "Client Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#059669" },
      { label: "New Client", href: "/dashboard/parties", icon: "👤", color: "#34d399" },
      { label: "Quotation", href: "/dashboard/quotation", icon: "📄", color: "#818cf8" },
      { label: "P&L Report", href: "/dashboard/reports/profit-loss", icon: "📊", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "consultancy_firm", label: "Consultancy Firm", icon: "🤝", emoji: "🤝",
    description: "Business consulting — management, HR, IT, strategy, operations, ISO",
    tagline: "Discover → Analyse → Recommend → Implement",
    color: "#d97706", gradient: "linear-gradient(135deg,#b45309,#d97706)", category: "Services",
    modules: [...CORE, "sales_invoice","quotation","hr_payroll","crm","project_mgmt","time_billing","consulting_projects"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Client Receivables", type: "Asset" },
      { code: "4001", name: "Consulting Fee", type: "Revenue" },
      { code: "4002", name: "Retainer Income", type: "Revenue" },
      { code: "4003", name: "Training Revenue", type: "Revenue" },
      { code: "5100", name: "Travel & Field Expense", type: "Expense" },
      { code: "5101", name: "Research & Reports", type: "Expense" },
      { code: "5102", name: "Subcontract Expert Fees", type: "Expense" },
    ],
    kpis: [
      { key: "active_projects", label: "Active Projects", icon: "🤝", color: "#d97706" },
      { key: "monthly_revenue", label: "Monthly Revenue", icon: "💰", color: "#34d399" },
      { key: "clients", label: "Clients", icon: "👥", color: "#818cf8" },
      { key: "utilization", label: "Team Utilization", icon: "📊", color: "#fbbf24" },
    ],
    quickActions: [
      { label: "New Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#d97706" },
      { label: "New Project", href: "/dashboard/it/projects", icon: "📁", color: "#34d399" },
      { label: "Quotation", href: "/dashboard/quotation", icon: "📄", color: "#818cf8" },
      { label: "Expense Log", href: "/dashboard/expense-vouchers", icon: "💸", color: "#fbbf24" },
    ],
  },
  */

  // ════════════════════════════════════════════════════════════
  //  REPAIR & MAINTENANCE
  // ════════════════════════════════════════════════════════════

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "mobile_repair", label: "Mobile Repair Shop", icon: "📲", emoji: "📲",
    description: "Mobile phone repair — iPhone, Android, screen replacement, battery change",
    tagline: "Receive → Diagnose → Repair → Return → Collect",
    color: "#7c3aed", gradient: "linear-gradient(135deg,#6d28d9,#7c3aed)", category: "Services",
    modules: [...CORE, "sales_invoice","inventory_items","purchase_invoice","hr_payroll","repair_jobs","spare_parts_repair","warranty_tracking","pos"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1200", name: "Mobile Parts Inventory", type: "Asset" },
      { code: "4001", name: "Repair Service Revenue", type: "Revenue" },
      { code: "4002", name: "Parts Sales Revenue", type: "Revenue" },
      { code: "5100", name: "Parts Purchase Cost", type: "Expense" },
      { code: "5101", name: "Technician Wages", type: "Expense" },
      { code: "5102", name: "Shop Rent", type: "Expense" },
    ],
    kpis: [
      { key: "jobs_today", label: "Jobs Today", icon: "📲", color: "#7c3aed" },
      { key: "revenue_today", label: "Today Revenue", icon: "💰", color: "#34d399" },
      { key: "pending_repairs", label: "Pending Repairs", icon: "⏳", color: "#fbbf24" },
      { key: "parts_low_stock", label: "Low Parts", icon: "⚠️", color: "#f87171" },
    ],
    quickActions: [
      { label: "New Job", href: "/dashboard/sales-invoice", icon: "📲", color: "#7c3aed" },
      { label: "Parts Stock", href: "/dashboard/inventory", icon: "📦", color: "#34d399" },
      { label: "Collect Payment", href: "/dashboard/payment-receipts", icon: "💳", color: "#818cf8" },
      { label: "Buy Parts", href: "/dashboard/purchase-invoice", icon: "🛒", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "equipment_maintenance", label: "Equipment Maintenance Co.", icon: "🛠️", emoji: "🛠️",
    description: "Industrial & commercial maintenance — HVAC, generators, machinery, lifts",
    tagline: "Contract → Schedule → Service → Report → Invoice",
    color: "#475569", gradient: "linear-gradient(135deg,#334155,#475569)", category: "Services",
    modules: [...CORE, "sales_invoice","purchase_invoice","quotation","hr_payroll","crm","repair_jobs","maintenance_schedule","billing_recurring"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1200", name: "Spare Parts & Tools", type: "Asset" },
      { code: "4001", name: "Annual Maintenance Contract", type: "Revenue" },
      { code: "4002", name: "Emergency Call-out Revenue", type: "Revenue" },
      { code: "4003", name: "Parts & Materials Revenue", type: "Revenue" },
      { code: "5100", name: "Parts & Materials Cost", type: "Expense" },
      { code: "5101", name: "Technician Wages", type: "Expense" },
      { code: "5102", name: "Vehicle & Travel", type: "Expense" },
    ],
    kpis: [
      { key: "contracts", label: "AMC Contracts", icon: "🛠️", color: "#475569" },
      { key: "monthly_revenue", label: "Monthly Revenue", icon: "💰", color: "#34d399" },
      { key: "jobs_scheduled", label: "Jobs Scheduled", icon: "📅", color: "#818cf8" },
      { key: "overdue", label: "Overdue Invoices", icon: "⚠️", color: "#f87171" },
    ],
    quickActions: [
      { label: "New Service Job", href: "/dashboard/sales-invoice", icon: "🛠️", color: "#475569" },
      { label: "Quotation", href: "/dashboard/quotation", icon: "📄", color: "#34d399" },
      { label: "Collect Payment", href: "/dashboard/payment-receipts", icon: "💳", color: "#818cf8" },
      { label: "P&L Report", href: "/dashboard/reports/profit-loss", icon: "📊", color: "#fbbf24" },
    ],
  },
  */

  // ════════════════════════════════════════════════════════════
  //  ENERGY & UTILITIES
  // ════════════════════════════════════════════════════════════

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "solar_company", label: "Solar Company", icon: "☀️", emoji: "☀️",
    description: "Solar energy — installation, panels, batteries, net metering, O&M",
    tagline: "Survey → Quote → Install → Commission → AMC",
    color: "#f59e0b", gradient: "linear-gradient(135deg,#d97706,#f59e0b)", category: "Services",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","quotation","inventory_items","hr_payroll","crm","solar_projects","project_mgmt"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1200", name: "Solar Equipment Stock", type: "Asset" },
      { code: "4001", name: "System Installation Revenue", type: "Revenue" },
      { code: "4002", name: "AMC Revenue", type: "Revenue" },
      { code: "4003", name: "Equipment Sales Revenue", type: "Revenue" },
      { code: "5100", name: "Solar Panels Cost", type: "Expense" },
      { code: "5101", name: "Inverter & Battery Cost", type: "Expense" },
      { code: "5102", name: "Installation Labour", type: "Expense" },
      { code: "5103", name: "Freight & Customs", type: "Expense" },
    ],
    kpis: [
      { key: "projects_this_month", label: "Projects (Month)", icon: "☀️", color: "#f59e0b" },
      { key: "monthly_revenue", label: "Monthly Revenue", icon: "💰", color: "#34d399" },
      { key: "kwp_installed", label: "kWp Installed", icon: "⚡", color: "#818cf8" },
      { key: "pending_amc", label: "Pending AMC", icon: "📅", color: "#f87171" },
    ],
    quickActions: [
      { label: "New Quotation", href: "/dashboard/quotation", icon: "📄", color: "#f59e0b" },
      { label: "Project Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Buy Equipment", href: "/dashboard/purchase-order", icon: "🛒", color: "#818cf8" },
      { label: "Project Report", href: "/dashboard/reports/profit-loss", icon: "📊", color: "#fbbf24" },
    ],
  },
  */

  // ════════════════════════════════════════════════════════════
  //  IMPORT / EXPORT
  // ════════════════════════════════════════════════════════════

  {
    id: "import_company", label: "Import Company", icon: "📦", emoji: "📦",
    description: "Import business — goods sourcing, customs, LC, freight, local distribution",
    tagline: "Order → LC/TT → Ship → Clear → Sell",
    color: "#0891b2", gradient: "linear-gradient(135deg,#0e7490,#0891b2)", category: "Commerce",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","inventory_items","stock_rates","crm","shipments","customs_clearance","lc_management","hr_payroll"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Goods in Transit", type: "Asset" },
      { code: "1200", name: "Imported Goods Inventory", type: "Asset" },
      { code: "2100", name: "Letter of Credit Payable", type: "Liability" },
      { code: "4001", name: "Local Sales Revenue", type: "Revenue" },
      { code: "5100", name: "Cost of Imported Goods", type: "Expense" },
      { code: "5101", name: "Customs Duty & Taxes", type: "Expense" },
      { code: "5102", name: "Freight & Insurance", type: "Expense" },
      { code: "5103", name: "Clearing Agent Charges", type: "Expense" },
      { code: "5104", name: "Port Charges", type: "Expense" },
    ],
    kpis: [
      { key: "shipments_in_transit", label: "Shipments in Transit", icon: "🚢", color: "#0891b2" },
      { key: "monthly_sales", label: "Monthly Sales", icon: "💰", color: "#34d399" },
      { key: "stock_value", label: "Stock Value", icon: "📦", color: "#fbbf24" },
      { key: "overdue_receivables", label: "Overdue Receivables", icon: "⚠️", color: "#f87171" },
    ],
    quickActions: [
      { label: "Purchase Order", href: "/dashboard/purchase-order", icon: "🛒", color: "#0891b2" },
      { label: "Sales Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Inventory", href: "/dashboard/inventory", icon: "📦", color: "#818cf8" },
      { label: "Stock Report", href: "/dashboard/reports/stock", icon: "📊", color: "#fbbf24" },
    ],
  },

  {
    id: "export_company", label: "Export Company", icon: "🚢", emoji: "🚢",
    description: "Export business — sourcing, packing, LC/TT, shipping, foreign buyers",
    tagline: "Source → Pack → Ship → Invoice → Receive",
    color: "#0d9488", gradient: "linear-gradient(135deg,#0f766e,#0d9488)", category: "Commerce",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","inventory_items","crm","shipments","lc_management","hr_payroll"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Export Receivables (Foreign)", type: "Asset" },
      { code: "1200", name: "Export Goods Inventory", type: "Asset" },
      { code: "4001", name: "Export Sales Revenue", type: "Revenue" },
      { code: "4002", name: "Export Rebate / Drawback", type: "Revenue" },
      { code: "5100", name: "Goods Purchase Cost", type: "Expense" },
      { code: "5101", name: "Packing & Labelling", type: "Expense" },
      { code: "5102", name: "Freight & Shipping", type: "Expense" },
      { code: "5103", name: "Export Documentation", type: "Expense" },
    ],
    kpis: [
      { key: "shipments_month", label: "Shipments (Month)", icon: "🚢", color: "#0d9488" },
      { key: "export_revenue", label: "Export Revenue", icon: "💰", color: "#34d399" },
      { key: "foreign_receivables", label: "Foreign Receivables", icon: "🌍", color: "#818cf8" },
      { key: "pending_shipments", label: "Pending Shipments", icon: "📦", color: "#fbbf24" },
    ],
    quickActions: [
      { label: "Export Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#0d9488" },
      { label: "Purchase Goods", href: "/dashboard/purchase-order", icon: "🛒", color: "#34d399" },
      { label: "Inventory", href: "/dashboard/inventory", icon: "📦", color: "#818cf8" },
      { label: "Ledger Report", href: "/dashboard/reports/ledger", icon: "📊", color: "#fbbf24" },
    ],
  },

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "clearing_forwarding", label: "Clearing & Forwarding Agent", icon: "🛃", emoji: "🛃",
    description: "Customs clearance — import/export clearing, freight forwarding, documentation",
    tagline: "Receive Docs → Clear Customs → Deliver → Invoice",
    color: "#78350f", gradient: "linear-gradient(135deg,#92400e,#78350f)", category: "Commerce",
    modules: [...CORE, "sales_invoice","purchase_invoice","quotation","hr_payroll","crm","customs_clearance","shipments"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Client Receivables", type: "Asset" },
      { code: "4001", name: "Clearing Agency Fee", type: "Revenue" },
      { code: "4002", name: "Freight Forwarding Fee", type: "Revenue" },
      { code: "4003", name: "Customs Duty Recovered", type: "Revenue" },
      { code: "5100", name: "Customs Duty Paid", type: "Expense" },
      { code: "5101", name: "Port & Terminal Charges", type: "Expense" },
      { code: "5102", name: "Transport & Delivery", type: "Expense" },
    ],
    kpis: [
      { key: "active_files", label: "Active Files", icon: "🛃", color: "#78350f" },
      { key: "monthly_revenue", label: "Monthly Revenue", icon: "💰", color: "#34d399" },
      { key: "pending_clearance", label: "Pending Clearance", icon: "⏳", color: "#fbbf24" },
      { key: "overdue", label: "Overdue Invoices", icon: "⚠️", color: "#f87171" },
    ],
    quickActions: [
      { label: "New File Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#78350f" },
      { label: "Quotation", href: "/dashboard/quotation", icon: "📄", color: "#34d399" },
      { label: "Collect Payment", href: "/dashboard/payment-receipts", icon: "💳", color: "#818cf8" },
      { label: "Ageing Report", href: "/dashboard/reports/ageing", icon: "📊", color: "#fbbf24" },
    ],
  },
  */

  // ════════════════════════════════════════════════════════════
  //  EVENT MANAGEMENT
  // ════════════════════════════════════════════════════════════

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "event_planner", label: "Event Management", icon: "🎪", emoji: "🎪",
    description: "Event planning — corporate events, conferences, exhibitions, launches",
    tagline: "Brief → Plan → Vendors → Execute → Invoice",
    color: "#c026d3", gradient: "linear-gradient(135deg,#a21caf,#c026d3)", category: "Services",
    modules: [...CORE, "sales_invoice","purchase_invoice","quotation","hr_payroll","crm","event_bookings","vendor_management","event_budget","project_mgmt"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Client Advances Received", type: "Asset" },
      { code: "4001", name: "Event Management Fee", type: "Revenue" },
      { code: "4002", name: "Venue Revenue", type: "Revenue" },
      { code: "4003", name: "Catering Revenue", type: "Revenue" },
      { code: "5100", name: "Venue Cost", type: "Expense" },
      { code: "5101", name: "Catering & F&B", type: "Expense" },
      { code: "5102", name: "Decoration & Setup", type: "Expense" },
      { code: "5103", name: "Audio/Visual Equipment", type: "Expense" },
      { code: "5104", name: "Vendor Payments", type: "Expense" },
    ],
    kpis: [
      { key: "events_this_month", label: "Events (Month)", icon: "🎪", color: "#c026d3" },
      { key: "monthly_revenue", label: "Monthly Revenue", icon: "💰", color: "#34d399" },
      { key: "upcoming_events", label: "Upcoming Events", icon: "📅", color: "#818cf8" },
      { key: "pending_advances", label: "Client Advances", icon: "💳", color: "#fbbf24" },
    ],
    quickActions: [
      { label: "New Quotation", href: "/dashboard/quotation", icon: "📄", color: "#c026d3" },
      { label: "Event Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Vendor Payment", href: "/dashboard/expense-vouchers", icon: "💸", color: "#818cf8" },
      { label: "P&L Report", href: "/dashboard/reports/profit-loss", icon: "📊", color: "#fbbf24" },
    ],
  },
  */

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "wedding_planner", label: "Wedding Planner", icon: "💍", emoji: "💍",
    description: "Wedding & events — full planning, decoration, catering coordination",
    tagline: "Booking → Plan → Coordinate → Execute → Invoice",
    color: "#e11d48", gradient: "linear-gradient(135deg,#be123c,#e11d48)", category: "Services",
    modules: [...CORE, "sales_invoice","purchase_invoice","quotation","hr_payroll","crm","event_bookings","vendor_management","event_budget"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Client Advances", type: "Asset" },
      { code: "4001", name: "Wedding Planning Fee", type: "Revenue" },
      { code: "4002", name: "Decoration Revenue", type: "Revenue" },
      { code: "5100", name: "Decoration Cost", type: "Expense" },
      { code: "5101", name: "Catering Cost", type: "Expense" },
      { code: "5102", name: "Photography & Video", type: "Expense" },
      { code: "5103", name: "Venue Cost", type: "Expense" },
    ],
    kpis: [
      { key: "bookings_month", label: "Bookings (Month)", icon: "💍", color: "#e11d48" },
      { key: "monthly_revenue", label: "Monthly Revenue", icon: "💰", color: "#34d399" },
      { key: "upcoming_weddings", label: "Upcoming Events", icon: "📅", color: "#818cf8" },
      { key: "advances_received", label: "Advances", icon: "💳", color: "#fbbf24" },
    ],
    quickActions: [
      { label: "New Booking", href: "/dashboard/quotation", icon: "💍", color: "#e11d48" },
      { label: "Client Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#34d399" },
      { label: "Vendor Bill", href: "/dashboard/expense-vouchers", icon: "💸", color: "#818cf8" },
      { label: "Revenue Report", href: "/dashboard/reports/profit-loss", icon: "📊", color: "#fbbf24" },
    ],
  },
  */

  // ════════════════════════════════════════════════════════════
  //  RENTAL BUSINESS
  // ════════════════════════════════════════════════════════════

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "equipment_rental", label: "Equipment Rental", icon: "🏗️", emoji: "🏗️",
    description: "Equipment hire — generators, construction machinery, cranes, scaffolding",
    tagline: "Request → Check Availability → Deploy → Return → Bill",
    color: "#ea580c", gradient: "linear-gradient(135deg,#c2410c,#ea580c)", category: "Services",
    modules: [...CORE, "sales_invoice","purchase_invoice","quotation","inventory_items","hr_payroll","crm","rental_items","rental_agreements","maintenance_schedule"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Rental Equipment (Assets)", type: "Asset" },
      { code: "4001", name: "Equipment Rental Income", type: "Revenue" },
      { code: "4002", name: "Operator / Labour Revenue", type: "Revenue" },
      { code: "5100", name: "Equipment Depreciation", type: "Expense" },
      { code: "5101", name: "Equipment Maintenance", type: "Expense" },
      { code: "5102", name: "Fuel & Running Cost", type: "Expense" },
      { code: "5103", name: "Transport & Delivery", type: "Expense" },
    ],
    kpis: [
      { key: "items_on_rent", label: "Items on Rent", icon: "🏗️", color: "#ea580c" },
      { key: "monthly_revenue", label: "Monthly Revenue", icon: "💰", color: "#34d399" },
      { key: "utilization", label: "Fleet Utilization", icon: "📊", color: "#818cf8" },
      { key: "overdue_returns", label: "Overdue Returns", icon: "⚠️", color: "#f87171" },
    ],
    quickActions: [
      { label: "New Rental", href: "/dashboard/sales-invoice", icon: "🏗️", color: "#ea580c" },
      { label: "Quotation", href: "/dashboard/quotation", icon: "📄", color: "#34d399" },
      { label: "Collect Rent", href: "/dashboard/payment-receipts", icon: "💳", color: "#818cf8" },
      { label: "Maintenance Log", href: "/dashboard/expense-vouchers", icon: "🔧", color: "#fbbf24" },
    ],
  },
  */

  // ════════════════════════════════════════════════════════════
  //  FRANCHISE BUSINESS
  // ════════════════════════════════════════════════════════════

  /* PHASE-2+ (hidden for Phase 1 launch)
  {
    id: "franchise_brand", label: "Franchise / Chain Business", icon: "🏪", emoji: "🏪",
    description: "Multi-branch franchise — chain stores, restaurants, brand outlets, master franchise",
    tagline: "Brand → Franchise → Outlets → Royalty → Report",
    color: "#7c3aed", gradient: "linear-gradient(135deg,#6d28d9,#7c3aed)", category: "Commerce",
    modules: [...CORE, "sales_invoice","purchase_invoice","purchase_order","inventory_items","stock_rates","hr_payroll","crm","pos","franchise_outlets","royalty_tracking","brand_compliance","reports_inventory"],
    defaultAccounts: [
      ...COMMON_ACCOUNTS,
      { code: "1100", name: "Franchise Receivables", type: "Asset" },
      { code: "1200", name: "Inventory / Stock", type: "Asset" },
      { code: "4001", name: "Product Sales Revenue", type: "Revenue" },
      { code: "4002", name: "Franchise Fee Income", type: "Revenue" },
      { code: "4003", name: "Royalty Income", type: "Revenue" },
      { code: "5100", name: "Cost of Goods Sold", type: "Expense" },
      { code: "5101", name: "Marketing & Brand Spend", type: "Expense" },
      { code: "5102", name: "Outlet Support Cost", type: "Expense" },
    ],
    kpis: [
      { key: "total_outlets", label: "Total Outlets", icon: "🏪", color: "#7c3aed" },
      { key: "monthly_revenue", label: "Total Revenue", icon: "💰", color: "#34d399" },
      { key: "royalty_collected", label: "Royalty Collected", icon: "🏅", color: "#fbbf24" },
      { key: "best_outlet", label: "Top Outlet Sales", icon: "📊", color: "#818cf8" },
    ],
    quickActions: [
      { label: "Sales Invoice", href: "/dashboard/sales-invoice", icon: "🧾", color: "#7c3aed" },
      { label: "Stock Transfer", href: "/dashboard/retail/stock-transfer", icon: "🔄", color: "#34d399" },
      { label: "Branch Reports", href: "/dashboard/retail/branch-reports", icon: "📊", color: "#818cf8" },
      { label: "Collect Payment", href: "/dashboard/payment-receipts", icon: "💳", color: "#fbbf24" },
    ],
  },
  */

];

// ─────────────────────────────────────────────────────────────
//  Phase & Status Configuration
//  Phase 1  = Trading, Wholesale, Distribution, Import/Export
//  Phase 2  = Manufacturing, Retail, Restaurant, Ecommerce
//  Phase 3  = Services, Construction, Law, IT
//  Phase 4  = Healthcare, Education, Hospitality, Specialised
// ─────────────────────────────────────────────────────────────
export const BUSINESS_PHASE_CONFIG: Record<string, { phase: 1|2|3|4; status: PhaseStatus; category: string; label: string; emoji: string; description: string }> = {

  // ── Phase 1 — LIVE (Commerce / Trade) ───────────────────────
  trading:              { phase:1, status:"live",        category:"Commerce",          label:"Wholesale & Trading",     emoji:"🛒", description:"Buy & sell goods — general merchandise, hardware, electronics" },
  distribution:         { phase:1, status:"live",        category:"Commerce",          label:"Distribution",            emoji:"🚚", description:"Route-based distribution, van sales, multi-depot operations" },
  import_company:       { phase:1, status:"live",        category:"Commerce",          label:"Import Company",          emoji:"🚢", description:"International trade, landed cost, customs clearance" },
  export_company:       { phase:1, status:"live",        category:"Commerce",          label:"Export Company",          emoji:"📦", description:"Export management, commercial invoices, packing lists" },
  clearing_forwarding:  { phase:1, status:"live",        category:"Commerce",          label:"Clearing & Forwarding",   emoji:"🏗️", description:"Freight forwarding, customs documentation" },

  // ── Phase 2 — COMING SOON (Production + Retail + Food) ──────
  manufacturing:        { phase:2, status:"coming_soon", category:"Production",        label:"Manufacturing",           emoji:"🏭", description:"BOM, production orders, work orders, finished goods" },
  food_processing:      { phase:2, status:"coming_soon", category:"Production",        label:"Food Processing",         emoji:"🥫", description:"Recipe-based production, batch tracking, food costing" },
  retail:               { phase:2, status:"coming_soon", category:"Commerce",          label:"Retail & Multi-Store",    emoji:"🏪", description:"POS, loyalty, multi-branch retail management" },
  ecommerce:            { phase:2, status:"coming_soon", category:"Commerce",          label:"E-Commerce",              emoji:"🛍️", description:"Online orders, product listings, shipping, returns" },
  restaurant:           { phase:2, status:"coming_soon", category:"Food & Beverage",   label:"Restaurant / Café",       emoji:"🍽️", description:"Tables, kitchen display, menu, recipe costing" },
  franchise_restaurant: { phase:2, status:"coming_soon", category:"Food & Beverage",   label:"Franchise / Chain",       emoji:"🍔", description:"Multi-outlet restaurant chain with royalty tracking" },
  chain_store:          { phase:2, status:"coming_soon", category:"Commerce",          label:"Chain Store / Franchise", emoji:"🏬", description:"Franchise outlets, royalty, brand compliance, HQ reports" },
  franchise_brand:      { phase:2, status:"coming_soon", category:"Commerce",          label:"Franchise Brand",         emoji:"🏅", description:"Franchisor management — outlets, royalties, compliance" },

  // ── Phase 3 — COMING SOON (Services + Healthcare + RE) ──────
  service:              { phase:3, status:"coming_soon", category:"Services",          label:"Services / Agency",       emoji:"💼", description:"Projects, contracts, time billing, recurring invoices" },
  construction:         { phase:3, status:"coming_soon", category:"Construction",      label:"Construction",            emoji:"🏗️", description:"Sites, BOQ, subcontractors, material requests" },
  real_estate:          { phase:3, status:"coming_soon", category:"Real Estate",       label:"Real Estate",             emoji:"🏠", description:"Properties, tenants, rent collection, leases" },
  law_firm:             { phase:3, status:"coming_soon", category:"Services",          label:"Law Firm",                emoji:"⚖️", description:"Cases, client billing, time tracking, retainers" },
  accounting_firm:      { phase:3, status:"coming_soon", category:"Services",          label:"Accounting Firm",         emoji:"📒", description:"Client books, audit files, payroll, compliance" },
  audit_firm:           { phase:3, status:"coming_soon", category:"Services",          label:"Audit Firm",              emoji:"🔍", description:"Audit engagements, working papers, client management" },
  consultancy_firm:     { phase:3, status:"coming_soon", category:"Services",          label:"Consultancy Firm",        emoji:"🎯", description:"Client projects, retainers, deliverables, billing" },
  architecture_firm:    { phase:3, status:"coming_soon", category:"Services",          label:"Architecture Firm",       emoji:"📐", description:"Projects, drawings, milestones, client billing" },
  pharmacy:             { phase:3, status:"coming_soon", category:"Healthcare",        label:"Pharmacy",                emoji:"💊", description:"Drug inventory, prescriptions, expiry tracking" },
  clinic:               { phase:3, status:"coming_soon", category:"Healthcare",        label:"Clinic",                  emoji:"🩺", description:"Patient records, appointments, OPD billing" },
  it_company:           { phase:3, status:"coming_soon", category:"Technology",        label:"IT Company",              emoji:"💻", description:"Projects, sprints, support tickets, contracts" },
  saas_company:         { phase:3, status:"coming_soon", category:"Technology",        label:"SaaS Company",            emoji:"☁️", description:"Subscriptions, MRR, ARR, recurring billing" },
  membership_website:   { phase:3, status:"coming_soon", category:"Technology",        label:"Membership Website",      emoji:"🌐", description:"Member plans, access control, recurring billing" },
  isp:                  { phase:3, status:"coming_soon", category:"Technology",        label:"ISP / Cable Network",     emoji:"📡", description:"Customer connections, packages, monthly billing" },
  cable_network:        { phase:3, status:"coming_soon", category:"Technology",        label:"Cable Network",           emoji:"📺", description:"Subscriber management, billing, complaints" },
  subscription_box:     { phase:3, status:"coming_soon", category:"Technology",        label:"Subscription Box",        emoji:"📦", description:"Box orders, recurring subscriptions, fulfilment" },
  transport:            { phase:3, status:"coming_soon", category:"Transport",         label:"Transport / Logistics",   emoji:"🚛", description:"Fleet management, trips, drivers, fuel tracking" },
  ngo:                  { phase:3, status:"coming_soon", category:"Non-Profit",        label:"NGO / Non-Profit",        emoji:"🤝", description:"Donor management, grants, fund accounting" },
  event_planner:        { phase:3, status:"coming_soon", category:"Services",          label:"Event Management",        emoji:"🎪", description:"Bookings, vendor management, event budgets" },
  wedding_planner:      { phase:3, status:"coming_soon", category:"Services",          label:"Wedding Planner",         emoji:"💍", description:"Client events, vendor payments, advance tracking" },
  decorator:            { phase:3, status:"coming_soon", category:"Services",          label:"Decorator",               emoji:"🎨", description:"Event decoration orders, material stock, billing" },
  sound_services:       { phase:3, status:"coming_soon", category:"Services",          label:"Sound / AV Services",     emoji:"🎵", description:"Equipment rental, event bookings, maintenance" },
  equipment_rental:     { phase:3, status:"coming_soon", category:"Services",          label:"Equipment Rental",        emoji:"🏗️", description:"Rental items, agreements, utilisation tracking" },
  property_rental:      { phase:3, status:"coming_soon", category:"Real Estate",       label:"Property Rental",         emoji:"🏘️", description:"Rental properties, tenants, deposits, agreements" },
  generator_rental:     { phase:3, status:"coming_soon", category:"Services",          label:"Generator Rental",        emoji:"⚡", description:"Generator fleet, bookings, maintenance, billing" },
  advertising_agency:   { phase:3, status:"coming_soon", category:"Media & Advertising", label:"Advertising Agency",   emoji:"📢", description:"Campaign billing, media costs, client P&L" },
  digital_marketing:    { phase:3, status:"coming_soon", category:"Media & Advertising", label:"Digital Marketing",    emoji:"📱", description:"Client retainers, campaign budgets, performance billing" },
  media_house:          { phase:3, status:"coming_soon", category:"Media & Advertising", label:"Media House",          emoji:"📰", description:"Media planning, ad revenue, content production" },
  production_house:     { phase:3, status:"coming_soon", category:"Media & Advertising", label:"Production House",     emoji:"🎬", description:"Project-based billing, crew, equipment, post-production" },
  printing_press:       { phase:3, status:"coming_soon", category:"Media & Advertising", label:"Printing Press",       emoji:"🖨️", description:"Print orders, paper stock, ink, delivery tracking" },
  mobile_repair:        { phase:3, status:"coming_soon", category:"Repair",            label:"Mobile Repair",           emoji:"📲", description:"Job cards, spare parts, warranty, technician billing" },
  computer_repair:      { phase:3, status:"coming_soon", category:"Repair",            label:"Computer Repair",         emoji:"🖥️", description:"Job cards, parts inventory, AMC contracts" },
  electronics_repair:   { phase:3, status:"coming_soon", category:"Repair",            label:"Electronics Repair",      emoji:"🔌", description:"Repair jobs, warranty tracking, parts stock" },
  equipment_maintenance:{ phase:3, status:"coming_soon", category:"Repair",            label:"Equipment Maintenance",   emoji:"🔧", description:"AMC contracts, service schedules, job billing" },
  solar_company:        { phase:3, status:"coming_soon", category:"Energy",            label:"Solar Company",           emoji:"☀️", description:"Projects, panel stock, AMC, installer management" },
  electric_company:     { phase:3, status:"coming_soon", category:"Energy",            label:"Electric Company",        emoji:"💡", description:"Utility billing, meter readings, connections" },
  gas_distribution:     { phase:3, status:"coming_soon", category:"Energy",            label:"Gas Distribution",        emoji:"🔥", description:"Cylinder stock, customer routes, delivery billing" },
  water_supply:         { phase:3, status:"coming_soon", category:"Energy",            label:"Water Supply",            emoji:"💧", description:"Customer billing, meter reading, maintenance" },

  // ── Phase 4 — COMING SOON (Specialised / Institutional) ─────
  hospital:             { phase:4, status:"coming_soon", category:"Healthcare",        label:"Hospital / Clinic",       emoji:"🏥", description:"Patients, appointments, lab, OPD/IPD billing" },
  school:               { phase:4, status:"coming_soon", category:"Education",         label:"School / College",        emoji:"🏫", description:"Students, fees, schedules, exams, results" },
  hotel:                { phase:4, status:"coming_soon", category:"Hospitality",       label:"Hotel / Guesthouse",      emoji:"🏨", description:"Room booking, housekeeping, front desk, folios" },
  salon:                { phase:4, status:"coming_soon", category:"Beauty & Wellness", label:"Salon & Spa",             emoji:"✂️", description:"Appointments, stylists, service menu, commissions" },
  gym:                  { phase:4, status:"coming_soon", category:"Beauty & Wellness", label:"Gym & Fitness",           emoji:"🏋️", description:"Memberships, trainers, class schedules" },
  agriculture:          { phase:4, status:"coming_soon", category:"Agriculture",       label:"Agriculture / Farm",      emoji:"🌾", description:"Crops, livestock, harvest, field management" },
  car_showroom:         { phase:4, status:"coming_soon", category:"Automotive",        label:"Car Showroom",            emoji:"🚗", description:"Vehicle stock, test drives, deals, financing" },
  car_workshop:         { phase:4, status:"coming_soon", category:"Automotive",        label:"Car Workshop",            emoji:"🔧", description:"Job cards, parts, mechanics, warranty" },
  spare_parts:          { phase:4, status:"coming_soon", category:"Automotive",        label:"Spare Parts Store",       emoji:"⚙️", description:"Parts inventory, barcode, supplier orders, retail" },
  car_rental:           { phase:4, status:"coming_soon", category:"Automotive",        label:"Car Rental / Leasing",    emoji:"🚙", description:"Bookings, agreements, mileage, fuel, maintenance" },
};

// Convenience arrays
export const PHASE_1_TYPES = Object.entries(BUSINESS_PHASE_CONFIG).filter(([,v]) => v.phase === 1).map(([k]) => k);
export const LIVE_TYPES     = Object.entries(BUSINESS_PHASE_CONFIG).filter(([,v]) => v.status === "live").map(([k]) => k);

// Get phase/status for any business type (defaults to Phase 2 coming_soon if not in map)
export function getPhaseConfig(typeId: string) {
  return BUSINESS_PHASE_CONFIG[typeId] ?? { phase: 2 as const, status: "coming_soon" as PhaseStatus, category: "Other", label: typeId, emoji: "🔧", description: "" };
}

export function isLive(typeId: string): boolean {
  return getPhaseConfig(typeId).status === "live";
}

export function isComingSoon(typeId: string): boolean {
  return getPhaseConfig(typeId).status === "coming_soon";
}

// ─────────────────────────────────────────────────────────────
//  Helper functions
// ─────────────────────────────────────────────────────────────

export function getBusinessType(type: string): BusinessTypeMeta {
  const found = BUSINESS_TYPES.find((b) => b.id === type);
  if (found) return found;
  // Auto-generate a minimal meta for types not yet in BUSINESS_TYPES array
  const cfg = getPhaseConfig(type);
  return {
    id: type as BusinessType,
    label: cfg.label,
    icon: cfg.emoji,
    emoji: cfg.emoji,
    description: cfg.description,
    tagline: "",
    color: "#818cf8",
    gradient: "linear-gradient(135deg,#6366f1,#818cf8)",
    category: cfg.category,
    phase: cfg.phase,
    status: cfg.status,
    modules: [...CORE, "sales_invoice","purchase_invoice","reports_inventory"],
    defaultAccounts: COMMON_ACCOUNTS,
    kpis: [],
    quickActions: [],
  };
}

export function hasModule(businessType: string, module: ModuleKey): boolean {
  return getBusinessType(businessType).modules.includes(module);
}

export const BUSINESS_CATEGORIES = [
  "All",
  "Commerce",
  "Production",
  "Food & Beverage",
  "Healthcare",
  "Hospitality",
  "Education",
  "Construction",
  "Real Estate",
  "Services",
  "Technology",
  "Media & Advertising",
  "Repair",
  "Energy",
  "Automotive",
  "Beauty & Wellness",
  "Transport",
  "Agriculture",
  "Non-Profit",
];
