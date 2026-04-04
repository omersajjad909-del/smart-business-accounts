"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { getCurrentUser, setCurrentUser } from "@/lib/auth";
import { FX_USD, formatFromUSD } from "@/lib/currency";
import { getStoredCurrencyPreference, setStoredCurrencyPreference } from "@/lib/currencyPreference";

/* ── Plan meta ──────────────────────────────────────────── */
const PLAN_META: Record<string, { name: string; price: number; yearlyPrice: number; color: string; glow: string; dim: string; border: string; gradientFrom: string; gradientTo: string; icon: string }> = {
  starter:      { name: "Starter",      price: 49,  yearlyPrice: 470,  icon: "🌱", color: "#818cf8", glow: "rgba(129,140,248,.35)", dim: "rgba(129,140,248,.1)",  border: "rgba(129,140,248,.3)",  gradientFrom: "#6366f1", gradientTo: "#4f46e5" },
  pro:          { name: "Professional", price: 99,  yearlyPrice: 950,  icon: "🚀", color: "#34d399", glow: "rgba(52,211,153,.35)",  dim: "rgba(52,211,153,.1)",   border: "rgba(52,211,153,.3)",   gradientFrom: "#10b981", gradientTo: "#059669" },
  professional: { name: "Professional", price: 99,  yearlyPrice: 950,  icon: "🚀", color: "#34d399", glow: "rgba(52,211,153,.35)",  dim: "rgba(52,211,153,.1)",   border: "rgba(52,211,153,.3)",   gradientFrom: "#10b981", gradientTo: "#059669" },
  enterprise:   { name: "Enterprise",   price: 249, yearlyPrice: 2390, icon: "💎", color: "#fbbf24", glow: "rgba(251,191,36,.35)",  dim: "rgba(251,191,36,.1)",   border: "rgba(251,191,36,.3)",   gradientFrom: "#f59e0b", gradientTo: "#d97706" },
  custom:       { name: "Custom",       price: 0,   yearlyPrice: 0,    icon: "⚡", color: "#38bdf8", glow: "rgba(56,189,248,.35)",  dim: "rgba(56,189,248,.1)",   border: "rgba(56,189,248,.3)",   gradientFrom: "#0ea5e9", gradientTo: "#0284c7" },
};

/* ── Payment method types ───────────────────────────────── */
type PayMethod = "card" | "paypal" | "applepay" | "googlepay" | "bank" | "ach" | "sepa" | "jazzcash" | "easypaisa" | "crypto" | "klarna";

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
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="3"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);
const IconPayPal = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M7.02 21H3.64l.92-5.86H7.7c2.27 0 3.6-1.12 3.98-3.36.38-2.24-.8-3.36-3.07-3.36H5.5L7.16 3h3.11c3.55 0 5.5 1.73 4.9 5.16C14.5 11.5 12.1 13.5 8.7 13.5H6.38l-.46 2.97-.85 4.53H7.02z" fill="#009cde"/>
    <path d="M19.5 8c-.38 2.18-1.68 3.72-3.5 4.32.77 1.7 3.5 4.68 3.5 4.68" fill="#003087" opacity=".5"/>
  </svg>
);
const IconApplePay = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);
const IconGooglePay = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M3.67 8.67C4.9 5.4 8.2 3 12 3c2.3 0 4.3.8 5.87 2.07L15.4 7.53C14.47 6.87 13.28 6.5 12 6.5c-2.35 0-4.35 1.42-5.3 3.47L3.67 8.67z" fill="#EA4335"/>
    <path d="M3 12c0-.46.04-.9.1-1.33L6.7 9.97C6.57 10.63 6.5 11.3 6.5 12s.07 1.37.2 2.03L3.1 13.33C3.04 12.9 3 12.46 3 12z" fill="#FBBC05"/>
    <path d="M12 21c-3.8 0-7.1-2.4-8.33-5.67l3.03-1.3C7.65 16.08 9.65 17.5 12 17.5c1.28 0 2.47-.37 3.4-1.03l2.47 2.47C15.87 20.2 14.03 21 12 21z" fill="#34A853"/>
    <path d="M21 12c0-.67-.08-1.3-.2-1.92H12v3.67h5.07c-.22 1.2-.88 2.2-1.87 2.87l2.47 2.47C19.7 17.6 21 15 21 12z" fill="#4285F4"/>
  </svg>
);
const IconBank = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 22 18 0"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/>
    <path d="m2 11 10-7 10 7"/>
  </svg>
);
const IconAch = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 12h5"/><path d="M6 9h8"/><path d="M15 15l2-2 2 2"/>
  </svg>
);
const IconSepa = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><path d="M8 10h8"/><path d="M8 14h6"/><path d="M16.5 7.5h.01"/>
  </svg>
);
const IconJazz = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/><path d="M8 6h8"/><path d="M8 10h8"/>
  </svg>
);
const IconCrypto = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893L4.645 9.15m7.533 1.033-.346 1.97m-7.55-4.07 4.44.78"/>
  </svg>
);
const IconKlarna = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6v6l4 2"/>
  </svg>
);

