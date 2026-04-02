"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { FX_USD, formatFromUSD } from "@/lib/currency";
import { getStoredCurrencyPreference, setStoredCurrencyPreference } from "@/lib/currencyPreference";

/* ── Plan meta ──────────────────────────────────────────── */
const PLAN_META: Record<string, { name: string; price: number; color: string; glow: string; dim: string; border: string; gradientFrom: string; gradientTo: string; icon: string }> = {
  starter:      { name: "Starter",      price: 49,  icon: "🌱", color: "#818cf8", glow: "rgba(129,140,248,.35)", dim: "rgba(129,140,248,.1)",  border: "rgba(129,140,248,.3)",  gradientFrom: "#6366f1", gradientTo: "#4f46e5" },
  pro:          { name: "Professional", price: 99,  icon: "🚀", color: "#34d399", glow: "rgba(52,211,153,.35)",  dim: "rgba(52,211,153,.1)",   border: "rgba(52,211,153,.3)",   gradientFrom: "#10b981", gradientTo: "#059669" },
  professional: { name: "Professional", price: 99,  icon: "🚀", color: "#34d399", glow: "rgba(52,211,153,.35)",  dim: "rgba(52,211,153,.1)",   border: "rgba(52,211,153,.3)",   gradientFrom: "#10b981", gradientTo: "#059669" },
  enterprise:   { name: "Enterprise",   price: 249, icon: "💎", color: "#fbbf24", glow: "rgba(251,191,36,.35)",  dim: "rgba(251,191,36,.1)",   border: "rgba(251,191,36,.3)",   gradientFrom: "#f59e0b", gradientTo: "#d97706" },
  custom:       { name: "Custom",       price: 0,   icon: "⚡", color: "#38bdf8", glow: "rgba(56,189,248,.35)",  dim: "rgba(56,189,248,.1)",   border: "rgba(56,189,248,.3)",   gradientFrom: "#0ea5e9", gradientTo: "#0284c7" },
};

/* ── Payment methods ────────────────────────────────────── */
type PayMethod = "card" | "bank" | "paypal" | "crypto" | "jazzcash" | "easypaisa";

const PAY_METHODS: { id: PayMethod; label: string; icon: string; desc: string; popular?: boolean }[] = [
  { id: "card",      label: "Credit / Debit Card",  icon: "💳", desc: "Visa, Mastercard, Amex, Discover", popular: true },
  { id: "bank",      label: "Bank Transfer",         icon: "🏦", desc: "Direct bank wire or ACH transfer" },
  { id: "paypal",    label: "PayPal",                icon: "🅿️",  desc: "Pay with your PayPal balance" },
  { id: "jazzcash",  label: "JazzCash",              icon: "📱", desc: "Mobile wallet payment" },
  { id: "easypaisa", label: "Easypaisa",             icon: "📲", desc: "Mobile wallet payment" },
  { id: "crypto",    label: "Cryptocurrency",        icon: "₿",  desc: "Bitcoin, Ethereum, USDT" },
];

