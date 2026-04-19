"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface BizType {
  id: string;
  label: string;
  icon: string;
  phase: 1 | 2 | 3 | 4;
  category: string;
  description: string;
  isLive: boolean;
}

// Category-based feature sets
const CATEGORY_FEATURES: Record<string, { icon: string; title: string; desc: string }[]> = {
  Commerce: [
    { icon: "🧾", title: "Sales & Purchase Invoicing",     desc: "Create professional invoices, POs, and delivery challans in seconds." },
    { icon: "📦", title: "Inventory Management",           desc: "Real-time stock tracking, GRN, barcode scanning, and reorder alerts." },
    { icon: "📒", title: "Party Ledger & Ageing",          desc: "Full customer/supplier ledger with ageing reports and balance tracking." },
    { icon: "🏪", title: "Multi-Branch Operations",        desc: "Manage multiple warehouses or branches from one dashboard." },
    { icon: "📊", title: "Trade Reports",                  desc: "Sales analysis, purchase history, profit margins, and stock valuation." },
    { icon: "💳", title: "Receivables & Payables",         desc: "Track outstanding payments, send reminders, and reconcile accounts." },
  ],
  Services: [
    { icon: "🧾", title: "Project & Retainer Billing",     desc: "Invoice clients by project, milestone, or monthly retainer." },
    { icon: "💰", title: "Expense Tracking",               desc: "Log and categorize every business expense with receipt attachments." },
    { icon: "👥", title: "CRM & Client Management",        desc: "Manage contacts, follow-ups, and client communication history." },
    { icon: "👨‍💼", title: "HR & Payroll",                   desc: "Staff attendance, salary processing, and leave management." },
    { icon: "📊", title: "Profitability Reports",          desc: "Know exactly which clients and projects are most profitable." },
    { icon: "🔄", title: "Recurring Invoices",             desc: "Auto-generate invoices for repeat clients on a schedule." },
  ],
  Healthcare: [
    { icon: "🏥", title: "Patient Billing",                desc: "Generate itemized bills for consultations, procedures, and medicines." },
    { icon: "💊", title: "Pharmacy Inventory",             desc: "Drug stock with expiry alerts, batch tracking, and auto-reorder." },
    { icon: "📋", title: "Doctor & OPD Management",        desc: "Appointment scheduling, consultation fees, and shift management." },
    { icon: "🏦", title: "Insurance Claims",               desc: "Track insurance payments, TPAs, and claim statuses." },
    { icon: "📊", title: "Revenue Analytics",              desc: "Daily OPD revenue, department-wise income, and cost reports." },
    { icon: "🏢", title: "Multi-Branch / Chain",           desc: "Manage multiple clinics or hospital branches from one place." },
  ],
  Education: [
    { icon: "💰", title: "Fee Collection",                 desc: "Collect tuition, transport, and activity fees with instant receipts." },
    { icon: "📒", title: "Student Ledger",                 desc: "Per-student fee accounts with outstanding balance tracking." },
    { icon: "👨‍💼", title: "Staff Payroll",                  desc: "Teacher and admin salary processing with deductions and bonuses." },
    { icon: "📅", title: "Academic Year Management",       desc: "Manage fiscal and academic years independently." },
    { icon: "📊", title: "Financial Reports",              desc: "Monthly income statements, department budgets, and audit trails." },
    { icon: "🏢", title: "Multi-Campus",                   desc: "Centralized reporting across all your campuses and branches." },
  ],
  Hospitality: [
    { icon: "🍽️", title: "Table & Order Billing",         desc: "Fast POS for dine-in, takeaway, and delivery orders." },
    { icon: "📦", title: "Food & Beverage Inventory",      desc: "Ingredient stock, recipe costing, and wastage tracking." },
    { icon: "👨‍💼", title: "Staff Management",              desc: "Shift scheduling, attendance, and payroll for all staff." },
    { icon: "📊", title: "Daily Sales Reports",            desc: "Revenue by category, table, or shift with end-of-day summaries." },
    { icon: "🏢", title: "Multi-Outlet",                   desc: "Run multiple restaurant branches from one centralized dashboard." },
    { icon: "💳", title: "Supplier Payments",              desc: "Track vendor bills, payments, and outstanding balances." },
  ],
  Production: [
    { icon: "🏭", title: "Bill of Materials (BOM)",       desc: "Define product recipes and track raw material consumption." },
    { icon: "⚙️", title: "Production Orders",             desc: "Plan and track manufacturing batches from start to finish." },
    { icon: "📦", title: "Raw Material Stock",            desc: "Monitor inputs, finished goods, and work-in-progress inventory." },
    { icon: "💰", title: "Production Cost Tracking",      desc: "Calculate cost per unit including labor, materials, and overhead." },
    { icon: "📊", title: "Efficiency Reports",            desc: "Yield analysis, wastage reports, and batch comparisons." },
    { icon: "🚛", title: "Dispatch & Delivery",           desc: "Outward shipments, delivery challans, and client invoicing." },
  ],
  Logistics: [
    { icon: "🚛", title: "Fleet Management",              desc: "Vehicle assignments, fuel tracking, and maintenance logs." },
    { icon: "📦", title: "Shipment Tracking",             desc: "Monitor consignments from pickup to delivery with status updates." },
    { icon: "💰", title: "Freight Billing",               desc: "Invoice clients by weight, volume, or distance with auto-calculations." },
    { icon: "🏦", title: "COD Reconciliation",            desc: "Track cash-on-delivery collections across routes and riders." },
    { icon: "📊", title: "Route Profitability",           desc: "Know which routes, drivers, and clients generate the most profit." },
    { icon: "👨‍💼", title: "Driver Payroll",               desc: "Commission-based or salary payroll for your entire fleet." },
  ],
  default: [
    { icon: "📒", title: "Full Accounting Suite",         desc: "Journal vouchers, ledger, trial balance, P&L, and balance sheet." },
    { icon: "🧾", title: "Sales & Purchase Invoicing",    desc: "Professional invoices with PDF export, branding, and WhatsApp sharing." },
    { icon: "📦", title: "Inventory Management",          desc: "Stock control, GRN, barcode scanning, and low-stock alerts." },
    { icon: "👨‍💼", title: "HR & Payroll",                  desc: "Attendance, salary processing, and leave management." },
    { icon: "📊", title: "Business Reports",              desc: "Profit & loss, cash flow, ageing, and custom financial reports." },
    { icon: "🏢", title: "Multi-Branch",                  desc: "Manage multiple locations from a single consolidated dashboard." },
  ],
};

