"use client";
import { useEffect, useState } from "react";
import { PERMISSION_CATEGORIES, PLAN_DEFAULT_PERMISSIONS } from "@/lib/planPermissions";
import toast from "react-hot-toast";

/* ─── Types ─────────────────────────────────────────── */
type Features = {
  advancedReports: boolean; bankReconciliation: boolean; inventoryReports: boolean;
  crm: boolean; hrPayroll: boolean; backupRestore: boolean; prioritySupport: boolean;
};
type Plan    = { code: string; name: string; features: Features };
type Pricing = { starter: { monthly: number; yearly: number }; pro: { monthly: number; yearly: number }; enterprise: { monthly: number; yearly: number } };

type CustomPlanRequest = {
  id: string;
  companyId?: string | null;
  email?: string | null;
  modules?: string | null;
  message?: string | null;
  status: string;
  createdAt: string;
};

type ModulePrice = { id?: string; moduleId: string; price: number };

const MODULES = [
  { id: "crm",           label: "CRM & Sales",           icon: "🎯", desc: "Contacts, Opportunities, Interactions" },
  { id: "hr_payroll",    label: "HR & Payroll",           icon: "👥", desc: "Employees, Attendance, Payroll" },
  { id: "inventory",     label: "Inventory & Warehouse",  icon: "📦", desc: "Items, Stock, GRN, Dispatch" },
  { id: "reports",       label: "Advanced Reports",       icon: "📊", desc: "P&L, Balance Sheet, Cash Flow" },
  { id: "multi_branch",  label: "Multi-Branch Support",   icon: "🌍", desc: "Branch management & consolidation" },
  { id: "bank_connect",  label: "Bank Connect (Plaid)",   icon: "🏦", desc: "Auto bank reconciliation" },
  { id: "api_access",    label: "API Access",             icon: "⚡", desc: "REST API + Webhooks" },
  { id: "whatsapp_sms",  label: "WhatsApp & SMS",         icon: "💬", desc: "Automated notifications" },
  { id: "tax_filing",    label: "Tax Filing",             icon: "📋", desc: "Jurisdiction-ready tax reports" },
  { id: "ai_assistant",  label: "AI Financial Assistant", icon: "🤖", desc: "Claude-powered insights & chat" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:  { bg: "rgba(251,191,36,.12)",  text: "#fbbf24" },
  APPROVED: { bg: "rgba(34,197,94,.12)",   text: "#22c55e" },
  REJECTED: { bg: "rgba(239,68,68,.12)",   text: "#f87171" },
  ACTIVE:   { bg: "rgba(99,102,241,.12)",  text: "#818cf8" },
};

type TabKey = "pricing" | "permissions" | "custom-plans" | "modules" | "addon";

type AddonCompany = {
  id: string; name: string; plan: string; createdAt: string;
  addon: { enabled: boolean; plan: string; price: number; activatedAt: string; expiresAt: string | null; notes: string | null } | null;
};
type AddonStats = { total: number; active: number; mrr: number };

/* ─── Section card ───────────────────────────────────── */
function Card({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", overflow: "hidden", marginBottom: 24 }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "white" }}>{title}</h2>
        {subtitle && <p style={{ margin: "3px 0 0", fontSize: 12, color: "#475569" }}>{subtitle}</p>}
      </div>
      <div style={{ padding: "22px 24px" }}>{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function AdminPlansPage() {
  const [tab, setTab] = useState<TabKey>("pricing");

  /* ── Pricing & Permissions state ── */
  const [plans, setPlans] = useState<Plan[]>([
    { code: "starter", name: "Starter", features: { advancedReports: false, bankReconciliation: false, inventoryReports: false, crm: false, hrPayroll: false, backupRestore: false, prioritySupport: false } },
    { code: "pro", name: "Pro", features: { advancedReports: true, bankReconciliation: true, inventoryReports: true, crm: true, hrPayroll: false, backupRestore: true, prioritySupport: false } },
    { code: "enterprise", name: "Enterprise", features: { advancedReports: true, bankReconciliation: true, inventoryReports: true, crm: true, hrPayroll: true, backupRestore: true, prioritySupport: true } },
  ]);
  const [pricing, setPricing] = useState<Pricing>({
    starter:    { monthly: 49,  yearly: 39  },   // $49/mo · $39/mo billed yearly
    pro:        { monthly: 99,  yearly: 79  },   // $99/mo · $79/mo billed yearly
    enterprise: { monthly: 249, yearly: 199 },   // $249/mo · $199/mo billed yearly
  });
  const [planPermissions, setPlanPermissions] = useState<Record<string, string[]>>({
    STARTER: PLAN_DEFAULT_PERMISSIONS.STARTER,
    PRO:     PLAN_DEFAULT_PERMISSIONS.PRO,
    ENTERPRISE: PLAN_DEFAULT_PERMISSIONS.ENTERPRISE,
    CUSTOM: [],
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig,  setSavingConfig]  = useState(false);

  /* ── Custom plan requests ── */
  const [requests, setRequests]   = useState<CustomPlanRequest[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [updatingReq, setUpdatingReq] = useState<string | null>(null);
  const [expandedReq, setExpandedReq] = useState<string | null>(null);

  /* ── Automation Add-on ── */
  const [addonCompanies, setAddonCompanies] = useState<AddonCompany[]>([]);
  const [addonStats, setAddonStats]         = useState<AddonStats>({ total: 0, active: 0, mrr: 0 });
  const [loadingAddon, setLoadingAddon]     = useState(false);
  const [savingAddon, setSavingAddon]       = useState<string | null>(null);
  const [addonSearch, setAddonSearch]       = useState("");
  const [addonEditId, setAddonEditId]       = useState<string | null>(null);
  const [addonEditPrice, setAddonEditPrice] = useState(79);
  const [addonEditPlan, setAddonEditPlan]   = useState<"monthly" | "yearly">("monthly");
  const [addonEditNotes, setAddonEditNotes] = useState("");

  /* ── Module pricing ── */
  const [modulePrices, setModulePrices] = useState<Record<string, number>>(
    Object.fromEntries(MODULES.map(m => [m.id, 0]))
  );
  const [loadingMods, setLoadingMods] = useState(false);
  const [savingMod, setSavingMod]     = useState<string | null>(null);

  /* ─── Load plan config ─── */
  useEffect(() => {
    (async () => {
      setLoadingConfig(true);
      try {
        const res = await fetch("/api/admin/plan-config");
        if (res.ok) {
          const d = await res.json();
          if (Array.isArray(d?.plans))       setPlans(d.plans);
          if (d?.pricing)                     setPricing(d.pricing);
          if (d?.planPermissions)             setPlanPermissions(d.planPermissions);
        }
      } finally { setLoadingConfig(false); }
    })();
  }, []);

  /* ─── Load custom plan requests ─── */
  useEffect(() => {
    if (tab !== "custom-plans") return;
    (async () => {
      setLoadingReqs(true);
      try {
        const r = await fetch("/api/admin/custom-plans");
        if (r.ok) setRequests(await r.json());
      } finally { setLoadingReqs(false); }
    })();
  }, [tab]);

  /* ─── Load automation addon data ─── */
  useEffect(() => {
    if (tab !== "addon") return;
    (async () => {
      setLoadingAddon(true);
      try {
        const r = await fetch("/api/admin/automation-addon");
        if (r.ok) {
          const d = await r.json();
          setAddonCompanies(d.companies || []);
          setAddonStats(d.stats || { total: 0, active: 0, mrr: 0 });
        }
      } finally { setLoadingAddon(false); }
    })();
  }, [tab]);

  /* ─── Toggle / save addon for company ─── */
  async function saveAddon(companyId: string, enabled: boolean, price?: number, plan?: string, notes?: string) {
    setSavingAddon(companyId);
    try {
      const r = await fetch("/api/admin/automation-addon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, enabled, price: price ?? 79, plan: plan ?? "monthly", notes: notes ?? null }),
      });
      if (r.ok) {
        setAddonCompanies(prev => prev.map(c => c.id === companyId
          ? { ...c, addon: { enabled, plan: plan ?? "monthly", price: price ?? 79, activatedAt: c.addon?.activatedAt || new Date().toISOString(), expiresAt: null, notes: notes ?? null } }
          : c
        ));
        setAddonStats(prev => {
          const wasActive = addonCompanies.find(c => c.id === companyId)?.addon?.enabled ?? false;
          const newActive = enabled ? (wasActive ? prev.active : prev.active + 1) : (wasActive ? prev.active - 1 : prev.active);
          const newMrr = addonCompanies
            .map(c => c.id === companyId ? (enabled ? (price ?? 79) : 0) : (c.addon?.enabled ? (c.addon.price || 79) : 0))
            .reduce((s, v) => s + v, 0);
          return { ...prev, active: Math.max(0, newActive), mrr: newMrr };
        });
        setAddonEditId(null);
        toast.success(enabled ? "Automation add-on enabled" : "Add-on disabled");
      } else {
        toast.error("Failed to update add-on");
      }
    } finally { setSavingAddon(null); }
  }

  async function removeAddon(companyId: string) {
    setSavingAddon(companyId);
    try {
      const r = await fetch("/api/admin/automation-addon", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (r.ok) {
        setAddonCompanies(prev => prev.map(c => c.id === companyId ? { ...c, addon: null } : c));
        toast.success("Add-on removed");
      }
    } finally { setSavingAddon(null); }
  }

  /* ─── Load module prices ─── */
  useEffect(() => {
    if (tab !== "modules") return;
    (async () => {
      setLoadingMods(true);
      try {
        const r = await fetch("/api/admin/module-prices");
        if (r.ok) {
          const list: ModulePrice[] = await r.json();
          const map: Record<string, number> = {};
          list.forEach(m => { map[m.moduleId] = m.price; });
          setModulePrices(prev => ({ ...prev, ...map }));
        }
      } finally { setLoadingMods(false); }
    })();
  }, [tab]);

  /* ─── Save plan config ─── */
  async function saveConfig() {
    setSavingConfig(true);
    try {
      const r = await fetch("/api/admin/plan-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans, pricing, planPermissions }),
      });
      if (r.ok) toast.success("Plan configuration saved!");
      else { const j = await r.json(); toast.error(j?.error || "Save failed"); }
    } finally { setSavingConfig(false); }
  }

  /* ─── Update custom plan request status ─── */
  async function updateRequestStatus(id: string, status: string) {
    setUpdatingReq(id);
    try {
      const r = await fetch("/api/admin/custom-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (r.ok) {
        setRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
        toast.success(`Request marked as ${status}`);
      } else toast.error("Failed to update");
    } finally { setUpdatingReq(null); }
  }

  /* ─── Save single module price ─── */
  async function saveModulePrice(moduleId: string) {
    setSavingMod(moduleId);
    try {
      const r = await fetch("/api/admin/module-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, price: modulePrices[moduleId] || 0 }),
      });
      if (r.ok) toast.success(`${moduleId} price saved`);
      else toast.error("Failed to save");
    } finally { setSavingMod(null); }
  }

  async function saveAllModulePrices() {
    setSavingMod("all");
    try {
      await Promise.all(
        MODULES.map(m => fetch("/api/admin/module-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleId: m.id, price: modulePrices[m.id] || 0 }),
        }))
      );
      toast.success("All module prices saved!");
    } finally { setSavingMod(null); }
  }

  /* ─── Toggle plan permission ─── */
  function togglePlanPermission(planCode: "STARTER" | "PRO" | "ENTERPRISE" | "CUSTOM", perm: string) {
    setPlanPermissions(prev => {
      const list = new Set(prev[planCode] || []);
      if (list.has(perm)) list.delete(perm); else list.add(perm);
      return { ...prev, [planCode]: Array.from(list) };
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
    color: "white", fontSize: 14, outline: "none",
  };

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "pricing",      label: "Pricing",           icon: "💰" },
    { key: "permissions",  label: "Permissions",        icon: "🔐" },
    { key: "custom-plans", label: "Custom Requests",    icon: "📋" },
    { key: "modules",      label: "Module Pricing",     icon: "🧩" },
    { key: "addon",        label: "Automation Add-on",  icon: "⚡" },
  ];

  const PLAN_COLORS: Record<string, string> = { starter: "#38bdf8", pro: "#818cf8", enterprise: "#c4b5fd" };

  return (
    <div style={{ minHeight: "100vh", background: "#060918", padding: "28px 24px 60px" }}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button { opacity:.4 }
        select option { background: #0f172a; color: white; }
        .perm-check:checked { accent-color: #6366f1; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "white" }}>Plans & Billing Config</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>Configure pricing, permissions, custom requests, and module pricing</p>
        </div>
        {(tab === "pricing" || tab === "permissions") && (
          <button onClick={saveConfig} disabled={savingConfig || loadingConfig}
            style={{ padding: "10px 22px", borderRadius: 12, background: savingConfig ? "#4338ca" : "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: savingConfig ? .7 : 1 }}>
            {savingConfig ? "Saving…" : "Save Changes"}
          </button>
        )}
        {tab === "modules" && (
          <button onClick={saveAllModulePrices} disabled={savingMod === "all"}
            style={{ padding: "10px 22px", borderRadius: 12, background: savingMod === "all" ? "#4338ca" : "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {savingMod === "all" ? "Saving…" : "Save All Module Prices"}
          </button>
        )}
        {tab === "addon" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "#475569" }}>Add-on price:</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: "#a78bfa" }}>$79<span style={{ fontSize: 12, fontWeight: 400, color: "#475569" }}>/mo</span></span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 28, padding: 5, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all .15s",
              background: tab === t.key ? "linear-gradient(135deg,rgba(79,70,229,.5),rgba(124,58,237,.4))" : "transparent",
              color: tab === t.key ? "white" : "#475569",
              boxShadow: tab === t.key ? "0 2px 12px rgba(79,70,229,.3)" : "none",
            }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {loadingConfig && (tab === "pricing" || tab === "permissions") && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#475569" }}>Loading configuration…</div>
      )}

      {/* ══ TAB: PRICING ══ */}
      {tab === "pricing" && !loadingConfig && (
        <Card title="Plan Pricing" subtitle="Monthly and annual prices shown to customers">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
            {(["starter", "pro", "enterprise"] as const).map(k => (
              <div key={k} style={{ borderRadius: 16, border: `1px solid ${PLAN_COLORS[k]}30`, background: `${PLAN_COLORS[k]}08`, padding: "22px" }}>
                {/* Plan header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${PLAN_COLORS[k]}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    {k === "starter" ? "🌱" : k === "pro" ? "🚀" : "🏆"}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "white", textTransform: "capitalize" }}>{k}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>per company / month</div>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>MONTHLY PRICE (USD)</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 14 }}>$</span>
                    <input type="number" min={0} value={(pricing as any)[k].monthly}
                      onChange={e => setPricing(p => ({ ...p, [k]: { ...p[k], monthly: Number(e.target.value) } }))}
                      style={{ ...inputStyle, paddingLeft: 28 }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>ANNUAL PRICE / MO (USD)</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 14 }}>$</span>
                    <input type="number" min={0} value={(pricing as any)[k].yearly}
                      onChange={e => setPricing(p => ({ ...p, [k]: { ...p[k], yearly: Number(e.target.value) } }))}
                      style={{ ...inputStyle, paddingLeft: 28 }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
                    Annual total: ${(pricing as any)[k].yearly * 12}/yr &nbsp;·&nbsp;
                    <span style={{ color: "#22c55e" }}>
                      {(pricing as any)[k].monthly > 0 ? `${Math.round((1 - (pricing as any)[k].yearly / (pricing as any)[k].monthly) * 100)}% saving` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Intro offer notice */}
          <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.15)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>🎁</span>
            <div style={{ fontSize: 13, color: "#fbbf24" }}>
              <strong>75% intro offer</strong> is applied via Stripe coupon <code style={{ background: "rgba(255,255,255,.06)", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>STRIPE_COUPON_75_OFF</code> env variable — not stored here.
            </div>
          </div>
        </Card>
      )}

      {/* ══ TAB: PERMISSIONS ══ */}
      {tab === "permissions" && !loadingConfig && (
        <Card title="Plan Permissions" subtitle="Tick which permissions each plan includes">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {(["STARTER", "PRO", "ENTERPRISE", "CUSTOM"] as const).map(pc => {
              const count = (planPermissions[pc] || []).length;
              const total = PERMISSION_CATEGORIES.reduce((sum, c) => sum + c.permissions.length, 0);
              return (
                <div key={pc} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "white", textTransform: "capitalize" }}>{pc.toLowerCase()}</div>
                    <span style={{ fontSize: 11, color: "#475569" }}>{count}/{total}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 3, background: "rgba(255,255,255,.06)" }}>
                    <div style={{ height: "100%", width: `${total ? (count / total) * 100 : 0}%`, background: "linear-gradient(90deg,#4f46e5,#7c3aed)", transition: "width .3s" }} />
                  </div>
                  <div style={{ maxHeight: 320, overflowY: "auto", padding: "12px 16px" }}>
                    {PERMISSION_CATEGORIES.map(cat => (
                      <div key={`${pc}-${cat.key}`} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: "#334155", letterSpacing: ".08em", marginBottom: 4, textTransform: "uppercase" }}>{cat.label}</div>
                        {cat.permissions.map(perm => (
                          <label key={`${pc}-${perm}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: planPermissions[pc]?.includes(perm) ? "#94a3b8" : "#334155", padding: "3px 0", cursor: "pointer" }}>
                            <input type="checkbox" className="perm-check"
                              checked={!!planPermissions[pc]?.includes(perm)}
                              onChange={() => togglePlanPermission(pc, perm)} />
                            <span style={{ fontFamily: "monospace", fontSize: 10 }}>{perm}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ══ TAB: CUSTOM PLAN REQUESTS ══ */}
      {tab === "custom-plans" && (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
            {["PENDING","APPROVED","REJECTED","ACTIVE"].map(s => {
              const cnt = requests.filter(r => r.status.toUpperCase() === s).length;
              const c = STATUS_COLORS[s] ?? { bg: "rgba(255,255,255,.04)", text: "#94a3b8" };
              return (
                <div key={s} style={{ padding: "14px 16px", borderRadius: 14, background: c.bg, border: `1px solid ${c.text}30` }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: c.text }}>{cnt}</div>
                  <div style={{ fontSize: 11, color: c.text, opacity: .8, fontWeight: 700 }}>{s}</div>
                </div>
              );
            })}
          </div>

          <Card title="Custom Plan Requests" subtitle="Companies requesting custom/enterprise pricing">
            {loadingReqs ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#475569" }}>Loading requests…</div>
            ) : requests.length === 0 ? (
              <div style={{ padding: "60px 0", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <p style={{ color: "#475569" }}>No custom plan requests yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {requests.map(req => {
                  const s = req.status.toUpperCase();
                  const c = STATUS_COLORS[s] ?? { bg: "rgba(255,255,255,.04)", text: "#94a3b8" };
                  const isExpanded = expandedReq === req.id;
                  return (
                    <div key={req.id} style={{ borderRadius: 14, border: `1px solid ${c.text}25`, background: "rgba(255,255,255,.025)", overflow: "hidden" }}>
                      {/* Row */}
                      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                        <button onClick={() => setExpandedReq(isExpanded ? null : req.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 12, transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>▶</button>

                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{req.email || req.companyId || "Unknown"}</div>
                          <div style={{ fontSize: 11, color: "#475569" }}>{new Date(req.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</div>
                        </div>

                        {/* Modules requested */}
                        <div style={{ flex: 2, display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {(req.modules ? req.modules.split(",") : []).map(m => (
                            <span key={m} style={{ padding: "2px 8px", borderRadius: 10, background: "rgba(99,102,241,.15)", color: "#818cf8", fontSize: 10, fontWeight: 700 }}>{m.trim()}</span>
                          ))}
                        </div>

                        {/* Status badge */}
                        <span style={{ padding: "4px 12px", borderRadius: 20, background: c.bg, color: c.text, fontSize: 11, fontWeight: 800 }}>{s}</span>

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          {s === "PENDING" && (
                            <>
                              <button onClick={() => updateRequestStatus(req.id, "APPROVED")} disabled={updatingReq === req.id}
                                style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.25)", color: "#22c55e", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                {updatingReq === req.id ? "…" : "Approve"}
                              </button>
                              <button onClick={() => updateRequestStatus(req.id, "REJECTED")} disabled={updatingReq === req.id}
                                style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                {updatingReq === req.id ? "…" : "Reject"}
                              </button>
                            </>
                          )}
                          {s === "APPROVED" && (
                            <button onClick={() => updateRequestStatus(req.id, "ACTIVE")} disabled={updatingReq === req.id}
                              style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", color: "#818cf8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                              {updatingReq === req.id ? "…" : "Set Active"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div style={{ padding: "16px 20px 20px", borderTop: "1px solid rgba(255,255,255,.06)", background: "rgba(0,0,0,.2)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", marginBottom: 6 }}>COMPANY / EMAIL</div>
                            <div style={{ fontSize: 13, color: "#cbd5e1" }}>{req.email || "—"}</div>
                            <div style={{ fontSize: 11, color: "#334155", fontFamily: "monospace", marginTop: 3 }}>{req.companyId || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", marginBottom: 6 }}>REQUESTED MODULES</div>
                            <div style={{ fontSize: 13, color: "#cbd5e1" }}>{req.modules || "Not specified"}</div>
                          </div>
                          {req.message && (
                            <div style={{ gridColumn: "1/-1" }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", marginBottom: 6 }}>MESSAGE</div>
                              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>{req.message}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ══ TAB: AUTOMATION ADD-ON ══ */}
      {tab === "addon" && (
        <>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Companies Subscribed", value: addonStats.total, color: "#818cf8", icon: "🏢" },
              { label: "Active Add-ons", value: addonStats.active, color: "#22c55e", icon: "⚡" },
              { label: "Add-on MRR", value: `$${addonStats.mrr}/mo`, color: "#f59e0b", icon: "💰" },
              { label: "Annual Revenue", value: `$${addonStats.mrr * 12}/yr`, color: "#38bdf8", icon: "📈" },
            ].map(s => (
              <div key={s.label} style={{ padding: "16px 18px", borderRadius: 14, background: `${s.color}10`, border: `1px solid ${s.color}30` }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* What's included info card */}
          <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(167,139,250,.06)", border: "1px solid rgba(167,139,250,.2)", marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 10 }}>⚡ Automation Add-on — $79/month per company</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {["WhatsApp Auto-Reply (Claude AI)", "Email Drip Campaigns", "Zapier / Make Webhooks", "CRM Lead Capture", "Website AI Chatbot", "Social Media Auto-posting", "Google Sheets Sync", "AI Content Generator"].map(f => (
                <div key={f} style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#22c55e", fontSize: 10 }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>

          <Card title="Company Add-on Management" subtitle="Enable or disable the Automation Add-on per company">
            {/* Search */}
            <div style={{ marginBottom: 18 }}>
              <input
                placeholder="Search companies…"
                value={addonSearch}
                onChange={e => setAddonSearch(e.target.value)}
                style={{ ...inputStyle, maxWidth: 320 }}
              />
            </div>

            {loadingAddon ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#475569" }}>Loading companies…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {addonCompanies
                  .filter(c => !addonSearch || c.name?.toLowerCase().includes(addonSearch.toLowerCase()))
                  .map(c => {
                    const isActive = c.addon?.enabled === true;
                    const isEditing = addonEditId === c.id;
                    const isSaving  = savingAddon === c.id;
                    return (
                      <div key={c.id} style={{ borderRadius: 14, border: `1px solid ${isActive ? "rgba(34,197,94,.2)" : "rgba(255,255,255,.06)"}`, background: isActive ? "rgba(34,197,94,.04)" : "rgba(255,255,255,.02)", overflow: "hidden" }}>
                        {/* Main row */}
                        <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                          {/* Company info */}
                          <div style={{ flex: 1, minWidth: 160 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{c.name || c.id}</div>
                            <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center" }}>
                              <span style={{ fontSize: 10, color: "#334155", fontFamily: "monospace" }}>{c.id.slice(0, 12)}…</span>
                              <span style={{ padding: "1px 7px", borderRadius: 8, background: "rgba(99,102,241,.15)", color: "#818cf8", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{c.plan || "free"}</span>
                            </div>
                          </div>

                          {/* Addon status */}
                          {c.addon && (
                            <div style={{ textAlign: "center" }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? "#22c55e" : "#f87171" }}>
                                {isActive ? "Active" : "Paused"}
                              </div>
                              <div style={{ fontSize: 10, color: "#475569" }}>
                                ${c.addon.price}/mo · {c.addon.plan}
                              </div>
                              {c.addon.activatedAt && (
                                <div style={{ fontSize: 9, color: "#334155" }}>
                                  Since {new Date(c.addon.activatedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          )}

                          {!c.addon && (
                            <div style={{ fontSize: 12, color: "#334155" }}>No add-on</div>
                          )}

                          {/* Action buttons */}
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                            {!isEditing ? (
                              <>
                                {!c.addon && (
                                  <button
                                    onClick={() => { setAddonEditId(c.id); setAddonEditPrice(79); setAddonEditPlan("monthly"); setAddonEditNotes(""); }}
                                    style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(167,139,250,.15)", border: "1px solid rgba(167,139,250,.3)", color: "#a78bfa", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                    + Enable
                                  </button>
                                )}
                                {c.addon && (
                                  <>
                                    <button
                                      onClick={() => saveAddon(c.id, !isActive, c.addon!.price, c.addon!.plan, c.addon!.notes ?? undefined)}
                                      disabled={isSaving}
                                      style={{ padding: "6px 14px", borderRadius: 8, background: isActive ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)", border: `1px solid ${isActive ? "rgba(239,68,68,.25)" : "rgba(34,197,94,.25)"}`, color: isActive ? "#f87171" : "#22c55e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                      {isSaving ? "…" : isActive ? "Pause" : "Resume"}
                                    </button>
                                    <button
                                      onClick={() => { setAddonEditId(c.id); setAddonEditPrice(c.addon!.price || 79); setAddonEditPlan((c.addon!.plan as any) || "monthly"); setAddonEditNotes(c.addon!.notes || ""); }}
                                      style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => removeAddon(c.id)}
                                      disabled={isSaving}
                                      style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171", fontSize: 12, cursor: "pointer" }}>
                                      ✕
                                    </button>
                                  </>
                                )}
                              </>
                            ) : (
                              <button onClick={() => setAddonEditId(null)}
                                style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Edit form */}
                        {isEditing && (
                          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,.06)", background: "rgba(0,0,0,.2)", display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 12, alignItems: "end" }}>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 5 }}>PRICE (USD/MO)</label>
                              <div style={{ position: "relative" }}>
                                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 12 }}>$</span>
                                <input type="number" min={1} value={addonEditPrice} onChange={e => setAddonEditPrice(Number(e.target.value))}
                                  style={{ ...inputStyle, paddingLeft: 24, fontSize: 14, fontWeight: 700 }} />
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 5 }}>BILLING CYCLE</label>
                              <select value={addonEditPlan} onChange={e => setAddonEditPlan(e.target.value as any)}
                                style={{ ...inputStyle }}>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 5 }}>NOTES (OPTIONAL)</label>
                              <input type="text" placeholder="e.g. Trial 30 days, special deal…" value={addonEditNotes} onChange={e => setAddonEditNotes(e.target.value)}
                                style={{ ...inputStyle }} />
                            </div>
                            <button
                              onClick={() => saveAddon(c.id, true, addonEditPrice, addonEditPlan, addonEditNotes)}
                              disabled={isSaving}
                              style={{ padding: "10px 18px", borderRadius: 10, background: isSaving ? "#4338ca" : "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                              {isSaving ? "Saving…" : "Save & Enable"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ══ TAB: MODULE PRICING ══ */}
      {tab === "modules" && (
        <Card title="Add-On Module Pricing" subtitle="Per-module monthly prices for CUSTOM plan companies">
          {loadingMods ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#475569" }}>Loading module prices…</div>
          ) : (
            <>
              {/* Info banner */}
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", marginBottom: 22, fontSize: 13, color: "#818cf8" }}>
                💡 These prices apply when a company is on the <strong>CUSTOM</strong> plan and selects individual modules. Set to <strong>0</strong> to include in base price.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {MODULES.map(m => (
                  <div key={m.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(99,102,241,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{m.icon}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: "#475569" }}>{m.desc}</div>
                      </div>
                    </div>

                    {/* Price input */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 13 }}>$</span>
                        <input type="number" min={0} step={1} value={modulePrices[m.id] || 0}
                          onChange={e => setModulePrices(prev => ({ ...prev, [m.id]: Number(e.target.value) }))}
                          style={{ ...inputStyle, paddingLeft: 28, fontSize: 15, fontWeight: 700 }} />
                        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#334155", fontSize: 11 }}>/mo</span>
                      </div>
                      <button onClick={() => saveModulePrice(m.id)} disabled={savingMod === m.id || savingMod === "all"}
                        style={{ padding: "10px 14px", borderRadius: 10, background: savingMod === m.id ? "#4338ca" : "rgba(99,102,241,.2)", border: "1px solid rgba(99,102,241,.3)", color: "#818cf8", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                        {savingMod === m.id ? "…" : "Save"}
                      </button>
                    </div>

                    {/* Annual estimate */}
                    {(modulePrices[m.id] || 0) > 0 && (
                      <div style={{ fontSize: 11, color: "#334155" }}>
                        Annual: <span style={{ color: "#22c55e" }}>${((modulePrices[m.id] || 0) * 12).toFixed(0)}/yr</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Total monthly */}
              <div style={{ marginTop: 22, padding: "16px 20px", borderRadius: 14, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>If all modules selected</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>Max custom plan value</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#818cf8" }}>
                    ${Object.values(modulePrices).reduce((sum, v) => sum + v, 0)}<span style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>/mo</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#22c55e" }}>
                    ${(Object.values(modulePrices).reduce((sum, v) => sum + v, 0) * 12).toFixed(0)}/yr
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