/* ── Helpers ────────────────────────────────────────────── */
function fmt4(v: string) { return v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim(); }
function fmtExp(v: string) { const d = v.replace(/\D/g,"").slice(0,4); return d.length>2?d.slice(0,2)+"/"+d.slice(2):d; }
function detectBrand(n: string) {
  const s = n.replace(/\s/g,"");
  if (/^4/.test(s))    return { label:"VISA",       color:"#1a1f71", grad:"linear-gradient(135deg,#1a1f71,#1e3a8a)" };
  if (/^5[1-5]/.test(s)) return { label:"MASTERCARD", color:"#eb001b", grad:"linear-gradient(135deg,#2d1b69,#c2185b)" };
  if (/^3[47]/.test(s))  return { label:"AMEX",       color:"#007bc1", grad:"linear-gradient(135deg,#1a3c5e,#0277bd)" };
  if (/^6/.test(s))    return { label:"DISCOVER",    color:"#f76f20", grad:"linear-gradient(135deg,#7c3102,#f76f20)" };
  return { label:"CARD", color:"#6366f1", grad:"linear-gradient(135deg,#312e81,#4f46e5)" };
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
              fontSize:12, fontWeight:800, transition:"all .3s",
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
  const billingCycle = (searchParams.get("cycle") || "").toLowerCase() === "yearly" ? "yearly" : "monthly";
  const queryPrice = Number(searchParams.get("price") || "");
  const planPrice =
    plan === "custom"
      ? (Number.isFinite(queryPrice) && queryPrice > 0 ? queryPrice : 0)
      : (billingCycle === "yearly" ? Math.round(meta.price * 12 * 0.8) : meta.price);
  const [currency, setCurrency] = useState<string>(searchParams.get("currency") || "USD");
  const [country, setCountry] = useState<string>(searchParams.get("country") || "US");
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  /* ── State ── */
  const [step,        setStep]        = useState<1|2|3>(1);
  const [method,      setMethod]      = useState<PayMethod>("card");
  const [cardNumber,  setCardNumber]  = useState("");
  const [expiry,      setExpiry]      = useState("");
  const [cvc,         setCvc]         = useState("");
  const [holder,      setHolder]      = useState("");
  const [email,       setEmail]       = useState("");
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
    if (user?.email) setEmail(String(user.email));
  }, []);

  useEffect(() => {
    (async () => {
      const stored = getStoredCurrencyPreference();
      if (!searchParams.get("currency") && stored.currency && FX_USD[stored.currency]) {
        setCurrency(stored.currency);
      }
      if (!searchParams.get("country") && stored.country) {
        setCountry(stored.country);
      }

      if ((!searchParams.get("currency") || !searchParams.get("country")) && (!stored.currency || !stored.country)) {
        try {
          const geo = await fetch("/api/public/geo", { cache: "no-store" });
          if (geo.ok) {
            const data = await geo.json();
            if (data?.currency && FX_USD[data.currency]) setCurrency(data.currency);
            if (data?.country) setCountry(data.country);
          }
        } catch {}
      }

      try {
        const fx = await fetch("/api/public/fx", { cache: "no-store" });
        if (fx.ok) {
          const data = await fx.json();
          if (data?.rates) setRates(data.rates);
        }
      } catch {}
    })();
  }, [searchParams]);

  useEffect(() => {
    if (currency) {
      setStoredCurrencyPreference(currency, country);
    }
  }, [currency, country]);

  const finalPrice = couponApplied
    ? couponApplied.type === "percent"
      ? Math.max(0, planPrice - (planPrice * couponApplied.value) / 100)
      : Math.max(0, planPrice - couponApplied.value)
    : planPrice;
  const displayPlanPrice = formatFromUSD(planPrice, currency, rates);
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
      if (!r.ok || !d.valid) {
        setCouponError(d.error || "Invalid coupon code");
        setCouponApplied(null);
      } else {
        setCouponApplied(d.coupon);
        setCouponInput("");
      }
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  const brand = detectBrand(cardNumber);

  async function activatePlanDirect() {
    const user = getCurrentUser();
    if (!user) {
      setOtpError("Please sign in again before activating your plan.");
      return;
    }
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
        }),
      });
      const data = await res.json();
      if (res.ok && data?.url) {
        setStep(3);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        window.location.href = data.url;
        return;
      }
      setOtpError(data?.error || "Activation failed. Please try again.");
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setActivating(false);
    }
  }

  /* ── Submit payment details → send real email OTP ── */
  async function handlePaymentSubmit() {
    if (!email.trim()) {
      setOtpError("Please enter your email address");
      return;
    }
    setOtpError("");
    const currentUser = getCurrentUser();
    if (currentUser?.id && currentUser?.companyId) {
      await activatePlanDirect();
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch("/api/auth/verify/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), channel: "email" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Failed to send verification code. Please try again.");
        setProcessing(false);
        return;
      }
      setStep(2);
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  /* ── Resend OTP ── */
  async function handleResendOtp() {
    if (!email.trim()) return;
    setOtpError("");
    try {
      await fetch("/api/auth/verify/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), channel: "email" }),
      });
    } catch {
      // silently ignore resend errors
    }
  }

  /* ── Verify OTP → activate plan → dashboard ── */
  async function handleVerify() {
    const entered = otp.join("");
    if (entered.length < 6) { setOtpError("Please enter the 6-digit code."); return; }
    setOtpError("");
    setActivating(true);

    try {
      // Confirm the OTP with the server
      const verifyRes = await fetch("/api/auth/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: entered }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setOtpError(verifyData.error || "Invalid code");
        setActivating(false);
        return;
      }

      const user = getCurrentUser();
      if (!user) {
        setOtpError("Please sign in again before activating your plan.");
        setActivating(false);
        return;
      }
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "x-user-id":     user.id || "",
          "x-user-role":   user.role || "ADMIN",
          "x-company-id":  user.companyId || "",
        },
        body: JSON.stringify({
          planCode:   plan.toUpperCase(),
          successUrl: window.location.origin + "/dashboard/billing?upgrade=success",
          couponCode: couponApplied?.code || null,
          displayCurrency: currency,
          displayCountry: country,
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
    } catch {
      setOtpError("Network error. Please try again.");
      setActivating(false);
    }
  }

  /* ── OTP box handler ── */
  function handleOtpChange(i: number, val: string) {
    const digit = val.replace(/\D/g,"").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    setOtpError("");
    if (digit && i < 5) {
      document.getElementById(`otp-${i+1}`)?.focus();
    }
  }
  function handleOtpKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      document.getElementById(`otp-${i-1}`)?.focus();
    }
  }
  /* ── Input style ── */
  const inp: React.CSSProperties = {
    width:"100%", padding:"13px 16px", borderRadius:12,
    border:"1.5px solid rgba(255,255,255,.1)",
    background:"rgba(255,255,255,.05)", color:"white",
    fontSize:14, outline:"none", fontFamily:"inherit",
    transition:"border-color .2s",
  };
  const lbl: React.CSSProperties = {
    fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)",
    letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:6,
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#080c1e 0%,#0c0f2e 40%,#080c1e 100%)", color:"white", fontFamily:"'Outfit','DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes successPop{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
        .fu{animation:fadeUp .45s ease both}
        input::placeholder{color:rgba(255,255,255,.2)}
        input:focus{border-color:rgba(99,102,241,.7)!important;box-shadow:0 0 0 3px rgba(99,102,241,.12)}
        select option{background:#1e293b;color:white}
        .method-card:hover{border-color:rgba(255,255,255,.2)!important;background:rgba(255,255,255,.07)!important}
        .method-card.selected{border-color:rgba(99,102,241,.7)!important;background:rgba(99,102,241,.1)!important}
        @media(max-width:900px){
          .payment-header{padding:14px 16px !important;}
          .payment-main{padding:28px 14px 64px !important;}
          .payment-grid{grid-template-columns:1fr !important;}
          .payment-steps{display:none !important;}
        }
        @media(max-width:640px){
          .payment-method-grid{grid-template-columns:1fr !important;}
          .payment-two-col{grid-template-columns:1fr !important;}
          .payment-perks-grid{grid-template-columns:1fr !important;}
          .payment-summary-card{order:-1;}
        }
      `}</style>

      {/* BG grid */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)", backgroundSize:"48px 48px" }}/>

      {/* Header */}
      <header style={{ position:"sticky", top:0, zIndex:50, borderBottom:"1px solid rgba(255,255,255,.06)", background:"rgba(8,12,30,.9)", backdropFilter:"blur(20px)" }}>
        <div className="payment-header" style={{ maxWidth:760, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(99,102,241,.4)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <span style={{ fontSize:17, fontWeight:700, letterSpacing:"-.3px" }}>Finova</span>
          </div>

          <div className="payment-steps"><Steps current={step} /></div>

          <button onClick={() => step===1 ? router.back() : setStep(1)}
            style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.45)", padding:"7px 14px", borderRadius:9, border:"1.5px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)", cursor:"pointer", fontFamily:"inherit" }}>
            ← Back
          </button>
        </div>
      </header>

      <main className="payment-main" style={{ position:"relative", zIndex:1, maxWidth:760, margin:"0 auto", padding:"40px 24px 80px" }}>

        {/* ═══ STEP 1: Payment ═══ */}
        {step === 1 && (
          <div className="fu" style={{ display:"flex", flexDirection:"column", gap:20 }}>

            {/* Page title */}
            <div style={{ marginBottom:8 }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"4px 12px", borderRadius:20, background:"rgba(99,102,241,.1)", border:"1.5px solid rgba(99,102,241,.25)", fontSize:10, fontWeight:700, color:"#a5b4fc", letterSpacing:".08em", textTransform:"uppercase", marginBottom:14 }}>
                🔒 Secure Checkout
              </div>
              <h1 style={{ margin:"0 0 6px", fontSize:28, fontWeight:800, letterSpacing:"-1px" }}>
                Complete Your Payment
              </h1>
              <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,.4)" }}>
                Choose a payment method and enter your details below
              </p>
              <div style={{ marginTop:12, display:"inline-flex", alignItems:"center", gap:8, padding:"6px 12px", borderRadius:999, border:"1px solid rgba(56,189,248,.22)", background:"rgba(56,189,248,.08)", color:"#7dd3fc", fontSize:11, fontWeight:800, letterSpacing:".04em" }}>
                {currency} · {country}
              </div>
            </div>

            <div className="payment-grid" style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20, alignItems:"start" }}>

              {/* Left: method selector + form */}
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                {/* Payment method selector */}
                <div style={{ borderRadius:18, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", padding:"20px 20px 16px" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.4)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:14 }}>Select Payment Method</div>
                  <div className="payment-method-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {PAY_METHODS.map(m => (
                      <div key={m.id} className={`method-card${method===m.id?" selected":""}`}
                        onClick={() => setMethod(m.id)}
                        style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.03)", cursor:"pointer", transition:"all .2s", position:"relative" }}>
                        {m.popular && (
                          <div style={{ position:"absolute", top:-8, right:10, padding:"2px 8px", borderRadius:10, background:"#6366f1", fontSize:8, fontWeight:800, color:"white", letterSpacing:".06em" }}>POPULAR</div>
                        )}
                        <div style={{ fontSize:20, marginBottom:6 }}>{m.icon}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:"white", marginBottom:3 }}>{m.label}</div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,.35)" }}>{m.desc}</div>
                        {method===m.id && (
                          <div style={{ position:"absolute", top:10, right:10, width:18, height:18, borderRadius:"50%", background:"#6366f1", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <svg width="10" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5 11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form based on selected method */}
                <div style={{ borderRadius:18, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", padding:"22px 22px" }}>

                  {/* CARD */}
                  {method === "card" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      {/* Live card preview — full credit card ratio 1.586:1 */}
                      <div style={{ width:"100%", aspectRatio:"1.586/1", borderRadius:20, background:brand.grad, padding:"28px 30px", position:"relative", overflow:"hidden", boxShadow:`0 24px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.15)`, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                        {/* Background orbs */}
                        <div style={{ position:"absolute", top:-60, right:-60, width:260, height:260, borderRadius:"50%", background:"rgba(255,255,255,.06)", pointerEvents:"none" }}/>
                        <div style={{ position:"absolute", bottom:-80, left:-40, width:220, height:220, borderRadius:"50%", background:"rgba(255,255,255,.04)", pointerEvents:"none" }}/>
                        <div style={{ position:"absolute", top:"40%", left:"30%", width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,.03)", pointerEvents:"none" }}/>

                        {/* Top row: chip + brand */}
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", position:"relative", zIndex:1 }}>
                          {/* EMV Chip */}
                          <div style={{ width:48, height:36, borderRadius:7, background:"linear-gradient(135deg,#fbbf24 0%,#d97706 40%,#fbbf24 60%,#b45309 100%)", boxShadow:"0 2px 8px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.3)", position:"relative", overflow:"hidden" }}>
                            <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1, background:"rgba(0,0,0,.15)" }}/>
                            <div style={{ position:"absolute", top:0, bottom:0, left:"50%", width:1, background:"rgba(0,0,0,.15)" }}/>
                          </div>
                          {/* Contactless + Brand */}
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                            {/* Contactless icon */}
                            <svg width="26" height="26" viewBox="0 0 30 30" fill="none" opacity="0.6">
                              <path d="M15 8 Q22 15 15 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                              <path d="M15 3 Q27 15 15 27" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
                              <circle cx="15" cy="15" r="2.5" fill="white" opacity="0.8"/>
                            </svg>
                          </div>
                        </div>

                        {/* Card number */}
                        <div style={{ position:"relative", zIndex:1 }}>
                          <div style={{ fontSize:22, color:"rgba(255,255,255,.95)", fontFamily:"'Courier New',monospace", letterSpacing:5, fontWeight:600, textShadow:"0 2px 8px rgba(0,0,0,.3)" }}>
                            {cardNumber || "•••• •••• •••• ••••"}
                          </div>
                        </div>

                        {/* Bottom row: name + expiry + brand label */}
                        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", position:"relative", zIndex:1 }}>
                          <div>
                            <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", letterSpacing:".12em", textTransform:"uppercase", marginBottom:4 }}>Card Holder</div>
                            <div style={{ fontSize:13, color:"rgba(255,255,255,.9)", fontWeight:600, letterSpacing:1, textTransform:"uppercase", textShadow:"0 1px 4px rgba(0,0,0,.3)" }}>
                              {holder || "CARDHOLDER NAME"}
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:24, alignItems:"flex-end" }}>
                            <div style={{ textAlign:"center" }}>
                              <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", letterSpacing:".12em", textTransform:"uppercase", marginBottom:4 }}>Expires</div>
                              <div style={{ fontSize:13, color:"rgba(255,255,255,.9)", fontWeight:600, fontFamily:"monospace" }}>{expiry || "MM/YY"}</div>
                            </div>
                            <div style={{ fontSize:15, fontWeight:900, color:"rgba(255,255,255,.55)", letterSpacing:2, textTransform:"uppercase" }}>
                              {brand.label}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label style={lbl}>Card Number</label>
                        <input value={cardNumber} onChange={e=>setCardNumber(fmt4(e.target.value))} placeholder="1234 5678 9012 3456" maxLength={19} style={{...inp, fontFamily:"monospace", letterSpacing:2}}/>
                      </div>
                      <div className="payment-two-col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        <div>
                          <label style={lbl}>Expiry Date</label>
                          <input value={expiry} onChange={e=>setExpiry(fmtExp(e.target.value))} placeholder="MM/YY" maxLength={5} style={inp}/>
                        </div>
                        <div>
                          <label style={lbl}>CVV / CVC</label>
                          <input value={cvc} onChange={e=>setCvc(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="•••" type="password" maxLength={4} style={inp}/>
                        </div>
                      </div>
                      <div>
                        <label style={lbl}>Cardholder Name</label>
                        <input value={holder} onChange={e=>setHolder(e.target.value.toUpperCase())} placeholder="AS ON CARD" style={{...inp, textTransform:"uppercase"}}/>
                      </div>
                      <div>
                        <label style={lbl}>Email for Receipt</label>
                        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" type="email" style={inp}/>
                      </div>
                    </div>
                  )}

                  {/* BANK */}
                  {method === "bank" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      <div style={{ padding:"14px 16px", borderRadius:12, background:"rgba(56,189,248,.08)", border:"1px solid rgba(56,189,248,.2)" }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#7dd3fc", marginBottom:4 }}>Bank Transfer Instructions</div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", lineHeight:1.7 }}>
                          Transfer to our account and enter your bank details below. Confirmation within 1–2 business days.
                        </div>
                      </div>
                      <div>
                        <label style={lbl}>Your Bank Name</label>
                        <input value={bankName} onChange={e=>setBankName(e.target.value)} placeholder="e.g. HBL, MCB, Standard Chartered" style={inp}/>
                      </div>
                      <div>
                        <label style={lbl}>Account Number / IBAN</label>
                        <input value={accountNo} onChange={e=>setAccountNo(e.target.value)} placeholder="PK36SCBL0000001123456702" style={{...inp, fontFamily:"monospace"}}/>
                      </div>
                      <div>
                        <label style={lbl}>Email for Confirmation</label>
                        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" type="email" style={inp}/>
                      </div>
                    </div>
                  )}

                  {/* PAYPAL */}
                  {method === "paypal" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      <div style={{ textAlign:"center", padding:"30px 20px" }}>
                        <div style={{ fontSize:52, marginBottom:12 }}>🅿️</div>
                        <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Pay with PayPal</div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginBottom:20 }}>Enter your PayPal email to receive a payment request</div>
                        <div>
                          <label style={lbl}>PayPal Email</label>
                          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="paypal@example.com" type="email" style={inp}/>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* JAZZCASH / EASYPAISA */}
                  {(method === "jazzcash" || method === "easypaisa") && (
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      <div style={{ textAlign:"center", padding:"16px 0 8px" }}>
                        <div style={{ fontSize:48, marginBottom:8 }}>{method==="jazzcash"?"📱":"📲"}</div>
                        <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{method==="jazzcash"?"JazzCash":"Easypaisa"} Payment</div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>Enter your registered mobile number</div>
                      </div>
                      <div>
                        <label style={lbl}>Mobile Number</label>
                        <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,11))} placeholder="03XX-XXXXXXX" style={{...inp, fontFamily:"monospace", letterSpacing:1}}/>
                      </div>
                      <div>
                        <label style={lbl}>{method==="jazzcash"?"JazzCash":"Easypaisa"} Account / MPIN will be sent via OTP</label>
                        <input value={walletId} onChange={e=>setWalletId(e.target.value)} placeholder="Enter registered ID (optional)" style={inp}/>
                      </div>
                    </div>
                  )}

                  {/* CRYPTO */}
                  {method === "crypto" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      <div>
                        <label style={lbl}>Select Cryptocurrency</label>
                        <select value={coin} onChange={e=>setCoin(e.target.value)} style={{...inp, cursor:"pointer"}}>
                          <option value="BTC">Bitcoin (BTC)</option>
                          <option value="ETH">Ethereum (ETH)</option>
                          <option value="USDT">Tether (USDT)</option>
                          <option value="BNB">BNB</option>
                          <option value="SOL">Solana (SOL)</option>
                        </select>
                      </div>
                      <div style={{ padding:"16px", borderRadius:12, background:"rgba(251,191,36,.06)", border:"1px solid rgba(251,191,36,.2)", textAlign:"center" }}>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginBottom:6 }}>Send exactly to this wallet address</div>
                        <div style={{ fontFamily:"monospace", fontSize:11, color:"#fbbf24", wordBreak:"break-all", lineHeight:1.6 }}>
                          0x742d35Cc6634C0532925a3b8D4C9E5d4f4a2b1c8
                        </div>
                      </div>
                      <div>
                        <label style={lbl}>Your Wallet / Transaction Hash (after sending)</label>
                        <input value={cryptoAddr} onChange={e=>setCryptoAddr(e.target.value)} placeholder="Paste your tx hash here" style={{...inp, fontFamily:"monospace", fontSize:12}}/>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <button onClick={handlePaymentSubmit} disabled={processing}
                  style={{
                    width:"100%", padding:"16px", borderRadius:14, border:"none",
                    background: (processing || activating) ? "rgba(255,255,255,.06)" : `linear-gradient(135deg,${meta.gradientFrom},${meta.gradientTo})`,
                    color: processing ? "rgba(255,255,255,.3)" : "white",
                    fontSize:15, fontWeight:800, cursor: processing?"not-allowed":"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                    fontFamily:"inherit", boxShadow: processing ? "none" : `0 6px 28px ${meta.glow}`,
                    transition:"all .3s",
                  }}>
                  {processing ? (
                    <><svg width="18" height="18" viewBox="0 0 24 24" style={{ animation:"spin 1s linear infinite" }}><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" strokeDasharray="60" strokeDashoffset="20"/></svg> Processing…</>
                  ) : (
                    <>🔒 Proceed &amp; Verify →</>
                  )}
                </button>
              </div>

              {/* Right: Order summary */}
              <div className="payment-summary-card" style={{ borderRadius:18, background:"rgba(255,255,255,.03)", border:`1.5px solid ${meta.border}`, padding:"22px 20px", position:"sticky", top:100 }}>
                <div style={{ height:3, background:`linear-gradient(90deg,${meta.gradientFrom},${meta.gradientTo})`, borderRadius:2, marginBottom:18, marginTop:-22, marginLeft:-20, marginRight:-20 }}/>
                <div style={{ textAlign:"center", marginBottom:18 }}>
                  <div style={{ fontSize:30, marginBottom:6 }}>{meta.icon}</div>
                  <div style={{ fontSize:17, fontWeight:800, color:"white" }}>{meta.name}</div>
                  <div style={{ fontSize:28, fontWeight:900, color:meta.color, marginTop:4 }}>
                    {displayPlanPrice}<span style={{ fontSize:13, fontWeight:500, color:"rgba(255,255,255,.4)" }}>{billingCycle === "yearly" ? "/yr" : "/mo"}</span>
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.34)", marginTop:5 }}>Billing preference: {currency}</div>
                </div>
                {[
                  { label:"Plan", value: meta.name },
                  { label:"Billing", value: billingCycle === "yearly" ? "Yearly" : "Monthly" },
                  { label:"Next renewal", value: billingCycle === "yearly" ? "12 months" : "30 days" },
                  { label:"Trial period", value:"—" },
                ].map(r => (
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,.05)", fontSize:12 }}>
                    <span style={{ color:"rgba(255,255,255,.35)" }}>{r.label}</span>
                    <span style={{ color:"white", fontWeight:700 }}>{r.value}</span>
                  </div>
                ))}
                {/* Coupon input */}
                <div style={{ paddingTop:12 }}>
                  {couponApplied ? (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", borderRadius:9, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.2)", fontSize:12 }}>
                      <span style={{ color:"#34d399", fontWeight:700 }}>
                        🎟 {couponApplied.code} — {couponApplied.type === "percent" ? `${couponApplied.value}% off` : `$${couponApplied.value} off`}
                      </span>
                      <button onClick={() => setCouponApplied(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,.35)", cursor:"pointer", fontSize:16, lineHeight:1 }}>×</button>
                    </div>
                  ) : (
                    <div style={{ display:"flex", gap:8 }}>
                      <input
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                        onKeyDown={e => e.key === "Enter" && applyCoupon()}
                        placeholder="Coupon code"
                        style={{ flex:1, padding:"9px 12px", borderRadius:9, background:"rgba(255,255,255,.05)", border:`1px solid ${couponError ? "rgba(248,113,113,.4)" : "rgba(255,255,255,.1)"}`, color:"white", fontSize:12, fontFamily:"inherit", outline:"none", letterSpacing:"1px" }}
                      />
                      <button onClick={applyCoupon} disabled={couponLoading || !couponInput.trim()} style={{ padding:"9px 14px", borderRadius:9, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.3)", color:"#a5b4fc", fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                        {couponLoading ? "…" : "Apply"}
                      </button>
                    </div>
                  )}
                  {couponError && <div style={{ fontSize:11, color:"#f87171", marginTop:5 }}>{couponError}</div>}
                </div>

                <div style={{ display:"flex", justifyContent:"space-between", padding:"14px 0 0", fontSize:14, fontWeight:800 }}>
                  <span style={{ color:"rgba(255,255,255,.6)" }}>Total today</span>
                  <div style={{ textAlign:"right" }}>
                    {couponApplied && <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", textDecoration:"line-through", fontWeight:400 }}>{displayPlanPrice}</div>}
                    <span style={{ color:meta.color }}>{displayFinalPrice}</span>
                  </div>
                </div>
                <div style={{ marginTop:16, padding:"12px 14px", borderRadius:12, background:"rgba(16,185,129,.08)", border:"1px solid rgba(16,185,129,.2)", display:"flex", alignItems:"center", gap:8, fontSize:11, color:"#6ee7b7" }}>
                  <span>🔒</span> 256-bit SSL encrypted checkout
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: OTP Verification ═══ */}
        {step === 2 && (
          <div className="fu" style={{ maxWidth:460, margin:"0 auto", textAlign:"center" }}>

            {/* Icon */}
            <div style={{ width:80, height:80, borderRadius:24, background:"rgba(99,102,241,.12)", border:"1.5px solid rgba(99,102,241,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:38, margin:"0 auto 24px" }}>
              🔐
            </div>

            <h2 style={{ margin:"0 0 8px", fontSize:26, fontWeight:800, letterSpacing:"-0.5px" }}>Verify Your Payment</h2>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.7, marginBottom:28 }}>
              We&apos;ve sent a 6-digit verification code to confirm your payment.<br/>
              {method==="card" ? "Check your email or SMS." : "Check your registered contact."}
            </p>

            {/* Email sent notice */}
            <div style={{ marginBottom:24, padding:"14px 18px", borderRadius:12, background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", fontSize:13, color:"rgba(255,255,255,.6)", lineHeight:1.6 }}>
              A verification code was sent to <strong style={{ color:"white" }}>{email}</strong>
            </div>

            {/* OTP boxes */}
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:20 }}>
              {otp.map((digit, i) => (
                <input key={i} id={`otp-${i}`}
                  value={digit} onChange={e=>handleOtpChange(i,e.target.value)} onKeyDown={e=>handleOtpKey(i,e)}
                  maxLength={1} inputMode="numeric"
                  style={{
                    width:52, height:60, borderRadius:14, textAlign:"center",
                    fontSize:24, fontWeight:800, fontFamily:"monospace",
                    background: digit ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.05)",
                    border: `2px solid ${digit ? "rgba(99,102,241,.7)" : "rgba(255,255,255,.1)"}`,
                    color:"white", outline:"none", transition:"all .2s",
                  }}
                />
              ))}
            </div>

            {otpError && (
              <div style={{ marginBottom:16, padding:"10px 16px", borderRadius:10, background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", color:"#fca5a5", fontSize:12 }}>
                {otpError}
              </div>
            )}

            <button onClick={handleVerify} disabled={activating}
              style={{
                width:"100%", padding:"16px", borderRadius:14, border:"none",
                background: activating ? "rgba(255,255,255,.06)" : "linear-gradient(135deg,#6366f1,#7c3aed)",
                color: activating ? "rgba(255,255,255,.3)" : "white",
                fontSize:15, fontWeight:800, cursor: activating?"not-allowed":"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                fontFamily:"inherit", boxShadow: activating?"none":"0 6px 28px rgba(99,102,241,.4)",
              }}>
              {activating ? (
                <><svg width="18" height="18" viewBox="0 0 24 24" style={{ animation:"spin 1s linear infinite" }}><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" strokeDasharray="60" strokeDashoffset="20"/></svg> Activating Plan…</>
              ) : (
                <>✓ Verify &amp; Activate Plan</>
              )}
            </button>

            <div style={{ marginTop:12, display:"flex", alignItems:"center", justifyContent:"center", gap:16 }}>
              <button onClick={() => setStep(1)} style={{ background:"none", border:"none", color:"rgba(255,255,255,.35)", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                ← Change payment method
              </button>
              <span style={{ color:"rgba(255,255,255,.15)", fontSize:12 }}>|</span>
              <button onClick={handleResendOtp} style={{ background:"none", border:"none", color:"rgba(129,140,248,.7)", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                Resend code
              </button>
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
              <style>{`
                @keyframes celebBounce { 0%{transform:scale(0) rotate(-10deg);opacity:0} 60%{transform:scale(1.15) rotate(3deg);opacity:1} 80%{transform:scale(.95) rotate(-1deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
                @keyframes celebFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
                @keyframes celebRing   { 0%{transform:scale(.8);opacity:0} 100%{transform:scale(2.2);opacity:0} }
                @keyframes confDrop    { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(80px) rotate(360deg);opacity:0} }
                @keyframes celebSlide  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
              `}</style>

              {/* Confetti dots */}
              <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
                {[...Array(18)].map((_,i) => (
                  <div key={i} style={{
                    position:"absolute",
                    left:`${8+i*5}%`, top:`${10+Math.sin(i)*20}%`,
                    width:8, height:8, borderRadius: i%3===0 ? "50%" : i%3===1 ? 2 : "1px 4px",
                    background: ["#6366f1","#34d399","#fbbf24","#f87171","#38bdf8","#a78bfa"][i%6],
                    animation:`confDrop ${1.2+i*0.12}s ease ${i*0.08}s forwards`,
                    opacity:0,
                  }}/>
                ))}
              </div>

              {/* Icon with rings */}
              <div style={{ position:"relative", width:140, height:140, margin:"0 auto 28px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {/* Expanding ring 1 */}
                <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`2px solid ${pm.color}`, opacity:0, animation:"celebRing 1.8s ease .3s infinite" }}/>
                {/* Expanding ring 2 */}
                <div style={{ position:"absolute", inset:10, borderRadius:"50%", border:`1.5px solid ${pm.color}`, opacity:0, animation:"celebRing 1.8s ease .7s infinite" }}/>
                {/* Glow bg */}
                <div style={{ position:"absolute", inset:14, borderRadius:"50%", background:`radial-gradient(circle, ${pm.dim} 0%, transparent 70%)` }}/>
                {/* Main icon circle */}
                <div style={{
                  width:90, height:90, borderRadius:"50%",
                  background:`linear-gradient(135deg, ${pm.gradientFrom}, ${pm.gradientTo})`,
                  border:`2px solid ${pm.border}`,
                  boxShadow:`0 0 40px ${pm.glow}, 0 0 80px ${pm.dim}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:40, animation:"celebBounce .8s cubic-bezier(.34,1.56,.64,1) both, celebFloat 3s ease 1s infinite",
                }}>
                  {pm.icon}
                </div>
              </div>

              {/* Title */}
              <div style={{ animation:"celebSlide .5s ease .3s both" }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:2, color:pm.color, marginBottom:8 }}>
                  Welcome to Finova
                </div>
                <h2 style={{ margin:"0 0 6px", fontSize:32, fontWeight:900, background:`linear-gradient(135deg, white 30%, ${pm.color})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  {pm.name} Activated!
                </h2>
                <p style={{ fontSize:14, color:"rgba(255,255,255,.45)", margin:"0 0 28px" }}>
                  Your account is ready. Taking you to your dashboard…
                </p>
              </div>

              {/* Perks */}
              <div style={{ background:"rgba(255,255,255,.04)", border:`1px solid ${pm.border}`, borderRadius:16, padding:"20px 24px", marginBottom:28, textAlign:"left", animation:"celebSlide .5s ease .5s both", opacity:0 }}>
                <div style={{ fontSize:11, fontWeight:700, color:pm.color, textTransform:"uppercase", letterSpacing:1, marginBottom:14 }}>
                  What&apos;s included in your plan
                </div>
                <div className="payment-perks-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px" }}>
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

              {/* Loading dots */}
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
