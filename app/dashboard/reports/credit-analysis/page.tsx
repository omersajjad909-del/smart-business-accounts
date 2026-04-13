"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { customerName: string; creditLimit: number; outstanding: number; utilizationPct: number; avgDaysToPay: number; overdueAmount: number; riskRating: "low" | "medium" | "high"; }

const RISK: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: "Low Risk ✓",  color: "#34d399", bg: "rgba(52,211,153,.1)" },
  medium: { label: "Medium Risk", color: "#fbbf24", bg: "rgba(251,191,36,.1)" },
  high:   { label: "High Risk ⚠", color: "#f87171", bg: "rgba(248,113,113,.1)" },
};

export default function CreditAnalysisPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState("all");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch("/api/reports/credit-analysis", { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const filtered = riskFilter === "all" ? data : data.filter(r => r.riskRating === riskFilter);
  const highRiskCount = data.filter(r => r.riskRating === "high").length;
  const totalExposure = data.reduce((s, r) => s + r.outstanding, 0);

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Credit Analysis</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Customer credit limits, utilization, and risk assessment</p>
        </div>
        <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={inp}>
          <option value="all">All Risk Levels</option>
          <option value="high">High Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="low">Low Risk</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total Exposure",   value: `${cur} ${fmt(totalExposure)}`,  color: "#818cf8", bg: "rgba(129,140,248,.07)", border: "rgba(129,140,248,.2)" },
          { label: "High Risk Customers", value: `${highRiskCount} customers`, color: "#f87171", bg: "rgba(248,113,113,.07)", border: "rgba(248,113,113,.2)" },
          { label: "Total Customers",  value: `${data.length} tracked`,        color: "#34d399", bg: "rgba(52,211,153,.07)",  border: "rgba(52,211,153,.2)" },
        ].map((c, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "18px 20px", background: c.bg, border: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Customer", "Credit Limit", "Outstanding", "Utilization", "Avg Pay Days", "Overdue", "Risk"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 0 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>No credit data found — set credit limits on customers</td></tr>
            : [...filtered].sort((a, b) => b.utilizationPct - a.utilizationPct).map((r, i) => {
              const risk = RISK[r.riskRating];
              const utilColor = r.utilizationPct >= 90 ? "#f87171" : r.utilizationPct >= 70 ? "#fbbf24" : "#34d399";
              return (
                <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.customerName}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.creditLimit > 0 ? `${cur} ${fmt(r.creditLimit)}` : "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700 }}>{cur} {fmt(r.outstanding)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    {r.creditLimit > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: utilColor }}>{r.utilizationPct.toFixed(0)}%</span>
                        <div style={{ width: 60, height: 4, background: "var(--border)", borderRadius: 2 }}>
                          <div style={{ height: 4, borderRadius: 2, width: `${Math.min(r.utilizationPct, 100)}%`, background: utilColor }} />
                        </div>
                      </div>
                    ) : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No limit</span>}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.avgDaysToPay} days</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: r.overdueAmount > 0 ? "#f87171" : "var(--text-muted)", fontWeight: r.overdueAmount > 0 ? 700 : 400 }}>{r.overdueAmount > 0 ? `${cur} ${fmt(r.overdueAmount)}` : "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: risk.bg, color: risk.color }}>{risk.label}</span>
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
