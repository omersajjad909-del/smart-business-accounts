"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Stat = { label: string; value: string; color: string };

const QUICK_LINKS = [
  { label: "Sales Invoice", href: "/dashboard/sales-invoice", icon: "🧾" },
  { label: "Purchase Order", href: "/dashboard/purchase-order", icon: "📋" },
  { label: "Purchase Invoice", href: "/dashboard/purchase-invoice", icon: "📦" },
  { label: "Inventory", href: "/dashboard/inventory", icon: "🏭" },
  { label: "GRN", href: "/dashboard/grn", icon: "✅" },
  { label: "Parties", href: "/dashboard/parties", icon: "👥" },
  { label: "Ageing Report", href: "/dashboard/reports/ageing", icon: "⏰" },
  { label: "Stock Report", href: "/dashboard/stock-report", icon: "📊" },
];

const MODULES = [
  {
    title: "Procurement",
    icon: "📦",
    desc: "Manage supplier orders, goods receipt, and purchase invoicing",
    links: [
      { label: "Purchase Orders", href: "/dashboard/purchase-order" },
      { label: "Goods Receipt Note (GRN)", href: "/dashboard/grn" },
      { label: "Purchase Invoices", href: "/dashboard/purchase-invoice" },
      { label: "Debit Notes", href: "/dashboard/debit-note" },
    ],
  },
  {
    title: "Sales & Distribution",
    icon: "🚚",
    desc: "Handle bulk sales, quotations, and delivery",
    links: [
      { label: "Sales Invoices", href: "/dashboard/sales-invoice" },
      { label: "Quotations", href: "/dashboard/quotation" },
      { label: "Delivery Challan", href: "/dashboard/delivery-challan" },
      { label: "Sale Returns", href: "/dashboard/sale-return" },
      { label: "Credit Notes", href: "/dashboard/credit-note" },
    ],
  },
  {
    title: "Inventory & Warehouse",
    icon: "🏭",
    desc: "Stock management, reordering, and location tracking",
    links: [
      { label: "Inventory Overview", href: "/dashboard/inventory" },
      { label: "Stock Rates", href: "/dashboard/stock-rate" },
      { label: "Stock Report", href: "/dashboard/stock-report" },
      { label: "Outward Register", href: "/dashboard/outward" },
      { label: "Barcode", href: "/dashboard/barcode" },
    ],
  },
  {
    title: "Parties & Accounts",
    icon: "👥",
    desc: "Suppliers, customers, and outstanding management",
    links: [
      { label: "Parties", href: "/dashboard/parties" },
      { label: "Chart of Accounts", href: "/dashboard/accounts" },
      { label: "Ageing Report", href: "/dashboard/reports/ageing" },
      { label: "Advance Payments", href: "/dashboard/advance-payment" },
    ],
  },
  {
    title: "Financials",
    icon: "💰",
    desc: "Full accounting suite for wholesale operations",
    links: [
      { label: "Ledger Report", href: "/dashboard/reports/ledger" },
      { label: "Trial Balance", href: "/dashboard/trial-balance" },
      { label: "Profit & Loss", href: "/dashboard/reports/profit-loss" },
      { label: "Journal Voucher", href: "/dashboard/jv" },
    ],
  },
  {
    title: "Banking & Cash",
    icon: "🏦",
    desc: "Cash payments, receipts, and bank reconciliation",
    links: [
      { label: "Payment Receipts", href: "/dashboard/payment-receipts" },
      { label: "CPV", href: "/dashboard/cpv" },
      { label: "CRV", href: "/dashboard/crv" },
      { label: "Bank Reconciliation", href: "/dashboard/bank-reconciliation" },
    ],
  },
  {
    title: "Reports",
    icon: "📊",
    desc: "Sales, purchase, and inventory analytics",
    links: [
      { label: "Sales Report", href: "/dashboard/reports/sales" },
      { label: "Stock Summary", href: "/dashboard/reports/inventory/stock-summary" },
      { label: "Low Stock Alerts", href: "/dashboard/reports/stock/low" },
      { label: "Cash Flow", href: "/dashboard/reports/cash-flow" },
    ],
  },
  {
    title: "Operations",
    icon: "⚙️",
    desc: "Employees, branches, and business settings",
    links: [
      { label: "Employees", href: "/dashboard/employees" },
      { label: "Branches", href: "/dashboard/branches" },
      { label: "Department Budgets", href: "/dashboard/department-budgets" },
      { label: "Import Wizard", href: "/dashboard/import-wizard" },
    ],
  },
];

export default function WholesaleDashboard() {
  const [stats, setStats] = useState<Stat[]>([
    { label: "Revenue (This Month)", value: "—", color: "#22c55e" },
    { label: "Purchases (This Month)", value: "—", color: "#818cf8" },
    { label: "Outstanding Receivable", value: "—", color: "#f59e0b" },
    { label: "Outstanding Payable", value: "—", color: "#f87171" },
  ]);

  useEffect(() => {
    fetch("/api/reports/dashboard-summary")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const fmt = (n: number) => n >= 1000000
          ? `${(n / 1000000).toFixed(1)}M`
          : n >= 1000
          ? `${(n / 1000).toFixed(1)}K`
          : String(n ?? 0);
        setStats([
          { label: "Revenue (This Month)", value: fmt(d.totalRevenue ?? 0), color: "#22c55e" },
          { label: "Purchases (This Month)", value: fmt(d.totalPurchases ?? 0), color: "#818cf8" },
          { label: "Outstanding Receivable", value: fmt(d.totalReceivable ?? 0), color: "#f59e0b" },
          { label: "Outstanding Payable", value: fmt(d.totalPayable ?? 0), color: "#f87171" },
        ]);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter',sans-serif", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 24 }}>🏭</span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", margin: 0 }}>Wholesale Dashboard</h1>
        </div>
        <p style={{ color: "rgba(255,255,255,.45)", fontSize: 14, margin: 0 }}>
          Bulk trading, distribution & wholesale business management
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 32 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 14, padding: "18px 20px",
          }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.5)", marginBottom: 12, letterSpacing: ".06em" }}>QUICK ACTIONS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {QUICK_LINKS.map(q => (
            <Link key={q.label} href={q.href} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 16px", borderRadius: 10,
              background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)",
              color: "#c7d2fe", fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>
              <span>{q.icon}</span> {q.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.5)", marginBottom: 14, letterSpacing: ".06em" }}>ALL MODULES</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
        {MODULES.map(m => (
          <div key={m.title} style={{
            background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
            borderRadius: 14, padding: "20px 22px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{m.title}</span>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", margin: "0 0 12px" }}>{m.desc}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {m.links.map(l => (
                <Link key={l.href} href={l.href} style={{
                  fontSize: 13, color: "#a5b4fc", textDecoration: "none",
                  padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,.05)",
                }}>
                  → {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
