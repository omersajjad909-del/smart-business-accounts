"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type Features = {
  advancedReports: boolean;
  bankReconciliation: boolean;
  inventoryReports: boolean;
  crm: boolean;
  hrPayroll: boolean;
  backupRestore: boolean;
  prioritySupport: boolean;
};

const PLAN_META: Record<string, {
  name: string; color: string; glow: string; dim: string; border: string;
  gradientFrom: string; gradientTo: string; icon: string; tagline: string;
}> = {
  starter: {
    name: "Starter", icon: "🌱", tagline: "Perfect for growing businesses",
    color: "#818cf8", glow: "rgba(129,140,248,.35)", dim: "rgba(129,140,248,.1)", border: "rgba(129,140,248,.3)",
    gradientFrom: "#6366f1", gradientTo: "#4f46e5",
  },
  pro: {
    name: "Professional", icon: "🚀", tagline: "For established teams that need more",
    color: "#34d399", glow: "rgba(52,211,153,.35)", dim: "rgba(52,211,153,.1)", border: "rgba(52,211,153,.3)",
    gradientFrom: "#10b981", gradientTo: "#059669",
  },
  professional: {
    name: "Professional", icon: "🚀", tagline: "For established teams that need more",
    color: "#34d399", glow: "rgba(52,211,153,.35)", dim: "rgba(52,211,153,.1)", border: "rgba(52,211,153,.3)",
    gradientFrom: "#10b981", gradientTo: "#059669",
  },
  enterprise: {
    name: "Enterprise", icon: "💎", tagline: "Tailored for complex organizations",
    color: "#fbbf24", glow: "rgba(251,191,36,.35)", dim: "rgba(251,191,36,.1)", border: "rgba(251,191,36,.3)",
    gradientFrom: "#f59e0b", gradientTo: "#d97706",
  },
  custom: {
    name: "Custom Plan", icon: "⚡", tagline: "Built exactly for your needs",
    color: "#38bdf8", glow: "rgba(56,189,248,.35)", dim: "rgba(56,189,248,.1)", border: "rgba(56,189,248,.3)",
    gradientFrom: "#0ea5e9", gradientTo: "#0284c7",
  },
};

const FEATURE_ICONS: Record<string, string> = {
  "Advanced reports":    "📈",
  "Bank reconciliation": "🏦",
  "Inventory reports":   "📦",
  "CRM":                 "👥",
  "HR & Payroll":        "👨‍💼",
  "Backup & restore":    "🔄",
  "Priority support":    "⚡",
};

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

/* ─── Permission catalog ──────────────────────────────── */
const PERM_CATALOG: Record<string, { label: string; icon: string; category: string }> = {
  VIEW_DASHBOARD:          { label: "Dashboard",          icon: "🏠", category: "Core" },
  VIEW_SETTINGS:           { label: "Settings",           icon: "⚙️",  category: "Core" },
  VIEW_LOGS:               { label: "System Logs",        icon: "📋", category: "Core" },
  VIEW_AUDIT_LOG:          { label: "Audit Log",          icon: "🔍", category: "Core" },
  MANAGE_USERS:            { label: "Manage Users",       icon: "👥", category: "Core" },
  VIEW_ACCOUNTS:           { label: "Accounts",           icon: "📂", category: "Accounting" },
  CREATE_CPV:              { label: "Cash Payment",       icon: "💸", category: "Accounting" },
  CREATE_CRV:              { label: "Cash Receipt",       icon: "💰", category: "Accounting" },
  VIEW_ACCOUNTING:         { label: "Accounting",         icon: "🧾", category: "Accounting" },
  CREATE_ACCOUNTS:         { label: "Chart of Accounts",  icon: "📊", category: "Accounting" },
  VIEW_CATALOG:            { label: "Catalog",            icon: "📦", category: "Inventory" },
  CREATE_ITEMS:            { label: "Create Items",       icon: "➕", category: "Inventory" },
  CREATE_STOCK_RATE:       { label: "Stock Rates",        icon: "🏷️",  category: "Inventory" },
  VIEW_INVENTORY:          { label: "Inventory",          icon: "🗄️",  category: "Inventory" },
  CREATE_PURCHASE_ORDER:   { label: "Purchase Orders",    icon: "📋", category: "Inventory" },
  CREATE_PURCHASE_INVOICE: { label: "Purchase Invoice",   icon: "🧾", category: "Inventory" },
  CREATE_SALES_INVOICE:    { label: "Sales Invoice",      icon: "🧾", category: "Sales" },
  CREATE_SALE_RETURN:      { label: "Sale Returns",       icon: "↩️",  category: "Sales" },
  CREATE_OUTWARD:          { label: "Outward/Dispatch",   icon: "🚚", category: "Sales" },
  CREATE_QUOTATION:        { label: "Quotations",         icon: "📝", category: "Sales" },
  CREATE_DELIVERY_CHALLAN: { label: "Delivery Challan",   icon: "📄", category: "Sales" },
  VIEW_REPORTS:            { label: "Reports",            icon: "📈", category: "Reports" },
  VIEW_FINANCIAL_REPORTS:  { label: "Financial Reports",  icon: "💹", category: "Reports" },
  VIEW_AGEING_REPORT:      { label: "Ageing Report",      icon: "⏳", category: "Reports" },
  VIEW_LEDGER_REPORT:      { label: "Ledger Report",      icon: "📒", category: "Reports" },
  VIEW_TRIAL_BALANCE_REPORT:{ label: "Trial Balance",     icon: "⚖️",  category: "Reports" },
  VIEW_INVENTORY_REPORTS:  { label: "Inventory Reports",  icon: "📦", category: "Reports" },
  VIEW_CRM:                { label: "CRM",                icon: "🤝", category: "CRM" },
  VIEW_HR_PAYROLL:         { label: "HR & Payroll",       icon: "👨‍💼", category: "HR" },
  BANK_RECONCILIATION:     { label: "Bank Reconciliation",icon: "🏦", category: "Banking" },
  PAYMENT_RECEIPTS:        { label: "Payment Receipts",   icon: "🧾", category: "Banking" },
  EXPENSE_VOUCHERS:        { label: "Expense Vouchers",   icon: "💳", category: "Banking" },
  BACKUP_RESTORE:          { label: "Backup & Restore",   icon: "🔄", category: "System" },
};

