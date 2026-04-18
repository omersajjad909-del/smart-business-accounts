"use client";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CURRENCY_SYMBOL, FX_USD, currencyByCountry } from "@/lib/currency";
import {
  getStoredCurrencyPreference,
  setStoredCurrencyPreference,
} from "@/lib/currencyPreference";
import { COUNTRIES, sortCountries } from "@/lib/countries";
import { BUSINESS_TYPES } from "@/lib/businessModules";
import { clearCurrentUser, getCurrentUser } from "@/lib/auth";

/* â”€â”€â”€ Country dial codes â”€â”€â”€ */
const DIAL_CODES: Record<string, string> = {
  AF:"93",AL:"355",DZ:"213",AD:"376",AO:"244",AG:"1268",AR:"54",AM:"374",
  AU:"61",AT:"43",AZ:"994",BS:"1242",BH:"973",BD:"880",BB:"1246",BY:"375",
  BE:"32",BZ:"501",BJ:"229",BT:"975",BO:"591",BA:"387",BW:"267",BR:"55",
  BN:"673",BG:"359",BF:"226",BI:"257",CV:"238",KH:"855",CM:"237",CA:"1",
  CF:"236",TD:"235",CL:"56",CN:"86",CO:"57",KM:"269",CG:"242",CD:"243",
  CR:"506",HR:"385",CU:"53",CY:"357",CZ:"420",DK:"45",DJ:"253",DM:"1767",
  DO:"1809",EC:"593",EG:"20",SV:"503",GQ:"240",ER:"291",EE:"372",SZ:"268",
  ET:"251",FJ:"679",FI:"358",FR:"33",GA:"241",GM:"220",GE:"995",DE:"49",
  GH:"233",GR:"30",GD:"1473",GT:"502",GN:"224",GW:"245",GY:"592",HT:"509",
  HN:"504",HU:"36",IS:"354",IN:"91",ID:"62",IR:"98",IQ:"964",IE:"353",
  IL:"972",IT:"39",JM:"1876",JP:"81",JO:"962",KZ:"7",KE:"254",KI:"686",
  KP:"850",KR:"82",KW:"965",KG:"996",LA:"856",LV:"371",LB:"961",LS:"266",
  LR:"231",LY:"218",LI:"423",LT:"370",LU:"352",MG:"261",MW:"265",MY:"60",
  MV:"960",ML:"223",MT:"356",MH:"692",MR:"222",MU:"230",MX:"52",FM:"691",
  MD:"373",MC:"377",MN:"976",ME:"382",MA:"212",MZ:"258",MM:"95",NA:"264",
  NR:"674",NP:"977",NL:"31",NZ:"64",NI:"505",NE:"227",NG:"234",NO:"47",
  OM:"968",PK:"92",PW:"680",PA:"507",PG:"675",PY:"595",PE:"51",PH:"63",
  PL:"48",PT:"351",QA:"974",RO:"40",RU:"7",RW:"250",KN:"1869",LC:"1758",
  VC:"1784",WS:"685",SM:"378",ST:"239",SA:"966",SN:"221",RS:"381",SC:"248",
  SL:"232",SG:"65",SK:"421",SI:"386",SB:"677",SO:"252",ZA:"27",SS:"211",
  ES:"34",LK:"94",SD:"249",SR:"597",SE:"46",CH:"41",SY:"963",TW:"886",
  TJ:"992",TZ:"255",TH:"66",TL:"670",TG:"228",TO:"676",TT:"1868",TN:"216",
  TR:"90",TM:"993",TV:"688",UG:"256",UA:"380",AE:"971",GB:"44",US:"1",
  UY:"598",UZ:"998",VU:"678",VE:"58",VN:"84",YE:"967",ZM:"260",ZW:"263",
};

// reverse lookup: dial â†’ country code
const DIAL_TO_COUNTRY: Record<string, string> = {};
Object.entries(DIAL_CODES).forEach(([cc, dial]) => {
  if (!DIAL_TO_COUNTRY[dial]) DIAL_TO_COUNTRY[dial] = cc;
});

const PLAN_CONFIG = {
  starter: {
    name: "Starter",
    tagline: "Perfect for growing businesses",
    color: "#818cf8",
    glow: "rgba(129,140,248,.35)",
    dim: "rgba(129,140,248,.1)",
    border: "rgba(129,140,248,.3)",
    gradientFrom: "#6366f1",
    gradientTo: "#4f46e5",
    bullets: [
      { icon: "billing", text: "Invoices & Billing" },
      { icon: "ledger", text: "Ledger & Trial Balance" },
      { icon: "company", text: "Multi-company Support" },
    ],
  },
  pro: {
    name: "Professional",
    tagline: "For established teams that need more",
    color: "#34d399",
    glow: "rgba(52,211,153,.35)",
    dim: "rgba(52,211,153,.1)",
    border: "rgba(52,211,153,.3)",
    gradientFrom: "#10b981",
    gradientTo: "#059669",
    bullets: [
      { icon: "reports", text: "Advanced Reports" },
      { icon: "bank", text: "Bank Reconciliation" },
      { icon: "access", text: "Role-based Access Control" },
    ],
  },
  enterprise: {
    name: "Enterprise",
    tagline: "Tailored for complex organizations",
    color: "#fbbf24",
    glow: "rgba(251,191,36,.35)",
    dim: "rgba(251,191,36,.1)",
    border: "rgba(251,191,36,.3)",
    gradientFrom: "#f59e0b",
    gradientTo: "#d97706",
    bullets: [
      { icon: "integrations", text: "Custom Integrations" },
      { icon: "support", text: "Enhanced Support Coverage" },
      { icon: "onboarding", text: "Guided Onboarding" },
    ],
  },
  custom: {
    name: "Custom Plan",
    tagline: "Tailored to your specific needs",
    color: "#34d399",
    glow: "rgba(52,211,153,.35)",
    dim: "rgba(52,211,153,.1)",
    border: "rgba(52,211,153,.3)",
    gradientFrom: "#10b981",
    gradientTo: "#059669",
    bullets: [
      { icon: "modules", text: "Selected Modules Only" },
      { icon: "pricing", text: "Pay-as-you-go Pricing" },
      { icon: "scale", text: "Scalable Infrastructure" },
    ],
  },
} as const;