/* ── Method groups ──────────────────────────────────────── */
type MethodGroup = { label: string; color: string; bg: string; border: string; badge: string; methods: MethodDef[] };

const METHOD_GROUPS: MethodGroup[] = [
  {
    label: "LemonSqueezy",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.06)",
    border: "rgba(251,191,36,0.2)",
    badge: "Global · Instant",
    methods: [
      { id: "card",      label: "Credit / Debit Card",  desc: "Visa, Mastercard, Amex, Discover", popular: true, processor: "LemonSqueezy", processorColor: "#fbbf24", icon: <IconCard /> },
      { id: "paypal",    label: "PayPal",                desc: "Pay with your PayPal balance",                    processor: "LemonSqueezy", processorColor: "#fbbf24", icon: <IconPayPal /> },
      { id: "applepay",  label: "Apple Pay",             desc: "Touch ID / Face ID checkout",                     processor: "LemonSqueezy", processorColor: "#fbbf24", icon: <IconApplePay /> },
      { id: "googlepay", label: "Google Pay",            desc: "One-tap payment",                                  processor: "LemonSqueezy", processorColor: "#fbbf24", icon: <IconGooglePay /> },
    ],
  },
  {
    label: "Wise",
    color: "#34d399",
    bg: "rgba(52,211,153,0.06)",
    border: "rgba(52,211,153,0.2)",
    badge: "Bank Transfer",
    methods: [
      { id: "bank", label: "Bank Transfer via Wise", desc: "Local bank rates, fast settlement", processor: "Wise", processorColor: "#34d399", icon: <IconBank /> },
      { id: "ach", label: "ACH Transfer", desc: "US bank debit / account transfer", processor: "Wise", processorColor: "#34d399", icon: <IconAch /> },
      { id: "sepa", label: "SEPA Transfer", desc: "European bank transfer", processor: "Wise", processorColor: "#34d399", icon: <IconSepa /> },
    ],
  },
  {
    label: "Pakistan",
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.06)",
    border: "rgba(56,189,248,0.2)",
    badge: "Local Wallets 🇵🇰",
    methods: [
      { id: "jazzcash",  label: "JazzCash",   desc: "Pakistan mobile wallet",  processor: "JazzCash",  processorColor: "#38bdf8", icon: <IconJazz /> },
      { id: "easypaisa", label: "Easypaisa",  desc: "Pakistan mobile wallet",  processor: "Easypaisa", processorColor: "#38bdf8", icon: <IconJazz /> },
    ],
  },
  {
    label: "More Methods",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.06)",
    border: "rgba(167,139,250,0.2)",
    badge: "Crypto & BNPL",
    methods: [
      { id: "crypto",  label: "Cryptocurrency", desc: "Bitcoin, Ethereum, USDT, SOL",   processor: "Self-custody", processorColor: "#a78bfa", icon: <IconCrypto /> },
      { id: "klarna",  label: "Klarna / BNPL",  desc: "Buy now, pay later in 4x",       processor: "Klarna",       processorColor: "#a78bfa", icon: <IconKlarna /> },
    ],
  },
];

/* ── Helpers ────────────────────────────────────────────── */
function fmt4(v: string) { return v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim(); }
function fmtExp(v: string) { const d = v.replace(/\D/g,"").slice(0,4); return d.length>2?d.slice(0,2)+"/"+d.slice(2):d; }
function detectBrand(n: string) {
  const s = n.replace(/\s/g,"");
  if (/^4/.test(s))    return { label:"VISA",       grad:"linear-gradient(135deg,#1a1f71,#1e3a8a)" };
  if (/^5[1-5]/.test(s)) return { label:"MASTERCARD", grad:"linear-gradient(135deg,#2d1b69,#c2185b)" };
  if (/^3[47]/.test(s))  return { label:"AMEX",       grad:"linear-gradient(135deg,#1a3c5e,#0277bd)" };
  if (/^6/.test(s))    return { label:"DISCOVER",    grad:"linear-gradient(135deg,#7c3102,#f76f20)" };
  return { label:"CARD", grad:"linear-gradient(135deg,#312e81,#4f46e5)" };
}

