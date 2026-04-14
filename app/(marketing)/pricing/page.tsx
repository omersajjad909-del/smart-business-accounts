"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CURRENCY_LABEL,
  FX_USD,
  SUPPORTED_CURRENCIES,
  formatFromUSD,
} from "@/lib/currency";
import {
  FINOVA_CURRENCY_EVENT,
  getStoredCurrencyPreference,
  setStoredCurrencyPreference,
} from "@/lib/currencyPreference";

type BillingCycle = "monthly" | "yearly";

const PLANS = [
  {
    slug: "starter",
    name: "Starter",
    monthly: 49,
    yearly: 39,
    color: "#818cf8",
    border: "rgba(129,140,248,.32)",
    gradient: "linear-gradient(135deg,#6366f1,#4f46e5)",
    tagline: "For small businesses getting started",
    features: ["Up to 5 users","Sales & purchase invoices","Ledger and trial balance","Basic reports","Chart of accounts","Email support"],
  },
  {
    slug: "professional",
    name: "Professional",
    monthly: 99,
    yearly: 79,
    color: "#a5b4fc",
    border: "rgba(165,180,252,.45)",
    gradient: "linear-gradient(135deg,#818cf8,#6366f1)",
    tagline: "Most popular for growing businesses",
    features: ["Everything in Starter","Inventory management","Bank reconciliation","Multi-branch support","HR and payroll","CRM and advanced reports"],
    featured: true,
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    monthly: 249,
    yearly: 199,
    color: "#34d399",
    border: "rgba(52,211,153,.35)",
    gradient: "linear-gradient(135deg,#059669,#34d399)",
    tagline: "Full power for large organizations",
    features: ["Unlimited users","Everything in Professional","API access","Custom integrations","Multi-currency","Priority onboarding and support"],
  },
];

// ── FEATURE COMPARISON DATA ──────────────────────────────────────────────────
type Val = boolean | string | null;
interface Feature { name: string; permKey?: string; starter: Val; pro: Val; enterprise: Val; tooltip?: string; }
interface Category { id: string; icon: string; title: string; features: Feature[]; }

