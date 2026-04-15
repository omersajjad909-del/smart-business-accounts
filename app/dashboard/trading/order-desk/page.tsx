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
  type DeliveryChallanLite,
  type QuotationLite,
  type SaleReturnLite,
  type SalesInvoiceLite,
  type TradingControlCenter,
} from "../_shared";

export default function TradingOrderDeskPage() {
  const [quotations, setQuotations] = useState<QuotationLite[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoiceLite[]>([]);
  const [challans, setChallans] = useState<DeliveryChallanLite[]>([]);
  const [saleReturns, setSaleReturns] = useState<SaleReturnLite[]>([]);

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
      setQuotations(result.quotations || []);
      setSalesInvoices(result.salesInvoices || []);
      setChallans(result.challans || []);
      setSaleReturns(result.saleReturns || []);
    });
  }, []);

  const acceptedQuotations = useMemo(
    () => quotations.filter((entry) => String(entry.status || "").toUpperCase() === "ACCEPTED").length,
    [quotations]
  );
  const deliveredChallans = useMemo(
    () => challans.filter((entry) => String(entry.status || "").toUpperCase() === "DELIVERED").length,
    [challans]
  );
  const returnedValue = useMemo(
    () => saleReturns.reduce((sum, entry) => sum + Number(entry.total || 0), 0),
    [saleReturns]
  );

  const recentSales = salesInvoices.slice(0, 8);
  const recentQuotations = quotations.slice(0, 6);

  return (
    <div style={{ padding: "28px 32px", fontFamily: tradingFont, color: "var(--text-primary)", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Order Desk</h1>
          <p style={{ fontSize: 13, color: tradingMuted, margin: 0 }}>
            Quotations, booked sales, delivery documents, and sale returns in one desk.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link prefetch={false} href="/dashboard/quotation" style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(56,189,248,.14)", border: "1px solid rgba(56,189,248,.26)", color: "#38bdf8", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            New Quotation
          </Link>
          <Link prefetch={false} href="/dashboard/sales-invoice" style={{ padding: "10px 16px", borderRadius: 10, background: "#38bdf8", color: "#08111d", textDecoration: "none", fontSize: 13, fontWeight: 800 }}>
            New Sale
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Quotations", value: quotations.length, color: "#38bdf8" },
          { label: "Accepted Quotes", value: acceptedQuotations, color: "#34d399" },
          { label: "Delivered Challans", value: deliveredChallans, color: "#f59e0b" },
          { label: "Sale Return Value", value: formatMoney(returnedValue), color: "#f87171" },
        ].map((card) => (
          <div key={card.label} style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: tradingMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 14, marginBottom: 24 }}>
        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Recent Sales Orders</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Invoice", "Customer", "Date", "Vehicle", "Amount"].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: tradingMuted, borderBottom: `1px solid ${tradingBorder}` }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSales.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.invoiceNo}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.customerName || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{formatDate(row.date)}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.vehicleNo || row.driverName || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>{formatMoney(row.total)}</td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>No sales orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Quotation Pipeline</div>
            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              {recentQuotations.map((row) => (
                <div key={row.id} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--panel-bg)", border: `1px solid ${tradingBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700 }}>{row.quotationNo}</span>
                    <span style={{ color: "#38bdf8", fontSize: 11, textTransform: "uppercase" }}>{row.status || "Draft"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: tradingMuted }}>{row.customer?.name || row.customerName || "Walk-in customer"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{formatDate(row.date)}</div>
                </div>
              ))}
              {recentQuotations.length === 0 && <div style={{ color: "var(--text-muted)" }}>No quotation pipeline yet.</div>}
            </div>
          </div>

          <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Dispatch & Returns</div>
            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.16)" }}>
                <div style={{ fontSize: 12, color: tradingMuted }}>Delivery Challans</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{challans.length}</div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.16)" }}>
                <div style={{ fontSize: 12, color: tradingMuted }}>Sale Returns</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#f87171" }}>{saleReturns.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
