"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchJson,
  formatDate,
  formatMoney,
  normalizeStatus,
  sumLineAmount,
  tradingBg,
  tradingBorder,
  tradingFont,
  tradingMuted,
  type DeliveryChallanLite,
  type GrnLite,
  type PurchaseInvoiceLite,
  type PurchaseOrderLite,
  type QuotationLite,
  type SalesInvoiceLite,
} from "../_shared";

export default function TradingConversionCenterPage() {
  const [quotations, setQuotations] = useState<QuotationLite[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoiceLite[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderLite[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoiceLite[]>([]);
  const [grns, setGrns] = useState<GrnLite[]>([]);
  const [challans, setChallans] = useState<DeliveryChallanLite[]>([]);

  useEffect(() => {
    Promise.all([
      fetchJson<{ quotations?: QuotationLite[] }>("/api/quotation", { quotations: [] }),
      fetchJson<{ invoices?: SalesInvoiceLite[] }>("/api/sales-invoice", { invoices: [] }),
      fetchJson<PurchaseOrderLite[]>("/api/purchase-order", []),
      fetchJson<PurchaseInvoiceLite[]>("/api/purchase-invoice?type=invoices", []),
      fetchJson<GrnLite[]>("/api/grn", []),
      fetchJson<DeliveryChallanLite[]>("/api/delivery-challan", []),
    ]).then(([quotationData, salesData, poData, piData, grnData, challanData]) => {
      setQuotations(quotationData.quotations || []);
      setSalesInvoices(salesData.invoices || []);
      setPurchaseOrders(poData);
      setPurchaseInvoices(piData);
      setGrns(grnData);
      setChallans(challanData);
    });
  }, []);

  const quotationOpen = useMemo(
    () => quotations.filter((entry) => !["ACCEPTED", "REJECTED"].includes(normalizeStatus(entry.status))).length,
    [quotations]
  );
  const quotationAccepted = useMemo(
    () => quotations.filter((entry) => normalizeStatus(entry.status) === "ACCEPTED").length,
    [quotations]
  );
  const pendingPos = useMemo(
    () => purchaseOrders.filter((entry) => normalizeStatus(entry.status) === "PENDING"),
    [purchaseOrders]
  );
  const grnWithoutInvoice = useMemo(() => {
    const piKeys = new Set(
      purchaseInvoices.map((entry) => `${normalizeStatus(entry.supplier?.name)}|${new Date(entry.date).toISOString().slice(0, 10)}`)
    );
    return grns.filter((entry) => !piKeys.has(`${normalizeStatus(entry.supplier?.name)}|${new Date(entry.date).toISOString().slice(0, 10)}`));
  }, [grns, purchaseInvoices]);
  const pendingDispatch = useMemo(
    () => challans.filter((entry) => normalizeStatus(entry.status) !== "DELIVERED"),
    [challans]
  );
  const unchallanedSales = Math.max(salesInvoices.length - challans.length, 0);

  const metrics = [
    { label: "Open Quotations", value: quotationOpen, color: "#38bdf8" },
    { label: "Accepted Quotes", value: quotationAccepted, color: "#34d399" },
    { label: "Pending POs", value: pendingPos.length, color: "#f59e0b" },
    { label: "GRN Pending PI", value: grnWithoutInvoice.length, color: "#a78bfa" },
    { label: "Pending Dispatch", value: pendingDispatch.length, color: "#f97316" },
    { label: "Sales Missing Challan", value: unchallanedSales, color: "#f87171" },
  ];

  return (
    <div style={{ padding: "28px 32px", fontFamily: tradingFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Conversion Center</h1>
          <p style={{ fontSize: 13, color: tradingMuted, margin: 0 }}>
            Follow every handoff in trading flow: quotation to sale, PO to GRN to PI, and sales to dispatch.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/dashboard/quotation" style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(56,189,248,.14)", border: "1px solid rgba(56,189,248,.24)", color: "#38bdf8", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            Quotations
          </Link>
          <Link href="/dashboard/delivery-challan" style={{ padding: "10px 16px", borderRadius: 10, background: "#f97316", color: "#160a03", textDecoration: "none", fontSize: 13, fontWeight: 800 }}>
            Dispatch Docs
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {metrics.map((metric) => (
          <div key={metric.label} style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: tradingMuted, marginBottom: 8 }}>{metric.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: metric.color }}>{metric.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Commercial Pipeline Checks</div>
          <div style={{ padding: 16, display: "grid", gap: 10 }}>
            {quotations.slice(0, 6).map((entry) => (
              <div key={entry.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: `1px solid ${tradingBorder}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontWeight: 700 }}>{entry.quotationNo}</span>
                  <span style={{ color: normalizeStatus(entry.status) === "ACCEPTED" ? "#34d399" : "#38bdf8", fontSize: 11, textTransform: "uppercase" }}>{entry.status || "Draft"}</span>
                </div>
                <div style={{ fontSize: 12, color: tradingMuted, marginTop: 4 }}>{entry.customer?.name || entry.customerName || "Walk-in customer"}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginTop: 4 }}>{formatDate(entry.date)} · {formatMoney(entry.total)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Procurement Hand-off Checks</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["PO No", "Supplier", "Date", "Pending Value"].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: tradingMuted, borderBottom: `1px solid ${tradingBorder}` }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingPos.slice(0, 6).map((entry) => (
                <tr key={entry.id}>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{entry.poNo}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{entry.supplier?.name || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{formatDate(entry.date)}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#f59e0b", fontWeight: 700 }}>{formatMoney(sumLineAmount(entry.items))}</td>
                </tr>
              ))}
              {pendingPos.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 28, textAlign: "center", color: "rgba(255,255,255,.28)" }}>No pending PO handoffs.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
