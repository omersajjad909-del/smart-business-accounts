"use client";

import { useEffect, useState, useMemo } from "react";
import { BUSINESS_TYPES } from "@/lib/businessModules";
import { getCurrentUser } from "@/lib/auth";

const FONT = "'Outfit','Inter',sans-serif";

const PLANS = ["STARTER", "PRO", "ENTERPRISE"] as const;
type Plan = typeof PLANS[number];

const PLAN_META: Record<Plan, { label: string; color: string; bg: string; border: string; desc: string }> = {
  STARTER:    { label: "Starter",    color: "#818cf8", bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.3)", desc: "Basic features" },
  PRO:        { label: "Pro",        color: "#38bdf8", bg: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.3)",  desc: "Advanced features" },
  ENTERPRISE: { label: "Enterprise", color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.3)", desc: "Full access" },
};

// Human-readable module labels
const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  ai_assistant: "AI Assistant",
  chart_of_accounts: "Chart of Accounts",
  cpv: "Cash Payment Voucher",
  crv: "Cash Receipt Voucher",
  jv: "Journal Voucher",
  contra: "Contra Entry",
  advance_payment: "Advance Payments",
  petty_cash: "Petty Cash",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
  bank_reconciliation: "Bank Reconciliation",
  payment_receipts: "Payment Receipts",
  expense_vouchers: "Expense Vouchers",
  tax_configuration: "Tax Configuration",
  bulk_payments: "Bulk Payments",
  loans: "Loans",
  recurring: "Recurring Transactions",
  reports_financial: "Financial Reports",
  admin_settings: "Settings",
  opening_balances: "Opening Balances",
  sales_invoice: "Sales Invoice",
  purchase_invoice: "Purchase Invoice",
  purchase_order: "Purchase Order",
  quotation: "Quotation",
  delivery_challan: "Delivery Challan",
  sale_return: "Sale Return",
  outward: "Outward / Dispatch",
  inventory_items: "Inventory Items",
  stock_rates: "Stock Rates",
  barcode: "Barcode Management",
  reports_inventory: "Inventory Reports",
  crm: "CRM",
  hr_payroll: "HR & Payroll",
  bom: "Bill of Materials",
  production_orders: "Production Orders",
  work_orders: "Work Orders",
  raw_materials: "Raw Materials",
  restaurant_tables: "Tables",
  restaurant_menu: "Menu",
  kitchen_orders: "Kitchen Orders",
  recipe_costing: "Recipe Costing",
  re_properties: "Properties",
  re_tenants: "Tenants",
  re_rent: "Rent Collection",
  re_leases: "Lease Management",
  projects: "Projects",
  site_management: "Site Management",
  material_requests: "Material Requests",
  subcontractors: "Subcontractors",
  routes: "Routes",
  delivery_tracking: "Delivery Tracking",
  van_sales: "Van Sales",
  pos: "Point of Sale",
  loyalty_points: "Loyalty Points",
  product_catalog: "Product Catalog",
  stock_transfer: "Stock Transfer",
  branch_reports: "Branch Reports",
  online_store_sync: "Online Store Sync",
  supplier_portal: "Supplier Portal",
  student_mgmt: "Student Management",
  fee_collection: "Fee Collection",
  class_schedule: "Class Schedule",
  exam_results: "Exam Results",
  patient_records: "Patient Records",
  appointments: "Appointments",
  prescriptions: "Prescriptions",
  lab_tests: "Lab Tests",
  room_booking: "Room Booking",
  housekeeping: "Housekeeping",
  room_service: "Room Service",
  front_desk: "Front Desk",
  drug_inventory: "Drug Inventory",
  prescriptions_pharmacy: "Pharmacy Prescriptions",
  expiry_tracking: "Expiry Tracking",
  appointments_salon: "Appointments",
  stylist_mgmt: "Stylist Management",
  service_menu: "Service Menu",
  memberships: "Memberships",
  class_schedule_gym: "Class Schedule",
  trainer_mgmt: "Trainer Management",
  fleet_mgmt: "Fleet Management",
  trips: "Trips",
  driver_mgmt: "Driver Management",
  fuel_tracking: "Fuel Tracking",
  crop_mgmt: "Crop Management",
  livestock: "Livestock",
  field_mgmt: "Field Management",
  harvest: "Harvest",
  donor_mgmt: "Donor Management",
  grant_tracking: "Grant Tracking",
  beneficiary_mgmt: "Beneficiary Management",
  fund_accounting: "Fund Accounting",
  product_listings: "Product Listings",
  order_mgmt: "Order Management",
  returns_mgmt: "Returns Management",
  shipping: "Shipping",
  case_mgmt: "Case Management",
  billing_legal: "Legal Billing",
  client_portal: "Client Portal",
  time_billing: "Time Billing",
  project_mgmt: "Project Management",
  sprint_tracking: "Sprint Tracking",
  client_contracts: "Client Contracts",
  tech_support: "Tech Support",
  vehicle_inventory: "Vehicle Inventory",
  service_jobs: "Service Jobs",
  parts_inventory: "Parts Inventory",
  vehicle_rental: "Vehicle Rental",
  ad_campaigns: "Ad Campaigns",
  media_planning: "Media Planning",
  content_production: "Content Production",
  print_jobs: "Print Jobs",
  subscriptions: "Subscriptions",
  mrr_tracking: "MRR Tracking",
  bandwidth_mgmt: "Bandwidth Management",
  billing_recurring: "Recurring Billing",
  audit_files: "Audit Files",
  consulting_projects: "Consulting Projects",
  architectural_drawings: "Architectural Drawings",
  repair_jobs: "Repair Jobs",
  spare_parts_repair: "Spare Parts",
  warranty_tracking: "Warranty Tracking",
  solar_projects: "Solar Projects",
  utility_billing: "Utility Billing",
  meter_reading: "Meter Reading",
  shipments: "Shipments",
  customs_clearance: "Customs Clearance",
  lc_management: "L/C Management",
  event_bookings: "Event Bookings",
  vendor_management: "Vendor Management",
  event_budget: "Event Budget",
  travel_bookings: "Travel Bookings",
  visa_processing: "Visa Processing",
  travel_settlements: "Travel Settlements",
  rental_items: "Rental Items",
  rental_agreements: "Rental Agreements",
  maintenance_schedule: "Maintenance Schedule",
  franchise_outlets: "Franchise Outlets",
  royalty_tracking: "Royalty Tracking",
  brand_compliance: "Brand Compliance",
  // Granular financial report keys
  ledger: "Ledger / Accounts",
  trial_balance: "Trial Balance",
  profit_loss: "Profit & Loss",
  balance_sheet: "Balance Sheet",
  ageing_report: "Ageing Report",
  cash_flow: "Cash Flow Statement",
  stock_ledger: "Stock Ledger",
  // Granular HR keys
  employees: "Employees",
  payroll: "Payroll",
  attendance: "Attendance",
  advance_salary: "Advance Salary",
  // Commerce — granular page keys
  purchase_return: "Purchase Return",
  bulk_payments: "Bulk Payments",
  payment_followup: "Payment Follow-up",
  customer_statement: "Customer Statement",
  supplier_statement: "Supplier Statement",
  fixed_assets: "Fixed Assets",
  audit_trail: "Audit Trail",
  budget: "Budget",
  cost_centers: "Cost Centers",
  price_lists: "Price Lists",
  credit_limits: "Credit Limits",
  warehouses: "Warehouses",
  sales_order: "Sales Order",
  stock_movements: "Stock Movements",
  warehouse_transfers: "Warehouse Transfers",
  purchase_requisition: "Purchase Requisition",
  landed_cost: "Landed Cost",
  // Phase 1 — Distribution
  stock_on_van: "Stock On Van",
  collections: "Collections",
  trip_sheet: "Trip Sheet",
  distribution_analytics: "Distribution Analytics",
  // Phase 1 — Trading
  order_desk: "Order Desk",
  trading_analytics: "Trading Analytics",
  delivery_order: "Delivery Orders",
  // Phase 1 — Import / Export
  import_costing: "Import Costing",
  export_rebate: "Export Rebate / Drawback",
  freight: "Freight",
  containers: "Containers",
  hs_codes: "HS Code Master",
  commercial_invoice: "Commercial Invoice",
  packing_list: "Packing List",
  cert_of_origin: "Certificate of Origin",
  export_docs: "Export Documents",
  trade_analytics: "Trade Analytics",
  export_performance: "Export Performance",
  // Phase 1 — Clearing & Forwarding
  cnf_jobs: "C&F Job Files",
};

