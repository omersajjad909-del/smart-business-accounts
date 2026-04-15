"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchJson,
  formatDate,
  tradingBg,
  tradingBorder,
  tradingFont,
  tradingMuted,
  type DeliveryChallanLite,
  type OutwardLite,
  type SalesInvoiceLite,
  type TradingControlCenter,
} from "../_shared";

export default function TradingDispatchBoardPage() {
  const [challans, setChallans] = useState<DeliveryChallanLite[]>([]);
  const [outward, setOutward] = useState<OutwardLite[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoiceLite[]>([]);

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
      setChallans(result.challans || []);
      setOutward(result.outwards || []);
      setSalesInvoices(result.salesInvoices || []);
    });
  }, []);

  const pendingChallans = useMemo(
    () => challans.filter((entry) => String(entry.status || "").toUpperCase() === "PENDING"),
    [challans]
  );
  const deliveredChallans = useMemo(
    () => challans.filter((entry) => String(entry.status || "").toUpperCase() === "DELIVERED"),
    [challans]
  );

  return (
    <div style={{ padding: "28px 32px", fontFamily: tradingFont, color: "var(--text-primary)", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Dispatch Board</h1>
          <p style={{ fontSize: 13, color: tradingMuted, margin: 0 }}>
            Follow invoice-to-dispatch execution through delivery challans and outward entries.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link prefetch={false} href="/dashboard/delivery-challan" style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(249,115,22,.14)", border: "1px solid rgba(249,115,22,.24)", color: "#f97316", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            New Challan
          </Link>
          <Link prefetch={false} href="/dashboard/outward" style={{ padding: "10px 16px", borderRadius: 10, background: "#f97316", color: "#170a03", textDecoration: "none", fontSize: 13, fontWeight: 800 }}>
            New Outward
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Sales Invoices", value: salesInvoices.length, color: "#38bdf8" },
          { label: "Pending Challans", value: pendingChallans.length, color: "#f59e0b" },
          { label: "Delivered Challans", value: deliveredChallans.length, color: "#34d399" },
          { label: "Outward Entries", value: outward.length, color: "#a78bfa" },
        ].map((card) => (
          <div key={card.label} style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: tradingMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Delivery Challans</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Challan", "Customer", "Status", "Driver", "Date"].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: tradingMuted, borderBottom: `1px solid ${tradingBorder}` }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {challans.slice(0, 10).map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.challanNo}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.customer?.name || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: String(row.status || "").toUpperCase() === "DELIVERED" ? "#34d399" : "#f59e0b", fontWeight: 700 }}>{row.status || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.driverName || row.vehicleNo || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{formatDate(row.date)}</td>
                </tr>
              ))}
              {challans.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>No delivery challans yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Outward Register Feed</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Outward", "Customer", "Vehicle", "Date"].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: tradingMuted, borderBottom: `1px solid ${tradingBorder}` }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outward.slice(0, 10).map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>OUT-{row.outwardNo}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.customer?.name || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.vehicleNo || row.driverName || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{formatDate(row.date)}</td>
                </tr>
              ))}
              {outward.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>No outward register entries yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
