"use client";

import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import DateInput from "@/app/dashboard/reports/_components/DateInput";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";

type Item = { id: string; name: string; description?: string | null };
type Row  = { date: string; type: string; party: string; inQty: number; outQty: number; balanceQty: number };

function typeBadge(type: string) {
  const map: Record<string, { bg: string; color: string }> = {
    OPENING:  { bg: "rgba(148,163,184,.14)", color: "#94a3b8" },
    PURCHASE: { bg: "rgba(16,185,129,.14)",  color: "#34d399" },
    SALE:     { bg: "rgba(245,158,11,.14)",  color: "#fbbf24" },
    RETURN:   { bg: "rgba(99,102,241,.14)",  color: "#a5b4fc" },
    ADJUST:   { bg: "rgba(239,68,68,.14)",   color: "#f87171" },
    TRANSFER: { bg: "rgba(59,130,246,.14)",  color: "#60a5fa" },
  };
  const s = map[type?.toUpperCase()] || { bg: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.5)" };
  return (
    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 5, fontSize: 10, fontWeight: 800, letterSpacing: ".06em", background: s.bg, color: s.color, border: `1px solid ${s.color}30`, fontFamily: ff }}>
      {type}
    </span>
  );
}

export default function StockLedgerPage() {
  const { isMobile } = useResponsive();
  const today = new Date().toISOString().slice(0, 10);
  const [items,  setItems]  = useState<Item[]>([]);
  const [itemId, setItemId] = useState("");
  const [from,   setFrom]   = useState("2025-01-01");
  const [to,     setTo]     = useState(today);
  const [rows,   setRows]   = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/items-new")
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []));
  }, []);

  async function loadLedger() {
    if (!itemId) { toast.error("Please select an item first"); return; }
    setLoading(true);
    const user = getCurrentUser();
    try {
      const res = await fetch(`/api/reports/stock-ledger?itemId=${itemId}&from=${from}&to=${to}`, {
        headers: { "x-user-role": user?.role || "ADMIN" },
      });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch { toast.error("Failed to load ledger"); }
    finally  { setLoading(false); }
  }

  const nonOpening = rows.filter(r => r.type !== "OPENING");
  const totalIn    = nonOpening.reduce((s, r) => s + r.inQty,  0);
  const totalOut   = nonOpening.reduce((s, r) => s + r.outQty, 0);
  const finalBal   = rows.length > 0 ? rows[rows.length - 1].balanceQty : 0;
  const selectedItem = items.find(i => i.id === itemId);

  const formatDate = (iso: string) => {
    if (!iso || iso.length < 10) return iso;
    const [y, m, d] = iso.split("-");
    return `${d}-${m}-${y}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080e1b", color: "#e2e8f0", fontFamily: ff, padding: isMobile ? "15px 14px" : "28px 32px" }}>
      <style>{`
        .sl-row:hover td { background: rgba(99,102,241,.04) !important; }
        .sl-opening td  { opacity: .6; }
        select:focus, input:focus { outline: none; }
        .sl-show-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .sl-show-btn { transition: all .12s; }
        .sl-sel::-webkit-scrollbar { width: 4px; }
        .sl-sel::-webkit-scrollbar-thumb { background: rgba(99,102,241,.3); border-radius: 4px; }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <span>Reports</span>
          <span style={{ color: "rgba(255,255,255,.15)" }}>›</span>
          <span style={{ color: "#a5b4fc" }}>Stock Ledger</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-.02em", lineHeight: 1.1, margin: 0 }}>
              Item Stock Ledger
            </h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 5, margin: "5px 0 0" }}>
              Full movement history — IN / OUT / balance per transaction
            </p>
          </div>
          {selectedItem && hasLoaded && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", borderRadius: 10, padding: "7px 14px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#c7d2fe" }}>{selectedItem.name}</span>
              {selectedItem.description && <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{selectedItem.description}</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Card ── */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 20px", marginBottom: 20, display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
        {/* Item select */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: "1 1 260px", minWidth: 220 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.38)", letterSpacing: ".07em", textTransform: "uppercase" }}>Select Item</label>
          <select className="sl-sel" value={itemId} onChange={e => setItemId(e.target.value)}
            style={{ background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 9, padding: "9px 12px", color: itemId ? "#e2e8f0" : "rgba(255,255,255,.35)", fontSize: 13, fontFamily: ff, cursor: "pointer", appearance: "auto" }}>
            <option value="">— Choose item —</option>
            {items.map(i => (
              <option key={i.id} value={i.id} style={{ background: "#1e293b" }}>
                {i.name}{i.description ? ` (${i.description})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* From date */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.38)", letterSpacing: ".07em", textTransform: "uppercase" }}>From Date</label>
          <DateInput value={from} onChange={setFrom}
            style={{ background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 9, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, fontFamily: ff, width: 130 }} />
        </div>

        {/* To date */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.38)", letterSpacing: ".07em", textTransform: "uppercase" }}>To Date</label>
          <DateInput value={to} onChange={setTo}
            style={{ background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 9, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, fontFamily: ff, width: 130 }} />
        </div>

        {/* Show button */}
        <button className="sl-show-btn" onClick={loadLedger} disabled={loading}
          style={{ padding: "10px 26px", borderRadius: 10, background: loading ? "rgba(99,102,241,.5)" : "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "#fff", fontSize: 13, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: ff, flexShrink: 0, boxShadow: "0 3px 14px rgba(99,102,241,.28)", display: "flex", alignItems: "center", gap: 8, letterSpacing: "-.01em" }}>
          {loading ? (
            <>
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
              Loading…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Show Ledger
            </>
          )}
        </button>
      </div>

      {/* ── Summary KPI cards ── */}
      {hasLoaded && !loading && rows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total IN",     value: totalIn.toLocaleString(),    color: "#34d399", bg: "rgba(16,185,129,.09)",  border: "rgba(16,185,129,.2)",  icon: "▲" },
            { label: "Total OUT",    value: totalOut.toLocaleString(),   color: "#f87171", bg: "rgba(239,68,68,.09)",   border: "rgba(239,68,68,.2)",   icon: "▼" },
            { label: "Net Balance",  value: finalBal.toLocaleString(),   color: "#818cf8", bg: "rgba(99,102,241,.1)",   border: "rgba(99,102,241,.25)", icon: "=" },
            { label: "Transactions", value: String(nonOpening.length),   color: "#e2e8f0", bg: "rgba(255,255,255,.04)", border: "rgba(255,255,255,.1)",  icon: "#" },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 12, padding: isMobile ? "12px 10px" : "14px 16px" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", letterSpacing: ".09em", textTransform: "uppercase", marginBottom: 6, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 11, color: k.color, fontWeight: 900 }}>{k.icon}</span>
                {k.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: k.color, letterSpacing: "-.02em", lineHeight: 1 }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: ff }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,.04)", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              {(["DATE", "PARTY / DESCRIPTION", "TYPE", "IN (+)", "OUT (−)", "BALANCE"] as string[]).map((h, i) => (
                <th key={h} style={{
                  padding: "11px 16px",
                  fontSize: 10, fontWeight: 700, letterSpacing: ".07em", color: "rgba(255,255,255,.4)",
                  textAlign: i >= 3 ? "right" : "left",
                  borderRight: i < 5 ? "1px solid rgba(255,255,255,.05)" : "none",
                  whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "52px 0", textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "rgba(255,255,255,.3)" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2.5px solid rgba(99,102,241,.25)", borderTopColor: "#6366f1", animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: 13 }}>Fetching ledger…</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "60px 0", textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "rgba(255,255,255,.22)" }}>
                    <div style={{ fontSize: 40, opacity: 0.5 }}>📊</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {hasLoaded ? "No transactions in this period" : "Select an item and click Show Ledger"}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.18)" }}>
                      {hasLoaded ? "Try adjusting the date range" : ""}
                    </div>
                  </div>
                </td>
              </tr>
            ) : rows.map((r, i) => {
              const isOpening = r.type === "OPENING";
              return (
                <tr key={i} className={`sl-row${isOpening ? " sl-opening" : ""}`}
                  style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <td style={{ padding: "11px 16px", fontSize: 12, fontWeight: 600, color: isOpening ? "rgba(255,255,255,.4)" : "#c7d2fe", borderRight: "1px solid rgba(255,255,255,.04)", whiteSpace: "nowrap", fontStyle: isOpening ? "italic" : "normal", background: "transparent" }}>
                    {formatDate(r.date)}
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: 12, color: isOpening ? "rgba(255,255,255,.35)" : "#e2e8f0", borderRight: "1px solid rgba(255,255,255,.04)", fontStyle: isOpening ? "italic" : "normal", background: "transparent" }}>
                    {r.party}
                  </td>
                  <td style={{ padding: "11px 16px", borderRight: "1px solid rgba(255,255,255,.04)", background: "transparent" }}>
                    {typeBadge(r.type)}
                  </td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: r.inQty ? "#34d399" : "rgba(255,255,255,.2)", borderRight: "1px solid rgba(255,255,255,.04)", background: "transparent" }}>
                    {r.inQty ? `+${r.inQty.toLocaleString()}` : "—"}
                  </td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: r.outQty ? "#f87171" : "rgba(255,255,255,.2)", borderRight: "1px solid rgba(255,255,255,.04)", background: "transparent" }}>
                    {r.outQty ? `−${r.outQty.toLocaleString()}` : "—"}
                  </td>
                  <td style={{ padding: "11px 16px", textAlign: "right", fontSize: 14, fontWeight: 800, color: "#e2e8f0", background: "rgba(255,255,255,.025)" }}>
                    {r.balanceQty.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer totals */}
          {!loading && rows.length > 0 && (
            <tfoot>
              <tr style={{ background: "rgba(99,102,241,.08)", borderTop: "1px solid rgba(99,102,241,.2)" }}>
                <td colSpan={3} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: "right" }}>
                  Current Period Totals
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 14, fontWeight: 800, color: "#34d399", borderLeft: "1px solid rgba(255,255,255,.06)" }}>
                  +{totalIn.toLocaleString()}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 14, fontWeight: 800, color: "#f87171", borderLeft: "1px solid rgba(255,255,255,.06)" }}>
                  −{totalOut.toLocaleString()}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 18, fontWeight: 900, color: "#818cf8", background: "rgba(99,102,241,.12)", borderLeft: "1px solid rgba(99,102,241,.2)" }}>
                  {finalBal.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
