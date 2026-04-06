"use client";`r`nimport { confirmToast, alertToast } from "@/lib/toast-feedback";`r`nimport { useEffect, useState } from "react";
import { getCurrentUser, setCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

type Row = {
  id: string;
  name: string;
  country?: string | null;
  plan?: string | null;
  subscriptionStatus?: string | null;
  stripeCustomerId?: string | null;
  currentPeriodEnd?: string | null;
  usersCount: number;
  branches: number;
  lastLogin?: string | null;
  isActive?: boolean;
  ownerEmail?: string | null;
  ownerName?: string | null;
  aiScore?: number;
  aiHealth?: string;
  businessType?: string | null;
};

const BUSINESS_TYPES = [
  "trading","wholesale","distribution","restaurant","retail","manufacturing",
  "hospital","school","hotel","construction","pharmacy","transport",
  "real_estate","import_company","service","ngo","it","law_firm",
  "salon","gym","ecommerce","agriculture",
];

const BIZ_LABELS: Record<string, string> = {
  trading:"Trading", wholesale:"Wholesale", distribution:"Distribution",
  restaurant:"Restaurant", retail:"Retail", manufacturing:"Manufacturing",
  hospital:"Hospital", school:"School", hotel:"Hotel", construction:"Construction",
  pharmacy:"Pharmacy", transport:"Transport", real_estate:"Real Estate",
  import_company:"Import/Export", service:"Service", ngo:"NGO / Non-profit",
  it:"IT / Software", law_firm:"Law Firm", salon:"Salon / Beauty",
  gym:"Gym / Fitness", ecommerce:"E-commerce", agriculture:"Agriculture",
};

const PLANS    = ["STARTER", "PRO", "ENTERPRISE", "CUSTOM"];
const STATUSES = ["ACTIVE", "TRIALING", "PAST_DUE", "INACTIVE", "CANCELED"];

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  STARTER:    { bg: "#38bdf820", text: "#38bdf8" },
  PRO:        { bg: "#818cf820", text: "#818cf8" },
  ENTERPRISE: { bg: "#c4b5fd20", text: "#c4b5fd" },
  CUSTOM:     { bg: "#fbbf2420", text: "#fbbf24" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE:    { bg: "#22c55e20", text: "#22c55e" },
  TRIALING:  { bg: "#06b6d420", text: "#06b6d4" },
  PAST_DUE:  { bg: "#f9731620", text: "#f97316" },
  INACTIVE:  { bg: "#64748b20", text: "#94a3b8" },
  CANCELED:  { bg: "#ef444420", text: "#f87171" },
};

function PlanBadge({ plan }: { plan?: string | null }) {
  const p = (plan || "STARTER").toUpperCase();
  const c = PLAN_COLORS[p] ?? { bg: "#ffffff10", text: "#94a3b8" };
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, background: c.bg, color: c.text, fontSize: 11, fontWeight: 800, letterSpacing: ".04em" }}>
      {p}
    </span>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status || "ACTIVE").toUpperCase();
  const c = STATUS_COLORS[s] ?? { bg: "#ffffff10", text: "#94a3b8" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: c.bg, color: c.text, fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.text }} />
      {s.replace("_", " ")}
    </span>
  );
}

