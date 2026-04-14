"use client";

import { useEffect, useState, useMemo } from "react";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/businessModules";
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
  rental_items: "Rental Items",
  rental_agreements: "Rental Agreements",
  maintenance_schedule: "Maintenance Schedule",
  franchise_outlets: "Franchise Outlets",
  royalty_tracking: "Royalty Tracking",
  brand_compliance: "Brand Compliance",
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

// Only show live business types
const LIVE_BUSINESSES = BUSINESS_TYPES.filter((b: any) => !b.phase || b.phase === "phase1" || b.status === "live" || (b as any).coming_soon === false);

type ConfigMap = Record<string, Record<Plan, string[]>>;

export default function AdminPermissionsPage() {
  const [user]    = useState(() => getCurrentUser());
  const [search,  setSearch]  = useState("");
  const [selected, setSelected] = useState<typeof BUSINESS_TYPES[0] | null>(null);
  const [config,  setConfig]  = useState<ConfigMap>({});
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [loading, setLoading] = useState(true);

  const getHeaders = () => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (user) { h["x-user-id"] = user.id; h["x-user-role"] = user.role; }
    return h;
  };

  // Load saved config
  useEffect(() => {
    fetch("/api/admin/business-plan-modules", { headers: getHeaders() })
      .then(r => r.ok ? r.json() : { config: {} })
      .then(d => setConfig(d.config || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return LIVE_BUSINESSES.filter(b =>
      !q || b.label.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)
    );
  }, [search]);

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
              {LIVE_BUSINESSES.length} Business Types
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
            {!selected && (
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

            {selected && (
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

            {/* 3-column plan grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {PLANS.map(plan => {
                const meta = PLAN_META[plan];
                const enabled = new Set(planModules[plan]);
                const allMods = selected.modules as string[];
                return (
                  <div
                    key={plan}
                    style={{
                      background: meta.bg, border: `1px solid ${meta.border}`,
                      borderRadius: 14, overflow: "hidden",
                    }}
                  >
                    {/* Plan header */}
                    <div style={{ padding: "14px 16px", borderBottom: `1px solid ${meta.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                          background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color,
                        }}>
                          {enabled.size}/{allMods.length}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{meta.desc}</div>
                      {/* Quick actions */}
                      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                        <button
                          onClick={() => setConfig(prev => ({ ...prev, [selected.id]: { ...planModules, [plan]: allMods } }))}
                          style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: `1px solid ${meta.border}`, background: "transparent", color: meta.color, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}
                        >
                          All ON
                        </button>
                        <button
                          onClick={() => setConfig(prev => ({ ...prev, [selected.id]: { ...planModules, [plan]: allMods.filter(m => ALWAYS_ON.has(m)) } }))}
                          style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: `1px solid ${meta.border}`, background: "transparent", color: meta.color, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}
                        >
                          Core Only
                        </button>
                      </div>
                    </div>

                    {/* Module list */}
                    <div style={{ padding: "8px 0" }}>
                      {allMods.map(mod => {
                        const isOn = enabled.has(mod);
                        const locked = ALWAYS_ON.has(mod);
                        return (
                          <div
                            key={mod}
                            onClick={() => toggleModule(plan, mod)}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "8px 16px", cursor: locked ? "default" : "pointer",
                              transition: "background .1s",
                              background: isOn ? "rgba(255,255,255,0.04)" : "transparent",
                            }}
                          >
                            {/* Toggle */}
                            <div style={{
                              width: 32, height: 18, borderRadius: 9, flexShrink: 0,
                              background: isOn ? meta.color : "rgba(255,255,255,0.1)",
                              position: "relative", transition: "background .2s",
                            }}>
                              <div style={{
                                position: "absolute", top: 2,
                                left: isOn ? 16 : 2, width: 14, height: 14,
                                borderRadius: "50%", background: "white",
                                transition: "left .2s",
                                boxShadow: "0 1px 3px rgba(0,0,0,.3)",
                              }}/>
                            </div>
                            <span style={{
                              fontSize: 12, color: isOn ? "white" : "rgba(255,255,255,0.35)",
                              fontWeight: isOn ? 500 : 400, flex: 1,
                            }}>
                              {MODULE_LABELS[mod] || mod}
                            </span>
                            {locked && (
                              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 700, textTransform: "uppercase" }}>Core</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

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
