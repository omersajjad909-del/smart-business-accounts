"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number, d = 0) { return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }

interface ValuationRow { itemName: string; category: string; stockQty: number; avgCost: number; fifoCost: number; totalValueAvg: number; totalValueFifo: number; marketPrice: number; }

export default function StockValuationPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<ValuationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod]   = useState<"avg" | "fifo">("avg");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/stock/valuation?method=${method}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [method]);

  const totalValue = data.reduce((s, r) => s + (method === "avg" ? r.totalValueAvg : r.totalValueFifo), 0);

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Stock Valuation</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Total inventory value — FIFO or Weighted Average method</p>
        </div>
        <div style={{ display: "flex", borderRadius: 9, overflow: "hidden", border: "1px solid var(--border)" }}>
          {(["avg", "fifo"] as const).map(v => (
            <button key={v} onClick={() => setMethod(v)} style={{ padding: "7px 18px", background: method === v ? "#6366f1" : "var(--panel-bg)", border: "none", color: method === v ? "white" : "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
              {v === "avg" ? "Weighted Avg" : "FIFO"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20, padding: "18px 22px", borderRadius: 14, background: "rgba(129,140,248,.07)", border: "1px solid rgba(129,140,248,.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Total Inventory Value ({method === "avg" ? "Weighted Average" : "FIFO"})</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#818cf8" }}>{cur} {fmt(totalValue)}</div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 260 }}>
          {method === "avg" ? "Weighted Average: (Opening Stock × Cost + Purchases × Cost) ÷ Total Units" : "FIFO: First purchased stock is first to be sold — oldest cost used first"}
        </div>
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Item", "Category", "Stock Qty", method === "avg" ? "Avg Cost/Unit" : "FIFO Cost/Unit", "Total Value", "Market Price", "Gain/Loss"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : data.length === 0 ? <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>No stock data found</td></tr>
            : data.map((r, i) => {
              const cost  = method === "avg" ? r.avgCost : r.fifoCost;
              const value = method === "avg" ? r.totalValueAvg : r.totalValueFifo;
              const marketVal = r.marketPrice * r.stockQty;
              const gainLoss  = marketVal - value;
              return (
                <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.itemName}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)" }}>{r.category || "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{fmt(r.stockQty)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(cost, 2)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#818cf8" }}>{cur} {fmt(value)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.marketPrice > 0 ? `${cur} ${fmt(r.marketPrice, 2)}` : "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: gainLoss >= 0 ? "#34d399" : "#f87171" }}>
                    {r.marketPrice > 0 ? `${gainLoss >= 0 ? "+" : ""}${cur} ${fmt(Math.abs(gainLoss))}` : "—"}
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