const CATEGORY_ORDER = ["Core","Accounting","Sales","Inventory","Reports","Banking","CRM","HR","System"];
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Core:       { bg:"rgba(99,102,241,.1)",  border:"rgba(99,102,241,.25)",  text:"#a5b4fc", dot:"#6366f1" },
  Accounting: { bg:"rgba(52,211,153,.1)",  border:"rgba(52,211,153,.25)",  text:"#6ee7b7", dot:"#34d399" },
  Sales:      { bg:"rgba(251,191,36,.1)",  border:"rgba(251,191,36,.25)",  text:"#fde68a", dot:"#fbbf24" },
  Inventory:  { bg:"rgba(251,146,60,.1)",  border:"rgba(251,146,60,.25)",  text:"#fed7aa", dot:"#fb923c" },
  Reports:    { bg:"rgba(56,189,248,.1)",  border:"rgba(56,189,248,.25)",  text:"#bae6fd", dot:"#38bdf8" },
  Banking:    { bg:"rgba(167,139,250,.1)", border:"rgba(167,139,250,.25)", text:"#ddd6fe", dot:"#a78bfa" },
  CRM:        { bg:"rgba(244,114,182,.1)", border:"rgba(244,114,182,.25)", text:"#fbcfe8", dot:"#f472b6" },
  HR:         { bg:"rgba(74,222,128,.1)",  border:"rgba(74,222,128,.25)",  text:"#bbf7d0", dot:"#4ade80" },
  System:     { bg:"rgba(148,163,184,.1)", border:"rgba(148,163,184,.25)", text:"#cbd5e1", dot:"#94a3b8" },
};

