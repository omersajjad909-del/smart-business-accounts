"use client";
import { useEffect, useState } from "react";
import { PERMISSION_CATEGORIES, PLAN_DEFAULT_PERMISSIONS } from "@/lib/planPermissions";
import { DASHBOARD_FEATURE_DEFS, DASHBOARD_FEATURE_IDS } from "@/lib/dashboardFeatureRegistry";
import BusinessPlanMatrix from "../components/BusinessPlanMatrix";
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

/**
 * The modules a customer can actually buy on the Custom plan.
 *
 * This list used to be its own invention — ten entries with ids like
 * `bank_connect`, `whatsapp_sms` and `ai_assistant` that matched nothing in
 * lib/customPlanPricing, no `accounting` or `trading` at all, and prices saved
 * to a ModulePrice table no public route has ever read. Editing it changed
 * nothing a customer saw. It is now the same six modules /pricing sells, and
 * the prices are saved into PLAN_CONFIG where the public pricing API reads
 * them.
 */
const MODULES = [
  { id: "accounting",          label: "Accounting & Invoicing", icon: "📒", desc: "Ledger, invoices, vouchers, P&L, balance sheet" },
  { id: "inventory",           label: "Inventory Management",   icon: "📦", desc: "Stock tracking, GRN, barcode, low-stock alerts" },
  { id: "crm",                 label: "CRM",                    icon: "👥", desc: "Contacts, sales pipeline, interaction logs" },
  { id: "hr_payroll",          label: "HR & Payroll",           icon: "👨‍💼", desc: "Employees, attendance, payroll, advance salary" },
  { id: "trading",             label: "Trading Desk",           icon: "🔄", desc: "Order desk, procurement, dispatch, outstandings" },
  { id: "bank_reconciliation", label: "Bank Reconciliation",    icon: "🏦", desc: "Statement import, discrepancy flagging, closing" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:  { bg: "rgba(251,191,36,.12)",  text: "#fbbf24" },
  APPROVED: { bg: "rgba(34,197,94,.12)",   text: "#22c55e" },
  REJECTED: { bg: "rgba(239,68,68,.12)",   text: "#f87171" },
  ACTIVE:   { bg: "rgba(99,102,241,.12)",  text: "#818cf8" },
};

type PlanCode = "STARTER" | "PRO" | "ENTERPRISE" | "CUSTOM";
// Four gating screens, two audiences × two jobs:
//   permissions      → what the /pricing table shows outside Pakistan
//   pkr-permissions  → what the /pricing table shows inside Pakistan
//   pages            → which dashboard pages a plan gets outside Pakistan
//   pkr-pages        → which dashboard pages a plan gets inside Pakistan
type TabKey = "pricing" | "permissions" | "pages" | "custom-plans" | "modules" | "addon" | "pkr-pricing" | "pkr-permissions" | "pkr-pages";
const TAB_KEYS: TabKey[] = ["pricing", "permissions", "pages", "custom-plans", "modules", "addon", "pkr-pricing", "pkr-permissions", "pkr-pages"];

type AddonCompany = {
  id: string; name: string; plan: string; createdAt: string;
  addon: { enabled: boolean; plan: string; price: number; activatedAt: string; expiresAt: string | null; notes: string | null } | null;
};
type AddonStats = { total: number; active: number; mrr: number };

/* ─── Section card ───────────────────────────────────── */
/* Says out loud which audience a tab edits and which surface it changes.
   Without it the four gating screens look interchangeable, and an admin has no
   way to tell that "Permissions" is the website and "Pages & Modules" is the
   dashboard, or that the PKR pair only ever reaches Pakistan. */
function ScopeNote({ title, body, pk = false }: { title: string; body: string; pk?: boolean }) {
  const accent = pk ? "5,150,105" : "79,70,229";
  return (
    <div style={{ padding: "13px 18px", borderRadius: 14, marginBottom: 18, background: `rgba(${accent},.08)`, border: `1px solid rgba(${accent},.25)` }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: pk ? "#6ee7b7" : "#c7d2fe", marginBottom: 4 }}>
        {pk ? "🇵🇰 " : "🌍 "}{title}
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

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
  // ?tab=pages lets /admin/permissions forward straight to the merged grid.
  const [tab, setTab] = useState<TabKey>("pricing");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested && TAB_KEYS.includes(requested as TabKey)) setTab(requested as TabKey);
  }, []);

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
  const [dashboardFeatureFlags, setDashboardFeatureFlags] = useState<Record<PlanCode, string[]>>({
    STARTER: [...DASHBOARD_FEATURE_IDS],
    PRO: [...DASHBOARD_FEATURE_IDS],
    ENTERPRISE: [...DASHBOARD_FEATURE_IDS],
    CUSTOM: [...DASHBOARD_FEATURE_IDS],
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

  /* ── Module pricing (Custom plan) ── */
  const [modulePrices, setModulePrices] = useState<Record<string, number>>(
    Object.fromEntries(MODULES.map(m => [m.id, 0]))
  );
  const [modulePricesYearly, setModulePricesYearly] = useState<Record<string, number>>(
    Object.fromEntries(MODULES.map(m => [m.id, 0]))
  );
  // Pakistan list price per module. Kept separate from the USD figure on
  // purpose: converting one into the other is exactly the bug this replaced.
  const [modulePricesPkr, setModulePricesPkr] = useState<Record<string, number>>(
    Object.fromEntries(MODULES.map(m => [m.id, 0]))
  );
  const [modulePricesPkrYearly, setModulePricesPkrYearly] = useState<Record<string, number>>(
    Object.fromEntries(MODULES.map(m => [m.id, 0]))
  );
  const [loadingMods, setLoadingMods] = useState(false);
  const [savingMod, setSavingMod]     = useState<string | null>(null);

  /* ── PKR pricing & permissions ── */
  const [pkrPricing, setPkrPricing] = useState({
    starter:    { monthly: 4999,  yearly: 3999  },
    pro:        { monthly: 9999,  yearly: 7999  },
    enterprise: { monthly: 24999, yearly: 19999 },
  });
  const [pkrPlanPermissions, setPkrPlanPermissions] = useState<Record<string, string[]>>({
    STARTER: PLAN_DEFAULT_PERMISSIONS.STARTER,
    PRO:     PLAN_DEFAULT_PERMISSIONS.PRO,
    ENTERPRISE: PLAN_DEFAULT_PERMISSIONS.ENTERPRISE,
    CUSTOM: [],
  });
  const [loadingPkrConfig, setLoadingPkrConfig] = useState(false);
  const [savingPkrConfig,  setSavingPkrConfig]  = useState(false);

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
          if (d?.dashboardFeatureFlags)        setDashboardFeatureFlags(d.dashboardFeatureFlags);
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

  /* ─── Load PKR plan config ─── */
  useEffect(() => {
    if (tab !== "pkr-pricing" && tab !== "pkr-permissions") return;
    (async () => {
      setLoadingPkrConfig(true);
      try {
        const r = await fetch("/api/admin/pkr-plan-config");
        if (r.ok) {
          const d = await r.json();
          if (d?.pricing)              setPkrPricing(d.pricing);
          if (d?.planPermissions)      setPkrPlanPermissions(d.planPermissions);
          // d.dashboardFeatureFlags is ignored — page access is currency-neutral.
        }
      } finally { setLoadingPkrConfig(false); }
    })();
  }, [tab]);

  /* ─── Save PKR plan config ─── */
  async function savePkrConfig() {
    setSavingPkrConfig(true);
    try {
      const r = await fetch("/api/admin/pkr-plan-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // No dashboardFeatureFlags: page access is set once for all currencies
        // in Pages & Modules, so writing a PKR copy would only drift.
        body: JSON.stringify({ pricing: pkrPricing, planPermissions: pkrPlanPermissions }),
      });
      if (!r.ok) { const j = await r.json(); toast.error(j?.error || "Save failed"); return; }

      // Module rates live in PLAN_CONFIG (both currencies together), not in the
      // PKR document — the public pricing route reads them from there. Saving
      // them here too means the PKR tab's own button does what it looks like it
      // does for the module cards below the plans.
      if (tab === "pkr-pricing") await saveAllModulePrices({ silent: true });

      toast.success("PKR configuration saved!");
    } finally { setSavingPkrConfig(false); }
  }

  function togglePkrPlanPermission(planCode: PlanCode, perm: string) {
    setPkrPlanPermissions(prev => {
      const list = new Set(prev[planCode] || []);
      if (list.has(perm)) list.delete(perm); else list.add(perm);
      return { ...prev, [planCode]: Array.from(list) };
    });
  }

  /* ─── Load module prices ───
     From plan-config, which is what /api/public/pricing serves to customers.
     The old ModulePrice table this read from is not wired to anything. */
  useEffect(() => {
    // PKR module rates live on the PKR Pricing tab, so both tabs load this.
    if (tab !== "modules" && tab !== "pkr-pricing") return;
    (async () => {
      setLoadingMods(true);
      try {
        const r = await fetch("/api/admin/plan-config");
        if (r.ok) {
          const d = await r.json();
          const mods: any[] = Array.isArray(d?.customPlan?.modules) ? d.customPlan.modules : [];
          const usd: Record<string, number> = {};
          const usdY: Record<string, number> = {};
          const pkr: Record<string, number> = {};
          const pkrY: Record<string, number> = {};
          for (const m of mods) {
            if (!m?.id) continue;
            usd[m.id]  = Number(m.price) || 0;
            usdY[m.id] = Number(m.priceYearly) || 0;
            pkr[m.id]  = Number(m.pricePkr) || 0;
            pkrY[m.id] = Number(m.pricePkrYearly) || 0;
          }
          setModulePrices(prev => ({ ...prev, ...usd }));
          setModulePricesYearly(prev => ({ ...prev, ...usdY }));
          setModulePricesPkr(prev => ({ ...prev, ...pkr }));
          setModulePricesPkrYearly(prev => ({ ...prev, ...pkrY }));
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
        body: JSON.stringify({ plans, pricing, planPermissions, dashboardFeatureFlags }),
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

  /* ─── Save module prices ───
     One write of the whole customPlan block into plan-config. Saving a single
     module on its own is not offered any more: the config is stored as one
     document, so a per-module POST would have to read-modify-write it and two
     quick saves could drop each other's edit. */
  async function saveAllModulePrices(opts: { silent?: boolean } = {}) {
    setSavingMod("all");
    try {
      // Read first so nothing already saved under customPlan is lost.
      const current: any = await fetch("/api/admin/plan-config")
        .then(r => (r.ok ? r.json() : {}))
        .catch(() => ({}));
      const existing: any[] = Array.isArray(current?.customPlan?.modules) ? current.customPlan.modules : [];
      const byId = new Map(existing.map((m: any) => [m.id, m]));

      const modules = MODULES.map(m => ({
        ...(byId.get(m.id) || { id: m.id, name: m.label, enabled: true, standalone: true }),
        id: m.id,
        price:          Number(modulePrices[m.id])          || 0,
        priceYearly:    Number(modulePricesYearly[m.id])    || 0,
        pricePkr:       Number(modulePricesPkr[m.id])       || 0,
        pricePkrYearly: Number(modulePricesPkrYearly[m.id]) || 0,
      }));

      const r = await fetch("/api/admin/plan-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...current,
          customPlan: { ...(current?.customPlan || {}), modules },
        }),
      });
      if (r.ok) { if (!opts.silent) toast.success("Module prices saved — live on /pricing"); }
      else { const j = await r.json().catch(() => ({})); toast.error(j?.error || "Save failed"); }
    } finally { setSavingMod(null); }
  }

  /* ─── Reset plan permissions to the recommended defaults ───
     This screen seeds its checkboxes from the saved config, so once anything
     has ever been saved there was no way back to the ladder in
     PLAN_DEFAULT_PERMISSIONS — hitting Save just wrote the old values out
     again, and the public pricing table kept rendering them. This puts the
     defaults back into the boxes; Save then makes them live. */
  function resetPlanPermissionsToDefaults() {
    const ok = window.confirm(
      "Reset Starter, Pro and Enterprise to the recommended permission ladder?\n\n" +
      "This only changes the checkboxes — nothing is saved until you press " +
      "\"Save Configuration\". Your Custom plan list is left alone."
    );
    if (!ok) return;
    setPlanPermissions(prev => ({
      ...prev,
      STARTER:    [...PLAN_DEFAULT_PERMISSIONS.STARTER],
      PRO:        [...PLAN_DEFAULT_PERMISSIONS.PRO],
      ENTERPRISE: [...PLAN_DEFAULT_PERMISSIONS.ENTERPRISE],
    }));
    toast.success("Defaults loaded — press Save Configuration to apply");
  }

  /* ─── Toggle plan permission ─── */
  function togglePlanPermission(planCode: PlanCode, perm: string) {
    setPlanPermissions(prev => {
      const list = new Set(prev[planCode] || []);
      if (list.has(perm)) list.delete(perm); else list.add(perm);
      return { ...prev, [planCode]: Array.from(list) };
    });
  }

  function toggleDashboardFeature(planCode: PlanCode, featureId: string) {
    setDashboardFeatureFlags(prev => {
      const list = new Set(prev[planCode] || []);
      if (list.has(featureId)) list.delete(featureId); else list.add(featureId);
      return { ...prev, [planCode]: Array.from(list) };
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
    color: "white", fontSize: 14, outline: "none",
  };

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "pricing",          label: "Pricing (USD)",      icon: "💰" },
    { key: "permissions",      label: "Permissions",        icon: "🔐" },
    { key: "pages",            label: "Pages",              icon: "📄" },
    { key: "pkr-pricing",      label: "PKR Pricing",        icon: "🇵🇰" },
    { key: "pkr-permissions",  label: "PKR Permissions",    icon: "🔒" },
    { key: "pkr-pages",        label: "PKR Pages",          icon: "📑" },
    { key: "custom-plans",     label: "Custom Requests",    icon: "📋" },
    { key: "modules",          label: "Module Pricing",     icon: "🧩" },
    { key: "addon",            label: "Automation Add-on",  icon: "⚡" },
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
        {/* Pages & Modules carries its own Save — this one writes plan-config
            and would look like it saved the grid without doing so. */}
        {(tab === "pricing" || tab === "permissions") && (
          <button onClick={saveConfig} disabled={savingConfig || loadingConfig}
            style={{ padding: "10px 22px", borderRadius: 12, background: savingConfig ? "#4338ca" : "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: savingConfig ? .7 : 1 }}>
            {savingConfig ? "Saving…" : "Save Changes"}
          </button>
        )}
        {(tab === "pkr-pricing" || tab === "pkr-permissions") && (
          <button onClick={savePkrConfig} disabled={savingPkrConfig || loadingPkrConfig}
            style={{ padding: "10px 22px", borderRadius: 12, background: savingPkrConfig ? "#065f46" : "linear-gradient(135deg,#059669,#047857)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: savingPkrConfig ? .7 : 1 }}>
            {savingPkrConfig ? "Saving…" : "Save PKR Config"}
          </button>
        )}
        {tab === "modules" && (
          <button onClick={() => saveAllModulePrices()} disabled={savingMod === "all"}
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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 28, padding: 5, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14 }}>
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
      {loadingPkrConfig && (tab === "pkr-pricing" || tab === "pkr-permissions") && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#475569" }}>Loading PKR configuration…</div>
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
              <strong>50% intro offer</strong> is applied via the Lemon Squeezy coupon set in the <code style={{ background: "rgba(255,255,255,.06)", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>LEMONSQUEEZY_LAUNCH_DISCOUNT</code> env variable — not stored here.
            </div>
          </div>
        </Card>
      )}

      {/* ══ TAB: PERMISSIONS ══ */}
      {tab === "permissions" && !loadingConfig && (
        <Card title="Plan Permissions" subtitle="What the public pricing table shows outside Pakistan">
          <ScopeNote
            title="Pricing table — rest of the world"
            body="Drives the comparison table on /pricing for every visitor outside Pakistan. Untick a permission on all three plans and its row disappears from the table entirely. Pakistan visitors read PKR Permissions instead."
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 18, padding: "12px 16px", borderRadius: 12, background: "rgba(79,70,229,.08)", border: "1px solid rgba(79,70,229,.22)" }}>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, maxWidth: 620 }}>
              These lists are also the plan gate the dashboard enforces, so a feature you untick here is
              both hidden on <span style={{ fontFamily: "monospace", fontSize: 11, color: "#c7d2fe" }}>/pricing</span>{" "}
              and locked in the app. Changes are live within a minute of saving — no deploy needed.
            </div>
            <button
              onClick={resetPlanPermissionsToDefaults}
              style={{ flexShrink: 0, padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,.28)", background: "rgba(255,255,255,.04)", color: "#cbd5e1", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              ↺ Reset to recommended
            </button>
          </div>
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

      {/* ══ TAB: PAGES & MODULES ══
          Was a plan-wide checklist of all 289 pages with no business-type axis,
          duplicating the separate /admin/permissions screen. Both are now this
          one grid: pick a business type, assign each page to a plan. */}
      {tab === "pages" && (
        <>
          <ScopeNote
            title="Dashboard pages — rest of the world"
            body="Whatever is ticked for a plan here is what that plan's customers see in their dashboard sidebar. This screen does not touch the public pricing table, and it does not apply to Pakistan-based companies — those are on PKR Pages."
          />
          <BusinessPlanMatrix key="pages-world" embedded scope="WORLD" />
        </>
      )}

      {/* ══ TAB: PKR PAGES & MODULES ══
          Same grid, its own saved config, applied only to Pakistan companies. */}
      {tab === "pkr-pages" && (
        <>
          <ScopeNote
            title="Dashboard pages — Pakistan customers only"
            body="Applies to companies whose country is Pakistan or whose base currency is PKR. Saved separately from the world grid, so changing one never moves pages for the other audience."
            pk
          />
          <BusinessPlanMatrix key="pages-pkr" embedded scope="PKR" />
        </>
      )}

      {/* ══ TAB: PKR PRICING ══ */}
      {tab === "pkr-pricing" && !loadingPkrConfig && (
        <>
          {/* Info banner */}
          <div style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(5,150,105,.08)", border: "1px solid rgba(5,150,105,.25)", marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 28 }}>🇵🇰</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#34d399", marginBottom: 3 }}>Pakistani Rupee (PKR) Pricing</div>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                These prices are shown directly to Pakistani users (IP-detected). They override FX-converted USD rates.
                Prices are in <strong style={{ color: "#94a3b8" }}>PKR (₨)</strong> — enter actual PKR amounts.
              </div>
            </div>
          </div>

          <Card title="PKR Plan Pricing" subtitle="Monthly and annual per-month prices in Pakistani Rupees">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
              {(["starter", "pro", "enterprise"] as const).map(k => {
                const COLORS: Record<string, string> = { starter: "#38bdf8", pro: "#818cf8", enterprise: "#c4b5fd" };
                const color = COLORS[k];
                return (
                  <div key={k} style={{ borderRadius: 16, border: `1px solid ${color}30`, background: `${color}08`, padding: "22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                        {k === "starter" ? "🌱" : k === "pro" ? "🚀" : "🏆"}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "white", textTransform: "capitalize" }}>{k}</div>
                        <div style={{ fontSize: 11, color: "#475569" }}>per company / month (PKR)</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>MONTHLY PRICE (₨)</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 12, fontWeight: 700 }}>₨</span>
                        <input type="number" min={0} value={(pkrPricing as any)[k].monthly}
                          onChange={e => setPkrPricing(p => ({ ...p, [k]: { ...p[k], monthly: Number(e.target.value) } }))}
                          style={{ width: "100%", padding: "10px 12px 10px 28px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "white", fontSize: 14, outline: "none" }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>ANNUAL PRICE / MO (₨)</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 12, fontWeight: 700 }}>₨</span>
                        <input type="number" min={0} value={(pkrPricing as any)[k].yearly}
                          onChange={e => setPkrPricing(p => ({ ...p, [k]: { ...p[k], yearly: Number(e.target.value) } }))}
                          style={{ width: "100%", padding: "10px 12px 10px 28px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "white", fontSize: 14, outline: "none" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
                        Annual total: ₨{(pkrPricing as any)[k].yearly * 12}/yr &nbsp;·&nbsp;
                        <span style={{ color: "#22c55e" }}>
                          {(pkrPricing as any)[k].monthly > 0 ? `${Math.round((1 - (pkrPricing as any)[k].yearly / (pkrPricing as any)[k].monthly) * 100)}% saving` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(5,150,105,.06)", border: "1px solid rgba(5,150,105,.15)" }}>
              <div style={{ fontSize: 13, color: "#34d399", fontWeight: 700, marginBottom: 6 }}>Preview</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                {(["starter", "pro", "enterprise"] as const).map(k => (
                  <div key={k} style={{ fontSize: 12, color: "#94a3b8" }}>
                    <strong style={{ color: "white", textTransform: "capitalize" }}>{k}</strong>
                    <br />Monthly: ₨{(pkrPricing as any)[k].monthly.toLocaleString()}
                    <br />Yearly: ₨{(pkrPricing as any)[k].yearly.toLocaleString()}/mo (₨{((pkrPricing as any)[k].yearly * 12).toLocaleString()}/yr)
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Custom-plan modules, in rupees — the same monthly + annual pair the
              three plans above carry. Their USD rates sit on Module Pricing. */}
          <div style={{ marginTop: 24 }}>
            <Card title="PKR Module Pricing" subtitle="Custom plan — per-module monthly and annual per-month prices in Pakistani Rupees">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
                {MODULES.map(m => (
                  <div key={m.id} style={{ borderRadius: 16, border: "1px solid rgba(52,211,153,.22)", background: "rgba(5,150,105,.06)", padding: "22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(52,211,153,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{m.icon}</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: "#475569" }}>per company / month (PKR)</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>MONTHLY PRICE (₨)</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 12, fontWeight: 700 }}>₨</span>
                        <input type="number" min={0} step={100} value={modulePricesPkr[m.id] || 0}
                          onChange={e => setModulePricesPkr(prev => ({ ...prev, [m.id]: Number(e.target.value) }))}
                          style={{ ...inputStyle, paddingLeft: 30 }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>ANNUAL PRICE / MO (₨)</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 12, fontWeight: 700 }}>₨</span>
                        <input type="number" min={0} step={100} value={modulePricesPkrYearly[m.id] || 0}
                          onChange={e => setModulePricesPkrYearly(prev => ({ ...prev, [m.id]: Number(e.target.value) }))}
                          style={{ ...inputStyle, paddingLeft: 30 }} />
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
                        Billed <span style={{ color: "#34d399", fontWeight: 700 }}>₨{((modulePricesPkrYearly[m.id] || 0) * 12).toLocaleString()}</span>/yr
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom must stay cheaper than the plan that already contains it. */}
              {(() => {
                const totPkr = MODULES.reduce((s, m) => s + (modulePricesPkr[m.id] || 0), 0);
                const entPkr = Number((pkrPricing as any)?.enterprise?.monthly) || 0;
                const ok = totPkr > 0 && entPkr > 0 && totPkr < entPkr;
                return (
                  <div style={{ marginTop: 22, padding: "14px 18px", borderRadius: 14, background: ok ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)", border: `1px solid ${ok ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.3)"}`, fontSize: 12.5, color: ok ? "#22c55e" : "#f87171", fontWeight: 700 }}>
                    {ok ? "✓" : "⚠"} All six modules ₨{totPkr.toLocaleString()}/mo vs Enterprise ₨{entPkr.toLocaleString()}/mo
                    {!ok && " — Custom costs more than the plan that already includes it."}
                  </div>
                );
              })()}
            </Card>
          </div>
        </>
      )}

      {/* ══ TAB: PKR PERMISSIONS ══ */}
      {tab === "pkr-permissions" && !loadingPkrConfig && (
        <>
          <div style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(5,150,105,.08)", border: "1px solid rgba(5,150,105,.25)", marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 28 }}>🔒</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#34d399", marginBottom: 3 }}>PKR User Permissions</div>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                Configure which features are available to Pakistani (PKR) users. Since PKR prices are lower,
                you can restrict certain premium features here.
              </div>
            </div>
          </div>

          <Card title="PKR Plan Permissions" subtitle="What the public pricing table shows inside Pakistan">
            <ScopeNote
              pk
              title="Pricing table — Pakistan visitors only"
              body="Drives the comparison table on /pricing for visitors resolved to Pakistan, and the plan gate for companies with country Pakistan or base currency PKR. Untick a permission on all three plans and its row disappears from the table. Everyone else reads the world Permissions tab."
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {(["STARTER", "PRO", "ENTERPRISE", "CUSTOM"] as const).map(pc => {
                const count = (pkrPlanPermissions[pc] || []).length;
                const total = PERMISSION_CATEGORIES.reduce((sum, c) => sum + c.permissions.length, 0);
                return (
                  <div key={pc} style={{ borderRadius: 16, border: "1px solid rgba(5,150,105,.2)", background: "rgba(5,150,105,.04)", overflow: "hidden" }}>
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(5,150,105,.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "white", textTransform: "capitalize" }}>PKR · {pc.toLowerCase()}</div>
                      <span style={{ fontSize: 11, color: "#475569" }}>{count}/{total}</span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,.06)" }}>
                      <div style={{ height: "100%", width: `${total ? (count / total) * 100 : 0}%`, background: "linear-gradient(90deg,#059669,#34d399)", transition: "width .3s" }} />
                    </div>
                    <div style={{ maxHeight: 320, overflowY: "auto", padding: "12px 16px" }}>
                      {PERMISSION_CATEGORIES.map(cat => (
                        <div key={`pkr-${pc}-${cat.key}`} style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: "#334155", letterSpacing: ".08em", marginBottom: 4, textTransform: "uppercase" }}>{cat.label}</div>
                          {cat.permissions.map(perm => (
                            <label key={`pkr-${pc}-${perm}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: pkrPlanPermissions[pc]?.includes(perm) ? "#94a3b8" : "#334155", padding: "3px 0", cursor: "pointer" }}>
                              <input type="checkbox" className="perm-check"
                                checked={!!pkrPlanPermissions[pc]?.includes(perm)}
                                onChange={() => togglePkrPlanPermission(pc, perm)} />
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

          {/* Pakistan page access has its own grid again, on its own tab. This
              card only points at it — the two used to be one shared config. */}
          <Card title="PKR Dashboard Pages" subtitle="Now a tab of its own">
            <div style={{ padding: "18px 20px", borderRadius: 14, background: "rgba(5,150,105,.07)", border: "1px solid rgba(5,150,105,.25)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.6, maxWidth: 620 }}>
                Which dashboard pages a Pakistan company gets is set per business type in{" "}
                <strong style={{ color: "#6ee7b7" }}>PKR Pages</strong>. It is saved separately
                from the world grid, so the two audiences can differ.
              </div>
              <button
                onClick={() => setTab("pkr-pages")}
                style={{ padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg,#059669,#047857)", border: "none", color: "white", fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Open PKR Pages →
              </button>
            </div>
          </Card>
        </>
      )}

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
              {["Overdue Invoice Reminders", "Low Stock Reorder Alerts", "Scheduled Financial Reports", "Zapier / Make Webhooks", "Google Sheets Sync"].map(f => (
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

                    {/* Same two fields the three plans carry. */}
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>MONTHLY PRICE (USD)</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 14 }}>$</span>
                        <input type="number" min={0} value={modulePrices[m.id] || 0}
                          onChange={e => setModulePrices(prev => ({ ...prev, [m.id]: Number(e.target.value) }))}
                          style={{ ...inputStyle, paddingLeft: 28 }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>ANNUAL PRICE / MO (USD)</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 14 }}>$</span>
                        <input type="number" min={0} value={modulePricesYearly[m.id] || 0}
                          onChange={e => setModulePricesYearly(prev => ({ ...prev, [m.id]: Number(e.target.value) }))}
                          style={{ ...inputStyle, paddingLeft: 28 }} />
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
                        Billed <span style={{ color: "#22c55e", fontWeight: 700 }}>${((modulePricesYearly[m.id] || 0) * 12).toFixed(0)}</span>/yr
                        {(modulePrices[m.id] || 0) > 0 && (modulePricesYearly[m.id] || 0) > 0 && (
                          <> · saves {Math.max(0, Math.round((1 - (modulePricesYearly[m.id] || 0) / (modulePrices[m.id] || 1)) * 100))}%</>
                        )}
                      </div>
                      <div style={{ fontSize: 10.5, color: "#334155", marginTop: 4 }}>
                        🇵🇰 PKR rates for this module are on the <strong style={{ color: "#34d399" }}>PKR Pricing</strong> tab.
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total, and the sanity check that matters:
                  Custom must never cost more than the plan that contains it,
                  or nobody has a reason to build one. */}
              {(() => {
                const totUsd = MODULES.reduce((s, m) => s + (modulePrices[m.id] || 0), 0);
                const totPkr = MODULES.reduce((s, m) => s + (modulePricesPkr[m.id] || 0), 0);
                const entUsd = Number(pricing?.enterprise?.monthly) || 249;
                const entPkr = Number(pkrPricing?.enterprise?.monthly) || 19999;
                const usdOk = totUsd > 0 && totUsd < entUsd;
                const pkrOk = totPkr > 0 && totPkr < entPkr;
                return (
                  <div style={{ marginTop: 22, padding: "16px 20px", borderRadius: 14, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>If all modules selected</div>
                        <div style={{ fontSize: 12, color: "#475569" }}>Max custom plan value</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#818cf8" }}>
                          ${totUsd}<span style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>/mo</span>
                          <span style={{ color: "#334155", fontWeight: 400, margin: "0 8px" }}>·</span>
                          <span style={{ color: "#34d399" }}>Rs {totPkr.toLocaleString()}</span><span style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>/mo</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#22c55e" }}>
                          ${(totUsd * 12).toFixed(0)}/yr · Rs {(totPkr * 12).toLocaleString()}/yr
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.07)", display: "flex", gap: 18, flexWrap: "wrap", fontSize: 11.5 }}>
                      <span style={{ color: usdOk ? "#22c55e" : "#f87171", fontWeight: 700 }}>
                        {usdOk ? "✓" : "⚠"} World: ${totUsd} vs Enterprise ${entUsd}
                      </span>
                      <span style={{ color: pkrOk ? "#22c55e" : "#f87171", fontWeight: 700 }}>
                        {pkrOk ? "✓" : "⚠"} Pakistan: Rs {totPkr.toLocaleString()} vs Enterprise Rs {entPkr.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
