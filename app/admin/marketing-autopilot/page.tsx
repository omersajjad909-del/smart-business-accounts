"use client";
/**
 * Marketing Autopilot
 * /admin/marketing-autopilot
 *
 * AI-powered marketing engine for FinovaOS:
 * 1. Content Calendar  — AI generates niche-specific posts, schedules them
 * 2. Ad Copy Generator — Facebook/Instagram ad copy + targeting for $50 budget
 * 3. Outreach Builder  — WhatsApp + Email scripts for cold prospects
 * 4. Lead Pipeline     — Track prospect → demo booked → paid customer
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const F   = "'Outfit','Inter',sans-serif";
const BG  = "#070b14";
const PNL = "rgba(255,255,255,.04)";
const BDR = "rgba(255,255,255,.08)";

type Tab = "calendar" | "ads" | "outreach" | "pipeline";

function adminHdrs(json = false): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  if (u?.id)   h["x-user-id"]   = u.id;
  if (u?.role) h["x-user-role"] = u.role;
  const co = process.env.NEXT_PUBLIC_ADMIN_COMPANY_ID || "";
  if (co) h["x-company-id"] = co;
  return h;
}

// ─── Atoms ───────────────────────────────────────────────────────────────────
function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: PNL, border: `1px solid ${BDR}`, borderRadius: 14, padding: "20px 22px", ...style }}>{children}</div>;
}
function Btn({ children, loading = false, variant = "primary", ...p }: { children: React.ReactNode; loading?: boolean; variant?: "primary"|"ghost"|"danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} disabled={loading || p.disabled} style={{
      padding: "9px 20px", borderRadius: 9, border: variant === "ghost" ? `1px solid ${BDR}` : "none",
      background: variant === "primary" ? "linear-gradient(135deg,#7c3aed,#2563eb)" : variant === "danger" ? "rgba(239,68,68,.12)" : "rgba(255,255,255,.07)",
      color: variant === "danger" ? "#f87171" : "#fff", fontSize: 13, fontFamily: F, fontWeight: 600,
      cursor: "pointer", opacity: (loading || p.disabled) ? .55 : 1, whiteSpace: "nowrap" as const, ...p.style,
    }}>{loading ? "Generating…" : children}</button>
  );
}
function Sel({ label, options, value, onChange }: { label: string; options: { v: string; l: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 5, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" as const }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BDR}`, background: "rgba(255,255,255,.06)", color: "#e2e8f0", fontSize: 13, fontFamily: F, outline: "none" }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function useToast() {
  const [t, setT] = useState<{ msg: string; ok: boolean } | null>(null);
  const show = (msg: string, ok = true) => { setT({ msg, ok }); setTimeout(() => setT(null), 3500); };
  return { t, show };
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function MarketingAutopilotPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab]     = useState<Tab>("calendar");

  useEffect(() => {
    const u = getCurrentUser();
    if (!u || String(u.role || "").toUpperCase() !== "ADMIN") { router.replace("/admin/login"); return; }
    setReady(true);
  }, []);

  if (!ready) return <div style={{ minHeight: "100vh", background: BG }} />;

  const TABS: { id: Tab; icon: string; label: string; desc: string; color: string }[] = [
    { id: "calendar",  icon: "📅", label: "Content Calendar",   desc: "AI se daily posts generate karo",           color: "#818cf8" },
    { id: "ads",       icon: "🎯", label: "Ad Copy Generator",  desc: "$50 budget mein Facebook/Instagram ads",    color: "#f472b6" },
    { id: "outreach",  icon: "📨", label: "Outreach Builder",   desc: "WhatsApp + Email cold scripts",             color: "#34d399" },
    { id: "pipeline",  icon: "💼", label: "Lead Pipeline",      desc: "Prospect se paid customer track karo",      color: "#fbbf24" },
  ];

  return (
    <div style={{ fontFamily: F, color: "#e2e8f0", minHeight: "100vh", background: BG, padding: "32px 32px 60px 280px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#f472b6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🤖</div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, background: "linear-gradient(135deg,#a78bfa,#f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Marketing Autopilot
            </h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,.35)", fontSize: 13 }}>AI-powered client acquisition engine for FinovaOS</p>
          </div>
        </div>
      </div>

      {/* Tab cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "16px", borderRadius: 14, border: `2px solid ${tab === t.id ? t.color + "60" : BDR}`,
            background: tab === t.id ? `${t.color}12` : PNL,
            cursor: "pointer", textAlign: "left" as const, fontFamily: F, transition: "all .15s",
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{t.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: tab === t.id ? t.color : "rgba(255,255,255,.8)", marginBottom: 3 }}>{t.label}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", lineHeight: 1.4 }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "calendar"  && <ContentCalendarTab />}
      {tab === "ads"       && <AdCopyTab />}
      {tab === "outreach"  && <OutreachTab />}
      {tab === "pipeline"  && <PipelineTab />}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TAB 1 — CONTENT CALENDAR
// ════════════════════════════════════════════════════════
type GeneratedPost = { platform: string; text: string; hashtags: string; bestTime: string; type: string };

function ContentCalendarTab() {
  const { t, show } = useToast();
  const [niche,    setNiche]    = useState("trading");
  const [lang,     setLang]     = useState("english");
  const [count,    setCount]    = useState("7");
  const [platform, setPlatform] = useState("all");
  const [loading,  setLoading]  = useState(false);
  const [posts,    setPosts]    = useState<GeneratedPost[]>([]);
  const [posting,  setPosting]  = useState<number | null>(null);

  const NICHES = [
    { v: "trading",         l: "Trading Business" },
    { v: "import_export",   l: "Import / Export" },
    { v: "wholesale",       l: "Wholesaler" },
    { v: "distributor",     l: "Distributor" },
    { v: "retail",          l: "Retail / Shop" },
    { v: "manufacturing",   l: "Manufacturing" },
    { v: "services",        l: "Service Business" },
  ];

  async function generate() {
    setLoading(true);
    setPosts([]);
    try {
      const r = await fetch("/api/admin/marketing-autopilot/content", {
        method: "POST",
        headers: adminHdrs(true),
        body: JSON.stringify({ niche, lang, count: Number(count), platform }),
      });
      const d = await r.json();
      if (r.ok && d.posts) { setPosts(d.posts); show(`${d.posts.length} posts ready!`); }
      else show(d?.error || "Generation failed", false);
    } finally { setLoading(false); }
  }

  async function publishPost(idx: number) {
    const p = posts[idx];
    setPosting(idx);
    try {
      const r = await fetch("/api/automation/social", {
        method: "POST",
        headers: adminHdrs(true),
        body: JSON.stringify({ text: `${p.text}\n\n${p.hashtags}`, platforms: p.platform === "all" ? ["facebook","instagram","linkedin"] : [p.platform] }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d?.id) await fetch(`/api/automation/social?action=publish&id=${d.id}`, { method: "POST", headers: adminHdrs() });
        show("Published!", true);
      } else show("Publish failed", false);
    } finally { setPosting(null); }
  }

  const PLATFORM_COLOR: Record<string, string> = { facebook: "#1877f2", instagram: "#e1306c", linkedin: "#0a66c2", all: "#a78bfa" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {t && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, padding: "10px 18px", borderRadius: 10, background: t.ok ? "rgba(52,211,153,.12)" : "rgba(239,68,68,.12)", border: `1px solid ${t.ok ? "rgba(52,211,153,.3)" : "rgba(239,68,68,.3)"}`, color: t.ok ? "#34d399" : "#f87171", fontSize: 13 }}>{t.msg}</div>}

      <Card>
        <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>📅 Generate Content Calendar</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
          <Sel label="Target Business Niche" options={NICHES} value={niche} onChange={setNiche} />
          <Sel label="Language" options={[{ v: "english", l: "English (Global)" }, { v: "urdu", l: "Urdu (Pakistan)" }, { v: "both", l: "Both" }]} value={lang} onChange={setLang} />
          <Sel label="Number of Posts" options={["3","5","7","10","14"].map(v => ({ v, l: `${v} posts` }))} value={count} onChange={setCount} />
          <Sel label="Platform Focus" options={[{ v: "all", l: "All Platforms" }, { v: "facebook", l: "Facebook" }, { v: "instagram", l: "Instagram" }, { v: "linkedin", l: "LinkedIn" }]} value={platform} onChange={setPlatform} />
        </div>

        {/* What AI will generate */}
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(129,140,248,.06)", border: "1px solid rgba(129,140,248,.15)", marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 700, marginBottom: 8 }}>AI kya likhega — {NICHES.find(n => n.v === niche)?.l} ke liye:</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 6 }}>
            {[
              "Pain point posts (manual work, errors, time waste)",
              "Feature spotlight (invoice, inventory, reports)",
              "Social proof / ROI numbers",
              "Before/After comparison posts",
              "Industry-specific problem → solution",
              "Call-to-action posts (get started today)",
              "Motivational business tips with FinovaOS hook",
            ].map(item => (
              <div key={item} style={{ fontSize: 11, color: "rgba(255,255,255,.4)", display: "flex", gap: 6, alignItems: "flex-start" }}>
                <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span> {item}
              </div>
            ))}
          </div>
        </div>

        <Btn onClick={generate} loading={loading}>🤖 Generate {count} Posts</Btn>
      </Card>

      {/* Generated posts */}
      {posts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.6)" }}>{posts.length} posts generated — review karke directly publish karo:</div>
          {posts.map((p, i) => (
            <Card key={i} style={{ borderLeft: `3px solid ${PLATFORM_COLOR[p.platform] || "#818cf8"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: `${PLATFORM_COLOR[p.platform] || "#818cf8"}22`, color: PLATFORM_COLOR[p.platform] || "#818cf8", fontWeight: 700, textTransform: "capitalize" as const }}>{p.platform}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{p.type}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>⏰ Best time: {p.bestTime}</span>
                </div>
                <Btn variant="ghost" style={{ fontSize: 12, padding: "5px 14px" }} loading={posting === i} onClick={() => publishPost(i)}>
                  🚀 Publish Now
                </Btn>
              </div>
              <p style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.7, margin: "0 0 8px", whiteSpace: "pre-wrap" as const }}>{p.text}</p>
              <div style={{ fontSize: 11, color: "#818cf8" }}>{p.hashtags}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TAB 2 — AD COPY GENERATOR
// ════════════════════════════════════════════════════════
type AdSet = { headline: string; primaryText: string; cta: string; targeting: string; dailyBudget: string; estimatedReach: string; objective: string };

function AdCopyTab() {
  const { t, show } = useToast();
  const [niche,     setNiche]    = useState("trading");
  const [budget,    setBudget]   = useState("50");
  const [region,    setRegion]   = useState("global");
  const [objective, setObj]      = useState("conversions");
  const [loading,   setLoading]  = useState(false);
  const [ads,       setAds]      = useState<AdSet[]>([]);

  async function generate() {
    setLoading(true); setAds([]);
    try {
      const r = await fetch("/api/admin/marketing-autopilot/ads", {
        method: "POST",
        headers: adminHdrs(true),
        body: JSON.stringify({ niche, budget: Number(budget), region, objective }),
      });
      const d = await r.json();
      if (r.ok && d.ads) { setAds(d.ads); show(`${d.ads.length} ad sets ready!`); }
      else show(d?.error || "Failed", false);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {t && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, padding: "10px 18px", borderRadius: 10, background: t.ok ? "rgba(52,211,153,.12)" : "rgba(239,68,68,.12)", border: `1px solid ${t.ok ? "rgba(52,211,153,.3)" : "rgba(239,68,68,.3)"}`, color: t.ok ? "#34d399" : "#f87171", fontSize: 13 }}>{t.msg}</div>}

      <Card>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>🎯 Facebook & Instagram Ad Copy</h3>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          AI aapke budget aur niche ke hisaab se complete ad sets banata hai — headline, copy, CTA, targeting, aur budget split ke saath.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
          <Sel label="Target Niche" options={[
            { v: "trading",       l: "Trading Business" },
            { v: "import_export", l: "Import / Export" },
            { v: "wholesale",     l: "Wholesaler" },
            { v: "distributor",   l: "Distributor" },
            { v: "all_business",  l: "All Business Types" },
          ]} value={niche} onChange={setNiche} />
          <Sel label="Monthly Ad Budget" options={["30","50","100","200"].map(v => ({ v, l: `$${v}/month` }))} value={budget} onChange={setBudget} />
          <Sel label="Target Region" options={[
            { v: "global",    l: "Global" },
            { v: "pakistan",  l: "Pakistan" },
            { v: "uae",       l: "UAE / Gulf" },
            { v: "uk_us",     l: "UK / USA" },
            { v: "south_asia",l: "South Asia" },
          ]} value={region} onChange={setRegion} />
          <Sel label="Campaign Objective" options={[
            { v: "conversions",    l: "Conversions (Sign-ups)" },
            { v: "traffic",        l: "Website Traffic" },
            { v: "lead_gen",       l: "Lead Generation Form" },
            { v: "awareness",      l: "Brand Awareness" },
          ]} value={objective} onChange={setObj} />
        </div>

        {/* Budget breakdown */}
        <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(244,114,182,.06)", border: "1px solid rgba(244,114,182,.15)", marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f472b6", marginBottom: 10 }}>💡 ${budget}/month Budget Distribution (AI suggestion):</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { label: "Awareness / Cold", pct: 40, color: "#818cf8" },
              { label: "Retargeting", pct: 35, color: "#f472b6" },
              { label: "Lookalike Audience", pct: 25, color: "#34d399" },
            ].map(b => (
              <div key={b.label} style={{ textAlign: "center" as const, padding: "10px", borderRadius: 8, background: "rgba(255,255,255,.03)" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: b.color }}>${Math.round(Number(budget) * b.pct / 100)}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{b.label}</div>
                <div style={{ fontSize: 10, color: b.color }}>{b.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        <Btn onClick={generate} loading={loading}>🤖 Generate Ad Copy + Targeting</Btn>
      </Card>

      {/* Generated ads */}
      {ads.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.6)" }}>{ads.length} ad sets — copy karke Facebook Ads Manager mein paste karo:</div>
          {ads.map((ad, i) => (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#f472b6", padding: "3px 10px", borderRadius: 20, background: "rgba(244,114,182,.12)", border: "1px solid rgba(244,114,182,.2)" }}>Ad Set {i + 1} — {ad.objective}</span>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 12px" }} onClick={() => { navigator.clipboard?.writeText(`Headline: ${ad.headline}\n\nPrimary Text:\n${ad.primaryText}\n\nCTA: ${ad.cta}\n\nTargeting: ${ad.targeting}`); show("Copied!", true); }}>📋 Copy All</Btn>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", fontWeight: 700, letterSpacing: ".06em", marginBottom: 4 }}>HEADLINE</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "white", marginBottom: 14 }}>{ad.headline}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", fontWeight: 700, letterSpacing: ".06em", marginBottom: 4 }}>PRIMARY TEXT</div>
                  <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, whiteSpace: "pre-wrap" as const }}>{ad.primaryText}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", fontWeight: 700, letterSpacing: ".06em", marginBottom: 4 }}>CTA BUTTON</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399", marginBottom: 14 }}>{ad.cta}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", fontWeight: 700, letterSpacing: ".06em", marginBottom: 4 }}>TARGETING</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, marginBottom: 14 }}>{ad.targeting}</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)" }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", marginBottom: 2 }}>DAILY BUDGET</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#fbbf24" }}>{ad.dailyBudget}</div>
                    </div>
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.2)" }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", marginBottom: 2 }}>EST. REACH</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#34d399" }}>{ad.estimatedReach}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TAB 3 — OUTREACH BUILDER
// ════════════════════════════════════════════════════════
type OutreachScript = { channel: string; subject?: string; body: string; followUp?: string; bestTime: string; tipPK: string };

function OutreachTab() {
  const { t, show } = useToast();
  const [niche,    setNiche]   = useState("trading");
  const [channel,  setChannel] = useState("whatsapp");
  const [lang,     setLang]    = useState("urdu");
  const [tone,     setTone]    = useState("professional");
  const [loading,  setLoading] = useState(false);
  const [scripts,  setScripts] = useState<OutreachScript[]>([]);

  async function generate() {
    setLoading(true); setScripts([]);
    try {
      const r = await fetch("/api/admin/marketing-autopilot/outreach", {
        method: "POST",
        headers: adminHdrs(true),
        body: JSON.stringify({ niche, channel, lang, tone }),
      });
      const d = await r.json();
      if (r.ok && d.scripts) { setScripts(d.scripts); show(`${d.scripts.length} scripts ready!`); }
      else show(d?.error || "Failed", false);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {t && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, padding: "10px 18px", borderRadius: 10, background: t.ok ? "rgba(52,211,153,.12)" : "rgba(239,68,68,.12)", border: `1px solid ${t.ok ? "rgba(52,211,153,.3)" : "rgba(239,68,68,.3)"}`, color: t.ok ? "#34d399" : "#f87171", fontSize: 13 }}>{t.msg}</div>}

      <Card>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>📨 Cold Outreach Scripts</h3>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          AI niche ke hisaab se WhatsApp aur Email cold scripts banata hai — follow-up ke saath. Directly send karo ya WhatsApp blast mein use karo.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
          <Sel label="Target Business Type" options={[
            { v: "trading",        l: "Trader / Wholesale" },
            { v: "import_export",  l: "Import / Export" },
            { v: "distributor",    l: "Distributor" },
            { v: "retailer",       l: "Retailer / Shop Owner" },
            { v: "manufacturer",   l: "Manufacturer" },
          ]} value={niche} onChange={setNiche} />
          <Sel label="Channel" options={[
            { v: "whatsapp", l: "WhatsApp" },
            { v: "email",    l: "Cold Email" },
            { v: "both",     l: "Both" },
          ]} value={channel} onChange={setChannel} />
          <Sel label="Language" options={[
            { v: "urdu",          l: "Urdu" },
            { v: "english",       l: "English" },
            { v: "roman_urdu",    l: "Roman Urdu" },
          ]} value={lang} onChange={setLang} />
          <Sel label="Tone" options={[
            { v: "professional",  l: "Professional" },
            { v: "friendly",      l: "Friendly / Casual" },
            { v: "direct",        l: "Direct / Bold" },
          ]} value={tone} onChange={setTone} />
        </div>

        <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.15)", marginBottom: 18, fontSize: 12, color: "rgba(255,255,255,.5)", lineHeight: 1.7 }}>
          <strong style={{ color: "#34d399" }}>Pro tip:</strong> WhatsApp outreach ke liye pehle business directories (JustDial, Rozee, LinkedIn) se numbers collect karo. Phir admin panel ke WhatsApp Blasts tab mein CSV upload karke blast karo.
        </div>

        <Btn onClick={generate} loading={loading}>🤖 Generate Outreach Scripts</Btn>
      </Card>

      {scripts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {scripts.map((s, i) => (
            <Card key={i} style={{ borderLeft: `3px solid ${s.channel === "email" ? "#38bdf8" : "#22c55e"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: s.channel === "email" ? "rgba(56,189,248,.12)" : "rgba(34,197,94,.12)", color: s.channel === "email" ? "#38bdf8" : "#22c55e", fontWeight: 700, textTransform: "capitalize" as const }}>{s.channel === "email" ? "📧 Email" : "💬 WhatsApp"}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>⏰ {s.bestTime}</span>
                </div>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 12px" }} onClick={() => { navigator.clipboard?.writeText(s.body); show("Copied!", true); }}>📋 Copy</Btn>
              </div>
              {s.subject && <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, marginBottom: 8 }}>Subject: {s.subject}</div>}
              <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8, whiteSpace: "pre-wrap" as const, padding: "12px 14px", borderRadius: 8, background: "rgba(0,0,0,.25)", marginBottom: s.followUp ? 12 : 0 }}>{s.body}</div>
              {s.followUp && (
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontWeight: 700, margin: "10px 0 6px", letterSpacing: ".06em" }}>FOLLOW-UP (if no reply in 3 days)</div>
                  <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, whiteSpace: "pre-wrap" as const, padding: "10px 12px", borderRadius: 8, background: "rgba(0,0,0,.2)", borderLeft: "2px solid rgba(255,255,255,.08)" }}>{s.followUp}</div>
                </div>
              )}
              <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.12)", fontSize: 11, color: "#fbbf24" }}>
                💡 {s.tipPK}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TAB 4 — LEAD PIPELINE
