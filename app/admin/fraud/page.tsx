"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

/* ── Types ──────────────────────────────────────────────── */
type Signal = {
  code: string;
  label: string;
  severity: "high" | "medium" | "low";
  detail: string;
};
type Company = {
  id: string;
  name: string;
  country?: string | null;
  plan?: string | null;
  subscriptionStatus?: string | null;
  businessType?: string | null;
  createdAt: string;
  fraudRisk: string;
  flaggedAt?: string | null;
  flagNote?: string | null;
  signals: Signal[];
  stats: {
    loginCount: number;
    countriesLast7d: number;
    invoicesLast30d: number;
    totalInvoiceAmount: number;
    maxTxPerDay: number;
    accountAgeDays: number;
  };
};
type Summary = { total: number; high: number; medium: number; low: number; flagged: number };

/* ── Constants ──────────────────────────────────────────── */
const RISK_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  HIGH:   { bg: "rgba(239,68,68,.12)",   text: "#f87171", border: "rgba(239,68,68,.3)",   glow: "rgba(239,68,68,.15)"   },
  MEDIUM: { bg: "rgba(249,115,22,.12)",  text: "#fb923c", border: "rgba(249,115,22,.3)",  glow: "rgba(249,115,22,.1)"  },
  LOW:    { bg: "rgba(251,191,36,.12)",  text: "#fbbf24", border: "rgba(251,191,36,.3)",  glow: "rgba(251,191,36,.08)" },
  NONE:   { bg: "rgba(100,116,139,.08)", text: "#64748b", border: "rgba(100,116,139,.2)", glow: "transparent"          },
};
const SEV_COLORS: Record<string, string> = { high: "#f87171", medium: "#fb923c", low: "#fbbf24" };
const SIGNAL_ICONS: Record<string, string> = {
  GEO_HOP:      "🌍",
  HIGH_VOLUME:  "📈",
  NEW_HEAVY:    "⚡",
  ODD_HOURS:    "🌙",
  RAPID_LOGINS: "🔁",
  MANUAL_FLAG:  "🚩",
};

function RiskBadge({ risk }: { risk: string }) {
  const c = RISK_COLORS[risk] ?? RISK_COLORS.NONE;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 12px", borderRadius: 20,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      fontSize: 11, fontWeight: 800, letterSpacing: ".04em",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.text }} />
      {risk}
    </span>
  );
}

