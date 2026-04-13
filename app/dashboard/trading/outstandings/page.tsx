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
  type AccountLite,
  type PaymentReceiptLite,
  type TradingControlCenter,
} from "../_shared";

export default function TradingOutstandingsPage() {
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceiptLite[]>([]);

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
      setAccounts(result.accounts || []);
      setReceipts(result.receipts || []);
    });
  }, []);

  const customers = useMemo(
    () => accounts.filter((entry) => String(entry.partyType || "").toUpperCase() === "CUSTOMER"),
    [accounts]
  );
  const suppliers = useMemo(
    () => accounts.filter((entry) => String(entry.partyType || "").toUpperCase() === "SUPPLIER"),
    [accounts]
  );
  const customerReceivable = useMemo(
    () => customers.reduce((sum, entry) => sum + Math.max(Number(entry.openDebit || 0) - Number(entry.openCredit || 0), 0), 0),
    [customers]
  );
  const supplierPayable = useMemo(
    () => suppliers.reduce((sum, entry) => sum + Math.max(Number(entry.openCredit || 0) - Number(entry.openDebit || 0), 0), 0),
    [suppliers]
  );
  const recentReceipts = receipts.slice(0, 8);

  return (
    <div style={{ padding: "28px 32px", fontFamily: tradingFont, color: "var(--text-primary)", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Outstandings Center</h1>
          <p style={{ fontSize: 13, color: tradingMuted, margin: 0 }}>
            Monitor customer receivables, supplier payables, and receipt follow-up for trading parties.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/dashboard/parties" style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(168,85,247,.14)", border: "1px solid rgba(168,85,247,.24)", color: "#a78bfa", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            Manage Parties
          </Link>
          <Link href="/dashboard/payment-receipts" style={{ padding: "10px 16px", borderRadius: 10, background: "#a78bfa", color: "#120720", textDecoration: "none", fontSize: 13, fontWeight: 800 }}>
            Receive Payment
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Customers", value: customers.length, color: "#38bdf8" },
          { label: "Suppliers", value: suppliers.length, color: "#34d399" },
          { label: "Receivable Exposure", value: formatMoney(customerReceivable), color: "#f59e0b" },
          { label: "Payable Exposure", value: formatMoney(supplierPayable), color: "#f87171" },
        ].map((card) => (
          <div key={card.label} style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: tradingMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Customer Recovery Watch</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Customer", "Phone", "Credit Days", "Open"].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: tradingMuted, borderBottom: `1px solid ${tradingBorder}` }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.slice(0, 8).map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.name}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.phone || "-"}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.creditDays || 0}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#f59e0b", fontWeight: 700 }}>
                    {formatMoney(Math.max(Number(row.openDebit || 0) - Number(row.openCredit || 0), 0))}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>No customer parties available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Supplier Liability Watch</div>
            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              {suppliers.slice(0, 5).map((row) => (
                <div key={row.id} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--panel-bg)", border: `1px solid ${tradingBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontWeight: 700 }}>{row.name}</span>
                    <span style={{ color: "#f87171", fontWeight: 800 }}>
                      {formatMoney(Math.max(Number(row.openCredit || 0) - Number(row.openDebit || 0), 0))}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: tradingMuted, marginTop: 4 }}>{row.phone || row.city || "No supplier contact"}</div>
                </div>
              ))}
              {suppliers.length === 0 && <div style={{ color: "var(--text-muted)" }}>No supplier parties available.</div>}
            </div>
          </div>

          <div style={{ background: tradingBg, border: `1px solid ${tradingBorder}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tradingBorder}`, fontSize: 15, fontWeight: 800 }}>Recent Receipts</div>
            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              {recentReceipts.map((row) => (
                <div key={row.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.16)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontWeight: 700 }}>{row.receiptNo}</span>
                    <span style={{ color: "#34d399", fontWeight: 800 }}>{formatMoney(row.amount)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: tradingMuted, marginTop: 4 }}>{row.party?.name || "-"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{formatDate(row.date)} · {row.paymentMode || "Mode"} · {row.status || "Status"}</div>
                </div>
              ))}
              {recentReceipts.length === 0 && <div style={{ color: "var(--text-muted)" }}>No payment receipts posted yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
