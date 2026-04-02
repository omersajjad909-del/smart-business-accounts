"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

type Company = {
  id: string;
  name: string;
  country?: string | null;
  plan?: string | null;
  subscriptionStatus?: string | null;
  stripeCustomerId?: string | null;
  currentPeriodEnd?: string | null;
  usersCount: number;
  lastLogin?: string | null;
};

type OverrideLog = {
  id: string;
  createdAt: string;
  details: string;
};

const PLAN_COLORS: Record<string, string> = {
  STARTER: "#38bdf8", PRO: "#818cf8", ENTERPRISE: "#c4b5fd", CUSTOM: "#fbbf24",
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE:   { bg: "rgba(34,197,94,.12)",  text: "#22c55e" },
  TRIALING: { bg: "rgba(6,182,212,.12)",  text: "#06b6d4" },
  PAST_DUE: { bg: "rgba(249,115,22,.12)", text: "#f97316" },
  INACTIVE: { bg: "rgba(100,116,139,.12)",text: "#94a3b8" },
  CANCELED: { bg: "rgba(239,68,68,.12)",  text: "#f87171" },
};

function PlanBadge({ plan }: { plan?: string | null }) {
  const p = (plan || "STARTER").toUpperCase();
  const color = PLAN_COLORS[p] ?? "#94a3b8";
  return <span style={{ padding: "3px 10px", borderRadius: 20, background: `${color}18`, color, fontSize: 11, fontWeight: 800 }}>{p}</span>;
}
function StatusBadge({ status }: { status?: string | null }) {
  const s = (status || "ACTIVE").toUpperCase();
  const c = STATUS_COLORS[s] ?? STATUS_COLORS.INACTIVE;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: c.bg, color: c.text, fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.text }} />{s.replace("_", " ")}
    </span>
  );
}

/* ── Override Modal ─────────────────────────────────── */
type ActionType = "EXTEND_TRIAL" | "GRANT_FREE_ACCESS" | "RESET_INTRO_OFFER" | "SET_STATUS" | "ADD_NOTE";