function ProgressStep({ step, label, active, done }: { step: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <div style={{
        width:32, height:32, borderRadius:"50%",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:12, fontWeight:700, transition:"all .4s",
        background: done ? "#34d399" : active ? "#6366f1" : "rgba(255,255,255,.06)",
        color: done||active ? "white" : "rgba(255,255,255,.25)",
        border: active ? "2px solid rgba(129,140,248,.6)" : done ? "2px solid #34d399" : "2px solid rgba(255,255,255,.08)",
        boxShadow: active ? "0 0 16px rgba(99,102,241,.5)" : done ? "0 0 12px rgba(52,211,153,.4)" : "none",
        transform: active ? "scale(1.1)" : "scale(1)",
      }}>
        {done ? "✓" : step}
      </div>
      <span style={{
        fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase",
        color: active ? "#a5b4fc" : done ? "#6ee7b7" : "rgba(255,255,255,.22)",
      }}>
        {label}
      </span>
    </div>
  );
}

function SidebarIcon({ icon, color }: { icon: string; color: string }) {
  const props = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.9,
  };

  switch (icon) {
    case "billing":
      return <svg {...props}><path d="M7 3h10v18l-5-3-5 3V3z" /></svg>;
    case "ledger":
      return <svg {...props}><path d="M5 6h14M5 12h14M5 18h10" /></svg>;
    case "company":
      return <svg {...props}><path d="M4 20V8l8-4 8 4v12M9 20v-5h6v5" /></svg>;
    case "reports":
      return <svg {...props}><path d="M6 17l4-4 3 3 5-6" /><path d="M6 20h12" /></svg>;
    case "bank":
      return <svg {...props}><path d="M3 10l9-5 9 5" /><path d="M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18" /></svg>;
    case "access":
      return <svg {...props}><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /></svg>;
    case "integrations":
      return <svg {...props}><path d="M8 8h4v4H8zM12 12h4v4h-4zM12 8l4-4M8 12l-4 4" /></svg>;
    case "support":
      return <svg {...props}><path d="M12 20v-2M8 20h8M6 10a6 6 0 1112 0c0 2-1 3-2 4-1 .9-2 1.5-2 4h-4c0-2.5-1-3.1-2-4-1-1-2-2-2-4z" /></svg>;
    case "onboarding":
      return <svg {...props}><path d="M5 19L19 5M11 5h8v8M5 19h5" /></svg>;
    case "modules":
      return <svg {...props}><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></svg>;
    case "pricing":
      return <svg {...props}><path d="M12 3v18" /><path d="M16.5 7.5c0-1.7-1.9-3-4.5-3S7.5 5.8 7.5 7.5 9.4 10 12 10s4.5 1.3 4.5 3-1.9 3-4.5 3-4.5-1.3-4.5-3" /></svg>;
    default:
      return <svg {...props}><path d="M5 18L19 6" /><path d="M11 6h8v8" /><path d="M5 18h5" /></svg>;
  }
}

function TrustIcon({ kind, color }: { kind: string; color: string }) {
  const props = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.9,
  };

  switch (kind) {
    case "security":
      return <svg {...props}><path d="M12 3l7 3v5c0 5-3.2 8.7-7 10-3.8-1.3-7-5-7-10V6l7-3z" /></svg>;
    case "global":
      return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></svg>;
    case "flex":
      return <svg {...props}><path d="M5 12l4 4 10-10" /></svg>;
    default:
      return <svg {...props}><path d="M4 12h5l3-8 3 16 2-8h3" /></svg>;
  }
}

function FloatingInput({
  label, type = "text", value, onChange, required, autoComplete,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div style={{ position:"relative" }}>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required} autoComplete={autoComplete}
        style={{
          width:"100%", borderRadius:12,
          border:`1.5px solid ${focused ? "rgba(129,140,248,.6)" : "rgba(255,255,255,.09)"}`,
          background: focused ? "rgba(99,102,241,.08)" : "rgba(255,255,255,.04)",
          padding:"20px 16px 8px",
          fontSize:14, fontFamily:"inherit",
          color:"white", outline:"none", transition:"all .22s",
          boxShadow: focused ? "0 0 0 4px rgba(99,102,241,.1)" : "none",
        }}
      />
      <label style={{
        pointerEvents:"none", position:"absolute", left:16,
        fontWeight:600, transition:"all .2s",
        top: lifted ? 6 : 14,
        fontSize: lifted ? 10 : 14,
        letterSpacing: lifted ? ".08em" : "0",
        textTransform: lifted ? "uppercase" : "none",
        color: focused ? "#a5b4fc" : "rgba(255,255,255,.3)",
      }}>
        {label}
      </label>
    </div>
  );
}

