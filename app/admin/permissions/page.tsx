"use client";

import { useEffect, useState, useMemo } from "react";
import { getCurrentUser } from "@/lib/auth";

const FONT = "'Outfit','Inter',sans-serif";

// ─── Module Definitions ───────────────────────────────────────────────────────
// Each module = a named group of features that can be toggled on/off per company
const MODULE_GROUPS = [
  {
    id: "core",
    label: "Core",
    icon: "🏠",
    alwaysOn: true,
    desc: "Dashboard home, settings, profile",
    plans: ["STARTER", "PRO", "ENTERPRISE", "CUSTOM"],
  },
  {
    id: "accounting",
    label: "Accounting",
    icon: "📒",
    alwaysOn: false,
    desc: "Chart of accounts, ledger, CPV/CRV, journal entries",
    plans: ["STARTER", "PRO", "ENTERPRISE", "CUSTOM"],
  },
  {
    id: "sales",
    label: "Sales & Invoicing",
    icon: "🧾",
    alwaysOn: false,
    desc: "Sales invoice, quotation, delivery challan, sale return",
    plans: ["STARTER", "PRO", "ENTERPRISE", "CUSTOM"],
  },
  {
    id: "purchase",
    label: "Purchase",
    icon: "🛒",
    alwaysOn: false,
    desc: "Purchase invoice, purchase order, GRN, supplier payments",
    plans: ["STARTER", "PRO", "ENTERPRISE", "CUSTOM"],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: "📦",
    alwaysOn: false,
    desc: "Items catalog, stock levels, warehouses, barcodes, stock transfer",
    plans: ["STARTER", "PRO", "ENTERPRISE", "CUSTOM"],
  },
  {
    id: "banking",
    label: "Banking & Payments",
    icon: "🏦",
    alwaysOn: false,
    desc: "Bank reconciliation, payment receipts, expense vouchers",
    plans: ["STARTER", "PRO", "ENTERPRISE", "CUSTOM"],
  },
  {
    id: "reports",
    label: "Financial Reports",
    icon: "📊",
    alwaysOn: false,
    desc: "P&L, balance sheet, trial balance, ledger report, ageing",
    plans: ["STARTER", "PRO", "ENTERPRISE", "CUSTOM"],
  },
  {
    id: "inventory_reports",
    label: "Inventory Reports",
    icon: "📉",
    alwaysOn: false,
    desc: "Stock ledger, stock summary, inward/outward reports, low stock alert",
    plans: ["PRO", "ENTERPRISE", "CUSTOM"],
  },
  {
    id: "crm",
    label: "CRM",
    icon: "🤝",
    alwaysOn: false,
    desc: "Contacts, opportunities, pipeline, interactions",
    plans: ["PRO", "ENTERPRISE", "CUSTOM"],
  },
  {
    id: "hr",
    label: "HR & Payroll",
    icon: "👥",
    alwaysOn: false,
    desc: "Employees, attendance, payroll, department budgets",
    plans: ["ENTERPRISE", "CUSTOM"],
  },
  {
    id: "trading",
    label: "Trading Tools",
    icon: "📋",
    alwaysOn: false,
    desc: "Sales orders, credit limits, price lists, landed cost, warehouses",
    plans: ["PRO", "ENTERPRISE", "CUSTOM"],
  },
  {
    id: "integrations",
    label: "Integrations & API",
    icon: "🔌",
    alwaysOn: false,
    desc: "External API access, SSO, bank account linking (Plaid)",
    plans: ["ENTERPRISE", "CUSTOM"],
  },
  {
    id: "backups",
    label: "Backup & Restore",
    icon: "💾",
    alwaysOn: false,
    desc: "Data export, full backup, restore from backup",
    plans: ["PRO", "ENTERPRISE", "CUSTOM"],
  },
  {
    id: "audit",
    label: "Audit Trail",
    icon: "🔍",
    alwaysOn: false,
    desc: "Audit log, system logs, access history",
    plans: ["PRO", "ENTERPRISE", "CUSTOM"],
  },
] as const;

type ModuleId = typeof MODULE_GROUPS[number]["id"];

const PLAN_DEFAULTS: Record<string, ModuleId[]> = {
  STARTER:    ["core", "accounting", "sales", "purchase", "inventory", "banking", "reports"],
  PRO:        ["core", "accounting", "sales", "purchase", "inventory", "banking", "reports", "inventory_reports", "crm", "trading", "backups", "audit"],
  ENTERPRISE: MODULE_GROUPS.map(m => m.id) as unknown as ModuleId[],
  CUSTOM:     ["core"],
};

const PLAN_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  STARTER:    { bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.35)",  text: "#818cf8", badge: "#6366f1" },
  PRO:        { bg: "rgba(14,165,233,0.08)",  border: "rgba(14,165,233,0.35)",  text: "#38bdf8", badge: "#0ea5e9" },
  ENTERPRISE: { bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.35)",  text: "#34d399", badge: "#10b981" },
  CUSTOM:     { bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.35)",  text: "#fbbf24", badge: "#f59e0b" },
};

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter", PRO: "Pro", ENTERPRISE: "Enterprise", CUSTOM: "Custom",
};