// Phase badge colors
const PHASE_COLORS: Record<number, string> = { 1:"#34d399", 2:"#818cf8", 3:"#fbbf24", 4:"#f87171" };
const PHASE_LABELS: Record<number, string> = { 1:"Live Now", 2:"Phase 2 — Coming Soon", 3:"Phase 3 — Planned", 4:"Phase 4 — Roadmap" };

// Category-based plan feature rows
const PLAN_ROWS: Record<string, { feature: string; starter: string | boolean; pro: string | boolean; enterprise: string | boolean }[]> = {
  Healthcare: [
    { feature: "Patient billing",          starter: true,         pro: true,             enterprise: true },
    { feature: "Pharmacy inventory",       starter: "Basic",      pro: true,             enterprise: true },
    { feature: "Doctor & OPD management",  starter: false,        pro: true,             enterprise: true },
    { feature: "Insurance claims",         starter: false,        pro: true,             enterprise: true },
    { feature: "Multi-branch / chain",     starter: false,        pro: "Up to 3",        enterprise: "Unlimited" },
    { feature: "Revenue analytics",        starter: "Basic",      pro: "Advanced",       enterprise: "Full suite" },
    { feature: "Staff payroll",            starter: false,        pro: true,             enterprise: true },
    { feature: "Lab & diagnostic records", starter: false,        pro: false,            enterprise: true },
  ],
  Education: [
    { feature: "Fee collection",           starter: true,         pro: true,             enterprise: true },
    { feature: "Student ledger",           starter: true,         pro: true,             enterprise: true },
    { feature: "Staff payroll",            starter: "Basic",      pro: true,             enterprise: true },
    { feature: "Academic year management", starter: true,         pro: true,             enterprise: true },
    { feature: "Multi-campus",             starter: false,        pro: "Up to 3",        enterprise: "Unlimited" },
    { feature: "Financial reports",        starter: "Basic",      pro: "Advanced",       enterprise: "Full suite" },
    { feature: "Parent communication",     starter: false,        pro: true,             enterprise: true },
    { feature: "Custom fee structures",    starter: false,        pro: false,            enterprise: true },
  ],
  Commerce: [
    { feature: "Sales & purchase invoicing", starter: true,       pro: true,             enterprise: true },
    { feature: "Inventory management",       starter: "Basic",    pro: true,             enterprise: true },
    { feature: "Party ledger & ageing",      starter: true,       pro: true,             enterprise: true },
    { feature: "Multi-branch operations",    starter: false,      pro: "Up to 3",        enterprise: "Unlimited" },
    { feature: "Bank reconciliation",        starter: false,      pro: true,             enterprise: true },
    { feature: "Trade reports",              starter: "Basic",    pro: "Advanced",       enterprise: "Full suite" },
    { feature: "CRM",                        starter: false,      pro: true,             enterprise: true },
    { feature: "API access",                 starter: false,      pro: false,            enterprise: true },
  ],
  Services: [
    { feature: "Project & retainer billing", starter: true,       pro: true,             enterprise: true },
    { feature: "Expense tracking",           starter: true,       pro: true,             enterprise: true },
    { feature: "CRM & client management",    starter: "Basic",    pro: true,             enterprise: true },
    { feature: "HR & payroll",               starter: false,      pro: true,             enterprise: true },
    { feature: "Recurring invoices",         starter: false,      pro: true,             enterprise: true },
    { feature: "Multi-branch",               starter: false,      pro: "Up to 3",        enterprise: "Unlimited" },
    { feature: "Profitability reports",      starter: "Basic",    pro: "Advanced",       enterprise: "Full suite" },
    { feature: "API access",                 starter: false,      pro: false,            enterprise: true },
  ],
  Hospitality: [
    { feature: "Table & order billing",      starter: true,       pro: true,             enterprise: true },
    { feature: "F&B inventory",              starter: "Basic",    pro: true,             enterprise: true },
    { feature: "Staff management & payroll", starter: false,      pro: true,             enterprise: true },
    { feature: "Recipe / food costing",      starter: false,      pro: true,             enterprise: true },
    { feature: "Multi-outlet",               starter: false,      pro: "Up to 3",        enterprise: "Unlimited" },
    { feature: "Daily sales reports",        starter: "Basic",    pro: "Advanced",       enterprise: "Full suite" },
    { feature: "Supplier payments",          starter: true,       pro: true,             enterprise: true },
    { feature: "White-label branding",       starter: false,      pro: false,            enterprise: true },
  ],
  default: [
    { feature: "Invoicing & billing",        starter: true,       pro: true,             enterprise: true },
    { feature: "Inventory management",       starter: "Basic",    pro: true,             enterprise: true },
    { feature: "Ledger & trial balance",     starter: true,       pro: true,             enterprise: true },
    { feature: "HR & payroll",               starter: false,      pro: true,             enterprise: true },
    { feature: "Multi-branch",               starter: false,      pro: "Up to 3",        enterprise: "Unlimited" },
    { feature: "Advanced reports",           starter: "Basic",    pro: "Advanced",       enterprise: "Full suite" },
    { feature: "CRM",                        starter: false,      pro: true,             enterprise: true },
    { feature: "API access",                 starter: false,      pro: false,            enterprise: true },
  ],
};

