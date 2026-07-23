"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useResponsive } from "@/hooks/useResponsive";

// ── Report categories and definitions ──
const REPORT_CATEGORIES = [
  {
    id: "financial",
    name: "Financial Reports",
    icon: "💰",
    reports: [
      { path: "/dashboard/reports/trial-balance", name: "Trial Balance", desc: "List of all accounts with their balances" },
      { path: "/dashboard/reports/balance-sheet", name: "Balance Sheet", desc: "Assets, liabilities, and equity statement" },
      { path: "/dashboard/reports/profit-loss", name: "Profit & Loss", desc: "Revenue and expense statement" },
      { path: "/dashboard/reports/cash-flow", name: "Cash Flow", desc: "Cash inflows and outflows analysis" },
      { path: "/dashboard/reports/ledger", name: "Account Ledger", desc: "Detailed transactions for any account" },
      { path: "/dashboard/reports/annual-statements", name: "Annual Statements", desc: "Complete year-end financial summaries" },
    ],
  },
  {
    id: "sales",
    name: "Sales & Revenue",
    icon: "📈",
    reports: [
      { path: "/dashboard/reports/sales", name: "Sales Report", desc: "Daily and period-wise sales analysis" },
      { path: "/dashboard/reports/salesman-performance", name: "Salesman Performance", desc: "Sales by individual salesman" },
      { path: "/dashboard/reports/sales-region", name: "Sales by Region", desc: "Region-wise sales breakdown" },
      { path: "/dashboard/reports/customer-profitability", name: "Customer Profitability", desc: "Profit analysis by customer" },
      { path: "/dashboard/reports/customer-statement", name: "Customer Statement", desc: "Individual customer ledger and balance" },
      { path: "/dashboard/reports/ageing", name: "Customer Ageing", desc: "Overdue receivables by customer" },
    ],
  },
  {
    id: "purchases",
    name: "Purchases & Suppliers",
    icon: "🛒",
    reports: [
      { path: "/dashboard/reports/supplier-statement", name: "Supplier Statement", desc: "Individual supplier ledger and balance" },
      { path: "/dashboard/reports/supplier-ageing", name: "Supplier Ageing", desc: "Overdue payables by supplier" },
      { path: "/dashboard/reports/supplier-performance", name: "Supplier Performance", desc: "Quality and delivery metrics" },
      { path: "/dashboard/reports/discount-analysis", name: "Discount Analysis", desc: "Purchase discounts received" },
      { path: "/dashboard/reports/payment-history", name: "Payment History", desc: "Purchase payments and dates" },
    ],
  },
  {
    id: "inventory",
    name: "Inventory & Stock",
    icon: "📦",
    reports: [
      { path: "/dashboard/reports/stock", name: "Stock Report", desc: "Current stock levels and values" },
      { path: "/dashboard/reports/stock/movement", name: "Stock Movement", desc: "Stock in and out transactions" },
      { path: "/dashboard/reports/stock-ledger", name: "Stock Ledger", desc: "Item-wise stock transactions" },
      { path: "/dashboard/reports/inventory", name: "Inventory Valuation", desc: "Inventory valuation methods" },
      { path: "/dashboard/reports/stock/low", name: "Low Stock Items", desc: "Items below reorder level" },
      { path: "/dashboard/reports/stock/expiry", name: "Expiry Analysis", desc: "Items approaching expiry date" },
    ],
  },
  {
    id: "analysis",
    name: "Analysis & Insights",
    icon: "🔍",
    reports: [
      { path: "/dashboard/reports/profitability", name: "Profitability Analysis", desc: "Product and service profit margins" },
      { path: "/dashboard/reports/gross-margin", name: "Gross Margin Analysis", desc: "Gross profit by product" },
      { path: "/dashboard/reports/product-profitability", name: "Product Profitability", desc: "Detailed product profit analysis" },
      { path: "/dashboard/reports/breakeven", name: "Break-even Analysis", desc: "Break-even point calculation" },
      { path: "/dashboard/reports/budget-vs-actual", name: "Budget vs Actual", desc: "Budget performance comparison" },
      { path: "/dashboard/reports/forecast", name: "Financial Forecast", desc: "Future financial projections" },
    ],
  },
  {
    id: "tax",
    name: "Tax & Compliance",
    icon: "📋",
    reports: [
      { path: "/dashboard/reports/tax-summary", name: "Tax Summary", desc: "Tax collected and payable" },
      { path: "/dashboard/reports/tax-forecast", name: "Tax Forecast", desc: "Projected tax liabilities" },
      { path: "/dashboard/reports/compliance", name: "Compliance Report", desc: "Security and compliance checklist" },
      { path: "/dashboard/reports/credit-analysis", name: "Credit Analysis", desc: "Credit risk assessment" },
      { path: "/dashboard/reports/bad-debts", name: "Bad Debts", desc: "Doubtful and bad debts analysis" },
    ],
  },
  {
    id: "operations",
    name: "Operations & Performance",
    icon: "⚙️",
    reports: [
      { path: "/dashboard/reports/delivery-performance", name: "Delivery Performance", desc: "On-time delivery tracking" },
      { path: "/dashboard/reports/order-fulfillment", name: "Order Fulfillment", desc: "Order completion metrics" },
      { path: "/dashboard/reports/po-tracking", name: "PO Tracking", desc: "Purchase order status" },
      { path: "/dashboard/reports/returns-analysis", name: "Returns Analysis", desc: "Product returns and reasons" },
      { path: "/dashboard/reports/outward", name: "Outward Transactions", desc: "Deliveries and shipments" },
      { path: "/dashboard/reports/expense-breakdown", name: "Expense Breakdown", desc: "Operating expenses analysis" },
    ],
  },
  {
    id: "advanced",
    name: "Advanced Reports",
    icon: "🚀",
    reports: [
      { path: "/dashboard/reports/scenario", name: "Scenario Planning", desc: "What-if financial scenarios" },
      { path: "/dashboard/reports/year-end", name: "Year-End Summary", desc: "Year-end closing checklist" },
      { path: "/dashboard/reports/audit-exception", name: "Audit Exceptions", desc: "Audit-related exceptions" },
    ],
  },
];

