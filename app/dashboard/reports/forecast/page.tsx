"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface ForecastPoint { month: string; actual: number | null; forecast: number; lowerBound: number; upperBound: number; }
interface ForecastSummary { nextMonthForecast: number; nextQuarterForecast: number; growthRatePct: number; confidence: number; }

export default function ForecastPage() {
  const user = getCurrentUser();
  const [points, setPoints]   = useState<ForecastPoint[]>([]);
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState("3");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/forecast?horizon=${horizon}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setPoints(d.points || []); setSummary(d.summary || null); setLoading(false); }).catch(() => setLoading(false)); }, [horizon]);

  const todayIndex = points.findIndex(p => p.actual === null);
  const splitMonth = todayIndex > 0 ? points[todayIndex - 1]?.month : undefined;

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Sales Forecast</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>AI-powered revenue forecast based on historical trends</p>
        </div>
        <select value={horizon} onChange={e => setHorizon(e.target.value)} style={inp}>
          <option value="3">3-Month Horizon</option>
          <option value="6">6-Month Horizon</option>
          <option value="12">12-Month Horizon</option>
        </select>
      </div>

      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Next Month",    value: `${cur} ${fmt(summary.nextMonthForecast)}`,    color: "#818cf8", bg: "rgba(129,140,248,.07)", border: "rgba(129,140,248,.2)" },
            { label: "Next Quarter",  value: `${cur} ${fmt(summary.nextQuarterForecast)}`,  color: "#6366f1", bg: "rgba(99,102,241,.07)",   border: "rgba(99,102,241,.2)" },
            { label: "Growth Rate",   value: `${summary.growthRatePct > 0 ? "+" : ""}${summary.growthRatePct.toFixed(1)}%`, color: summary.growthRatePct >= 0 ? "#34d399" : "#f87171", bg: "rgba(52,211,153,.07)", border: "rgba(52,211,153,.2)" },
            { label: "Confidence",    value: `${summary.confidence.toFixed(0)}%`,           color: "#fbbf24", bg: "rgba(251,191,36,.07)",   border: "rgba(251,191,36,.2)" },
          ].map((c, i) => (
            <div key={i} style={{ borderRadius: 14, padding: "18px 20px", background: c.bg, border: `1px solid ${c.border}` }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px 8px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>REVENUE FORECAST</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>Solid line = actual · Dashed line = forecast · Shaded = confidence range</div>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
        : points.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>📈 Not enough data to generate forecast — need at least 3 months of sales history</div>
        : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: ff }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: ff }} axisLine={false} tickLine={false} tickFormatter={v => `${cur} ${fmt(v)}`} width={90} />
              <Tooltip formatter={(v: number, name: string) => [`${cur} ${fmt(v)}`, name === "actual" ? "Actual" : name === "forecast" ? "Forecast" : name === "upperBound" ? "Upper Bound" : "Lower Bound"]} contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: ff }} />
              {splitMonth && <ReferenceLine x={splitMonth} stroke="var(--border)" strokeDasharray="4 4" label={{ value: "Today", fill: "var(--text-muted)", fontSize: 10, fontFamily: ff }} />}
              <Line dataKey="actual" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366f1" }} connectNulls={false} name="actual" />
              <Line dataKey="forecast" stroke="#818cf8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="forecast" />
              <Line dataKey="upperBound" stroke="rgba(129,140,248,.25)" strokeWidth={1} dot={false} name="upperBound" />
              <Line dataKey="lowerBound" stroke="rgba(129,140,248,.25)" strokeWidth={1} dot={false} name="lowerBound" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {points.length > 0 && (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Month", "Actual", "Forecast", "Lower Bound", "Upper Bound", "Type"].map((h, i) => (
                  <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 0 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((r, i) => (
                <tr key={i} style={{ borderBottom: i < points.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.month}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700 }}>{r.actual !== null ? `${cur} ${fmt(r.actual)}` : "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#818cf8" }}>{cur} {fmt(r.forecast)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{cur} {fmt(r.lowerBound)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{cur} {fmt(r.upperBound)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    {r.actual !== null
                      ? <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(99,102,241,.1)", color: "#6366f1" }}>Actual</span>
                      : <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(129,140,248,.1)", color: "#818cf8" }}>Forecast</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
