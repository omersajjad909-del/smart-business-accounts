"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Val = boolean | string | null;

interface FeatureRow {
  feature: string;
  category?: boolean;
  finova: Val;
  xero: Val;
  zoho: Val;
  wave: Val;
  quickbooks: Val;
  note?: string;
}

const ROWS: FeatureRow[] = [
  // Pricing
  { feature: "💰 PRICING", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Starting price",      finova: "$49/mo",  xero: "$13/mo",  zoho: "$15/mo",  wave: "Free*",   quickbooks: "$30/mo", note: "FinovaOS includes far more at base tier" },
  { feature: "Free plan available", finova: false,     xero: false,     zoho: true,      wave: true,      quickbooks: false },
  { feature: "Regional pricing",    finova: true,      xero: false,     zoho: false,     wave: false,     quickbooks: false, note: "Localized pricing for PKR, AED, SAR & more" },
  { feature: "Multi-currency",      finova: true,      xero: true,      zoho: true,      wave: false,     quickbooks: true },
  { feature: "Per-user pricing",    finova: false,     xero: true,      xero2: true,     zoho: true,      wave: false,     quickbooks: true, note: "FinovaOS: unlimited users, no extra cost" } as FeatureRow,

  // Core Accounting
  { feature: "📊 CORE ACCOUNTING", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "General Ledger",          finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Trial Balance",           finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "P&L / Income Statement",  finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Balance Sheet",           finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Journal Vouchers",        finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "Bank Reconciliation",     finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Cost Centers",            finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: false },
  { feature: "Financial Year Close",    finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "Budget vs Actual",        finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },

  // Sales & Invoicing
  { feature: "🧾 SALES & INVOICING", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Sales Invoices",          finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Quotations",              finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "Sales Orders",            finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Delivery Challan",        finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Sale Returns",            finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "Payment Receipts",        finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "WhatsApp invoice sharing",finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "AI Invoice Generator",    finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Customer Portal",         finova: false, xero: true,  zoho: true,  wave: false, quickbooks: true },

  // Purchasing
  { feature: "🛒 PURCHASING", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Purchase Invoices",       finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Purchase Orders",         finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "GRN (Goods Receipt)",     finova: true,  xero: false, zoho: true,  wave: false, quickbooks: false },
  { feature: "Advance Payments",        finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Expense Vouchers",        finova: true,  xero: true,  zoho: true,  wave: true,  quickbooks: true },
  { feature: "Supplier Aging Report",   finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },

  // Inventory
  { feature: "📦 INVENTORY", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Stock Management",        finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Low Stock Alerts",        finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Multi-warehouse",         finova: true,  xero: false, zoho: true,  wave: false, quickbooks: false },
  { feature: "Barcode / SKU",           finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "AI Demand Forecasting",   finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Stock Valuation (FIFO)",  finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },

  // HR & Payroll
  { feature: "👥 HR & PAYROLL", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Employee Management",     finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "Salary Processing",       finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },
  { feature: "Attendance Tracking",     finova: true,  xero: false, zoho: true,  wave: false, quickbooks: false },
  { feature: "Leave Management",        finova: true,  xero: false, zoho: true,  wave: false, quickbooks: false },
  { feature: "Statutory deductions",    finova: true,  xero: false, zoho: false, wave: false, quickbooks: false, note: "EOBI (PK), GOSI (KSA), GPSSA (UAE) & more" },
  { feature: "Salary Slip PDF",         finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true },

  // AI Features
  { feature: "🤖 AI FEATURES", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "AI receipt scanning",     finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "AI invoice generation",   finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Churn prediction",        finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Supplier negotiation AI", finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Cash flow optimization",  finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "GL auto-suggest",         finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Inventory AI forecast",   finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },

  // Multi-branch
  { feature: "🏢 MULTI-BRANCH", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Multi-branch support",    finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Consolidated reports",    finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Per-branch P&L",         finova: true,  xero: false, zoho: true,  wave: false, quickbooks: true },
  { feature: "Inter-branch transfers",  finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },

  // Support & Localisation
  { feature: "🌍 LOCALISATION & SUPPORT", category: true, finova: "", xero: "", zoho: "", wave: "", quickbooks: "" },
  { feature: "Regional GST/Tax support",finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true, note: "FBR (PK), VAT (UAE/KSA), GCC tax compliance" },
  { feature: "FBR integration",         finova: "Soon",xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "Arabic / Urdu UI",        finova: "Soon",xero: false, zoho: "AR",  wave: false, quickbooks: false },
  { feature: "WhatsApp support",        finova: true,  xero: false, zoho: false, wave: false, quickbooks: false },
  { feature: "24/7 support",            finova: false, xero: false, zoho: false, wave: false, quickbooks: true },
  { feature: "Multi-region support",    finova: true,  xero: true,  zoho: true,  wave: false, quickbooks: true, note: "Pakistan, UAE, Saudi Arabia, Global" },
];

const COMPETITORS = [
  { key: "finova",     label: "FinovaOS",    color: "#818cf8", logo: "F", highlight: true },
  { key: "xero",       label: "Xero",        color: "#4b5563", logo: "X" },
  { key: "zoho",       label: "Zoho Books",  color: "#4b5563", logo: "Z" },
  { key: "wave",       label: "Wave",        color: "#4b5563", logo: "W" },
  { key: "quickbooks", label: "QuickBooks",  color: "#4b5563", logo: "Q" },
];

function Cell({ val, highlight }: { val: Val; highlight?: boolean }) {
  const cls = "col";
  if (val === true)  return <td className={cls} style={{ textAlign: "center", padding: "10px 14px" }}><span style={{ color: highlight ? "#34d399" : "#4ade80", fontSize: 16 }}>✓</span></td>;
  if (val === false) return <td className={cls} style={{ textAlign: "center", padding: "10px 14px" }}><span style={{ color: "#374151", fontSize: 14 }}>—</span></td>;
  if (typeof val === "string" && val !== "") return <td className={cls} style={{ textAlign: "center", padding: "10px 14px", fontSize: 12, color: highlight ? "#fbbf24" : "#6b7280", fontWeight: 600 }}>{val}</td>;
  return <td className={cls} style={{ padding: "10px 14px" }} />;
}

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.05 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, vis };
}

export default function ComparePage() {
  const { ref, vis } = useInView();
  const [search, setSearch] = useState("");

  const filtered = ROWS.filter(r => r.category || r.feature.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#04061a 0%,#080c2a 60%,#04061a 100%)", fontFamily: "'Outfit','Inter',sans-serif", color: "#e2e8f0" }}>
      <div style={{ padding: "20px 32px" }}>
        <Link href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 14 }}>← Back to FinovaOS</Link>
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "60px 24px 48px", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "inline-block", background: "rgba(129,140,248,.12)", border: "1px solid rgba(129,140,248,.3)", color: "#818cf8", padding: "5px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          FinovaOS vs Competitors
        </div>
        <h1 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 800, margin: "0 0 14px", lineHeight: 1.2 }}>
          How does FinovaOS compare?
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 16, marginBottom: 32 }}>
          An honest comparison of FinovaOS vs Xero, Zoho Books, Wave, and QuickBooks — feature by feature.
        </p>

        {/* Win badges */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
          {[
            { icon: "🤖", label: "7 AI features — more than all competitors combined" },
            { icon: "🌍", label: "Multi-region: PKR · AED · SAR · USD & more" },
            { icon: "👥", label: "Unlimited users — no per-seat fees" },
          ].map(b => (
            <div key={b.label} style={{ background: "rgba(129,140,248,.08)", border: "1px solid rgba(129,140,248,.2)", borderRadius: 12, padding: "8px 14px", fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{b.icon}</span> {b.label}
            </div>
          ))}
        </div>

        {/* Search */}
        <input
          placeholder="Search features…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 400, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "#e2e8f0", padding: "10px 16px", fontSize: 14, outline: "none", fontFamily: "inherit" }}
        />
      </div>

      {/* Table */}
      <div ref={ref} className="cmp-wrap" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 12px 60px", opacity: vis ? 1 : 0, transition: "opacity .5s" }}>
        <style>{`
          .cmp-scroll{overflow-x:auto;border-radius:20px;border:1px solid rgba(255,255,255,.08);background:#070a22;}
          .cmp-table{width:100%;border-collapse:separate;border-spacing:0;background:#070a22;}
          .cmp-table th,.cmp-table td{border-bottom:1px solid rgba(255,255,255,.04);}
          .cmp-table th.feat-col,.cmp-table td.feat-col{
            position:sticky;left:0;background:#070a22;z-index:2;
            box-shadow:2px 0 6px rgba(0,0,0,.4);
          }
          .cmp-table thead th.feat-col{background:#0a0e2d;z-index:3;}
          .cmp-table tr.cat-row td.feat-col{background:#0a0d28;}

          @media(max-width:780px){
            .cmp-wrap{padding:0 8px 40px !important;}
            .cmp-table{min-width:480px;}
            .cmp-table th.feat-col,.cmp-table td.feat-col{width:130px;min-width:130px;max-width:130px;}
            .cmp-table th.col,.cmp-table td.col{min-width:72px;}
            .cmp-table td{padding:9px 8px !important;font-size:12px !important;}
            .cmp-table th{padding:12px 8px !important;font-size:12px !important;}
            .cmp-hint{display:flex !important;}
          }
          .cmp-hint{display:none;align-items:center;gap:6px;justify-content:center;color:#475569;font-size:11px;margin-top:8px;}
        `}</style>

        <div className="cmp-hint">← swipe to compare Xero · Zoho · Wave · QuickBooks →</div>

        <div className="cmp-scroll">
          <table className="cmp-table">
            <thead>
              <tr style={{ background: "rgba(99,102,241,.1)" }}>
                <th className="feat-col" style={{ textAlign: "left", padding: "16px 20px", fontWeight: 700, fontSize: 14, width: "35%" }}>Feature</th>
                {COMPETITORS.map(c => (
                  <th key={c.key} className="col" style={{ textAlign: "center", padding: "16px 14px", fontWeight: 700, fontSize: 13 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: c.highlight ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: c.highlight ? "#fff" : "#64748b" }}>
                        {c.logo}
                      </div>
                      <span style={{ color: c.highlight ? "#818cf8" : "#64748b", fontSize: 12 }}>{c.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                if (row.category) {
                  return (
                    <tr key={i} className="cat-row" style={{ background: "rgba(255,255,255,.03)" }}>
                      <td className="feat-col" colSpan={1} style={{ padding: "12px 20px", fontSize: 13, fontWeight: 700, color: "#64748b", letterSpacing: ".04em", whiteSpace: "nowrap" }}>{row.feature}</td>
                      <td className="col" colSpan={5} style={{ background: "rgba(255,255,255,.03)" }} />
                    </tr>
                  );
                }
                return (
                  <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.01)" }}>
                    <td className="feat-col" style={{ padding: "10px 20px", fontSize: 14 }}>
                      {row.feature}
                      {row.note && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{row.note}</div>}
                    </td>
                    <Cell val={row.finova} highlight />
                    <Cell val={row.xero} />
                    <Cell val={row.zoho} />
                    <Cell val={row.wave} />
                    <Cell val={row.quickbooks} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: "#374151", textAlign: "center" }}>
          * Wave free plan has limited features and charges transaction fees. Data accurate as of June 2026.
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "60px 24px 100px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <h2 style={{ fontSize: 30, fontWeight: 700, margin: "0 0 12px" }}>Make the switch to FinovaOS</h2>
        <p style={{ color: "#64748b", marginBottom: 28, fontSize: 15 }}>Import your data from Xero, Zoho, or QuickBooks in minutes.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/onboarding/choose-plan" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", padding: "13px 28px", borderRadius: 12, fontWeight: 700, textDecoration: "none", fontSize: 15 }}>
            Get Started →
          </Link>
          <Link href="/pricing" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", padding: "13px 28px", borderRadius: 12, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>
            View Pricing
          </Link>
          <Link href="/roi-calculator" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", padding: "13px 28px", borderRadius: 12, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>
            Calculate ROI
          </Link>
        </div>
      </div>
    </div>
  );
}
