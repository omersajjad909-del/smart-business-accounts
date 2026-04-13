"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface ScenarioResult { label: string; revenue: number; cogs: number; expenses: number; netProfit: number; marginPct: number; }

export default function ScenarioPage() {
  const user = getCurrentUser();
  const [base, setBase]       = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Scenario sliders
  const [revenueChg,  setRevenueChg]  = useState(0);
  const [cogsChg,     setCogsChg]     = useState(0);
  const [expenseChg,  setExpenseChg]  = useState(0);

  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch("/api/reports/scenario/base", { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setBase(d.base || null); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const scenarios: ScenarioResult[] = base ? [
    { label: "Base (Actual)", ...base },
    {
      label: "Your Scenario",
      revenue:   base.revenue   * (1 + revenueChg  / 100),
      cogs:      base.cogs      * (1 + cogsChg      / 100),
      expenses:  base.expenses  * (1 + expenseChg   / 100),
      get netProfit() { return this.revenue - this.cogs - this.expenses; },
      get marginPct() { return this.revenue > 0 ? (this.netProfit / this.revenue) * 100 : 0; },
    },
    {
      label: "Optimistic (+20%)",
      revenue:  base.revenue  * 1.2,
      cogs:     base.cogs     * 1.1,
      expenses: base.expenses * 1.05,
      get netProfit() { return this.revenue - this.cogs - this.expenses; },
      get marginPct() { return this.revenue > 0 ? (this.netProfit / this.revenue) * 100 : 0; },
    },
    {
      label: "Pessimistic (-20%)",
      revenue:  base.revenue  * 0.8,
      cogs:     base.cogs     * 0.85,
      expenses: base.expenses * 0.9,
      get netProfit() { return this.revenue - this.cogs - this.expenses; },
      get marginPct() { return this.revenue > 0 ? (this.netProfit / this.revenue) * 100 : 0; },
    },
  ] : [];

  const chartData = scenarios.map(s => ({ name: s.label, Revenue: s.revenue, Profit: s.netProfit }));

  const sliderStyle: React.CSSProperties = { width: "100%", accentColor: "#6366f1" };
  const lblStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: ".05em" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Scenario Planning</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>What-if analysis — see how revenue, costs & expenses affect your bottom line</p>
      </div>

      {loading ? <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Loading base data…</div>
      : !base ? <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>Not enough data — need at least one month of transactions</div>
      : (
        <>
          {/* Sliders */}
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "22px 24px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 18 }}>🎛️ Adjust Your Scenario</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
              {[
                { label: "Revenue Change", val: revenueChg, set: setRevenueChg, color: "#818cf8" },
                { label: "COGS Change",    val: cogsChg,    set: setCogsChg,    color: "#f87171" },
                { label: "Expense Change", val: expenseChg, set: setExpenseChg, color: "#fbbf24" },
              ].map(({ label, val, set, color }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={lblStyle}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: val === 0 ? "var(--text-muted)" : val > 0 ? color : "#34d399" }}>{val > 0 ? "+" : ""}{val}%</span>
                  </div>
                  <input type="range" min={-50} max={50} step={1} value={val} onChange={e => set(Number(e.target.value))} style={{ ...sliderStyle, accentColor: color }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                    <span>-50%</span><span>0</span><span>+50%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px 8px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 14 }}>REVENUE & PROFIT COMPARISON</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: ff }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: ff }} axisLine={false} tickLine={false} tickFormatter={v => `${cur} ${fmt(v)}`} width={90} />
                <Tooltip formatter={(v: number, name: string) => [`${cur} ${fmt(v)}`, name]} contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: ff }} />
                <Legend wrapperStyle={{ fontFamily: ff, fontSize: 12 }} />
                <Bar dataKey="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Profit"  fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scenario table */}
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Scenario", "Revenue", "COGS", "Expenses", "Net Profit", "Margin"].map((h, i) => (
                    <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 0 ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s, i) => {
                  const isBase    = i === 0;
                  const isCustom  = i === 1;
                  const profitColor = s.netProfit >= 0 ? "#34d399" : "#f87171";
                  return (
                    <tr key={i} style={{ borderBottom: i < scenarios.length - 1 ? "1px solid var(--border)" : "none", background: isCustom ? "rgba(99,102,241,.04)" : "transparent" }}
                      onMouseEnter={e => (e.currentTarget.style.background = isCustom ? "rgba(99,102,241,.08)" : "var(--app-bg)")}
                      onMouseLeave={e => (e.currentTarget.style.background = isCustom ? "rgba(99,102,241,.04)" : "transparent")}>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: isCustom ? 800 : 600, color: isCustom ? "#6366f1" : "var(--text-primary)" }}>
                        {isBase ? "📊 " : isCustom ? "🎛️ " : i === 2 ? "📈 " : "📉 "}{s.label}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(s.revenue)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#f87171" }}>{cur} {fmt(s.cogs)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#fbbf24" }}>{cur} {fmt(s.expenses)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 800, color: profitColor }}>{s.netProfit >= 0 ? "" : "-"}{cur} {fmt(Math.abs(s.netProfit))}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 14, fontWeight: 900, color: profitColor }}>{s.marginPct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
