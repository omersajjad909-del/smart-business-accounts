"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

export default function TradingStockControlPage() {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [outward, setOutward] = useState<OutwardLite[]>([]);

  useEffect(() => {
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
  }, []);

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
          <Link href="/dashboard/inventory" style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(245,158,11,.14)", border: "1px solid rgba(245,158,11,.24)", color: "#f59e0b", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            Inventory Master
          </Link>
          <Link href="/dashboard/outward" style={{ padding: "10px 16px", borderRadius: 10, background: "#f59e0b", color: "#1a1305", textDecoration: "none", fontSize: 13, fontWeight: 800 }}>
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
                {["Item", "Unit", "Qty", "Value"].map((header) => (
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
                </tr>
              ))}
              {stock.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>No stock report data available.</td>
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
    </div>
  );
}
