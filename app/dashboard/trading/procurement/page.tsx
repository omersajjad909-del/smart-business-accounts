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
  type GrnLite,
  type PurchaseInvoiceLite,
  type PurchaseOrderLite,
  type TradingControlCenter,
} from "../_shared";

export default function TradingProcurementPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderLite[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoiceLite[]>([]);
  const [grns, setGrns] = useState<GrnLite[]>([]);

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
      setPurchaseOrders(result.purchaseOrders || []);
      setPurchaseInvoices(result.purchaseInvoices || []);
      setGrns(result.grns || []);
    });
  }, []);

  const pendingPos = useMemo(
    () => purchaseOrders.filter((entry) => String(entry.status || "").toUpperCase() === "PENDING"),
    [purchaseOrders]
  );
  const pendingPoValue = useMemo(
    () => pendingPos.reduce((sum, entry) => sum + sumLineAmount(entry.items), 0),
    [pendingPos]
  );
  const invoiceValue = useMemo(
    () => purchaseInvoices.reduce((sum, entry) => sum + Number(entry.total || 0), 0),
    [purchaseInvoices]
  );

  return (
    <div style={{ padding: "28px 32px", fontFamily: tradingFont, color: "var(--text-primary)", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Procurement Desk</h1>
          <p style={{ fontSize: 13, color: tradingMuted, margin: 0 }}>
            Supplier buying workflow from purchase order to GRN and purchase invoice.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/dashboard/purchase-order" style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(52,211,153,.14)", border: "1px solid rgba(52,211,153,.24)", color: "#34d399", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            New PO
          </Link>
          <Link href="/dashboard/purchase-invoice" style={{ padding: "10px 16px", borderRadius: 10, background: "#34d399", color: "#04110c", textDecoration: "none", fontSize: 13, fontWeight: 800 }}>
            New PI
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Purchase Orders", value: purchaseOrders.length, color: "#34d399" },
          { label: "Pending PO Value", value: formatMoney(pendingPoValue), color: "#f59e0b" },
          { label: "Purchase Invoices", value: formatMoney(invoiceValue), color: "#a78bfa" },
          { label: "GRNs Logged", value: grns.length, color: "#38bdf8" },
        ].map((card) => (
          <div key={card.label} style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: tradingMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Supplier Orders</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["PO No", "Supplier", "Date", "Status", "Value"].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: tradingMuted, borderBottom: `1px solid ${tradingBorder}` }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.slice(0, 8).map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.poNo}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.supplier?.name || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{formatDate(row.date)}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: String(row.status || "").toUpperCase() === "PENDING" ? "#f59e0b" : "#34d399", fontWeight: 700 }}>{row.status || row.approvalStatus || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>{formatMoney(sumLineAmount(row.items))}</td>
                </tr>
              ))}
              {purchaseOrders.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>No purchase orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Goods Receipt Notes</div>
            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              {grns.slice(0, 5).map((row) => (
                <div key={row.id} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--panel-bg)", border: `1px solid ${tradingBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontWeight: 700 }}>{row.grnNo}</span>
                    <span style={{ color: "#38bdf8", fontSize: 11 }}>{row.status || "Received"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: tradingMuted, marginTop: 6 }}>{row.supplier?.name || "-"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{row.po?.poNo || "Direct GRN"} · {formatDate(row.date)}</div>
                </div>
              ))}
              {grns.length === 0 && <div style={{ color: "var(--text-muted)" }}>No GRNs logged yet.</div>}
            </div>
          </div>

          <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Latest Purchase Invoices</div>
            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              {purchaseInvoices.slice(0, 5).map((row) => (
                <div key={row.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.16)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontWeight: 700 }}>{row.invoiceNo}</span>
                    <span style={{ color: "#a78bfa", fontWeight: 700 }}>{formatMoney(row.total)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: tradingMuted, marginTop: 6 }}>{row.supplier?.name || "-"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{formatDate(row.date)}</div>
                </div>
              ))}
              {purchaseInvoices.length === 0 && <div style={{ color: "var(--text-muted)" }}>No purchase invoices yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
