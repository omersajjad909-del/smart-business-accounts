"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

type Row = { itemId: string; itemName: string; unit: string; description: string; stockQty: number; stockValue: number };

export default function StockReportPage() {
  const router = useRouter();
  const [rows, setRows]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState<"all"|"available"|"nill">("all");
  const [visible, setVisible] = useState(false);

  const user = getCurrentUser();
  const h = () => ({ "x-user-id": user?.id||"", "x-user-role": user?.role||"", "x-company-id": user?.companyId||"" });

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    fetch("/api/reports/stock", { credentials: "include", headers: h() })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function close() {
    setVisible(false);
    setTimeout(() => router.back(), 260);
  }

  const filtered = rows.filter(r => {
    if (search && !r.itemName.toLowerCase().includes(search.toLowerCase())) return false;
    if (status === "available" && r.stockQty <= 0) return false;
    if (status === "nill"      && r.stockQty >  0) return false;
    return true;
  });

  const totalQty   = filtered.reduce((s, r) => s + r.stockQty,   0);
  const totalValue = filtered.reduce((s, r) => s + r.stockValue, 0);
  const available  = rows.filter(r => r.stockQty > 0).length;
  const nill       = rows.filter(r => r.stockQty <= 0).length;

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)",
          opacity: visible ? 1 : 0, transition: "opacity .25s ease",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1001,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 20px", pointerEvents: "none",
      }}>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 960, maxHeight: "90vh",
            background: "var(--bg-primary, #0f1629)",
            border: "1px solid var(--border, rgba(255,255,255,.1))",
            borderRadius: 20, display: "flex", flexDirection: "column",
            overflow: "hidden", pointerEvents: "all",
            boxShadow: "0 32px 80px rgba(0,0,0,.6)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(32px)",
            transition: "opacity .25s ease, transform .25s ease",
            fontFamily: ff,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--border, rgba(255,255,255,.08))", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(129,140,248,.15)", border: "1px solid rgba(129,140,248,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📦</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary, white)" }}>Inventory Stock Report</div>
                <div style={{ fontSize: 11, color: "var(--text-muted, rgba(255,255,255,.4))", marginTop: 1 }}>Current stock levels and inventory value</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => window.print()}
                style={{ padding: "7px 14px", borderRadius: 9, background: "transparent", border: "1px solid var(--border, rgba(255,255,255,.1))", color: "var(--text-muted, rgba(255,255,255,.5))", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff, display: "flex", alignItems: "center", gap: 6 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print
              </button>
              <button onClick={close} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.2)", color: "#f87171", fontSize: 16, cursor: "pointer", fontFamily: ff, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ overflowY: "auto", flex: 1 }}>

            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, padding: "16px 24px 0" }}>
              {[
                { label: "Total Items",   val: rows.length, color: "#818cf8", icon: "📦" },
                { label: "In Stock",      val: available,   color: "#34d399", icon: "✅" },
                { label: "Out of Stock",  val: nill,        color: "#f87171", icon: "⚠️" },
              ].map(k => (
                <div key={k.label} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{k.icon}</span>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted, rgba(255,255,255,.4))", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>{k.val}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 10, padding: "14px 24px", flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search item name…"
                style={{ flex: "1 1 200px", minWidth: 0, padding: "8px 14px", borderRadius: 9, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "var(--text-primary, white)", fontSize: 13, outline: "none", fontFamily: ff }}
              />
              <div style={{ display: "flex", borderRadius: 9, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)" }}>
                {([["all","All"],["available","In Stock"],["nill","Out"]] as const).map(([v,l]) => (
                  <button key={v} onClick={() => setStatus(v)} style={{
                    padding: "8px 14px", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff,
                    background: status === v ? (v === "available" ? "#34d399" : v === "nill" ? "#f87171" : "#6366f1") : "rgba(255,255,255,.04)",
                    color: status === v ? "white" : "rgba(255,255,255,.45)",
                  }}>{l}</button>
                ))}
              </div>
              {(search || status !== "all") && (
                <button onClick={() => { setSearch(""); setStatus("all"); }} style={{ padding: "8px 14px", borderRadius: 9, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.25)", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>Reset</button>
              )}
            </div>

            {/* Table */}
            <div style={{ margin: "0 24px 24px", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}>
                    {["Item Name", "Unit", "Stock Qty", "Inventory Value"].map((h, i) => (
                      <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13 }}>Loading inventory…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 48, textAlign: "center" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)", fontWeight: 600 }}>No items found</div>
                    </td></tr>
                  ) : filtered.map((r, i) => (
                    <tr key={r.itemId} style={{ borderBottom: "1px solid rgba(255,255,255,.05)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.01)", transition: "background .15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,.01)")}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.85)" }}>{r.itemName}</div>
                        {r.description && <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{r.description}</div>}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "rgba(255,255,255,.4)", fontWeight: 600 }}>{r.unit}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 800, background: r.stockQty > 0 ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)", color: r.stockQty > 0 ? "#34d399" : "#f87171", border: `1px solid ${r.stockQty > 0 ? "rgba(52,211,153,.25)" : "rgba(248,113,113,.25)"}` }}>
                          {fmt(r.stockQty)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#818cf8" }}>{fmt(r.stockValue)}</td>
                    </tr>
                  ))}
                </tbody>
                {!loading && filtered.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: "1px solid rgba(255,255,255,.1)", background: "rgba(99,102,241,.06)" }}>
                      <td colSpan={2} style={{ padding: "13px 14px", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                        Grand Total — {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                      </td>
                      <td style={{ padding: "13px 14px", textAlign: "right", fontSize: 15, fontWeight: 900, color: "#34d399" }}>{fmt(totalQty)}</td>
                      <td style={{ padding: "13px 14px", textAlign: "right", fontSize: 15, fontWeight: 900, color: "#818cf8" }}>{fmt(totalValue)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