/* â”€â”€â”€ Phone input with editable dial code prefix â”€â”€â”€ */
function PhoneInput({
  dialCode, onDialChange, phone, onPhoneChange, color,
}: {
  dialCode: string; onDialChange: (v: string) => void;
  phone: string; onPhoneChange: (v: string) => void; color: string;
}) {
  const [focused, setFocused] = useState<"dial"|"phone"|null>(null);
  const borderColor = focused ? "rgba(129,140,248,.6)" : "rgba(255,255,255,.09)";
  const bg         = focused ? "rgba(99,102,241,.08)"  : "rgba(255,255,255,.04)";

  return (
    <div style={{
      display:"flex", borderRadius:12, overflow:"hidden",
      border:`1.5px solid ${borderColor}`,
      background:bg,
      transition:"all .22s",
      boxShadow: focused ? "0 0 0 4px rgba(99,102,241,.1)" : "none",
    }}>
      {/* Dial code box */}
      <div style={{
        display:"flex", alignItems:"center", gap:4,
        padding:"0 10px 0 14px", borderRight:"1px solid rgba(255,255,255,.08)",
        flexShrink:0,
      }}>
        <span style={{ fontSize:12, color:"rgba(255,255,255,.3)", userSelect:"none" }}>+</span>
        <input
          type="text" value={dialCode}
          onChange={e => onDialChange(e.target.value.replace(/\D/g,"").slice(0,4))}
          onFocus={() => setFocused("dial")}
          onBlur={() => setFocused(null)}
          placeholder="92"
          maxLength={4}
          style={{
            width:36, background:"none", border:"none", outline:"none",
            fontSize:14, fontWeight:700, color,
            fontFamily:"inherit", padding:"14px 0",
          }}
        />
      </div>
      {/* Phone number */}
      <input
        type="tel" value={phone}
        onChange={e => onPhoneChange(e.target.value.replace(/[^\d\s\-]/g,""))}
        onFocus={() => setFocused("phone")}
        onBlur={() => setFocused(null)}
        placeholder="300 1234567"
        autoComplete="tel"
        style={{
          flex:1, background:"none", border:"none", outline:"none",
          padding:"14px 14px", fontSize:14,
          color:"white", fontFamily:"inherit",
        }}
      />
    </div>
  );
}

