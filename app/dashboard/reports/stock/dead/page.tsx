"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface DeadRow { itemName: string; category: string; stockQty: number; stockValue: number; lastSaleDate?: string; daysSinceLastSale: number; purchaseDate?: string; }

export default function DeadStockPage() {
  const user = getCurrentUser();
  const [data, setData]         = useState<DeadRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [threshold, setThreshold] = useState("90");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/stock/dead?threshold=${threshold}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [threshold]);

  const totalValue = data.reduce((s, r) => s + r.stockValue, 0);
  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Dead Stock Report</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Items with no movement — capital locked in unsold inventory</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No movement for:</span>
          <select value={threshold} onChange={e => setThreshold(e.target.value)} style={inp}>
            <option value="30">30+ days</option>
            <option value="60">60+ days</option>
            <option value="90">90+ days</option>
            <option value="180">180+ days</option>
            <option value="365">1+ year</option>
          </select>
        </div>
      </div>

      {/* Alert banner */}
      {totalValue > 0 && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(248,113,113,.07)", border: "1px solid rgba(248,113,113,.2)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>Dead Stock Value: {cur} {fmt(totalValue)}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{data.length} items with no movement in {threshold}+ days — consider discounting or liquidating</div>
          </div>
        </div>
      )}

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Item", "Category", "Stock Qty", "Stock Value", "Days Without Sale", "Last Sale", "Action"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : data.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>No dead stock found — great inventory management!
              </td></tr>
            ) : data.sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale).map((r, i) => (
              <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.itemName}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)" }}>{r.category || "—"}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{fmt(r.stockQty)}</td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#f87171" }}>{cur} {fmt(r.stockValue)}</td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: r.daysSinceLastSale > 180 ? "#f87171" : r.daysSinceLastSale > 90 ? "#fbbf24" : "var(--text-muted)" }}>{r.daysSinceLastSale}d</span>
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.lastSaleDate ? new Date(r.lastSaleDate).toLocaleDateString() : "Never sold"}</td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(248,113,113,.1)", color: "#f87171" }}>Liquidate</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
