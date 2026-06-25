"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";

const AI_CATEGORIES = [
  {
    id: "core",
    name: "Core",
    icon: "AI",
    items: [
      { path: "/dashboard/ai?tab=overview", name: "AI Overview", desc: "Open the main AI dashboard with health, insights, and forecasts." },
      { path: "/dashboard/ai?tab=chat", name: "Ask AI", desc: "Chat with FinovaOS AI about your business, cash flow, or invoices." },
      { path: "/dashboard/ai?tab=insights", name: "Financial Insights", desc: "See AI-generated summaries, revenue analysis, and profitability signals." },
      { path: "/dashboard/ai?tab=alerts", name: "Alerts Center", desc: "Review critical warnings, unusual patterns, and anomaly alerts." },
    ],
  },
  {
    id: "planning",
    name: "Planning & Strategy",
    icon: "FX",
    items: [
      { path: "/dashboard/ai?tab=forecast", name: "Cash Flow Forecast", desc: "30, 60, and 90 day forecast with AI cash analysis." },
      { path: "/dashboard/ai?tab=recommendations", name: "Recommendations", desc: "Actionable next steps generated from live data." },
      { path: "/dashboard/ai?tab=market", name: "Market Intelligence", desc: "Industry trends, competitor edge, and new product ideas." },
      { path: "/dashboard/ai?tab=advisor", name: "Business Advisor", desc: "AI growth plan, quick wins, and risk mitigation ideas." },
    ],
  },
  {
    id: "automation",
    name: "Automation & Compliance",
    icon: "OP",
    items: [
      { path: "/dashboard/ai?tab=reminders", name: "Invoice Reminder Center", desc: "Smart follow-up queue for overdue customers." },
      { path: "/dashboard/ai?tab=tax", name: "AI Tax Estimate", desc: "Estimated tax position based on invoices and tax profiles." },
      { path: "/dashboard/ai?tab=report", name: "Monthly AI Report", desc: "Generate the monthly AI summary with risk and highlights." },
      { path: "/dashboard/ai?tab=reconciliation", name: "Smart Reconciliation AI", desc: "Auto-match bank transactions to invoices and expenses with confidence scoring." },
    ],
  },
];

export default function AICenterPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return AI_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) => item.name.toLowerCase().includes(term) || item.desc.toLowerCase().includes(term)
      ),
    })).filter((cat) => cat.items.length > 0 || searchTerm === "");
  }, [searchTerm]);

  const activeCategory = selectedCategory
    ? AI_CATEGORIES.find((category) => category.id === selectedCategory)
    : null;

  const displayCategories = activeCategory ? [activeCategory] : filteredCategories;

  const containerStyle: CSSProperties = {
    fontFamily: "'Outfit','Inter',sans-serif",
    color: "var(--text-primary)",
    minHeight: "100vh",
    background: "transparent",
  };

  const headerStyle: CSSProperties = {
    padding: "18px 16px",
    marginBottom: "22px",
    borderRadius: 20,
    border: "1px solid rgba(99,102,241,.18)",
    background: "linear-gradient(135deg, rgba(79,70,229,.18), rgba(15,23,42,.82))",
    boxShadow: "0 18px 40px rgba(15,23,42,.22)",
  };

  const titleStyle: CSSProperties = {
    fontSize: "26px",
    fontWeight: 800,
    marginBottom: "8px",
    letterSpacing: "-0.04em",
  };

  const subtitleStyle: CSSProperties = {
    fontSize: "13px",
    color: "rgba(255,255,255,.68)",
    marginBottom: "18px",
    lineHeight: 1.6,
    maxWidth: 720,
  };

  const searchStyle: CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(7,12,24,.45)",
    color: "var(--text-primary)",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  const categoryButtonStyle = (isActive: boolean): CSSProperties => ({
    padding: "8px 14px",
    borderRadius: "999px",
    border: isActive ? "1px solid rgba(99,102,241,.55)" : "1px solid rgba(255,255,255,.08)",
    background: isActive ? "rgba(99,102,241,.16)" : "rgba(255,255,255,.03)",
    color: isActive ? "#c7d2fe" : "rgba(255,255,255,.72)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  });

  const cardStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    textDecoration: "none",
    padding: "18px 18px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.08)",
    background: "linear-gradient(180deg, rgba(20,31,59,.95), rgba(15,26,48,.9))",
    boxShadow: "0 16px 30px rgba(2,6,23,.2)",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#a5b4fc", fontWeight: 800, marginBottom: 8 }}>
          AI Workspace
        </div>
        <h1 style={titleStyle}>All AI Tools</h1>
        <p style={subtitleStyle}>
          Open every FinovaOS AI feature from one place. Forecasts, reminders, insights, tax, market intelligence, and business advice are all here.
        </p>
        <input
          type="text"
          placeholder="Search AI tools..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSelectedCategory(null);
          }}
          style={searchStyle}
        />
      </div>

      <div style={{ padding: "0 4px 28px" }}>
        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory(null)}
            style={{ ...categoryButtonStyle(false), marginBottom: 16 }}
          >
            Back to All AI
          </button>
        )}

        {searchTerm === "" && !selectedCategory && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".08em" }}>
              Categories
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
              {AI_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  style={categoryButtonStyle(false)}
                >
                  {category.icon} {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {displayCategories.map((category) => (
          <div key={category.id} style={{ marginBottom: 28 }}>
            {!selectedCategory && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                  {category.icon} {category.name}
                </h2>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{category.items.length}</span>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {category.items.map((item) => (
                <Link key={item.path} href={item.path} style={cardStyle}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>{item.name}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text-muted)" }}>{item.desc}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", marginTop: 2 }}>Open tool {'->'}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
