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
    features: [
      "Up to 5 users",
      "Sales and purchase invoices",
      "Ledger and trial balance",
      "Basic reports",
      "Chart of accounts",
      "Email support",
    ],
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
    features: [
      "Everything in Starter",
      "Inventory management",
      "Bank reconciliation",
      "Multi-branch support",
      "HR and payroll",
      "CRM and advanced reports",
    ],
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
    features: [
      "Unlimited users",
      "Everything in Professional",
      "API access",
      "Custom integrations",
      "Multi-currency",
      "Priority onboarding and support",
    ],
  },
];

const MODULES = [
  { id: "accounting", name: "Accounting & Invoicing", price: 15, desc: "Ledger, invoices, vouchers, P&L, balance sheet" },
  { id: "inventory", name: "Inventory Management", price: 12, desc: "Stock tracking, GRN, barcode, low-stock alerts" },
  { id: "crm", name: "CRM", price: 15, desc: "Contacts, sales pipeline, interaction logs" },
  { id: "hr_payroll", name: "HR & Payroll", price: 20, desc: "Employees, attendance, payroll, advance salary" },
  { id: "bank_reconciliation", name: "Bank Reconciliation", price: 10, desc: "Statement import, discrepancy flagging, closing" },
  { id: "reports", name: "Advanced Reports", price: 8, desc: "Cash flow, profitability, annual statements" },
  { id: "multi_branch", name: "Multi-Branch", price: 15, desc: "Branches, consolidated reports, branch access" },
  { id: "whatsapp", name: "WhatsApp & SMS", price: 8, desc: "Payment reminders, invoices via WhatsApp and SMS" },
  { id: "api_access", name: "API Access", price: 20, desc: "REST API, webhooks, third-party integrations" },
  { id: "tax_filing", name: "Tax & Compliance", price: 10, desc: "Tax summary, GST/VAT reports, compliance docs" },
];

const FAQS = [
  {
    q: "Will prices automatically match the visitor's country?",
    a: "Yes. We detect a likely local currency from the visitor's region and show localized display pricing. Users can still change the currency manually.",
  },
  {
    q: "Is the charged currency always the same as the displayed currency?",
    a: "Displayed pricing is localized for convenience. Final billing currency is confirmed during checkout.",
  },
  {
    q: "Can I build my own package?",
    a: "Yes. The Custom plan lets you pick only the modules you need and see an instant estimate.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. You can upgrade, downgrade, or move to a custom package later.",
  },
];

