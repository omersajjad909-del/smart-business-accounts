"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  fetchJson,
  formatDate,
  formatMoney,
  tradingBg,
  tradingBorder,
  tradingFont,
  tradingMuted,
  type OutwardLite,
  type StockRow,
  type TradingControlCenter,
} from "../_shared";

const REASONS = ["Physical Count", "Damaged / Broken", "Theft / Loss", "Found (surplus)", "Expired / Disposal", "Data Correction", "Other"];

export default function TradingStockControlPage() {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [outward, setOutward] = useState<OutwardLite[]>([]);
  const [adjModal, setAdjModal] = useState(false);
  const [adjItem, setAdjItem] = useState<StockRow | null>(null);
  const [adjQty, setAdjQty] = useState("");
  const [adjReason, setAdjReason] = useState(REASONS[0]);
  const [adjSaving, setAdjSaving] = useState(false);

  function loadData() {
    fetchJson<TradingControlCenter>("/api/trading/control-center", {
      summary: {},
      quotations: [],
      salesInvoices: [],
      purchaseOrders: [],
      purchaseInvoices: [],
      challans: [],
      saleReturns: [],
      outwards: [],
      grns: [],
      receipts: [],
      accounts: [],
      stock: [],
    }).then((result) => {
      setStock(result.stock || []);
      setOutward(result.outwards || []);
    });
  }

  useEffect(() => { loadData(); }, []);

  async function handleAdjust() {
    if (!adjItem || adjQty === "") return;
    setAdjSaving(true);
    try {
      const res = await fetch("/api/stock-adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "ADMIN" },
        body: JSON.stringify({ itemId: adjItem.itemId, physicalQty: Number(adjQty), reason: adjReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Adjustment failed");
      if (data.diff === 0) {
        toast("No change — physical count matches system.");
      } else {
        toast.success(`Stock adjusted by ${data.diff > 0 ? "+" : ""}${data.diff} units.`);
      }
      setAdjModal(false);
      setAdjItem(null);
      setAdjQty("");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Adjustment failed");
    } finally {
      setAdjSaving(false);
    }
  }

  const stockValue = useMemo(
    () => stock.reduce((sum, row) => sum + Number(row.stockValue || 0), 0),
    [stock]
  );
  const lowStock = useMemo(
    () => stock.filter((row) => Number(row.stockQty || 0) <= 5),
    [stock]
  );
  const deadStock = useMemo(
    () => stock.filter((row) => Number(row.stockQty || 0) <= 0),
    [stock]
  );
  const outwardQty = useMemo(
    () => outward.reduce((sum, row) => sum + (row.items || []).reduce((lineSum, line) => lineSum + Number(line.qty || 0), 0), 0),
    [outward]
  );

  return (
    <div style={{ padding: "28px 32px", fontFamily: tradingFont, color: "var(--text-primary)", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Stock Control</h1>
          <p style={{ fontSize: 13, color: tradingMuted, margin: 0 }}>
            Live stock position, shortage watch, and outward movement for trading inventory.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link prefetch={false} href="/dashboard/inventory" style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(245,158,11,.14)", border: "1px solid rgba(245,158,11,.24)", color: "#f59e0b", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            Inventory Master
          </Link>
          <button onClick={() => { setAdjItem(null); setAdjQty(""); setAdjReason(REASONS[0]); setAdjModal(true); }} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(167,139,250,.14)", border: "1px solid rgba(167,139,250,.24)", color: "#a78bfa", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Adjust Stock
          </button>
          <Link prefetch={false} href="/dashboard/outward" style={{ padding: "10px 16px", borderRadius: 10, background: "#f59e0b", color: "#1a1305", textDecoration: "none", fontSize: 13, fontWeight: 800 }}>
            New Outward
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Stock Items", value: stock.length, color: "#38bdf8" },
          { label: "Stock Value", value: formatMoney(stockValue), color: "#34d399" },
          { label: "Low Stock Watch", value: lowStock.length, color: "#f59e0b" },
          { label: "Outward Qty", value: outwardQty, color: "#a78bfa" },
        ].map((card) => (
          <div key={card.label} style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: tradingMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 14 }}>
        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Stock Position</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Item", "Unit", "Qty", "Value", ""].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: tradingMuted, borderBottom: `1px solid ${tradingBorder}` }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stock.slice(0, 12).map((row) => (
                <tr key={row.itemId}>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.itemName}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.unit || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: Number(row.stockQty || 0) <= 5 ? "#f59e0b" : "#38bdf8", fontWeight: 700 }}>{row.stockQty}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>{formatMoney(row.stockValue)}</td>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <button onClick={() => { setAdjItem(row); setAdjQty(String(row.stockQty)); setAdjModal(true); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(167,139,250,.14)", border: "1px solid rgba(167,139,250,.24)", color: "#a78bfa", cursor: "pointer", fontWeight: 700 }}>Adjust</button>
                  </td>
                </tr>
              ))}
              {stock.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>No stock report data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Low / Empty Stock</div>
            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              {lowStock.slice(0, 6).map((row) => (
                <div key={row.itemId} style={{ padding: "12px 14px", borderRadius: 12, background: Number(row.stockQty || 0) <= 0 ? "rgba(248,113,113,.08)" : "rgba(245,158,11,.08)", border: Number(row.stockQty || 0) <= 0 ? "1px solid rgba(248,113,113,.18)" : "1px solid rgba(245,158,11,.18)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontWeight: 700 }}>{row.itemName}</span>
                    <span style={{ color: Number(row.stockQty || 0) <= 0 ? "#f87171" : "#f59e0b", fontWeight: 800 }}>{row.stockQty}</span>
                  </div>
                  <div style={{ fontSize: 12, color: tradingMuted, marginTop: 4 }}>{row.unit || "Unit"} · {formatMoney(row.stockValue)}</div>
                </div>
              ))}
              {lowStock.length === 0 && <div style={{ color: "var(--text-muted)" }}>No stock shortage warnings right now.</div>}
            </div>
          </div>

          <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Recent Outward Movement</div>
            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              {outward.slice(0, 5).map((row) => (
                <div key={row.id} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--panel-bg)", border: `1px solid ${tradingBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontWeight: 700 }}>OUT-{row.outwardNo}</span>
                    <span style={{ color: "#a78bfa", fontWeight: 700 }}>{formatDate(row.date)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: tradingMuted, marginTop: 4 }}>{row.customer?.name || "-"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{row.vehicleNo || row.driverName || "No dispatch details"}</div>
                </div>
              ))}
              {outward.length === 0 && <div style={{ color: "var(--text-muted)" }}>No outward movement yet.</div>}
              {deadStock.length > 0 && <div style={{ fontSize: 12, color: "#f87171" }}>{deadStock.length} item(s) are already at zero or negative stock.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#13161f", border: "1px solid rgba(167,139,250,.25)", borderRadius: 22, padding: 28, width: 500, maxWidth: "95vw", fontFamily: tradingFont, boxShadow: "0 32px 80px rgba(0,0,0,.6)" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>
                  {adjItem ? "⚖️ Adjust Stock" : "📦 Select Item"}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: tradingMuted }}>
                  {adjItem ? `Updating: ${adjItem.itemName}` : "Choose which item to adjust"}
                </p>
              </div>
              <button onClick={() => { setAdjModal(false); setAdjItem(null); setAdjQty(""); }}
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: tradingMuted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
            </div>

            {/* Step 1 — Item picker */}
            {!adjItem ? (
              <div>
                <div style={{ maxHeight: 320, overflowY: "auto", display: "grid", gap: 8, paddingRight: 2 }}>
                  {stock.map((row) => {
                    const qty = Number(row.stockQty || 0);
                    const isEmpty = qty <= 0;
                    const isLow  = qty > 0 && qty <= 5;
                    const dotColor = isEmpty ? "#f87171" : isLow ? "#f59e0b" : "#34d399";
                    return (
                      <button key={row.itemId}
                        onClick={() => { setAdjItem(row); setAdjQty(String(row.stockQty)); }}
                        style={{ textAlign: "left", padding: "14px 16px", borderRadius: 12,
                          background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                          transition: "border-color .15s" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(167,139,250,.5)")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,.08)")}
                      >
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0, boxShadow: `0 0 8px ${dotColor}` }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{row.itemName}</div>
                          <div style={{ fontSize: 11, color: tradingMuted, marginTop: 2 }}>{row.unit || "—"}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: dotColor }}>{qty}</div>
                          <div style={{ fontSize: 10, color: tradingMuted }}>in stock</div>
                        </div>
                      </button>
                    );
                  })}
                  {stock.length === 0 && (
                    <div style={{ padding: "32px 0", textAlign: "center", color: tradingMuted, fontSize: 13 }}>No items found.</div>
                  )}
                </div>
              </div>
            ) : (
              /* Step 2 — Adjustment form */
              <div style={{ display: "grid", gap: 18 }}>

                {/* Item info bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.2)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#f1f5f9" }}>{adjItem.itemName}</div>
                    <div style={{ fontSize: 12, color: tradingMuted, marginTop: 3 }}>{adjItem.unit || "—"}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: tradingMuted, marginBottom: 2 }}>System Qty</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "#a78bfa", lineHeight: 1 }}>{adjItem.stockQty}</div>
                  </div>
                  <button onClick={() => { setAdjItem(null); setAdjQty(""); }}
                    style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: tradingMuted, fontSize: 11, cursor: "pointer" }}>
                    ← Change
                  </button>
                </div>

                {/* Physical count input */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: tradingMuted, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>
                    Physical Count (actual quantity you counted)
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setAdjQty(q => String(Math.max(0, Number(q || 0) - 1)))}
                      style={{ width: 40, height: 44, borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "#f1f5f9", fontSize: 20, cursor: "pointer", flexShrink: 0 }}>−</button>
                    <input autoFocus type="number" min={0} value={adjQty} onChange={e => setAdjQty(e.target.value)}
                      style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid rgba(167,139,250,.4)", background: "rgba(167,139,250,.08)", color: "#f1f5f9", fontSize: 22, fontWeight: 800, textAlign: "center", outline: "none", fontFamily: tradingFont }} />
                    <button onClick={() => setAdjQty(q => String(Number(q || 0) + 1))}
                      style={{ width: 40, height: 44, borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "#f1f5f9", fontSize: 20, cursor: "pointer", flexShrink: 0 }}>+</button>
                  </div>

                  {/* Quick set buttons */}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {[0, 5, 10, 25, 50, 100].map(n => (
                      <button key={n} onClick={() => setAdjQty(String(n))}
                        style={{ flex: 1, padding: "5px 0", borderRadius: 7, border: `1px solid ${adjQty === String(n) ? "rgba(167,139,250,.5)" : "rgba(255,255,255,.08)"}`, background: adjQty === String(n) ? "rgba(167,139,250,.15)" : "transparent", color: adjQty === String(n) ? "#a78bfa" : tradingMuted, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diff preview */}
                {adjQty !== "" && (() => {
                  const diff = Number(adjQty) - Number(adjItem.stockQty);
                  const isUp = diff > 0;
                  const isNone = diff === 0;
                  return (
                    <div style={{ padding: "12px 16px", borderRadius: 12, background: isNone ? "rgba(255,255,255,.04)" : isUp ? "rgba(52,211,153,.08)" : "rgba(248,113,113,.08)", border: `1px solid ${isNone ? "rgba(255,255,255,.08)" : isUp ? "rgba(52,211,153,.25)" : "rgba(248,113,113,.25)"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: tradingMuted }}>
                        {isNone ? "No change — counts match" : isUp ? "Stock will increase by" : "Stock will decrease by"}
                      </span>
                      {!isNone && (
                        <span style={{ fontSize: 20, fontWeight: 800, color: isUp ? "#34d399" : "#f87171" }}>
                          {isUp ? "+" : ""}{diff}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Reason */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: tradingMuted, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Reason</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {REASONS.map(r => (
                      <button key={r} onClick={() => setAdjReason(r)}
                        style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${adjReason === r ? "rgba(167,139,250,.5)" : "rgba(255,255,255,.08)"}`, background: adjReason === r ? "rgba(167,139,250,.15)" : "transparent", color: adjReason === r ? "#a78bfa" : tradingMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => { setAdjModal(false); setAdjItem(null); setAdjQty(""); }}
                style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: tradingMuted, cursor: "pointer", fontSize: 13 }}>
                Cancel
              </button>
              {adjItem && (
                <button onClick={handleAdjust} disabled={adjSaving || adjQty === ""}
                  style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", fontWeight: 800, border: "none", cursor: adjSaving || adjQty === "" ? "not-allowed" : "pointer", fontSize: 13, opacity: adjSaving || adjQty === "" ? 0.5 : 1 }}>
                  {adjSaving ? "Saving…" : "✓ Apply Adjustment"}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
