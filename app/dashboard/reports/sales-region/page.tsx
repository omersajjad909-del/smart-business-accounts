"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { region: string; totalSales: number; totalProfit: number; marginPct: number; invoiceCount: number; customerCount: number; growthPct: number; }

export default function SalesRegionPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("month");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/sales-region?period=${period}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [period]);

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };
  const topRegion = [...data].sort((a, b) => b.totalSales - a.totalSales)[0];

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Sales by Region</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Geographic breakdown of sales performance</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
          <option value="month">This Month</option><option value="quarter">This Quarter</option><option value="year">This Year</option>
        </select>
      </div>

      {topRegion && (
        <div style={{ marginBottom: 20, padding: "16px 20px", borderRadius: 14, background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.2)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 28 }}>🏆</div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Top Region</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#818cf8" }}>{topRegion.region}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{cur} {fmt(topRegion.totalSales)} in sales · {topRegion.invoiceCount} invoices</div>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px 8px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 14 }}>SALES BY REGION</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...data].sort((a, b) => b.totalSales - a.totalSales)} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="region" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: ff }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: ff }} axisLine={false} tickLine={false} tickFormatter={v => `${cur} ${fmt(v)}`} width={90} />
              <Tooltip formatter={(v: number) => [`${cur} ${fmt(v)}`, "Sales"]} contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: ff }} />
              <Bar dataKey="totalSales" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["#", "Region", "Total Sales", "Profit", "Margin", "Invoices", "Customers", "Growth"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : data.length === 0 ? <tr><td colSpan={8} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>No region data — add city/region to customers</td></tr>
            : [...data].sort((a, b) => b.totalSales - a.totalSales).map((r, i) => {
              const growthColor = r.growthPct > 0 ? "#34d399" : r.growthPct < 0 ? "#f87171" : "var(--text-muted)";
              return (
                <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>📍 {r.region}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700 }}>{cur} {fmt(r.totalSales)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#34d399" }}>{cur} {fmt(r.totalProfit)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.marginPct.toFixed(1)}%</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.invoiceCount}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.customerCount}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: growthColor }}>
                    {r.growthPct > 0 ? "+" : ""}{r.growthPct.toFixed(1)}%
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
