"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FX_USD, formatFromUSD } from "@/lib/currency";
import {
  getStoredCurrencyPreference,
  setStoredCurrencyPreference,
} from "@/lib/currencyPreference";

/* ══════════════════════════════════════════════════════════
   TYPES & DATA — exact match with PricingSection.tsx
══════════════════════════════════════════════════════════ */
type BillingCycle = "monthly" | "yearly";

const PLANS = [
  {
    slug: "starter", name: "Starter", monthly: 49, featured: false,
    tagline: "For small businesses just getting started",
    color: "#818cf8", glow: "rgba(129,140,248,.22)", dim: "rgba(129,140,248,.08)", border: "rgba(129,140,248,.25)",
    gradientFrom: "#6366f1", gradientTo: "#4f46e5",
    features: [
      { text: "Up to 5 users", included: true },
      { text: "Basic accounting", included: true },
      { text: "Sales & purchase invoices", included: true },
      { text: "Chart of accounts", included: true },
      { text: "Bank reconciliation", included: true },
      { text: "Basic reports", included: true },
      { text: "Email support", included: true },
      { text: "Inventory management", included: false },
      { text: "Custom integrations", included: false },
      { text: "Advanced support", included: false },
    ],
    cta: "Get Started",
  },
  {
    slug: "professional", name: "Professional", monthly: 99, featured: true,
    tagline: "Most popular for growing businesses",
    color: "#a5b4fc", glow: "rgba(165,180,252,.28)", dim: "rgba(165,180,252,.1)", border: "rgba(165,180,252,.5)",
    gradientFrom: "#818cf8", gradientTo: "#6366f1",
    features: [
      { text: "Up to 20 users", included: true },
      { text: "Advanced accounting", included: true },
      { text: "Multi-branch support", included: true },
      { text: "Inventory management", included: true },
      { text: "Financial reports", included: true },
      { text: "Expense management", included: true },
      { text: "Payment reconciliation", included: true },
      { text: "Priority email support", included: true },
      { text: "Audit logging", included: true },
      { text: "Custom integrations", included: false },
      { text: "Advanced support", included: false },
    ],
    cta: "Go Professional",
  },
  {
    slug: "enterprise", name: "Enterprise", monthly: 249, featured: false,
    tagline: "Tailored for larger teams with more rollout support",
    color: "#c4b5fd", glow: "rgba(196,181,253,.22)", dim: "rgba(196,181,253,.07)", border: "rgba(196,181,253,.22)",
    gradientFrom: "#7c3aed", gradientTo: "#6d28d9",
    features: [
      { text: "Unlimited users", included: true },
      { text: "Full accounting suite", included: true },
      { text: "Advanced inventory", included: true },
      { text: "Custom reports", included: true },
      { text: "Guided onboarding", included: true },
      { text: "Enhanced support coverage", included: true },
      { text: "Custom integrations", included: true },
      { text: "Implementation planning", included: true },
      { text: "Advanced audit trails", included: true },
      { text: "Expanded admin controls", included: true },
    ],
    cta: "Go Enterprise",
  },
];

