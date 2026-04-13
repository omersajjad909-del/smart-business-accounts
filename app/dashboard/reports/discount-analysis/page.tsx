"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { name: string; type: "customer" | "item"; grossSales: number; discountAmount: number; discountPct: number; netSales: number; invoiceCount: number; }

export default function DiscountAnalysisPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("month");
  const [view, setView]       = useState<"customer" | "item">("customer");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/discount-analysis?period=${period}&view=${view}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [period, view]);

  const totals = { gross: data.reduce((s, r) => s + r.grossSales, 0), disc: data.reduce((s, r) => s + r.discountAmount, 0), net: data.reduce((s, r) => s + r.netSales, 0) };
  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Discount Analysis</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Are discounts hurting profitability? Find out here</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", borderRadius: 9, overflow: "hidden", border: "1px solid var(--border)" }}>
            {(["customer", "item"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "7px 14px", background: view === v ? "#6366f1" : "var(--panel-bg)", border: "none", color: view === v ? "white" : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, textTransform: "capitalize" }}>{v}</button>
            ))}
          </div>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
            <option value="month">This Month</option><option value="quarter">This Quarter</option><option value="year">This Year</option>
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Gross Sales",      value: `${cur} ${fmt(totals.gross)}`, color: "#818cf8", bg: "rgba(129,140,248,.07)", border: "rgba(129,140,248,.2)" },
          { label: "Total Discounts",  value: `${cur} ${fmt(totals.disc)}`,  color: "#f87171", bg: "rgba(248,113,113,.07)", border: "rgba(248,113,113,.2)" },
          { label: "Net Sales",        value: `${cur} ${fmt(totals.net)}`,   color: "#34d399", bg: "rgba(52,211,153,.07)",  border: "rgba(52,211,153,.2)" },
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
              {[view === "customer" ? "Customer" : "Item", "Gross Sales", "Discount Amount", "Discount %", "Net Sales", "Invoices"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 0 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : data.length === 0 ? <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🏷️</div>No discount data found</td></tr>
            : [...data].sort((a, b) => b.discountAmount - a.discountAmount).map((r, i) => (
              <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.name}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.grossSales)}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#f87171" }}>{cur} {fmt(r.discountAmount)}</td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: r.discountPct > 20 ? "#f87171" : r.discountPct > 10 ? "#fbbf24" : "#34d399" }}>{r.discountPct.toFixed(1)}%</span>
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700 }}>{cur} {fmt(r.netSales)}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "var(--text-muted)" }}>{r.invoiceCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
