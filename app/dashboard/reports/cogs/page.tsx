"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

interface COGSRow { itemName: string; category: string; qtySold: number; costPerUnit: number; totalCost: number; revenue: number; grossProfit: number; grossMarginPct: number; }

export default function COGSPage() {
  const user = getCurrentUser();
  const [data, setData] = useState<COGSRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [search, setSearch] = useState("");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });

  useEffect(() => { fetch(`/api/reports/cogs?period=${period}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [period]);

  const filtered = data.filter(r => r.itemName?.toLowerCase().includes(search.toLowerCase()));
  const totals = { cost: filtered.reduce((s, r) => s + r.totalCost, 0), rev: filtered.reduce((s, r) => s + r.revenue, 0), profit: filtered.reduce((s, r) => s + r.grossProfit, 0) };

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1200 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Cost of Goods Sold (COGS)</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Detailed cost breakdown by item — the heart of trading business</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input placeholder="Search item…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, width: 180 }} />
          <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total COGS",     value: `${cur} ${fmt(totals.cost)}`,   color: "#f87171", bg: "rgba(248,113,113,.07)",  border: "rgba(248,113,113,.2)" },
          { label: "Total Revenue",  value: `${cur} ${fmt(totals.rev)}`,    color: "#34d399", bg: "rgba(52,211,153,.07)",   border: "rgba(52,211,153,.2)" },
          { label: "Gross Profit",   value: `${cur} ${fmt(totals.profit)}`, color: "#818cf8", bg: "rgba(129,140,248,.07)",  border: "rgba(129,140,248,.2)" },
          { label: "Gross Margin",   value: totals.rev > 0 ? ((totals.profit / totals.rev) * 100).toFixed(1) + "%" : "—", color: "#fbbf24", bg: "rgba(251,191,36,.07)", border: "rgba(251,191,36,.2)" },
        ].map((c, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "18px 20px", background: c.bg, border: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Item", "Category", "Qty Sold", "Cost/Unit", "Total COGS", "Revenue", "Gross Profit", "Margin %"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>No COGS data found for this period
              </td></tr>
            ) : filtered.map((r, i) => (
              <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.itemName}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)" }}>{r.category || "—"}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.qtySold.toLocaleString()}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.costPerUnit)}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#f87171" }}>{cur} {fmt(r.totalCost)}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.revenue)}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: r.grossProfit >= 0 ? "#34d399" : "#f87171" }}>{cur} {fmt(r.grossProfit)}</td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: r.grossMarginPct >= 20 ? "rgba(52,211,153,.12)" : r.grossMarginPct >= 10 ? "rgba(251,191,36,.12)" : "rgba(248,113,113,.12)", color: r.grossMarginPct >= 20 ? "#34d399" : r.grossMarginPct >= 10 ? "#fbbf24" : "#f87171" }}>
                    {r.grossMarginPct.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
