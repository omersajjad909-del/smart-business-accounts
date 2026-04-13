"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface MarginRow { name: string; type: "product" | "category"; revenue: number; cogs: number; grossProfit: number; marginPct: number; }

export default function GrossMarginPage() {
  const user = getCurrentUser();
  const [data, setData] = useState<MarginRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [view, setView] = useState<"product" | "category">("product");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/gross-margin?period=${period}&view=${view}`, { headers: h() })
      .then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false));
  }, [period, view]);

  const sorted = [...data].sort((a, b) => b.marginPct - a.marginPct);
  const chartData = sorted.slice(0, 10).map(r => ({ name: r.name.length > 14 ? r.name.slice(0, 14) + "…" : r.name, margin: parseFloat(r.marginPct.toFixed(1)) }));
  const COLORS = ["#34d399", "#6366f1", "#fbbf24", "#f87171", "#38bdf8", "#a78bfa", "#34d399", "#f97316", "#ec4899", "#14b8a6"];

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1200 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Gross Margin Analysis</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Konsa item paisa bana raha hai, konsa sirf shelf garam kar raha hai</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", borderRadius: 9, overflow: "hidden", border: "1px solid var(--border)" }}>
            {(["product", "category"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "7px 16px", background: view === v ? "#6366f1" : "var(--panel-bg)", border: "none", color: view === v ? "white" : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, textTransform: "capitalize" }}>{v}</button>
            ))}
          </div>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Top 10 by Margin % ({view})</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10 } as any} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 } as any} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Gross Margin"]} />
              <Bar dataKey="margin" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["#", view === "product" ? "Product" : "Category", "Revenue", "COGS", "Gross Profit", "Margin %", "Signal"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : sorted.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📈</div>No margin data found for this period
              </td></tr>
            ) : sorted.map((r, i) => {
              const signal = r.marginPct >= 30 ? { label: "High Margin ⭐", color: "#34d399", bg: "rgba(52,211,153,.1)" } : r.marginPct >= 15 ? { label: "Healthy", color: "#818cf8", bg: "rgba(129,140,248,.1)" } : r.marginPct >= 5 ? { label: "Low Margin ⚠️", color: "#fbbf24", bg: "rgba(251,191,36,.1)" } : { label: "Loss Maker 🔴", color: "#f87171", bg: "rgba(248,113,113,.1)" };
              return (
                <tr key={i} style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.revenue)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#f87171" }}>{cur} {fmt(r.cogs)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: r.grossProfit >= 0 ? "#34d399" : "#f87171" }}>{cur} {fmt(r.grossProfit)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 15, fontWeight: 900, color: signal.color }}>{r.marginPct.toFixed(1)}%</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: signal.bg, color: signal.color }}>{signal.label}</span>
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