function PlanComparison({ label, category }: { label: string; category: string }) {
  const [prices, setPrices] = useState({ starter: 49, pro: 99, enterprise: 249 });
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    fetch("/api/public/pricing")
      .then(r => r.json())
      .then(d => {
        if (d?.pricing) setPrices({
          starter:    d.pricing.starter?.monthly    ?? 49,
          pro:        d.pricing.pro?.monthly        ?? 99,
          enterprise: d.pricing.enterprise?.monthly ?? 249,
        });
      }).catch(() => {});
    fetch("/api/public/geo", { cache: "no-store" })
      .then(r => r.json()).then(d => { if (d?.currency) setCurrency(d.currency); }).catch(() => {});
  }, []);

  const rows = PLAN_ROWS[category] ?? PLAN_ROWS.default;

  const PLANS = [
    { key: "starter",    name: "Starter",      price: prices.starter,    color: "#818cf8", gradient: "linear-gradient(135deg,#6366f1,#4f46e5)" },
    { key: "pro",        name: "Professional", price: prices.pro,        color: "#a5b4fc", gradient: "linear-gradient(135deg,#818cf8,#6366f1)", featured: true },
    { key: "enterprise", name: "Enterprise",   price: prices.enterprise, color: "#34d399", gradient: "linear-gradient(135deg,#059669,#34d399)" },
  ];

  function fmtPrice(usd: number) {
    try {
      const { formatFromUSD } = require("@/lib/currency");
      return formatFromUSD(usd, currency);
    } catch { return `$${usd}`; }
  }

  function Cell({ val }: { val: string | boolean }) {
    if (val === true)  return <span style={{ color: "#34d399", fontSize: 18 }}>✓</span>;
    if (val === false) return <span style={{ color: "rgba(255,255,255,.15)", fontSize: 16 }}>—</span>;
    return <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.75)" }}>{val as string}</span>;
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto 80px", padding: "0 24px" }}>
      <h2 style={{ textAlign: "center", fontSize: "clamp(22px,3vw,34px)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 10 }}>
        Which plan suits your {label}?
      </h2>
      <p style={{ textAlign: "center", color: "rgba(255,255,255,.4)", fontSize: 15, marginBottom: 40 }}>
        All plans include core accounting. Higher plans unlock more {label.toLowerCase()} features.
      </p>

      <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}>
        {/* Plan headers */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}>
          <div style={{ padding: "20px 24px", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
            Feature
          </div>
          {PLANS.map(p => (
            <div key={p.key} style={{ padding: "20px 16px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.06)", background: p.featured ? "rgba(99,102,241,.06)" : "transparent" }}>
              {p.featured && <div style={{ fontSize: 9, fontWeight: 800, color: "#fbbf24", letterSpacing: ".08em", marginBottom: 4 }}>POPULAR</div>}
              <div style={{ fontSize: 13, fontWeight: 900, color: p.color, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{fmtPrice(p.price)}<span style={{ fontSize: 10, color: "rgba(255,255,255,.4)", fontWeight: 500 }}>/mo</span></div>
            </div>
          ))}
        </div>

        {/* Feature rows */}
        {rows.map((row, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.01)" }}>
            <div style={{ padding: "13px 24px", fontSize: 13, color: "rgba(255,255,255,.65)" }}>{row.feature}</div>
            {(["starter","pro","enterprise"] as const).map(k => (
              <div key={k} style={{ padding: "13px 16px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.04)", background: k === "pro" ? "rgba(99,102,241,.03)" : "transparent" }}>
                <Cell val={row[k]} />
              </div>
            ))}
          </div>
        ))}

        {/* CTA row */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "rgba(255,255,255,.02)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ padding: "20px 24px", fontSize: 12, color: "rgba(255,255,255,.3)" }}>75% off for first 3 months</div>
          {PLANS.map(p => (
            <div key={p.key} style={{ padding: "16px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.06)", background: p.featured ? "rgba(99,102,241,.06)" : "transparent" }}>
              <Link href={`/onboarding/signup/${p.key === "pro" ? "professional" : p.key}`} style={{
                display: "block", padding: "10px 0", borderRadius: 10,
                background: p.featured ? p.gradient : "rgba(255,255,255,.07)",
                border: p.featured ? "none" : `1px solid ${p.color}30`,
                color: "white", fontWeight: 700, fontSize: 12, textDecoration: "none",
              }}>
                Get {p.name}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Link href="/pricing" style={{ fontSize: 13, color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>
          View full pricing details →
        </Link>
      </div>
    </div>
  );
}

export default function IndustryPage() {
  const { industry } = useParams<{ industry: string }>();
  const router = useRouter();
  const [type, setType]         = useState<BizType | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notified, setNotified] = useState(false);
  const [email, setEmail]       = useState("");
  const [sending, setSending]   = useState(false);

  useEffect(() => {
    fetch("/api/public/business-types")
      .then(r => r.json())
      .then(d => {
        const found = (d.types ?? []).find((t: BizType) => t.id === industry);
        setType(found ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [industry]);

  async function joinWaitlist() {
    if (!email || sending) return;
    setSending(true);
    try {
      await fetch("/api/public/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, businessType: industry }),
      });
      setNotified(true);
    } catch {}
    setSending(false);
  }

  const ff = "'Outfit','DM Sans',sans-serif";

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#080c1e", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:ff, color:"rgba(255,255,255,.3)", fontSize:15 }}>
      Loading…
    </div>
  );

  if (!type) return (
    <div style={{ minHeight:"100vh", background:"#080c1e", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:ff, color:"white", gap:20, textAlign:"center", padding:24 }}>
      <div style={{ fontSize:64 }}>🔍</div>
      <h1 style={{ fontSize:28, fontWeight:900, margin:0 }}>Industry not found</h1>
      <p style={{ color:"rgba(255,255,255,.4)", margin:0 }}>We couldn't find "{industry}" in our system.</p>
      <Link href="/industries" style={{ padding:"12px 24px", borderRadius:12, background:"rgba(99,102,241,.2)", border:"1px solid rgba(99,102,241,.4)", color:"#a5b4fc", textDecoration:"none", fontWeight:700 }}>
        Browse all industries →
      </Link>
    </div>
  );

  const features = CATEGORY_FEATURES[type.category] ?? CATEGORY_FEATURES.default;
  const phaseColor = PHASE_COLORS[type.phase];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#060918 0%,#080c22 50%,#0a0f2a 100%)", fontFamily:ff, color:"white" }}>

      {/* ── Back nav ── */}
      <div style={{ padding:"20px 24px", maxWidth:1160, margin:"0 auto" }}>
        <button onClick={() => router.back()} style={{
          display:"flex", alignItems:"center", gap:8, background:"none", border:"1px solid rgba(255,255,255,.1)",
          borderRadius:10, padding:"8px 16px", color:"rgba(255,255,255,.5)", fontSize:13,
          fontWeight:600, cursor:"pointer", fontFamily:ff, transition:"all .2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,255,255,.25)"; e.currentTarget.style.color="rgba(255,255,255,.8)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,.1)"; e.currentTarget.style.color="rgba(255,255,255,.5)"; }}
        >
          ← Back
        </button>
      </div>

      {/* ── Hero ── */}
      <div style={{ maxWidth:1160, margin:"0 auto", padding:"40px 24px 80px", textAlign:"center" }}>
        <div style={{ fontSize:80, marginBottom:24, lineHeight:1 }}>{type.icon}</div>

        {/* Status badge */}
        <div style={{ marginBottom:20 }}>
          <span style={{
            display:"inline-flex", alignItems:"center", gap:6, padding:"6px 16px",
            borderRadius:20, fontSize:12, fontWeight:800,
            background: type.isLive ? "rgba(52,211,153,.15)" : "rgba(129,140,248,.12)",
            border: `1px solid ${type.isLive ? "rgba(52,211,153,.4)" : "rgba(129,140,248,.35)"}`,
            color: type.isLive ? "#34d399" : "#818cf8",
          }}>
            {type.isLive ? "🟢 Live Now" : `⏳ ${PHASE_LABELS[type.phase]}`}
          </span>
        </div>

        <h1 style={{ fontSize:"clamp(32px,5vw,58px)", fontWeight:900, letterSpacing:"-2px", lineHeight:1.1, margin:"0 0 16px" }}>
          FinovaOS for{" "}
          <span style={{ background:`linear-gradient(135deg,${phaseColor},#6366f1)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            {type.label}
          </span>
        </h1>
        <p style={{ fontSize:18, color:"rgba(255,255,255,.45)", maxWidth:600, margin:"0 auto 36px", lineHeight:1.7 }}>
          {type.description}
        </p>

        {type.isLive ? (
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/onboarding/signup/starter" style={{
              padding:"14px 32px", borderRadius:14, background:"linear-gradient(135deg,#6366f1,#4f46e5)",
              color:"white", fontWeight:800, fontSize:15, textDecoration:"none",
              boxShadow:"0 8px 32px rgba(99,102,241,.4)",
            }}>
              Get Started →
            </Link>
            <Link href="/pricing" style={{
              padding:"14px 32px", borderRadius:14, background:"rgba(255,255,255,.06)",
              border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.8)",
              fontWeight:700, fontSize:15, textDecoration:"none",
            }}>
              View Pricing
            </Link>
          </div>
        ) : (
          /* Waitlist form */
          <div style={{ maxWidth:460, margin:"0 auto" }}>
            {notified ? (
              <div style={{ padding:"20px 28px", borderRadius:16, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.3)", color:"#34d399", fontWeight:700, fontSize:15 }}>
                ✅ You&apos;re on the waitlist! We&apos;ll notify you when {type.label} goes live.
              </div>
            ) : (
              <div style={{ padding:"28px 32px", borderRadius:20, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)" }}>
                <p style={{ fontSize:14, color:"rgba(255,255,255,.5)", marginBottom:16, fontWeight:600 }}>
                  🔔 Get notified when {type.label} launches
                </p>
                <div style={{ display:"flex", gap:10 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    onKeyDown={e => e.key==="Enter" && joinWaitlist()}
                    style={{ flex:1, padding:"12px 16px", borderRadius:10, background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)", color:"white", fontSize:14, outline:"none", fontFamily:ff }}
                  />
                  <button onClick={joinWaitlist} disabled={sending} style={{
                    padding:"12px 20px", borderRadius:10, background:"linear-gradient(135deg,#6366f1,#4f46e5)",
                    border:"none", color:"white", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:ff,
                    opacity:sending?0.6:1,
                  }}>
                    {sending ? "…" : "Notify Me"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Features Grid ── */}
      <div style={{ maxWidth:1160, margin:"0 auto", padding:"0 24px 80px" }}>
        <h2 style={{ textAlign:"center", fontSize:"clamp(22px,3vw,34px)", fontWeight:900, letterSpacing:"-1px", marginBottom:14 }}>
          Everything a {type.label} needs
        </h2>
        <p style={{ textAlign:"center", color:"rgba(255,255,255,.4)", fontSize:15, marginBottom:48 }}>
          Pre-configured for your industry — get started in minutes, not days.
        </p>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              padding:"24px 22px", borderRadius:18,
              background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)",
              transition:"background .2s, border .2s, transform .2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.borderColor="rgba(99,102,241,.3)"; e.currentTarget.style.transform="translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,.03)"; e.currentTarget.style.borderColor="rgba(255,255,255,.08)"; e.currentTarget.style.transform="translateY(0)"; }}
            >
              <div style={{ fontSize:28, marginBottom:12 }}>{f.icon}</div>
              <div style={{ fontSize:15, fontWeight:800, color:"white", marginBottom:6 }}>{f.title}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.42)", lineHeight:1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Plan Comparison ── */}
      <PlanComparison label={type.label} category={type.category} />

      {/* ── CTA ── */}
      <div style={{ maxWidth:800, margin:"0 auto 80px", padding:"0 24px", textAlign:"center" }}>
        <div style={{ borderRadius:24, padding:"52px 40px", background:"linear-gradient(135deg,rgba(99,102,241,.12),rgba(79,70,229,.06))", border:"1px solid rgba(99,102,241,.25)" }}>
          <div style={{ fontSize:44, marginBottom:16 }}>{type.icon}</div>
          <h3 style={{ fontSize:"clamp(22px,3vw,34px)", fontWeight:900, marginBottom:12 }}>
            Ready to transform your {type.label}?
          </h3>
          <p style={{ color:"rgba(255,255,255,.45)", fontSize:15, marginBottom:32, lineHeight:1.7 }}>
            Join hundreds of businesses already using FinovaOS. Start free, no credit card required.
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            {type.isLive ? (
              <>
                <Link href="/onboarding/signup/starter" style={{
                  padding:"14px 32px", borderRadius:12, background:"linear-gradient(135deg,#6366f1,#4f46e5)",
                  color:"white", fontWeight:800, fontSize:15, textDecoration:"none",
                }}>
                  Get Started →
                </Link>
                <Link href="/pricing" style={{
                  padding:"14px 28px", borderRadius:12, background:"rgba(255,255,255,.07)",
                  border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.75)",
                  fontWeight:700, fontSize:14, textDecoration:"none",
                }}>
                  See Pricing
                </Link>
              </>
            ) : (
              <Link href="/industries" style={{
                padding:"14px 32px", borderRadius:12, background:"rgba(129,140,248,.15)",
                border:"1px solid rgba(129,140,248,.35)", color:"#a5b4fc",
                fontWeight:700, fontSize:15, textDecoration:"none",
              }}>
                Browse live industries →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer nav ── */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", padding:"28px 24px", textAlign:"center" }}>
        <div style={{ display:"flex", gap:20, justifyContent:"center", flexWrap:"wrap" }}>
          {[
            { href:"/", label:"Home" },
            { href:"/industries", label:"All Industries" },
            { href:"/pricing", label:"Pricing" },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{ color:"rgba(255,255,255,.35)", fontSize:13, fontWeight:600, textDecoration:"none" }}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