function CheckMark({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: `${color}18`,
        border: `1px solid ${color}38`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="9" height="9" viewBox="0 0 12 10" fill="none">
        <path d="M1 5.5L4.5 9 11 1" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
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
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    (async () => {
      const stored = getStoredCurrencyPreference();
      if (stored.currency && FX_USD[stored.currency]) setCurrency(stored.currency);
      if (stored.country) setCountry(stored.country);

      try {
        if (!stored.currency || !stored.country) {
          const geo = await fetch("/api/public/geo", { cache: "no-store" });
          if (geo.ok) {
            const data = await geo.json();
            if (data?.currency && FX_USD[data.currency]) setCurrency(data.currency);
            if (data?.country) setCountry(data.country);
          }
        }
      } catch {}

      try {
        const fx = await fetch("/api/public/fx", { cache: "no-store" });
        if (fx.ok) {
          const data = await fx.json();
          if (data?.rates) setRates(data.rates);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (currency) {
      setStoredCurrencyPreference(currency, country);
    }
  }, [currency, country]);

  useEffect(() => {
    const handleCurrencyChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ currency?: string; country?: string | null }>).detail;
      if (detail?.currency && FX_USD[detail.currency]) setCurrency(detail.currency);
      if (detail?.country) setCountry(detail.country);
    };

    window.addEventListener(FINOVA_CURRENCY_EVENT, handleCurrencyChanged as EventListener);
    return () => window.removeEventListener(FINOVA_CURRENCY_EVENT, handleCurrencyChanged as EventListener);
  }, []);

  const customMonthly = useMemo(
    () => selectedModules.reduce((sum, id) => sum + (MODULES.find((m) => m.id === id)?.price || 0), 0),
    [selectedModules]
  );
  const customDisplayUsd = billing === "yearly" ? Math.round(customMonthly * 0.8) : customMonthly;

  const formatPrice = (usdAmount: number) => formatFromUSD(usdAmount, currency, rates);
  const buildHref = (slug: string) =>
    `/onboarding/signup/${slug}?cycle=${billing}&currency=${currency}&country=${country}`;
  const buildCustomHref = () =>
    `/onboarding/choose-plan?plan=custom&modules=${selectedModules.join(",")}&cycle=${billing}&currency=${currency}&country=${country}`;

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((moduleId) => moduleId !== id) : [...prev, id]
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#080c1e 0%,#0c0f2e 35%,#080c1e 100%)",
        color: "white",
        fontFamily: "'Outfit','DM Sans',sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        select option{background:#0f1629;color:white}
        @media (max-width: 900px){
          .pricing-grid{grid-template-columns:1fr !important}
          .custom-grid{grid-template-columns:1fr !important}
        }
      `}</style>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 24px 88px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 999,
              background: "rgba(129,140,248,.1)",
              border: "1px solid rgba(129,140,248,.25)",
              color: "#a5b4fc",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: ".04em",
              marginBottom: 22,
            }}
          >
            Localized Pricing
          </div>
          <h1 style={{ fontSize: "clamp(34px,5vw,58px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-.03em", marginBottom: 16 }}>
            Pricing that adapts to
            <br />
            <span style={{ background: "linear-gradient(135deg,#818cf8,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              your region
            </span>
          </h1>
          <p style={{ maxWidth: 640, margin: "0 auto", color: "rgba(255,255,255,.48)", fontSize: 17, lineHeight: 1.65 }}>
            Finova can automatically show prices in a likely local currency, such as PKR for Pakistan, INR for India, AED for UAE, and more.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: 4 }}>
            {(["monthly", "yearly"] as const).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBilling(cycle)}
                style={{
                  padding: "10px 24px",
                  border: "none",
                  borderRadius: 9,
                  background: billing === cycle ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "transparent",
                  color: billing === cycle ? "white" : "rgba(255,255,255,.45)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 800,
                  fontFamily: "inherit",
                }}
              >
                {cycle === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>

          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 12,
              padding: "10px 14px",
              color: "white",
              fontSize: 13,
              fontWeight: 700,
              outline: "none",
            }}
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code} - {CURRENCY_LABEL[code]}
              </option>
            ))}
          </select>
        </div>

        <div style={{ textAlign: "center", color: "rgba(255,255,255,.38)", fontSize: 12, marginBottom: 56 }}>
          Showing prices in {currency} for region {country}. Final billing currency is confirmed at checkout.
        </div>

        <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginBottom: 72 }}>
          {PLANS.map((plan) => {
            const usdPrice = billing === "yearly" ? plan.yearly : plan.monthly;
            return (
              <div
                key={plan.slug}
                style={{
                  position: "relative",
                  borderRadius: 22,
                  background: plan.featured ? "linear-gradient(160deg,rgba(99,102,241,.16),rgba(255,255,255,.03))" : "rgba(255,255,255,.03)",
                  border: `1.5px solid ${plan.border}`,
                  overflow: "hidden",
                  boxShadow: plan.featured ? "0 28px 80px rgba(99,102,241,.22)" : "0 10px 30px rgba(0,0,0,.16)",
                }}
              >
                <div style={{ height: 3, background: plan.gradient }} />
                <div style={{ padding: "28px 26px" }}>
                  {plan.featured && (
                    <div style={{ display: "inline-flex", marginBottom: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(251,191,36,.12)", color: "#fbbf24", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
                      Most Popular
                    </div>
                  )}
                  <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>{plan.name}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.42)", lineHeight: 1.5, minHeight: 40 }}>{plan.tagline}</div>

                  <div style={{ margin: "24px 0" }}>
                    <div style={{ fontSize: 42, fontWeight: 900, color: plan.color, letterSpacing: "-.03em", lineHeight: 1 }}>
                      {formatPrice(usdPrice)}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.36)", marginTop: 6 }}>
                      {billing === "monthly" ? "per month" : "per month on yearly plan"}
                    </div>
                  </div>

                  <Link
                    href={buildHref(plan.slug)}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "12px 18px",
                      borderRadius: 12,
                      textDecoration: "none",
                      color: "white",
                      fontWeight: 800,
                      background: plan.gradient,
                      marginBottom: 22,
                    }}
                  >
                    Continue with {plan.name}
                  </Link>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {plan.features.map((feature) => (
                      <div key={feature} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <CheckMark color={plan.color} />
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,.72)", lineHeight: 1.45 }}>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            background: "rgba(255,255,255,.02)",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 24,
            padding: "34px 28px",
            marginBottom: 72,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#f97316", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>
                Custom Plan
              </div>
              <h2 style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 900, letterSpacing: "-.03em", marginBottom: 10 }}>
                Build your own package
              </h2>
              <p style={{ color: "rgba(255,255,255,.45)", maxWidth: 520, lineHeight: 1.6 }}>
                Pick only the modules you need. Prices below are shown in your selected currency while the internal base price stays consistent.
              </p>
            </div>

            <div style={{ minWidth: 220, padding: "22px 24px", borderRadius: 18, background: "rgba(249,115,22,.08)", border: "1px solid rgba(249,115,22,.24)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                Your Estimate
              </div>
              <div style={{ fontSize: 44, fontWeight: 900, color: "#f97316", lineHeight: 1 }}>
                {formatPrice(customDisplayUsd)}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 6 }}>
                {selectedModules.length} module{selectedModules.length === 1 ? "" : "s"} selected
              </div>
              <Link
                href={buildCustomHref()}
                style={{
                  display: "block",
                  marginTop: 18,
                  padding: "11px 18px",
                  borderRadius: 12,
                  textDecoration: "none",
                  color: "white",
                  fontWeight: 800,
                  background: "linear-gradient(135deg,#f97316,#ea580c)",
                }}
              >
                Continue
              </Link>
            </div>
          </div>

          <div className="custom-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
            {MODULES.map((module) => {
              const selected = selectedModules.includes(module.id);
              return (
                <button
                  key={module.id}
                  onClick={() => toggleModule(module.id)}
                  style={{
                    textAlign: "left",
                    padding: "18px 18px",
                    borderRadius: 16,
                    border: `1.5px solid ${selected ? "rgba(249,115,22,.45)" : "rgba(255,255,255,.08)"}`,
                    background: selected ? "rgba(249,115,22,.08)" : "rgba(255,255,255,.03)",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{module.name}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: selected ? "#f97316" : "rgba(255,255,255,.58)" }}>
                      +{formatPrice(module.price)}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", lineHeight: 1.5 }}>{module.desc}</div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 20, fontSize: 13, color: "rgba(255,255,255,.36)", textAlign: "center" }}>
            Base infrastructure starts from {formatPrice(15)} per month, plus selected module prices.
          </div>
        </div>

        <div style={{ maxWidth: 820, margin: "0 auto 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 900, letterSpacing: "-.03em" }}>Frequently asked questions</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQS.map((faq, index) => (
              <div
                key={faq.q}
                style={{
                  borderRadius: 16,
                  border: `1px solid ${openFaq === index ? "rgba(129,140,248,.35)" : "rgba(255,255,255,.08)"}`,
                  background: openFaq === index ? "rgba(99,102,241,.08)" : "rgba(255,255,255,.02)",
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    padding: "18px 20px",
                    color: "white",
                    fontSize: 14,
                    fontWeight: 800,
                    fontFamily: "inherit",
                  }}
                >
                  {faq.q}
                </button>
                {openFaq === index && (
                  <div style={{ padding: "0 20px 18px", color: "rgba(255,255,255,.5)", fontSize: 14, lineHeight: 1.65 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", color: "rgba(255,255,255,.36)", fontSize: 13 }}>
          Already subscribed?{" "}
          <Link href={`${appUrl}/auth`} style={{ color: "#a5b4fc", textDecoration: "none", fontWeight: 700 }}>
            Sign in to your account
          </Link>
        </div>
      </div>
    </div>
  );
}
