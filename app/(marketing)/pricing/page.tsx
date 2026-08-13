"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatFromUSD } from "@/lib/currency-client";
import { STANDALONE_MODULE_IDS } from "@/lib/customPlanPricing";
import { useSignupsOpen } from "@/hooks/useSignupsOpen";
import { AUTOMATION_ADDON_ENABLED } from "@/lib/addons";
import { clientRegionHeaders } from "@/lib/clientRegion";

/**
 * Every buy button on this page.
 *
 * Before launch it renders a disabled "Launching Soon"; once
 * NEXT_PUBLIC_SIGNUPS_OPEN is true it becomes the real link again. Going
 * through one component means launch day is a single environment variable
 * rather than five buttons someone has to remember to switch back — and it
 * cannot drift out of step with the redirects in proxy.ts, which read the same
 * flag.
 */
function BuyCta({
  href,
  style,
  disabled = false,
  children,
}: {
  href: string;
  style: React.CSSProperties;
  /** Page-level reason to block, e.g. no modules picked yet. */
  disabled?: boolean;
  children: React.ReactNode;
}) {
  // Runtime, not build time: pressing Launch Now in the admin panel turns these
  // into real links without a redeploy.
  const signupsOpen = useSignupsOpen();

  if (!signupsOpen) {
    return (
      <button
        type="button"
        disabled
        style={{ ...style, cursor: "not-allowed", opacity: 0.85, border: "none" }}
      >
        Launching Soon
      </button>
    );
  }
  if (disabled) {
    return (
      <span style={{ ...style, cursor: "not-allowed", display: style.display || "block" }}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} style={style}>
      {children}
    </Link>
  );
}

type BillingCycle = "monthly" | "yearly";
type PlanPricing = {
  starter: { monthly: number; yearly: number };
  professional: { monthly: number; yearly: number };
  enterprise: { monthly: number; yearly: number };
};

// Fallbacks for the plan cards, used until /api/public/pricing answers. Keep in
// step with DEFAULT_PLAN_HIGHLIGHTS in that route and with
// PLAN_DEFAULT_PERMISSIONS in lib/planPermissions.ts.
//
// "🤖 Ask AI" on Starter is intentional: STARTER carries no AI permission by
// default, the access is granted per-tenant from /admin/permissions. Do not
// drop the bullet for looking unbacked by PLAN_DEFAULT_PERMISSIONS.
const DEFAULT_HIGHLIGHTS = {
  starter: [
    "Up to 3 users",
    "Sales & purchase invoices",
    "Basic accounting & chart of accounts",
    "Ledger & trial balance",
    "Basic inventory",
    "Expense management",
    "Basic financial reports",
    "Receivables & payables",
    "🤖 Ask AI",
    "Email support",
  ],
  professional: [
    "Up to 10 users",
    "Everything in Starter",
    "Advanced inventory & barcode",
    "Bank reconciliation",
    "HR & Payroll",
    "Trading control",
    "Advanced & strategic reports",
    "Multi-branch (up to 3)",
    "🤖 AI Assistant (ask anything)",
    "🤖 Smart invoice & expense AI",
  ],
  enterprise: [
    "Up to 25 users",
    "Everything in Professional",
    "Multi-branch (up to 10)",
    "Custom roles & approval workflows",
    "Audit trail & system logs",
    "Cost centers & multi-currency",
    "API access, webhooks & custom integrations",
    "Backup & restore",
    "🤖 AI Business Operator — runs tasks for you",
    "🤖 Forecasting, anomaly detection & cash-flow AI",
    "Priority support 24/7 + dedicated account manager",
  ],
};

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
  },
];

const MODULE_CATEGORIES = [
  { id: "core",         label: "Core",         icon: "⚡", color: "#818cf8" },
  { id: "finance",      label: "Finance",      icon: "💰", color: "#34d399" },
  { id: "operations",   label: "Operations",   icon: "⚙️", color: "#38bdf8" },
  { id: "integrations", label: "Integrations", icon: "🔗", color: "#f97316" },
];

// Modules that are a finished product on their own. The picker uses this to
// tell a buyer whether a single tick is already a usable subscription, or
// whether the module only layers on top of something else.
const STANDALONE_IDS = new Set<string>(STANDALONE_MODULE_IDS);

// STANDALONE_APPS lived here — the copy for the "Run just one" grid. That grid
// duplicated the module picker card-for-card, so both are gone.

const DEFAULT_PUBLIC_PRICING: PlanPricing = {
  starter: { monthly: 49, yearly: 39 },
  professional: { monthly: 99, yearly: 79 },
  enterprise: { monthly: 249, yearly: 199 },
};

const DEFAULT_PLAN_LIMITS: Record<string, number | null> = {
  starter: 3,
  professional: 10,
  enterprise: 25,
};
const DEFAULT_SEAT_PRICING = {
  monthly: 7,
  yearly: 6,
};

// ── FEATURE COMPARISON DATA ──────────────────────────────────────────────────
type Val = boolean | string | null;
interface Feature { name: string; permKey?: string; starter: Val; pro: Val; enterprise: Val; tooltip?: string; }
interface Category { id: string; icon: string; title: string; features: Feature[]; }

