"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { customerName: string; revenue: number; cogs: number; grossProfit: number; marginPct: number; invoiceCount: number; avgOrderValue: number; segment: "star" | "good" | "average" | "low"; }

const SEG: Record<string, { label: string; color: string; bg: string }> = {
  star:    { label: "Star Customer ⭐", color: "#34d399", bg: "rgba(52,211,153,.1)" },
  good:    { label: "Good",            color: "#818cf8", bg: "rgba(129,140,248,.1)" },
  average: { label: "Average",         color: "#fbbf24", bg: "rgba(251,191,36,.1)" },
  low:     { label: "Low Value",       color: "#f87171", bg: "rgba(248,113,113,.1)" },
};

export default function CustomerProfitabilityPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("year");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/customer-profitability?period=${period}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [period]);

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Customer Profitability</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Smart log "profit kis se hua" dekhte hain — sirf "sale kitni hui" nahi</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
          <option value="month">This Month</option><option value="quarter">This Quarter</option><option value="year">This Year</option>
        </select>
      </div>
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["#", "Customer", "Revenue", "COGS", "Gross Profit", "Margin %", "Orders", "Avg Order", "Segment"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : data.length === 0 ? <tr><td colSpan={9} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>No customer data found</td></tr>
            : [...data].sort((a, b) => b.grossProfit - a.grossProfit).map((r, i) => {
              const s = SEG[r.segment];
              return (
                <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.customerName}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.revenue)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#f87171" }}>{cur} {fmt(r.cogs)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#34d399" }}>{cur} {fmt(r.grossProfit)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 14, fontWeight: 900, color: s.color }}>{r.marginPct.toFixed(1)}%</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.invoiceCount}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.avgOrderValue)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
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