// Core modules always ON for all plans
const ALWAYS_ON = new Set([
  "dashboard", "admin_settings", "reports_financial", "chart_of_accounts",
  "cpv", "crv", "payment_receipts", "expense_vouchers",
]);

// Default plan tiers for modules
function getDefaultPlanModules(allModules: string[]): Record<Plan, string[]> {
  // Advanced modules only for PRO+
  const advancedModules = new Set([
    "reports_inventory", "crm", "hr_payroll", "bank_reconciliation",
    "tax_configuration", "bom", "production_orders", "branch_reports",
    "online_store_sync", "supplier_portal", "mrr_tracking", "audit_files",
    "franchise_outlets", "royalty_tracking", "brand_compliance",
    "recurring", "loans", "advance_payment",
  ]);
  // Enterprise-only modules
  const enterpriseOnly = new Set([
    "hr_payroll", "bank_reconciliation",
  ]);

  const starter = allModules.filter(m => !advancedModules.has(m));
  const pro     = allModules.filter(m => !enterpriseOnly.has(m));
  const enterprise = [...allModules];

  return { STARTER: starter, PRO: pro, ENTERPRISE: enterprise };
}

type ConfigMap = Record<string, Record<Plan, string[]>>;

const MODULE_GROUPS: Array<{ id: string; label: string; icon: string; keys: string[] }> = [
  { id: "core",      label: "Core",               icon: "⚙️",  keys: ["dashboard","ai_assistant","admin_settings","chart_of_accounts","opening_balances"] },
  { id: "vouchers",  label: "Vouchers & Finance",  icon: "📑",  keys: ["cpv","crv","jv","contra","advance_payment","petty_cash","credit_note","debit_note","expense_vouchers","loans","recurring","tax_configuration"] },
  { id: "banking",   label: "Banking & Payments",  icon: "🏦",  keys: ["bank_reconciliation","payment_receipts","bulk_payments","payment_followup","customer_statement","supplier_statement"] },
  { id: "reports",   label: "Financial Reports",   icon: "📊",  keys: ["reports_financial","ledger","trial_balance","profit_loss","balance_sheet","ageing_report","cash_flow"] },
  { id: "sales",     label: "Sales",               icon: "🧾",  keys: ["sales_invoice","sales_order","quotation","delivery_challan","delivery_order","sale_return","outward"] },
  { id: "purchases", label: "Purchases",           icon: "🛒",  keys: ["purchase_invoice","purchase_order","purchase_return","purchase_requisition","landed_cost"] },
  { id: "inventory", label: "Inventory",           icon: "📦",  keys: ["inventory_items","stock_rates","barcode","stock_movements","price_lists","credit_limits","warehouses","warehouse_transfers","reports_inventory","stock_ledger"] },
  { id: "hr",        label: "HR & Payroll",        icon: "👥",  keys: ["hr_payroll","employees","payroll","attendance","advance_salary"] },
  { id: "crm",       label: "CRM",                 icon: "🤝",  keys: ["crm"] },
  { id: "assets",    label: "Assets & Control",    icon: "🏗️", keys: ["fixed_assets","audit_trail","budget","cost_centers"] },
  { id: "trading",   label: "Trading",             icon: "📈",  keys: ["order_desk","delivery_order","trading_analytics"] },
  { id: "dist",      label: "Distribution",        icon: "🚚",  keys: ["routes","delivery_tracking","van_sales","stock_on_van","collections","trip_sheet","distribution_analytics"] },
  { id: "retail",    label: "Retail / POS",        icon: "🏪",  keys: ["pos","loyalty_points","product_catalog","stock_transfer","branch_reports","online_store_sync","supplier_portal"] },
  { id: "trade_ops", label: "Trade Operations",    icon: "🚢",  keys: ["shipments","containers","freight","customs_clearance","lc_management"] },
  { id: "trade_doc", label: "Trade Documents",     icon: "📋",  keys: ["hs_codes","import_costing","export_rebate","commercial_invoice","packing_list","cert_of_origin","export_docs","trade_analytics","export_performance"] },
  { id: "cnf",       label: "C&F Operations",      icon: "🛃",  keys: ["cnf_jobs"] },
];

