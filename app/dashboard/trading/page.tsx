"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchJson,
  formatDate,
  formatMoney,
  sumLineAmount,
  tradingBg,
  tradingBorder,
  tradingFont,
  tradingMuted,
  type TradingControlCenter,
  type DeliveryChallanLite,
  type PurchaseInvoiceLite,
  type PurchaseOrderLite,
  type QuotationLite,
  type SalesInvoiceLite,
  type StockRow,
} from "./_shared";

type OverviewState = {
  summary: TradingControlCenter["summary"];
  quotations: QuotationLite[];
  salesInvoices: SalesInvoiceLite[];
  purchaseOrders: PurchaseOrderLite[];
  purchaseInvoices: PurchaseInvoiceLite[];
  challans: DeliveryChallanLite[];
  stock: StockRow[];
};

const quickLinks = [
  { label: "Order Desk", href: "/dashboard/trading/order-desk", color: "#38bdf8" },
  { label: "Procurement", href: "/dashboard/trading/procurement", color: "#34d399" },
  { label: "Stock Control", href: "/dashboard/trading/stock-control", color: "#f59e0b" },
  { label: "Outstandings", href: "/dashboard/trading/outstandings", color: "#a78bfa" },
  { label: "Dispatch Board", href: "/dashboard/trading/dispatch-board", color: "#f97316" },
  { label: "Conversion Center", href: "/dashboard/trading/conversion-center", color: "#22c55e" },
  { label: "Trading Analytics", href: "/dashboard/trading/analytics", color: "#fb7185" },
];

export default function TradingOverviewPage() {
  const [data, setData] = useState<OverviewState>({
    summary: {},
    quotations: [],
    salesInvoices: [],
    purchaseOrders: [],
    purchaseInvoices: [],
    challans: [],
    stock: [],
  });

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
      setData({
        summary: result.summary || {},
        quotations: result.quotations || [],
        salesInvoices: result.salesInvoices || [],
        purchaseOrders: result.purchaseOrders || [],
        purchaseInvoices: result.purchaseInvoices || [],
        challans: result.challans || [],
        stock: result.stock || [],
      });
    });
  }, []);

  const stockValue = useMemo(
    () => data.stock.reduce((sum, row) => sum + Number(row.stockValue || 0), 0),
    [data.stock]
  );
  const pendingPoValue = useMemo(
    () =>
      data.purchaseOrders
        .filter((row) => String(row.status || "").toUpperCase() === "PENDING")
        .reduce((sum, row) => sum + sumLineAmount(row.items), 0),
    [data.purchaseOrders]
  );

  const recentSales = data.salesInvoices.slice(0, 5);
  const recentProcurement = data.purchaseInvoices.slice(0, 5);

  const cards = [
    { label: "Monthly Sales", value: formatMoney(data.summary.sales), tone: "#38bdf8" },
    { label: "Monthly Purchases", value: formatMoney(data.summary.purchases), tone: "#34d399" },
    { label: "Gross Profit View", value: formatMoney(data.summary.profit), tone: "#f59e0b" },
    { label: "Stock Value", value: formatMoney(stockValue), tone: "#a78bfa" },
    { label: "Pending Purchase Orders", value: formatMoney(pendingPoValue), tone: "#f97316" },
    { label: "Overdue Receivables", value: formatMoney(data.summary.overdueReceivables), tone: "#f87171" },
  ];

  return (
    <div style={{ padding: "28px 32px", fontFamily: tradingFont, color: "var(--text-primary)", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: ".12em", color: "rgba(56,189,248,.8)", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
            Trading Control Center
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>Trading / Wholesale Workspace</h1>
          <p style={{ fontSize: 13, color: tradingMuted, margin: 0, maxWidth: 780 }}>
            Manage quotation to dispatch, supplier buying, warehouse stock, and party recoveries from one commercial workflow.
          </p>
        </div>
        <Link
          href="/dashboard/sales-invoice"
          style={{ padding: "10px 18px", borderRadius: 10, background: "#38bdf8", color: "#08111d", textDecoration: "none", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}
        >
          Create Sales Invoice
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {cards.map((card) => (
          <div key={card.label} style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: tradingMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.tone }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr .9fr", gap: 14, marginBottom: 24 }}>
        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Commercial Flow</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 10 }}>
            {[
              { label: "Quotations", value: data.quotations.length, sub: "Sales pipeline", color: "#38bdf8" },
              { label: "Sales Invoices", value: data.salesInvoices.length, sub: "Booked orders", color: "#34d399" },
              { label: "Purchase Orders", value: data.purchaseOrders.length, sub: "Supplier buying", color: "#f59e0b" },
              { label: "Purchase Invoices", value: data.purchaseInvoices.length, sub: "Received cost", color: "#a78bfa" },
              { label: "Delivery Challans", value: data.challans.length, sub: "Dispatch docs", color: "#f97316" },
            ].map((entry) => (
              <div key={entry.label} style={{ background: "rgba(255,255,255,.02)", border: `1px solid ${tradingBorder}`, borderRadius: 12, padding: "16px 14px" }}>
                <div style={{ fontSize: 11, color: tradingMuted, marginBottom: 6 }}>{entry.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: entry.color }}>{entry.value}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 6 }}>{entry.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "linear-gradient(135deg,rgba(56,189,248,.12),rgba(15,23,42,.85))", border: "1px solid rgba(56,189,248,.18)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Ready-to-run desks</div>
          <div style={{ fontSize: 13, color: tradingMuted, marginBottom: 14 }}>
            Trading business ko alag alag departments ke bajaye focused desks me break kiya gaya hai.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderRadius: 12, background: "var(--panel-bg)", border: `1px solid ${tradingBorder}`, color: "var(--text-primary)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}
              >
                <span>{link.label}</span>
                <span style={{ color: link.color }}>Open</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Recent Sales Activity</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Invoice", "Customer", "Date", "Amount"].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: tradingMuted, borderBottom: `1px solid ${tradingBorder}` }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSales.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.invoiceNo}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.customerName || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{formatDate(row.date)}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>{formatMoney(row.total)}</td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 28, textAlign: "center", color: "rgba(255,255,255,.28)" }}>No sales invoices yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Recent Procurement</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["PI No", "Supplier", "Date", "Amount"].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: tradingMuted, borderBottom: `1px solid ${tradingBorder}` }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentProcurement.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.invoiceNo}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.supplier?.name || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{formatDate(row.date)}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#a78bfa", fontWeight: 700 }}>{formatMoney(row.total)}</td>
                </tr>
              ))}
              {recentProcurement.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 28, textAlign: "center", color: "rgba(255,255,255,.28)" }}>No purchase invoices yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