// ── Main Component ──
export default function ReportsPage() {
  const { isMobile } = useResponsive();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter reports based on search
  const filteredCategories = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return REPORT_CATEGORIES.map(cat => ({
      ...cat,
      reports: cat.reports.filter(
        r => r.name.toLowerCase().includes(term) || r.desc.toLowerCase().includes(term)
      ),
    })).filter(cat => cat.reports.length > 0 || searchTerm === "");
  }, [searchTerm]);

  const categoryToShow = selectedCategory
    ? REPORT_CATEGORIES.find(c => c.id === selectedCategory)
    : null;

  const displayCategories = categoryToShow ? [categoryToShow] : filteredCategories;

  const containerStyle: CSSProperties = {
    fontFamily: "'Outfit','Inter',sans-serif",
    color: "var(--text-primary)",
    minHeight: "100vh",
    background: "var(--background)",
  };

  const headerStyle: CSSProperties = {
    padding: isMobile ? "12px 10px" : "20px 16px",
    borderBottom: "1px solid var(--border)",
    marginBottom: "24px",
  };

  const titleStyle: CSSProperties = {
    fontSize: "28px",
    fontWeight: 800,
    marginBottom: "8px",
    letterSpacing: "-0.5px",
  };

  const subtitleStyle: CSSProperties = {
    fontSize: "14px",
    color: "var(--text-muted)",
    marginBottom: "20px",
  };

  const searchStyle: CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--input-bg)",
    color: "var(--text-primary)",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
  };

  const categoryButtonStyle = (isActive: boolean): CSSProperties => ({
    padding: "8px 16px",
    borderRadius: "8px",
    border: isActive ? "1px solid #6366f1" : "1px solid var(--border)",
    background: isActive ? "rgba(99,102,241,0.1)" : "transparent",
    color: isActive ? "#6366f1" : "var(--text-secondary)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  const categoryStyle: CSSProperties = {
    marginBottom: "32px",
  };

  const categoryHeaderStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "1px solid var(--border)",
  };

  const categoryTitleStyle: CSSProperties = {
    fontSize: "16px",
    fontWeight: 700,
    flex: 1,
  };

  const reportsGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "12px",
  };

  const reportCardStyle: CSSProperties = {
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "var(--panel-bg)",
    textDecoration: "none",
    cursor: "pointer",
    transition: "all 0.15s",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  const reportCardHoverStyle: CSSProperties = {
    ...reportCardStyle,
    borderColor: "#6366f1",
    background: "rgba(99,102,241,0.05)",
    transform: "translateY(-2px)",
  };

  const reportNameStyle: CSSProperties = {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--text-primary)",
  };

  const reportDescStyle: CSSProperties = {
    fontSize: "12px",
    color: "var(--text-muted)",
    lineHeight: 1.4,
  };

  const emptyStyle: CSSProperties = {
    padding: isMobile ? "22px 10px" : "40px 20px",
    textAlign: "center",
    color: "var(--text-muted)",
  };

  const backButtonStyle: CSSProperties = {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text-secondary)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    marginBottom: "16px",
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>📊 All Reports</h1>
        <p style={subtitleStyle}>
          Access financial, sales, inventory, tax, and operational reports to make informed business decisions.
        </p>
        <input
          type="text"
          placeholder="Search reports... (e.g., profit, customer, stock)"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSelectedCategory(null);
          }}
          style={searchStyle}
        />
      </div>

      {/* Main content */}
      <div style={{ padding: "0 16px 40px" }}>
        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory(null)}
            style={backButtonStyle}
          >
            ← Back to All Reports
          </button>
        )}

        {searchTerm === "" && !selectedCategory && (
          <div style={{ marginBottom: "24px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Categories
            </p>
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px" }}>
              {REPORT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={categoryButtonStyle(false)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#6366f1";
                    e.currentTarget.style.background = "rgba(99,102,241,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {displayCategories.length === 0 && searchTerm !== "" ? (
          <div style={emptyStyle}>
            <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>No reports found</p>
            <p style={{ fontSize: "12px" }}>Try searching for a different term</p>
          </div>
        ) : displayCategories.length === 0 ? (
          <div style={emptyStyle}>
            <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>No reports in this category</p>
          </div>
        ) : (
          displayCategories.map((category) => (
            <div key={category.id} style={categoryStyle}>
              {!selectedCategory && (
                <div style={categoryHeaderStyle}>
                  <h2 style={categoryTitleStyle}>
                    {category.icon} {category.name}
                  </h2>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {category.reports.length}
                  </span>
                </div>
              )}
              <div style={reportsGridStyle}>
                {category.reports.map((report) => (
                  <Link
                    key={report.path}
                    href={report.path}
                    style={reportCardStyle}
                    onMouseEnter={(e) => {
                      const target = e.currentTarget as HTMLElement;
                      Object.assign(target.style, reportCardHoverStyle);
                    }}
                    onMouseLeave={(e) => {
                      const target = e.currentTarget as HTMLElement;
                      Object.assign(target.style, reportCardStyle);
                    }}
                  >
                    <div style={reportNameStyle}>{report.name}</div>
                    <div style={reportDescStyle}>{report.desc}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