const COMPARISON: Category[] = [
  {
    id: "platform",
    icon: "🏗️",
    title: "Core Platform",
    features: [
      { name: "Users", starter: "Up to 5", pro: "Up to 20", enterprise: "Unlimited" },
      { name: "Companies / Workspaces", starter: "1", pro: "3", enterprise: "Unlimited" },
      { name: "Multi-branch support", starter: false, pro: true, enterprise: true },
      { name: "Custom domain (white-label)", starter: false, pro: false, enterprise: true },
      { name: "API access", starter: false, pro: false, enterprise: true },
      { name: "Webhooks & integrations", starter: false, pro: false, enterprise: true },
      { name: "Role-based permissions", starter: "Basic", pro: "Advanced", enterprise: "Custom" },
      { name: "Audit trail", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    id: "accounting",
    icon: "📒",
    title: "Accounting & Finance",
    features: [
      { name: "Chart of accounts", starter: true, pro: true, enterprise: true },
      { name: "Journal vouchers (CPV/CRV)", starter: true, pro: true, enterprise: true },
      { name: "Ledger & trial balance", starter: true, pro: true, enterprise: true },
      { name: "Profit & loss statement", starter: true, pro: true, enterprise: true },
      { name: "Balance sheet", starter: true, pro: true, enterprise: true },
      { name: "Cash flow statement", starter: false, pro: true, enterprise: true },
      { name: "Budget vs actual tracking", starter: false, pro: true, enterprise: true },
      { name: "Multi-currency accounts", starter: false, pro: false, enterprise: true },
      { name: "Financial year management", starter: true, pro: true, enterprise: true },
    ],
  },
  {
    id: "invoicing",
    icon: "🧾",
    title: "Invoicing & Sales",
    features: [
      { name: "Sales invoices", starter: true, pro: true, enterprise: true },
      { name: "Purchase invoices", starter: true, pro: true, enterprise: true },
      { name: "Quotations & proformas", starter: true, pro: true, enterprise: true },
      { name: "Delivery challans", starter: true, pro: true, enterprise: true },
      { name: "Sale returns (credit notes)", starter: true, pro: true, enterprise: true },
      { name: "Recurring invoices", starter: false, pro: true, enterprise: true },
      { name: "PDF invoice branding", starter: "Basic", pro: "Custom logo", enterprise: "Full white-label" },
      { name: "Discount management", starter: true, pro: true, enterprise: true },
      { name: "Tax (GST/VAT/WHT) on invoices", starter: true, pro: true, enterprise: true },
      { name: "WhatsApp / SMS invoice sharing", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    id: "inventory",
    icon: "📦",
    title: "Inventory & Stock",
    features: [
      { name: "Item catalog", starter: true, pro: true, enterprise: true },
      { name: "Stock tracking", starter: false, pro: true, enterprise: true },
      { name: "GRN (Goods Receipt)", starter: false, pro: true, enterprise: true },
      { name: "Barcode / QR scanning", starter: false, pro: true, enterprise: true },
      { name: "Reorder level alerts", starter: false, pro: true, enterprise: true },
      { name: "Warehouse management", starter: false, pro: false, enterprise: true },
      { name: "Stock valuation (FIFO/Avg)", starter: false, pro: true, enterprise: true },
      { name: "Expiry tracking", starter: false, pro: true, enterprise: true },
      { name: "Dead stock detection", starter: false, pro: true, enterprise: true },
      { name: "Purchase orders (PO tracking)", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    id: "banking",
    icon: "🏦",
    title: "Banking & Payments",
    features: [
      { name: "Bank account management", starter: true, pro: true, enterprise: true },
      { name: "Bank reconciliation", starter: false, pro: true, enterprise: true },
      { name: "Bank statement import", starter: false, pro: true, enterprise: true },
      { name: "Bulk payments", starter: false, pro: true, enterprise: true },
      { name: "Advance payments", starter: false, pro: true, enterprise: true },
      { name: "Payment receipts (CRV)", starter: true, pro: true, enterprise: true },
      { name: "Expense vouchers (CPV)", starter: true, pro: true, enterprise: true },
      { name: "Payment follow-up automation", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    id: "reports",
    icon: "📊",
    title: "Reports & Analytics",
    features: [
      { name: "Basic reports (sales, purchases)", starter: true, pro: true, enterprise: true },
      { name: "Ageing report (AR/AP)", starter: true, pro: true, enterprise: true },
      { name: "Advanced financial reports", starter: false, pro: true, enterprise: true },
      { name: "Inventory intelligence reports", starter: false, pro: true, enterprise: true },
      { name: "Customer profitability", starter: false, pro: true, enterprise: true },
      { name: "Salesman performance", starter: false, pro: true, enterprise: true },
      { name: "Discount analysis", starter: false, pro: true, enterprise: true },
      { name: "Delivery & fulfillment reports", starter: false, pro: false, enterprise: true },
      { name: "Supplier performance reports", starter: false, pro: false, enterprise: true },
      { name: "Sales forecast (AI-powered)", starter: false, pro: false, enterprise: true },
      { name: "Scenario planning", starter: false, pro: false, enterprise: true },
      { name: "Export to Excel / PDF", starter: true, pro: true, enterprise: true },
    ],
  },
  {
    id: "hr",
    icon: "👥",
    title: "HR & Payroll",
    features: [
      { name: "Employee management", starter: false, pro: true, enterprise: true },
      { name: "Attendance tracking", starter: false, pro: true, enterprise: true },
      { name: "Payroll processing", starter: false, pro: true, enterprise: true },
      { name: "Advance salary", starter: false, pro: true, enterprise: true },
      { name: "Leave management", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    id: "crm",
    icon: "🤝",
    title: "CRM & Customer Hub",
    features: [
      { name: "Customer management", starter: true, pro: true, enterprise: true },
      { name: "Supplier management", starter: true, pro: true, enterprise: true },
      { name: "Customer ledger / statement", starter: true, pro: true, enterprise: true },
      { name: "Sales pipeline (CRM)", starter: false, pro: true, enterprise: true },
      { name: "Lead management", starter: false, pro: true, enterprise: true },
      { name: "Interaction / activity log", starter: false, pro: true, enterprise: true },
      { name: "Credit limit & risk rating", starter: false, pro: true, enterprise: true },
      { name: "Bad debts tracking", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    id: "ai",
    icon: "🤖",
    title: "AI Features",
    features: [
      { name: "AI assistant (ask anything)",    permKey: "AI_ASSISTANT",             starter: false, pro: true,  enterprise: true },
      { name: "AI Business Operator",           permKey: "AI_BUSINESS_OPERATOR",     starter: false, pro: false, enterprise: true, tooltip: "An AI agent that can run tasks, answer business questions, and suggest actions autonomously" },
      { name: "Smart invoice suggestions",      permKey: "AI_SMART_SUGGESTIONS",     starter: false, pro: true,  enterprise: true },
      { name: "AI-powered sales forecast",      permKey: "AI_FORECAST",              starter: false, pro: false, enterprise: true },
      { name: "Anomaly & fraud detection",      permKey: "AI_ANOMALY_DETECTION",     starter: false, pro: false, enterprise: true },
      { name: "AI expense categorization",      permKey: "AI_EXPENSE_CATEGORIZATION",starter: false, pro: true,  enterprise: true },
      { name: "Natural language reports",       permKey: "AI_NATURAL_LANGUAGE",      starter: false, pro: false, enterprise: true },
      { name: "AI-based cash flow prediction",  permKey: "AI_CASH_FLOW_PREDICTION",  starter: false, pro: false, enterprise: true },
    ],
  },
  {
    id: "compliance",
    icon: "📋",
    title: "Tax & Compliance",
    features: [
      { name: "GST / VAT / WHT / FED", starter: true, pro: true, enterprise: true },
      { name: "Tax summary report", starter: true, pro: true, enterprise: true },
      { name: "Tax forecast", starter: false, pro: true, enterprise: true },
      { name: "FBR / compliance docs", starter: false, pro: true, enterprise: true },
      { name: "Audit & exception log", starter: false, pro: true, enterprise: true },
      { name: "17+ tax type support", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    id: "support",
    icon: "🎯",
    title: "Support & Onboarding",
    features: [
      { name: "Email support", starter: true, pro: true, enterprise: true },
      { name: "Live chat support", starter: false, pro: true, enterprise: true },
      { name: "Dedicated account manager", starter: false, pro: false, enterprise: true },
      { name: "Priority response time", starter: "72 hrs", pro: "24 hrs", enterprise: "4 hrs" },
      { name: "Guided onboarding session", starter: false, pro: true, enterprise: true },
      { name: "Data import assistance", starter: false, pro: true, enterprise: true },
      { name: "Custom training sessions", starter: false, pro: false, enterprise: true },
      { name: "SLA guarantee", starter: false, pro: false, enterprise: true },
    ],
  },
];

const MODULES = [
  { id: "accounting",         name: "Accounting & Invoicing",  price: 15, desc: "Ledger, invoices, vouchers, P&L, balance sheet" },
  { id: "inventory",          name: "Inventory Management",    price: 12, desc: "Stock tracking, GRN, barcode, low-stock alerts" },
  { id: "crm",                name: "CRM",                     price: 15, desc: "Contacts, sales pipeline, interaction logs" },
  { id: "hr_payroll",         name: "HR & Payroll",            price: 20, desc: "Employees, attendance, payroll, advance salary" },
  { id: "bank_reconciliation",name: "Bank Reconciliation",     price: 10, desc: "Statement import, discrepancy flagging, closing" },
  { id: "reports",            name: "Advanced Reports",        price: 8,  desc: "Cash flow, profitability, annual statements" },
  { id: "multi_branch",       name: "Multi-Branch",            price: 15, desc: "Branches, consolidated reports, branch access" },
  { id: "whatsapp",           name: "WhatsApp & SMS",          price: 8,  desc: "Payment reminders, invoices via WhatsApp and SMS" },
  { id: "api_access",         name: "API Access",              price: 20, desc: "REST API, webhooks, third-party integrations" },
  { id: "tax_filing",         name: "Tax & Compliance",        price: 10, desc: "Tax summary, GST/VAT reports, compliance docs" },
];

const FAQS = [
  { q: "Will prices automatically match my country?", a: "Yes. We detect your region and show localized display pricing. You can still change the currency manually at any time." },
  { q: "Is the charged currency the same as displayed?", a: "Displayed pricing is localized for convenience. Final billing currency is confirmed during checkout." },
  { q: "Can I build my own package?", a: "Yes. The Custom plan lets you pick only the modules you need and see an instant estimate." },
  { q: "Can I switch plans later?", a: "Yes. You can upgrade, downgrade, or move to a custom package at any time." },
  { q: "Is there a free trial?", a: "Yes. All plans come with a 14-day free trial — no credit card required." },
];

// ── HELPERS ──────────────────────────────────────────────────────────────────
const PLAN_COLORS = ["#818cf8", "#a5b4fc", "#34d399"];

function Check({ color }: { color: string }) {
  return (
    <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${color}18`, border: `1px solid ${color}38`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
      <svg width="10" height="10" viewBox="0 0 12 10" fill="none">
        <path d="M1 5.5L4.5 9 11 1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Cross() {
  return <div style={{ width: 16, height: 2, background: "rgba(255,255,255,.18)", borderRadius: 1, margin: "0 auto" }} />;
}

function Val({ v, color }: { v: Val; color: string }) {
  if (v === true) return <Check color={color} />;
  if (v === false || v === null) return <Cross />;
  return <span style={{ fontSize: 11, fontWeight: 700, color, textAlign: "center", display: "block" }}>{v}</span>;
}

export default function PricingPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://usefinova.app";
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [currency, setCurrency] = useState<string>("USD");
  const [country, setCountry] = useState<string>("US");
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>(["accounting", "inventory"]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(["platform", "accounting", "ai"]));
  const [featureMap, setFeatureMap] = useState<Record<string, { starter: boolean; pro: boolean; enterprise: boolean }>>({});

  useEffect(() => {
    (async () => {
      const stored = getStoredCurrencyPreference();
      if (stored.currency && FX_USD[stored.currency]) setCurrency(stored.currency);
      if (stored.country) setCountry(stored.country);
      try {
        const geo = await fetch("/api/public/geo", { cache: "no-store" });
        if (geo.ok) { const d = await geo.json(); if (d?.currency && FX_USD[d.currency]) { setCurrency(d.currency); setCountry(d.country || stored.country || "US"); } }
      } catch {}
      try {
        const fx = await fetch("/api/public/fx", { cache: "no-store" });
        if (fx.ok) { const d = await fx.json(); if (d?.rates) setRates(d.rates); }
      } catch {}
      // Load live plan feature overrides from admin config
      try {
        const pf = await fetch("/api/public/plan-features", { cache: "no-store" });
        if (pf.ok) { const d = await pf.json(); if (d?.featureMap) setFeatureMap(d.featureMap); }
      } catch {}
    })();
  }, []);

  useEffect(() => { if (currency) setStoredCurrencyPreference(currency, country); }, [currency, country]);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ currency?: string; country?: string | null }>).detail;
      if (d?.currency && FX_USD[d.currency]) setCurrency(d.currency);
      if (d?.country) setCountry(d.country);
    };
    window.addEventListener(FINOVA_CURRENCY_EVENT, handler as EventListener);
    return () => window.removeEventListener(FINOVA_CURRENCY_EVENT, handler as EventListener);
  }, []);

  const customMonthly = useMemo(() => selectedModules.reduce((s, id) => s + (MODULES.find(m => m.id === id)?.price || 0), 0), [selectedModules]);
  const customDisplayUsd = billing === "yearly" ? Math.round(customMonthly * 0.8) : customMonthly;
  const formatPrice = (usd: number) => formatFromUSD(usd, currency, rates);
  const buildHref = (slug: string) => `/onboarding/signup/${slug}?cycle=${billing}&currency=${currency}&country=${country}`;
  const buildCustomHref = () => `/onboarding/choose-plan?plan=custom&modules=${selectedModules.join(",")}&cycle=${billing}&currency=${currency}&country=${country}`;
  const toggleModule = (id: string) => setSelectedModules(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleCat = (id: string) => setOpenCats(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const ff = "'Outfit','DM Sans',sans-serif";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#080c1e 0%,#0c0f2e 35%,#080c1e 100%)", color: "white", fontFamily: ff }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        select option{background:#0f1629;color:white}
        @media(max-width:900px){.pg{grid-template-columns:1fr !important}.cg{grid-template-columns:1fr !important}}
        @media(max-width:700px){.ct{overflow-x:auto}}
        .feat-row:hover{background:rgba(255,255,255,.03)}
      `}</style>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 24px 88px" }}>

        {/* ── HERO ─────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, background: "rgba(129,140,248,.1)", border: "1px solid rgba(129,140,248,.25)", color: "#a5b4fc", fontSize: 12, fontWeight: 800, letterSpacing: ".04em", marginBottom: 22 }}>
            Localized Pricing
          </div>
          <h1 style={{ fontSize: "clamp(34px,5vw,58px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-.03em", marginBottom: 16 }}>
            Pricing that adapts to<br />
            <span style={{ background: "linear-gradient(135deg,#818cf8,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>your region</span>
          </h1>
          <p style={{ maxWidth: 640, margin: "0 auto", color: "rgba(255,255,255,.48)", fontSize: 17, lineHeight: 1.65 }}>
            FinovaOS shows prices in your local currency — PKR, INR, AED, and more. All plans include a <strong style={{ color: "rgba(255,255,255,.7)" }}>14-day free trial</strong>.
          </p>
        </div>

        {/* ── BILLING TOGGLE + CURRENCY ─────────────────────── */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: 4 }}>
            {(["monthly", "yearly"] as const).map(cycle => (
              <button key={cycle} onClick={() => setBilling(cycle)} style={{ padding: "10px 24px", border: "none", borderRadius: 9, background: billing === cycle ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "transparent", color: billing === cycle ? "white" : "rgba(255,255,255,.45)", cursor: "pointer", fontSize: 13, fontWeight: 800, fontFamily: ff }}>
                {cycle === "monthly" ? "Monthly" : "Yearly  · Save 20%"}
              </button>
            ))}
          </div>
          <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, padding: "9px 12px", color: "rgba(255,255,255,.8)", fontSize: 12, fontWeight: 700, outline: "none", cursor: "pointer", fontFamily: ff }}>
            {SUPPORTED_CURRENCIES.map(code => <option key={code} value={code}>{code} - {CURRENCY_LABEL[code]}</option>)}
          </select>
        </div>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 12, marginBottom: 56 }}>
          Showing prices in {currency} · Final billing currency confirmed at checkout
        </div>

        {/* ── PLAN CARDS ──────────────────────────────────────── */}
        <div className="pg" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginBottom: 80 }}>
          {PLANS.map(plan => {
            const usdPrice = billing === "yearly" ? plan.yearly : plan.monthly;
            return (
              <div key={plan.slug} style={{ position: "relative", borderRadius: 22, background: plan.featured ? "linear-gradient(160deg,rgba(99,102,241,.16),rgba(255,255,255,.03))" : "rgba(255,255,255,.03)", border: `1.5px solid ${plan.border}`, overflow: "hidden", boxShadow: plan.featured ? "0 28px 80px rgba(99,102,241,.22)" : "0 10px 30px rgba(0,0,0,.16)" }}>
                <div style={{ height: 3, background: plan.gradient }} />
                <div style={{ padding: "28px 26px" }}>
                  {plan.featured && <div style={{ display: "inline-flex", marginBottom: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(251,191,36,.12)", color: "#fbbf24", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Most Popular</div>}
                  <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>{plan.name}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.42)", lineHeight: 1.5, minHeight: 40 }}>{plan.tagline}</div>
                  <div style={{ margin: "24px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,.35)", textDecoration: "line-through" }}>{formatPrice(plan.monthly)}/mo</span>
                      <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(249,115,22,.18)", border: "1px solid rgba(249,115,22,.4)", fontSize: 10, fontWeight: 800, color: "#fb923c" }}>75% OFF × 3 months</span>
                    </div>
                    <div style={{ fontSize: 42, fontWeight: 900, color: plan.color, letterSpacing: "-.03em", lineHeight: 1 }}>{formatPrice(Math.round(usdPrice * 0.25))}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.36)", marginTop: 6 }}>
                      {billing === "yearly" ? `per month for 3 months · then ${formatPrice(usdPrice)}/mo on yearly plan` : `per month for 3 months · then ${formatPrice(plan.monthly)}/mo`}
                    </div>
                  </div>
                  <Link href={buildHref(plan.slug)} style={{ display: "block", textAlign: "center", padding: "12px 18px", borderRadius: 12, textDecoration: "none", color: "white", fontWeight: 800, background: plan.gradient, marginBottom: 22, fontSize: 14 }}>
                    Continue with {plan.name}
                  </Link>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: `${plan.color}18`, border: `1px solid ${plan.color}38`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="8" height="8" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4.5 9 11 1" stroke={plan.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,.72)" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── FEATURE COMPARISON TABLE ────────────────────────── */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 900, letterSpacing: "-.03em", marginBottom: 12 }}>Compare all features</h2>
            <p style={{ color: "rgba(255,255,255,.4)", fontSize: 15 }}>Everything side by side — no surprises</p>
          </div>

          {/* Sticky header row */}
          <div className="ct" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, overflow: "hidden" }}>
            {/* Plan header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,.08)", position: "sticky", top: 0, background: "#0c0f2e", zIndex: 10 }}>
              <div style={{ padding: "20px 24px", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Features</div>
              {PLANS.map((plan, pi) => (
                <div key={plan.slug} style={{ padding: "20px 16px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.06)", background: plan.featured ? "rgba(99,102,241,.06)" : "transparent" }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: PLAN_COLORS[pi], marginBottom: 4 }}>{plan.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                    {formatPrice(Math.round((billing === "yearly" ? plan.yearly : plan.monthly) * 0.25))}<span style={{ fontSize: 10 }}>/mo</span>
                  </div>
                  {plan.featured && <div style={{ marginTop: 4, fontSize: 10, fontWeight: 800, color: "#fbbf24", letterSpacing: ".06em" }}>★ POPULAR</div>}
                </div>
              ))}
            </div>

            {/* Categories */}
            {COMPARISON.map(cat => (
              <div key={cat.id}>
                {/* Category header — clickable */}
                <button
                  onClick={() => toggleCat(cat.id)}
                  style={{ width: "100%", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "rgba(255,255,255,.025)", border: "none", borderTop: "1px solid rgba(255,255,255,.06)", cursor: "pointer", fontFamily: ff, color: "white", padding: 0 }}
                >
                  <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,.85)", letterSpacing: ".01em" }}>{cat.title}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,.3)", transition: "transform .2s", display: "inline-block", transform: openCats.has(cat.id) ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                  </div>
                  {PLANS.map((plan, pi) => (
                    <div key={plan.slug} style={{ padding: "14px 16px", borderLeft: "1px solid rgba(255,255,255,.04)", background: plan.featured ? "rgba(99,102,241,.04)" : "transparent" }} />
                  ))}
                </button>

                {/* Feature rows */}
                {openCats.has(cat.id) && cat.features.map((feat, fi) => (
                  <div
                    key={feat.name}
                    className="feat-row"
                    style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderTop: "1px solid rgba(255,255,255,.04)", transition: "background .15s" }}
                  >
                    <div style={{ padding: "13px 24px 13px 44px", fontSize: 13, color: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", gap: 8 }}>
                      {feat.name}
                    </div>
                    {([
                      feat.permKey && featureMap[feat.permKey] !== undefined ? featureMap[feat.permKey].starter : feat.starter,
                      feat.permKey && featureMap[feat.permKey] !== undefined ? featureMap[feat.permKey].pro    : feat.pro,
                      feat.permKey && featureMap[feat.permKey] !== undefined ? featureMap[feat.permKey].enterprise : feat.enterprise,
                    ] as Val[]).map((v, pi) => (
                      <div key={pi} style={{ padding: "13px 16px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", background: PLANS[pi].featured ? "rgba(99,102,241,.03)" : "transparent" }}>
                        <Val v={v} color={PLAN_COLORS[pi]} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}

            {/* Bottom CTA row */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderTop: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.015)" }}>
              <div style={{ padding: "24px 24px", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.3)" }}>Ready to start?</div>
              {PLANS.map((plan, pi) => (
                <div key={plan.slug} style={{ padding: "20px 16px", borderLeft: "1px solid rgba(255,255,255,.06)", background: plan.featured ? "rgba(99,102,241,.06)" : "transparent" }}>
                  <Link href={buildHref(plan.slug)} style={{ display: "block", textAlign: "center", padding: "11px 12px", borderRadius: 10, textDecoration: "none", color: "white", fontWeight: 800, fontSize: 13, background: plan.gradient }}>
                    Get {plan.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CUSTOM PLAN ──────────────────────────────────────── */}
        <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 24, padding: "34px 28px", marginBottom: 72 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#f97316", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>Custom Plan</div>
              <h2 style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 900, letterSpacing: "-.03em", marginBottom: 10 }}>Build your own package</h2>
              <p style={{ color: "rgba(255,255,255,.45)", maxWidth: 520, lineHeight: 1.6 }}>Pick only the modules you need. Perfect for niche use cases — pay for exactly what you use.</p>
            </div>
            <div style={{ minWidth: 220, padding: "22px 24px", borderRadius: 18, background: "rgba(249,115,22,.08)", border: "1px solid rgba(249,115,22,.24)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Your Estimate</div>
              <div style={{ fontSize: 44, fontWeight: 900, color: "#f97316", lineHeight: 1 }}>{formatPrice(customDisplayUsd)}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 6 }}>{selectedModules.length} module{selectedModules.length === 1 ? "" : "s"} selected</div>
              <Link href={buildCustomHref()} style={{ display: "block", marginTop: 18, padding: "11px 18px", borderRadius: 12, textDecoration: "none", color: "white", fontWeight: 800, background: "linear-gradient(135deg,#f97316,#ea580c)" }}>Continue</Link>
            </div>
          </div>
          <div className="cg" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
            {MODULES.map(module => {
              const selected = selectedModules.includes(module.id);
              return (
                <button key={module.id} onClick={() => toggleModule(module.id)} style={{ textAlign: "left", padding: "18px 18px", borderRadius: 16, border: `1.5px solid ${selected ? "rgba(249,115,22,.45)" : "rgba(255,255,255,.08)"}`, background: selected ? "rgba(249,115,22,.08)" : "rgba(255,255,255,.03)", color: "white", cursor: "pointer", fontFamily: ff }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{module.name}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: selected ? "#f97316" : "rgba(255,255,255,.58)" }}>+{formatPrice(module.price)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", lineHeight: 1.5 }}>{module.desc}</div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 20, fontSize: 13, color: "rgba(255,255,255,.36)", textAlign: "center" }}>
            Base infrastructure starts from {formatPrice(15)}/mo · plus selected module prices.
          </div>
        </div>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <div style={{ maxWidth: 820, margin: "0 auto 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 900, letterSpacing: "-.03em" }}>Frequently asked questions</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQS.map((faq, idx) => (
              <div key={faq.q} style={{ borderRadius: 16, border: `1px solid ${openFaq === idx ? "rgba(129,140,248,.35)" : "rgba(255,255,255,.08)"}`, background: openFaq === idx ? "rgba(99,102,241,.08)" : "rgba(255,255,255,.02)" }}>
                <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "18px 20px", color: "white", fontSize: 14, fontWeight: 800, fontFamily: ff, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {faq.q}
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)", transform: openFaq === idx ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
                </button>
                {openFaq === idx && <div style={{ padding: "0 20px 18px", color: "rgba(255,255,255,.5)", fontSize: 14, lineHeight: 1.65 }}>{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", color: "rgba(255,255,255,.36)", fontSize: 13 }}>
          Already subscribed?{" "}
          <Link href={`${appUrl}/auth`} style={{ color: "#a5b4fc", textDecoration: "none", fontWeight: 700 }}>Sign in to your account</Link>
        </div>
      </div>
    </div>
  );
}
