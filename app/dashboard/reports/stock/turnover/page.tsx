"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number, d = 0) { return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }

interface TurnoverRow { itemName: string; category: string; openingStock: number; closingStock: number; cogs: number; avgInventory: number; turnoverRatio: number; daysOnHand: number; }

export default function StockTurnoverPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<TurnoverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("year");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/stock/turnover?period=${period}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [period]);

  const avgTurnover = data.length > 0 ? data.reduce((s, r) => s + r.turnoverRatio, 0) / data.length : 0;
  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Stock Turnover Ratio</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Kitni baar stock bikta hai ek period mein — efficiency ka indicator</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div style={{ background: "rgba(129,140,248,.07)", border: "1px solid rgba(129,140,248,.2)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Avg Turnover Ratio</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#818cf8" }}>{fmt(avgTurnover, 2)}x</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Higher = better. Industry avg: 4–8x</div>
        </div>
        <div style={{ background: "rgba(52,211,153,.07)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Formula</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399", lineHeight: 1.6 }}>Turnover = COGS ÷ Avg Inventory</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Days on Hand = 365 ÷ Turnover Ratio</div>
        </div>
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Item", "Category", "COGS", "Avg Inventory", "Turnover Ratio", "Days on Hand", "Rating"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : data.length === 0 ? <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>No turnover data</td></tr>
            : [...data].sort((a, b) => b.turnoverRatio - a.turnoverRatio).map((r, i) => {
              const rating = r.turnoverRatio >= 8 ? { label: "Excellent ⭐", color: "#34d399", bg: "rgba(52,211,153,.1)" } : r.turnoverRatio >= 4 ? { label: "Good", color: "#818cf8", bg: "rgba(129,140,248,.1)" } : r.turnoverRatio >= 2 ? { label: "Average", color: "#fbbf24", bg: "rgba(251,191,36,.1)" } : { label: "Poor ⚠️", color: "#f87171", bg: "rgba(248,113,113,.1)" };
              return (
                <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.itemName}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)" }}>{r.category || "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.cogs)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.avgInventory)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 15, fontWeight: 900, color: rating.color }}>{fmt(r.turnoverRatio, 2)}x</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{fmt(r.daysOnHand)}d</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: rating.bg, color: rating.color }}>{rating.label}</span>
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
