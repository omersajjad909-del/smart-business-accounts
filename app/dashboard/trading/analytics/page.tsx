"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchJson,
  formatMoney,
  normalizeStatus,
  sumLineAmount,
  tradingBg,
  tradingBorder,
  tradingFont,
  tradingMuted,
  type AccountLite,
  type DeliveryChallanLite,
  type PurchaseInvoiceLite,
  type PurchaseOrderLite,
  type SalesInvoiceLite,
  type StockRow,
  type TradingControlCenter,
} from "../_shared";

export default function TradingAnalyticsPage() {
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoiceLite[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderLite[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoiceLite[]>([]);
  const [challans, setChallans] = useState<DeliveryChallanLite[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);

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
      setSalesInvoices(result.salesInvoices || []);
      setPurchaseOrders(result.purchaseOrders || []);
      setPurchaseInvoices(result.purchaseInvoices || []);
      setChallans(result.challans || []);
      setStock(result.stock || []);
      setAccounts(result.accounts || []);
    });
  }, []);

  const totalSales = useMemo(() => salesInvoices.reduce((sum, entry) => sum + Number(entry.total || 0), 0), [salesInvoices]);
  const totalPurchases = useMemo(() => purchaseInvoices.reduce((sum, entry) => sum + Number(entry.total || 0), 0), [purchaseInvoices]);
  const stockValue = useMemo(() => stock.reduce((sum, entry) => sum + Number(entry.stockValue || 0), 0), [stock]);
  const averageSale = salesInvoices.length ? totalSales / salesInvoices.length : 0;
  const averagePurchase = purchaseInvoices.length ? totalPurchases / purchaseInvoices.length : 0;
  const pendingPoValue = useMemo(
    () => purchaseOrders.filter((entry) => normalizeStatus(entry.status) === "PENDING").reduce((sum, entry) => sum + sumLineAmount(entry.items), 0),
    [purchaseOrders]
  );
  const activeCustomers = useMemo(
    () => accounts.filter((entry) => normalizeStatus(entry.partyType) === "CUSTOMER").length,
    [accounts]
  );
  const deliveredRate = salesInvoices.length ? (challans.filter((entry) => normalizeStatus(entry.status) === "DELIVERED").length / salesInvoices.length) * 100 : 0;
  const pendingChallans = challans.filter((entry) => normalizeStatus(entry.status) !== "DELIVERED").length;
  const lowStockItems = stock.filter((entry) => Number(entry.stockQty || 0) <= 5).length;

  const cards = [
    { label: "Sales Realized", value: formatMoney(totalSales), color: "#38bdf8" },
    { label: "Purchases Booked", value: formatMoney(totalPurchases), color: "#34d399" },
    { label: "Average Sale Ticket", value: formatMoney(averageSale), color: "#f59e0b" },
    { label: "Average Purchase Ticket", value: formatMoney(averagePurchase), color: "#a78bfa" },
    { label: "Stock Value", value: formatMoney(stockValue), color: "#f97316" },
    { label: "Pending PO Value", value: formatMoney(pendingPoValue), color: "#f87171" },
    { label: "Pending Challans", value: pendingChallans, color: "#f59e0b" },
    { label: "Low Stock Items", value: lowStockItems, color: "#ef4444" },
  ];

  return (
    <div style={{ padding: "28px 32px", fontFamily: tradingFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Trading Analytics</h1>
        <p style={{ fontSize: 13, color: tradingMuted, margin: 0 }}>
          Revenue, procurement, stock exposure, and dispatch performance for trading operations.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {cards.map((card) => (
          <div key={card.label} style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: tradingMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Commercial KPIs</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Sales Invoices", value: salesInvoices.length, color: "#38bdf8" },
              { label: "Purchase Invoices", value: purchaseInvoices.length, color: "#34d399" },
              { label: "Delivery Conversion", value: `${deliveredRate.toFixed(1)}%`, color: "#f59e0b" },
              { label: "Active Customers", value: activeCustomers, color: "#a78bfa" },
              { label: "Tracked Stock Items", value: stock.length, color: "#f97316" },
            ].map((metric) => (
              <div key={metric.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: `1px solid ${tradingBorder}` }}>
                <span style={{ color: tradingMuted, fontSize: 13 }}>{metric.label}</span>
                <span style={{ color: metric.color, fontSize: 18, fontWeight: 800 }}>{metric.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Fast Inventory View</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Item", "Qty", "Value"].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: tradingMuted, borderBottom: `1px solid ${tradingBorder}` }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stock.slice(0, 8).map((entry) => (
                <tr key={entry.itemId}>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{entry.itemName}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: Number(entry.stockQty || 0) <= 5 ? "#f59e0b" : "#38bdf8", fontWeight: 700 }}>{entry.stockQty}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>{formatMoney(entry.stockValue)}</td>
                </tr>
              ))}
              {stock.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 28, textAlign: "center", color: "rgba(255,255,255,.28)" }}>No stock analytics yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
