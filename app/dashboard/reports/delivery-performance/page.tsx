"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface Row { driverOrRoute: string; totalDeliveries: number; onTimeCount: number; lateCount: number; failedCount: number; onTimeRatePct: number; avgDeliveryDays: number; }

export default function DeliveryPerformancePage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("month");
  const [groupBy, setGroupBy] = useState<"driver" | "route">("driver");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/delivery-performance?period=${period}&groupBy=${groupBy}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [period, groupBy]);

  const totals = { deliveries: data.reduce((s, r) => s + r.totalDeliveries, 0), onTime: data.reduce((s, r) => s + r.onTimeCount, 0), late: data.reduce((s, r) => s + r.lateCount, 0), failed: data.reduce((s, r) => s + r.failedCount, 0) };
  const overallOnTime = totals.deliveries > 0 ? (totals.onTime / totals.deliveries) * 100 : 0;

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Delivery Performance</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>On-time delivery rates by driver or route</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", borderRadius: 9, overflow: "hidden", border: "1px solid var(--border)" }}>
            {(["driver", "route"] as const).map(v => (
              <button key={v} onClick={() => setGroupBy(v)} style={{ padding: "7px 14px", background: groupBy === v ? "#6366f1" : "var(--panel-bg)", border: "none", color: groupBy === v ? "white" : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, textTransform: "capitalize" }}>{v}</button>
            ))}
          </div>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
            <option value="month">This Month</option><option value="quarter">This Quarter</option><option value="year">This Year</option>
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "On-Time Rate",     value: `${overallOnTime.toFixed(1)}%`, color: overallOnTime >= 90 ? "#34d399" : overallOnTime >= 70 ? "#fbbf24" : "#f87171" },
          { label: "Total Deliveries", value: fmt(totals.deliveries),          color: "#818cf8" },
          { label: "Late",             value: fmt(totals.late),                color: "#fbbf24" },
          { label: "Failed",           value: fmt(totals.failed),              color: "#f87171" },
        ].map((c, i) => (
          <div key={i} style={{ borderRadius: 12, padding: "16px 18px", background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {[groupBy === "driver" ? "Driver" : "Route", "Total", "On Time", "Late", "Failed", "On-Time Rate", "Avg Days"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 0 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : data.length === 0 ? <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🚚</div>No delivery data — add delivery info to invoices</td></tr>
            : [...data].sort((a, b) => b.onTimeRatePct - a.onTimeRatePct).map((r, i) => {
              const rateColor = r.onTimeRatePct >= 90 ? "#34d399" : r.onTimeRatePct >= 70 ? "#fbbf24" : "#f87171";
              return (
                <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>🚚 {r.driverOrRoute}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.totalDeliveries}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#34d399" }}>{r.onTimeCount}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: r.lateCount > 0 ? "#fbbf24" : "var(--text-muted)" }}>{r.lateCount || "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: r.failedCount > 0 ? "#f87171" : "var(--text-muted)" }}>{r.failedCount || "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: rateColor }}>{r.onTimeRatePct.toFixed(1)}%</span>
                      <div style={{ width: 70, height: 4, background: "var(--border)", borderRadius: 2 }}>
                        <div style={{ height: 4, borderRadius: 2, width: `${r.onTimeRatePct}%`, background: rateColor }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.avgDeliveryDays.toFixed(1)} days</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
