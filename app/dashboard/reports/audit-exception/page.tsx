"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { id: string; type: string; description: string; referenceNo: string; amount: number; date: string; severity: "critical" | "warning" | "info"; resolvedAt: string | null; }

const SEV: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,.1)" },
  warning:  { label: "Warning",  color: "#f59e0b", bg: "rgba(245,158,11,.1)" },
  info:     { label: "Info",     color: "#818cf8", bg: "rgba(129,140,248,.1)" },
};

export default function AuditExceptionPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("unresolved");
  const [sev, setSev]         = useState("all");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/audit-exception?status=${filter}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [filter]);

  const filtered = sev === "all" ? data : data.filter(r => r.severity === sev);
  const criticalCount = data.filter(r => r.severity === "critical" && !r.resolvedAt).length;

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Audit & Exception Log</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Anomalies, duplicate entries, missing data, and compliance flags</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select value={sev} onChange={e => setSev(e.target.value)} style={inp}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={inp}>
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {criticalCount > 0 && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.25)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{criticalCount} critical exception{criticalCount > 1 ? "s" : ""} require immediate attention</span>
        </div>
      )}

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Type", "Description", "Reference", "Amount", "Date", "Severity", "Status"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 2 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>No exceptions found — books are clean</td></tr>
            : filtered.map((r, i) => {
              const s = SEV[r.severity];
              return (
                <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#818cf8", fontWeight: 600 }}>{r.type}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13 }}>{r.description}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)" }}>{r.referenceNo || "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.amount > 0 ? `${cur} ${fmt(r.amount)}` : "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.date}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    {r.resolvedAt
                      ? <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(52,211,153,.1)", color: "#34d399" }}>Resolved</span>
                      : <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(248,113,113,.1)", color: "#f87171" }}>Open</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