function AIScoreBadge({ score, health }: { score?: number; health?: string }) {
  if (score === undefined) return <span style={{ color: "#334155", fontSize: 12 }}>â€”</span>;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = health || (score >= 75 ? "Healthy" : score >= 50 ? "At Risk" : "Critical");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3" />
        <circle cx="14" cy="14" r="11" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${(score / 100) * 69.1} 69.1`}
          strokeLinecap="round" transform="rotate(-90 14 14)" />
      </svg>
      <span style={{ fontSize: 12, fontWeight: 800, color }}>{score}</span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,.35)" }}>{label}</span>
    </span>
  );
}

/* â”€â”€ Change Plan Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ChangePlanModal({ company, onClose, onSaved }: {
  company: Row;
  onClose: () => void;
  onSaved: (id: string, plan: string, status: string) => void;
}) {
  const [plan,   setPlan]   = useState(company.plan?.toUpperCase() || "STARTER");
  const [status, setStatus] = useState(company.subscriptionStatus?.toUpperCase() || "ACTIVE");
  const [note,   setNote]   = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/companies/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ companyId: company.id, plan, subscriptionStatus: status, note }),
      });
      const j = await r.json();
      if (r.ok) {
        toast.success(`Plan updated: ${company.name} â†’ ${plan}`);
        onSaved(company.id, plan, status);
        onClose();
      } else {
        toast.error(j?.error || "Failed to update plan");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
    color: "white", fontSize: 13, outline: "none", cursor: "pointer",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 440, background: "#0f172a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,.6)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "white" }}>Change Plan</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>{company.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14 }}>âœ•</button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>CURRENT PLAN</div><PlanBadge plan={company.plan} /></div>
            <div><div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>CURRENT STATUS</div><StatusBadge status={company.subscriptionStatus} /></div>
            <div><div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>AI SCORE</div><AIScoreBadge score={company.aiScore} health={company.aiHealth} /></div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>NEW PLAN</label>
            <select value={plan} onChange={e => setPlan(e.target.value)} style={selectStyle}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>NEW STATUS</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>INTERNAL NOTE (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="e.g. Sales override, trial extension..."
              style={{ ...selectStyle, resize: "none", height: "auto" }} />
          </div>
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.2)", fontSize: 12, color: "#fbbf24", lineHeight: 1.6 }}>
            âš ï¸ This changes the plan immediately in the database. Stripe billing is not affected â€” handle billing separately.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 12, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ flex: 2, padding: "11px", borderRadius: 12, background: saving ? "#4338ca" : "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}>
              {saving ? "Saving..." : "Confirm Change"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€ Detail Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function DetailRow({ company, onImpersonate }: { company: Row; onImpersonate: (id: string) => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(val: string, key: string) {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const items = [
    { label: "Owner Name",         value: company.ownerName    || "â€”", mono: false, key: "name"   },
    { label: "Owner Email",        value: company.ownerEmail   || "â€”", mono: true,  key: "email"  },
    { label: "Business Type",      value: BIZ_LABELS[company.businessType || ""] || company.businessType || "â€”", mono: false, key: "biztype" },
    { label: "Stripe Customer ID", value: company.stripeCustomerId || "â€”", mono: true, key: "stripe" },
    { label: "Renewal Date",       value: company.currentPeriodEnd ? new Date(company.currentPeriodEnd).toLocaleDateString(undefined, { day:"numeric", month:"short", year:"numeric" }) : "â€”", mono: false, key: "renewal" },
    { label: "Last Login",         value: company.lastLogin ? new Date(company.lastLogin).toLocaleString(undefined, { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) : "Never", mono: false, key: "login" },
    { label: "Country",            value: company.country      || "â€”", mono: false, key: "country" },
    { label: "Account Status",     value: company.isActive === false ? "Suspended" : "Active", mono: false, key: "actstatus" },
  ];

  return (
    <tr>
      <td colSpan={10} style={{ background: "rgba(99,102,241,.04)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Fields grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 14 }}>
            {items.map(item => (
              <div key={item.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: ".06em" }}>{item.label.toUpperCase()}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, color: item.mono ? "#38bdf8" : "#cbd5e1", fontFamily: item.mono ? "monospace" : "inherit", wordBreak: "break-all" }}>
                    {item.value}
                  </span>
                  {item.value !== "â€”" && (
                    <button onClick={() => copy(item.value, item.key)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: copied === item.key ? "#22c55e" : "#475569", fontSize: 11, padding: "2px 4px", flexShrink: 0 }}>
                      {copied === item.key ? "âœ“" : "âŽ˜"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* AI Score panel */}
          {company.aiScore !== undefined && (
            <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.18)", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <AIScoreBadge score={company.aiScore} health={company.aiHealth} />
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", lineHeight: 1.6 }}>
                AI health score is based on subscription status, user engagement, plan tier, and login activity over the last 30 days.
              </div>
            </div>
          )}

          {/* Impersonate */}
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(245,158,11,.05)", border: "1px solid rgba(245,158,11,.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b", marginBottom: 4 }}>ðŸ”‘ Login as Company User</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.6 }}>
                Open the dashboard as the owner of this company. This action is logged in the audit trail.
              </div>
            </div>
            <button
              onClick={() => onImpersonate(company.id)}
              style={{ padding: "8px 18px", borderRadius: 10, background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
              Open as Owner â†’
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN PAGE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function AdminCompaniesPage() {
  const [rows,         setRows]         = useState<Row[] | null>(null);
  const [q,            setQ]            = useState("");
  const [loading,      setLoading]      = useState(true);
  const [busy,         setBusy]         = useState<string | null>(null);
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [changing,     setChanging]     = useState<Row | null>(null);
  const [filterPlan,    setFilterPlan]    = useState("ALL");
  const [filterStatus,  setFilterStatus]  = useState("ALL");
  const [filterHealth,  setFilterHealth]  = useState("ALL");
  const [filterBizType, setFilterBizType] = useState("ALL");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/companies/all", { cache: "no-store", credentials: "include" });
      if (r.ok) { const j = await r.json(); setRows(j.rows || []); }
      else setRows([]);
    } catch { setRows([]); }
    setLoading(false);
  }

  async function deleteCompany(id: string) {
    if (!await confirmToast("Permanently delete this company and ALL its data? This cannot be undone.")) return;
    setBusy(id);
    try {
      const r = await fetch("/api/admin/companies/actions", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ companyId: id, action: "DELETE" }),
      });
      if (r.ok) { setRows(prev => prev ? prev.filter(c => c.id !== id) : []); toast.success("Company deleted."); }
      else { const j = await r.json(); toast.error(j.error || "Delete failed"); }
    } catch { toast.error("Something went wrong"); }
    setBusy(null);
  }

  async function toggleStatus(company: Row) {
    setBusy(company.id);
    try {
      const r = await fetch("/api/admin/companies/actions", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ companyId: company.id, action: "TOGGLE_STATUS" }),
      });
      if (r.ok) {
        setRows(prev => prev?.map(c => c.id === company.id ? { ...c, isActive: !c.isActive } : c) || null);
        toast.success(`Company ${company.isActive === false ? "activated" : "suspended"}`);
      } else {
        const j = await r.json(); toast.error(j.error || "Failed");
      }
    } catch { toast.error("Something went wrong"); }
    setBusy(null);
  }

  async function impersonate(companyId: string) {
    setBusy(companyId);
    try {
      const r = await fetch("/api/admin/companies/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ companyId }),
      });
      const j = await r.json();
      if (r.ok && j.user) {
        setCurrentUser(j.user);
        toast.success(`Logged in as ${j.user.name || j.user.email} â€” opening dashboard`);
        setTimeout(() => { window.open("/dashboard", "_blank"); }, 500);
      } else {
        toast.error(j.error || "Impersonation failed");
      }
    } catch {
      toast.error("Something went wrong");
    }
    setBusy(null);
  }

  const filtered = (rows || []).filter(c => {
    const text = q.toLowerCase();
    const bizLabel = BIZ_LABELS[c.businessType || ""] || c.businessType || "";
    const matchQ = !text ||
      c.name.toLowerCase().includes(text) ||
      (c.country || "").toLowerCase().includes(text) ||
      (c.stripeCustomerId || "").toLowerCase().includes(text) ||
      (c.ownerEmail || "").toLowerCase().includes(text) ||
      (c.ownerName || "").toLowerCase().includes(text) ||
      (c.businessType || "").toLowerCase().includes(text) ||
      bizLabel.toLowerCase().includes(text);
    const matchPlan    = filterPlan    === "ALL" || (c.plan || "STARTER").toUpperCase() === filterPlan;
    const matchStatus  = filterStatus  === "ALL" || (c.subscriptionStatus || "ACTIVE").toUpperCase() === filterStatus;
    const matchHealth  = filterHealth  === "ALL" || (c.aiHealth || "") === filterHealth;
    const matchBizType = filterBizType === "ALL" || (c.businessType || "trading") === filterBizType;
    return matchQ && matchPlan && matchStatus && matchHealth && matchBizType;
  });

  const avgScore = rows && rows.length > 0
    ? Math.round(rows.reduce((s, c) => s + (c.aiScore || 0), 0) / rows.length)
    : 0;

  const stats = {
    total:      (rows || []).length,
    active:     (rows || []).filter(c => (c.subscriptionStatus || "").toUpperCase() === "ACTIVE").length,
    trialing:   (rows || []).filter(c => (c.subscriptionStatus || "").toUpperCase() === "TRIALING").length,
    pastDue:    (rows || []).filter(c => (c.subscriptionStatus || "").toUpperCase() === "PAST_DUE").length,
    enterprise: (rows || []).filter(c => (c.plan || "").toUpperCase() === "ENTERPRISE").length,
    atRisk:     (rows || []).filter(c => (c.aiHealth || "") === "At Risk" || (c.aiHealth || "") === "Critical").length,
  };

  return (
    <div style={{ padding: "28px 24px", minHeight: "100vh", background: "#060918" }}>
      <style>{`
        select option { background: #0f172a; color: white; }
        .hover-row:hover { background: rgba(255,255,255,.03) !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "white" }}>Companies</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>Manage subscriptions, plans, AI health scores, and company access</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/admin/audit-trail" style={{ padding: "9px 16px", borderRadius: 10, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.2)", color: "#f59e0b", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            ðŸ“‹ Audit Trail
          </a>
          <button onClick={load} style={{ padding: "9px 18px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            â†» Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total",       value: stats.total,      color: "#818cf8" },
          { label: "Active",      value: stats.active,     color: "#22c55e" },
          { label: "Trialing",    value: stats.trialing,   color: "#06b6d4" },
          { label: "Past Due",    value: stats.pastDue,    color: "#f97316" },
          { label: "Enterprise",  value: stats.enterprise, color: "#c4b5fd" },
          { label: "AI: At Risk", value: stats.atRisk,     color: "#ef4444" },
          { label: "Avg AI Score",value: loading ? "â€”" : avgScore, color: avgScore >= 75 ? "#10b981" : avgScore >= 50 ? "#f59e0b" : "#ef4444" },
        ].map(s => (
          <div key={s.label} style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{loading ? "â€”" : s.value}</div>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ðŸ”  Search company, email, country, Stripe ID..."
          style={{ flex: 1, minWidth: 220, padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "white", fontSize: 13, outline: "none" }} />
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
          style={{ padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 13, outline: "none", cursor: "pointer" }}>
          <option value="ALL">All Plans</option>
          {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 13, outline: "none", cursor: "pointer" }}>
          <option value="ALL">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
        </select>
        <select value={filterHealth} onChange={e => setFilterHealth(e.target.value)}
          style={{ padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 13, outline: "none", cursor: "pointer" }}>
          <option value="ALL">All AI Health</option>
          <option value="Healthy">Healthy</option>
          <option value="At Risk">At Risk</option>
          <option value="Critical">Critical</option>
        </select>
        <select value={filterBizType} onChange={e => setFilterBizType(e.target.value)}
          style={{ padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 13, outline: "none", cursor: "pointer" }}>
          <option value="ALL">All Business Types</option>
          {BUSINESS_TYPES.map(t => <option key={t} value={t}>{BIZ_LABELS[t] || t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,.04)" }}>
              {["", "Company", "Business Type", "Country", "Plan", "Status", "AI Score", "Users", "Renewal", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: h === "Actions" ? "right" : "left", fontSize: 10, fontWeight: 800, color: "#475569", letterSpacing: ".07em", borderBottom: "1px solid rgba(255,255,255,.07)" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ padding: "60px 0", textAlign: "center", color: "#475569", fontSize: 14 }}>Loading companiesâ€¦</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: "60px 0", textAlign: "center", color: "#475569", fontSize: 14 }}>No companies found</td></tr>
            ) : (
              filtered.map(c => (
                <>
                  <tr key={c.id} className="hover-row" style={{ borderBottom: "1px solid rgba(255,255,255,.05)", transition: "background .15s" }}>
                    <td style={{ padding: "14px 8px 14px 16px", width: 32 }}>
                      <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 14, width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s", transform: expanded === c.id ? "rotate(90deg)" : "none" }}>
                        â–¶
                      </button>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>{c.name}</div>
                      {c.ownerEmail && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{c.ownerEmail}</div>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(56,189,248,.1)", border: "1px solid rgba(56,189,248,.2)", color: "#7dd3fc", fontSize: 11, fontWeight: 700 }}>
                        {BIZ_LABELS[c.businessType || ""] || c.businessType || "Trading"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8" }}>{c.country || "â€”"}</td>
                    <td style={{ padding: "14px 16px" }}><PlanBadge plan={c.plan} /></td>
                    <td style={{ padding: "14px 16px" }}><StatusBadge status={c.subscriptionStatus} /></td>
                    <td style={{ padding: "14px 16px" }}><AIScoreBadge score={c.aiScore} health={c.aiHealth} /></td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8", textAlign: "center" }}>{c.usersCount}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: "#475569" }}>
                      {c.currentPeriodEnd ? new Date(c.currentPeriodEnd).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "â€”"}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => setChanging(c)} disabled={busy === c.id}
                          style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)", color: "#818cf8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          âœ¦ Plan
                        </button>
                        <button onClick={() => toggleStatus(c)} disabled={busy === c.id}
                          style={{ padding: "5px 12px", borderRadius: 8, background: c.isActive === false ? "rgba(34,197,94,.12)" : "rgba(245,158,11,.12)", border: `1px solid ${c.isActive === false ? "rgba(34,197,94,.25)" : "rgba(245,158,11,.25)"}`, color: c.isActive === false ? "#22c55e" : "#f59e0b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          {busy === c.id ? "â€¦" : c.isActive === false ? "Activate" : "Suspend"}
                        </button>
                        <button onClick={() => deleteCompany(c.id)} disabled={busy === c.id}
                          style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          {busy === c.id ? "â€¦" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === c.id && (
                    <DetailRow key={`detail-${c.id}`} company={c} onImpersonate={impersonate} />
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: "#334155" }}>
        Showing {filtered.length} of {(rows || []).length} companies Â· AI scores refresh on page load
      </div>

      {changing && (
        <ChangePlanModal
          company={changing}
          onClose={() => setChanging(null)}
          onSaved={(id, plan, status) => {
            setRows(prev => prev?.map(c => c.id === id ? { ...c, plan, subscriptionStatus: status } : c) || null);
          }}
        />
      )}
    </div>
  );
}