/* ── Flag modal ─────────────────────────────────────────── */
function FlagModal({ company, onClose, onDone }: { company: Company; onClose: () => void; onDone: () => void }) {
  const [note, setNote]     = useState(company.flagNote || "");
  const [saving, setSaving] = useState(false);
  const isCurrentlyFlagged  = company.signals.some(s => s.code === "MANUAL_FLAG");

  async function submit(action: "FLAG" | "CLEAR") {
    if (action === "FLAG" && !note.trim()) { toast.error("Please enter a reason"); return; }
    setSaving(true);
    try {
      const u = getCurrentUser();
      const h: Record<string, string> = { "Content-Type": "application/json" };
      if (u?.role) h["x-user-role"] = u.role;
      if (u?.id)   h["x-user-id"]   = u.id;
      const r = await fetch("/api/admin/fraud/flag", {
        method: "POST", headers: h, credentials: "include" as any,
        body: JSON.stringify({ companyId: company.id, action, note }),
      });
      const j = await r.json();
      if (r.ok) {
        toast.success(action === "FLAG" ? "Company flagged as suspicious" : "Flag cleared");
        onDone(); onClose();
      } else {
        toast.error(j?.error || "Action failed");
      }
    } catch { toast.error("Request failed"); }
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 480, background: "#0a0f24", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: 28, boxShadow: "0 40px 100px rgba(0,0,0,.7)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "white" }}>
              {isCurrentlyFlagged ? "Update / Clear Flag" : "Flag as Suspicious"}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>{company.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>REASON / EVIDENCE *</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={4}
            placeholder="e.g. User submitted invoices for non-existent goods. IPs from sanctioned region. Multiple accounts sharing same VAT number..."
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "white", fontSize: 13, outline: "none", resize: "none", lineHeight: 1.6, boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 12, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          {isCurrentlyFlagged && (
            <button onClick={() => submit("CLEAR")} disabled={saving}
              style={{ flex: 1, padding: "11px", borderRadius: 12, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.3)", color: "#4ade80", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              ✓ Clear Flag
            </button>
          )}
          <button onClick={() => submit("FLAG")} disabled={saving}
            style={{ flex: 2, padding: "11px", borderRadius: 12, background: saving ? "rgba(239,68,68,.15)" : "rgba(239,68,68,.2)", border: "1px solid rgba(239,68,68,.4)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? .6 : 1 }}>
            {saving ? "Saving…" : "🚩 Flag Company"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Company detail row ─────────────────────────────────── */
function CompanyRow({ c, onFlag }: { c: Company; onFlag: (c: Company) => void }) {
  const [expanded, setExpanded] = useState(false);
  const riskC = RISK_COLORS[c.fraudRisk] ?? RISK_COLORS.NONE;
  const isFlagged = c.signals.some(s => s.code === "MANUAL_FLAG");

  return (
    <>
      <tr
        onClick={() => setExpanded(x => !x)}
        style={{
          borderBottom: expanded ? "none" : "1px solid rgba(255,255,255,.04)",
          background: expanded ? `${riskC.glow}` : c.fraudRisk !== "NONE" ? `${riskC.glow}` : "transparent",
          cursor: "pointer",
          transition: "background .15s",
        }}
      >
        {/* Company name */}
        <td style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{expanded ? "▾" : "▸"}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "white" }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "#334155" }}>{c.country || "—"} · {c.businessType || "—"}</div>
            </div>
            {isFlagged && <span style={{ fontSize: 14 }}>🚩</span>}
          </div>
        </td>

        {/* Risk level */}
        <td style={{ padding: "14px 16px" }}><RiskBadge risk={c.fraudRisk} /></td>

        {/* Signals count */}
        <td style={{ padding: "14px 16px" }}>
          {c.signals.length === 0 ? (
            <span style={{ fontSize: 12, color: "#334155" }}>No signals</span>
          ) : (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {c.signals.map(s => (
                <span key={s.code} title={s.label} style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                  background: `${SEV_COLORS[s.severity]}18`,
                  color: SEV_COLORS[s.severity],
                  border: `1px solid ${SEV_COLORS[s.severity]}30`,
                }}>
                  {SIGNAL_ICONS[s.code] || "⚑"} {s.code.replace("_", " ")}
                </span>
              ))}
            </div>
          )}
        </td>

        {/* Stats quick */}
        <td style={{ padding: "14px 16px", fontSize: 11, color: "#475569" }}>
          <div>{c.stats.loginCount} logins (30d)</div>
          <div>{c.stats.invoicesLast30d} invoices</div>
        </td>

        {/* Account age */}
        <td style={{ padding: "14px 16px", fontSize: 11, color: "#475569" }}>
          {c.stats.accountAgeDays}d old
        </td>

        {/* Actions */}
        <td style={{ padding: "14px 16px", textAlign: "right" }}>
          <button
            onClick={e => { e.stopPropagation(); onFlag(c); }}
            style={{
              padding: "5px 14px", borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: isFlagged ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)",
              border: `1px solid ${isFlagged ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`,
              color: isFlagged ? "#4ade80" : "#f87171",
            }}>
            {isFlagged ? "✓ Flagged" : "🚩 Flag"}
          </button>
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr style={{ borderBottom: "1px solid rgba(255,255,255,.04)", background: `${riskC.glow}` }}>
          <td colSpan={6} style={{ padding: "0 16px 16px 48px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

              {/* Signals detail */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: ".07em", marginBottom: 10 }}>RISK SIGNALS</div>
                {c.signals.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#334155", padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,.05)", border: "1px solid rgba(34,197,94,.15)" }}>
                    ✓ No suspicious signals detected
                  </div>
                ) : c.signals.map(s => (
                  <div key={s.code} style={{
                    marginBottom: 8, padding: "10px 14px", borderRadius: 10,
                    background: `${SEV_COLORS[s.severity]}08`,
                    border: `1px solid ${SEV_COLORS[s.severity]}25`,
                    borderLeft: `3px solid ${SEV_COLORS[s.severity]}`,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: SEV_COLORS[s.severity], marginBottom: 3 }}>
                      {SIGNAL_ICONS[s.code]} {s.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{s.detail}</div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: ".07em", marginBottom: 10 }}>ACCOUNT STATISTICS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Login Sessions (30d)", value: c.stats.loginCount },
                    { label: "Countries (7d)", value: c.stats.countriesLast7d },
                    { label: "Invoices (30d)", value: c.stats.invoicesLast30d },
                    { label: "Invoice Total (30d)", value: `$${c.stats.totalInvoiceAmount.toFixed(0)}` },
                    { label: "Peak Tx / Day", value: c.stats.maxTxPerDay },
                    { label: "Account Age", value: `${c.stats.accountAgeDays}d` },
                  ].map(st => (
                    <div key={st.label} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{st.value}</div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{st.label}</div>
                    </div>
                  ))}
                </div>

                {/* Flag note */}
                {c.flagNote && (
                  <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>ADMIN FLAG NOTE</div>
                    <div style={{ fontSize: 12, color: "#fca5a5", lineHeight: 1.5 }}>{c.flagNote}</div>
                    {c.flaggedAt && <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>Flagged {new Date(c.flaggedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function FraudMonitorPage() {
  const [data, setData]           = useState<{ summary: Summary; companies: Company[] } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [q, setQ]                 = useState("");
  const [filterRisk, setFilterRisk] = useState("ALL");
  const [flagging, setFlagging]   = useState<Company | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const u = getCurrentUser();
      const h: Record<string, string> = {};
      if (u?.role) h["x-user-role"] = u.role;
      const r = await fetch("/api/admin/fraud", { headers: h, credentials: "include" as any });
      if (r.ok) { const j = await r.json(); setData(j); }
    } finally { setLoading(false); }
  }

  const companies = data?.companies || [];
  const filtered = companies.filter(c => {
    const matchQ = !q || c.name.toLowerCase().includes(q.toLowerCase());
    const matchR = filterRisk === "ALL" || c.fraudRisk === filterRisk || (filterRisk === "FLAGGED" && c.signals.some(s => s.code === "MANUAL_FLAG"));
    return matchQ && matchR;
  });

  const s = data?.summary;

  return (
    <div style={{ minHeight: "100vh", background: "#060918", padding: "28px 24px 60px", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <style>{`select option { background:#0f172a; color:white; } * { box-sizing: border-box; }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 26 }}>🛡️</span>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "white" }}>Fraud & Risk Monitor</h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
            Auto-detects suspicious activity patterns · Manual flagging · Real-time risk scoring
          </p>
        </div>
        <button onClick={load} style={{ padding: "9px 18px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>↻ Refresh</button>
      </div>

      {/* How it works explainer */}
      <div style={{ marginBottom: 22, padding: "14px 20px", borderRadius: 14, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.2)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", letterSpacing: ".07em", marginBottom: 8 }}>HOW DETECTION WORKS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {[
            { icon: "🌍", label: "Geo-Hopping", desc: "3+ countries in 7 days" },
            { icon: "📈", label: "High Volume", desc: ">100 transactions/day" },
            { icon: "⚡", label: "New + Heavy", desc: "New account, large activity" },
            { icon: "🌙", label: "Odd Hours", desc: ">40% logins at night" },
            { icon: "🔁", label: "Rapid Logins", desc: ">20 sessions in 1 hour" },
            { icon: "🚩", label: "Manual Flag", desc: "Admin-flagged" },
          ].map(sig => (
            <div key={sig.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
              <span style={{ fontSize: 14 }}>{sig.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>{sig.label}</span>
              <span style={{ fontSize: 10, color: "#334155" }}>{sig.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Total Companies", value: s?.total,   color: "#818cf8" },
          { label: "High Risk",       value: s?.high,    color: "#f87171" },
          { label: "Medium Risk",     value: s?.medium,  color: "#fb923c" },
          { label: "Low Risk",        value: s?.low,     color: "#fbbf24" },
          { label: "Manually Flagged",value: s?.flagged, color: "#f43f5e" },
        ].map(st => (
          <div key={st.label} style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: `1px solid ${st.color}20` }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: st.color }}>{loading ? "—" : st.value ?? 0}</div>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍  Search company…"
          style={{ flex: 1, minWidth: 200, padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "white", fontSize: 13, outline: "none" }} />
        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
          style={{ padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 13, outline: "none", cursor: "pointer" }}>
          <option value="ALL">All Risk Levels</option>
          {["HIGH", "MEDIUM", "LOW", "NONE", "FLAGGED"].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,.04)" }}>
              {["Company", "Risk Level", "Signals", "Activity", "Age", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: h === "Actions" ? "right" : "left", fontSize: 10, fontWeight: 800, color: "#475569", letterSpacing: ".07em", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: "60px 0", textAlign: "center", color: "#475569" }}>Analyzing activity…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "60px 0", textAlign: "center", color: "#475569" }}>No companies match the filter</td></tr>
            ) : filtered.map(c => (
              <CompanyRow key={c.id} c={c} onFlag={setFlagging} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Flag modal */}
      {flagging && <FlagModal company={flagging} onClose={() => setFlagging(null)} onDone={load} />}
    </div>
  );
}
