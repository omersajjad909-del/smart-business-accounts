"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { productName: string; category: string; revenue: number; cogs: number; grossProfit: number; marginPct: number; unitsSold: number; avgPrice: number; }

const signal = (m: number) => m >= 40 ? { label: "High Margin ⭐", color: "#34d399", bg: "rgba(52,211,153,.1)" } : m >= 20 ? { label: "Healthy", color: "#818cf8", bg: "rgba(129,140,248,.1)" } : m >= 0 ? { label: "Low Margin", color: "#fbbf24", bg: "rgba(251,191,36,.1)" } : { label: "Loss Maker", color: "#f87171", bg: "rgba(248,113,113,.1)" };

export default function ProductProfitabilityPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("month");
  const [search, setSearch]   = useState("");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/product-profitability?period=${period}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [period]);

  const filtered = data.filter(r => r.productName.toLowerCase().includes(search.toLowerCase()) || (r.category || "").toLowerCase().includes(search.toLowerCase()));
  const totals = { revenue: data.reduce((s, r) => s + r.revenue, 0), profit: data.reduce((s, r) => s + r.grossProfit, 0) };
  const avgMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Product Profitability</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Which products make you the most money — and which ones are draining you</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input placeholder="Search product…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, width: 180 }} />
          <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
            <option value="month">This Month</option><option value="quarter">This Quarter</option><option value="year">This Year</option>
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total Revenue",   value: `${cur} ${fmt(totals.revenue)}`, color: "#818cf8", bg: "rgba(129,140,248,.07)", border: "rgba(129,140,248,.2)" },
          { label: "Total Profit",    value: `${cur} ${fmt(totals.profit)}`,  color: "#34d399", bg: "rgba(52,211,153,.07)",  border: "rgba(52,211,153,.2)" },
          { label: "Avg Margin",      value: `${avgMargin.toFixed(1)}%`,      color: "#fbbf24", bg: "rgba(251,191,36,.07)", border: "rgba(251,191,36,.2)" },
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
              {["#", "Product", "Category", "Revenue", "COGS", "Gross Profit", "Margin", "Units Sold", "Avg Price", "Signal"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 2 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={10} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>No product data found</td></tr>
            : [...filtered].sort((a, b) => b.grossProfit - a.grossProfit).map((r, i) => {
              const s = signal(r.marginPct);
              return (
                <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600 }}>{r.productName}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--text-muted)" }}>{r.category || "—"}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.revenue)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, color: "#f87171" }}>{cur} {fmt(r.cogs)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#34d399" }}>{cur} {fmt(r.grossProfit)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 14, fontWeight: 900, color: s.color }}>{r.marginPct.toFixed(1)}%</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13 }}>{fmt(r.unitsSold)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.avgPrice)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right" }}>
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