/* ── Step indicator ─────────────────────────────────────── */
function Steps({ current }: { current: 1|2|3 }) {
  const steps = [{ n:1, label:"Payment" }, { n:2, label:"Verify" }, { n:3, label:"Done" }];
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

  const [billingCycle, setBillingCycle] = useState<"monthly"|"yearly">(urlCycle);
  const [currency, setCurrency] = useState<string>(searchParams.get("currency") || "USD");
  const [country,  setCountry]  = useState<string>(searchParams.get("country")  || "US");
  const [rates,    setRates]    = useState<Record<string, number> | null>(null);

  const planPrice =
    plan === "custom"
      ? (Number.isFinite(queryPrice) && queryPrice > 0 ? queryPrice : 0)
      : billingCycle === "yearly"
        ? meta.yearlyPrice
        : meta.price;

  /* ── Form state ── */
  const [step,        setStep]        = useState<1|2|3>(1);
  const [method,      setMethod]      = useState<PayMethod>("card");
  const [cardNumber,  setCardNumber]  = useState("");
  const [expiry,      setExpiry]      = useState("");
  const [cvc,         setCvc]         = useState("");
  const [holder,      setHolder]      = useState("");
  const [email,       setEmail]       = useState("");
  const [lockedVerificationEmail, setLockedVerificationEmail] = useState("");
  const [bankName,    setBankName]    = useState("");
  const [accountNo,   setAccountNo]   = useState("");
  const [phone,       setPhone]       = useState("");
  const [walletId,    setWalletId]    = useState("");
  const [cryptoAddr,  setCryptoAddr]  = useState("");
  const [coin,        setCoin]        = useState("BTC");
  const [otp,         setOtp]         = useState(["","","","","",""]);
  const [processing,  setProcessing]  = useState(false);
  const [activating,  setActivating]  = useState(false);
  const [otpError,    setOtpError]    = useState("");

  /* Coupon */
  const [couponInput,    setCouponInput]    = useState("");
  const [couponApplied,  setCouponApplied]  = useState<{ code: string; type: string; value: number } | null>(null);
  const [couponError,    setCouponError]    = useState("");
  const [couponLoading,  setCouponLoading]  = useState(false);

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
    })();
  }, [searchParams]);

  useEffect(() => {
    if (currency) setStoredCurrencyPreference(currency, country);
  }, [currency, country]);

  // 75% off for first 3 months — today's charge is 25% of full price
  const discountedPrice  = plan === "custom" ? planPrice : Math.round(planPrice * 0.25);
  const finalPrice       = couponApplied
    ? couponApplied.type === "percent"
      ? Math.max(0, discountedPrice - (discountedPrice * couponApplied.value) / 100)
      : Math.max(0, discountedPrice - couponApplied.value)
    : discountedPrice;
  const displayPlanPrice  = formatFromUSD(planPrice, currency, rates);
  const displayFinalPrice = formatFromUSD(finalPrice, currency, rates);

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

  const brand = detectBrand(cardNumber);
  const verificationEmail = (lockedVerificationEmail || email).trim().toLowerCase();
  const isVerificationEmailLocked = !!lockedVerificationEmail;

  async function activatePlanDirect() {
    const user = getCurrentUser();
    if (!user) { setOtpError("Please sign in again before activating your plan."); return; }
    setActivating(true);
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
          successUrl: `${window.location.origin}/dashboard/billing?upgrade=success`,
          couponCode: couponApplied?.code || null,
          displayCurrency: currency,
          displayCountry: country,
          billingCycle,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.url) {
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
          successUrl: window.location.origin + "/dashboard/billing?upgrade=success",
          couponCode: couponApplied?.code || null,
          displayCurrency: currency,
          displayCountry: country,
          billingCycle,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.url) {
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

  /* ── Yearly savings ── */
  const yearlySavings = plan !== "custom" ? Math.round(meta.price * 12 - meta.yearlyPrice) : 0;

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
        .mcard:hover{border-color:rgba(255,255,255,.22)!important;background:rgba(255,255,255,.07)!important;transform:translateY(-1px)}
        .mcard.sel{border-color:rgba(99,102,241,.65)!important;background:rgba(99,102,241,.1)!important}
        .mcard{transition:all .18s}
        .cycle-btn{transition:all .2s}
        .cycle-btn.active{background:rgba(255,255,255,.12)!important;color:white!important}
        @media(max-width:900px){
          .pay-header{padding:12px 16px!important}
          .pay-main{padding:24px 14px 60px!important}
          .pay-grid{grid-template-columns:1fr!important}
          .pay-steps{display:none!important}
        }
        @media(max-width:600px){
          .pay-meth-grid{grid-template-columns:1fr!important}
          .pay-two{grid-template-columns:1fr!important}
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
          <div className="pay-steps"><Steps current={step} /></div>
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

            {/* Title */}
            <div style={{ marginBottom:4 }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"4px 12px", borderRadius:20, background:"rgba(99,102,241,.1)", border:"1.5px solid rgba(99,102,241,.25)", fontSize:10, fontWeight:700, color:"#a5b4fc", letterSpacing:".08em", textTransform:"uppercase", marginBottom:12 }}>
                🔒 Secure Checkout
              </div>
              <h1 style={{ margin:"0 0 6px", fontSize:26, fontWeight:800, letterSpacing:"-0.8px" }}>Complete Your Payment</h1>
              <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,.4)" }}>Choose a payment method and enter your details below</p>
              <div style={{ marginTop:10, display:"inline-flex", alignItems:"center", gap:8, padding:"5px 12px", borderRadius:999, border:"1px solid rgba(56,189,248,.22)", background:"rgba(56,189,248,.08)", color:"#7dd3fc", fontSize:11, fontWeight:700 }}>
                {currency} · {country}
              </div>
            </div>

            <div className="pay-grid" style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20, alignItems:"start" }}>

              {/* LEFT: method selector + form */}
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                {/* ── Method Groups ── */}
                <div style={{ borderRadius:18, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", padding:"20px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:16 }}>Select Payment Method</div>

                  {METHOD_GROUPS.map(group => (
                    <div key={group.label} style={{ marginBottom:18 }}>
                      {/* Group header */}
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                        <div style={{ flex:1, height:1, background:"rgba(255,255,255,.07)" }}/>
                        <div style={{ display:"flex", alignItems:"center", gap:7, padding:"3px 10px", borderRadius:99, background:group.bg, border:`1px solid ${group.border}`, fontSize:10, fontWeight:700, color:group.color, letterSpacing:".04em", whiteSpace:"nowrap" }}>
                          {group.label}
                          <span style={{ opacity:.6, fontWeight:500 }}>· {group.badge}</span>
                        </div>
                        <div style={{ flex:1, height:1, background:"rgba(255,255,255,.07)" }}/>
                      </div>

                      <div className="pay-meth-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        {group.methods.map(m => (
                          <div key={m.id}
                            className={`mcard${method===m.id?" sel":""}`}
                            onClick={() => setMethod(m.id)}
                            style={{ padding:"13px 14px", borderRadius:13, border:"1.5px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.03)", cursor:"pointer", position:"relative" }}>
                            {m.popular && (
                              <div style={{ position:"absolute", top:-8, right:10, padding:"2px 8px", borderRadius:10, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", fontSize:8, fontWeight:800, color:"white", letterSpacing:".06em" }}>POPULAR</div>
                            )}
                            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
                              <div style={{ color: method===m.id ? m.processorColor : "rgba(255,255,255,.5)" }}>{m.icon}</div>
                              {method===m.id && (
                                <div style={{ width:18, height:18, borderRadius:"50%", background:"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                  <svg width="10" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5 11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize:12, fontWeight:700, color:"white", marginBottom:2 }}>{m.label}</div>
                            <div style={{ fontSize:10, color:"rgba(255,255,255,.33)" }}>{m.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Form based on method ── */}
                <div style={{ borderRadius:18, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", padding:"22px" }}>

                  {/* CARD */}
                  {method === "card" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      {/* Live card preview */}
                      <div style={{ width:"100%", aspectRatio:"1.586/1", borderRadius:18, background:brand.grad, padding:"24px 28px", position:"relative", overflow:"hidden", boxShadow:"0 20px 52px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.12)", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                        <div style={{ position:"absolute", top:-60, right:-60, width:260, height:260, borderRadius:"50%", background:"rgba(255,255,255,.05)", pointerEvents:"none" }}/>
                        <div style={{ position:"absolute", bottom:-80, left:-40, width:220, height:220, borderRadius:"50%", background:"rgba(255,255,255,.04)", pointerEvents:"none" }}/>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", position:"relative", zIndex:1 }}>
                          <div style={{ width:46, height:34, borderRadius:6, background:"linear-gradient(135deg,#fbbf24,#d97706)", boxShadow:"0 2px 8px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.3)", position:"relative" }}>
                            <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1, background:"rgba(0,0,0,.15)" }}/>
                            <div style={{ position:"absolute", top:0, bottom:0, left:"50%", width:1, background:"rgba(0,0,0,.15)" }}/>
                          </div>
                          <svg width="24" height="24" viewBox="0 0 30 30" fill="none" opacity="0.55">
                            <path d="M15 8 Q22 15 15 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                            <path d="M15 3 Q27 15 15 27" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
                            <circle cx="15" cy="15" r="2.5" fill="white" opacity="0.8"/>
                          </svg>
                        </div>
                        <div style={{ position:"relative", zIndex:1 }}>
                          <div style={{ fontSize:20, color:"rgba(255,255,255,.92)", fontFamily:"'Courier New',monospace", letterSpacing:4, fontWeight:600 }}>{cardNumber || "•••• •••• •••• ••••"}</div>
                        </div>
                        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", position:"relative", zIndex:1 }}>
                          <div>
                            <div style={{ fontSize:8, color:"rgba(255,255,255,.4)", letterSpacing:".12em", textTransform:"uppercase", marginBottom:3 }}>Card Holder</div>
                            <div style={{ fontSize:12, color:"rgba(255,255,255,.9)", fontWeight:600, letterSpacing:1, textTransform:"uppercase" }}>{holder || "CARDHOLDER NAME"}</div>
                          </div>
                          <div style={{ display:"flex", gap:20, alignItems:"flex-end" }}>
                            <div>
                              <div style={{ fontSize:8, color:"rgba(255,255,255,.4)", letterSpacing:".12em", textTransform:"uppercase", marginBottom:3 }}>Expires</div>
                              <div style={{ fontSize:12, color:"rgba(255,255,255,.9)", fontWeight:600, fontFamily:"monospace" }}>{expiry || "MM/YY"}</div>
                            </div>
                            <div style={{ fontSize:13, fontWeight:900, color:"rgba(255,255,255,.5)", letterSpacing:2 }}>{brand.label}</div>
                          </div>
                        </div>
                      </div>
                      <div><label style={lbl}>Card Number</label><input value={cardNumber} onChange={e=>setCardNumber(fmt4(e.target.value))} placeholder="1234 5678 9012 3456" maxLength={19} style={{...inp,fontFamily:"monospace",letterSpacing:2}}/></div>
                      <div className="pay-two" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        <div><label style={lbl}>Expiry Date</label><input value={expiry} onChange={e=>setExpiry(fmtExp(e.target.value))} placeholder="MM/YY" maxLength={5} style={inp}/></div>
                        <div><label style={lbl}>CVV / CVC</label><input value={cvc} onChange={e=>setCvc(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="•••" type="password" maxLength={4} style={inp}/></div>
                      </div>
                      <div><label style={lbl}>Cardholder Name</label><input value={holder} onChange={e=>setHolder(e.target.value.toUpperCase())} placeholder="AS ON CARD" style={{...inp,textTransform:"uppercase"}}/></div>
                      <div><label style={lbl}>Email for Receipt</label><input value={verificationEmail} onChange={e=>!isVerificationEmailLocked && setEmail(e.target.value)} readOnly={isVerificationEmailLocked} placeholder="you@example.com" type="email" style={{...inp, opacity:isVerificationEmailLocked?.valueOf() ? 0.78 : 1, cursor:isVerificationEmailLocked ? "not-allowed" : "text"}}/></div>
                    </div>
                  )}

                  {/* PAYPAL */}
                  {method === "paypal" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      <div style={{ textAlign:"center", padding:"28px 20px 20px" }}>
                        <div style={{ width:64, height:64, borderRadius:18, background:"rgba(0,156,222,.12)", border:"1px solid rgba(0,156,222,.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
                          <IconPayPal />
                        </div>
                        <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Pay with PayPal</div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginBottom:20 }}>Enter your PayPal email to receive a payment request</div>
                        <div><label style={lbl}>PayPal Email</label><input value={verificationEmail} onChange={e=>!isVerificationEmailLocked && setEmail(e.target.value)} readOnly={isVerificationEmailLocked} placeholder="paypal@example.com" type="email" style={{...inp, opacity:isVerificationEmailLocked ? 0.78 : 1, cursor:isVerificationEmailLocked ? "not-allowed" : "text"}}/></div>
                      </div>
                    </div>
                  )}

                  {/* APPLE PAY */}
                  {method === "applepay" && (
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, padding:"28px 20px" }}>
                      <div style={{ width:64, height:64, borderRadius:18, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <IconApplePay />
                      </div>
                      <div style={{ fontSize:15, fontWeight:700 }}>Apple Pay</div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", textAlign:"center", maxWidth:280 }}>Complete your purchase using Touch ID or Face ID. Available on Safari and iOS devices.</div>
                      <div style={{ width:"100%" }}><label style={lbl}>Email for Receipt</label><input value={verificationEmail} onChange={e=>!isVerificationEmailLocked && setEmail(e.target.value)} readOnly={isVerificationEmailLocked} placeholder="you@example.com" type="email" style={{...inp, opacity:isVerificationEmailLocked ? 0.78 : 1, cursor:isVerificationEmailLocked ? "not-allowed" : "text"}}/></div>
                      <div style={{ padding:"10px 16px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", fontSize:11, color:"rgba(255,255,255,.4)", textAlign:"center" }}>
                        Apple Pay will launch automatically at checkout
                      </div>
                    </div>
                  )}

                  {/* GOOGLE PAY */}
                  {method === "googlepay" && (
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, padding:"28px 20px" }}>
                      <div style={{ width:64, height:64, borderRadius:18, background:"rgba(66,133,244,.1)", border:"1px solid rgba(66,133,244,.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <IconGooglePay />
                      </div>
                      <div style={{ fontSize:15, fontWeight:700 }}>Google Pay</div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", textAlign:"center", maxWidth:280 }}>One-tap payment using your saved Google Pay cards.</div>
                      <div style={{ width:"100%" }}><label style={lbl}>Email for Receipt</label><input value={verificationEmail} onChange={e=>!isVerificationEmailLocked && setEmail(e.target.value)} readOnly={isVerificationEmailLocked} placeholder="you@example.com" type="email" style={{...inp, opacity:isVerificationEmailLocked ? 0.78 : 1, cursor:isVerificationEmailLocked ? "not-allowed" : "text"}}/></div>
                      <div style={{ padding:"10px 16px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", fontSize:11, color:"rgba(255,255,255,.4)", textAlign:"center" }}>
                        Google Pay will launch automatically at checkout
                      </div>
                    </div>
                  )}

                  {/* BANK / WISE */}
                  {(method === "bank" || method === "ach" || method === "sepa") && (
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      <div style={{ padding:"14px 16px", borderRadius:12, background:"rgba(52,211,153,.06)", border:"1px solid rgba(52,211,153,.2)", display:"flex", alignItems:"flex-start", gap:12 }}>
                        <div style={{ width:32, height:32, borderRadius:9, background:"rgba(52,211,153,.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:"#34d399" }}><IconBank /></div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#6ee7b7", marginBottom:3 }}>{method === "bank" ? "Bank Transfer via Wise" : method === "ach" ? "ACH Bank Transfer" : "SEPA Bank Transfer"}</div>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", lineHeight:1.65 }}>Transfer to our Wise account with local bank rates. Confirmation within 1–2 business days.</div>
                        </div>
                      </div>
                      <div><label style={lbl}>Your Bank Name</label><input value={bankName} onChange={e=>setBankName(e.target.value)} placeholder="e.g. HBL, MCB, Standard Chartered" style={inp}/></div>
                      <div><label style={lbl}>Account Number / IBAN</label><input value={accountNo} onChange={e=>setAccountNo(e.target.value)} placeholder="PK36SCBL0000001123456702" style={{...inp,fontFamily:"monospace"}}/></div>
                      <div><label style={lbl}>Email for Confirmation</label><input value={verificationEmail} onChange={e=>!isVerificationEmailLocked && setEmail(e.target.value)} readOnly={isVerificationEmailLocked} placeholder="you@example.com" type="email" style={{...inp, opacity:isVerificationEmailLocked ? 0.78 : 1, cursor:isVerificationEmailLocked ? "not-allowed" : "text"}}/></div>
                    </div>
                  )}

                  {/* JAZZCASH / EASYPAISA */}
                  {(method === "jazzcash" || method === "easypaisa") && (
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      <div style={{ textAlign:"center", padding:"16px 0 8px" }}>
                        <div style={{ width:60, height:60, borderRadius:16, background:"rgba(56,189,248,.1)", border:"1px solid rgba(56,189,248,.25)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", color:"#38bdf8" }}>
                          <IconJazz />
                        </div>
                        <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{method==="jazzcash"?"JazzCash":"Easypaisa"} Payment</div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>Enter your registered mobile number</div>
                      </div>
                      <div><label style={lbl}>Mobile Number</label><input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,11))} placeholder="03XX-XXXXXXX" style={{...inp,fontFamily:"monospace",letterSpacing:1}}/></div>
                      <div><label style={lbl}>Account ID (optional)</label><input value={walletId} onChange={e=>setWalletId(e.target.value)} placeholder="Registered wallet ID" style={inp}/></div>
                      <div><label style={lbl}>Email for Confirmation</label><input value={verificationEmail} onChange={e=>!isVerificationEmailLocked && setEmail(e.target.value)} readOnly={isVerificationEmailLocked} placeholder="you@example.com" type="email" style={{...inp, opacity:isVerificationEmailLocked ? 0.78 : 1, cursor:isVerificationEmailLocked ? "not-allowed" : "text"}}/></div>
                    </div>
                  )}

                  {/* CRYPTO */}
                  {method === "crypto" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      <div><label style={lbl}>Select Cryptocurrency</label>
                        <select value={coin} onChange={e=>setCoin(e.target.value)} style={{...inp,cursor:"pointer"}}>
                          <option value="BTC">Bitcoin (BTC)</option>
                          <option value="ETH">Ethereum (ETH)</option>
                          <option value="USDT">Tether (USDT)</option>
                          <option value="BNB">BNB Smart Chain</option>
                          <option value="SOL">Solana (SOL)</option>
                          <option value="MATIC">Polygon (MATIC)</option>
                        </select>
                      </div>
                      <div style={{ padding:"16px", borderRadius:12, background:"rgba(251,191,36,.05)", border:"1px solid rgba(251,191,36,.2)", textAlign:"center" }}>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,.4)", marginBottom:6, letterSpacing:".06em", textTransform:"uppercase" }}>Send to this wallet</div>
                        <div style={{ fontFamily:"monospace", fontSize:11, color:"#fbbf24", wordBreak:"break-all", lineHeight:1.6 }}>0x742d35Cc6634C0532925a3b8D4C9E5d4f4a2b1c8</div>
                      </div>
                      <div><label style={lbl}>Your TX Hash (after sending)</label><input value={cryptoAddr} onChange={e=>setCryptoAddr(e.target.value)} placeholder="Paste transaction hash here" style={{...inp,fontFamily:"monospace",fontSize:11}}/></div>
                      <div><label style={lbl}>Email for Confirmation</label><input value={verificationEmail} onChange={e=>!isVerificationEmailLocked && setEmail(e.target.value)} readOnly={isVerificationEmailLocked} placeholder="you@example.com" type="email" style={{...inp, opacity:isVerificationEmailLocked ? 0.78 : 1, cursor:isVerificationEmailLocked ? "not-allowed" : "text"}}/></div>
                    </div>
                  )}

                  {/* KLARNA */}
                  {method === "klarna" && (
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, padding:"24px 20px" }}>
                      <div style={{ width:60, height:60, borderRadius:16, background:"rgba(255,182,193,.1)", border:"1px solid rgba(255,182,193,.25)", display:"flex", alignItems:"center", justifyContent:"center", color:"#ffb6c1" }}>
                        <IconKlarna />
                      </div>
                      <div style={{ fontSize:15, fontWeight:700 }}>Buy Now, Pay Later</div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, width:"100%", marginTop:4 }}>
                        {["Pay in 4 installments","0% interest for 30 days","No hidden fees","Instant approval"].map(t => (
                          <div key={t} style={{ display:"flex", alignItems:"center", gap:7, fontSize:11, color:"rgba(255,255,255,.6)", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:9, padding:"9px 12px" }}>
                            <span style={{ color:"#34d399", fontSize:12 }}>✓</span>{t}
                          </div>
                        ))}
                      </div>
                      <div style={{ width:"100%" }}><label style={lbl}>Email for Klarna</label><input value={verificationEmail} onChange={e=>!isVerificationEmailLocked && setEmail(e.target.value)} readOnly={isVerificationEmailLocked} placeholder="you@example.com" type="email" style={{...inp, opacity:isVerificationEmailLocked ? 0.78 : 1, cursor:isVerificationEmailLocked ? "not-allowed" : "text"}}/></div>
                    </div>
                  )}
                </div>

                {/* Error */}
                {otpError && step===1 && (
                  <div style={{ padding:"10px 16px", borderRadius:10, background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", color:"#fca5a5", fontSize:12 }}>{otpError}</div>
                )}

                {/* Submit */}
                <button onClick={handlePaymentSubmit} disabled={processing||activating}
                  style={{
                    width:"100%", padding:"16px", borderRadius:14, border:"none",
                    background:(processing||activating) ? "rgba(255,255,255,.06)" : `linear-gradient(135deg,${meta.gradientFrom},${meta.gradientTo})`,
                    color:(processing||activating) ? "rgba(255,255,255,.3)" : "white",
                    fontSize:15, fontWeight:800, cursor:(processing||activating)?"not-allowed":"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                    fontFamily:"inherit", boxShadow:(processing||activating)?"none":`0 8px 28px ${meta.glow}`,
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
                  {plan !== "custom" && (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:8 }}>
                      <span style={{ fontSize:13, color:"rgba(255,255,255,.35)", textDecoration:"line-through" }}>{displayPlanPrice}/{billingCycle==="yearly"?"yr":"mo"}</span>
                      <span style={{ padding:"2px 8px", borderRadius:6, background:"rgba(249,115,22,.18)", border:"1px solid rgba(249,115,22,.4)", fontSize:10, fontWeight:800, color:"#fb923c" }}>75% OFF</span>
                    </div>
                  )}
                  <div style={{ fontSize:26, fontWeight:900, color:meta.color, marginTop:4, lineHeight:1 }}>
                    {formatFromUSD(discountedPrice, currency, rates)}
                    <span style={{ fontSize:12, fontWeight:500, color:"rgba(255,255,255,.35)" }}> today</span>
                  </div>
                  {plan !== "custom" && (
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.38)", marginTop:5 }}>First 3 months · then {displayPlanPrice}/{billingCycle==="yearly"?"yr":"mo"}</div>
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
                    {plan !== "custom" && <div style={{ fontSize:10, fontWeight:500, color:"rgba(249,115,22,.7)", marginTop:2 }}>75% off · 3 months</div>}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", textDecoration:"line-through", fontWeight:400 }}>{displayPlanPrice}</div>
                    <span style={{ color:meta.color }}>{displayFinalPrice}</span>
                  </div>
                </div>

                <div style={{ marginTop:16, padding:"11px 14px", borderRadius:12, background:"rgba(16,185,129,.07)", border:"1px solid rgba(16,185,129,.18)", display:"flex", alignItems:"center", gap:8, fontSize:11, color:"#6ee7b7" }}>
                  🔒 256-bit SSL encrypted checkout
                </div>

                {/* Processor logos row */}
                <div style={{ marginTop:12, display:"flex", alignItems:"center", justifyContent:"center", gap:10, flexWrap:"wrap" }}>
                  {["LemonSqueezy","Wise","JazzCash","Easypaisa","Crypto","Klarna"].map(p => (
                    <div key={p} style={{ padding:"3px 9px", borderRadius:6, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)", fontSize:9, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".04em" }}>{p}</div>
                  ))}
                </div>
                <div style={{ marginTop:16, padding:"14px 14px 12px", borderRadius:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>
                    Subscription System
                  </div>
                  <div style={{ display:"grid", gap:8 }}>
                    {[
                      "Monthly plan",
                      "Yearly plan",
                      "Cancel subscription",
                      "Upgrade plan",
                      "Downgrade plan",
                      "Invoices",
                      "Billing history",
                    ].map(item => (
                      <div key={item} style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, color:"rgba(255,255,255,.62)" }}>
                        <span style={{ color:meta.color, fontWeight:800 }}>•</span>
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
                <h2 style={{ margin:"0 0 6px", fontSize:32, fontWeight:900, background:`linear-gradient(135deg, white 30%, ${pm.color})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{pm.name} Activated!</h2>
                <p style={{ fontSize:14, color:"rgba(255,255,255,.45)", margin:"0 0 28px" }}>Your account is ready. Taking you to your dashboard…</p>
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
