"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { getCurrentUser, setCurrentUser } from "@/lib/auth";
import { FX_USD, formatFromUSD } from "@/lib/currency-client";
import { getStoredCurrencyPreference, setStoredCurrencyPreference } from "@/lib/currencyPreference";
import { getCustomPlanCycleAmountUsd, parseCustomModules } from "@/lib/customPlanPricing";

/* ── Plan meta ──────────────────────────────────────────── */
const PLAN_META: Record<string, { name: string; price: number; yearlyPrice: number; color: string; glow: string; dim: string; border: string; gradientFrom: string; gradientTo: string; icon: string }> = {
  starter:      { name: "Starter",      price: 49,  yearlyPrice: 470,  icon: "🌱", color: "#818cf8", glow: "rgba(129,140,248,.35)", dim: "rgba(129,140,248,.1)",  border: "rgba(129,140,248,.3)",  gradientFrom: "#6366f1", gradientTo: "#4f46e5" },
  pro:          { name: "Professional", price: 99,  yearlyPrice: 950,  icon: "🚀", color: "#34d399", glow: "rgba(52,211,153,.35)",  dim: "rgba(52,211,153,.1)",   border: "rgba(52,211,153,.3)",   gradientFrom: "#10b981", gradientTo: "#059669" },
  professional: { name: "Professional", price: 99,  yearlyPrice: 950,  icon: "🚀", color: "#34d399", glow: "rgba(52,211,153,.35)",  dim: "rgba(52,211,153,.1)",   border: "rgba(52,211,153,.3)",   gradientFrom: "#10b981", gradientTo: "#059669" },
  enterprise:   { name: "Enterprise",   price: 249, yearlyPrice: 2390, icon: "💎", color: "#fbbf24", glow: "rgba(251,191,36,.35)",  dim: "rgba(251,191,36,.1)",   border: "rgba(251,191,36,.3)",   gradientFrom: "#f59e0b", gradientTo: "#d97706" },
  custom:             { name: "Custom",            price: 0,  yearlyPrice: 0,   icon: "⚡", color: "#38bdf8", glow: "rgba(56,189,248,.35)",  dim: "rgba(56,189,248,.1)",   border: "rgba(56,189,248,.3)",   gradientFrom: "#0ea5e9", gradientTo: "#0284c7" },
  "addon-automation": { name: "Automation Add-on", price: 79, yearlyPrice: 828, icon: "🤖", color: "#a78bfa", glow: "rgba(167,139,250,.35)", dim: "rgba(167,139,250,.1)",  border: "rgba(167,139,250,.3)",  gradientFrom: "#7c3aed", gradientTo: "#6d28d9" },
};

/* ── Payment method types ───────────────────────────────── */
type PayMethod = "card" | "paypal" | "applepay" | "googlepay" | "card-pk";

type MethodDef = {
  id: PayMethod;
  label: string;
  desc: string;
  popular?: boolean;
  processor: string;
  processorColor: string;
  icon: React.ReactNode;
};

/* ── SVG Icons for payment methods ─────────────────────── */
const IconCard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="3"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);
const IconPayPal = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M7.02 21H3.64l.92-5.86H7.7c2.27 0 3.6-1.12 3.98-3.36.38-2.24-.8-3.36-3.07-3.36H5.5L7.16 3h3.11c3.55 0 5.5 1.73 4.9 5.16C14.5 11.5 12.1 13.5 8.7 13.5H6.38l-.46 2.97-.85 4.53H7.02z" fill="#009cde"/>
    <path d="M19.5 8c-.38 2.18-1.68 3.72-3.5 4.32.77 1.7 3.5 4.68 3.5 4.68" fill="#003087" opacity=".5"/>
  </svg>
);
const IconApplePay = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);
const IconGooglePay = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M3.67 8.67C4.9 5.4 8.2 3 12 3c2.3 0 4.3.8 5.87 2.07L15.4 7.53C14.47 6.87 13.28 6.5 12 6.5c-2.35 0-4.35 1.42-5.3 3.47L3.67 8.67z" fill="#EA4335"/>
    <path d="M3 12c0-.46.04-.9.1-1.33L6.7 9.97C6.57 10.63 6.5 11.3 6.5 12s.07 1.37.2 2.03L3.1 13.33C3.04 12.9 3 12.46 3 12z" fill="#FBBC05"/>
    <path d="M12 21c-3.8 0-7.1-2.4-8.33-5.67l3.03-1.3C7.65 16.08 9.65 17.5 12 17.5c1.28 0 2.47-.37 3.4-1.03l2.47 2.47C15.87 20.2 14.03 21 12 21z" fill="#34A853"/>
    <path d="M21 12c0-.67-.08-1.3-.2-1.92H12v3.67h5.07c-.22 1.2-.88 2.2-1.87 2.87l2.47 2.47C19.7 17.6 21 15 21 12z" fill="#4285F4"/>
  </svg>
);

/* ── Method groups ──────────────────────────────────────── */
type MethodGroup = { label: string; color: string; bg: string; border: string; methods: MethodDef[] };

const METHOD_GROUPS: MethodGroup[] = [
  {
    label: "International",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.06)",
    border: "rgba(251,191,36,0.2)",
    methods: [
      { id: "card",       label: "Credit / Debit Card", desc: "Visa & Mastercard",              popular: true, processor: "Secure Checkout", processorColor: "#fbbf24", icon: <IconCard /> },
      { id: "paypal",     label: "PayPal",              desc: "Pay with your PayPal balance",                   processor: "Secure Checkout", processorColor: "#fbbf24", icon: <IconPayPal /> },
      { id: "applepay",   label: "Apple Pay",           desc: "One-tap checkout on Safari & iOS",               processor: "Secure Checkout", processorColor: "#fbbf24", icon: <IconApplePay /> },
      { id: "googlepay",  label: "Google Pay",          desc: "One-tap checkout on Chrome & Android",           processor: "Secure Checkout", processorColor: "#fbbf24", icon: <IconGooglePay /> },
    ],
  },
  {
    label: "Pakistan",
    color: "#34d399",
    bg: "rgba(52,211,153,0.06)",
    border: "rgba(52,211,153,0.2)",
    methods: [
      { id: "card-pk", label: "Card Payment", desc: "Visa & Mastercard", popular: true, processor: "Secure Checkout", processorColor: "#34d399", icon: <IconCard /> },
    ],
  },
];