function OverrideModal({ company, onClose, onDone }: {
  company: Company;
  onClose: () => void;
  onDone: () => void;
}) {
  const [action, setAction] = useState<ActionType>("EXTEND_TRIAL");
  const [days, setDays]     = useState(30);
  const [plan, setPlan]     = useState(company.plan?.toUpperCase() || "PRO");
  const [status, setStatus] = useState("ACTIVE");
  const [note, setNote]     = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<OverrideLog[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingHist(true);
      const u = getCurrentUser();
      const h: Record<string, string> = {};
      if (u?.role) h["x-user-role"] = u.role;
      try {
        const r = await fetch(`/api/admin/billing/override?companyId=${company.id}`, { headers: h, credentials: "include" as any });
        if (r.ok) { const d = await r.json(); setHistory(d.logs || []); }
      } finally { setLoadingHist(false); }
    })();
  }, [company.id]);

  async function apply() {
    setSaving(true);
    try {
      const u = getCurrentUser();
      const h: Record<string, string> = { "Content-Type": "application/json" };
      if (u?.role) h["x-user-role"] = u.role;
      if (u?.id) h["x-user-id"] = u.id;

      let payload: any = {};
      if (action === "EXTEND_TRIAL")    payload = { days };
      if (action === "GRANT_FREE_ACCESS") payload = { days, plan };
      if (action === "SET_STATUS")      payload = { status };

      const r = await fetch("/api/admin/billing/override", {
        method: "POST", headers: h, credentials: "include" as any,
        body: JSON.stringify({ companyId: company.id, action, payload, note }),
      });
      const j = await r.json();
      if (r.ok) {
        toast.success(`Override applied: ${action}`);
        onDone();
        onClose();
      } else {
        toast.error(j?.error || "Override failed");
      }
    } catch { toast.error("Something went wrong"); }
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
    color: "white", fontSize: 13, outline: "none",
  };

  const ACTIONS: { key: ActionType; icon: string; label: string; desc: string; color: string }[] = [
    { key: "EXTEND_TRIAL",      icon: "⏱️", label: "Extend Trial",       desc: "Set status to TRIALING + extend end date",          color: "#06b6d4" },
    { key: "GRANT_FREE_ACCESS", icon: "🎁", label: "Grant Free Access",   desc: "Set ACTIVE + choose plan for N days, no charge",     color: "#22c55e" },
    { key: "RESET_INTRO_OFFER", icon: "🔄", label: "Reset 75% Offer",     desc: "Let them use the intro offer again",                  color: "#fbbf24" },
    { key: "SET_STATUS",        icon: "🔧", label: "Override Status",      desc: "Manually force any subscription status",             color: "#818cf8" },
    { key: "ADD_NOTE",          icon: "📝", label: "Add Internal Note",    desc: "Log a note to audit trail (no DB change)",           color: "#64748b" },
  ];

  const selected = ACTIONS.find(a => a.key === action)!;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 640, background: "#0a0f24", border: "1px solid rgba(255,255,255,.1)", borderRadius: 22, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,.7)", maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ padding: "20px 26px", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "sticky", top: 0, background: "#0a0f24", zIndex: 1 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "white" }}>Billing Override</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>{company.name}</span>
              <PlanBadge plan={company.plan} />
              <StatusBadge status={company.subscriptionStatus} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Action selector */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 10 }}>SELECT ACTION</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ACTIONS.map(a => (
                <button key={a.key} onClick={() => setAction(a.key)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, border: `1px solid ${action === a.key ? `${a.color}50` : "rgba(255,255,255,.06)"}`, background: action === a.key ? `${a.color}12` : "rgba(255,255,255,.025)", cursor: "pointer", textAlign: "left", transition: "all .15s" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: action === a.key ? a.color : "white" }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{a.desc}</div>
                  </div>
                  {action === a.key && <span style={{ fontSize: 16, color: a.color }}>●</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Action-specific fields */}
          {(action === "EXTEND_TRIAL" || action === "GRANT_FREE_ACCESS") && (
            <div style={{ padding: "18px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>DURATION (DAYS)</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[7, 14, 30, 60, 90].map(d => (
                    <button key={d} onClick={() => setDays(d)}
                      style={{ padding: "7px 16px", borderRadius: 10, border: `1px solid ${days === d ? "#818cf8" : "rgba(255,255,255,.1)"}`, background: days === d ? "rgba(99,102,241,.2)" : "transparent", color: days === d ? "#818cf8" : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {d}d
                    </button>
                  ))}
                  <input type="number" min={1} max={365} value={days} onChange={e => setDays(Number(e.target.value))}
                    style={{ ...inputStyle, width: 80, textAlign: "center" }} />
                </div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>
                  New end date: <span style={{ color: "#94a3b8" }}>{(() => { const d = new Date(); d.setDate(d.getDate() + days); return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }); })()}</span>
                </div>
              </div>

              {action === "GRANT_FREE_ACCESS" && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>GRANT PLAN</label>
                  <select value={plan} onChange={e => setPlan(e.target.value)} style={inputStyle}>
                    {["STARTER", "PRO", "ENTERPRISE", "CUSTOM"].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {action === "SET_STATUS" && (
            <div style={{ padding: "18px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>NEW STATUS</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                {["ACTIVE", "TRIALING", "PAST_DUE", "INACTIVE", "CANCELED"].map(s => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          )}

          {action === "RESET_INTRO_OFFER" && (
            <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.2)", fontSize: 13, color: "#fbbf24" }}>
              ⚠️ This will delete the BILLING_OFFER_CLAIM log for this company. They will be able to use the 75% intro offer again on their next checkout.
            </div>
          )}

          {/* Internal note */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>INTERNAL NOTE {action === "ADD_NOTE" ? "(required)" : "(optional)"}</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Reason for this override — logged in audit trail..."
              style={{ ...inputStyle, resize: "none", height: "auto", lineHeight: 1.6 }} />
          </div>

          {/* Apply button */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            <button onClick={apply} disabled={saving || (action === "ADD_NOTE" && !note.trim())}
              style={{ flex: 2, padding: "12px", borderRadius: 12, background: saving ? "#4338ca" : `linear-gradient(135deg,${selected.color},${selected.color}bb)`, border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? .7 : 1 }}>
              {saving ? "Applying…" : `Apply — ${selected.label}`}
            </button>
          </div>

          {/* Override history */}
          {history.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", letterSpacing: ".06em", marginBottom: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.06)" }}>OVERRIDE HISTORY</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map(log => {
                  let parsed: any = {};
                  try { parsed = JSON.parse(log.details); } catch {}
                  return (
                    <div key={log.id} style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8" }}>{parsed.action || "OVERRIDE"}</span>
                          {parsed.note && <span style={{ fontSize: 11, color: "#475569", marginLeft: 8 }}>— {parsed.note}</span>}
                        </div>
                        <div style={{ fontSize: 10, color: "#334155", flexShrink: 0 }}>
                          {new Date(log.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      {(parsed.payload || parsed.previousPlan) && (
                        <div style={{ fontSize: 10, color: "#334155", marginTop: 4, fontFamily: "monospace" }}>
                          {parsed.previousPlan && `${parsed.previousPlan} → `}
                          {parsed.payload ? JSON.stringify(parsed.payload) : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {loadingHist && <div style={{ fontSize: 12, color: "#334155", textAlign: "center" }}>Loading history…</div>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function AdminSubscriptionsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading]     = useState(true);
  const [q, setQ]                 = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [overriding, setOverriding]     = useState<Company | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const u = getCurrentUser();
      const h: Record<string, string> = {};
      if (u?.role) h["x-user-role"] = u.role;
      if (u?.id) h["x-user-id"] = u.id;
      const r = await fetch("/api/admin/companies/all", { cache: "no-store", headers: h, credentials: "include" as any });
      if (r.ok) { const j = await r.json(); setCompanies(j.rows || []); }
    } finally { setLoading(false); }
  }

  const filtered = companies.filter(c => {
    const matchQ = !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.stripeCustomerId || "").includes(q);
    const matchS = filterStatus === "ALL" || (c.subscriptionStatus || "ACTIVE").toUpperCase() === filterStatus;
    return matchQ && matchS;
  });

  // Attention-needed: past_due + trialing + inactive
  const needsAttention = companies.filter(c =>
    ["PAST_DUE", "INACTIVE", "CANCELED"].includes((c.subscriptionStatus || "").toUpperCase())
  );
  const expiringSoon = companies.filter(c => {
    if (!c.currentPeriodEnd) return false;
    const days = Math.ceil((new Date(c.currentPeriodEnd).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 7;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#060918", padding: "28px 24px 60px" }}>
      <style>{`select option { background: #0f172a; color: white; }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "white" }}>Subscription Management</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>Override billing, extend trials, grant access, reset offers</p>
        </div>
        <button onClick={load} style={{ padding: "9px 18px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>↻ Refresh</button>
      </div>

      {/* Alert panels */}
      {needsAttention.length > 0 && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 14, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ fontSize: 13, color: "#f87171" }}>
            <strong>{needsAttention.length} companies</strong> need attention (Past Due / Inactive / Canceled):&nbsp;
            {needsAttention.slice(0, 4).map(c => (
              <button key={c.id} onClick={() => setOverriding(c)}
                style={{ background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5", padding: "2px 8px", borderRadius: 8, fontSize: 11, cursor: "pointer", marginRight: 4 }}>
                {c.name}
              </button>
            ))}
            {needsAttention.length > 4 && <span style={{ color: "#64748b" }}>+{needsAttention.length - 4} more</span>}
          </div>
        </div>
      )}

      {expiringSoon.length > 0 && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 14, background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.2)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⏰</span>
          <div style={{ fontSize: 13, color: "#fb923c" }}>
            <strong>{expiringSoon.length} companies</strong> expire within 7 days:&nbsp;
            {expiringSoon.slice(0, 4).map(c => {
              const days = Math.ceil((new Date(c.currentPeriodEnd!).getTime() - Date.now()) / 86400000);
              return (
                <button key={c.id} onClick={() => setOverriding(c)}
                  style={{ background: "rgba(249,115,22,.15)", border: "1px solid rgba(249,115,22,.3)", color: "#fdba74", padding: "2px 8px", borderRadius: 8, fontSize: 11, cursor: "pointer", marginRight: 4 }}>
                  {c.name} ({days}d)
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Total",     value: companies.length,                                                                                 color: "#818cf8" },
          { label: "Active",    value: companies.filter(c => c.subscriptionStatus?.toUpperCase() === "ACTIVE").length,    color: "#22c55e" },
          { label: "Trialing",  value: companies.filter(c => c.subscriptionStatus?.toUpperCase() === "TRIALING").length,  color: "#06b6d4" },
          { label: "Past Due",  value: companies.filter(c => c.subscriptionStatus?.toUpperCase() === "PAST_DUE").length,  color: "#f97316" },
          { label: "Expiring",  value: expiringSoon.length,                                                                              color: "#fbbf24" },
        ].map(s => (
          <div key={s.label} style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: `1px solid ${s.color}20` }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{loading ? "—" : s.value}</div>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍  Search company or Stripe ID…"
          style={{ flex: 1, minWidth: 200, padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "white", fontSize: 13, outline: "none" }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 13, outline: "none", cursor: "pointer" }}>
          <option value="ALL">All Statuses</option>
          {["ACTIVE","TRIALING","PAST_DUE","INACTIVE","CANCELED"].map(s => (
            <option key={s} value={s}>{s.replace("_"," ")}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,.04)" }}>
              {["Company", "Plan", "Status", "Renewal", "Stripe ID", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: h === "Actions" ? "right" : "left", fontSize: 10, fontWeight: 800, color: "#475569", letterSpacing: ".07em", borderBottom: "1px solid rgba(255,255,255,.07)" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: "60px 0", textAlign: "center", color: "#475569" }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "60px 0", textAlign: "center", color: "#475569" }}>No companies</td></tr>
            ) : filtered.map(c => {
              const periodEnd = c.currentPeriodEnd ? new Date(c.currentPeriodEnd) : null;
              const daysLeft  = periodEnd ? Math.ceil((periodEnd.getTime() - Date.now()) / 86400000) : null;
              const expiring  = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

              return (
                <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)", background: expiring ? "rgba(249,115,22,.03)" : "transparent" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "white" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "#334155" }}>{c.country || "—"} · {c.usersCount} users</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}><PlanBadge plan={c.plan} /></td>
                  <td style={{ padding: "14px 16px" }}><StatusBadge status={c.subscriptionStatus} /></td>
                  <td style={{ padding: "14px 16px", fontSize: 12 }}>
                    {periodEnd ? (
                      <div>
                        <div style={{ color: expiring ? "#f97316" : "#94a3b8" }}>
                          {periodEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        {daysLeft !== null && (
                          <div style={{ fontSize: 10, color: expiring ? "#f97316" : "#334155", fontWeight: 700 }}>
                            {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Expires today" : "Expired"}
                          </div>
                        )}
                      </div>
                    ) : <span style={{ color: "#334155" }}>—</span>}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 11, color: "#334155", fontFamily: "monospace" }}>
                    {c.stripeCustomerId ? `${c.stripeCustomerId.slice(0, 18)}…` : "—"}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button onClick={() => setOverriding(c)}
                      style={{ padding: "6px 14px", borderRadius: 9, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)", color: "#818cf8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      🔧 Override
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Override Modal */}
      {overriding && (
        <OverrideModal
          company={overriding}
          onClose={() => setOverriding(null)}
          onDone={load}
        />
      )}
    </div>
  );
}
