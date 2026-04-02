"use client";
import { useEffect, useState, useMemo } from "react";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

const FONT = "'Outfit','Inter',sans-serif";

interface StockRow {
  itemId: string;
  name: string;
  qty: number;
  code?: string;
  unit?: string;
  rate?: number;
  minStock?: number;
}

type StockStatus = "OK" | "LOW" | "OUT";

function getStatus(qty: number, minStock: number): StockStatus {
  if (qty <= 0) return "OUT";
  if (qty <= minStock) return "LOW";
  return "OK";
}

const STATUS_STYLE: Record<StockStatus, { bg: string; color: string; label: string }> = {
  OK:  { bg: "rgba(34,197,94,0.12)",  color: "#4ade80",  label: "In Stock"  },
  LOW: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24",  label: "Low Stock" },
  OUT: { bg: "rgba(239,68,68,0.12)",  color: "#f87171",  label: "Out of Stock" },
};

export default function InventoryPage() {
  const [stock, setStock]     = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<"ALL" | StockStatus>("ALL");
  const [sortBy, setSortBy]   = useState<"name" | "qty" | "value">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const user = getCurrentUser();
    const headers: Record<string, string> = user ? { "x-user-id": user.id, "x-user-role": user.role ?? "", "x-company-id": user.companyId || "" } : {};
    setLoading(true);
    fetch("/api/inventory", { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setStock(Array.isArray(data) ? data : []))
      .catch(() => setStock([]))
      .finally(() => setLoading(false));
  }, []);

  const enriched = useMemo(() => stock.map(s => ({
    ...s,
    minStock: s.minStock ?? 0,
    rate:     s.rate     ?? 0,
    status:   getStatus(s.qty, s.minStock ?? 0),
    value:    s.qty * (s.rate ?? 0),
  })), [stock]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filter !== "ALL") list = list.filter(s => s.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s.code || "").toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      let va: number | string = a[sortBy === "value" ? "value" : sortBy === "qty" ? "qty" : "name"];
      let vb: number | string = b[sortBy === "value" ? "value" : sortBy === "qty" ? "qty" : "name"];
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(String(vb)) : String(vb).localeCompare(va);
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return list;
  }, [enriched, filter, search, sortBy, sortDir]);

  const kpis = useMemo(() => ({
    total:    enriched.length,
    inStock:  enriched.filter(s => s.status === "OK").length,
    low:      enriched.filter(s => s.status === "LOW").length,
    out:      enriched.filter(s => s.status === "OUT").length,
    totalVal: enriched.reduce((s, i) => s + i.value, 0),
  }), [enriched]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const fmt  = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtK = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : fmt(n);

  const th = (col?: typeof sortBy): React.CSSProperties => ({
    padding: "11px 14px", textAlign: "left", fontSize: 11, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: 0.7, borderBottom: "1px solid var(--border)",
    fontWeight: 600, cursor: col ? "pointer" : "default", userSelect: "none",
    whiteSpace: "nowrap",
  });
  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text-primary)" };

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col ? <span style={{ marginLeft: 4, fontSize: 10 }}>{sortDir === "asc" ? "▲" : "▼"}</span> : <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.3 }}>▲</span>;

  const FILTER_TABS: Array<"ALL" | StockStatus> = ["ALL", "OK", "LOW", "OUT"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", padding: "32px 28px", fontFamily: FONT, color: "var(--text-primary)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Inventory</h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Real-time stock levels across all items</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/dashboard/warehouses" style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 16px", fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontFamily: FONT }}>
            🏭 Warehouses
          </Link>
          <Link href="/dashboard/grn" style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 16px", fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontFamily: FONT }}>
            📥 GRN
          </Link>
          <Link href="/dashboard/barcode" style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: FONT }}>
            📦 Barcodes
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Items",    value: kpis.total,    color: "#6366f1" },
          { label: "In Stock",       value: kpis.inStock,  color: "#4ade80" },
          { label: "Low Stock",      value: kpis.low,      color: "#fbbf24" },
          { label: "Out of Stock",   value: kpis.out,      color: "#f87171" },
          { label: "Stock Value",    value: fmtK(kpis.totalVal), color: "#a5b4fc" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Low stock alert */}
      {kpis.low > 0 && (
        <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 12, padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <span style={{ fontWeight: 700, color: "#fbbf24", fontSize: 13 }}>{kpis.low} item{kpis.low > 1 ? "s" : ""} at or below reorder level</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 12 }}>Consider raising purchase orders</span>
          </div>
          <button onClick={() => setFilter("LOW")}
            style={{ marginLeft: "auto", background: "transparent", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#fbbf24", cursor: "pointer", fontFamily: FONT }}>
            Show Low Stock
          </button>
        </div>
      )}

      {kpis.out > 0 && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <div>
            <span style={{ fontWeight: 700, color: "#f87171", fontSize: 13 }}>{kpis.out} item{kpis.out > 1 ? "s" : ""} out of stock</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 12 }}>Immediate reorder needed</span>
          </div>
          <button onClick={() => setFilter("OUT")}
            style={{ marginLeft: "auto", background: "transparent", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#f87171", cursor: "pointer", fontFamily: FONT }}>
            Show Out of Stock
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 3, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 3 }}>
          {FILTER_TABS.map(f => {
            const labels: Record<string, string> = { ALL: "All", OK: "In Stock", LOW: "Low Stock", OUT: "Out of Stock" };
            const colors: Record<string, string> = { OK: "#4ade80", LOW: "#fbbf24", OUT: "#f87171" };
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                background: filter === f ? (f === "ALL" ? "#6366f1" : colors[f]) : "transparent",
                color: filter === f ? "#fff" : "var(--text-muted)",
                border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
              }}>{labels[f]}{f !== "ALL" && ` (${enriched.filter(s => s.status === f).length})`}</button>
            );
          })}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item name or code…"
          style={{ flex: 1, minWidth: 200, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 14px", color: "var(--text-primary)", fontSize: 13, fontFamily: FONT, outline: "none" }} />
      </div>

      {/* Table */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)", fontSize: 15 }}>Loading inventory…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)", fontSize: 15 }}>
            {search || filter !== "ALL" ? "No items match your filter." : "No inventory items found. Add items via Purchase Invoice or GRN."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th("name")} onClick={() => toggleSort("name")}>Item Name <SortIcon col="name" /></th>
                <th style={{ ...th(), width: 100 }}>Code</th>
                <th style={{ ...th(), width: 80 }}>Unit</th>
                <th style={{ ...th("qty"), textAlign: "right", width: 120 }} onClick={() => toggleSort("qty")}>
                  Stock Qty <SortIcon col="qty" />
                </th>
                <th style={{ ...th(), textAlign: "right", width: 100 }}>Reorder Lvl</th>
                <th style={{ ...th("value"), textAlign: "right", width: 130 }} onClick={() => toggleSort("value")}>
                  Stock Value <SortIcon col="value" />
                </th>
                <th style={{ ...th(), width: 130, textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const statusStyle = STATUS_STYLE[s.status];
                const pct = s.minStock > 0 ? Math.min((s.qty / (s.minStock * 2)) * 100, 100) : 100;
                return (
                  <tr key={s.itemId} style={{ background: i % 2 === 1 ? "rgba(255,255,255,0.013)" : "transparent" }}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                    </td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>{s.code || "—"}</td>
                    <td style={{ ...td, fontSize: 12, color: "var(--text-muted)" }}>{s.unit || "pcs"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>
                      <div>{s.qty.toLocaleString()}</div>
                      {/* Stock bar */}
                      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 4, overflow: "hidden", minWidth: 60 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: s.status === "OK" ? "#4ade80" : s.status === "LOW" ? "#fbbf24" : "#f87171", borderRadius: 2 }} />
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                      {s.minStock > 0 ? s.minStock.toLocaleString() : "—"}
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600, color: "#a5b4fc" }}>
                      {s.rate > 0 ? fmt(s.value) : "—"}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusStyle.bg, color: statusStyle.color, letterSpacing: 0.3 }}>
                        {statusStyle.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "rgba(99,102,241,0.06)", borderTop: "1px solid var(--border)" }}>
                <td colSpan={5} style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                  Showing {filtered.length} of {enriched.length} items
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: "#a5b4fc", fontSize: 14 }}>
                  {fmt(filtered.reduce((s, i) => s + i.value, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
