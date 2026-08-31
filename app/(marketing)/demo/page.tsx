"use client";

import { useEffect, useMemo, useState } from "react";
import { setStoredDemoBusinessPreference } from "@/lib/auth";
import BookingModal from "./BookingModal";
import { DEMO_BUSINESSES, type DemoBusiness, type DemoBusinessId } from "@/lib/businessCatalog";
import { DEMO_SESSION_LABEL, DEMO_SESSION_DURATION_TEXT } from "@/lib/demoSession";

const FONT = "'Outfit','Inter',sans-serif";

// Published demo sign-in. Kept in sync with lib/demoSandbox.ts — every visitor
// uses the same pair but lands in their own sandbox.
const DEMO_EMAIL = "demo@finovaos.app";
const DEMO_PASSWORD = "12345678";
// Session length lives in lib/demoSession.ts — this page used to carry its own
// copy, so the promised length and the real one could drift apart.

const BUSINESSES = DEMO_BUSINESSES;

/**
 * The three plans a visitor can open the demo on.
 *
 * Nothing about a plan is defined here — names, prices and bullets all come
 * from Admin → Plans through the public config routes, the same source the
 * /pricing page renders from. These are only the codes Company.plan carries,
 * plus a fallback for the first paint and for a config that has never been
 * saved.
 */
type DemoPlanCode = "STARTER" | "PRO" | "ENTERPRISE";
const PLAN_CODES: DemoPlanCode[] = ["STARTER", "PRO", "ENTERPRISE"];
const PLAN_CONFIG_KEY: Record<DemoPlanCode, "starter" | "pro" | "enterprise"> = {
  STARTER: "starter",
  PRO: "pro",
  ENTERPRISE: "enterprise",
};
const FALLBACK_PLAN_NAMES: Record<DemoPlanCode, string> = {
  STARTER: "Starter",
  PRO: "Professional",
  ENTERPRISE: "Enterprise",
};
const PLAN_BLURB: Record<DemoPlanCode, string> = {
  STARTER: "The everyday books — invoices, ledger, expenses.",
  PRO: "Adds inventory depth, CRM, payroll and the reporting suite.",
  ENTERPRISE: "Everything, including branches, audit trail and the AI operator.",
};

// Opens on the full product, as the demo always has — a visitor who never
// touches the picker sees no less than before.
const DEFAULT_PLAN: DemoPlanCode = "ENTERPRISE";

type PlanPrice = { monthly: number; currency: "USD" | "PKR" };


const CATEGORY_COLORS: Record<string, string> = {
  Commerce: "#38bdf8",
  Logistics: "#f59e0b",
  "Food & Beverage": "#f97316",
  Production: "#6366f1",
  Healthcare: "#ec4899",
  Education: "#14b8a6",
  Hospitality: "#a78bfa",
  Projects: "#fb923c",
  Property: "#f472b6",
  Trade: "#4ade80",
  Finance: "#14b8a6",
};

const CATEGORIES = Array.from(new Set(BUSINESSES.map((b) => b.category)));

// "60+ Business Types" was the old catalogue count while this page showed one
// live demo — a number the page itself contradicted.
const TRUST_STATS = [
  { value: "8",            label: "Live Demos",       icon: "🏢" },
  { value: "Early Access", label: "Limited Spots",    icon: "🚀" },
  { value: "No signup",    label: "To Start",         icon: "⚡" },
  { value: DEMO_SESSION_DURATION_TEXT, label: "Full Access",      icon: "⏱️" },
];

