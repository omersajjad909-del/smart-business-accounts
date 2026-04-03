"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CURRENCY_LABEL, CURRENCY_SYMBOL, FX_USD, SUPPORTED_CURRENCIES,
  formatFromUSD,
} from "@/lib/currency";
import {
  getStoredCurrencyPreference,
  setStoredCurrencyPreference,
  FINOVA_CURRENCY_EVENT,
} from "@/lib/currencyPreference";

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis] as const;
}

type Prices = {
  starter:    { monthly: number; yearly: number };
  pro:        { monthly: number; yearly: number };
  enterprise: { monthly: number; yearly: number };
};

const DEFAULT_PRICES: Prices = {
  starter:    { monthly: 49,  yearly: 468  },
  pro:        { monthly: 99,  yearly: 948  },
  enterprise: { monthly: 249, yearly: 2388 },
};

const PLANS = [
  {
    key: "starter" as const,
    name: "Starter",
    slug: "starter",
    tagline: "For small businesses getting started",
    color: "#818cf8",
    glow: "rgba(129,140,248,.2)",
    featured: false,
    features: [
      { text: "Up to 5 users",            yes: true  },
      { text: "Invoicing & billing",       yes: true  },
      { text: "Ledger & trial balance",    yes: true  },
      { text: "Inventory management",      yes: true  },
      { text: "Basic reports",             yes: true  },
      { text: "Bank reconciliation",       yes: false },
      { text: "Multi-branch support",      yes: false },
      { text: "HR & Payroll",              yes: false },
      { text: "CRM",                       yes: false },
      { text: "Priority support",          yes: false },
    ],
    cta: "Get Started",
  },
  {
    key: "pro" as const,
    name: "Professional",
    slug: "professional",
    tagline: "Most popular for growing SMEs",
    color: "#a5b4fc",
    glow: "rgba(165,180,252,.28)",
    featured: true,
    features: [
      { text: "Up to 25 users",            yes: true  },
      { text: "Everything in Starter",     yes: true  },
      { text: "Bank reconciliation",       yes: true  },
      { text: "Multi-branch support",      yes: true  },
      { text: "HR & Payroll",              yes: true  },
      { text: "CRM",                       yes: true  },
      { text: "Advanced reports",          yes: true  },
      { text: "Role-based access",         yes: true  },
      { text: "Multi-company",             yes: true  },
      { text: "Priority support",          yes: false },
    ],
    cta: "Go Professional",
  },
  {
    key: "enterprise" as const,
    name: "Enterprise",
    slug: "enterprise",
    tagline: "Full power for large organizations",
    color: "#34d399",
    glow: "rgba(52,211,153,.2)",
    featured: false,
    features: [
      { text: "Unlimited users",           yes: true  },
      { text: "Everything in Pro",         yes: true  },
      { text: "Dedicated onboarding",      yes: true  },
      { text: "Custom integrations",       yes: true  },
      { text: "SLA guarantee",             yes: true  },
      { text: "Priority support 24/7",     yes: true  },
      { text: "White-label option",        yes: true  },
      { text: "Custom reporting",          yes: true  },
      { text: "Multi-currency",            yes: true  },
      { text: "API access",                yes: true  },
    ],
    cta: "Go Enterprise",
  },
  {
    key: "custom" as const,
    name: "Custom",
    slug: "custom",
    tagline: "Pay only for the modules you need",
    color: "#f97316",
    glow: "rgba(249,115,22,.2)",
    featured: false,
    features: [
      { text: "Choose only what you need", yes: true  },
      { text: "Per-module pricing",        yes: true  },
      { text: "Accounting & Ledger",       yes: true  },
      { text: "Invoicing",                 yes: true  },
      { text: "Add HR, CRM, POS & more",  yes: true  },
      { text: "Scales with your business", yes: true  },
      { text: "No unused modules",         yes: true  },
      { text: "Flexible user count",       yes: true  },
      { text: "Dedicated account manager", yes: true  },
      { text: "Custom contract terms",     yes: true  },
    ],
    cta: "Build Your Plan",
  },
];

