"use client";

import { useEffect, useMemo, useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";
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
  const { isMobile } = useResponsive();
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoiceLite[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderLite[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoiceLite[]>([]);
  const [challans, setChallans] = useState<DeliveryChallanLite[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [invQuery, setInvQuery] = useState("");
  const [invFilter, setInvFilter] = useState<"in" | "low" | "out" | "all">("in");
  const [invSort, setInvSort] = useState<"value" | "qty" | "name">("value");

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
  const stockCounts = useMemo(() => ({
    in: stock.filter((r) => Number(r.stockQty || 0) > 0).length,
    low: stock.filter((r) => Number(r.stockQty || 0) > 0 && Number(r.stockQty || 0) <= 5).length,
    out: stock.filter((r) => Number(r.stockQty || 0) <= 0).length,
    all: stock.length,
  }), [stock]);

  // The API returns every item A→Z, most of them at zero. Show what is actually
  // on the shelf first, biggest value on top, and let the user narrow it down.
  const inventoryRows = useMemo(() => {
    const needle = invQuery.trim().toLowerCase();
    const qty = (r: StockRow) => Number(r.stockQty || 0);
    return stock
      .filter((r) => (invFilter === "all" ? true : invFilter === "in" ? qty(r) > 0 : invFilter === "low" ? qty(r) > 0 && qty(r) <= 5 : qty(r) <= 0))
      .filter((r) => !needle || r.itemName.toLowerCase().includes(needle))
      .sort((x, y) =>
        invSort === "name"
          ? x.itemName.localeCompare(y.itemName)
          : invSort === "qty"
            ? qty(y) - qty(x) || x.itemName.localeCompare(y.itemName)
            : Number(y.stockValue || 0) - Number(x.stockValue || 0) || qty(y) - qty(x) || x.itemName.localeCompare(y.itemName),
      );
  }, [stock, invQuery, invFilter, invSort]);

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
    { label: "Sales Realized", value: formatMoney(totalSales), color: "var(--tx-38bdf8, #38bdf8)" },
    { label: "Purchases Booked", value: formatMoney(totalPurchases), color: "var(--tx-34d399, #34d399)" },
    { label: "Average Sale Ticket", value: formatMoney(averageSale), color: "var(--tx-f59e0b, #f59e0b)" },
    { label: "Average Purchase Ticket", value: formatMoney(averagePurchase), color: "var(--tx-a78bfa, #a78bfa)" },
    { label: "Stock Value", value: formatMoney(stockValue), color: "var(--tx-f97316, #f97316)" },
    { label: "Pending PO Value", value: formatMoney(pendingPoValue), color: "var(--tx-f87171, #f87171)" },
    { label: "Pending Challans", value: pendingChallans, color: "var(--tx-f59e0b, #f59e0b)" },
    { label: "Low Stock Items", value: lowStockItems, color: "var(--tx-ef4444, #ef4444)" },
  ];

  return (
    <div style={{ padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: tradingFont, color: "var(--text-primary)", minHeight: "100vh" }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Trading Analytics</h1>
        <p style={{ fontSize: 13, color: tradingMuted, margin: 0 }}>
          Revenue, procurement, stock exposure, and dispatch performance for trading operations.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {cards.map((card) => (
          <div key={card.label} style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 20px" }}>
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
              { label: "Sales Invoices", value: salesInvoices.length, color: "var(--tx-38bdf8, #38bdf8)" },
              { label: "Purchase Invoices", value: purchaseInvoices.length, color: "var(--tx-34d399, #34d399)" },
              { label: "Delivery Conversion", value: `${deliveredRate.toFixed(1)}%`, color: "var(--tx-f59e0b, #f59e0b)" },
              { label: "Active Customers", value: activeCustomers, color: "var(--tx-a78bfa, #a78bfa)" },
              { label: "Tracked Stock Items", value: stock.length, color: "var(--tx-f97316, #f97316)" },
            ].map((metric) => (
              <div key={metric.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: "var(--panel-bg)", border: `1px solid ${tradingBorder}` }}>
                <span style={{ color: tradingMuted, fontSize: 13 }}>{metric.label}</span>
                <span style={{ color: metric.color, fontSize: 18, fontWeight: 800 }}>{metric.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: isMobile ? "12px 10px" : "16px 18px", borderBottom: `1px solid ${tradingBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>Fast Inventory View</span>
              <span style={{ fontSize: 12, color: tradingMuted }}>{inventoryRows.length} of {stock.length} items</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
              {([["in", "In stock"], ["low", "Low (≤5)"], ["out", "Out of stock"], ["all", "All"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setInvFilter(key)}
                  style={{
                    padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    border: `1px solid ${invFilter === key ? "#d97706" : tradingBorder}`,
                    background: invFilter === key ? "rgba(245,158,11,.14)" : "transparent",
                    color: invFilter === key ? "#b45309" : "inherit",
                  }}
                >
                  {label} <span style={{ opacity: 0.6 }}>{stockCounts[key]}</span>
                </button>
              ))}
              <select
                value={invSort}
                onChange={(e) => setInvSort(e.target.value as "value" | "qty" | "name")}
                aria-label="Sort inventory"
                style={{ marginLeft: "auto", padding: "5px 8px", borderRadius: 8, fontSize: 12, border: `1px solid ${tradingBorder}`, background: "transparent", color: "inherit", fontFamily: "inherit" }}
              >
                <option value="value">Sort: Highest value</option>
                <option value="qty">Sort: Highest qty</option>
                <option value="name">Sort: Name A–Z</option>
              </select>
            </div>
            <input
              value={invQuery}
              onChange={(e) => setInvQuery(e.target.value)}
              placeholder="Search item…"
              style={{ width: "100%", boxSizing: "border-box", marginTop: 8, padding: "8px 11px", borderRadius: 8, fontSize: 13, border: `1px solid ${tradingBorder}`, background: "rgba(var(--ink),.04)", color: "inherit", fontFamily: "inherit", outline: "none" }}
            />
          </div>
          <div style={{ maxHeight: 460, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Item", "Qty", "Value"].map((header) => (
                    <th key={header} style={{ position: "sticky", top: 0, zIndex: 1, background: tradingBg, textAlign: header === "Item" ? "left" : "right", padding: "10px 16px", fontSize: 12, color: tradingMuted, borderBottom: `1px solid ${tradingBorder}` }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventoryRows.map((entry) => {
                  const qty = Number(entry.stockQty || 0);
                  return (
                    <tr key={entry.itemId}>
                      <td style={{ padding: "11px 16px", borderBottom: "1px solid rgba(var(--ink),.04)", fontWeight: 700 }}>{entry.itemName}</td>
                      <td style={{ padding: "11px 16px", borderBottom: "1px solid rgba(var(--ink),.04)", textAlign: "right", whiteSpace: "nowrap", color: qty <= 0 ? "var(--tx-f87171, #dc2626)" : qty <= 5 ? "var(--tx-f59e0b, #f59e0b)" : "var(--tx-38bdf8, #0284c7)", fontWeight: 700 }}>
                        {qty.toLocaleString()}{entry.unit ? <span style={{ fontWeight: 500, opacity: 0.6 }}> {entry.unit}</span> : null}
                      </td>
                      <td style={{ padding: "11px 16px", borderBottom: "1px solid rgba(var(--ink),.04)", textAlign: "right", whiteSpace: "nowrap", color: "var(--tx-34d399, #34d399)", fontWeight: 700 }}>{formatMoney(entry.stockValue)}</td>
                    </tr>
                  );
                })}
                {inventoryRows.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>
                      {stock.length === 0 ? "No stock analytics yet." : "No items match these filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