const MODULES = [
  { id:"accounting",          name:"Accounting & Invoicing", icon:"📊", price:15 },
  { id:"crm",                 name:"CRM",                    icon:"👥", price:15 },
  { id:"hr_payroll",          name:"HR & Payroll",           icon:"👨‍💼", price:20 },
  { id:"bank_reconciliation", name:"Bank Reconciliation",    icon:"🏦", price:10 },
  { id:"inventory",           name:"Inventory",              icon:"📦", price:12 },
  { id:"reports",             name:"Advanced Reports",       icon:"📈", price:8  },
  { id:"multi_branch",        name:"Multi-Branch",           icon:"🏢", price:15 },
  { id:"whatsapp",            name:"WhatsApp / Slack",       icon:"💬", price:8  },
  { id:"api_access",          name:"API Access",             icon:"🔗", price:20 },
  { id:"tax_filing",          name:"Tax Filing",             icon:"🧾", price:10 },
];

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function CheckIcon({ color }: { color: string }) {
  return (
    <div style={{ width:18, height:18, borderRadius:"50%", background:`${color}18`, border:`1px solid ${color}35`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width="9" height="9" viewBox="0 0 12 10" fill="none">
        <path d="M1 5.5L4.5 9 11 1" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function CrossIcon() {
  return (
    <div style={{ width:18, height:18, borderRadius:"50%", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
        <path d="M2 2l6 6M8 2L2 8" stroke="rgba(255,255,255,.2)" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function ChoosePlanPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const ref          = useRef<HTMLDivElement>(null);

  const [billing,         setBilling]         = useState<BillingCycle>(
    (searchParams.get("cycle") || "").toLowerCase() === "yearly" ? "yearly" : "monthly"
  );
  const [visible,         setVisible]         = useState(false);
  const [showCustom,      setShowCustom]      = useState(
    (searchParams.get("plan") || "").toLowerCase() === "custom" && !searchParams.get("modules")
  );
  const [selectedModules, setSelectedModules] = useState<string[]>(["accounting"]);
  const [livePricing,     setLivePricing]     = useState<Record<string, {monthly:number; yearly:number}>>({});
  const [liveFeatures,    setLiveFeatures]    = useState<string[]>([]);
  const [liveFeatureMatrix, setLiveFeatureMatrix] = useState<Record<string, string[]>>({});
  const [currency, setCurrency] = useState<string>(searchParams.get("currency") || "USD");
  const [country, setCountry] = useState<string>(searchParams.get("country") || "US");
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  // Read cycle + plan from URL — auto-open custom module selector
  useEffect(() => {
    const c = (searchParams.get("cycle") || "").toLowerCase();
    const p = (searchParams.get("plan") || "").toLowerCase();
    const mods = searchParams.get("modules");
    if (p === "custom") {
      if (mods) {
        // Modules already chosen on pricing page — skip builder, go straight to signup
        const price = mods.split(",").reduce((sum, id) => sum + (MODULES.find(m => m.id === id)?.price || 0), 0);
        const cycle = c === "yearly" ? "yearly" : "monthly";
        router.replace(`/onboarding/signup/custom?modules=${mods}&price=${price}&cycle=${cycle}&currency=${currency}&country=${country}`);
      }
    }
  }, [searchParams]);

  // Live pricing + features from admin config
  useEffect(() => {
    fetch("/api/public/pricing")
      .then(r => r.json())
      .then(d => {
        if (d.pricing) setLivePricing(d.pricing);
        if (d.features) setLiveFeatures(d.features);
        if (d.featureMatrix) setLiveFeatureMatrix(d.featureMatrix);
      })
      .catch(() => {});
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

  // Intersection observer for animation
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.05 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const customPrice = useMemo(() =>
    selectedModules.reduce((sum, id) => sum + (MODULES.find(m => m.id === id)?.price || 0), 0),
    [selectedModules]
  );

  const formatPrice = (amountUsd: number) => formatFromUSD(amountUsd, currency, rates);
  const buildSignupHref = (slug: string) =>
    `/onboarding/signup/${slug}?cycle=${billing}&currency=${currency}&country=${country}`;
  const buildCustomSignupHref = (modules: string, price: number, cycle = billing) =>
    `/onboarding/signup/custom?modules=${modules}&price=${price}&cycle=${cycle}&currency=${currency}&country=${country}`;

  function getPrice(slug: string, fallbackMonthly: number) {
    // Map "professional" slug to "pro" key used by admin config
    const key = slug === "professional" ? "pro" : slug;
    const live = livePricing[key];
    if (live) return billing === "yearly" ? live.yearly : live.monthly;
    return billing === "yearly" ? Math.round(fallbackMonthly * 12) : fallbackMonthly;
  }

  function handlePlan(slug: string) {
    if (slug === "custom") { setShowCustom(true); return; }
    try {
      navigator.sendBeacon("/api/analytics", new Blob([JSON.stringify({ name:"plan_select", plan:slug, cycle:billing })], { type:"application/json" }));
    } catch {}
    router.push(`${buildSignupHref(slug)}`);
  }

  function handleCustomContinue() {
    if (selectedModules.length === 0) return;
    router.push(`${buildCustomSignupHref(selectedModules.join(","), customPrice)}`);
  }

  function toggleModule(id: string) {
    setSelectedModules(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(m => m !== id) : prev) : [...prev, id]
    );
  }

  return (
    <div ref={ref} style={{
      background: "linear-gradient(160deg,#06071a 0%,#0c0f2e 40%,#0f0c2e 70%,#080c1e 100%)",
      minHeight: "100vh",
      padding: "32px 24px 100px",
      fontFamily: "'Outfit','DM Sans',sans-serif",
      color: "white",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Lora:wght@700&display=swap');
        *,*::before,*::after { box-sizing:border-box; }
        @keyframes orbDrift { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(22px,-18px) scale(1.06)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @media(max-width:900px){ .plans-grid{grid-template-columns:1fr!important} }
      `}</style>

      {/* BG grid */}
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.05) 1px,transparent 1px)", backgroundSize:"48px 48px", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", width:560, height:560, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.13),transparent 65%)", top:-120, left:-100, animation:"orbDrift 14s ease-in-out infinite", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,.09),transparent 65%)", bottom:-80, right:-60, animation:"orbDrift 18s ease-in-out infinite reverse", pointerEvents:"none" }}/>

      {/* Custom Plan Builder Modal */}
      {showCustom && (
        <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(6,7,26,.95)", backdropFilter:"blur(20px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:640, background:"rgba(255,255,255,.04)", border:"1.5px solid rgba(255,255,255,.1)", borderRadius:24, padding:"36px 40px", position:"relative", boxShadow:"0 32px 80px rgba(0,0,0,.5)", maxHeight:"90vh", overflowY:"auto" }}>
            <button onClick={()=>setShowCustom(false)} style={{ position:"absolute", top:20, right:20, background:"none", border:"none", color:"rgba(255,255,255,.4)", cursor:"pointer", fontSize:24, lineHeight:1 }}>✕</button>

            <div style={{ marginBottom:28 }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 14px", borderRadius:22, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.25)", fontSize:11, fontWeight:800, color:"#34d399", letterSpacing:".06em", textTransform:"uppercase", marginBottom:14 }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:"#34d399",animation:"blink 2s ease infinite" }}/>
                Custom Plan Builder
              </div>
              <h2 style={{ fontFamily:"Lora,serif", fontSize:28, fontWeight:700, color:"white", margin:"0 0 8px" }}>Build Your Plan</h2>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", margin:0 }}>Select modules you need. Price updates in real time.</p>
            </div>

            {/* Module grid */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:32 }}>
              {MODULES.map(mod => {
                const on = selectedModules.includes(mod.id);
                return (
                  <div key={mod.id} onClick={()=>toggleModule(mod.id)}
                    style={{ padding:"14px 16px", borderRadius:14, cursor:"pointer", display:"flex", alignItems:"center", gap:12, transition:"all .2s",
                      background:on?"rgba(52,211,153,.1)":"rgba(255,255,255,.03)",
                      border:`1.5px solid ${on?"rgba(52,211,153,.4)":"rgba(255,255,255,.08)"}` }}>
                    <span style={{ fontSize:20 }}>{mod.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:on?"#34d399":"white", lineHeight:1.3 }}>{mod.name}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2 }}>{formatPrice(mod.price)}/mo</div>
                    </div>
                    <div style={{ width:18, height:18, borderRadius:"50%", background:on?"#34d399":"transparent", border:`1.5px solid ${on?"#34d399":"rgba(255,255,255,.2)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {on && <svg width="8" height="8" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4.5 9 11 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price + CTA */}
            <div style={{ borderTop:"1px solid rgba(255,255,255,.08)", paddingTop:24, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>
                  {selectedModules.length} module{selectedModules.length!==1?"s":""} · {billing==="yearly"?"Billed yearly (20% off)":"Monthly billing"}
                </div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:6 }}>
                  <span style={{ fontFamily:"Lora,serif", fontSize:40, fontWeight:700, color:"#34d399", lineHeight:1 }}>
                    {formatPrice(billing==="yearly" ? Math.round(customPrice*0.8) : customPrice)}
                  </span>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,.4)", paddingBottom:6 }}>/mo</span>
                </div>
              </div>
              <button onClick={handleCustomContinue} disabled={selectedModules.length===0}
                style={{ padding:"14px 28px", borderRadius:13, background:"linear-gradient(135deg,#059669,#34d399)", border:"none", color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer", opacity:selectedModules.length===0?.5:1, fontFamily:"inherit", transition:"all .2s", boxShadow:"0 4px 20px rgba(52,211,153,.3)" }}>
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ maxWidth:1120, margin:"0 auto", position:"relative" }}>

        {/* Top nav */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:36, flexWrap:"wrap", gap:12,
          opacity:visible?1:0, transition:"opacity .5s ease" }}>
          <Link href="/login" style={{ color:"rgba(255,255,255,.7)", fontWeight:600, fontSize:13, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:18 }}>←</span> Back to Login
          </Link>
          <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap", justifyContent:"flex-end" }}>
            <Link href="/pricing" style={{ fontSize:12, color:"#a5b4fc", fontWeight:700, textDecoration:"none" }}>
              View Full Pricing
            </Link>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", fontWeight:600 }}>Step 1 of 3 · Choose your plan</div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ textAlign:"center", marginBottom:52,
          opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(24px)",
          transition:"opacity .65s ease, transform .65s ease" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:24, background:"rgba(239,68,68,.1)", border:"1.5px solid rgba(239,68,68,.25)", fontSize:11, fontWeight:800, color:"#f87171", letterSpacing:".09em", textTransform:"uppercase", marginBottom:20 }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:"#f87171",animation:"blink 2s ease infinite" }}/>
            Choose Your Plan
          </div>

          <h1 style={{ fontFamily:"Lora,serif", fontSize:"clamp(30px,4vw,50px)", fontWeight:700, color:"white", letterSpacing:"-1.2px", lineHeight:1.1, marginBottom:14 }}>
            Simple, transparent{" "}
            <span style={{ background:"linear-gradient(135deg,#818cf8,#6366f1,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              pricing
            </span>
          </h1>

          <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:500, margin:"0 auto 28px", lineHeight:1.8 }}>
            One price per company. No per-seat fees. All plans include a 14-day free trial.
          </p>

          {/* Billing toggle */}
          <div style={{ display:"inline-flex", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:12, padding:4, gap:4 }}>
            {(["monthly","yearly"] as const).map(b => (
              <button key={b} onClick={()=>setBilling(b)}
                style={{ padding:"9px 24px", borderRadius:9, fontSize:13, fontWeight:600, fontFamily:"inherit", border:"none", cursor:"pointer", transition:"all .25s",
                  background:billing===b?"rgba(99,102,241,.8)":"transparent",
                  color:billing===b?"white":"rgba(255,255,255,.45)",
                  boxShadow:billing===b?"0 2px 12px rgba(99,102,241,.3)":"none",
                  display:"flex", alignItems:"center", gap:7 }}>
                {b === "monthly" ? "Monthly" : "Yearly"}
                {b === "yearly" && (
                  <span style={{ fontSize:10, fontWeight:800, padding:"2px 7px", borderRadius:8, background:billing==="yearly"?"rgba(52,211,153,.25)":"rgba(52,211,153,.12)", color:"#34d399", border:"1px solid rgba(52,211,153,.3)" }}>
                    −20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="plans-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:20, alignItems:"start", marginBottom:40 }}>
          {/* 3 fixed plans */}
          {PLANS.map((plan, i) => {
            const price = getPrice(plan.slug, plan.monthly);
            return (
              <div key={plan.slug}
                style={{
                  borderRadius:22, overflow:"hidden",
                  background: plan.featured ? "linear-gradient(160deg,#2d2b6b 0%,#1e1b55 40%,#1a1848 100%)" : "rgba(255,255,255,.04)",
                  border:`1.5px solid ${plan.featured ? plan.border : "rgba(255,255,255,.08)"}`,
                  backdropFilter:"blur(20px)",
                  position:"relative",
                  display:"flex", flexDirection:"column",
                  transition:"all .4s cubic-bezier(.22,1,.36,1)",
                  opacity:visible?1:0,
                  transform:visible ? (plan.featured?"translateY(-8px)":"translateY(0)") : "translateY(32px)",
                  transitionDelay:visible?`${i*80}ms`:"0ms",
                  boxShadow:plan.featured ? `0 28px 64px ${plan.glow}, 0 0 0 1px ${plan.border}` : "0 4px 24px rgba(0,0,0,.2)",
                  marginTop:plan.featured?-12:0,
                }}
                onMouseEnter={e=>{ e.currentTarget.style.transform=plan.featured?"translateY(-14px) scale(1.02)":"translateY(-6px)"; e.currentTarget.style.boxShadow=plan.featured?`0 36px 80px ${plan.glow}`:`0 20px 48px rgba(0,0,0,.3), 0 0 0 1px ${plan.color}30`; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform=plan.featured?"translateY(-8px)":"translateY(0)"; e.currentTarget.style.boxShadow=plan.featured?`0 28px 64px ${plan.glow}, 0 0 0 1px ${plan.border}`:"0 4px 24px rgba(0,0,0,.2)"; }}
              >
                {/* Glow orb */}
                <div style={{ position:"absolute", top:-60, right:-60, width:220, height:220, borderRadius:"50%", background:`radial-gradient(circle,${plan.glow},transparent 70%)`, pointerEvents:"none" }}/>

                {plan.featured && (
                  <div style={{ background:"linear-gradient(135deg,#fbbf24,#f59e0b)", padding:"9px 0", textAlign:"center", fontSize:11, fontWeight:800, color:"#0f172a", letterSpacing:".1em", textTransform:"uppercase" }}>
                    ✦ Most Popular
                  </div>
                )}

                <div style={{ padding:"28px 26px", flex:1, display:"flex", flexDirection:"column", position:"relative" }}>
                  {/* Plan badge */}
                  <div style={{ marginBottom:18 }}>
                    <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:20, background:plan.dim, border:`1px solid ${plan.color}30`, fontSize:10, fontWeight:700, color:plan.color, letterSpacing:".09em", textTransform:"uppercase", marginBottom:8 }}>
                      <span style={{ width:5,height:5,borderRadius:"50%",background:plan.color }}/>
                      {plan.name}
                    </div>
                    <p style={{ fontSize:12.5, color:"rgba(255,255,255,.4)", margin:0 }}>{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div style={{ marginBottom:18 }}>
                    <div style={{ display:"flex", alignItems:"flex-end", gap:8, marginBottom:6 }}>
                      <div style={{ fontFamily:"Lora,serif", fontSize:50, fontWeight:700, color:"white", lineHeight:1, letterSpacing:"-2px" }}>
                        ${price}
                      </div>
                      <div style={{ paddingBottom:8, fontSize:12, color:"rgba(255,255,255,.35)", fontWeight:600 }}>
                        {billing === "monthly" ? "/mo" : "/yr"}
                      </div>
                    </div>
                    <div style={{ fontSize:12, color:plan.color, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      {billing === "monthly" ? "Billed monthly" : "Billed yearly"}
                    </div>
                  </div>

                  <div style={{ height:1, background:"rgba(255,255,255,.07)", marginBottom:16 }}/>

                  {/* Features */}
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:9, marginBottom:22 }}>
                    {plan.features.map(f => (
                      <div key={f.text} style={{ display:"flex", alignItems:"center", gap:10 }}>
                        {f.included ? <CheckIcon color={plan.color}/> : <CrossIcon/>}
                        <span style={{ fontSize:13, fontWeight:500, color:f.included?"rgba(255,255,255,.72)":"rgba(255,255,255,.25)", textDecoration:f.included?"none":"line-through" }}>
                          {f.text}
                        </span>
                      </div>
                    ))}
                    {/* Admin-defined custom features */}
                    {liveFeatures.filter(f => !plan.features.find(pf => pf.text === f)).map(f => {
                      const matrixKey = plan.slug === "professional" ? "pro" : plan.slug;
                      const included = liveFeatureMatrix[matrixKey]?.includes(f) ?? false;
                      return (
                        <div key={f} style={{ display:"flex", alignItems:"center", gap:10 }}>
                          {included ? <CheckIcon color={plan.color}/> : <CrossIcon/>}
                          <span style={{ fontSize:13, fontWeight:500, color:included?"rgba(255,255,255,.72)":"rgba(255,255,255,.25)", textDecoration:included?"none":"line-through" }}>
                            {f}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* CTA */}
                  <button onClick={()=>handlePlan(plan.slug)}
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"14px", borderRadius:13,
                      background:plan.featured ? `linear-gradient(135deg,${plan.color},#6366f1)` : `linear-gradient(135deg,${plan.color}33,${plan.color}18)`,
                      border:`1.5px solid ${plan.featured?"rgba(165,180,252,.5)":plan.color+"40"}`,
                      color:plan.featured?"white":plan.color,
                      fontWeight:800, fontSize:14, fontFamily:"inherit", cursor:"pointer",
                      boxShadow:plan.featured?"0 6px 24px rgba(99,102,241,.4)":"none",
                      transition:"all .25s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=plan.featured?"0 10px 32px rgba(99,102,241,.5)":"none"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=plan.featured?"0 6px 24px rgba(99,102,241,.4)":"none"; }}
                  >
                    {plan.cta}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Custom Plan Card */}
          <div style={{
            borderRadius:22, overflow:"hidden",
            background:"rgba(255,255,255,.03)",
            border:"1.5px solid rgba(52,211,153,.25)",
            backdropFilter:"blur(20px)",
            display:"flex", flexDirection:"column",
            transition:"all .4s cubic-bezier(.22,1,.36,1)",
            opacity:visible?1:0,
            transform:visible?"translateY(0)":"translateY(32px)",
            transitionDelay:visible?"320ms":"0ms",
            boxShadow:"0 4px 24px rgba(0,0,0,.2)",
            position:"relative",
          }}
            onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-6px)"; e.currentTarget.style.borderColor="rgba(52,211,153,.5)"; e.currentTarget.style.boxShadow="0 20px 48px rgba(52,211,153,.1)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="rgba(52,211,153,.25)"; e.currentTarget.style.boxShadow="0 4px 24px rgba(0,0,0,.2)"; }}
          >
            <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle,rgba(52,211,153,.1),transparent 70%)", pointerEvents:"none" }}/>

            <div style={{ padding:"28px 26px", flex:1, display:"flex", flexDirection:"column", position:"relative" }}>
              <div style={{ marginBottom:18 }}>
                <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:20, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.3)", fontSize:10, fontWeight:700, color:"#34d399", letterSpacing:".09em", textTransform:"uppercase", marginBottom:8 }}>
                  <span style={{ width:5,height:5,borderRadius:"50%",background:"#34d399",animation:"blink 2s ease infinite" }}/>
                  Custom
                </div>
                <p style={{ fontSize:12.5, color:"rgba(255,255,255,.4)", margin:0 }}>Pay only for what you need</p>
              </div>

              {/* Dynamic price */}
              <div style={{ marginBottom:18 }}>
                <div style={{ display:"flex", alignItems:"flex-end", gap:8, marginBottom:6 }}>
                  <div style={{ fontFamily:"Lora,serif", fontSize:50, fontWeight:700, color:"#34d399", lineHeight:1, letterSpacing:"-2px" }}>
                    $
                    <span style={{ fontSize:32 }}>—</span>
                  </div>
                </div>
                <div style={{ fontSize:12, color:"#34d399", fontWeight:600 }}>Price calculated from modules</div>
              </div>

              <div style={{ height:1, background:"rgba(255,255,255,.07)", marginBottom:16 }}/>

              {/* Module preview */}
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:7, marginBottom:22 }}>
                {[
                  { icon:"📊", text:"Accounting & Invoicing" },
                  { icon:"👥", text:"CRM" },
                  { icon:"👨‍💼", text:"HR & Payroll" },
                  { icon:"📦", text:"Inventory" },
                  { icon:"🏦", text:"Bank Reconciliation" },
                  { icon:"🔗", text:"API Access" },
                ].map(m => (
                  <div key={m.text} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:18, height:18, borderRadius:"50%", background:"rgba(52,211,153,.12)", border:"1px solid rgba(52,211,153,.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:10 }}>+</div>
                    <span style={{ fontSize:13, fontWeight:500, color:"rgba(255,255,255,.65)" }}>{m.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button onClick={()=>setShowCustom(true)}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"14px", borderRadius:13,
                  background:"linear-gradient(135deg,rgba(52,211,153,.2),rgba(52,211,153,.1))",
                  border:"1.5px solid rgba(52,211,153,.4)",
                  color:"#34d399", fontWeight:800, fontSize:14, fontFamily:"inherit", cursor:"pointer", transition:"all .25s" }}
                onMouseEnter={e=>{ e.currentTarget.style.background="linear-gradient(135deg,rgba(52,211,153,.3),rgba(52,211,153,.15))"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="linear-gradient(135deg,rgba(52,211,153,.2),rgba(52,211,153,.1))"; }}
              >
                Build My Plan
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:28,
          opacity:visible?1:0, transition:"opacity .6s ease .5s" }}>
          {[
            { icon:"🔒", label:"256-bit SSL" },
              { icon:"💳", label:"Secure hosted checkout" },
            { icon:"🔄", label:"Cancel anytime" },
            { icon:"📦", label:"Price per company" },
            { icon:"⚡", label:"Setup in 10 minutes" },
            { icon:"🎯", label:"14-day free trial" },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12.5, color:"rgba(255,255,255,.35)", fontWeight:500 }}>
              <span style={{ fontSize:15 }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

