"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useResponsive } from "@/hooks/useResponsive";

const INVOICE_CATEGORIES = [
  {
    id: "sales",
    name: "Sales Flow",
    icon: "🧾",
    items: [
      { path: "/dashboard/quotation", name: "Quotation", desc: "Create and manage customer quotations" },
      { path: "/dashboard/sales-order", name: "Sales Order", desc: "Track confirmed sales orders" },
      { path: "/dashboard/delivery-challan", name: "Delivery Challan", desc: "Record goods dispatch to customers" },
      { path: "/dashboard/sales-invoice", name: "Sales Invoice", desc: "Create customer invoices and post sales" },
      { path: "/dashboard/sale-return", name: "Sale Return", desc: "Process sales returns and adjustments" },
    ],
  },
  {
    id: "purchase",
    name: "Purchase Flow",
    icon: "📦",
    items: [
      { path: "/dashboard/purchase-order", name: "Purchase Order", desc: "Create supplier purchase orders" },
      { path: "/dashboard/grn", name: "GRN (Goods Receipt)", desc: "Record received goods against PO" },
      { path: "/dashboard/purchase-invoice", name: "Purchase Invoice", desc: "Book supplier invoices" },
      { path: "/dashboard/purchase-return", name: "Purchase Return", desc: "Process returns to suppliers" },
    ],
  },
  {
    id: "collections",
    name: "Collections",
    icon: "💳",
    items: [
      { path: "/dashboard/payment-receipts", name: "Payment Receipts", desc: "Record and track customer payments" },
    ],
  },
];

export default function InvoicesPage() {
  const { isMobile } = useResponsive();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return INVOICE_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (i) => i.name.toLowerCase().includes(term) || i.desc.toLowerCase().includes(term)
      ),
    })).filter((cat) => cat.items.length > 0 || searchTerm === "");
  }, [searchTerm]);

  const categoryToShow = selectedCategory
    ? INVOICE_CATEGORIES.find((c) => c.id === selectedCategory)
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

  const cardStyle: CSSProperties = {
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "var(--panel-bg)",
    textDecoration: "none",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>🧾 All Invoices</h1>
        <p style={subtitleStyle}>
          Open all sales and purchase invoice sections from one place.
        </p>
        <input
          type="text"
          placeholder="Search invoice sections..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSelectedCategory(null);
          }}
          style={searchStyle}
        />
      </div>

      <div style={{ padding: "0 16px 40px" }}>
        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory(null)}
            style={{ ...categoryButtonStyle(false), marginBottom: 16 }}
          >
            ← Back to All Invoices
          </button>
        )}

        {searchTerm === "" && !selectedCategory && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Categories
            </p>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
              {INVOICE_CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={categoryButtonStyle(false)}>
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {displayCategories.map((category) => (
          <div key={category.id} style={{ marginBottom: 32 }}>
            {!selectedCategory && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  {category.icon} {category.name}
                </h2>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{category.items.length}</span>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {category.items.map((item) => (
                <Link key={item.path} href={item.path} style={cardStyle}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{item.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

