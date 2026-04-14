"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface ExpRow { department: string; category: string; amount: number; pct: number; prevAmount: number; change: number; }
type GroupBy = "category" | "costCenter";

const COLORS = ["#6366f1","#f87171","#fbbf24","#34d399","#38bdf8","#a78bfa","#f97316","#ec4899"];

export default function ExpenseBreakdownPage() {
  const user = getCurrentUser();
  const [data,    setData]    = useState<ExpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState("month");
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const cur = "Rs";

  const h = (): Record<string, string> => ({
    "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "",
  });

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/expense-breakdown?period=${period}&groupBy=${groupBy}`, { headers: h() })
      .then(r => r.ok ? r.json() : {})
      .then(d => { setData(d.rows || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period, groupBy]);

  const total   = data.reduce((s, r) => s + r.amount, 0);
  const pieData = data.slice(0, 8).map(r => ({ name: r.category, value: r.amount }));

  const inp: React.CSSProperties = {
    background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8,
    padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none",
  };

  const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
    { value: "category",   label: "By Category" },
    { value: "costCenter", label: "By Cost Center" },
  ];

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Expense Breakdown</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Identify where spending is highest — by category or cost center</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Group-by toggle */}
          <div style={{ display: "flex", borderRadius: 9, overflow: "hidden", border: "1px solid var(--border)" }}>
            {GROUP_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setGroupBy(opt.value)}
                style={{ padding: "7px 14px", background: groupBy === opt.value ? "#6366f1" : "var(--panel-bg)", border: "none", color: groupBy === opt.value ? "white" : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
                {opt.label}
              </button>
            ))}
          </div>
          {/* Period */}
          <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total Expenses", value: `${cur} ${fmt(total)}`, color: "#f87171", bg: "rgba(248,113,113,.07)", border: "rgba(248,113,113,.2)" },
          { label: "Top Item", value: data[0]?.category || "—", color: "#6366f1", bg: "rgba(99,102,241,.07)", border: "rgba(99,102,241,.2)" },
          { label: "Categories", value: String(data.length), color: "#34d399", bg: "rgba(52,211,153,.07)", border: "rgba(52,211,153,.2)" },
        ].map(c => (
          <div key={c.label} style={{ borderRadius: 12, padding: "14px 18px", background: c.bg, border: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: c.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, marginBottom: 20 }}>

        {/* Table */}
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              Breakdown — {groupBy === "costCenter" ? "Cost Centers" : "Categories"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#f87171" }}>Total: {cur} {fmt(total)}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {[groupBy === "costCenter" ? "Cost Center" : "Category", "Amount", "% of Total", "vs Last Period"].map((h, i) => (
                  <th key={h} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 0 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💸</div>
                  No expense data found for this period
                </td></tr>
              ) : data.map((r, i) => (
                <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.category}</span>
                    </div>
                    <div style={{ marginTop: 5, height: 3, background: "var(--border)", borderRadius: 2 }}>
                      <div style={{ height: 3, borderRadius: 2, width: `${r.pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 700 }}>{cur} {fmt(r.amount)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, color: "var(--text-muted)" }}>{r.pct.toFixed(1)}%</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 12, fontWeight: 700, color: r.change > 0 ? "#f87171" : "#34d399" }}>
                    {r.change >= 0 ? "▲" : "▼"} {Math.abs(r.change).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pie Chart */}
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Distribution</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" outerRadius={85} dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any) => [`${cur} ${fmt(v)}`, ""]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>No data</div>
          )}

          {/* Cost center tip */}
          {groupBy === "costCenter" && (
            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", fontSize: 11, color: "#818cf8", lineHeight: 1.5 }}>
              Cost centers are assigned when creating expense vouchers. Set them up in Settings → Cost Centers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
