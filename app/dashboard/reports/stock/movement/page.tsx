"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface MovementRow { itemName: string; category: string; qtySold: number; qtyPurchased: number; turnoverDays: number; movementTag: "fast" | "slow" | "dead"; lastSaleDate?: string; stockQty: number; }

const TAG: Record<string, { label: string; color: string; bg: string }> = {
  fast: { label: "Fast Moving 🔥", color: "#34d399", bg: "rgba(52,211,153,.1)" },
  slow: { label: "Slow Moving ⚠️", color: "#fbbf24", bg: "rgba(251,191,36,.1)" },
  dead: { label: "Dead Stock 💀",  color: "#f87171", bg: "rgba(248,113,113,.1)" },
};

export default function StockMovementPage() {
  const user = getCurrentUser();
  const [data, setData]       = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"all" | "fast" | "slow" | "dead">("all");
  const [period, setPeriod]   = useState("90");

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch(`/api/reports/stock/movement?days=${period}`, { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setData(d.rows || []); setLoading(false); }).catch(() => setLoading(false)); }, [period]);

  const filtered = filter === "all" ? data : data.filter(r => r.movementTag === filter);
  const counts   = { fast: data.filter(r => r.movementTag === "fast").length, slow: data.filter(r => r.movementTag === "slow").length, dead: data.filter(r => r.movementTag === "dead").length };

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Fast / Slow Moving Items</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Inventory intelligence — identify dead capital before it kills cash flow</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
          <option value="30">Last 30 days</option>
          <option value="60">Last 60 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 6 months</option>
        </select>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {([["all", "All Items", "var(--text-muted)", "var(--panel-bg)", "var(--border)"], ["fast", `Fast Moving (${counts.fast})`, "#34d399", "rgba(52,211,153,.1)", "rgba(52,211,153,.3)"], ["slow", `Slow Moving (${counts.slow})`, "#fbbf24", "rgba(251,191,36,.1)", "rgba(251,191,36,.3)"], ["dead", `Dead Stock (${counts.dead})`, "#f87171", "rgba(248,113,113,.1)", "rgba(248,113,113,.3)"]] as const).map(([v, label, color, bg, border]) => (
          <button key={v} onClick={() => setFilter(v as any)} style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${filter === v ? border : "var(--border)"}`, background: filter === v ? bg : "transparent", color: filter === v ? color : "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>{label}</button>
        ))}
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Item", "Category", "Qty Sold", "Stock Qty", "Turnover (days)", "Last Sale", "Movement"].map((h, i) => (
                <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>No items found
              </td></tr>
            ) : filtered.map((r, i) => {
              const tag = TAG[r.movementTag];
              return (
                <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.itemName}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)" }}>{r.category || "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{fmt(r.qtySold)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: r.stockQty === 0 ? "#f87171" : "var(--text-primary)" }}>{fmt(r.stockQty)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{r.turnoverDays > 0 ? `${r.turnoverDays}d` : "—"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.lastSaleDate ? new Date(r.lastSaleDate).toLocaleDateString() : "Never"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: tag.bg, color: tag.color }}>{tag.label}</span>
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
