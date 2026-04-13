"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

export default function BreakevenPage() {
  const user = getCurrentUser();
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });

  useEffect(() => {
    fetch("/api/reports/breakeven", { headers: h() })
      .then(r => r.ok ? r.json() : null).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // Build chart data: revenue & total cost lines across units
  const chartData = data ? Array.from({ length: 11 }, (_, i) => {
    const units = (data.breakevenUnits || 0) * 2 * (i / 10);
    return {
      units: Math.round(units),
      Revenue: Math.round(units * (data.avgSellingPrice || 0)),
      "Total Cost": Math.round((data.fixedCosts || 0) + units * (data.variableCostPerUnit || 0)),
    };
  }) : [];

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontFamily: ff }}>Loading…</div>;

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1000 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Break-even Analysis</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Kitni sale pe loss band hota hai — ab jano</p>
      </div>

      {!data ? (
        <div style={{ padding: 48, textAlign: "center", background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📉</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Break-even data not available</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Set up fixed costs and variable costs in Cost Centers to enable this report</div>
        </div>
      ) : (
        <>
          {/* Key metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Break-even Units",   value: `${fmt(data.breakevenUnits || 0)} units`,       color: "#818cf8", bg: "rgba(129,140,248,.07)", border: "rgba(129,140,248,.2)", desc: "Units to sell to cover all costs" },
              { label: "Break-even Revenue", value: `${cur} ${fmt(data.breakevenRevenue || 0)}`,    color: "#fbbf24", bg: "rgba(251,191,36,.07)",  border: "rgba(251,191,36,.2)",  desc: "Revenue needed to break even" },
              { label: "Margin of Safety",   value: `${(data.marginOfSafety || 0).toFixed(1)}%`,   color: data.marginOfSafety > 20 ? "#34d399" : "#f87171", bg: data.marginOfSafety > 20 ? "rgba(52,211,153,.07)" : "rgba(248,113,113,.07)", border: data.marginOfSafety > 20 ? "rgba(52,211,153,.2)" : "rgba(248,113,113,.2)", desc: "Buffer before reaching break-even" },
            ].map((c, i) => (
              <div key={i} style={{ borderRadius: 14, padding: "18px 20px", background: c.bg, border: `1px solid ${c.border}` }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: c.color, marginBottom: 6 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.desc}</div>
              </div>
            ))}
          </div>

          {/* Cost breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Fixed Costs (monthly)", value: `${cur} ${fmt(data.fixedCosts || 0)}`, desc: "Rent, salaries, utilities — don't change with sales", color: "#f87171" },
              { label: "Variable Cost/Unit",     value: `${cur} ${fmt(data.variableCostPerUnit || 0)}`, desc: "Raw material, packaging, shipping per unit", color: "#fbbf24" },
              { label: "Avg Selling Price/Unit", value: `${cur} ${fmt(data.avgSellingPrice || 0)}`, desc: "Average price you sell at", color: "#34d399" },
              { label: "Contribution Margin",    value: `${cur} ${fmt((data.avgSellingPrice || 0) - (data.variableCostPerUnit || 0))}`, desc: "Revenue − Variable Cost per unit", color: "#818cf8" },
            ].map((c, i) => (
              <div key={i} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: c.color, marginBottom: 4 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.desc}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Break-even Chart — Revenue vs Total Cost</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="units" tick={{ fill: "var(--text-muted)", fontSize: 10 } as any} axisLine={false} tickLine={false} label={{ value: "Units", position: "insideBottom", offset: -2, fill: "var(--text-muted)", fontSize: 10 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 } as any} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${cur} ${fmt(v)}`, ""]} />
                <ReferenceLine x={data.breakevenUnits} stroke="#fbbf24" strokeDasharray="4 4" label={{ value: "BEP", fill: "#fbbf24", fontSize: 11 }} />
                <Line type="monotone" dataKey="Revenue"    stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Total Cost" stroke="#f87171" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 20, marginTop: 10, justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}><div style={{ width: 16, height: 2, background: "#34d399" }} /> Revenue</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}><div style={{ width: 16, height: 2, background: "#f87171" }} /> Total Cost</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}><div style={{ width: 16, height: 2, background: "#fbbf24", borderTop: "2px dashed #fbbf24" }} /> Break-even Point</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