const FALLBACK_ENABLED_METHODS: PayMethod[] = ["card", "paypal", "applepay", "googlepay", "card-pk"];
const ALLOWED_CHECKOUT_METHODS = new Set<PayMethod>(FALLBACK_ENABLED_METHODS);

/* ── Step indicator ─────────────────────────────────────── */
function Steps({ current, finalLabel = "Done" }: { current: 1|2|3; finalLabel?: string }) {
  const steps = [{ n:1, label:"Payment" }, { n:2, label:"Verify" }, { n:3, label:finalLabel }];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0 }}>
      {steps.map((s,i) => (
        <div key={s.n} style={{ display:"flex", alignItems:"center" }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
            <div style={{
              width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:12, fontWeight:800,
              background: current > s.n ? "#34d399" : current === s.n ? "#6366f1" : "rgba(255,255,255,.06)",
              color: current >= s.n ? "white" : "rgba(255,255,255,.2)",
              border: current===s.n ? "2px solid rgba(129,140,248,.6)" : current>s.n ? "2px solid #34d399" : "2px solid rgba(255,255,255,.08)",
              boxShadow: current===s.n ? "0 0 16px rgba(99,102,241,.5)" : current>s.n ? "0 0 12px rgba(52,211,153,.4)" : "none",
            }}>
              {current>s.n ? "✓" : s.n}
            </div>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color: current>=s.n ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.2)" }}>{s.label}</span>
          </div>
          {i < steps.length-1 && (
            <div style={{ width:48, height:2, borderRadius:2, margin:"0 8px", marginBottom:18, background: current>s.n ? "#34d399" : "rgba(255,255,255,.08)" }}/>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function PaymentPage() {
  const params   = useParams() as { plan?: string };
  const router   = useRouter();
  const searchParams = useSearchParams();
  const plan     = String(params?.plan || "starter").toLowerCase();
  const meta     = PLAN_META[plan] || PLAN_META.starter;
  const urlCycle = (searchParams.get("cycle") || "").toLowerCase() === "yearly" ? "yearly" : "monthly";
  const queryPrice = Number(searchParams.get("price") || "");
  const customModulesParam = searchParams.get("modules") || "";
  const customModuleIds = parseCustomModules(customModulesParam);

  const [billingCycle, setBillingCycle] = useState<"monthly"|"yearly">(urlCycle);
  const [currency, setCurrency] = useState<string>(searchParams.get("currency") || "USD");
  const [country,  setCountry]  = useState<string>(searchParams.get("country")  || "US");
  const [rates,    setRates]    = useState<Record<string, number> | null>(null);
  // Admin-set PKR-native pricing (same source /pricing and /onboarding/signup
  // use) — Pakistan must show THIS, not the USD price run through an FX rate.
  // That FX-conversion path is what previously showed Rs 27,522 here for a
  // plan the pricing page itself prices at Rs 8,999.
  const [pkrPricing, setPkrPricing] = useState<Record<string, { monthly: number; yearly: number }> | null>(null);
  // Server-resolved region. `country` above is a display preference seeded from
  // `?country=`; these two come from /api/billing/pricing-region and are the
  // only thing allowed to unlock regional (PKR-native) pricing. Default false
  // so the UI fails closed on global pricing while the request is in flight.
  const [regionalPricingAllowed, setRegionalPricingAllowed] = useState(false);
  const [serverCountry, setServerCountry] = useState<string | null>(null);

  const planPrice =
    plan === "custom"
      ? (
        customModuleIds.length > 0
          ? getCustomPlanCycleAmountUsd(customModuleIds, billingCycle === "yearly" ? "YEARLY" : "MONTHLY")
          : (Number.isFinite(queryPrice) && queryPrice > 0 ? queryPrice : 0)
      )
      : billingCycle === "yearly"
        ? meta.yearlyPrice
        : meta.price;

  /* ── Form state ── */
  const [step,        setStep]        = useState<1|2|3>(1);
  const [method,      setMethod]      = useState<PayMethod>("card");
  const [email,       setEmail]       = useState("");
  const [lockedVerificationEmail, setLockedVerificationEmail] = useState("");
  const [otp,         setOtp]         = useState(["","","","","",""]);
  const [processing,  setProcessing]  = useState(false);
  const [activating,  setActivating]  = useState(false);
  const [otpError,    setOtpError]    = useState("");
  // /api/billing/checkout returns a `url` for two very different reasons: a
  // real payment provider (Lemon Squeezy/Safepay) checkout link — nothing is
  // active yet, the user still has to pay — or, only in the dev-only direct
  // fallback, a plan that's already been switched on with no payment at all.
  // Step 3 must show the right message for each; showing "Activated!" before
  // the user has even reached the payment page is what caused the confusion.
  const [pendingRealPayment, setPendingRealPayment] = useState(false);

  /* Coupon */
  const [couponInput,    setCouponInput]    = useState("");
  const [couponApplied,  setCouponApplied]  = useState<{ code: string; type: string; value: number } | null>(null);
  const [couponError,    setCouponError]    = useState("");
  const [couponLoading,  setCouponLoading]  = useState(false);

  // Saved payment method + subscription status (for addon confirm UI)
  const [savedPayMethod, setSavedPayMethod] = useState<{ type: PayMethod; label: string; processor: string; processorColor: string } | null>(null);
  const [activePlanName, setActivePlanName] = useState<string | null>(null);

  // Load saved payment method and, for addon plan, check subscription status
  useEffect(() => {
    try {
      const saved = localStorage.getItem("finovaPayMethod");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.type && ALLOWED_CHECKOUT_METHODS.has(parsed.type as PayMethod)) {
          setSavedPayMethod(parsed);
          setMethod(parsed.type as PayMethod);
        }
      }
    } catch {}

    if (plan === "addon-automation") {
      const user = getCurrentUser();
      if (user?.companyId) {
        fetch("/api/me/company", {
          headers: { "x-company-id": user.companyId, "x-user-id": user.id || "", "x-user-role": user.role || "" },
        })
          .then(r => r.json())
          .then(d => {
            if (d?.subscriptionStatus === "ACTIVE" && d?.plan) {
              const planLabels: Record<string, string> = { STARTER: "Starter", PRO: "Professional", ENTERPRISE: "Enterprise", CUSTOM: "Custom" };
              setActivePlanName(planLabels[String(d.plan).toUpperCase()] || d.plan);
            }
          })
          .catch(() => {});
      }
    }
  }, [plan]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.email) {
      const userEmail = String(user.email).trim().toLowerCase();
      setEmail(userEmail);
      setLockedVerificationEmail(userEmail);
      return;
    }

    try {
      const pendingVerification = localStorage.getItem("pendingVerification");
      if (pendingVerification) {
        const parsed = JSON.parse(pendingVerification);
        const pendingEmail = String(parsed?.email || "").trim().toLowerCase();
        if (pendingEmail) {
          setEmail(pendingEmail);
          setLockedVerificationEmail(pendingEmail);
          return;
        }
      }
    } catch {}

    const queryEmail = String(searchParams.get("email") || "").trim().toLowerCase();
    if (queryEmail) {
      setEmail(queryEmail);
      setLockedVerificationEmail(queryEmail);
    }
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      const stored = getStoredCurrencyPreference();
      if (!searchParams.get("currency") && stored.currency && FX_USD[stored.currency]) {
        setCurrency(stored.currency);
      }
      if (!searchParams.get("country") && stored.country) setCountry(stored.country);
      if ((!searchParams.get("currency") || !searchParams.get("country")) && (!stored.currency || !stored.country)) {
        try {
          const geo = await fetch("/api/public/geo", { cache: "no-store" });
          if (geo.ok) {
            const d = await geo.json();
            if (d?.currency && FX_USD[d.currency]) setCurrency(d.currency);
            if (d?.country) setCountry(d.country);
          }
        } catch {}
      }
      try {
        const fx = await fetch("/api/public/fx", { cache: "no-store" });
        if (fx.ok) { const d = await fx.json(); if (d?.rates) setRates(d.rates); }
      } catch {}
      try {
        const pr = await fetch("/api/public/pricing", { cache: "no-store" });
        if (pr.ok) { const d = await pr.json(); if (d?.pkrPricing) setPkrPricing(d.pkrPricing); }
      } catch {}
      // Authoritative region — same resolution /api/billing/checkout uses to
      // pick the Lemon Squeezy variant. `currency`/`country` above are only a
      // display preference (and are seeded from the URL), so regional pricing
      // must be gated on this instead or the screen can promise a price the
      // checkout will not honour.
      try {
        const user = getCurrentUser();
        const res = await fetch("/api/billing/pricing-region", {
          cache: "no-store",
          headers: {
            "x-company-id": user?.companyId || "",
            "x-user-id": user?.id || "",
            "x-user-role": user?.role || "",
          },
        });
        if (res.ok) {
          const d = await res.json();
          setRegionalPricingAllowed(Boolean(d?.regionalPricingAllowed));
          if (d?.country) setServerCountry(String(d.country).toUpperCase());
        }
      } catch {}
    })();
  }, [searchParams]);

  useEffect(() => {
    if (currency) setStoredCurrencyPreference(currency, country);
  }, [currency, country]);

  // Pakistan sees only the Pakistan card option; everywhere else sees only
  // the 4 international methods — no mixing, so there's nothing to be
  // confused by.
  // Payment-method groups follow the server's region, not the URL — offering
  // the Pakistan-only rails to someone who will be charged in USD just dead-ends.
  const isPakistan = (serverCountry ?? country).trim().toUpperCase() === "PK";
  const availableGroups = METHOD_GROUPS.filter((group) => group.label === (isPakistan ? "Pakistan" : "International"));
  const allAvailableMethods = availableGroups.flatMap((group) => group.methods);
  const selectedMethodDef = allAvailableMethods.find((m) => m.id === method) || allAvailableMethods[0];

  // Keep the selected method in sync with whichever group is actually visible.
  useEffect(() => {
    if (!allAvailableMethods.some((m) => m.id === method) && allAvailableMethods[0]) {
      setMethod(allAvailableMethods[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPakistan]);

  const finalPrice = couponApplied
    ? couponApplied.type === "percent"
      ? Math.max(0, planPrice - (planPrice * couponApplied.value) / 100)
      : Math.max(0, planPrice - couponApplied.value)
    : planPrice;

  // Pakistan uses admin-set PKR-native prices, NOT the USD price run through
  // FX — same rule /pricing and /onboarding/signup apply. plan keys here use
  // "pro"/"professional" interchangeably; pkrPricing only has "pro".
  // Was `currency === "PKR" || country === "PK"` — both client-controlled, so
  // `?country=PK` showed the discounted PKR price to anyone. Regional pricing
  // now requires the server to confirm the region.
  const isPkUser = regionalPricingAllowed;
  const pkrKey = plan === "professional" ? "pro" : plan;
  const pkrPlan = pkrPricing?.[pkrKey] || null;
  const pkrBasePrice = pkrPlan ? (billingCycle === "yearly" ? pkrPlan.yearly : pkrPlan.monthly) : null;
  const pkrFinalPrice = pkrBasePrice !== null && couponApplied
    ? couponApplied.type === "percent"
      ? Math.max(0, pkrBasePrice - (pkrBasePrice * couponApplied.value) / 100)
      : Math.max(0, pkrBasePrice - couponApplied.value)
    : pkrBasePrice;

  const displayPlanPrice  = isPkUser && pkrBasePrice !== null
    ? `₨${pkrBasePrice.toLocaleString("en-PK")}`
    : formatFromUSD(planPrice, currency, rates);
  const displayFinalPrice = isPkUser && pkrFinalPrice !== null
    ? `₨${pkrFinalPrice.toLocaleString("en-PK")}`
    : formatFromUSD(finalPrice, currency, rates);

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const r = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, plan }),
      });
      const d = await r.json();
      if (!r.ok || !d.valid) { setCouponError(d.error || "Invalid coupon code"); setCouponApplied(null); }
      else { setCouponApplied(d.coupon); setCouponInput(""); }
    } catch { setCouponError("Failed to validate coupon"); }
    finally { setCouponLoading(false); }
  }

  const verificationEmail = (lockedVerificationEmail || email).trim().toLowerCase();
  const isVerificationEmailLocked = !!lockedVerificationEmail;

  async function activatePlanDirect() {
    const user = getCurrentUser();
    if (!user) { setOtpError("Please sign in again before activating your plan."); return; }
    setActivating(true);
    // Save selected payment method for future auto-fill
    try {
      const mDef = allAvailableMethods.find(m => m.id === method);
      if (mDef) {
        localStorage.setItem("finovaPayMethod", JSON.stringify({ type: mDef.id, label: mDef.label, processor: mDef.processor, processorColor: mDef.processorColor }));
      }
    } catch {}
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id || "",
          "x-user-role": user.role || "ADMIN",
          "x-company-id": user.companyId || "",
        },
        body: JSON.stringify({
          planCode: plan.toUpperCase(),
          successUrl: plan === "addon-automation"
            ? `${window.location.origin}/dashboard/automation?addon=activated`
            : `${window.location.origin}/dashboard/billing?upgrade=success`,
          couponCode: couponApplied?.code || null,
          displayCurrency: currency,
          displayCountry: country,
          billingCycle,
          customModules: customModulesParam || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.url) {
        setPendingRealPayment(data.provider === "lemonsqueezy" || data.provider === "safepay");
        setStep(3);
        await new Promise(r => setTimeout(r, 1500));
        window.location.href = data.url;
        return;
      }
      setOtpError(data?.error || "Activation failed. Please try again.");
    } catch { setOtpError("Network error. Please try again."); }
    finally { setActivating(false); }
  }

  async function handlePaymentSubmit() {
    if (!verificationEmail) { setOtpError("Please enter your email address"); return; }
    setOtpError("");
    const currentUser = getCurrentUser();
    if (currentUser?.id && currentUser?.companyId) { await activatePlanDirect(); return; }
    setProcessing(true);
    try {
      // Payment step sits after signup/login verification setup. If the user
      // is not yet in browser storage, we still allow the existing sb_verify
      // cookie session to continue instead of re-requesting auth by email.
      setStep(2);
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleResendOtp() {
    if (!verificationEmail) return;
    setOtpError("");
    try {
      const res = await fetch("/api/auth/verify/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail, channel: "email" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setOtpError(data?.error || "Failed to resend code.");
      }
    } catch {
      setOtpError("Failed to resend code.");
    }
  }

  async function handleVerify() {
    const entered = otp.join("");
    if (entered.length < 6) { setOtpError("Please enter the 6-digit code."); return; }
    setOtpError("");
    setActivating(true);
    try {
      const verifyRes = await fetch("/api/auth/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: entered }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) { setOtpError(verifyData.error || "Invalid code"); setActivating(false); return; }
      if (verifyData?.user) {
        setCurrentUser(verifyData.user);
      }
      const user = verifyData?.user || getCurrentUser();
      if (!user) { setOtpError("Please sign in again."); setActivating(false); return; }
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "x-user-id":     user.id || "",
          "x-user-role":   user.role || "ADMIN",
          "x-company-id":  user.companyId || "",
        },
        body: JSON.stringify({
          planCode: plan.toUpperCase(),
          successUrl: plan === "addon-automation"
            ? window.location.origin + "/dashboard/automation?addon=activated"
            : window.location.origin + "/dashboard/billing?upgrade=success",
          couponCode: couponApplied?.code || null,
          displayCurrency: currency,
          displayCountry: country,
          billingCycle,
          customModules: customModulesParam || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.url) {
        setPendingRealPayment(data.provider === "lemonsqueezy" || data.provider === "safepay");
        setStep(3);
        await new Promise(r => setTimeout(r, 1500));
        window.location.href = data.url;
      } else {
        setOtpError(data?.error || "Activation failed. Please try again.");
        setActivating(false);
      }
    } catch { setOtpError("Network error. Please try again."); setActivating(false); }
  }

  function handleOtpChange(i: number, val: string) {
    const digit = val.replace(/\D/g,"").slice(-1);
    const next = [...otp]; next[i] = digit; setOtp(next); setOtpError("");
    if (digit && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
  }
  function handleOtpKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[i] && i > 0) document.getElementById(`otp-${i-1}`)?.focus();
  }

  const inp: React.CSSProperties = {
    width:"100%", padding:"12px 15px", borderRadius:11,
    border:"1.5px solid rgba(255,255,255,.1)",
    background:"rgba(255,255,255,.05)", color:"white",
    fontSize:13, outline:"none", fontFamily:"inherit", transition:"border-color .2s",
  };
  const lbl: React.CSSProperties = {
    fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)",
    letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:6,
  };

  const REASSURANCE = ["Auto-renewal billing", "Cancel anytime", "Secure hosted checkout", "Instant activation"];

  /* ── Yearly savings ── */
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#06091c 0%,#0b0f28 45%,#07091e 100%)", color:"white", fontFamily:"'Outfit','DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes celebBounce{0%{transform:scale(.5) rotate(-10deg);opacity:0}60%{transform:scale(1.15) rotate(3deg);opacity:1}80%{transform:scale(.95) rotate(-1deg)}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes celebFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes celebRing{0%{transform:scale(.8);opacity:0}100%{transform:scale(2.2);opacity:0}}
        @keyframes confDrop{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(80px) rotate(360deg);opacity:0}}
        @keyframes celebSlide{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .45s ease both}
        input::placeholder{color:rgba(255,255,255,.2)}
        input:focus,select:focus{border-color:rgba(99,102,241,.7)!important;box-shadow:0 0 0 3px rgba(99,102,241,.12)}
        select option{background:#1e293b;color:white}
        .pay-meth-row{transition:all .18s;cursor:pointer}
        .pay-meth-row:hover{border-color:rgba(255,255,255,.18)!important;background:rgba(255,255,255,.05)!important}
        .cycle-btn{transition:all .2s}
        .cycle-btn.active{background:rgba(255,255,255,.12)!important;color:white!important}
        @media(max-width:900px){
          .pay-header{padding:12px 16px!important}
          .pay-main{padding:24px 14px 60px!important}
          .pay-grid{grid-template-columns:1fr!important}
          .pay-steps{display:none!important}
        }
        @media(max-width:600px){
          .pay-perks{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* BG grid */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)", backgroundSize:"52px 52px" }}/>
      {/* BG orbs */}
      <div style={{ position:"fixed", top:"-15%", left:"-10%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.1) 0%,transparent 65%)", pointerEvents:"none", zIndex:0 }}/>
      <div style={{ position:"fixed", bottom:"-10%", right:"-5%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(168,85,247,.08) 0%,transparent 65%)", pointerEvents:"none", zIndex:0 }}/>

      {/* ── Header ── */}
      <header style={{ position:"sticky", top:0, zIndex:50, borderBottom:"1px solid rgba(255,255,255,.07)", background:"rgba(6,9,28,.92)", backdropFilter:"blur(20px)" }}>
        <div className="pay-header" style={{ maxWidth:860, margin:"0 auto", padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(99,102,241,.4)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <span style={{ fontSize:17, fontWeight:700, letterSpacing:"-.3px" }}>FinovaOS</span>
          </div>
          <div className="pay-steps"><Steps current={step} finalLabel={pendingRealPayment ? "Checkout" : "Done"} /></div>
          <button onClick={() => step===1 ? router.back() : setStep(1)}
            style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.45)", padding:"7px 14px", borderRadius:9, border:"1.5px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)", cursor:"pointer", fontFamily:"inherit" }}>
            ← Back
          </button>
        </div>
      </header>

      <main className="pay-main" style={{ position:"relative", zIndex:1, maxWidth:860, margin:"0 auto", padding:"36px 28px 80px" }}>

        {/* ═══ STEP 1: Payment ═══ */}
        {step === 1 && (
          <div className="fu" style={{ display:"flex", flexDirection:"column", gap:20 }}>

            {/* Quick Confirm card — shown when adding addon with an existing active subscription */}
            {plan === "addon-automation" && activePlanName && savedPayMethod && (
              <div style={{ borderRadius:16, background:"linear-gradient(135deg,rgba(124,58,237,.18),rgba(37,99,235,.12))", border:"1px solid rgba(124,58,237,.4)", overflow:"hidden", marginBottom:4 }}>
                <div style={{ height:3, background:"linear-gradient(90deg,#7c3aed,#2563eb,#a78bfa)" }} />
                <div style={{ padding:"22px 24px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <span style={{ fontSize:20 }}>✅</span>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, color:"white" }}>Active {activePlanName} subscription detected</div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginTop:2 }}>You can add the Automation Add-on with one click — no re-entry needed</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:12, background:"rgba(0,0,0,.25)", border:"1px solid rgba(255,255,255,.08)", marginBottom:16 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:`${savedPayMethod.processorColor}22`, border:`1px solid ${savedPayMethod.processorColor}44`, display:"flex", alignItems:"center", justifyContent:"center", color:savedPayMethod.processorColor, flexShrink:0 }}>
                      {allAvailableMethods.find(m => m.id === savedPayMethod.type)?.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14, color:"white" }}>{savedPayMethod.label}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:1 }}>Saved from your {activePlanName} plan</div>
                    </div>
                    <span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(34,197,94,.12)", border:"1px solid rgba(34,197,94,.25)", color:"#22c55e", fontSize:11, fontWeight:700 }}>Saved</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.6)" }}>
                      Adding <strong style={{ color:"white" }}>Automation Add-on</strong> — <strong style={{ color:"#a78bfa" }}>$79/month</strong>
                    </div>
                    <button
                      onClick={activatePlanDirect}
                      disabled={activating}
                      style={{ padding:"11px 28px", borderRadius:11, background:"linear-gradient(135deg,#7c3aed,#2563eb)", color:"white", fontSize:14, fontWeight:700, border:"none", cursor:activating ? "not-allowed" : "pointer", opacity:activating ? .7 : 1, fontFamily:"inherit" }}
                    >
                      {activating ? "Confirming…" : "Confirm & Add — $79/mo →"}
                    </button>
                  </div>
                  <div style={{ marginTop:12, fontSize:11, color:"rgba(255,255,255,.3)", borderTop:"1px solid rgba(255,255,255,.06)", paddingTop:10 }}>
                    Or scroll down to choose a different payment method
                  </div>
                </div>
              </div>
            )}

            {/* Title */}
            <div style={{ marginBottom:4 }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"4px 12px", borderRadius:20, background:"rgba(99,102,241,.1)", border:"1.5px solid rgba(99,102,241,.25)", fontSize:10, fontWeight:700, color:"#a5b4fc", letterSpacing:".08em", textTransform:"uppercase", marginBottom:12 }}>
                🔒 Secure Checkout
              </div>
              <h1 style={{ margin:"0 0 6px", fontSize:26, fontWeight:800, letterSpacing:"-0.8px" }}>Complete Your Payment</h1>
              <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,.4)" }}>Choose how you&apos;d like to pay — you&apos;ll finish securely on our payment partner&apos;s page</p>
              <div style={{ marginTop:10, display:"inline-flex", alignItems:"center", gap:8, padding:"5px 12px", borderRadius:999, border:"1px solid rgba(56,189,248,.22)", background:"rgba(56,189,248,.08)", color:"#7dd3fc", fontSize:11, fontWeight:700 }}>
                {currency} · {country}
              </div>
            </div>

            <div className="pay-grid" style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20, alignItems:"start" }}>

              {/* LEFT: method selector + explainer */}
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                {/* ── Method Groups ── */}
                <div style={{ borderRadius:18, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", padding:"20px 20px 14px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:16 }}>Select Payment Method</div>

                  {availableGroups.map((group, gi) => (
                    <div key={group.label} style={{ marginBottom: gi < availableGroups.length - 1 ? 20 : 4 }}>
                      {/* Group header */}
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                        <div style={{ padding:"4px 11px", borderRadius:99, background:group.bg, border:`1px solid ${group.border}`, fontSize:10, fontWeight:700, color:group.color, letterSpacing:".04em", whiteSpace:"nowrap" }}>
                          {group.label === "International" ? "🌍" : "🇵🇰"} {group.label}
                        </div>
                        <div style={{ flex:1, height:1, background:"rgba(255,255,255,.06)" }}/>
                      </div>

                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {group.methods.map(m => (
                          <div key={m.id}
                            className="pay-meth-row"
                            onClick={() => setMethod(m.id)}
                            style={{
                              display:"flex", alignItems:"center", gap:13, padding:"13px 15px",
                              borderRadius:13,
                              border:`1.5px solid ${method===m.id ? "rgba(99,102,241,.55)" : "rgba(255,255,255,.07)"}`,
                              background: method===m.id ? "rgba(99,102,241,.07)" : "rgba(255,255,255,.02)",
                              position:"relative",
                            }}>
                            {/* Radio */}
                            <div style={{
                              width:19, height:19, borderRadius:"50%", flexShrink:0,
                              border:`2px solid ${method===m.id ? "#6366f1" : "rgba(255,255,255,.18)"}`,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              background: method===m.id ? "rgba(99,102,241,.15)" : "transparent",
                              transition:"all .18s",
                            }}>
                              {method===m.id && <div style={{ width:9, height:9, borderRadius:"50%", background:"#6366f1" }}/>}
                            </div>
                            {/* Icon */}
                            <div style={{
                              width:40, height:40, borderRadius:11, flexShrink:0,
                              background: method===m.id ? `${m.processorColor}18` : "rgba(255,255,255,.04)",
                              border:`1px solid ${method===m.id ? `${m.processorColor}35` : "rgba(255,255,255,.07)"}`,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              color: method===m.id ? m.processorColor : "rgba(255,255,255,.4)",
                              transition:"all .18s",
                            }}>
                              {m.icon}
                            </div>
                            {/* Label + desc */}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:700, color:method===m.id?"white":"rgba(255,255,255,.82)", lineHeight:1.2 }}>{m.label}</div>
                              <div style={{ fontSize:11, color:"rgba(255,255,255,.32)", marginTop:3 }}>{m.desc}</div>
                            </div>
                            {/* Badge */}
                            {m.popular && (
                              <div style={{ padding:"2px 9px", borderRadius:8, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", fontSize:9, fontWeight:800, color:"white", letterSpacing:".05em", whiteSpace:"nowrap", flexShrink:0 }}>POPULAR</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── How it works (unified — all methods redirect to a secure hosted checkout) ── */}
                <div style={{ borderRadius:18, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", padding:"20px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:16 }}>
                    Payment Details
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", borderRadius:14, background:`${selectedMethodDef?.processorColor}10`, border:`1px solid ${selectedMethodDef?.processorColor}30` }}>
                      <div style={{ width:48, height:48, borderRadius:14, background:`${selectedMethodDef?.processorColor}18`, border:`1px solid ${selectedMethodDef?.processorColor}40`, display:"flex", alignItems:"center", justifyContent:"center", color:selectedMethodDef?.processorColor, flexShrink:0 }}>
                        {selectedMethodDef?.icon}
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:"white", marginBottom:3 }}>Pay with {selectedMethodDef?.label}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", lineHeight:1.55 }}>
                          You&apos;ll enter your details on our secure checkout page — nothing is stored here.
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      {REASSURANCE.map(t=>(
                        <div key={t} style={{ display:"flex", alignItems:"center", gap:7, fontSize:11, color:"rgba(255,255,255,.55)", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:9, padding:"8px 11px" }}>
                          <span style={{ color:selectedMethodDef?.processorColor, flexShrink:0 }}>✓</span>{t}
                        </div>
                      ))}
                    </div>
                    <div>
                      <label style={lbl}>Email for Receipt</label>
                      <input value={verificationEmail} onChange={e=>!isVerificationEmailLocked && setEmail(e.target.value)} readOnly={isVerificationEmailLocked} placeholder="you@example.com" type="email" style={{...inp, opacity:isVerificationEmailLocked ? 0.78 : 1, cursor:isVerificationEmailLocked ? "not-allowed" : "text"}}/>
                    </div>
                  </div>
                </div>

                {/* Error */}
                {otpError && step===1 && (
                  <div style={{ padding:"10px 16px", borderRadius:10, background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", color:"#fca5a5", fontSize:12 }}>{otpError}</div>
                )}

                {/* Trust row above submit */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:18, padding:"10px 0 2px", fontSize:11, color:"rgba(255,255,255,.28)" }}>
                  <span style={{ display:"flex", alignItems:"center", gap:5 }}>🔒 SSL Encrypted</span>
                  <span style={{ width:3, height:3, borderRadius:"50%", background:"rgba(255,255,255,.15)", display:"inline-block" }}/>
                  <span>No card stored here</span>
                  <span style={{ width:3, height:3, borderRadius:"50%", background:"rgba(255,255,255,.15)", display:"inline-block" }}/>
                  <span>Cancel anytime</span>
                </div>

                {/* Submit */}
                <button onClick={handlePaymentSubmit} disabled={processing||activating||allAvailableMethods.length===0}
                  style={{
                    width:"100%", padding:"16px", borderRadius:14, border:"none",
                    background:(processing||activating||allAvailableMethods.length===0) ? "rgba(255,255,255,.06)" : `linear-gradient(135deg,${meta.gradientFrom},${meta.gradientTo})`,
                    color:(processing||activating||allAvailableMethods.length===0) ? "rgba(255,255,255,.3)" : "white",
                    fontSize:15, fontWeight:800, cursor:(processing||activating||allAvailableMethods.length===0)?"not-allowed":"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                    fontFamily:"inherit", boxShadow:(processing||activating||allAvailableMethods.length===0)?"none":`0 8px 28px ${meta.glow}`,
                    transition:"all .3s",
                  }}>
                  {(processing||activating) ? (
                    <><svg width="18" height="18" viewBox="0 0 24 24" style={{ animation:"spin 1s linear infinite" }}><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" strokeDasharray="60" strokeDashoffset="20"/></svg> Processing…</>
                  ) : (
                    <>🔒 Proceed &amp; Verify →</>
                  )}
                </button>
              </div>

              {/* ── RIGHT: Order Summary ── */}
              <div style={{ borderRadius:18, background:"rgba(255,255,255,.03)", border:`1.5px solid ${meta.border}`, padding:"22px 20px", position:"sticky", top:100 }}>
                {/* Plan color bar */}
                <div style={{ height:3, background:`linear-gradient(90deg,${meta.gradientFrom},${meta.gradientTo})`, borderRadius:2, marginBottom:20, marginTop:-22, marginLeft:-20, marginRight:-20 }}/>

                {/* Plan info */}
                <div style={{ textAlign:"center", marginBottom:20 }}>
                  <div style={{ fontSize:28, marginBottom:6 }}>{meta.icon}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:"white" }}>{meta.name}</div>
                  {couponApplied && (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:8 }}>
                      <span style={{ fontSize:13, color:"rgba(255,255,255,.35)", textDecoration:"line-through" }}>{displayPlanPrice}/{billingCycle==="yearly"?"yr":"mo"}</span>
                      <span style={{ padding:"2px 8px", borderRadius:6, background:"rgba(249,115,22,.18)", border:"1px solid rgba(249,115,22,.4)", fontSize:10, fontWeight:800, color:"#fb923c" }}>Coupon applied</span>
                    </div>
                  )}
                  <div style={{ fontSize:26, fontWeight:900, color:meta.color, marginTop:4, lineHeight:1 }}>
                    {displayFinalPrice}
                    <span style={{ fontSize:12, fontWeight:500, color:"rgba(255,255,255,.35)" }}> today</span>
                  </div>
                  {couponApplied && plan !== "custom" && (
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.38)", marginTop:5 }}>Then {displayPlanPrice}/{billingCycle==="yearly"?"yr":"mo"}</div>
                  )}
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.28)", marginTop:4 }}>Billing in {currency}</div>
                </div>

                {/* Billing cycle toggle */}
                {plan !== "custom" && (
                  <div style={{ marginBottom:18 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:8 }}>Billing Cycle</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5, padding:4, borderRadius:12, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.07)" }}>
                      {(["monthly","yearly"] as const).map(c => (
                        <button key={c} className={`cycle-btn${billingCycle===c?" active":""}`} onClick={() => setBillingCycle(c)}
                          style={{ padding:"8px 6px", borderRadius:9, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit",
                            background: billingCycle===c ? "rgba(255,255,255,.12)" : "transparent",
                            color: billingCycle===c ? "white" : "rgba(255,255,255,.35)",
                          }}>
                          {c==="monthly" ? "Monthly" : "Yearly"}
                          {c==="yearly" && <div style={{ fontSize:9, fontWeight:600, color:billingCycle==="yearly"?"#6ee7b7":"rgba(52,211,153,.5)", marginTop:1 }}>Save 20%</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary rows */}
                {[
                  { label:"Plan",         value: meta.name },
                  { label:"Billing",      value: billingCycle==="yearly" ? "Yearly" : "Monthly" },
                  { label:"Next renewal", value: billingCycle==="yearly" ? "12 months" : "30 days" },
                  { label:"Trial period", value: "—" },
                ].map(r => (
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,.05)", fontSize:12 }}>
                    <span style={{ color:"rgba(255,255,255,.35)" }}>{r.label}</span>
                    <span style={{ color:"white", fontWeight:700 }}>{r.value}</span>
                  </div>
                ))}

                {/* Coupon */}
                <div style={{ paddingTop:14 }}>
                  {couponApplied ? (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", borderRadius:9, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.2)", fontSize:12 }}>
                      <span style={{ color:"#34d399", fontWeight:700 }}>🎟 {couponApplied.code} — {couponApplied.type==="percent"?`${couponApplied.value}% off`:`$${couponApplied.value} off`}</span>
                      <button onClick={() => setCouponApplied(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,.35)", cursor:"pointer", fontSize:16, lineHeight:1 }}>×</button>
                    </div>
                  ) : (
                    <div style={{ display:"flex", gap:7 }}>
                      <input value={couponInput} onChange={e=>{setCouponInput(e.target.value.toUpperCase());setCouponError("");}} onKeyDown={e=>e.key==="Enter"&&applyCoupon()}
                        placeholder="Coupon code" style={{ flex:1, padding:"9px 12px", borderRadius:9, background:"rgba(255,255,255,.05)", border:`1px solid ${couponError?"rgba(248,113,113,.4)":"rgba(255,255,255,.1)"}`, color:"white", fontSize:12, fontFamily:"inherit", outline:"none", letterSpacing:1 }}/>
                      <button onClick={applyCoupon} disabled={couponLoading||!couponInput.trim()} style={{ padding:"9px 12px", borderRadius:9, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.3)", color:"#a5b4fc", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                        {couponLoading?"…":"Apply"}
                      </button>
                    </div>
                  )}
                  {couponError && <div style={{ fontSize:11, color:"#f87171", marginTop:5 }}>{couponError}</div>}
                </div>

                {/* Total */}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"14px 0 0", fontSize:14, fontWeight:800 }}>
                  <div>
                    <div style={{ color:"rgba(255,255,255,.6)" }}>Total today</div>
                    {couponApplied && <div style={{ fontSize:10, fontWeight:500, color:"rgba(249,115,22,.7)", marginTop:2 }}>Coupon applied</div>}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    {couponApplied && <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", textDecoration:"line-through", fontWeight:400 }}>{displayPlanPrice}</div>}
                    <span style={{ color:meta.color }}>{displayFinalPrice}</span>
                  </div>
                </div>

                <div style={{ marginTop:16, padding:"11px 14px", borderRadius:12, background:"rgba(16,185,129,.07)", border:"1px solid rgba(16,185,129,.18)", display:"flex", alignItems:"center", gap:8, fontSize:11, color:"#6ee7b7" }}>
                  🔒 256-bit SSL encrypted checkout
                </div>

                {/* We accept */}
                <div style={{ marginTop:14, padding:"13px 14px", borderRadius:12, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.28)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>We accept</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {(isPakistan
                      ? [
                          { label:"Visa",        color:"#1a1f71" },
                          { label:"Mastercard",  color:"#eb001b" },
                        ]
                      : [
                          { label:"Visa",        color:"#1a1f71" },
                          { label:"Mastercard",  color:"#eb001b" },
                          { label:"PayPal",      color:"#003087" },
                          { label:"Apple Pay",   color:"#a3a3a3" },
                          { label:"Google Pay",  color:"#4285F4" },
                        ]
                    ).map(p => (
                      <div key={p.label} style={{ padding:"3px 10px", borderRadius:7, background:`${p.color}18`, border:`1px solid ${p.color}30`, fontSize:10, fontWeight:700, color:`${p.color}cc`, letterSpacing:".03em" }}>{p.label}</div>
                    ))}
                  </div>
                </div>

                {/* Subscription features */}
                <div style={{ marginTop:10, padding:"13px 14px 12px", borderRadius:12, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.28)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:9 }}>Included in all plans</div>
                  <div style={{ display:"grid", gap:7 }}>
                    {["Auto-renewal","Cancel anytime","Upgrade / Downgrade","Invoices & history","Dedicated support"].map(item => (
                      <div key={item} style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, color:"rgba(255,255,255,.55)" }}>
                        <span style={{ color:meta.color, fontWeight:800, fontSize:12 }}>✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: OTP Verification ═══ */}
        {step === 2 && (
          <div className="fu" style={{ maxWidth:460, margin:"0 auto", textAlign:"center" }}>
            <div style={{ width:80, height:80, borderRadius:24, background:"rgba(99,102,241,.12)", border:"1.5px solid rgba(99,102,241,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:38, margin:"0 auto 24px" }}>🔐</div>
            <h2 style={{ margin:"0 0 8px", fontSize:26, fontWeight:800, letterSpacing:"-0.5px" }}>Verify Your Payment</h2>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.7, marginBottom:24 }}>
              We&apos;ve sent a 6-digit verification code to confirm your payment.
            </p>
            <div style={{ marginBottom:24, padding:"14px 18px", borderRadius:12, background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", fontSize:13, color:"rgba(255,255,255,.6)", lineHeight:1.6 }}>
              Code sent to <strong style={{ color:"white" }}>{verificationEmail}</strong>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:20 }}>
              {otp.map((digit, i) => (
                <input key={i} id={`otp-${i}`} value={digit}
                  onChange={e=>handleOtpChange(i,e.target.value)}
                  onKeyDown={e=>handleOtpKey(i,e)}
                  maxLength={1} inputMode="numeric"
                  style={{ width:52, height:60, borderRadius:14, textAlign:"center", fontSize:24, fontWeight:800, fontFamily:"monospace",
                    background:digit?"rgba(99,102,241,.15)":"rgba(255,255,255,.05)",
                    border:`2px solid ${digit?"rgba(99,102,241,.7)":"rgba(255,255,255,.1)"}`,
                    color:"white", outline:"none", transition:"all .2s" }}
                />
              ))}
            </div>
            {otpError && <div style={{ marginBottom:16, padding:"10px 16px", borderRadius:10, background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", color:"#fca5a5", fontSize:12 }}>{otpError}</div>}
            <button onClick={handleVerify} disabled={activating}
              style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", background:activating?"rgba(255,255,255,.06)":"linear-gradient(135deg,#6366f1,#7c3aed)", color:activating?"rgba(255,255,255,.3)":"white", fontSize:15, fontWeight:800, cursor:activating?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontFamily:"inherit", boxShadow:activating?"none":"0 6px 28px rgba(99,102,241,.4)" }}>
              {activating ? (
                <><svg width="18" height="18" viewBox="0 0 24 24" style={{ animation:"spin 1s linear infinite" }}><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" strokeDasharray="60" strokeDashoffset="20"/></svg> Activating Plan…</>
              ) : <>✓ Verify &amp; Activate Plan</>}
            </button>
            <div style={{ marginTop:12, display:"flex", alignItems:"center", justifyContent:"center", gap:16 }}>
              <button onClick={() => setStep(1)} style={{ background:"none", border:"none", color:"rgba(255,255,255,.35)", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>← Change payment method</button>
              <span style={{ color:"rgba(255,255,255,.15)" }}>|</span>
              <button onClick={handleResendOtp} style={{ background:"none", border:"none", color:"rgba(129,140,248,.7)", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>Resend code</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Success ═══ */}
        {step === 3 && (() => {
          const pm = PLAN_META[plan] || PLAN_META.starter;
          const perks: Record<string,string[]> = {
            starter:      ["Sales & Purchase Invoicing","Inventory Management","Ledger & Trial Balance","Basic Financial Reports","Up to 5 users"],
            pro:          ["Everything in Starter","CRM & Pipeline","HR & Payroll","Advanced Reports","Multi-Branch","Up to 25 users"],
            professional: ["Everything in Starter","CRM & Pipeline","HR & Payroll","Advanced Reports","Multi-Branch","Up to 25 users"],
            enterprise:   ["Everything in Pro","API Access & SSO","White-Label Option","24/7 Priority Support","Unlimited users","Dedicated Onboarding"],
            custom:       ["Modules you selected","Pay per feature","No bloat","Cancel anytime"],
          };
          const planPerks = perks[plan] || perks.starter;
          return (
            <div style={{ maxWidth:500, margin:"0 auto", textAlign:"center" }}>
              <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
                {[...Array(18)].map((_,i) => (
                  <div key={i} style={{ position:"absolute", left:`${8+i*5}%`, top:`${10+Math.sin(i)*20}%`, width:8, height:8, borderRadius:i%3===0?"50%":i%3===1?2:"1px 4px", background:["#6366f1","#34d399","#fbbf24","#f87171","#38bdf8","#a78bfa"][i%6], animation:`confDrop ${1.2+i*0.12}s ease ${i*0.08}s forwards`, opacity:0 }}/>
                ))}
              </div>
              <div style={{ position:"relative", width:140, height:140, margin:"0 auto 28px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`2px solid ${pm.color}`, opacity:0, animation:"celebRing 1.8s ease .3s infinite" }}/>
                <div style={{ position:"absolute", inset:10, borderRadius:"50%", border:`1.5px solid ${pm.color}`, opacity:0, animation:"celebRing 1.8s ease .7s infinite" }}/>
                <div style={{ position:"absolute", inset:14, borderRadius:"50%", background:`radial-gradient(circle, ${pm.dim} 0%, transparent 70%)` }}/>
                <div style={{ width:90, height:90, borderRadius:"50%", background:`linear-gradient(135deg, ${pm.gradientFrom}, ${pm.gradientTo})`, border:`2px solid ${pm.border}`, boxShadow:`0 0 40px ${pm.glow}, 0 0 80px ${pm.dim}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40, animation:"celebBounce .8s cubic-bezier(.34,1.56,.64,1) both, celebFloat 3s ease 1s infinite" }}>
                  {pm.icon}
                </div>
              </div>
              <div style={{ animation:"celebSlide .5s ease .3s both" }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:2, color:pm.color, marginBottom:8 }}>Welcome to FinovaOS</div>
                {pendingRealPayment ? (
                  <>
                    <h2 style={{ margin:"0 0 6px", fontSize:32, fontWeight:900, background:`linear-gradient(135deg, white 30%, ${pm.color})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Almost there…</h2>
                    <p style={{ fontSize:14, color:"rgba(255,255,255,.45)", margin:"0 0 28px" }}>Taking you to secure checkout to complete your {pm.name} subscription. Nothing is active yet until payment goes through.</p>
                  </>
                ) : (
                  <>
                    <h2 style={{ margin:"0 0 6px", fontSize:32, fontWeight:900, background:`linear-gradient(135deg, white 30%, ${pm.color})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{pm.name} Activated!</h2>
                    <p style={{ fontSize:14, color:"rgba(255,255,255,.45)", margin:"0 0 28px" }}>Your account is ready. Taking you to your dashboard…</p>
                  </>
                )}
              </div>
              <div style={{ background:"rgba(255,255,255,.04)", border:`1px solid ${pm.border}`, borderRadius:16, padding:"20px 24px", marginBottom:28, textAlign:"left", animation:"celebSlide .5s ease .5s both", opacity:0 }}>
                <div style={{ fontSize:11, fontWeight:700, color:pm.color, textTransform:"uppercase", letterSpacing:1, marginBottom:14 }}>What&apos;s included</div>
                <div className="pay-perks" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px" }}>
                  {planPerks.map(perk => (
                    <div key={perk} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"rgba(255,255,255,.7)" }}>
                      <div style={{ width:16, height:16, borderRadius:"50%", background:`${pm.color}20`, border:`1px solid ${pm.color}40`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke={pm.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      {perk}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, animation:"celebSlide .5s ease .7s both", opacity:0 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:pm.color, animation:`pulse2 1s ease ${i*0.2}s infinite`, boxShadow:`0 0 8px ${pm.glow}` }}/>
                ))}
              </div>
            </div>
          );
        })()}

      </main>
    </div>
  );
}
