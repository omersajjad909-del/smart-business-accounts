"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtPct(n: number) { return (n >= 0 ? "+" : "") + n.toFixed(1) + "%"; }

interface BudgetRow {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePct: number;
  status: "over" | "under" | "on";
}

type CostCenter = { id: string; code: string; name: string };

export default function BudgetVsActualPage() {
  const user = getCurrentUser();
  const [data,         setData]         = useState<BudgetRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [period,       setPeriod]       = useState("month");
  const [summary,      setSummary]      = useState({ totalBudget: 0, totalActual: 0, variance: 0 });
  const [costCenters,  setCostCenters]  = useState<CostCenter[]>([]);
  const [costCenterId, setCostCenterId] = useState<string>("");
  const cur = "Rs";

  const h = (): Record<string, string> => ({
    "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "",
  });

  // Load cost centers for filter
  useEffect(() => {
    fetch("/api/cost-centers", { headers: h() })
      .then(r => r.ok ? r.json() : [])
      .then(d => setCostCenters(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [period, costCenterId]);

  async function fetchData() {
    setLoading(true);
    try {
      const url = `/api/reports/budget-vs-actual?period=${period}${costCenterId ? `&costCenterId=${costCenterId}` : ""}`;
      const res  = await fetch(url, { headers: h() });
      if (res.ok) {
        const json = await res.json();
        const rows: BudgetRow[] = (json.rows || []).map((r: any) => ({
          ...r,
          status: r.actual > r.budgeted * 1.05 ? "over" : r.actual < r.budgeted * 0.95 ? "under" : "on",
        }));
        setData(rows);
        setSummary(json.summary || { totalBudget: 0, totalActual: 0, variance: 0 });
      }
    } catch {}
    finally { setLoading(false); }
  }

  const inp: React.CSSProperties = {
    background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8,
    padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none",
  };

  const overCount  = data.filter(r => r.status === "over").length;
  const underCount = data.filter(r => r.status === "under").length;

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Budget vs Actual</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Track planned spending against actual expenses — spot overspend early</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Cost center filter */}
          <select value={costCenterId} onChange={e => setCostCenterId(e.target.value)} style={inp}>
            <option value="">All Cost Centers</option>
            {costCenters.map(cc => (
              <option key={cc.id} value={cc.id}>{cc.code} — {cc.name}</option>
            ))}
          </select>
          {/* Period */}
          <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Budgeted",  value: `${cur} ${fmt(summary.totalBudget)}`,  color: "#818cf8", bg: "rgba(129,140,248,.07)",  border: "rgba(129,140,248,.2)" },
          { label: "Total Actual",    value: `${cur} ${fmt(summary.totalActual)}`,  color: "#34d399", bg: "rgba(52,211,153,.07)",   border: "rgba(52,211,153,.2)" },
          { label: "Variance",        value: `${summary.variance >= 0 ? "+" : ""}${cur} ${fmt(Math.abs(summary.variance))}`,
            color: summary.variance > 0 ? "#f87171" : "#34d399",
            bg:    summary.variance > 0 ? "rgba(248,113,113,.07)" : "rgba(52,211,153,.07)",
            border:summary.variance > 0 ? "rgba(248,113,113,.2)"  : "rgba(52,211,153,.2)" },
          { label: "Over Budget",     value: String(overCount),  color: "#f87171", bg: "rgba(248,113,113,.07)", border: "rgba(248,113,113,.2)" },
          { label: "Under Budget",    value: String(underCount), color: "#34d399", bg: "rgba(52,211,153,.07)",  border: "rgba(52,211,153,.2)" },
        ].map((c, i) => (
          <div key={i} style={{ borderRadius: 12, padding: "14px 16px", background: c.bg, border: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Active cost center banner */}
      {costCenterId && costCenters.length > 0 && (
        <div style={{ marginBottom: 16, padding: "9px 16px", borderRadius: 10, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#818cf8", fontWeight: 600 }}>
            Filtered by cost center: {costCenters.find(c => c.id === costCenterId)?.name}
          </span>
          <button onClick={() => setCostCenterId("")}
            style={{ fontSize: 11, color: "#818cf8", background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontWeight: 600 }}>
            Clear filter ✕
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 700 }}>
          Category-wise Breakdown
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Category", "Budgeted", "Actual", "Variance", "Variance %", "Status"].map((h, i) => (
                <th key={h} style={{ padding: "11px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 0 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                No budget data found — set up budgets in Settings → Budget Planning first
              </td></tr>
            ) : data.map((r, i) => {
              const varColor = r.status === "over" ? "#f87171" : r.status === "under" ? "#34d399" : "#818cf8";
              const barPct   = r.budgeted > 0 ? Math.min((r.actual / r.budgeted) * 100, 150) : 0;
              return (
                <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.category}</div>
                    <div style={{ marginTop: 6, height: 4, background: "var(--border)", borderRadius: 2, width: 120 }}>
                      <div style={{ height: 4, borderRadius: 2, width: `${barPct}%`, background: r.status === "over" ? "#f87171" : "#34d399", transition: "width .3s" }} />
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.budgeted)}</td>
                  <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 13, fontWeight: 700 }}>{cur} {fmt(r.actual)}</td>
                  <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: varColor }}>
                    {r.variance >= 0 ? "+" : ""}{cur} {fmt(Math.abs(r.variance))}
                  </td>
                  <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: varColor }}>{fmtPct(r.variancePct)}</td>
                  <td style={{ padding: "13px 16px", textAlign: "right" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: r.status === "over" ? "rgba(248,113,113,.1)" : r.status === "under" ? "rgba(52,211,153,.1)" : "rgba(129,140,248,.1)",
                      color: varColor }}>
                      {r.status === "over" ? "Over Budget" : r.status === "under" ? "Under Budget" : "On Track"}
                    </span>
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