export default function DemoPage() {
  const [selectedBiz, setSelectedBiz] = useState<DemoBusinessId | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "workflow" | "ai">("overview");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Plan the demo workspace will open on. Everything the picker shows is
  // whatever Admin → Plans currently holds — see loadPlanCatalogue below.
  const [selectedPlan, setSelectedPlan] = useState<DemoPlanCode>(DEFAULT_PLAN);
  const [planNames, setPlanNames] = useState<Record<DemoPlanCode, string>>(FALLBACK_PLAN_NAMES);
  const [planPrices, setPlanPrices] = useState<Record<DemoPlanCode, PlanPrice> | null>(null);
  const [planHighlights, setPlanHighlights] = useState<Record<DemoPlanCode, string[]>>({
    STARTER: [], PRO: [], ENTERPRISE: [],
  });

  // Seed from hardcoded values so there's no flash on load
  const [liveStatusMap, setLiveStatusMap] = useState<Record<string, string>>(
    Object.fromEntries(BUSINESSES.map(b => [b.liveBusinessType, b.demoAvailable ? "live" : "coming_soon"]))
  );

  /**
   * Pulls the live plan catalogue.
   *
   *   /api/public/plan-config    → the plan names an admin typed
   *   /api/public/pricing        → prices + the bullet list per plan
   *   /api/public/pricing-region → whether this visitor is priced in PKR
   *
   * Same three routes the /pricing page uses, so the demo can never advertise
   * a plan differently from the page that sells it. A failure here just leaves
   * the fallback names standing — the picker still works.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pricing, config, region] = await Promise.all([
        fetch("/api/public/pricing", { cache: "no-store" }).then(r => r.json()).catch(() => null),
        fetch("/api/public/plan-config", { cache: "no-store" }).then(r => r.json()).catch(() => null),
        fetch("/api/public/pricing-region", { cache: "no-store" }).then(r => r.json()).catch(() => null),
      ]);
      if (cancelled) return;

      if (Array.isArray(config?.plans)) {
        const named = { ...FALLBACK_PLAN_NAMES };
        for (const code of PLAN_CODES) {
          const match = config.plans.find((pl: any) => pl?.code === PLAN_CONFIG_KEY[code]);
          if (match?.name && typeof match.name === "string") named[code] = match.name;
        }
        setPlanNames(named);
      }

      if (pricing?.pricing) {
        // PKR visitors see the PKR table when the admin has filled one in,
        // exactly as /pricing decides it.
        const usePkr = !!region?.isPakistan && !!pricing.pkrPricing;
        const table = usePkr ? pricing.pkrPricing : pricing.pricing;
        const currency: PlanPrice["currency"] = usePkr ? "PKR" : "USD";
        setPlanPrices({
          STARTER: { monthly: Number(table?.starter?.monthly ?? 0), currency },
          PRO: { monthly: Number(table?.pro?.monthly ?? 0), currency },
          ENTERPRISE: { monthly: Number(table?.enterprise?.monthly ?? 0), currency },
        });
      }

      if (pricing?.planHighlights) {
        setPlanHighlights({
          STARTER: Array.isArray(pricing.planHighlights.starter) ? pricing.planHighlights.starter : [],
          PRO: Array.isArray(pricing.planHighlights.pro) ? pricing.planHighlights.pro : [],
          ENTERPRISE: Array.isArray(pricing.planHighlights.enterprise) ? pricing.planHighlights.enterprise : [],
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetch("/api/public/business-module-status", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d?.statusMap) setLiveStatusMap(d.statusMap); })
      .catch(() => {});
  }, []);

  const isDemoLive = (liveBusinessType: string) => liveStatusMap[liveBusinessType] === "live";

  const filteredBusinesses = useMemo(
    () => (activeCategory ? BUSINESSES.filter((b) => b.category === activeCategory) : BUSINESSES),
    [activeCategory]
  );

  const biz = useMemo(() => BUSINESSES.find((b) => b.id === selectedBiz) || null, [selectedBiz]);

  function handleBook() {
    if (!biz || !isDemoLive(biz.liveBusinessType)) return;
    setStoredDemoBusinessPreference(biz.liveBusinessType);
    setBookingOpen(true);
  }

  /**
   * Starts a demo straight away. The API builds a private sandbox company for
   * this visitor and sets the session cookie, so there is nothing to book and
   * nothing shared with whoever else is in the demo right now.
   */
  async function handleInstantDemo() {
    if (!biz || !isDemoLive(biz.liveBusinessType) || launching) return;
    setLaunchError(null);
    setLaunching(biz.liveBusinessType);
    setStoredDemoBusinessPreference(biz.liveBusinessType);
    try {
      const res = await fetch("/api/demo/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: biz.liveBusinessType, plan: selectedPlan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLaunchError(data?.message || "Could not start the demo. Please try again.");
        setLaunching(null);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setLaunchError("Network error — please check your connection and try again.");
      setLaunching(null);
    }
  }

  function selectBiz(id: DemoBusinessId) {
    setSelectedBiz(id);
    setActiveTab("overview");
    setTimeout(() => {
      document.getElementById("biz-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07091a", color: "#fff", fontFamily: FONT }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.55; } }
        .biz-card { transition: transform .18s, border-color .18s, box-shadow .18s; cursor: pointer; }
        .biz-card:hover { transform: translateY(-4px); }
        .tab-btn { transition: background .15s, color .15s; cursor: pointer; border:none; font-family:inherit; }
        .cat-btn { transition: background .15s, color .15s, border-color .15s; cursor: pointer; border:1px solid transparent; }
        .cat-btn:hover { border-color: rgba(255,255,255,.2); }
        .launch-btn { transition: transform .18s, filter .18s; cursor: pointer; border:none; font-family:inherit; }
        .plan-card { transition: transform .18s, border-color .18s, box-shadow .18s; }
        .plan-card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,.22); }
        .launch-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.06); }
        .mod-chip { transition: background .14s, border-color .14s; }
        .mod-chip:hover { background: rgba(255,255,255,.07); }
        @media(max-width:980px){
          .demo-detail-header,
          .demo-overview-grid,
          .demo-workflow-grid,
          .demo-ai-bottom{
            grid-template-columns:1fr !important;
          }
          .demo-detail-header{
            flex-direction:column !important;
            align-items:flex-start !important;
          }
          .demo-detail-header .launch-btn{
            width:100%;
          }
          .demo-highlights{
            grid-template-columns:1fr !important;
          }
          .demo-ai-feature-grid{
            grid-template-columns:1fr !important;
          }
        }
        @media(max-width:720px){
          .demo-tabs{
            width:100% !important;
            flex-wrap:wrap !important;
          }
          .demo-tabs .tab-btn{
            flex:1 1 calc(50% - 6px);
            text-align:center;
          }
          .demo-module-grid,
          .demo-plan-grid,
          .demo-ai-metric-grid{
            grid-template-columns:1fr !important;
          }
          .demo-bottom-cta{
            padding:24px 20px !important;
          }
          .demo-bottom-cta .launch-btn{
            width:100%;
          }
        }
      `}</style>

      {/* ─── Hero ─── */}
      <div style={{ textAlign: "center", padding: "80px 24px 48px", maxWidth: 900, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.3)", marginBottom: 22 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#a5b4fc", letterSpacing: ".08em", textTransform: "uppercase" }}>Live Interactive Demo</span>
        </div>

        <h1 style={{ margin: "0 0 18px", fontSize: "clamp(36px,5.5vw,62px)", fontWeight: 900, letterSpacing: -1.8, lineHeight: 1.04 }}>
          Pick your business type.
          <br />
          <span style={{ background: "linear-gradient(90deg,#a5b4fc,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            See exactly how FinovaOS runs it.
          </span>
        </h1>
        {/* The page now lists only what actually opens. A grid of "coming soon"
            cards next to live ones just made a visitor guess which was which. */}
        <p style={{ fontSize: 17, color: "rgba(255,255,255,.5)", lineHeight: 1.8, maxWidth: 620, margin: "0 auto 32px" }}>
          {BUSINESSES.length} business types, all live right now. Each one opens a private {DEMO_SESSION_LABEL}
          workspace configured for your industry — real customers, stock, posted invoices and payroll already
          loaded, so you can test it like it is your own business.
        </p>

        {/* Trust bar */}
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
          {TRUST_STATS.map((t) => (
            <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 999, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{t.value}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 100px" }}>

        {/* ─── Category Filter ─── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 28 }}>
          <button
            className="cat-btn"
            onClick={() => setActiveCategory(null)}
            style={{ padding: "7px 16px", borderRadius: 999, background: !activeCategory ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.03)", color: !activeCategory ? "#fff" : "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 700, fontFamily: FONT }}
          >
            All ({BUSINESSES.length})
          </button>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            const c = CATEGORY_COLORS[cat] || "#a5b4fc";
            return (
              <button
                key={cat}
                className="cat-btn"
                onClick={() => setActiveCategory(active ? null : cat)}
                style={{ padding: "7px 16px", borderRadius: 999, background: active ? `${c}18` : "rgba(255,255,255,.03)", color: active ? c : "rgba(255,255,255,.5)", borderColor: active ? `${c}40` : "transparent", fontSize: 12, fontWeight: 700, fontFamily: FONT }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ─── Business Cards Grid ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 48 }}>
          {filteredBusinesses.map((entry, i) => {
            const active = entry.id === selectedBiz;
            return (
              <div
                key={entry.id}
                className="biz-card"
                onClick={() => selectBiz(entry.id)}
                style={{
                  background: active ? `linear-gradient(135deg,${entry.color}18,rgba(255,255,255,.04))` : "rgba(255,255,255,.03)",
                  border: `1.5px solid ${active ? entry.color : "rgba(255,255,255,.07)"}`,
                  borderRadius: 20,
                  padding: "20px 18px",
                  boxShadow: active ? `0 16px 40px ${entry.color}22` : "none",
                  animation: `fadeUp .4s ease ${i * 0.03}s both`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {active && (
                  <div style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: "50%", background: entry.color, boxShadow: `0 0 10px ${entry.color}` }} />
                )}
                <div style={{ width: 48, height: 48, borderRadius: 14, background: entry.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 12, boxShadow: `0 6px 20px ${entry.color}35` }}>
                  {entry.icon}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: CATEGORY_COLORS[entry.category] || "#a5b4fc", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>
                  {entry.category}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: active ? entry.color : "#fff", marginBottom: 4 }}>{entry.label}</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)", lineHeight: 1.5 }}>{entry.tagline}</div>
                <div style={{ marginTop: 8 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: isDemoLive(entry.liveBusinessType) ? "rgba(16,185,129,.12)" : "rgba(245,158,11,.1)",
                      border: `1px solid ${isDemoLive(entry.liveBusinessType) ? "rgba(16,185,129,.25)" : "rgba(245,158,11,.2)"}`,
                      color: isDemoLive(entry.liveBusinessType) ? "#34d399" : "#fbbf24",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: ".04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {isDemoLive(entry.liveBusinessType) ? "Live Demo" : "Coming Soon"}
                  </span>
                </div>
                {/* The per-business user counts that used to sit here were
                    invented. Pre-launch, the honest signal is the category. */}
                <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.25)", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>{entry.category}</div>
              </div>
            );
          })}
        </div>

        {/* ─── No selection placeholder ─── */}
        {!biz && (
          <div style={{ textAlign: "center", padding: "40px 24px", borderRadius: 24, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👆</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Select a business type above</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,.35)" }}>
              We will show you the exact modules, AI features, and workflow for your business — then let you open the live workspace.
            </div>
          </div>
        )}

        {/* ─── Business Detail ─── */}
        {biz && (
          <div id="biz-detail" style={{ animation: "fadeUp .35s ease both" }}>

            {/* ─── Plan picker ───
                The sandbox is built on the plan chosen here, so the workspace
                that opens is gated by exactly what Admin → Plans grants that
                plan — same pages, same modules a paying tenant on it gets.
                Before this every demo ran on Enterprise, which showed the whole
                product to someone about to buy Starter. */}
            <div style={{ marginBottom: 22, padding: "24px 24px 22px", borderRadius: 24, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.4 }}>Which plan do you want to test?</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: biz.color }}>{biz.label}</div>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.42)", lineHeight: 1.6, marginBottom: 18 }}>
                Your demo workspace opens locked to this plan — the same pages, modules and limits a paying
                customer gets on it. Switch plan and start again any time to compare.
              </div>

              <div className="demo-plan-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
                {PLAN_CODES.map((code) => {
                  const active = selectedPlan === code;
                  const price = planPrices?.[code];
                  const bullets = (planHighlights[code] || []).slice(0, 4);
                  return (
                    <button
                      key={code}
                      type="button"
                      className="plan-card"
                      onClick={() => setSelectedPlan(code)}
                      aria-pressed={active}
                      style={{
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: FONT,
                        padding: "18px 18px 16px",
                        borderRadius: 20,
                        background: active ? `linear-gradient(135deg,${biz.color}16,rgba(255,255,255,.03))` : "rgba(255,255,255,.03)",
                        border: `1.5px solid ${active ? biz.color : "rgba(255,255,255,.08)"}`,
                        boxShadow: active ? `0 14px 34px ${biz.color}22` : "none",
                        color: "#fff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: active ? biz.color : "#fff" }}>{planNames[code]}</div>
                        <span style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, border: `1.5px solid ${active ? biz.color : "rgba(255,255,255,.25)"}`, background: active ? biz.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#07091a" }}>
                          {active ? "✓" : ""}
                        </span>
                      </div>

                      {price && price.monthly > 0 && (
                        <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,.72)", marginBottom: 8 }}>
                          {price.currency === "PKR" ? `Rs ${price.monthly.toLocaleString()}` : `${price.monthly}`}
                          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.35)" }}> /month</span>
                        </div>
                      )}

                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", lineHeight: 1.55, marginBottom: bullets.length ? 10 : 0 }}>
                        {PLAN_BLURB[code]}
                      </div>

                      {bullets.map((f) => (
                        <div key={f} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 11.5, color: "rgba(255,255,255,.5)", lineHeight: 1.5, marginTop: 5 }}>
                          <span style={{ color: active ? biz.color : "rgba(255,255,255,.3)", fontWeight: 900 }}>·</span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Header */}
            <div className="demo-detail-header" style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28, padding: "28px 28px", background: `linear-gradient(135deg,${biz.color}12,rgba(255,255,255,.02))`, border: `1px solid ${biz.color}25`, borderRadius: 24 }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: biz.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0, boxShadow: `0 10px 30px ${biz.color}40` }}>
                {biz.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8 }}>{biz.label}</div>
                  <div style={{ padding: "4px 12px", borderRadius: 999, background: `${biz.color}20`, color: biz.color, fontSize: 11, fontWeight: 800 }}>
                    {biz.category}
                  </div>
                  <div style={{ padding: "4px 12px", borderRadius: 999, background: isDemoLive(biz.liveBusinessType) ? "rgba(16,185,129,.14)" : "rgba(245,158,11,.12)", color: isDemoLive(biz.liveBusinessType) ? "#34d399" : "#fbbf24", fontSize: 11, fontWeight: 800 }}>
                    {isDemoLive(biz.liveBusinessType) ? "Live Demo Ready" : "Coming Soon"}
                  </div>
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.7, maxWidth: 680 }}>{biz.description}</div>
              </div>
              <div style={{ display: "flex", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
                <button
                  className="launch-btn"
                  onClick={handleInstantDemo}
                  disabled={!isDemoLive(biz.liveBusinessType) || launching !== null}
                  style={{
                    background: isDemoLive(biz.liveBusinessType) ? biz.gradient : "rgba(255,255,255,.08)",
                    color: isDemoLive(biz.liveBusinessType) ? "#fff" : "rgba(255,255,255,.45)",
                    borderRadius: 16,
                    padding: "14px 28px",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: !isDemoLive(biz.liveBusinessType) || launching ? "not-allowed" : "pointer",
                    boxShadow: isDemoLive(biz.liveBusinessType) ? `0 10px 28px ${biz.color}35` : "none",
                    whiteSpace: "nowrap",
                    opacity: launching && launching !== biz.liveBusinessType ? 0.5 : 1,
                  }}
                >
                  {launching === biz.liveBusinessType
                    ? "Preparing your workspace…"
                    : `▶ Start ${planNames[selectedPlan]} Demo`}
                </button>
                <button
                  className="launch-btn"
                  onClick={handleBook}
                  disabled={!isDemoLive(biz.liveBusinessType)}
                  style={{
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.14)",
                    color: "rgba(255,255,255,.72)",
                    borderRadius: 16,
                    padding: "14px 22px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: !isDemoLive(biz.liveBusinessType) ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  📅 Book a Slot
                </button>
              </div>
            </div>

            {launchError && (
              <div style={{ marginTop: -8, marginBottom: 20, padding: "14px 18px", borderRadius: 16, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 13, lineHeight: 1.6 }}>
                {launchError}
              </div>
            )}

            {isDemoLive(biz.liveBusinessType) && (
              <div style={{ marginTop: -8, marginBottom: 20, padding: "14px 18px", borderRadius: 16, background: "rgba(16,185,129,.07)", border: "1px solid rgba(16,185,129,.2)", color: "rgba(255,255,255,.72)", fontSize: 13, lineHeight: 1.7 }}>
                Opens a private {DEMO_SESSION_LABEL} workspace on the <strong style={{ color: "#fff" }}>{planNames[selectedPlan]}</strong> plan,
                already loaded with customers, suppliers, stock, posted invoices, payroll and live dashboard figures —
                yours alone, and wiped the moment you leave.
                Sign-in is <strong style={{ color: "#fff" }}>{DEMO_EMAIL}</strong> / <strong style={{ color: "#fff" }}>{DEMO_PASSWORD}</strong> if you would rather log in yourself.
              </div>
            )}

            {!isDemoLive(biz.liveBusinessType) && (
              <div style={{ marginTop: -8, marginBottom: 20, padding: "14px 18px", borderRadius: 16, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", color: "rgba(255,255,255,.72)", fontSize: 13, lineHeight: 1.6 }}>
                This business preview is available, but its live demo workspace has not launched yet. Phase 1 live demos are
                Trading, Retail &amp; Multi-Store, Distribution, Import / Export, Clearing &amp; Forwarding, and Wholesale.
              </div>
            )}

            {/* Highlight stats */}
            <div className="demo-highlights" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 22 }}>
              {biz.highlights.map((h) => (
                <div key={h.label} style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${biz.color}18`, borderRadius: 18, padding: "20px 18px" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 8 }}>{h.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: biz.color, marginBottom: 6 }}>{h.value}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.5 }}>{h.sub}</div>
                </div>
              ))}
            </div>

            {/* Tab switcher */}
              <div className="demo-tabs" style={{ display: "flex", gap: 6, marginBottom: 22, background: "rgba(255,255,255,.03)", padding: 6, borderRadius: 16, border: "1px solid rgba(255,255,255,.06)", width: "fit-content" }}>
              {(["overview", "workflow", "ai"] as const).map((tab) => {
                const labels = { overview: "📦 Modules & Proof", workflow: "⚙️ Workflow Steps", ai: "🤖 AI Features" };
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    className="tab-btn"
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 12,
                      background: active ? biz.gradient : "transparent",
                      color: active ? "#fff" : "rgba(255,255,255,.45)",
                      fontSize: 13,
                      fontWeight: 700,
                      boxShadow: active ? `0 4px 14px ${biz.color}30` : "none",
                    }}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Tab: Overview */}
            {activeTab === "overview" && (
              <div className="demo-overview-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, animation: "fadeUp .3s ease both" }}>
                {/* Modules */}
                <div style={{ background: "rgba(255,255,255,.025)", border: `1px solid ${biz.color}18`, borderRadius: 22, padding: "22px 22px" }}>
                  <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Modules included for {biz.label}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", marginBottom: 16 }}>These modules are pre-loaded in your live demo workspace.</div>
                  <div className="demo-module-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                    {biz.modules.map((mod) => (
                      <div key={mod} className="mod-chip" style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.82)", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: biz.color, flexShrink: 0 }} />
                        {mod}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Proof + docs */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: 20, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Why this matters</div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {biz.proof.map((p) => (
                        <div key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.025)" }}>
                          <div style={{ width: 22, height: 22, borderRadius: 7, background: `${biz.color}20`, color: biz.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>✓</div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.55 }}>{p}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 18, padding: "16px 18px" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>Sample documents in the demo</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {biz.sampleDocs.map((doc) => (
                        <span key={doc} style={{ padding: "6px 12px", borderRadius: 999, background: `${biz.color}12`, border: `1px solid ${biz.color}25`, color: "rgba(255,255,255,.72)", fontSize: 12, fontWeight: 700 }}>
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Workflow */}
            {activeTab === "workflow" && (
              <div className="demo-workflow-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18, animation: "fadeUp .3s ease both" }}>
                <div style={{ background: "rgba(255,255,255,.025)", border: `1px solid ${biz.color}18`, borderRadius: 22, padding: "24px 24px" }}>
                  <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 18 }}>How {biz.label} works on FinovaOS</div>
                  <div style={{ display: "grid", gap: 16 }}>
                    {biz.workflow.map((step, i) => (
                      <div key={step.step} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ width: 34, height: 34, borderRadius: 999, background: i === 0 ? biz.gradient : `${biz.color}20`, color: i === 0 ? "#fff" : biz.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, flexShrink: 0, boxShadow: i === 0 ? `0 4px 14px ${biz.color}35` : "none" }}>
                          {i + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{step.step}</div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,.48)", lineHeight: 1.6 }}>{step.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 22, padding: 22 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>What the owner sees</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {biz.insights.map((ins) => (
                      <div key={ins} style={{ padding: "13px 14px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)", fontSize: 13, color: "rgba(255,255,255,.68)", lineHeight: 1.6 }}>
                        {ins}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 16, background: `${biz.color}10`, border: `1px solid ${biz.color}25` }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: biz.color, marginBottom: 6 }}>🚀 Want to try it yourself?</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.6 }}>
                      Book a 1-hour live session using the button at the top of this page. You&apos;ll get instant access to a real dashboard pre-configured for {biz.label}.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: AI Features */}
            {activeTab === "ai" && (
              <div style={{ animation: "fadeUp .3s ease both" }}>
                <div className="demo-ai-feature-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
                  {biz.aiFeatures.map((feat) => (
                    <div key={feat} style={{ padding: "20px 18px", borderRadius: 18, background: "linear-gradient(135deg,rgba(99,102,241,.1),rgba(167,139,250,.06))", border: "1px solid rgba(99,102,241,.2)", fontSize: 14, color: "rgba(255,255,255,.78)", lineHeight: 1.65, fontWeight: 600 }}>
                      {feat}
                    </div>
                  ))}
                </div>
                <div className="demo-ai-bottom" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ padding: "22px 22px", borderRadius: 20, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>AI Chat — Ask anything</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.7, marginBottom: 14 }}>
                      In the live demo, open the AI Assistant and type any question about your data — revenue trends, best customers, cash flow, what to do next. FinovaOS AI answers with real numbers from your demo data.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {["What is my revenue trend this month?", "Which customers owe the most?", "What should I focus on this week?"].map((q) => (
                        <div key={q} style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", fontSize: 12, color: "rgba(255,255,255,.55)", fontStyle: "italic" }}>
                          &ldquo;{q}&rdquo;
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: "22px 22px", borderRadius: 20, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>AI Insights Dashboard</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.7, marginBottom: 14 }}>
                      The AI tab in the dashboard shows automated insights, revenue forecasts for the next 30–90 days, anomaly alerts, and business health score — all generated from your actual transaction data.
                    </div>
                    <div className="demo-ai-metric-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {["Revenue Forecast", "Anomaly Alerts", "Health Score", "Smart Recommendations", "Market Intelligence", "Business Advisor"].map((feat) => (
                        <div key={feat} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.15)", fontSize: 12, fontWeight: 700, color: "#a5b4fc", textAlign: "center" }}>
                          {feat}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom info panel (single-CTA design — booking button is at the top of the section) */}
            <div className="demo-bottom-cta" style={{ marginTop: 28, padding: "28px 32px", borderRadius: 24, background: `linear-gradient(135deg,${biz.color}12,rgba(255,255,255,.03))`, border: `1px solid ${biz.color}25` }}>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, marginBottom: 8 }}>
                How the {biz.label} demo works
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.75, marginBottom: 16 }}>
                Hit <strong style={{ color: biz.color }}>▶ Start Demo Now</strong> and you land in a real dashboard pre-configured for {biz.label} —
                customers, suppliers, stock, posted invoices and a payroll run already in place. Create your own invoices,
                run payroll, check the reports. The workspace is yours alone, and everything you do is wiped when the
                {" "}{DEMO_SESSION_DURATION_TEXT} are up. Prefer a guided walkthrough? Book a slot instead.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[
                  { icon: "⚡", text: "No signup, starts instantly" },
                  { icon: "🔒", text: "Private workspace, not shared" },
                  { icon: "🧹", text: "Auto-wiped when it ends" },
                ].map(pt => (
                  <div key={pt.text} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: 12, color: "rgba(255,255,255,.7)", fontWeight: 600 }}>
                    <span>{pt.icon}</span> {pt.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {biz && (
        <BookingModal
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          businessType={biz.liveBusinessType}
          businessLabel={biz.label}
          color={biz.color}
          gradient={biz.gradient}
        />
      )}
    </div>
  );
}