function Check({ color }: { color: string }) {
  return (
    <div style={{ width:18, height:18, borderRadius:6, background:`${color}18`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width="9" height="9" viewBox="0 0 12 10" fill="none">
        <path d="M1 5.5L4.5 9 11 1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function Cross() {
  return (
    <div style={{ width:18, height:18, borderRadius:6, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
        <path d="M2 2l6 6M8 2L2 8" stroke="rgba(255,255,255,.18)" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function PlanCard({ plan, billing, prices, vis, i, currency }: {
  plan: typeof PLANS[0];
  billing: "monthly" | "yearly";
  prices: Prices;
  vis: boolean;
  i: number;
  currency: string;
}) {
  const [hov, setHov] = useState(false);
  const isCustom = plan.key === "custom";
  const raw      = isCustom ? null : prices[plan.key as keyof Prices];
  const priceUSD = raw ? (billing === "yearly" ? Math.round(raw.yearly / 12) : raw.monthly) : 0;
  const normalUSD= raw ? raw.monthly : 0;
  const first3USD= Math.round(priceUSD * 0.25); // 75% off
  const fmt      = (usd: number) => formatFromUSD(usd, currency);
  const sym      = CURRENCY_SYMBOL[currency] || currency;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 22, padding: "28px 24px",
        background: plan.featured
          ? `linear-gradient(160deg, rgba(99,102,241,.14), rgba(79,70,229,.08))`
          : hov ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.03)",
        border: `1.5px solid ${plan.featured ? plan.color + "60" : hov ? plan.color + "40" : "rgba(255,255,255,.08)"}`,
        display: "flex", flexDirection: "column",
        position: "relative", overflow: "hidden",
        boxShadow: plan.featured
          ? `0 24px 64px ${plan.glow}, 0 0 0 1px ${plan.color}25`
          : hov ? `0 16px 40px ${plan.glow}` : "none",
        opacity: vis ? 1 : 0,
        transform: vis ? (plan.featured ? "scale(1.03)" : "scale(1)") : "translateY(24px)",
        transition: `opacity .55s ease ${i * 100}ms, transform .55s ease ${i * 100}ms, background .25s, border .25s, box-shadow .25s`,
      }}
    >
      {/* Top accent line */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${plan.color},transparent)`, opacity: plan.featured ? 1 : hov ? .7 : 0, transition:"opacity .3s" }}/>

      {/* Corner glow */}
      <div style={{ position:"absolute", top:-40, right:-40, width:140, height:140, borderRadius:"50%", background:`radial-gradient(circle,${plan.glow},transparent 70%)`, pointerEvents:"none", opacity: plan.featured ? 1 : hov ? .8 : .3, transition:"opacity .3s" }}/>

      {/* Most popular badge */}
      {plan.featured && (
        <div style={{ position:"absolute", top:16, right:16, padding:"4px 12px", borderRadius:20, background:`linear-gradient(135deg,${plan.color},#6366f1)`, fontSize:10, fontWeight:800, color:"white", letterSpacing:".06em", boxShadow:`0 4px 12px ${plan.glow}` }}>
          MOST POPULAR
        </div>
      )}

      {/* Plan name */}
      <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"4px 12px", borderRadius:20, marginBottom:14, alignSelf:"flex-start", background:`${plan.color}12`, border:`1px solid ${plan.color}25`, fontSize:11, fontWeight:700, color:plan.color }}>
        {plan.name}
      </div>

      <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginBottom:22, lineHeight:1.5 }}>{plan.tagline}</p>

      {/* Price */}
      <div style={{ marginBottom:8 }}>
        {isCustom ? (
          <>
            <div style={{ fontSize:38, fontWeight:900, color:"white", letterSpacing:"-1.5px", lineHeight:1, fontFamily:"'Lora',serif", marginBottom:6 }}>
              Your price
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:6 }}>
              Based on modules you select
            </div>
          </>
        ) : (
          <>
            {/* Original price + 75% off badge — small row */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:13, color:"rgba(255,255,255,.35)", textDecoration:"line-through" }}>{fmt(normalUSD)}/mo</span>
              <span style={{ padding:"2px 8px", borderRadius:6, background:"rgba(249,115,22,.2)", border:"1px solid rgba(249,115,22,.4)", fontSize:10, fontWeight:800, color:"#fb923c" }}>
                75% OFF × 3 months
              </span>
            </div>
            {/* Discounted price — big */}
            <div style={{ display:"flex", alignItems:"baseline", gap:3, marginBottom:6 }}>
              <span style={{ fontSize:15, fontWeight:700, color:"rgba(255,255,255,.6)" }}>{sym}</span>
              <span style={{ fontSize:52, fontWeight:900, color:"white", letterSpacing:"-2px", lineHeight:1, fontFamily:"'Lora',serif" }}>
                {formatFromUSD(first3USD, currency).replace(/[^0-9.,]/g, "")}
              </span>
              <span style={{ fontSize:13, color:"rgba(255,255,255,.4)", fontWeight:500 }}>/mo</span>
            </div>
            {/* Sub note */}
            <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:2 }}>
              {billing === "yearly" && raw
                ? `Billed annually ${fmt(raw.yearly)}/yr — saves ${fmt((normalUSD * 12) - raw.yearly)}/yr`
                : "First 3 months discounted, then full monthly billing"}
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: 8 }} />

      {/* CTA */}
      <Link href={isCustom ? "/onboarding/choose-plan?plan=custom" : `/onboarding/signup/${plan.slug}`} style={{
        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        padding:"13px 20px", borderRadius:12, marginBottom:24,
        background: plan.featured
          ? `linear-gradient(135deg,${plan.color},#6366f1)`
          : `rgba(${plan.featured?"99,102,241":"255,255,255"},.08)`,
        color: "white", fontWeight:700, fontSize:14, textDecoration:"none",
        border: plan.featured ? "none" : `1.5px solid ${plan.color}35`,
        boxShadow: plan.featured ? `0 6px 20px ${plan.glow}` : "none",
        transition:"all .25s",
      }}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 10px 28px ${plan.glow}`;}}
        onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=plan.featured?`0 6px 20px ${plan.glow}`:"none";}}
      >
        {plan.cta}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </Link>

      {/* Feature list */}
      <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
        {plan.features.map((f, fi) => (
          <div key={fi} style={{ display:"flex", alignItems:"center", gap:10 }}>
            {f.yes ? <Check color={plan.color}/> : <Cross/>}
            <span style={{ fontSize:13, color: f.yes ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.28)", fontWeight: f.yes ? 500 : 400 }}>
              {f.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PricingSection() {
  const [ref, vis]      = useInView();
  const [billing, setBilling] = useState<"monthly"|"yearly">("monthly");
  const [prices, setPrices]   = useState<Prices>(DEFAULT_PRICES);
  const [currency, setCurrency] = useState<string>("USD");
  const [country,  setCountry]  = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/pricing")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.pricing) setPrices({ ...DEFAULT_PRICES, ...d.pricing }); })
      .catch(() => {});
  }, []);

  // Auto-detect currency from location
  useEffect(() => {
    const stored = getStoredCurrencyPreference();
    if (stored.currency && FX_USD[stored.currency]) {
      setCurrency(stored.currency);
      if (stored.country) setCountry(stored.country);
    }
    if (!stored.currency || !stored.country) {
      fetch("/api/public/geo")
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.currency && FX_USD[d.currency]) {
            setCurrency(d.currency);
            setStoredCurrencyPreference(d.currency, d.country || null);
            if (d.country) setCountry(d.country);
          }
        })
        .catch(() => {});
    }
    const onCurrencyChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ currency?: string; country?: string | null }>).detail;
      if (detail?.currency && FX_USD[detail.currency]) setCurrency(detail.currency);
    };
    window.addEventListener(FINOVA_CURRENCY_EVENT, onCurrencyChanged as EventListener);
    return () => window.removeEventListener(FINOVA_CURRENCY_EVENT, onCurrencyChanged as EventListener);
  }, []);

  function handleCurrencyChange(code: string) {
    setCurrency(code);
    setStoredCurrencyPreference(code, country);
    window.dispatchEvent(new CustomEvent(FINOVA_CURRENCY_EVENT, { detail: { currency: code, country } }));
  }

  function price(usd: number) {
    return formatFromUSD(usd, currency);
  }

  return (
    <section style={{
      background:"linear-gradient(180deg,#070a1e 0%,#080c22 50%,#0a0d28 100%)",
      padding:"100px 24px",
      fontFamily:"'Outfit',sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orb{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-15px)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
        @media(max-width:1024px){.pricing-grid{grid-template-columns:repeat(2,1fr) !important;}}
        @media(max-width:580px){.pricing-grid{grid-template-columns:1fr !important;}}
      `}</style>

      {/* BG */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",backgroundSize:"52px 52px"}}/>
        <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",top:-80,left:"50%",transform:"translateX(-50%)",background:"radial-gradient(circle,rgba(99,102,241,.1),transparent 65%)",animation:"orb 16s ease-in-out infinite"}}/>
        <div style={{position:"absolute",top:0,left:"10%",right:"10%",height:1,background:"linear-gradient(90deg,transparent,rgba(99,102,241,.3),transparent)"}}/>
        <div style={{position:"absolute",bottom:0,left:"10%",right:"10%",height:1,background:"linear-gradient(90deg,transparent,rgba(99,102,241,.15),transparent)"}}/>
      </div>

      <div ref={ref} style={{maxWidth:1160,margin:"0 auto",position:"relative"}}>

        {/* Header */}
        <div style={{
          textAlign:"center", marginBottom:52,
          opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(24px)",
          transition:"all .6s cubic-bezier(.22,1,.36,1)",
        }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:8, padding:"6px 16px",borderRadius:100,marginBottom:20, background:"rgba(251,191,36,.1)",border:"1.5px solid rgba(251,191,36,.22)" }}>
            <span style={{fontSize:14}}>🏷️</span>
            <span style={{fontSize:11,fontWeight:700,color:"#fbbf24",letterSpacing:".08em"}}>LIMITED TIME OFFER</span>
          </div>
          <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(30px,4vw,50px)", fontWeight:700, color:"white", letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:16 }}>
            Simple, transparent{" "}
            <span style={{background:"linear-gradient(135deg,#818cf8,#6366f1,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              pricing
            </span>
          </h2>
          <p style={{fontSize:16,color:"rgba(255,255,255,.4)",lineHeight:1.8,maxWidth:480,margin:"0 auto 32px"}}>
            75% off for your first 3 months. No hidden fees. Cancel anytime.
          </p>

          {/* Monthly / Yearly toggle + Currency selector row */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, flexWrap:"wrap" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:0, borderRadius:12, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", padding:4 }}>
              {(["monthly","yearly"] as const).map(b => (
                <button key={b} onClick={() => setBilling(b)} style={{
                  padding:"8px 22px", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer",
                  background: billing===b ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "transparent",
                  color: billing===b ? "white" : "rgba(255,255,255,.45)",
                  border:"none", transition:"all .25s", fontFamily:"inherit",
                  boxShadow: billing===b ? "0 4px 12px rgba(99,102,241,.4)" : "none",
                }}>
                  {b === "monthly" ? "Monthly" : "Yearly"}
                  {b === "yearly" && (
                    <span style={{ marginLeft:6, fontSize:10, fontWeight:800, color: billing==="yearly" ? "#fbbf24" : "rgba(251,191,36,.5)", background:"rgba(251,191,36,.12)", padding:"1px 6px", borderRadius:6 }}>
                      −20%
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Currency selector */}
            <div style={{
              display:"inline-flex", alignItems:"center", gap:6,
              padding:"4px 6px 4px 10px", borderRadius:12,
              background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.09)",
            }}>
              <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.5)" }}>
                {CURRENCY_SYMBOL[currency] || currency}
              </span>
              <select
                aria-label="Select currency"
                value={currency}
                onChange={e => handleCurrencyChange(e.target.value)}
                style={{
                  background:"transparent", border:"none",
                  color:"rgba(255,255,255,.8)", fontSize:12, fontWeight:700,
                  outline:"none", cursor:"pointer", fontFamily:"inherit",
                  padding:"4px 2px",
                }}
              >
                {SUPPORTED_CURRENCIES.map(code => (
                  <option key={code} value={code} style={{ background:"#1e1b4b" }}>
                    {code} — {CURRENCY_LABEL[code]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="pricing-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:48, alignItems:"start" }}>
          {PLANS.map((plan, i) => (
            <PlanCard key={plan.key} plan={plan} billing={billing} prices={prices} vis={vis} i={i} currency={currency} />
          ))}
        </div>

        {/* Trust strip */}
        <div style={{
          opacity:vis?1:0, transition:"opacity .6s ease .4s",
          display:"flex", justifyContent:"center", gap:32, flexWrap:"wrap",
        }}>
          {[
            { icon:"🔒", text:"Secure payments" },
            { icon:"🔄", text:"Cancel anytime" },
            { icon:"🌍", text:"Global coverage" },
            { icon:"💬", text:"24/7 support" },
            { icon:"🚀", text:"Setup in minutes" },
          ].map(t => (
            <div key={t.text} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:"rgba(255,255,255,.35)", fontWeight:500 }}>
              <span>{t.icon}</span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>

        {/* Enterprise / Custom note */}
        <div style={{
          marginTop:48, textAlign:"center",
          opacity:vis?1:0, transition:"opacity .6s ease .5s",
        }}>
          <p style={{fontSize:13,color:"rgba(255,255,255,.3)",marginBottom:10}}>
            Need a custom plan? We build packages around your exact modules and team size.
          </p>
          <Link href="/pricing" style={{
            fontSize:13,fontWeight:700,color:"#818cf8",
            textDecoration:"none",borderBottom:"1px solid rgba(129,140,248,.3)",paddingBottom:1,
          }}>
            View full pricing & compare all features →
          </Link>
        </div>

      </div>
    </section>
  );
}