function PermissionsCard({ perms, meta }: { perms: string[]; meta: typeof PLAN_META[string] }) {
  // Group perms by category
  const grouped: Record<string, Array<{ key: string; label: string; icon: string }>> = {};
  for (const key of perms) {
    const entry = PERM_CATALOG[key];
    const cat = entry?.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ key, label: entry?.label || key.replace(/_/g," "), icon: entry?.icon || "✦" });
  }

  const categories = CATEGORY_ORDER.filter(c => grouped[c]).concat(Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c)));

  return (
    <div style={{ borderRadius:18, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"16px 22px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:12, fontWeight:800, color:"rgba(255,255,255,.7)", letterSpacing:".06em", textTransform:"uppercase" }}>
            Included Permissions
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>
            {perms.length} permissions across {categories.length} modules
          </div>
        </div>
        <div style={{ padding:"4px 12px", borderRadius:20, background:meta.dim, border:`1px solid ${meta.border}`, fontSize:11, fontWeight:800, color:meta.color }}>
          {perms.length} total
        </div>
      </div>

      <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:10 }}>
        {categories.map(cat => {
          const items = grouped[cat];
          const cc = CATEGORY_COLORS[cat] || CATEGORY_COLORS.System;
          return (
            <div key={cat} style={{ borderRadius:12, background:cc.bg, border:`1px solid ${cc.border}`, padding:"12px 14px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:cc.dot, flexShrink:0 }}/>
                <span style={{ fontSize:10, fontWeight:800, color:cc.text, letterSpacing:".08em", textTransform:"uppercase" }}>{cat}</span>
                <span style={{ marginLeft:"auto", fontSize:10, fontWeight:700, color:cc.text, opacity:.6 }}>{items.length}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:6 }}>
                {items.map(({ key, label, icon }) => (
                  <div key={key} style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 10px", borderRadius:8, background:"rgba(0,0,0,.15)" }}>
                    <span style={{ fontSize:13, lineHeight:1 }}>{icon}</span>
                    <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,.75)", lineHeight:1.3 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Map module IDs (from URL) to feature labels shown on this page
const MODULE_TO_FEATURE: Record<string, string> = {
  accounting:          "Advanced reports",
  reports:             "Advanced reports",
  bank_reconciliation: "Bank reconciliation",
  inventory:           "Inventory reports",
  crm:                 "CRM",
  hr_payroll:          "HR & Payroll",
};

export default function OnboardingPlanFeatures() {
  const params       = useParams() as { plan?: string };
  const router       = useRouter();
  const searchParams = useSearchParams();
  const plan         = String(params?.plan || "starter").toLowerCase();
  const meta         = PLAN_META[plan] || PLAN_META.starter;

  // For custom plan, read pre-selected modules from URL
  const urlModules = plan === "custom"
    ? (searchParams.get("modules") || "").split(",").filter(Boolean)
    : [];

  const [cfg,     setCfg]     = useState<any>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/public/plan-config", { cache:"no-store" });
        if (r.ok) setCfg(await r.json());
      } catch {}
    })();
  }, []);

  const features: Features | null = (() => {
    const fo = (cfg?.plans || []).find((p: any) => p.code === plan);
    return fo?.features || null;
  })();
  const perms: string[] = cfg?.planPermissions?.[String(plan).toUpperCase()] || [];

  const rows: { label: string; enabled: boolean }[] = [
    { label: "Advanced reports",    enabled: !!features?.advancedReports },
    { label: "Bank reconciliation", enabled: !!features?.bankReconciliation },
    { label: "Inventory reports",   enabled: !!features?.inventoryReports },
    { label: "CRM",                 enabled: !!features?.crm },
    { label: "HR & Payroll",        enabled: !!features?.hrPayroll },
    { label: "Backup & restore",    enabled: !!features?.backupRestore },
    { label: "Priority support",    enabled: !!features?.prioritySupport },
  ];

  // If no config loaded yet, show all as enabled for known plans
  const customEnabledLabels = [...new Set(urlModules.map(id => MODULE_TO_FEATURE[id]).filter(Boolean))];
  const defaultEnabled: Record<string, string[]> = {
    starter:      ["Advanced reports"],
    pro:          ["Advanced reports","Bank reconciliation","Inventory reports","CRM"],
    professional: ["Advanced reports","Bank reconciliation","Inventory reports","CRM"],
    enterprise:   ["Advanced reports","Bank reconciliation","Inventory reports","CRM","HR & Payroll","Backup & restore","Guided onboarding"],
    custom:       customEnabledLabels,
  };

  const displayRows = rows.map(r => ({
    ...r,
    enabled: features ? r.enabled : defaultEnabled[plan]?.includes(r.label) ?? false,
  }));

  function initiatePayment() {
    const modulesParam = searchParams.get("modules");
    const cycleParam   = searchParams.get("cycle") || "monthly";
    const priceParam   = searchParams.get("price") || "";
    const query = new URLSearchParams();
    if (modulesParam) query.set("modules", modulesParam);
    if (cycleParam)   query.set("cycle", cycleParam);
    if (priceParam)   query.set("price", priceParam);
    const qs = query.toString();
    router.push(`/onboarding/payment/${plan}${qs ? `?${qs}` : ""}`);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#080c1e 0%,#0c0f2e 40%,#080c1e 100%)",
      color: "white",
      fontFamily: "'Outfit','DM Sans',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Lora:ital,wght@0,700;1,700&display=swap');
        *,*::before,*::after { box-sizing:border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.15);opacity:1} }
        @keyframes orbDrift { 0%,100%{transform:translate(0,0)} 50%{transform:translate(16px,-14px)} }
        .fu { animation: fadeUp .55s ease both; }
        .d1 { animation-delay:.08s; }
        .d2 { animation-delay:.18s; }
        .d3 { animation-delay:.28s; }
        @media(max-width:768px) {
          .main-grid { grid-template-columns:1fr!important; }
          .steps { display:none!important; }
        }
      `}</style>

      {/* BG */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",
          backgroundSize:"48px 48px",
        }}/>
        <div style={{
          position:"absolute", width:500, height:500, borderRadius:"50%",
          background:`radial-gradient(circle,${meta.dim},transparent 65%)`,
          top:-120, right:-100, animation:"orbDrift 14s ease-in-out infinite",
        }}/>
      </div>

      {/* Header */}
      <header className="fu" style={{
        borderBottom:"1px solid rgba(255,255,255,.06)",
        background:"rgba(8,12,30,.85)", backdropFilter:"blur(20px)",
        position:"sticky", top:0, zIndex:50,
      }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(99,102,241,.4)" }}>
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

          {/* Steps */}
          <div className="steps" style={{ display:"flex", alignItems:"center", gap:8 }}>
            <ProgressStep step={1} label="Plan"    active={false} done={true}  />
            <div style={{ width:40, height:2, borderRadius:2, background:"linear-gradient(90deg,#34d399,#6366f1)" }}/>
            <ProgressStep step={2} label="Account" active={false} done={true}  />
            <div style={{ width:40, height:2, borderRadius:2, background:`linear-gradient(90deg,#6366f1,${meta.color})` }}/>
            <ProgressStep step={3} label="Confirm" active={true}  done={false} />
          </div>

          <button onClick={() => router.back()} style={{
            fontSize:13, fontWeight:600, color:"rgba(255,255,255,.55)",
            display:"flex", alignItems:"center", gap:4, padding:"7px 14px", borderRadius:9,
            border:"1.5px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)",
            cursor:"pointer", transition:"all .2s", fontFamily:"inherit",
          }}
            onMouseEnter={e=>{ e.currentTarget.style.color="white"; e.currentTarget.style.borderColor="rgba(255,255,255,.25)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.color="rgba(255,255,255,.55)"; e.currentTarget.style.borderColor="rgba(255,255,255,.1)"; }}
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ position:"relative", zIndex:1, maxWidth:1100, margin:"0 auto", padding:"48px 24px 80px" }}>

        {/* Step label */}
        <div className="fu d1" style={{ marginBottom:32 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"5px 14px", borderRadius:22, background:"rgba(99,102,241,.1)", border:"1.5px solid rgba(99,102,241,.28)", fontSize:10.5, fontWeight:700, color:"#a5b4fc", letterSpacing:".09em", textTransform:"uppercase", marginBottom:16 }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:"#6366f1", animation:"blink 2s ease infinite" }}/>
            Step 3 of 3 — Plan Confirmation
          </div>
          <h1 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(26px,4vw,40px)", fontWeight:700, color:"white", letterSpacing:"-1px", lineHeight:1.1, margin:"0 0 8px" }}>
            Your <span style={{ color:meta.color }}>{meta.name}</span> plan is ready
          </h1>
          <p style={{ fontSize:14, color:"rgba(255,255,255,.4)" }}>
            Review your plan features and proceed to activate your workspace.
          </p>
        </div>

        <div className="main-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

          {/* Left — Plan card + features */}
          <div className="fu d2" style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Plan header card */}
            <div style={{
              borderRadius:20, overflow:"hidden",
              background:"rgba(255,255,255,.04)",
              border:`1.5px solid ${meta.border}`,
              backdropFilter:"blur(20px)",
              boxShadow:`0 16px 48px rgba(0,0,0,.4), 0 0 0 1px ${meta.color}15`,
              position:"relative",
            }}>
              <div style={{ height:3, background:`linear-gradient(90deg,${meta.gradientFrom},${meta.gradientTo})` }}/>
              <div style={{ padding:"24px 24px 20px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
                  <div style={{ width:52, height:52, borderRadius:15, background:meta.dim, border:`1.5px solid ${meta.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                    {meta.icon}
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Lora',serif", fontSize:22, fontWeight:700, color:"white" }}>{meta.name}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2 }}>{meta.tagline}</div>
                  </div>
                  <div style={{ marginLeft:"auto", padding:"4px 12px", borderRadius:20, background:meta.dim, border:`1px solid ${meta.border}`, fontSize:10, fontWeight:800, color:meta.color, letterSpacing:".08em", textTransform:"uppercase" }}>
                    Selected
                  </div>
                </div>

                {/* Feature list */}
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:4 }}>Included Features</div>
                  {displayRows.map(r => (
                    <div key={r.label} style={{
                      display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                      borderRadius:10, transition:"all .2s",
                      background: r.enabled ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.01)",
                      border: r.enabled ? `1px solid ${meta.color}25` : "1px solid rgba(255,255,255,.04)",
                    }}>
                      <span style={{ fontSize:16, opacity: r.enabled ? 1 : .3 }}>{FEATURE_ICONS[r.label] || "•"}</span>
                      <span style={{ flex:1, fontSize:13, fontWeight:500, color: r.enabled ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.25)", textDecoration: r.enabled ? "none" : "line-through" }}>
                        {r.label}
                      </span>
                      <div style={{
                        width:20, height:20, borderRadius:"50%",
                        background: r.enabled ? meta.dim : "rgba(255,255,255,.04)",
                        border: `1.5px solid ${r.enabled ? meta.color : "rgba(255,255,255,.08)"}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>
                        {r.enabled ? (
                          <svg width="9" height="9" viewBox="0 0 12 10" fill="none">
                            <path d="M1 5L4.5 8.5 11 1" stroke={meta.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <div style={{ width:6, height:1.5, background:"rgba(255,255,255,.15)", borderRadius:2 }}/>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Permissions — Beautiful categorized */}
            {perms.length > 0 && (
              <PermissionsCard perms={perms} meta={meta} />
            )}
          </div>

          {/* Right — Action card */}
          <div className="fu d3" style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Summary card */}
            <div style={{
              borderRadius:20, padding:"28px 26px",
              background:"rgba(255,255,255,.04)",
              border:"1.5px solid rgba(255,255,255,.08)",
              backdropFilter:"blur(20px)",
              boxShadow:"0 24px 64px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", top:0, left:"20%", right:"20%", height:1, background:`linear-gradient(90deg,transparent,${meta.color}60,transparent)` }}/>

              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>What happens next</div>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {[
                    { icon:"✅", title:"Instant activation",  desc:"Click the button and your plan activates immediately" },
                    { icon:"🚀", title:"Full access",         desc:"All features of your selected plan available right away" },
                    { icon:"💳", title:"Billing later",       desc:"Add payment details anytime from your dashboard settings" },
                  ].map((s, i) => (
                    <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:meta.dim, border:`1px solid ${meta.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{s.icon}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"white" }}>{s.title}</div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:2 }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA buttons */}
              <button onClick={initiatePayment} style={{
                width:"100%", padding:"15px 24px", borderRadius:13, border:"none",
                background:`linear-gradient(135deg,${meta.gradientFrom},${meta.gradientTo})`,
                color:"white", fontSize:15, fontWeight:800, letterSpacing:".01em",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                fontFamily:"inherit", transition:"all .3s",
                boxShadow:`0 6px 24px ${meta.glow}`, marginBottom:12,
              }}
                onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 10px 32px ${meta.glow}`; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=`0 6px 24px ${meta.glow}`; }}
              >
                💳 Proceed to Payment →
              </button>

              <button onClick={() => router.replace("/dashboard")} style={{
                width:"100%", padding:"13px 24px", borderRadius:13,
                background:"rgba(255,255,255,.04)", border:"1.5px solid rgba(255,255,255,.1)",
                color:"rgba(255,255,255,.55)", fontSize:14, fontWeight:600,
                cursor:"pointer", fontFamily:"inherit", transition:"all .2s",
              }}
                onMouseEnter={e=>{ e.currentTarget.style.color="white"; e.currentTarget.style.borderColor="rgba(255,255,255,.25)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.color="rgba(255,255,255,.55)"; e.currentTarget.style.borderColor="rgba(255,255,255,.1)"; }}
              >
                Skip for now — View Dashboard
              </button>

              <p style={{ marginTop:14, fontSize:11, color:"rgba(255,255,255,.22)", textAlign:"center", lineHeight:1.6 }}>
                Your plan activates immediately. Billing setup can be done later from dashboard.
              </p>
            </div>

            {/* Trust badges */}
            <div style={{ padding:"18px 20px", borderRadius:16, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { icon:"🔒", text:"256-bit SSL" },
                  { icon:"💳", text:"All cards accepted" },
                  { icon:"🔄", text:"Cancel anytime" },
                  { icon:"📞", text:"Enhanced support" },
                ].map(b => (
                  <div key={b.text} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"rgba(255,255,255,.4)", fontWeight:500 }}>
                    <span>{b.icon}</span><span>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