// ════════════════════════════════════════════════════════
type PipelineLead = { id: string; name: string; business: string; phone?: string; email?: string; source: string; stage: string; status?: string; notes?: string; createdAt: string };
const STAGES = ["New Lead", "Contacted", "Demo Booked", "Demo Done", "Proposal Sent", "Won", "Lost"];
const STAGE_COLORS: Record<string, string> = { "New Lead": "#818cf8", Contacted: "#38bdf8", "Demo Booked": "#fbbf24", "Demo Done": "#fb923c", "Proposal Sent": "#a78bfa", Won: "#22c55e", Lost: "#f87171" };

function PipelineTab() {
  const { t, show } = useToast();
  const [leads,   setLeads]   = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [form,    setForm]    = useState({ name: "", business: "", phone: "", email: "", source: "manual", notes: "" });
  const [saving,  setSaving]  = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/automation/leads", { headers: adminHdrs() })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setLeads(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function addLead() {
    if (!form.name.trim()) return show("Name required", false);
    setSaving(true);
    try {
      const r = await fetch("/api/automation/leads", {
        method: "POST",
        headers: adminHdrs(true),
        body: JSON.stringify({ name: form.name, businessName: form.business, phone: form.phone, email: form.email, source: form.source, notes: form.notes, status: "New Lead" }),
      });
      const d = await r.json();
      if (r.ok) { setLeads(p => [d, ...p]); setForm({ name: "", business: "", phone: "", email: "", source: "manual", notes: "" }); setAdding(false); show("Lead added!"); }
      else show(d?.error || "Failed", false);
    } finally { setSaving(false); }
  }

  async function moveStage(id: string, stage: string) {
    setMovingId(id);
    try {
      const r = await fetch("/api/automation/leads", { method: "PUT", headers: adminHdrs(true), body: JSON.stringify({ id, status: stage }) });
      if (r.ok) { setLeads(p => p.map(l => l.id === id ? { ...l, stage } : l)); show(`Moved to ${stage}`); }
      else show("Failed", false);
    } finally { setMovingId(null); }
  }

  const byStage = STAGES.map(s => ({ stage: s, items: leads.filter(l => (l.stage || l.status || "New Lead") === s) }));
  const wonCount = leads.filter(l => (l.stage || (l as any).status) === "Won").length;
  const totalLeads = leads.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {t && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, padding: "10px 18px", borderRadius: 10, background: t.ok ? "rgba(52,211,153,.12)" : "rgba(239,68,68,.12)", border: `1px solid ${t.ok ? "rgba(52,211,153,.3)" : "rgba(239,68,68,.3)"}`, color: t.ok ? "#34d399" : "#f87171", fontSize: 13 }}>{t.msg}</div>}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
        {[
          { label: "Total Leads", value: totalLeads, color: "#818cf8" },
          { label: "In Progress", value: leads.filter(l => !["Won","Lost","New Lead"].includes((l.stage||(l as any).status)||"New Lead")).length, color: "#fbbf24" },
          { label: "Won", value: wonCount, color: "#22c55e" },
          { label: "Conversion", value: totalLeads ? `${Math.round(wonCount/totalLeads*100)}%` : "0%", color: "#f472b6" },
        ].map(s => (
          <div key={s.label} style={{ padding: "14px 16px", borderRadius: 12, background: `${s.color}10`, border: `1px solid ${s.color}30` }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add lead */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: adding ? 16 : 0 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>💼 Prospect Pipeline</h3>
          <Btn onClick={() => setAdding(a => !a)} variant="ghost" style={{ fontSize: 12 }}>{adding ? "Cancel" : "+ Add Lead"}</Btn>
        </div>
        {adding && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 4 }}>
            {[
              { label: "Full Name *", key: "name", placeholder: "Ahmad Khan" },
              { label: "Business Name", key: "business", placeholder: "Khan Traders" },
              { label: "WhatsApp", key: "phone", placeholder: "+92 300 1234567" },
              { label: "Email", key: "email", placeholder: "ahmed@khantraders.com" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 4 }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${BDR}`, background: "rgba(255,255,255,.05)", color: "#e2e8f0", fontSize: 13, fontFamily: F, outline: "none", boxSizing: "border-box" as const }} />
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 4 }}>SOURCE</label>
              <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${BDR}`, background: "rgba(255,255,255,.05)", color: "#e2e8f0", fontSize: 13, fontFamily: F, outline: "none" }}>
                {["manual","whatsapp","facebook_ad","instagram_ad","linkedin","referral","website","other"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <Btn onClick={addLead} loading={saving} style={{ width: "100%" }}>Add Lead</Btn>
            </div>
          </div>
        )}
      </Card>

      {/* Kanban pipeline */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,.3)" }}>Loading pipeline…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, overflowX: "auto" }}>
          {byStage.map(({ stage, items }) => (
            <div key={stage}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: STAGE_COLORS[stage] || "#94a3b8", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>{stage}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.06)", padding: "1px 7px", borderRadius: 10 }}>{items.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                {items.map(lead => (
                  <div key={lead.id} style={{ padding: "10px 12px", borderRadius: 10, background: PNL, border: `1px solid ${STAGE_COLORS[stage] || BDR}30` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>{lead.name}</div>
                    {lead.business && <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6 }}>{lead.business}</div>}
                    {lead.source && <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginBottom: 8, textTransform: "capitalize" as const }}>{lead.source}</div>}
                    {/* Move to next stage */}
                    {STAGES.indexOf(stage) < STAGES.length - 1 && stage !== "Won" && stage !== "Lost" && (
                      <button disabled={movingId === lead.id} onClick={() => moveStage(lead.id, STAGES[STAGES.indexOf(stage) + 1])}
                        style={{ width: "100%", padding: "4px 8px", borderRadius: 6, border: "none", background: `${STAGE_COLORS[STAGES[STAGES.indexOf(stage)+1]]}22`, color: STAGE_COLORS[STAGES[STAGES.indexOf(stage)+1]] || "#94a3b8", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: F }}>
                        → {STAGES[STAGES.indexOf(stage) + 1]}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