// Every row here is enforced by PLAN_DEFAULT_PERMISSIONS in
// lib/planPermissions.ts. When a row moves, the permission list moves with it —
// `permKey` names the permission a row is backed by wherever one exists.
const COMPARISON: Category[] = [
  {
    id: "platform",
    icon: "🏗️",
    title: "Core Platform",
    features: [
      { name: "Users", starter: "Up to 3", pro: "Up to 10", enterprise: "Up to 25" },
      // No permKey: every company has its one branch, and MULTI_BRANCH is what
      // unlocks a second — so the "1" on Starter is a limit, not a grant.
      { name: "Branches", starter: "1", pro: "3", enterprise: "10" },
      { name: "Multi-currency", permKey: "MULTI_CURRENCY", starter: false, pro: false, enterprise: true },
      { name: "Custom domain (white-label)", starter: false, pro: false, enterprise: true },
      { name: "API access", permKey: "API_ACCESS", starter: false, pro: false, enterprise: true },
      { name: "Webhooks & integrations", permKey: "API_ACCESS", starter: false, pro: false, enterprise: true },
      // No permKey: Starter and Pro both run on MANAGE_USERS (invite seats,
      // assign the built-in roles). MANAGE_ROLES — custom roles — is the
      // Enterprise row directly below.
      { name: "Role-based permissions", starter: "Basic", pro: "Standard", enterprise: "Custom" },
      { name: "Approval workflows", permKey: "MANAGE_APPROVALS", starter: false, pro: false, enterprise: true },
      { name: "Cost centers", permKey: "MANAGE_COST_CENTERS", starter: false, pro: false, enterprise: true },
      { name: "Custom roles", permKey: "MANAGE_ROLES", starter: false, pro: false, enterprise: true },
      { name: "Audit trail & system logs", permKey: "VIEW_AUDIT_LOG", starter: false, pro: false, enterprise: true },
      { name: "Backup & restore", permKey: "BACKUP_RESTORE", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    id: "accounting",
    icon: "📒",
    title: "Accounting & Finance",
    features: [
      { name: "Chart of accounts", permKey: "CREATE_ACCOUNTS", starter: true, pro: true, enterprise: true },
      { name: "Journal vouchers (CPV/CRV)", permKey: "CREATE_JV", starter: true, pro: true, enterprise: true },
      { name: "Ledger & trial balance", permKey: "VIEW_TRIAL_BALANCE_REPORT", starter: true, pro: true, enterprise: true },
      // P&L and balance sheet are VIEW_PROFIT_LOSS_REPORT /
      // VIEW_BALANCE_SHEET_REPORT, neither of which Starter has ever held.
      { name: "Profit & loss statement", permKey: "VIEW_PROFIT_LOSS_REPORT", starter: false, pro: true, enterprise: true },
      { name: "Balance sheet", permKey: "VIEW_BALANCE_SHEET_REPORT", starter: false, pro: true, enterprise: true },
      { name: "Cash flow statement", permKey: "VIEW_PROFIT_LOSS_REPORT", starter: false, pro: true, enterprise: true },
      { name: "Budget vs actual tracking", permKey: "BUDGET_PLANNING", starter: false, pro: true, enterprise: true },
      { name: "Contra & petty cash", permKey: "MANAGE_PETTY_CASH", starter: true, pro: true, enterprise: true },
      { name: "Credit & debit notes", permKey: "CREATE_CREDIT_NOTE", starter: false, pro: true, enterprise: true },
      { name: "Loans & recurring entries", permKey: "MANAGE_LOANS", starter: false, pro: true, enterprise: true },
      { name: "Fixed assets", permKey: "VIEW_FIXED_ASSETS", starter: false, pro: true, enterprise: true },
      { name: "Multi-currency accounts", permKey: "MULTI_CURRENCY", starter: false, pro: false, enterprise: true },
      // Financial year management is PRO+ in PLAN_DEFAULT_PERMISSIONS; this row
      // said every plan had it.
      { name: "Financial year management", permKey: "FINANCIAL_YEAR", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    id: "invoicing",
    icon: "🧾",
    title: "Invoicing & Sales",
    features: [
      { name: "Sales invoices", permKey: "CREATE_SALES_INVOICE", starter: true, pro: true, enterprise: true },
      { name: "Purchase invoices", permKey: "CREATE_PURCHASE_INVOICE", starter: true, pro: true, enterprise: true },
      { name: "Quotations & proformas", permKey: "CREATE_QUOTATION", starter: true, pro: true, enterprise: true },
      { name: "Delivery challans", permKey: "CREATE_DELIVERY_CHALLAN", starter: true, pro: true, enterprise: true },
      { name: "Sale returns (credit notes)", permKey: "CREATE_SALE_RETURN", starter: true, pro: true, enterprise: true },
      { name: "Recurring invoices", permKey: "MANAGE_RECURRING", starter: false, pro: true, enterprise: true },
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
      // Starter genuinely holds VIEW_INVENTORY, CREATE_ITEMS and
      // CREATE_STOCK_RATE, so "no stock tracking at all" was never true. The
      // real Pro upgrade is the tooling around it — barcode, price lists,
      // warehouses and the inventory reports.
      { name: "Item catalog", permKey: "VIEW_CATALOG", starter: true, pro: true, enterprise: true },
      { name: "Stock tracking", permKey: "VIEW_INVENTORY", starter: "Basic", pro: "Advanced", enterprise: "Advanced" },
      { name: "GRN (Goods Receipt)", permKey: "VIEW_INVENTORY", starter: true, pro: true, enterprise: true },
      { name: "Purchase orders (PO tracking)", permKey: "CREATE_PURCHASE_ORDER", starter: true, pro: true, enterprise: true },
      { name: "Barcode / QR scanning", permKey: "MANAGE_BARCODE", starter: false, pro: true, enterprise: true },
      { name: "Price lists", permKey: "MANAGE_PRICE_LISTS", starter: false, pro: true, enterprise: true },
      { name: "Promotions & discount engine", permKey: "MANAGE_PROMOTIONS", starter: false, pro: true, enterprise: true },
      { name: "Reorder level alerts", permKey: "VIEW_LOW_STOCK", starter: false, pro: true, enterprise: true },
      { name: "Warehouse management", permKey: "MULTI_BRANCH", starter: false, pro: true, enterprise: true },
      { name: "Stock valuation (FIFO/Avg)", permKey: "VIEW_STOCK_LEDGER", starter: false, pro: true, enterprise: true },
      { name: "Expiry tracking", permKey: "VIEW_INVENTORY_REPORTS", starter: false, pro: true, enterprise: true },
      { name: "Dead stock detection", permKey: "VIEW_LOW_STOCK", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    id: "trading",
    icon: "🔄",
    title: "Trading Control",
    features: [
      // The whole block was granted to Starter in code while never appearing on
      // this page at all — the upgrade it is supposed to drive was invisible.
      { name: "Trading overview", permKey: "TRADING_OVERVIEW", starter: false, pro: true, enterprise: true },
      { name: "Order desk", permKey: "TRADING_ORDER_DESK", starter: false, pro: true, enterprise: true },
      { name: "Procurement desk", permKey: "TRADING_PROCUREMENT", starter: false, pro: true, enterprise: true },
      { name: "Stock control", permKey: "TRADING_STOCK_CONTROL", starter: false, pro: true, enterprise: true },
      { name: "Outstandings", permKey: "TRADING_OUTSTANDINGS", starter: false, pro: true, enterprise: true },
      { name: "Dispatch board", permKey: "TRADING_DISPATCH_BOARD", starter: false, pro: true, enterprise: true },
      { name: "Conversion center", permKey: "TRADING_CONVERSION_CENTER", starter: false, pro: true, enterprise: true },
      { name: "Trading analytics", permKey: "TRADING_ANALYTICS", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    id: "banking",
    icon: "🏦",
    title: "Banking & Payments",
    features: [
      { name: "Bank account management", permKey: "PAYMENT_RECEIPTS", starter: true, pro: true, enterprise: true },
      { name: "Bank reconciliation", permKey: "BANK_RECONCILIATION", starter: false, pro: true, enterprise: true },
      { name: "Bank statement import", permKey: "BANK_RECONCILIATION", starter: false, pro: true, enterprise: true },
      { name: "Bulk payments", permKey: "BULK_PAYMENTS", starter: false, pro: true, enterprise: true },
      // Starter holds MANAGE_ADVANCE_PAYMENT — this row said otherwise.
      { name: "Advance payments", permKey: "MANAGE_ADVANCE_PAYMENT", starter: true, pro: true, enterprise: true },
      { name: "Payment receipts (CRV)", permKey: "PAYMENT_RECEIPTS", starter: true, pro: true, enterprise: true },
      { name: "Expense vouchers (CPV)", permKey: "EXPENSE_VOUCHERS", starter: true, pro: true, enterprise: true },
      { name: "Payment follow-up automation", permKey: "VIEW_PROFIT_LOSS_REPORT", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    id: "reports",
    icon: "📊",
    title: "Reports & Analytics",
    features: [
      { name: "Basic reports (sales, purchases)", permKey: "VIEW_REPORTS", starter: true, pro: true, enterprise: true },
      { name: "Ageing report (AR/AP)", permKey: "VIEW_AGEING_REPORT", starter: true, pro: true, enterprise: true },
      { name: "Advanced financial reports", permKey: "VIEW_PROFIT_LOSS_REPORT", starter: false, pro: true, enterprise: true },
      { name: "Inventory intelligence reports", permKey: "VIEW_INVENTORY_REPORTS", starter: false, pro: true, enterprise: true },
      { name: "Customer profitability", permKey: "VIEW_SALES_REPORT", starter: false, pro: true, enterprise: true },
      { name: "Salesman performance", permKey: "VIEW_SALES_REPORT", starter: false, pro: true, enterprise: true },
      { name: "Discount analysis", permKey: "VIEW_SALES_REPORT", starter: false, pro: true, enterprise: true },
      // Operations and strategic reports are Pro — there is no Enterprise-only
      // permission behind them, and the sidebar now hands both to Pro.
      { name: "Delivery & fulfillment reports", permKey: "VIEW_OUTWARD", starter: false, pro: true, enterprise: true },
      { name: "Supplier performance reports", permKey: "VIEW_OUTWARD", starter: false, pro: true, enterprise: true },
      { name: "Scenario planning & sales forecast", permKey: "VIEW_PROFIT_LOSS_REPORT", starter: false, pro: true, enterprise: true },
      { name: "AI-powered revenue forecast", permKey: "AI_FORECAST", starter: false, pro: false, enterprise: true },
      { name: "Export to Excel / PDF", starter: true, pro: true, enterprise: true },
    ],
  },
  {
    id: "hr",
    icon: "👥",
    title: "HR & Payroll",
    features: [
      { name: "Employee management", permKey: "VIEW_HR_PAYROLL", starter: false, pro: true, enterprise: true },
      { name: "Attendance tracking", permKey: "VIEW_HR_PAYROLL", starter: false, pro: true, enterprise: true },
      { name: "Payroll processing", permKey: "VIEW_HR_PAYROLL", starter: false, pro: true, enterprise: true },
      { name: "Advance salary", permKey: "VIEW_HR_PAYROLL", starter: false, pro: true, enterprise: true },
      { name: "Leave management", permKey: "VIEW_HR_PAYROLL", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    id: "crm",
    icon: "🤝",
    title: "CRM & Customer Hub",
    features: [
      { name: "Customer management", permKey: "VIEW_ACCOUNTS", starter: true, pro: true, enterprise: true },
      { name: "Supplier management", permKey: "VIEW_ACCOUNTS", starter: true, pro: true, enterprise: true },
      { name: "Customer ledger / statement", permKey: "VIEW_LEDGER_REPORT", starter: true, pro: true, enterprise: true },
      { name: "Sales pipeline (CRM)", permKey: "VIEW_CRM", starter: false, pro: true, enterprise: true },
      { name: "Lead management", permKey: "VIEW_CRM", starter: false, pro: true, enterprise: true },
      { name: "Interaction / activity log", permKey: "VIEW_CRM", starter: false, pro: true, enterprise: true },
      { name: "Credit limit & risk rating", permKey: "VIEW_CRM", starter: false, pro: true, enterprise: true },
      { name: "Bad debts tracking", permKey: "VIEW_PROFIT_LOSS_REPORT", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    id: "ai",
    icon: "🤖",
    title: "AI Features",
    features: [
      { name: "AI assistant (ask anything)",    permKey: "AI_ASSISTANT",             starter: false, pro: true,  enterprise: true },
      // Bundled with Enterprise; Starter and Pro can buy it as the Business
      // Automation add-on.
      { name: "AI Business Operator",           permKey: "AI_BUSINESS_OPERATOR",     starter: false, pro: false, enterprise: true, tooltip: "An AI agent that runs tasks, answers business questions and suggests actions on its own. Included in Enterprise; available as an add-on on Starter and Professional." },
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
      { name: "Tax summary report", permKey: "VIEW_FINANCIAL_REPORTS", starter: true, pro: true, enterprise: true },
      { name: "Tax forecast", permKey: "VIEW_PROFIT_LOSS_REPORT", starter: false, pro: true, enterprise: true },
      { name: "FBR / compliance docs", permKey: "TAX_CONFIGURATION", starter: false, pro: true, enterprise: true },
      { name: "Audit & exception log", permKey: "VIEW_AUDIT_LOG", starter: false, pro: false, enterprise: true },
      { name: "17+ tax type support", permKey: "TAX_CONFIGURATION", starter: false, pro: true, enterprise: true },
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


const FAQS = [
  { q: "Will prices automatically match my country?", a: "Yes. We detect your region and show localized display pricing. You can still change the currency manually at any time." },
  { q: "Is the charged currency the same as displayed?", a: "Displayed pricing is localized for convenience. Final billing currency is confirmed during checkout." },
  { q: "Can I build my own package?", a: "Yes. The Custom plan lets you pick only the modules you need and see an instant estimate." },
  { q: "Can I buy just one module — payroll only, for example?", a: "Yes. Payroll & HR, CRM, Inventory, Accounting, Trading Desk and Bank & Payments each run on their own, so you can subscribe to a single one and pay only for that. Modules marked Add-on (Advanced Reports, Multi-Branch, WhatsApp & SMS, API Access, Tax & Compliance) layer on top of one of those." },
  { q: "Can I add more modules later?", a: "Yes. Start with one module and add others whenever you need them — your data stays in the same account and billing adjusts from the next cycle." },
  { q: "Is Business Automation included in a plan?", a: "No, it is a separate add-on at a flat monthly price and can be attached to any plan, including a single-module package." },
  { q: "Can I switch plans later?", a: "Yes. You can upgrade, downgrade, or move to a custom package at any time." },
  { q: "Can I see a demo before buying?", a: "Yes. Book a personalized demo and we'll walk you through everything for your business type. Contact us via live chat or the contact form." },
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

const USE_CASES = [
  {
    icon: "👤", label: "Solo / Freelancer",
    desc: "1-2 people, simple invoicing & expenses",
    recommended: "Starter", plan: "starter", color: "#818cf8",
    highlights: ["Unlimited invoices", "Ledger & P&L", "Basic reports", "Email support"],
  },
  {
    icon: "🏢", label: "Small Team",
    desc: "3-20 employees, need payroll & CRM",
    recommended: "Professional", plan: "professional", color: "#a5b4fc",
    highlights: ["Everything in Starter", "HR & Payroll", "Inventory", "CRM + Pipeline"],
    popular: true,
  },
  {
    icon: "🌐", label: "Multi-Branch / Enterprise",
    desc: "Multiple locations, advanced reports & API",
    recommended: "Enterprise", plan: "enterprise", color: "#34d399",
    highlights: ["Everything in Pro", "Multi-branch", "API access", "Priority support"],
  },
];

function UseCaseWizard() {
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = USE_CASES.find(u => u.plan === selected);
  return (
    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "28px 28px 24px", marginBottom: 48 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>NOT SURE WHICH PLAN? TELL US ABOUT YOUR BUSINESS</div>
      </div>
      <div className="uc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: chosen ? 20 : 0 }}>
        {USE_CASES.map(u => (
          <button key={u.plan} className="uc-btn" onClick={() => setSelected(selected === u.plan ? null : u.plan)}
            style={{ padding: "16px 14px", borderRadius: 14, border: `1.5px solid ${selected === u.plan ? u.color + "66" : "rgba(255,255,255,.08)"}`, background: selected === u.plan ? `${u.color}10` : "rgba(255,255,255,.02)", cursor: "pointer", textAlign: "left", transition: "all .2s", position: "relative" }}>
            {u.popular && <div style={{ position: "absolute", top: -10, right: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>MOST POPULAR</div>}
            <div style={{ fontSize: 24, marginBottom: 8 }}>{u.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: selected === u.plan ? u.color : "#e2e8f0", marginBottom: 4 }}>{u.label}</div>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{u.desc}</div>
          </button>
        ))}
      </div>
      {chosen && (
        <div style={{ background: `${chosen.color}0d`, border: `1px solid ${chosen.color}33`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: chosen.color, fontWeight: 700, marginBottom: 6 }}>✓ We recommend: {chosen.recommended} Plan</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {chosen.highlights.map(h => (
                <span key={h} style={{ fontSize: 12, color: "#94a3b8", background: "rgba(255,255,255,.05)", padding: "3px 10px", borderRadius: 20 }}>{h}</span>
              ))}
            </div>
          </div>
          <BuyCta
            href={`/onboarding/signup/${chosen.plan}`}
            style={{ background: `linear-gradient(135deg,${chosen.color},${chosen.color}bb)`, color: "#fff", padding: "10px 22px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", flexShrink: 0 }}
          >
            Start with {chosen.recommended} →
          </BuyCta>
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://usefinova.app";
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [currency, setCurrency] = useState<string>("USD");
  const [country, setCountry] = useState<string>("US");
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>(["accounting", "inventory"]);
  const [extraUsers, setExtraUsers] = useState(0);
  const [extraBranches, setExtraBranches] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(["platform", "accounting", "ai"]));
  const [featureMap, setFeatureMap] = useState<Record<string, { starter: boolean; pro: boolean; enterprise: boolean }>>({});
  const [publicPricing, setPublicPricing] = useState<PlanPricing>(DEFAULT_PUBLIC_PRICING);
  // Admin-set PKR prices — hardcoded defaults, overridden by API if configured
  const DEFAULT_PKR_PRICING = {
    starter:      { monthly: 3999,  yearly: 3199  }, // 3,999/mo → 20% off yearly = 3,199/mo
    professional: { monthly: 8999,  yearly: 7199  }, // 8,999/mo → 20% off yearly = 7,199/mo
    // Was 14,999 while the live site served 19,999 from the saved PKR config —
    // so any failure of /api/public/pricing quietly under-quoted Enterprise.
    enterprise:   { monthly: 19999, yearly: 15999 }, // 19,999/mo → 20% off yearly = 15,999/mo
  };
  const [pkrPricing, setPkrPricing] = useState<{ starter: { monthly: number; yearly: number }; professional: { monthly: number; yearly: number }; enterprise: { monthly: number; yearly: number } } | null>(DEFAULT_PKR_PRICING);
  // Edge-detected country from /api/public/geo. Unlike `country` below it is
  // never seeded from localStorage or the currency dropdown, so it is the only
  // thing allowed to unlock the PKR-native price list. Null until resolved →
  // global pricing shows first.
  const [geoCountry, setGeoCountry] = useState<string | null>(null);
  const [planLimits, setPlanLimits] = useState<Record<string, number | null>>(DEFAULT_PLAN_LIMITS);
  // Key must be "professional" (not "pro") — the render below reads
  // branchLimits.professional; before the /api/public/pricing fetch resolves,
  // the initial state's "pro" key made that read undefined, showing a live
  // "Up to undefined" in the Branches comparison row.
  const [branchLimits, setBranchLimits] = useState<Record<string, number | null>>({ starter: 1, professional: 3, enterprise: 10 });
  const [seatPricing, setSeatPricing] = useState<{ monthly: number; yearly: number }>(DEFAULT_SEAT_PRICING);
  const [planHighlights, setPlanHighlights] = useState<Record<string, string[]>>(DEFAULT_HIGHLIGHTS);
  const [customPlanData, setCustomPlanData] = useState<{ basePrice: number; yearlyDiscount: number; modules: any[] }>({
    basePrice: 0, yearlyDiscount: 20,
    modules: [
      { id:"accounting", name:"Accounting & Invoicing", price:15, desc:"Ledger, invoices, vouchers, P&L, balance sheet", icon:"📒", enabled:true, category:"core" },
      { id:"inventory", name:"Inventory Management", price:12, desc:"Stock tracking, GRN, barcode, low-stock alerts", icon:"📦", enabled:true, category:"core" },
      { id:"crm", name:"CRM", price:15, desc:"Contacts, sales pipeline, interaction logs", icon:"👥", enabled:true, category:"core" },
      { id:"hr_payroll", name:"HR & Payroll", price:20, desc:"Employees, attendance, payroll, advance salary", icon:"👨‍💼", enabled:true, category:"core" },
      { id:"trading", name:"Trading Desk", price:18, desc:"Order desk, procurement, dispatch, outstandings", icon:"🔄", enabled:true, category:"core" },
      { id:"bank_reconciliation", name:"Bank Reconciliation", price:10, desc:"Statement import, discrepancy flagging, closing", icon:"🏦", enabled:true, category:"finance" },
      { id:"tax_filing", name:"Tax & Compliance", price:10, desc:"Tax summary, GST/VAT reports, compliance docs", icon:"🧾", enabled:true, category:"finance" },
      { id:"reports", name:"Advanced Reports", price:8, desc:"Cash flow, profitability, annual statements", icon:"📈", enabled:true, category:"operations" },
      { id:"multi_branch", name:"Multi-Branch", price:15, desc:"Branches, consolidated reports, branch access", icon:"🏢", enabled:true, category:"operations" },
      { id:"whatsapp", name:"WhatsApp & SMS", price:8, desc:"Payment reminders, invoices via WhatsApp and SMS", icon:"💬", enabled:true, category:"integrations" },
      { id:"api_access", name:"API Access", price:20, desc:"REST API, webhooks, third-party integrations", icon:"⚡", enabled:true, category:"integrations" },
    ],
  });

  useEffect(() => {
    (async () => {
      // IP decides, nothing else. The stored-preference branch that used to be
      // here let a saved "PKR" choice survive across visits and unlock the
      // Pakistan price list from anywhere; /api/billing/checkout would then
      // charge USD, so the page was advertising a price it could not honour.
      try {
        const res = await fetch("/api/public/pricing-region", { cache: "no-store", headers: clientRegionHeaders() });
        if (res.ok) {
          const d = await res.json();
          if (d?.currency) setCurrency(d.currency);
          if (d?.country) {
            const cc = String(d.country).toUpperCase();
            setCountry(cc);
            setGeoCountry(cc);
          }
        }
      } catch {}
      try {
        const fx = await fetch("/api/public/fx", { cache: "no-store" });
        if (fx.ok) { const d = await fx.json(); if (d?.rates) setRates(d.rates); }
      } catch {}
      try {
        const pr = await fetch("/api/public/pricing", { cache: "no-store" });
        if (pr.ok) {
          const d = await pr.json();
          if (d?.pricing) {
            setPublicPricing({
              starter: {
                monthly: Number(d.pricing?.starter?.monthly ?? DEFAULT_PUBLIC_PRICING.starter.monthly),
                yearly: Math.round(Number(d.pricing?.starter?.yearly ?? (DEFAULT_PUBLIC_PRICING.starter.yearly * 12)) / 12),
              },
              professional: {
                monthly: Number(d.pricing?.pro?.monthly ?? DEFAULT_PUBLIC_PRICING.professional.monthly),
                yearly: Math.round(Number(d.pricing?.pro?.yearly ?? (DEFAULT_PUBLIC_PRICING.professional.yearly * 12)) / 12),
              },
              enterprise: {
                monthly: Number(d.pricing?.enterprise?.monthly ?? DEFAULT_PUBLIC_PRICING.enterprise.monthly),
                yearly: Math.round(Number(d.pricing?.enterprise?.yearly ?? (DEFAULT_PUBLIC_PRICING.enterprise.yearly * 12)) / 12),
              },
            });
          }
          if (d?.planLimits) {
            setPlanLimits({
              starter: d.planLimits?.starter ?? DEFAULT_PLAN_LIMITS.starter,
              professional: d.planLimits?.pro ?? DEFAULT_PLAN_LIMITS.professional,
              enterprise: d.planLimits?.enterprise ?? DEFAULT_PLAN_LIMITS.enterprise,
            });
          }
          if (d?.branchLimits) {
            setBranchLimits({
              starter:    d.branchLimits?.starter    ?? 1,
              professional: d.branchLimits?.pro      ?? 3,
              enterprise: d.branchLimits?.enterprise ?? 10,
            });
          }
          if (d?.seatPricing) {
            setSeatPricing({
              monthly: Number(d.seatPricing?.monthly ?? DEFAULT_SEAT_PRICING.monthly),
              yearly: Math.round(Number(d.seatPricing?.yearly ?? (DEFAULT_SEAT_PRICING.yearly * 12)) / 12),
            });
          }
          if (d?.customPlan) {
            setCustomPlanData(prev => ({
              basePrice: d.customPlan.basePrice ?? prev.basePrice,
              yearlyDiscount: d.customPlan.yearlyDiscount ?? prev.yearlyDiscount,
              modules: Array.isArray(d.customPlan.modules) && d.customPlan.modules.length
                ? d.customPlan.modules
                : prev.modules,
            }));
          }
          if (d?.planHighlights) {
            // The API keys the middle plan "pro"; PLANS keys it "professional",
            // and the card reads planHighlights[plan.slug]. Spreading the raw
            // response therefore added a "pro" entry nobody reads and left the
            // Professional card permanently on its hardcoded fallback — admin
            // edits to it did nothing. Normalise the key on the way in.
            const { pro, ...rest } = d.planHighlights as Record<string, string[]>;
            setPlanHighlights(h => ({ ...h, ...rest, ...(pro ? { professional: pro } : {}) }));
          }
          if (d?.pkrPricing) {
            setPkrPricing({
              starter:      { monthly: Number(d.pkrPricing.starter?.monthly      ?? 3999),  yearly: Math.round(Number(d.pkrPricing.starter?.yearly      ?? 38388)  / 12) },
              professional: { monthly: Number(d.pkrPricing.pro?.monthly          ?? 8999),  yearly: Math.round(Number(d.pkrPricing.pro?.yearly          ?? 86388)  / 12) },
              enterprise:   { monthly: Number(d.pkrPricing.enterprise?.monthly   ?? 19999), yearly: Math.round(Number(d.pkrPricing.enterprise?.yearly   ?? 191988) / 12) },
            });
          }
          // pkrAddonPricing was read here for the automation card's price. That
          // card no longer shows one, so nothing on this page consumes it.
        }
      } catch {}
      // Load live plan feature overrides from admin config
      try {
        // Same region headers as the currency fetch — this endpoint now serves
        // Pakistan the PKR Permissions table and everyone else the world one,
        // and it must not race the cookie on a cold visit.
        const pf = await fetch("/api/public/plan-features", { cache: "no-store", headers: clientRegionHeaders() });
        if (pf.ok) { const d = await pf.json(); if (d?.featureMap) setFeatureMap(d.featureMap); }
      } catch {}
    })();
  }, []);

  // The FINOVA_CURRENCY_EVENT listener that used to be here let any other
  // component on the page push a currency into this one — another way the
  // display could drift away from what checkout charges. Currency is now
  // resolved once, from the IP, and nothing may override it.

  const yearlyDiscount = customPlanData.yearlyDiscount ?? 20;
  const seatRate = billing === "yearly" ? seatPricing.yearly : seatPricing.monthly;
  const customModuleTotal = useMemo(() =>
    customPlanData.modules
      .filter((m: any) => selectedModules.includes(m.id))
      .reduce((s: number, m: any) => s + Number(m.price), 0),
    [selectedModules, customPlanData]
  );
  const customMonthly = useMemo(() =>
    customModuleTotal + extraUsers * seatRate + extraBranches * seatRate,
    [customModuleTotal, extraUsers, extraBranches, seatRate]
  );
  const customDisplayUsd = billing === "yearly" ? Math.round(customMonthly * (1 - yearlyDiscount / 100)) : customMonthly;
  const formatPrice = (usd: number) => formatFromUSD(usd, currency);

  // When country is PK and admin has set PKR prices, use those directly
  // Was `country === "PK" || currency === "PKR"` — the currency dropdown alone
  // handed any visitor Pakistan's discounted price list. Regional pricing now
  // follows the edge-detected country only; the dropdown still does plain FX
  // conversion for everyone else.
  const isPKUser = geoCountry === "PK";
  const getPlanPrice = (slug: "starter" | "professional" | "enterprise") => {
    const usdPrice = billing === "yearly" ? publicPricing[slug].yearly : publicPricing[slug].monthly;
    if (isPKUser && pkrPricing) {
      const pkr = pkrPricing[slug];
      const amount = billing === "yearly" ? pkr.yearly : pkr.monthly;
      return `₨${amount.toLocaleString("en-PK")}`;
    }
    return formatPrice(usdPrice);
  };
  // getAddonDisplayPrice / getAddonYearlySaving used to live here. The
  // automation card is the only thing that ever called them and it no longer
  // quotes a price, so they went with it rather than sitting here as the next
  // person's "why is this unused?".

  // These were stubbed to `undefined` while every CTA was a dead "Launching
  // Soon" button. BuyCta needs the real destinations again so that flipping
  // NEXT_PUBLIC_SIGNUPS_OPEN is genuinely all it takes to go live.
  const buildHref = (slug: string) =>
    `/onboarding/signup/${slug}?cycle=${billing}&currency=${currency}&country=${country}`;
  const buildCustomHref = () =>
    `/onboarding/choose-plan?plan=custom&modules=${selectedModules.join(",")}&extraUsers=${extraUsers}&extraBranches=${extraBranches}&cycle=${billing}&currency=${currency}&country=${country}`;
  const toggleModule = (id: string) => setSelectedModules(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  // selectOnlyModule was the "Pick this only" handler on the removed grid.
  const isStandalone = (id: string) => STANDALONE_IDS.has(id);
  const standaloneOnly = selectedModules.length === 1 && isStandalone(selectedModules[0]);
  // A package of only layer-on modules cannot run — flag it instead of letting
  // someone check out into an empty app.
  const needsCoreModule = selectedModules.length > 0 && !selectedModules.some(isStandalone);
  const toggleCat = (id: string) => setOpenCats(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── What the comparison table actually renders ───────────────────────────
  // A row's three cells come from the admin Permissions screen whenever the row
  // names a permission; otherwise they are the hardcoded values in COMPARISON.
  const resolveRow = (feat: Feature): [Val, Val, Val] => {
    const override = feat.permKey ? featureMap[feat.permKey] : undefined;
    return override
      ? [override.starter, override.pro, override.enterprise]
      : [feat.starter, feat.pro, feat.enterprise];
  };
  // Untick a permission on all three plans and the feature is not part of the
  // product on any plan — so the row is dropped instead of rendering as three
  // dashes, and a category left with no rows disappears with it. Rows the admin
  // screen cannot reach (Users, Branches, support promises) always stay.
  const isRowVisible = (feat: Feature) => {
    if (!feat.permKey || featureMap[feat.permKey] === undefined) return true;
    return resolveRow(feat).some(v => v !== false && v !== null);
  };
  const visibleComparison = useMemo(
    () =>
      COMPARISON
        .map(cat => ({ ...cat, features: cat.features.filter(isRowVisible) }))
        .filter(cat => cat.features.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [featureMap]
  );
  const usersLabel = (v: number | null | undefined) => (v === null || v === undefined ? "Unlimited" : `Up to ${v}`);

  const ff = "'Outfit','DM Sans',sans-serif";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#080c1e 0%,#0c0f2e 35%,#080c1e 100%)", color: "white", fontFamily: ff }}>
      <style>{`
        
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        select option{background:#0f1629;color:white}
        .feat-row:hover{background:rgba(255,255,255,.03)}

        @media(max-width:900px){
          .pg{grid-template-columns:1fr !important}
          .cg{grid-template-columns:1fr !important}
        }

        /* Comparison table — sticky first column on mobile */
        @media(max-width:700px){
          .ct{overflow-x:auto !important;}
          .ct-inner{min-width:471px;}
          .ct-sticky{position:relative !important;top:auto !important;}
          /* Fixed pixel column widths */
          .ct .ct-sticky,
          .ct .ct-cat,
          .ct .feat-row,
          .ct .ct-cta{grid-template-columns:150px 107px 107px 107px !important;}
          /* Feature name column stays fixed */
          .ct .ct-sticky>div:first-child,
          .ct .feat-row>div:first-child,
          .ct .ct-cta>div:first-child{
            position:sticky !important;
            left:0 !important;
            background:#0c0f2e !important;
            z-index:2 !important;
            border-right:1px solid rgba(255,255,255,.08) !important;
          }
        }

        @media(max-width:640px){
          /* Top padding */
          .pr-pad{padding:56px 16px 56px !important;}

          /* Use-case wizard */
          .uc-grid{grid-template-columns:1fr !important;gap:10px !important;}
          .uc-btn{padding:14px 12px !important;}

          /* Plan cards */
          .pg{gap:14px !important;}

          /* Automation add-on */
          .addon-grid{grid-template-columns:1fr !important;gap:24px !important;}
          .addon-feat{grid-template-columns:1fr 1fr !important;gap:8px !important;}
          .val-bar{gap:8px !important;}
          .val-bar-label{display:none !important;}

          /* Custom plan */
          .cp-row{flex-direction:column !important;}
          .cp-sidebar{width:100% !important;position:static !important;top:auto !important;}
          .mod-grid{grid-template-columns:1fr !important;}

          /* FAQ */
          .pr-pad h2{font-size:24px !important;}
        }
      `}</style>

      <div className="pr-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 24px 88px" }}>

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
            {/* Was "PKR, INR, AED, and more" — we only ever bill in PKR or USD,
                so naming currencies we do not support promised too much. */}
            Prices are shown in the currency you will be billed in. <strong style={{ color: "rgba(255,255,255,.7)" }}>No hidden fees. Cancel anytime.</strong>
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
          {/* The 30-currency picker is gone. Billing happens in exactly two
              currencies — PKR for Pakistan, USD everywhere else — decided by
              the visitor's IP, so offering a choice here could only ever
              disagree with what checkout charges. */}
        </div>
        {/* No currency line here. The amounts already carry their own symbol,
            so spelling out "USD"/"PKR" only added noise. */}
        <div style={{ marginBottom: 40 }} />

        {/* ── USE-CASE WIZARD ───────────────────────────────── */}
        <UseCaseWizard />

        {/* ── PLAN CARDS ──────────────────────────────────────── */}
        <div className="pg" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginBottom: 80 }}>
          {PLANS.map((plan) => {
            const pricingKey = plan.slug as keyof PlanPricing;
            const regularPrice = billing === "yearly" ? publicPricing[pricingKey].yearly : publicPricing[pricingKey].monthly;
            const introPrice = Math.round(regularPrice * 0.50);

            // Use admin-set PKR prices when visitor is from Pakistan
            const pkrPlanKey = plan.slug as "starter" | "professional" | "enterprise";
            const useAdminPkr = isPKUser && pkrPricing != null;
            const pkrAmount = useAdminPkr ? (billing === "yearly" ? pkrPricing![pkrPlanKey].yearly : pkrPricing![pkrPlanKey].monthly) : 0;
            const displayRegular = useAdminPkr ? `₨${pkrAmount.toLocaleString("en-PK")}` : formatPrice(regularPrice);
            const displayIntro   = useAdminPkr ? `₨${Math.round(pkrAmount * 0.50).toLocaleString("en-PK")}` : formatPrice(introPrice);
            return (
              <div key={plan.slug} style={{ position: "relative", borderRadius: 22, background: plan.featured ? "linear-gradient(160deg,rgba(99,102,241,.16),rgba(255,255,255,.03))" : "rgba(255,255,255,.03)", border: `1.5px solid ${plan.border}`, overflow: "hidden", boxShadow: plan.featured ? "0 28px 80px rgba(99,102,241,.22)" : "0 10px 30px rgba(0,0,0,.16)" }}>
                <div style={{ height: 3, background: plan.gradient }} />
                <div style={{ padding: "28px 26px" }}>
                  {plan.featured && <div style={{ display: "inline-flex", marginBottom: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(251,191,36,.12)", color: "#fbbf24", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Most Popular</div>}
                  <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>{plan.name}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.42)", lineHeight: 1.5, minHeight: 40 }}>{plan.tagline}</div>
                  <div style={{ margin: "24px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,.55)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 800 }}>Now</span>
                      <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(249,115,22,.18)", border: "1px solid rgba(249,115,22,.4)", fontSize: 10, fontWeight: 800, color: "#fb923c" }}>50% OFF x 3 months</span>
                    </div>
                    <div style={{ fontSize: 42, fontWeight: 900, color: plan.color, letterSpacing: "-.03em", lineHeight: 1 }}>{displayIntro}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.92)", marginTop: 6, fontWeight: 700 }}>
                      Then {displayRegular}/mo
                    </div>
                    {/* <div style={{ fontSize: 11, color: "rgba(255,255,255,.36)", marginTop: 6 }}>
                      {billing === "yearly" ? "Intro price for first 3 months, then yearly-plan monthly equivalent applies." : "Intro price for first 3 months, then regular monthly billing starts."}
                    </div> */}
                  </div>
                  <BuyCta
                    href={buildHref(plan.slug)}
                    style={{ display: "block", width: "100%", textAlign: "center", padding: "12px 18px", borderRadius: 12, textDecoration: "none", color: "white", fontWeight: 800, background: plan.gradient, marginBottom: 22, fontSize: 14 }}
                  >
                    Continue with {plan.name}
                  </BuyCta>
                  {/* <div style={{ fontSize: 11, color: "rgba(255,255,255,.42)", marginTop: -12, marginBottom: 16, textAlign: "center" }}>
                    You&apos;ll be charged {formatPrice(regularPrice)}/mo after the first 3 months.
                  </div> */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(planHighlights[plan.slug] ?? DEFAULT_HIGHLIGHTS[plan.slug as keyof typeof DEFAULT_HIGHLIGHTS] ?? []).map((f: string, idx: number) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: `${plan.color}18`, border: `1px solid ${plan.color}38`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="8" height="8" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4.5 9 11 1" stroke={plan.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,.72)" }}>
                          {idx === 0
                            ? (plan.slug === "starter"
                              ? usersLabel(planLimits.starter) + " users"
                              : plan.slug === "professional"
                                ? usersLabel(planLimits.professional) + " users"
                                : usersLabel(planLimits.enterprise) + " users")
                            : f}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* The "Secure Checkout · Powered by Safepay / LemonSqueezy" strip with
            the Visa / Mastercard / JazzCash / Easypaisa / Bank Transfer badges
            used to sit here. Removed on request. The same reassurance already
            appears at checkout, where it is the thing being reassured about. */}

        {/* ── AUTOMATION ADD-ON ────────────────────────────────── */}
        {/* Hidden until it can actually be bought — see lib/addons.ts. */}
        {AUTOMATION_ADDON_ENABLED && (
        <div style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,.12)", border: "1px solid rgba(124,58,237,.28)", borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#a78bfa", fontWeight: 700, marginBottom: 16 }}>
              ⚡ Power Add-On
            </div>
            <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 900, letterSpacing: "-.02em", marginBottom: 10 }}>
              Add Business Automation to any plan
            </h2>
            <p style={{ color: "rgba(255,255,255,.42)", fontSize: 15, maxWidth: 560, margin: "0 auto" }}>
              Attach it to whatever you already pay for — Starter, Professional, Enterprise, or a custom package.
            </p>
          </div>

          <div style={{ borderRadius: 24, background: "linear-gradient(135deg,rgba(124,58,237,.1),rgba(37,99,235,.08))", border: "1.5px solid rgba(124,58,237,.35)", overflow: "hidden", boxShadow: "0 0 60px rgba(124,58,237,.12)" }}>
            <div style={{ height: 3, background: "linear-gradient(90deg,#7c3aed,#2563eb,#38bdf8)" }} />
            <div style={{ padding: "36px 40px" }}>
              <div className="addon-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>

                {/* Left: Pitch + CTA */}
                <div>
                  {/* No price here on purpose. Automation is quoted with the
                      plan it is attached to, so a number on this card would be
                      a second, competing price for the same subscription. */}
                  <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 700, marginBottom: 10 }}>AUTOMATION ADD-ON</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-.02em", lineHeight: 1.25, marginBottom: 10 }}>
                    Put the busywork on autopilot
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.6, marginBottom: 10 }}>
                    Chasing overdue invoices, watching stock levels and rebuilding the same reports every month — all of it runs on its own.
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 28 }}>
                    Add to any plan · Cancel anytime · No hidden fees
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <BuyCta
                      href="/onboarding/choose-plan?addon=automation"
                      style={{
                        padding: "12px 28px", borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#2563eb)",
                        color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700,
                        boxShadow: "0 0 24px rgba(124,58,237,.35)",
                      }}
                    >
                      Add to my plan →
                    </BuyCta>
                    <Link href="/automation" style={{
                      padding: "12px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,.15)",
                      color: "rgba(255,255,255,.7)", textDecoration: "none", fontSize: 14, fontWeight: 600,
                    }}>
                      See full details
                    </Link>
                  </div>
                </div>

                {/* Right: Features grid */}
                <div className="addon-feat" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { icon: "🔔", label: "Invoice Reminders", sub: "Overdue invoice follow-up" },
                    { icon: "📦", label: "Low Stock Alerts", sub: "Reorder before you run out" },
                    { icon: "📊", label: "Scheduled Reports", sub: "P&L, Balance Sheet & more" },
                    { icon: "🔗", label: "Zapier / Make", sub: "5,000+ app connects" },
                    { icon: "📈", label: "Google Sheets Sync", sub: "1-click export" },
                  ].map(f => (
                    <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{f.label}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)" }}>{f.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Value comparison bar.
                  The dollar figures that used to sit here were hard-coded USD
                  ($40, $30, $60 … "= $438+/mo vs our $79") — they ignored the
                  visitor's currency and quoted an automation price this card
                  deliberately no longer shows. The point stands without them. */}
              <div className="val-bar" style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>Replaces separate subscriptions for:</span>
                {["AR reminder tools", "Reorder alerts", "Reporting tools", "Zapier", "Sheet sync"].map(t => (
                  <span key={t} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.22)", color: "#c4b5fd" }}>{t}</span>
                ))}
                <span style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>— all in one add-on</span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ── FEATURE COMPARISON TABLE ────────────────────────── */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 900, letterSpacing: "-.03em", marginBottom: 12 }}>Compare all features</h2>
            <p style={{ color: "rgba(255,255,255,.4)", fontSize: 15 }}>Everything side by side — no surprises</p>
          </div>

          {/* Sticky header row */}
          <div className="ct" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, overflow: "hidden" }}>
          <div className="ct-inner">
            {/* Plan header */}
            <div className="ct-sticky" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,.08)", position: "sticky", top: 0, background: "#0c0f2e", zIndex: 10 }}>
              <div style={{ padding: "20px 24px", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Features</div>
              {PLANS.map((plan, pi) => (
                <div key={plan.slug} style={{ padding: "20px 16px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.06)", background: plan.featured ? "rgba(99,102,241,.06)" : "transparent" }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: PLAN_COLORS[pi], marginBottom: 4 }}>{plan.name}</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,.9)", fontWeight: 800 }}>
                    {getPlanPrice(plan.slug as "starter" | "professional" | "enterprise")}<span style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>/mo</span>
                  </div>
                  {plan.featured && <div style={{ marginTop: 4, fontSize: 10, fontWeight: 800, color: "#fbbf24", letterSpacing: ".06em" }}>POPULAR</div>}
                </div>
              ))}
            </div>

            {/* Categories */}
            {visibleComparison.map(cat => (
              <div key={cat.id}>
                {/* Category header — clickable */}
                <button
                  className="ct-cat"
                  onClick={() => toggleCat(cat.id)}
                  style={{ width: "100%", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "rgba(255,255,255,.025)", border: "none", borderTop: "1px solid rgba(255,255,255,.06)", cursor: "pointer", fontFamily: ff, color: "white", padding: 0 }}
                >
                  <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", gap: 10, gridColumn: "1 / -1" }}>
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,.85)", letterSpacing: ".01em" }}>{cat.title}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,.3)", transition: "transform .2s", display: "inline-block", transform: openCats.has(cat.id) ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                  </div>
                </button>

                {/* Feature rows */}
                {openCats.has(cat.id) && cat.features.map((feat) => (
                  <div
                    key={feat.name}
                    className="feat-row"
                    style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderTop: "1px solid rgba(255,255,255,.04)", transition: "background .15s" }}
                  >
                    <div style={{ padding: "13px 24px 13px 44px", fontSize: 13, color: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", gap: 8 }}>
                      {feat.name}
                    </div>
                    {feat.name === "Users"
                      ? ([planLimits.starter, planLimits.professional, planLimits.enterprise] as (number | null)[]).map((lim, pi) => (
                          <div key={pi} style={{ padding: "13px 16px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", background: PLANS[pi].featured ? "rgba(99,102,241,.03)" : "transparent" }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: PLAN_COLORS[pi] }}>{usersLabel(lim)} users</span>
                          </div>
                        ))
                      : feat.name === "Branches"
                      ? ([branchLimits.starter, branchLimits.professional, branchLimits.enterprise] as (number | null)[]).map((lim, pi) => (
                          <div key={pi} style={{ padding: "13px 16px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", background: PLANS[pi].featured ? "rgba(99,102,241,.03)" : "transparent" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: PLAN_COLORS[pi] }}>{lim === null ? "Unlimited" : lim === 1 ? "1 branch" : `Up to ${lim}`}</span>
                          </div>
                        ))
                      : resolveRow(feat).map((v, pi) => (
                          <div key={pi} style={{ padding: "13px 16px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", background: PLANS[pi].featured ? "rgba(99,102,241,.03)" : "transparent" }}>
                            <Val v={v} color={PLAN_COLORS[pi]} />
                          </div>
                        ))
                    }
                  </div>
                ))}
              </div>
            ))}

            {/* Bottom CTA row */}
            <div className="ct-cta" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderTop: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.015)" }}>
              <div style={{ padding: "24px 24px", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.3)" }}>Ready to start?</div>
              {PLANS.map((plan) => (
                <div key={plan.slug} style={{ padding: "20px 16px", borderLeft: "1px solid rgba(255,255,255,.06)", background: plan.featured ? "rgba(99,102,241,.06)" : "transparent" }}>
                  <BuyCta
                    href={buildHref(plan.slug)}
                    style={{ display: "block", width: "100%", textAlign: "center", padding: "11px 12px", borderRadius: 10, textDecoration: "none", color: "white", fontWeight: 800, fontSize: 13, background: plan.gradient }}
                  >
                    Get {plan.name}
                  </BuyCta>
                </div>
              ))}
            </div>
          </div>{/* /ct-inner */}
          </div>
        </div>

        {/* ── CUSTOM PLAN ──────────────────────────────────────── */}
        <div id="custom" style={{ marginBottom: 80 }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,.1)", border: "1px solid rgba(249,115,22,.25)", borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#f97316", fontWeight: 700, marginBottom: 16 }}>
              🧩 Custom Plan
            </div>
            <h2 style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 900, letterSpacing: "-.03em", marginBottom: 10 }}>Pay only for modules you need</h2>
            <p style={{ color: "rgba(255,255,255,.42)", fontSize: 15, maxWidth: 560, margin: "0 auto" }}>
              Pick the exact features your business needs. No bloat, no unused modules — and if you only need one, buy just that one.
            </p>
          </div>

          {/* The "Run just one" grid used to sit here: six cards for HR & Payroll,
              CRM, Inventory, Accounting, Trading Desk and Bank & Payments, each
              with its price and a "Pick this only" button. Every one of those six
              is also a card in the picker directly below, at the same price — the
              same modules rendered twice on one screen. The picker already badges
              them RUNS ALONE and its estimate updates live, so the grid was a
              duplicate with no extra information. */}
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.42)", marginBottom: 18, textAlign: "center" }}>
            Tick anything below and the estimate updates live. Modules marked{" "}
            <span style={{ color: "#34d399", fontWeight: 700 }}>RUNS ALONE</span> work on their own — pick just one and that is your whole subscription.
          </div>

          <div className="cp-row" style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Left — Module picker + add-ons */}
            <div style={{ flex: "1 1 560px", minWidth: 0 }}>
              {MODULE_CATEGORIES.map(cat => {
                const catMods = customPlanData.modules.filter((m: any) => m.category === cat.id);
                if (!catMods.length) return null;
                return (
                  <div key={cat.id} style={{ marginBottom: 22 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.3)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ color: cat.color }}>{cat.icon}</span>{cat.label}
                    </div>
                    <div className="mod-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                      {catMods.map((module: any) => {
                        const sel = selectedModules.includes(module.id);
                        return (
                          <button key={module.id} onClick={() => toggleModule(module.id)} style={{
                            textAlign: "left", padding: "16px 18px", borderRadius: 14,
                            border: `1.5px solid ${sel ? "rgba(249,115,22,.5)" : "rgba(255,255,255,.07)"}`,
                            background: sel ? "rgba(249,115,22,.07)" : "rgba(255,255,255,.025)",
                            color: "white", cursor: "pointer", fontFamily: ff, transition: "all .2s",
                          }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <span style={{ fontSize: 20, lineHeight: 1 }}>{module.icon}</span>
                                <span style={{ fontSize: 13, fontWeight: 800, color: sel ? "#fb923c" : "white" }}>{module.name}</span>
                              </div>
                              <div style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: sel ? "#f97316" : "transparent", border: sel ? "none" : "1.5px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {sel && <svg width="10" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4.5 9 11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", lineHeight: 1.5, marginBottom: 9 }}>{module.desc}</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: sel ? "#f97316" : "rgba(255,255,255,.45)" }}>
                                +{formatPrice(module.price)}<span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,.3)" }}>/mo</span>
                              </div>
                              {/* Says whether ticking only this box is already a
                                  working subscription, or whether it needs a
                                  module underneath it. */}
                              {isStandalone(module.id) ? (
                                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".05em", padding: "3px 7px", borderRadius: 5, color: "#34d399", background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.25)" }}>
                                  RUNS ALONE
                                </span>
                              ) : (
                                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".05em", padding: "3px 7px", borderRadius: 5, color: "rgba(255,255,255,.35)", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)" }}>
                                  ADD-ON
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Seats & branches.
                  This block was headed "Add-ons — Optional" while the module
                  cards directly above it badge layer-on modules "ADD-ON" — two
                  different meanings of the same word on one screen. These are
                  quantities, not features, so they are Extras now. */}
              <div style={{ padding: "20px 22px", borderRadius: 16, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.3)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 14 }}>Extras — Optional</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[
                    { key: "users",    label: "Extra Users",    icon: "👥", color: "#a5b4fc", val: extraUsers,    set: setExtraUsers },
                    { key: "branches", label: "Extra Branches", icon: "🏢", color: "#38bdf8", val: extraBranches, set: setExtraBranches },
                  ].map(addon => (
                    <div key={addon.key}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.65)", marginBottom: 4 }}>{addon.icon} {addon.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginBottom: 10 }}>+{formatPrice(seatRate)}/each/mo</div>
                      <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,.05)", borderRadius: 10, border: "1px solid rgba(255,255,255,.09)", overflow: "hidden" }}>
                        <button onClick={() => addon.set((v: number) => Math.max(0, v - 1))} style={{ padding: "9px 16px", background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 18, cursor: "pointer", fontFamily: ff, lineHeight: 1 }}>−</button>
                        <input type="number" min="0" value={addon.val} onChange={e => addon.set(Math.max(0, parseInt(e.target.value) || 0))} style={{ flex: 1, background: "none", border: "none", color: addon.color, fontSize: 16, fontWeight: 800, textAlign: "center", outline: "none", fontFamily: ff, width: 0 }} />
                        <button onClick={() => addon.set((v: number) => v + 1)} style={{ padding: "9px 16px", background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 18, cursor: "pointer", fontFamily: ff, lineHeight: 1 }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Price summary */}
            <div className="cp-sidebar" style={{ width: 320, flexShrink: 0, position: "sticky", top: 24 }}>
              <div style={{ borderRadius: 20, background: "rgba(249,115,22,.07)", border: "1.5px solid rgba(249,115,22,.28)", padding: "22px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#f97316", letterSpacing: ".06em", textTransform: "uppercase" }}>Your Estimate</span>
                  {standaloneOnly && (
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".05em", padding: "3px 7px", borderRadius: 5, color: "#34d399", background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.25)" }}>
                      SINGLE APP
                    </span>
                  )}
                </div>

                {/* Modules breakdown */}
                {selectedModules.length === 0 ? (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.28)", marginBottom: 14, fontStyle: "italic" }}>No modules selected yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                    {customPlanData.modules.filter((m: any) => selectedModules.includes(m.id)).map((m: any) => (
                      <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>{m.icon} {m.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.78)" }}>{formatPrice(m.price)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Extras breakdown — seats and branches */}
                {(extraUsers > 0 || extraBranches > 0) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.07)" }}>
                    {extraUsers > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>👥 {extraUsers} user{extraUsers > 1 ? "s" : ""} × {formatPrice(seatRate)}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc" }}>{formatPrice(extraUsers * seatRate)}</span>
                      </div>
                    )}
                    {extraBranches > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>🏢 {extraBranches} branch{extraBranches > 1 ? "es" : ""} × {formatPrice(seatRate)}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>{formatPrice(extraBranches * seatRate)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Total */}
                <div style={{ borderTop: "1px solid rgba(249,115,22,.25)", paddingTop: 14, marginBottom: 16 }}>
                  {billing === "yearly" && customMonthly > 0 && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                      <span>Subtotal</span><span>{formatPrice(customMonthly)}/mo</span>
                    </div>
                  )}
                  {billing === "yearly" && (
                    <div style={{ fontSize: 11, color: "#34d399", marginBottom: 6, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                      <span>Yearly −{yearlyDiscount}%</span>
                      <span>−{formatPrice(Math.round(customMonthly * yearlyDiscount / 100))}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginBottom: 4 }}>
                    {billing === "yearly" ? "Per month, billed annually" : "Per month"}
                  </div>
                  <div style={{ fontSize: 42, fontWeight: 900, color: customMonthly > 0 ? "#f97316" : "rgba(255,255,255,.2)", lineHeight: 1, letterSpacing: "-1.5px" }}>
                    {customMonthly > 0 ? formatPrice(customDisplayUsd) : "—"}
                  </div>
                  {billing === "yearly" && customMonthly > 0 && (
                    <div style={{ fontSize: 11, color: "#34d399", marginTop: 6, fontWeight: 700 }}>
                      Save {formatPrice(Math.round(customMonthly * yearlyDiscount / 100 * 12))} per year
                    </div>
                  )}
                </div>

                {needsCoreModule && (
                  <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.22)", fontSize: 11.5, color: "#fbbf24", lineHeight: 1.5 }}>
                    Add one module marked <strong>Runs alone</strong> — the ones you picked layer on top of another module.
                  </div>
                )}

                <BuyCta
                  href={buildCustomHref()}
                  disabled={!selectedModules.length || needsCoreModule}
                  style={{
                    display: "block", width: "100%", textAlign: "center", padding: "13px 18px", borderRadius: 12,
                    background: selectedModules.length && !needsCoreModule ? "linear-gradient(135deg,#f97316,#ea580c)" : "rgba(255,255,255,.06)",
                    color: "white", fontWeight: 800, fontSize: 14, textDecoration: "none",
                    opacity: selectedModules.length && !needsCoreModule ? 1 : 0.5,
                    border: selectedModules.length && !needsCoreModule ? "none" : "1px solid rgba(255,255,255,.1)",
                  }}
                >
                  {!selectedModules.length
                    ? "Select modules above"
                    : needsCoreModule
                      ? "Pick a module that runs alone"
                      : standaloneOnly
                        ? "Continue with this app →"
                        : "Continue →"}
                </BuyCta>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.22)", textAlign: "center", marginTop: 10 }}>
                  You&apos;ll confirm everything before payment
                </div>
              </div>
            </div>
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