export default function SignupByPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams() as { plan?: string };
  const planCode = String(params?.plan || "").toLowerCase();
  const current = PLAN_CONFIG[planCode as keyof typeof PLAN_CONFIG] || PLAN_CONFIG.starter;

  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState<keyof typeof FX_USD>("USD");
  const billingCycle = useMemo(
    () => ((searchParams.get("cycle") || "").toLowerCase() === "yearly" ? "yearly" : "monthly"),
    [searchParams]
  );

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/public/pricing", { cache:"no-store" });
        if (!r.ok) return;
        const j = await r.json();
        const p = j?.pricing;
        if (!p) return;
        const stored = getStoredCurrencyPreference();
        const requestedCurrency = searchParams.get("currency");
        let cur: keyof typeof FX_USD =
          requestedCurrency && FX_USD[requestedCurrency]
            ? (requestedCurrency as keyof typeof FX_USD)
            : stored.currency && FX_USD[stored.currency]
              ? (stored.currency as keyof typeof FX_USD)
              : "USD";
        try {
          if (!requestedCurrency && !stored.currency) {
            const g = await fetch("/api/public/geo", { cache:"no-store" });
            if (g.ok) { const gj = await g.json(); if (gj?.currency && FX_USD[gj.currency]) cur = gj.currency; }
          }
        } catch {}
        let rates: Record<string, number> | null = null;
        try {
          const f = await fetch("/api/public/fx", { cache:"no-store" });
          if (f.ok) { const fj = await f.json(); if (fj?.rates) rates = fj.rates; }
        } catch {}
        setCurrency(cur);
        const baseMonthly = planCode === "pro" ? p.pro.monthly : planCode === "enterprise" ? p.enterprise.monthly : planCode === "starter" ? p.starter.monthly : null;
        if (baseMonthly !== null) {
          const rate = (rates && rates[cur]) || FX_USD[cur] || 1;
          const sym = CURRENCY_SYMBOL[cur] || "";
          const usd = billingCycle === "yearly" ? Math.round(baseMonthly * 12 * 0.8) : Math.round(baseMonthly * 0.25);
          const localized = Math.round((usd * rate + Number.EPSILON) * 100) / 100;
          setPrice(`${sym}${localized}`);
        }
      } catch {}
    })();
  }, [planCode, billingCycle, searchParams]);

  // Allow demo users to move into a paid signup flow instead of bouncing back to the demo dashboard.
  useEffect(() => {
    try {
      const user = getCurrentUser();
      if (user?.email === "finovaos.app@gmail.com") {
        clearCurrentUser();
        return;
      }
      if (user?.id) {
        clearCurrentUser();
      }
    } catch {}
  }, [router]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("PK");
  const [dialCode, setDialCode] = useState("92");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("United States");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string>(
    searchParams.get("businessType") || ""
  );
  const [teamSize, setTeamSize] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [liveTypes, setLiveTypes] = useState<{ id: string; label: string; category: string; description: string }[]>([]);

  useEffect(() => {
    fetch("/api/public/business-types")
      .then(r => r.json())
      .then(d => {
        const live = (d.types || []).filter((t: { isLive: boolean }) => t.isLive);
        if (live.length > 0) setLiveTypes(live);
        else setLiveTypes(BUSINESS_TYPES.map(b => ({ id: b.id, label: b.label, category: b.category, description: b.description })));
      })
      .catch(() => setLiveTypes(BUSINESS_TYPES.map(b => ({ id: b.id, label: b.label, category: b.category, description: b.description }))));
  }, []);

  useEffect(() => {
    if (currency) {
      setStoredCurrencyPreference(currency, phoneCountry);
    }
  }, [currency, phoneCountry]);

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

  const strengthMeta = [
    { label:"", color:"transparent" },
    { label:"Weak",   color:"#f87171" },
    { label:"Fair",   color:"#fbbf24" },
    { label:"Good",   color:"#818cf8" },
    { label:"Strong", color:"#34d399" },
  ];
  const customModules = searchParams.get("modules") || "";
  const customPrice = searchParams.get("price") || "0";
  const [referralCode, setReferralCode] = useState(() => searchParams.get("ref") || "");
  const isCustomPlan = planCode.toLowerCase() === "custom";
  const effectiveBusinessType = businessType || (isCustomPlan ? "other" : "");

  const disabled = useMemo(
    () => !firstName || !lastName || !email || !companyName || !password || !agreeTerms || !agreePrivacy || !effectiveBusinessType,
    [firstName, lastName, email, companyName, password, agreeTerms, agreePrivacy, effectiveBusinessType]
  );



  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (disabled) return;
    setLoading(true);

    try {
      // If it's a custom plan, we also log the request for admin approval
      if (planCode.toLowerCase() === "custom") {
        await fetch("/api/public/custom-plan-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${firstName} ${lastName}`.trim(),
            email,
            company: companyName,
            modules: customModules,
            price: parseFloat(customPrice),
          }),
        });
      }

      const res = await fetch("/api/onboarding/signup", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          companyName, name:`${firstName} ${lastName}`.trim(),
          email, password,
          planCode: planCode.toUpperCase(),
          phone: phone ? `+${dialCode} ${phone}`.trim() : "",
          location, countryCode: phoneCountry,
          businessType: effectiveBusinessType,
          billingCycle,
          customModules: isCustomPlan ? customModules : undefined,
          customPrice: isCustomPlan ? parseFloat(customPrice) : undefined,
          referralCode: referralCode.trim().toUpperCase() || undefined,
          teamSize: teamSize || undefined,
          referralSource: referralSource || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Signup failed. Please try again."); setLoading(false); return; }

      // Clear any previous session/demo data to ensure fresh login
      try {
        localStorage.removeItem("user");
        // Clear all relevant cookies
        const cookies = ["sb_auth", "sb_verify", "first_login"];
        cookies.forEach(c => {
          document.cookie = `${c}=; Max-Age=0; path=/;`;
          document.cookie = `${c}=; Max-Age=0; path=/; domain=${window.location.hostname};`;
        });
      } catch {}

      if (effectiveBusinessType) {
        try { localStorage.setItem("pendingBusinessType", effectiveBusinessType); } catch {}
      }
      if (data?.needsVerification) {
        try {
          localStorage.setItem("pendingVerification", JSON.stringify(data));
        } catch {}
        router.replace(`/auth?mode=verify&email=${encodeURIComponent(email)}`);
        return;
      }
      // Go to animated setup page
      const setupParams = new URLSearchParams();
      if (effectiveBusinessType) setupParams.set("businessType", effectiveBusinessType);
      const cid = data?.user?.companyId || data?.user?.defaultCompanyId || "";
      if (cid) setupParams.set("companyId", cid);
      router.replace(`/onboarding/setup?${setupParams.toString()}`);
    } catch (err: any) {
      setError(err.message || "Network error. Please check your connection.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(180deg,#080c1e 0%,#0c0f2e 40%,#080c1e 100%)",
      color:"white", fontFamily:"'Outfit','DM Sans',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Lora:ital,wght@0,700;1,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes orbDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(16px,-14px)}}
        .fu{animation:fadeUp .55s ease both;}
        .d1{animation-delay:.08s;} .d2{animation-delay:.16s;} .d3{animation-delay:.24s;}
        select option{background:#0c0f2e;color:white;}
        input[type=text]::placeholder,input[type=email]::placeholder,input[type=password]::placeholder{color:rgba(255,255,255,.18);}
        .check-box{
          width:18px;height:18px;min-width:18px;
          border:2px solid rgba(255,255,255,.15);
          border-radius:5px;cursor:pointer;transition:all .2s;
          display:flex;align-items:center;justify-content:center;
          background:rgba(255,255,255,.04);
        }
        .check-box.on{background:#6366f1;border-color:#6366f1;box-shadow:0 0 10px rgba(99,102,241,.4);}
        @media(max-width:900px){
          .main-grid{grid-template-columns:1fr!important;}
          .name-grid{grid-template-columns:1fr!important;}
          .phone-grid{grid-template-columns:1fr!important;}
          .steps{display:none!important;}
          .signup-sidebar{order:2;}
          .signup-form{order:1;}
          .signup-header{padding:14px 16px !important;}
          .signup-main{padding:24px 14px 64px !important;}
        }
        @media(max-width:640px){
          .signup-sidebar{gap:12px !important;}
          .signup-plan-card{padding:18px !important;}
          .signup-form-card{padding:18px !important;}
          .signup-submit{width:100% !important;}
        }
      `}</style>

      {/* Fixed BG orbs */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        <div style={{ position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",
          backgroundSize:"48px 48px" }}/>
        <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%",
          background:`radial-gradient(circle,${current.dim},transparent 65%)`,
          top:-120, right:-100, animation:"orbDrift 14s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1,
          background:`linear-gradient(90deg,transparent,${current.color}80,transparent)` }}/>
      </div>

      {/* â”€â”€ HEADER â”€â”€ */}
      <header className="fu" style={{
        borderBottom:"1px solid rgba(255,255,255,.06)",
        background:"rgba(8,12,30,.85)", backdropFilter:"blur(20px)",
        position:"sticky", top:0, zIndex:50,
      }}>
        <div className="signup-header" style={{
          maxWidth:1200, margin:"0 auto", padding:"14px 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:38, height:38, borderRadius:11,
              background:"linear-gradient(135deg,#6366f1,#4f46e5)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 4px 14px rgba(99,102,241,.4)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span style={{ fontFamily:"'Lora',serif", fontSize:18, fontWeight:700, color:"white", letterSpacing:"-.3px" }}>
              FinovaOS
            </span>
          </div>

          {/* Progress steps */}
          <div className="steps" style={{ display:"flex", alignItems:"center", gap:8 }}>
            <ProgressStep step={1} label="Plan"    active={false} done={true} />
            <div style={{ width:40, height:2, borderRadius:2,
              background:"linear-gradient(90deg,#34d399,#6366f1)" }}/>
            <ProgressStep step={2} label="Account" active={true}  done={false} />
            <div style={{ width:40, height:2, borderRadius:2, background:"rgba(255,255,255,.08)" }}/>
            <ProgressStep step={3} label="Confirm" active={false} done={false} />
          </div>

          <button onClick={() => router.push("/landing")} style={{
            fontSize:13, fontWeight:600, color:"rgba(255,255,255,.55)",
            display:"flex", alignItems:"center", gap:4,
            padding:"7px 14px", borderRadius:9,
            border:"1.5px solid rgba(255,255,255,.1)",
            background:"rgba(255,255,255,.04)",
            cursor:"pointer", transition:"all .2s", fontFamily:"inherit",
          }}
            onMouseEnter={e=>{e.currentTarget.style.color="white";e.currentTarget.style.borderColor="rgba(255,255,255,.25)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,.55)";e.currentTarget.style.borderColor="rgba(255,255,255,.1)";}}
          >
            Back
          </button>
        </div>
      </header>

      {/* â”€â”€ MAIN â”€â”€ */}
      <main className="signup-main" style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto", padding:"40px 24px 80px" }}>
        <div className="main-grid" style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:28 }}>

          {/* â”€â”€ SIDEBAR â”€â”€ */}
          <aside className="fu d1 signup-sidebar" style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Plan card */}
            <div style={{
              borderRadius:20, overflow:"hidden",
              background:"rgba(255,255,255,.04)",
              border:`1.5px solid ${current.border}`,
              backdropFilter:"blur(20px)",
              boxShadow:`0 16px 48px rgba(0,0,0,.4), 0 0 0 1px ${current.color}15`,
              position:"relative",
            }}>
              {/* Top accent line */}
              <div style={{ height:3, background:`linear-gradient(90deg,${current.gradientFrom},${current.gradientTo})` }}/>
              {/* Card inner shimmer */}
              <div style={{ position:"absolute", top:3, left:"15%", right:"15%", height:1,
                background:`linear-gradient(90deg,transparent,${current.color}60,transparent)` }}/>

              <div className="signup-plan-card" style={{ padding:24 }}>
                {/* Plan tag */}
                <div style={{
                  display:"inline-flex", alignItems:"center", gap:6,
                  padding:"4px 12px", borderRadius:20,
                  background:current.dim, border:`1px solid ${current.border}`,
                  fontSize:10, fontWeight:700, color:current.color,
                  letterSpacing:".09em", textTransform:"uppercase", marginBottom:16,
                }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:current.color, animation:"blink 2s ease infinite" }}/>
                  Selected Plan
                </div>

                <div style={{
                  fontFamily:"'Lora',serif", fontSize:26, fontWeight:700,
                  color:"white", letterSpacing:"-.5px", marginBottom:4,
                }}>
                  {current.name}
                </div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.38)" }}>{current.tagline}</div>

                {/* Price box */}
                {price && (
                  <div style={{
                    marginTop:18, padding:"14px 16px", borderRadius:13,
                    background:current.dim, border:`1px solid ${current.border}`,
                  }}>
                    <div style={{ fontSize:10, color:current.color, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>
                      {billingCycle === "yearly" ? "Yearly price" : "Intro price"}
                    </div>
                    <div style={{ fontFamily:"'Lora',serif", fontSize:24, fontWeight:700, color:"white", letterSpacing:"-.5px" }}>
                      {price}
                      <span style={{ fontSize:12, fontWeight:500, color:current.color, marginLeft:4 }}>
                        {billingCycle === "yearly" ? "/ yr" : "/ mo"}
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:4 }}>
                      Displayed in {currency}
                    </div>
                  </div>
                )}

                {/* Feature bullets */}
                <div style={{ marginTop:18, display:"flex", flexDirection:"column", gap:8 }}>
                  {current.bullets.map(b => (
                    <div key={b.text} style={{
                      display:"flex", alignItems:"center", gap:10,
                      padding:"9px 12px", borderRadius:10,
                      background:"rgba(255,255,255,.03)",
                      border:"1px solid rgba(255,255,255,.07)",
                    }}>
                      <div style={{
                        width:24, height:24, borderRadius:8,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        background:current.dim, border:`1px solid ${current.border}`, flexShrink:0,
                      }}>
                        <SidebarIcon icon={b.icon} color={current.color} />
                      </div>
                      <span style={{ fontSize:13, fontWeight:500, color:"rgba(255,255,255,.65)" }}>{b.text}</span>
                      <div style={{ marginLeft:"auto", width:16, height:16, borderRadius:"50%",
                        background:current.dim, border:`1px solid ${current.border}`,
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <svg width="7" height="7" viewBox="0 0 12 10" fill="none">
                          <path d="M1 5L4.5 8.5 11 1" stroke={current.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div style={{
              padding:"18px 20px", borderRadius:16,
              background:"rgba(255,255,255,.03)",
              border:"1px solid rgba(255,255,255,.07)",
              backdropFilter:"blur(12px)",
            }}>
              {[
                { icon:"security", text:"256-bit SSL encryption" },
                { icon:"global", text:"Available in 180+ countries" },
                { icon:"flex", text:"Cancel anytime, no lock-in" },
                { icon:"network", text:"Global cloud infrastructure" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:10, fontSize:12.5, color:"rgba(255,255,255,.42)", fontWeight:500 }}>
                  <div style={{
                    width:22, height:22, borderRadius:8,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", flexShrink:0,
                  }}>
                    <TrustIcon kind={icon} color={current.color} />
                  </div>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </aside>

          {/* â”€â”€ FORM â”€â”€ */}
          <section className="fu d2 signup-form">
            <div style={{ marginBottom:28 }}>
              <div style={{
                display:"inline-flex", alignItems:"center", gap:7,
                padding:"5px 14px", borderRadius:22,
                background:"rgba(99,102,241,.1)", border:"1.5px solid rgba(99,102,241,.28)",
                fontSize:10.5, fontWeight:700, color:"#a5b4fc",
                letterSpacing:".09em", textTransform:"uppercase", marginBottom:16,
              }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"#6366f1", animation:"blink 2s ease infinite" }}/>
                Step 2 of 3 - Account Setup
              </div>
              <h1 style={{
                fontFamily:"'Lora',serif", fontSize:"clamp(26px,3.5vw,38px)",
                fontWeight:700, color:"white", letterSpacing:"-1px", lineHeight:1.1, marginBottom:8,
              }}>
                Create your account
              </h1>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.38)", fontWeight:400 }}>
                Set up your{" "}
                <strong style={{ color:current.color }}>{current.name}</strong>{" "}
                workspace in under 2 minutes.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginBottom:20, padding:"12px 16px", borderRadius:12,
                background:"rgba(248,113,113,.08)", border:"1.5px solid rgba(248,113,113,.3)",
                color:"#f87171", fontSize:13, fontWeight:500,
                display:"flex", alignItems:"center", gap:8,
              }}>
                <span>!</span> {error}
              </div>
            )}

            {/* Form card */}
            <div style={{
              borderRadius:22, padding:32,
              background:"rgba(255,255,255,.04)",
              border:"1.5px solid rgba(255,255,255,.08)",
              backdropFilter:"blur(20px)",
              boxShadow:"0 24px 64px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", top:0, left:"20%", right:"20%", height:1,
                background:"linear-gradient(90deg,transparent,rgba(99,102,241,.5),transparent)" }}/>

              <form className="signup-form-card" onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {/* Name row */}
                <div className="name-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <FloatingInput label="First name"  value={firstName}   onChange={setFirstName}   required autoComplete="given-name" />
                  <FloatingInput label="Last name"   value={lastName}    onChange={setLastName}    required autoComplete="family-name" />
                </div>

                {/* Email */}
                <FloatingInput label="Work email" type="email" value={email} onChange={setEmail} required autoComplete="email"/>

                {/* Country select */}
                <div>
                  <label style={{
                    display:"block", fontSize:10, fontWeight:700,
                    letterSpacing:".08em", textTransform:"uppercase",
                    color:"rgba(255,255,255,.3)", marginBottom:6,
                  }}>Country</label>
                  <select
                    value={phoneCountry}
                    onChange={e => {
                      const code = e.target.value.toUpperCase();
                      setPhoneCountry(code);
                      const cn = COUNTRIES.find(c => c.code === code)?.name || location;
                      setLocation(cn);
                      const cur = currencyByCountry(code);
                      if (FX_USD[cur]) setCurrency(cur as any);
                      const dial = DIAL_CODES[code] || "";
                      setDialCode(dial);
                    }}
                    style={{
                      width:"100%", borderRadius:12,
                      border:"1.5px solid rgba(255,255,255,.09)",
                      background:"rgba(255,255,255,.04)",
                      padding:"13px 12px", fontSize:13,
                      color:"white", outline:"none",
                      fontFamily:"inherit", cursor:"pointer", transition:"border-color .2s",
                    }}
                    onFocus={e=>(e.target.style.borderColor="rgba(129,140,248,.6)")}
                    onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.09)")}
                  >
                    {sortCountries().map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Phone with dial code prefix */}
                <div>
                  <label style={{
                    display:"block", fontSize:10, fontWeight:700,
                    letterSpacing:".08em", textTransform:"uppercase",
                    color:"rgba(255,255,255,.3)", marginBottom:6,
                  }}>Phone number (optional)</label>
                  <PhoneInput
                    dialCode={dialCode}
                    onDialChange={raw => {
                      // strip leading + or zeros
                      const digits = raw.replace(/\D/g, "");
                      setDialCode(digits);
                      // try to match country
                      const matched = DIAL_TO_COUNTRY[digits];
                      if (matched) {
                        setPhoneCountry(matched);
                        const cn = COUNTRIES.find(c => c.code === matched)?.name;
                        if (cn) setLocation(cn);
                        const cur = currencyByCountry(matched);
                        if (FX_USD[cur]) setCurrency(cur as any);
                      }
                    }}
                    phone={phone}
                    onPhoneChange={setPhone}
                    color={current.color}
                  />
                </div>

                {/* Company */}
                <FloatingInput label="Company name" value={companyName} onChange={setCompanyName} required autoComplete="organization"/>

                <div>
                  <label style={{
                    display:"block", fontSize:10, fontWeight:700,
                    letterSpacing:".08em", textTransform:"uppercase",
                    color:"rgba(255,255,255,.3)", marginBottom:6,
                  }}>
                    Business Type <span style={{color:"#f87171"}}>*</span>
                  </label>
                  <select
                    value={businessType}
                    onChange={e => setBusinessType(e.target.value as BusinessType | "")}
                    required
                    style={{
                      width:"100%", borderRadius:12,
                      border:"1.5px solid rgba(255,255,255,.09)",
                      background:"rgba(255,255,255,.04)",
                      padding:"13px 12px", fontSize:13,
                      color:"white", outline:"none",
                      fontFamily:"inherit", cursor:"pointer", transition:"border-color .2s",
                    }}
                    onFocus={e => (e.target.style.borderColor = "rgba(129,140,248,.6)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.09)")}
                  >
                    <option value="">Select your business type</option>
                    {liveTypes.map((bt) => (
                      <option key={bt.id} value={bt.id}>
                        {bt.label} - {bt.category}
                      </option>
                    ))}
                  </select>
                  {businessType && (
                    <div style={{
                      marginTop:8,
                      fontSize:11.5,
                      color:"rgba(255,255,255,.42)",
                      lineHeight:1.5,
                    }}>
                      {liveTypes.find((bt) => bt.id === businessType)?.description}
                    </div>
                  )}
                </div>

                {false && (
                <div>
                  <div style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:".07em",textTransform:"uppercase",marginBottom:10 }}>
                    Business Type <span style={{color:"#f87171"}}>*</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8}}>
                    {[
                      { id:"retail",         icon:"ðŸª", label:"Retail" },
                      { id:"trading",        icon:"ðŸ“¦", label:"Trading" },
                      { id:"restaurant",     icon:"ðŸ½ï¸", label:"Restaurant" },
                      { id:"manufacturing",  icon:"ðŸ­", label:"Manufacturing" },
                      { id:"hospital",       icon:"ðŸ¥", label:"Hospital" },
                      { id:"school",         icon:"ðŸŽ“", label:"School" },
                      { id:"construction",   icon:"ðŸ—ï¸", label:"Construction" },
                      { id:"real_estate",    icon:"ðŸ ", label:"Real Estate" },
                      { id:"it_company",     icon:"ðŸ’»", label:"IT Company" },
                      { id:"service",        icon:"ðŸ’¼", label:"Services" },
                      { id:"transport",      icon:"ðŸš›", label:"Transport" },
                      { id:"ngo",            icon:"â¤ï¸", label:"NGO" },
                      { id:"hotel",          icon:"ðŸ¨", label:"Hotel" },
                      { id:"pharmacy",       icon:"ðŸ’Š", label:"Pharmacy" },
                      { id:"law_firm",       icon:"âš–ï¸", label:"Law Firm" },
                      { id:"other",          icon:"ðŸ¢", label:"Other" },
                    ].map(bt => {
                      const sel = businessType === bt.id;
                      return (
                        <button key={bt.id} type="button" onClick={() => setBusinessType(bt.id as BusinessType)}
                          style={{
                            display:"flex",alignItems:"center",gap:8,
                            padding:"10px 12px",borderRadius:11,cursor:"pointer",
                            fontFamily:"inherit",fontSize:12,fontWeight:600,
                            background: sel ? "rgba(99,102,241,.18)" : "rgba(255,255,255,.04)",
                            border:`1.5px solid ${sel ? "rgba(99,102,241,.6)" : "rgba(255,255,255,.08)"}`,
                            color: sel ? "#a5b4fc" : "rgba(255,255,255,.5)",
                            transition:"all .15s",
                            boxShadow: sel ? "0 0 14px rgba(99,102,241,.2)" : "none",
                          }}>
                          <span style={{fontSize:16}}>{bt.icon}</span>
                          {bt.label}
                          {sel && <span style={{marginLeft:"auto",fontSize:10,color:"#818cf8"}}>âœ“</span>}
                        </button>
                      );
                    })}
                  </div>
                  {!businessType && (
                    <div style={{fontSize:11,color:"rgba(248,113,113,.6)",marginTop:6}}>Please select your business type</div>
                  )}
                </div>
                )}

                {/* Team Size */}
                <div className="name-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:6 }}>
                      Team Size <span style={{ fontWeight:400, textTransform:"none", color:"rgba(255,255,255,.2)" }}>(optional)</span>
                    </label>
                    <select
                      value={teamSize}
                      onChange={e => setTeamSize(e.target.value)}
                      style={{ width:"100%", borderRadius:12, border:"1.5px solid rgba(255,255,255,.09)", background:"rgba(255,255,255,.04)", padding:"13px 12px", fontSize:13, color: teamSize ? "white" : "rgba(255,255,255,.35)", outline:"none", fontFamily:"inherit", cursor:"pointer", transition:"border-color .2s" }}
                      onFocus={e => (e.target.style.borderColor = "rgba(129,140,248,.6)")}
                      onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.09)")}
                    >
                      <option value="">Select team size</option>
                      <option value="1">1 — Just me</option>
                      <option value="2-5">2 – 5 people</option>
                      <option value="6-15">6 – 15 people</option>
                      <option value="16-50">16 – 50 people</option>
                      <option value="51-200">51 – 200 people</option>
                      <option value="200+">200+ people</option>
                    </select>
                  </div>

                  {/* Referral Source */}
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:6 }}>
                      How did you hear about us? <span style={{ fontWeight:400, textTransform:"none", color:"rgba(255,255,255,.2)" }}>(optional)</span>
                    </label>
                    <select
                      value={referralSource}
                      onChange={e => setReferralSource(e.target.value)}
                      style={{ width:"100%", borderRadius:12, border:"1.5px solid rgba(255,255,255,.09)", background:"rgba(255,255,255,.04)", padding:"13px 12px", fontSize:13, color: referralSource ? "white" : "rgba(255,255,255,.35)", outline:"none", fontFamily:"inherit", cursor:"pointer", transition:"border-color .2s" }}
                      onFocus={e => (e.target.style.borderColor = "rgba(129,140,248,.6)")}
                      onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.09)")}
                    >
                      <option value="">Select an option</option>
                      <option value="google">Google / Search</option>
                      <option value="social_media">Social Media</option>
                      <option value="friend">Friend / Colleague</option>
                      <option value="youtube">YouTube</option>
                      <option value="newsletter">Newsletter / Email</option>
                      <option value="blog">Blog / Article</option>
                      <option value="existing_customer">Existing Customer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div style={{ position:"relative" }}>
                    <FloatingInput
                      label="Create password"
                      type={showPass ? "text" : "password"}
                      value={password} onChange={setPassword}
                      required autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} style={{
                      position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
                      background:"none", border:"none", cursor:"pointer",
                      color:"rgba(255,255,255,.3)", fontSize:16, transition:"color .2s",
                    }}
                      onMouseEnter={e=>(e.currentTarget.style.color="#818cf8")}
                      onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.3)")}
                    >
                      {showPass ? "Hide" : "Show"}
                    </button>
                  </div>

                  {password && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ display:"flex", gap:4, marginBottom:5 }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{
                            height:3, flex:1, borderRadius:4, transition:"background .3s",
                            background: i <= passwordStrength ? strengthMeta[passwordStrength].color : "rgba(255,255,255,.08)",
                          }}/>
                        ))}
                      </div>
                      <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,.35)" }}>
                        Password strength:{" "}
                        <span style={{ color:strengthMeta[passwordStrength].color }}>
                          {strengthMeta[passwordStrength].label}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Checkboxes */}
                <div style={{
                  padding:"16px 18px", borderRadius:13,
                  background:"rgba(255,255,255,.03)",
                  border:"1px solid rgba(255,255,255,.08)",
                  display:"flex", flexDirection:"column", gap:12,
                }}>
                  {[
                    { checked:agreePrivacy, onChange:setAgreePrivacy, label:"I have read and agree to the", link:"Privacy Policy",  href:"/legal/privacy" },
                    { checked:agreeTerms,   onChange:setAgreeTerms,   label:"I accept the",                  link:"Terms of Service", href:"/legal/terms" },
                  ].map(({ checked, onChange, label, link, href }) => (
                    <label key={link} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
                      onClick={() => onChange(!checked)}>
                      <div className={`check-box${checked?" on":""}`}>
                        {checked && (
                          <svg width="9" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize:13, color:"rgba(255,255,255,.5)", fontWeight:400 }}>
                        {label}{" "}
                        <a href={href} onClick={e=>e.stopPropagation()} style={{ color:"#818cf8", fontWeight:600, textDecoration:"underline" }}>
                          {link}
                        </a>
                      </span>
                    </label>
                  ))}
                </div>

                {/* Referral code */}
                <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", paddingTop:14 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:6 }}>
                    Referral Code <span style={{ fontWeight:400, textTransform:"none", color:"rgba(255,255,255,.2)" }}>(optional)</span>
                  </label>
                  <input
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A1B2C3D4"
                    style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", color:"white", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", letterSpacing:"1px" }}
                  />
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading || disabled} style={{
                  marginTop:4, width:"100%", padding:"14px 24px",
                  borderRadius:13, border:"none",
                  background: disabled ? "rgba(255,255,255,.06)" : `linear-gradient(135deg,${current.gradientFrom},${current.gradientTo})`,
                  color: disabled ? "rgba(255,255,255,.22)" : "white",
                  fontSize:15, fontWeight:700, letterSpacing:".01em",
                  cursor: loading || disabled ? "not-allowed" : "pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  fontFamily:"inherit", transition:"all .3s",
                  boxShadow: disabled ? "none" : `0 6px 24px ${current.glow}`,
                }}
                  onMouseEnter={e => { if (!disabled && !loading) { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 10px 32px ${current.glow}`; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=disabled?"none":`0 6px 24px ${current.glow}`; }}
                >
                  {loading ? (
                    <>
                      <svg width="17" height="17" viewBox="0 0 24 24" style={{ animation:"spin 1s linear infinite" }}>
                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" strokeDasharray="60" strokeDashoffset="20"/>
                      </svg>
                      Setting up your workspace...
                    </>
                  ) : (
                    <>Continue to Confirmation</>
                  )}
                </button>

                <div style={{ textAlign:"center", fontSize:12.5, color:"rgba(255,255,255,.25)" }}>
                  Already have an account?{" "}
                  <button type="button" onClick={() => router.push("/login")} style={{
                    color:"#818cf8", fontWeight:600, background:"none", border:"none",
                    cursor:"pointer", fontFamily:"inherit", fontSize:"inherit",
                  }}>
                    Sign in
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
