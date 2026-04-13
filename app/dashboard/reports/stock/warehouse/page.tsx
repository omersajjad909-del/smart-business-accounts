"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface WarehouseRow { warehouseName: string; itemName: string; category: string; qty: number; value: number; reorderLevel: number; }
interface WarehouseSummary { name: string; totalItems: number; totalValue: number; lowStockCount: number; }

export default function WarehouseStockPage() {
  const user = getCurrentUser();
  const [rows, setRows]         = useState<WarehouseRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState("all");
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch("/api/reports/stock/warehouse", { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setRows(d.rows || []); setWarehouses(d.warehouses || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const filtered = selected === "all" ? rows : rows.filter(r => r.warehouseName === selected);

  const inp: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Warehouse-wise Stock</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Stock distribution across warehouses / godowns</p>
        </div>
        <select value={selected} onChange={e => setSelected(e.target.value)} style={inp}>
          <option value="all">All Warehouses</option>
          {warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
        </select>
      </div>

      {/* Warehouse summary cards */}
      {warehouses.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 20 }}>
          {warehouses.map((w, i) => (
            <div key={i} onClick={() => setSelected(selected === w.name ? "all" : w.name)}
              style={{ borderRadius: 12, padding: "16px 18px", background: selected === w.name ? "rgba(99,102,241,.1)" : "var(--panel-bg)", border: `1px solid ${selected === w.name ? "rgba(99,102,241,.4)" : "var(--border)"}`, cursor: "pointer" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🏭 {w.name}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#818cf8", marginBottom: 4 }}>{cur} {fmt(w.totalValue)}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{w.totalItems} items {w.lowStockCount > 0 && <span style={{ color: "#f87171" }}>• {w.lowStockCount} low stock</span>}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 700 }}>
          {selected === "all" ? "All Warehouses" : selected} — {filtered.length} items
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Item", "Category", "Warehouse", "Qty", "Value", "Reorder Level", "Status"].map((h, i) => (
                <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 2 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🏭</div>No stock data found</td></tr>
            : filtered.map((r, i) => {
              const isLow = r.reorderLevel > 0 && r.qty <= r.reorderLevel;
              return (
                <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600 }}>{r.itemName}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--text-muted)" }}>{r.category || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#818cf8" }}>{r.warehouseName}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: isLow ? "#f87171" : "var(--text-primary)" }}>{fmt(r.qty)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.value)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.reorderLevel > 0 ? fmt(r.reorderLevel) : "—"}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right" }}>
                    {isLow ? <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(248,113,113,.1)", color: "#f87171" }}>Low Stock</span>
                    : <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(52,211,153,.1)", color: "#34d399" }}>OK</span>}
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