export default function AdminPermissionsPage() {
  const [user]       = useState(() => getCurrentUser());
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<typeof BUSINESS_TYPES[0] | null>(null);
  const [config,     setConfig]     = useState<ConfigMap>({});
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [enabledIds,      setEnabledIds]      = useState<Set<string> | null>(null);
  const [expandedGroups,  setExpandedGroups]  = useState<Set<string>>(new Set(["core","vouchers","banking","reports","sales","purchases","inventory","hr"]));

  const getHeaders = () => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (user) { h["x-user-id"] = user.id; h["x-user-role"] = user.role; }
    return h;
  };

  // Load saved config + enabled business types
  useEffect(() => {
    fetch("/api/admin/business-plan-modules", { headers: getHeaders() })
      .then(r => r.ok ? r.json() : { config: {} })
      .then(d => setConfig(d.config || {}))
      .catch(() => {});

    fetch("/api/admin/business-modules", { headers: getHeaders() })
      .then(r => r.ok ? r.json() : { modules: [] })
      .then(d => {
        const ids = new Set<string>(
          (d.modules || []).filter((m: any) => m.enabled).map((m: any) => m.id as string)
        );
        setEnabledIds(ids);
      })
      .catch(() => setEnabledIds(new Set()));
  }, []);

  // Get plan modules for selected business (saved config or defaults)
  const planModules = useMemo((): Record<Plan, string[]> => {
    if (!selected) return { STARTER: [], PRO: [], ENTERPRISE: [] };
    const saved = config[selected.id];
    if (saved) return saved as Record<Plan, string[]>;
    return getDefaultPlanModules(selected.modules as string[]);
  }, [selected, config]);

  function toggleModule(plan: Plan, mod: string) {
    if (!selected || ALWAYS_ON.has(mod)) return;
    const current = planModules[plan];
    const next = current.includes(mod)
      ? current.filter(m => m !== mod)
      : [...current, mod];

    setConfig(prev => ({
      ...prev,
      [selected.id]: { ...planModules, [plan]: next },
    }));
  }

  function applyPreset(preset: "all" | "default" | "min") {
    if (!selected) return;
    const all = selected.modules as string[];
    if (preset === "all") {
      setConfig(prev => ({ ...prev, [selected.id]: { STARTER: all, PRO: all, ENTERPRISE: all } }));
    } else if (preset === "default") {
      setConfig(prev => { const n = { ...prev }; delete n[selected.id]; return n; });
    } else {
      const core = all.filter(m => ALWAYS_ON.has(m));
      setConfig(prev => ({ ...prev, [selected.id]: { STARTER: core, PRO: all.filter(m => !new Set(["hr_payroll","bank_reconciliation"]).has(m)), ENTERPRISE: all } }));
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/business-plan-modules", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ config }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    } finally { setSaving(false); }
  }

  // Only show business types that are currently enabled in Business Modules admin
  const filtered = useMemo(() => {
    const businesses = enabledIds
      ? BUSINESS_TYPES.filter(b => enabledIds.has(b.id))
      : BUSINESS_TYPES;
    const q = search.toLowerCase();
    return businesses.filter(b =>
      !q || b.label.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)
    );
  }, [search, enabledIds]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg, #0f1117)", padding: "32px 28px", fontFamily: FONT, color: "white" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "white" }}>Plan Permissions</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            Select a business type → manage which modules each plan gets
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved && (
            <span style={{ fontSize: 13, fontWeight: 600, color: "#34d399", padding: "8px 14px", borderRadius: 8, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}>
              ✓ Saved
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            style={{
              background: saving ? "rgba(99,102,241,0.4)" : "#6366f1",
              color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 24px", fontSize: 14, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer", fontFamily: FONT,
            }}
          >
            {saving ? "Saving…" : "Save All Changes"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "280px 1fr" : "1fr", gap: 20, alignItems: "start" }}>

        {/* ── LEFT: Business Types ── */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
              {enabledIds ? `${enabledIds.size} Enabled` : "Loading…"} Business Types
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search business..."
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 13,
                fontFamily: FONT, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ maxHeight: selected ? "calc(100vh - 200px)" : "auto", overflowY: "auto" }}>
            {enabledIds === null && (
              <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading…</div>
            )}
            {enabledIds !== null && filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No enabled business types found.</div>
            )}
            {enabledIds !== null && !selected && (
              // Grid view when nothing selected
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, padding: 14 }}>
                {filtered.map(b => {
                  const hasCustom = !!config[b.id];
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelected(b)}
                      style={{
                        padding: "14px 12px", borderRadius: 12, cursor: "pointer",
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${hasCustom ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`,
                        transition: "all .15s", textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{b.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "white", marginBottom: 2 }}>{b.label}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{(b.modules as string[]).length} modules</div>
                      {hasCustom && (
                        <div style={{ marginTop: 6, fontSize: 9, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                          Customized
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {enabledIds !== null && selected && (
              // List view when something is selected
              filtered.map(b => {
                const isActive = selected.id === b.id;
                const hasCustom = !!config[b.id];
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelected(b)}
                    style={{
                      padding: "11px 16px", cursor: "pointer",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      background: isActive ? "rgba(99,102,241,0.12)" : "transparent",
                      borderLeft: `3px solid ${isActive ? "#6366f1" : "transparent"}`,
                      display: "flex", alignItems: "center", gap: 10,
                      transition: "background .15s",
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{b.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: "white" }}>{b.label}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{(b.modules as string[]).length} modules</div>
                    </div>
                    {hasCustom && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", background: "rgba(99,102,241,0.15)", padding: "1px 5px", borderRadius: 4 }}>Custom</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Plan columns ── */}
        {selected && (
          <div>
            {/* Business header */}
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: "16px 20px", marginBottom: 16,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 32 }}>{selected.icon}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{selected.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    {(selected.modules as string[]).length} total modules available
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => applyPreset("default")} style={presetBtn}>Reset to Defaults</button>
                <button onClick={() => applyPreset("min")}     style={presetBtn}>Recommended</button>
                <button onClick={() => applyPreset("all")}     style={presetBtn}>All ON</button>
                <button onClick={() => setSelected(null)} style={{ ...presetBtn, color: "rgba(255,255,255,0.4)" }}>← Back</button>
              </div>
            </div>

            {/* Plan header bar */}
            {(() => {
              const allMods = selected.modules as string[];
              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 170px 170px 170px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
                    <div style={{ padding: "12px 18px", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)", fontWeight: 600 }}>{allMods.length} modules total</span>
                    </div>
                    {PLANS.map(plan => {
                      const meta = PLAN_META[plan];
                      const count = allMods.filter(m => planModules[plan].includes(m)).length;
                      return (
                        <div key={plan} style={{ padding: "10px 14px", borderRight: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginBottom: 7 }}>{count}/{allMods.length} enabled</div>
                          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                            <button onClick={() => setConfig(prev => ({ ...prev, [selected.id]: { ...planModules, [plan]: allMods } }))}
                              style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${meta.border}`, background: "transparent", color: meta.color, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>All ON</button>
                            <button onClick={() => setConfig(prev => ({ ...prev, [selected.id]: { ...planModules, [plan]: allMods.filter(m => ALWAYS_ON.has(m)) } }))}
                              style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.4)", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Core</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grouped module table */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                    {MODULE_GROUPS.map((group, gi) => {
                      const groupMods = group.keys.filter(k => allMods.includes(k));
                      if (groupMods.length === 0) return null;
                      const isExpanded = expandedGroups.has(group.id);
                      const isLast = gi === MODULE_GROUPS.length - 1;

                      return (
                        <div key={group.id} style={{ borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
                          {/* Group header */}
                          <div
                            onClick={() => setExpandedGroups(prev => { const n = new Set(prev); n.has(group.id) ? n.delete(group.id) : n.add(group.id); return n; })}
                            style={{ display: "grid", gridTemplateColumns: "1fr 170px 170px 170px", padding: "9px 16px", background: "rgba(255,255,255,0.035)", cursor: "pointer", userSelect: "none" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)", width: 10, flexShrink: 0 }}>{isExpanded ? "▼" : "▶"}</span>
                              <span style={{ fontSize: 13 }}>{group.icon}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{group.label}</span>
                              <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)" }}>({groupMods.length})</span>
                            </div>
                            {PLANS.map(plan => {
                              const meta = PLAN_META[plan];
                              const onCount = groupMods.filter(m => planModules[plan].includes(m)).length;
                              const allOn = onCount === groupMods.length;
                              const nonLocked = groupMods.filter(m => !ALWAYS_ON.has(m));
                              return (
                                <div key={plan} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }} onClick={e => e.stopPropagation()}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: allOn ? meta.color : "rgba(255,255,255,.3)", minWidth: 28, textAlign: "right" }}>
                                    {onCount}/{groupMods.length}
                                  </span>
                                  {nonLocked.length > 0 && (
                                    <button
                                      onClick={() => setConfig(prev => {
                                        const cur = new Set(planModules[plan]);
                                        if (allOn) nonLocked.forEach(m => cur.delete(m));
                                        else nonLocked.forEach(m => cur.add(m));
                                        return { ...prev, [selected.id]: { ...planModules, [plan]: Array.from(cur) } };
                                      })}
                                      style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer", border: `1px solid ${allOn ? "rgba(248,113,113,.4)" : meta.border}`, background: "transparent", color: allOn ? "#f87171" : meta.color, fontFamily: FONT }}
                                    >
                                      {allOn ? "All OFF" : "All ON"}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Module rows */}
                          {isExpanded && groupMods.map((mod, mi) => {
                            const locked = ALWAYS_ON.has(mod);
                            return (
                              <div key={mod} style={{ display: "grid", gridTemplateColumns: "1fr 170px 170px 170px", padding: "7px 16px 7px 40px", borderTop: "1px solid rgba(255,255,255,0.03)", background: mi % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>{MODULE_LABELS[mod] || mod}</span>
                                  {locked && <span style={{ fontSize: 9, color: "rgba(255,255,255,.2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>core</span>}
                                </div>
                                {PLANS.map(plan => {
                                  const meta = PLAN_META[plan];
                                  const isOn = planModules[plan].includes(mod);
                                  return (
                                    <div key={plan} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                      <div onClick={() => !locked && toggleModule(plan, mod)}
                                        style={{ width: 34, height: 19, borderRadius: 10, position: "relative", transition: "background .2s", background: isOn ? meta.color : "rgba(255,255,255,0.1)", cursor: locked ? "default" : "pointer", opacity: locked ? 0.7 : 1, flexShrink: 0 }}>
                                        <div style={{ position: "absolute", top: 2.5, left: isOn ? 17 : 2.5, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }}/>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            {/* Save */}
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              {saved && (
                <span style={{ fontSize: 13, fontWeight: 600, color: "#34d399", alignSelf: "center" }}>✓ Saved</span>
              )}
              <button
                onClick={save} disabled={saving}
                style={{
                  background: saving ? "rgba(99,102,241,0.4)" : "#6366f1",
                  color: "#fff", border: "none", borderRadius: 10,
                  padding: "11px 32px", fontSize: 14, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer", fontFamily: FONT,
                }}
              >
                {saving ? "Saving…" : "💾 Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const presetBtn: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)",
  fontSize: 12, fontWeight: 600, cursor: "pointer",
};