interface Company {
  id: string;
  name: string;
  ownerEmail?: string;
  email?: string;
  plan?: string;
  activeModules?: string | null; // comma-separated string from API
  enabledModules?: string[];     // parsed array (local)
  status?: string;
  createdAt?: string;
}

export default function AdminPermissionsPage() {
  const [user] = useState(() => getCurrentUser());

  // ── Step 1: Companies ──
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // ── Step 2: Plan ──
  const [selectedPlan, setSelectedPlan] = useState<string>("STARTER");

  // ── Step 3: Modules ──
  const [enabledModules, setEnabledModules] = useState<Set<ModuleId>>(new Set(PLAN_DEFAULTS.STARTER as ModuleId[]));

  // ── Save state ──
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const getHeaders = () => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (user) { h["x-user-id"] = user.id; h["x-user-role"] = user.role; }
    return h;
  };

  // Load companies
  useEffect(() => {
    setLoadingCompanies(true);
    fetch("/api/admin/companies/all", { headers: getHeaders() })
      .then(r => r.ok ? r.json() : {})
      .then((data: unknown) => {
        const d = data as Record<string, unknown>;
        const list = Array.isArray(data) ? data : ((d.rows ?? d.companies ?? []) as Company[]);
        setCompanies(list);
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoadingCompanies(false));
  }, []);

  // When a company is selected, load its plan + modules
  const selectCompany = (co: Company) => {
    setSelectedCompany(co);
    const plan = co.plan || "STARTER";
    setSelectedPlan(plan);
    // activeModules comes as comma-separated string from API
    const rawMods = typeof co.activeModules === "string" && co.activeModules.length > 0
      ? co.activeModules.split(",").map(s => s.trim()).filter(Boolean)
      : (Array.isArray(co.enabledModules) && co.enabledModules.length > 0 ? co.enabledModules : null);
    const validIds = new Set<string>(MODULE_GROUPS.map(m => m.id));
    const mods: ModuleId[] = rawMods
      ? rawMods.filter(m => validIds.has(m)) as ModuleId[]
      : (PLAN_DEFAULTS[plan] ?? PLAN_DEFAULTS.STARTER) as ModuleId[];
    setEnabledModules(new Set(mods));
  };

  // When plan changes, reset modules to plan defaults (but keep custom tweaks if user already changed)
  const changePlan = (plan: string) => {
    setSelectedPlan(plan);
    setEnabledModules(new Set((PLAN_DEFAULTS[plan] ?? PLAN_DEFAULTS.STARTER) as ModuleId[]));
  };

  const toggleModule = (id: ModuleId) => {
    if (id === "core") return; // always on
    setEnabledModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!selectedCompany) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/companies/${selectedCompany.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ plan: selectedPlan, enabledModules: Array.from(enabledModules) }),
      });
      if (res.ok) {
        setSavedMsg("Saved successfully ✓");
        // update local list
        setCompanies(prev => prev.map(c => c.id === selectedCompany.id
          ? { ...c, plan: selectedPlan, enabledModules: Array.from(enabledModules) }
          : c));
        setSelectedCompany(prev => prev ? { ...prev, plan: selectedPlan, enabledModules: Array.from(enabledModules) } : prev);
      } else {
        setSavedMsg("Save failed — check API");
      }
    } catch {
      setSavedMsg("Network error");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(""), 3000);
    }
  };

  const filteredCompanies = useMemo(() => {
    const q = companySearch.toLowerCase();
    return companies.filter(c => !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
  }, [companies, companySearch]);

  const planModules = useMemo(() =>
    MODULE_GROUPS.filter(m => (PLAN_DEFAULTS[selectedPlan] ?? []).includes(m.id as ModuleId)),
    [selectedPlan]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", padding: "32px 28px", fontFamily: FONT, color: "var(--text-primary)" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Permissions & Modules</h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          Select a business → assign a plan → toggle modules → save. Dashboard sidebar updates accordingly.
        </p>
      </div>

      {savedMsg && (
        <div style={{ background: savedMsg.includes("✓") ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)", border: `1px solid ${savedMsg.includes("✓") ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 10, padding: "10px 18px", marginBottom: 20, fontSize: 13, fontWeight: 600, color: savedMsg.includes("✓") ? "#34d399" : "#f87171" }}>
          {savedMsg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── LEFT: Company list ── */}
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 700, marginBottom: 10 }}>
              Step 1 — Select Business
            </div>
            <input
              value={companySearch}
              onChange={e => setCompanySearch(e.target.value)}
              placeholder="Search business name…"
              style={{ width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text-primary)", fontSize: 13, fontFamily: FONT, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {loadingCompanies ? (
              <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
            ) : filteredCompanies.length === 0 ? (
              <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No businesses found</div>
            ) : filteredCompanies.map(co => {
              const isSelected = selectedCompany?.id === co.id;
              const plan = co.plan || "STARTER";
              const pc = PLAN_COLORS[plan] || PLAN_COLORS.STARTER;
              return (
                <div
                  key={co.id}
                  onClick={() => selectCompany(co)}
                  style={{
                    padding: "13px 18px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                    background: isSelected ? "rgba(99,102,241,0.1)" : "transparent",
                    borderLeft: isSelected ? "3px solid #6366f1" : "3px solid transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{co.name || "—"}</div>
                      {(co.ownerEmail || co.email) && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{co.ownerEmail || co.email}</div>}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, whiteSpace: "nowrap" }}>
                      {PLAN_LABELS[plan] || plan}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Plan + Modules ── */}
        <div>
          {!selectedCompany ? (
            <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: "64px 32px", textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👈</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Select a business to manage permissions</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Choose from the list on the left</div>
            </div>
          ) : (
            <>
              {/* Company header */}
              <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 22px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 700, marginBottom: 4 }}>Selected Business</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedCompany.name}</div>
                  {(selectedCompany.ownerEmail || selectedCompany.email) && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{selectedCompany.ownerEmail || selectedCompany.email}</div>}
                </div>
                <button
                  onClick={save}
                  disabled={saving}
                  style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer", fontFamily: FONT, opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>

              {/* Step 2: Plan */}
              <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px", marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 700, marginBottom: 14 }}>
                  Step 2 — Assign Plan
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                  {(["STARTER", "PRO", "ENTERPRISE", "CUSTOM"] as const).map(plan => {
                    const pc = PLAN_COLORS[plan];
                    const isActive = selectedPlan === plan;
                    return (
                      <div
                        key={plan}
                        onClick={() => changePlan(plan)}
                        style={{
                          border: `2px solid ${isActive ? pc.badge : "var(--border)"}`,
                          borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                          background: isActive ? pc.bg : "transparent",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 14, color: isActive ? pc.text : "var(--text-primary)", marginBottom: 4 }}>
                          {PLAN_LABELS[plan]}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {PLAN_DEFAULTS[plan].length} modules
                        </div>
                        {isActive && (
                          <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: pc.text, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            ✓ Selected
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
                  Selecting a plan resets modules to plan defaults. You can override individual modules below.
                </div>
              </div>

              {/* Step 3: Modules */}
              <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 700, marginBottom: 2 }}>
                      Step 3 — Enable / Disable Modules
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {enabledModules.size} of {MODULE_GROUPS.length} modules enabled — dashboard sidebar will reflect this
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setEnabledModules(new Set(MODULE_GROUPS.map(m => m.id) as unknown as ModuleId[]))}
                      style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", fontFamily: FONT }}
                    >
                      Enable All
                    </button>
                    <button
                      onClick={() => setEnabledModules(new Set(["core"] as ModuleId[]))}
                      style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", fontFamily: FONT }}
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                  {MODULE_GROUPS.map(mod => {
                    const isOn = enabledModules.has(mod.id as ModuleId);
                    const isLocked = mod.alwaysOn;
                    const inPlan = (PLAN_DEFAULTS[selectedPlan] ?? []).includes(mod.id as ModuleId);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => !isLocked && toggleModule(mod.id as ModuleId)}
                        style={{
                          border: `1px solid ${isOn ? "rgba(99,102,241,0.35)" : "var(--border)"}`,
                          borderRadius: 12, padding: "14px 16px", cursor: isLocked ? "default" : "pointer",
                          background: isOn ? "rgba(99,102,241,0.06)" : "transparent",
                          display: "flex", alignItems: "flex-start", gap: 12,
                          transition: "all 0.15s",
                          opacity: isLocked ? 0.8 : 1,
                        }}
                      >
                        <span style={{ fontSize: 22, lineHeight: 1, marginTop: 1 }}>{mod.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{mod.label}</span>
                            {isLocked && (
                              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 6, background: "rgba(99,102,241,0.15)", color: "#818cf8", textTransform: "uppercase", letterSpacing: 0.5 }}>Always On</span>
                            )}
                            {!isLocked && !inPlan && (
                              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 6, background: "rgba(245,158,11,0.15)", color: "#fbbf24", textTransform: "uppercase", letterSpacing: 0.5 }}>Upgrade</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{mod.desc}</div>
                        </div>
                        {/* Toggle */}
                        <div style={{
                          width: 40, height: 22, borderRadius: 11, flexShrink: 0, marginTop: 2,
                          background: isOn ? "#6366f1" : "rgba(255,255,255,0.1)",
                          position: "relative", transition: "background 0.2s",
                          border: `1px solid ${isOn ? "#6366f1" : "var(--border)"}`,
                        }}>
                          <div style={{
                            position: "absolute", top: 2, left: isOn ? 18 : 2, width: 16, height: 16,
                            borderRadius: "50%", background: isOn ? "#fff" : "rgba(255,255,255,0.4)",
                            transition: "left 0.2s",
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
                    Enabled Modules Preview
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {MODULE_GROUPS.filter(m => enabledModules.has(m.id as ModuleId)).map(m => (
                      <span key={m.id} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc", fontWeight: 600 }}>
                        {m.icon} {m.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={save}
                    disabled={saving}
                    style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "11px 32px", fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer", fontFamily: FONT, opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "Saving…" : "💾 Save Module Settings"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
