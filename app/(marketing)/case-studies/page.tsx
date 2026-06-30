"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const CASES = [
  {
    id: "karachi-trader",
    name: "Ahmed Traders",
    owner: "Muhammad Ahmed",
    role: "Owner",
    city: "Karachi",
    industry: "Trading & Wholesale",
    flag: "🇵🇰",
    avatar: "MA",
    avatarGrad: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    challenge: "Managing 200+ invoices per month in Excel. Month-end close took 5 days. Missed payments were common.",
    solution: "Switched to FinovaOS for invoicing, ledger, and payment reminders.",
    results: [
      { metric: "Month-end close", before: "5 days", after: "4 hours", icon: "⏱️" },
      { metric: "Missed payments",  before: "12/month", after: "1/month", icon: "💸" },
      { metric: "Invoice errors",   before: "8%",       after: "0.2%",   icon: "✅" },
      { metric: "Time on accounts", before: "3 hrs/day","after": "25 min/day", icon: "🕐" },
    ],
    quote: "FinovaOS ne mera month-end close 5 din se ghatakr 4 ghante mein kar diya. Aur ab payments miss nahi hote — system khud reminder bhejta hai.",
    tag: "Trading",
    color: "#818cf8",
  },
  {
    id: "lahore-distributor",
    name: "Fatima Distribution Co.",
    owner: "Fatima Malik",
    role: "Director",
    city: "Lahore",
    industry: "Distribution",
    flag: "🇵🇰",
    avatar: "FM",
    avatarGrad: "linear-gradient(135deg,#0891b2,#06b6d4)",
    challenge: "5 branches, each keeping separate Excel files. No central view. Reconciliation took a week every month.",
    solution: "Deployed FinovaOS multi-branch with central dashboard. All branches on one system.",
    results: [
      { metric: "Reconciliation time", before: "7 days",  after: "2 hours", icon: "🔄" },
      { metric: "Branches connected",  before: "0",       after: "5",       icon: "🏢" },
      { metric: "Stock visibility",    before: "0%",      after: "100%",    icon: "📦" },
      { metric: "Monthly cost saved",  before: "—",       after: "Rs. 45K", icon: "💰" },
    ],
    quote: "5 branches ko ek jagah manage karna ab possible hai. Pehle har branch ka alag Excel tha — ab ek dashboard pe sab dikhta hai real-time mein.",
    tag: "Distribution",
    color: "#06b6d4",
  },
  {
    id: "faisalabad-manufacturer",
    name: "Gulshan Fabrics",
    owner: "Hassan Gulshan",
    role: "CEO",
    city: "Faisalabad",
    industry: "Manufacturing",
    flag: "🇵🇰",
    avatar: "HG",
    avatarGrad: "linear-gradient(135deg,#d97706,#f59e0b)",
    challenge: "Payroll for 80 employees done manually. Salary slips took 4 hours. No attendance integration.",
    solution: "FinovaOS payroll + attendance module. Auto salary calculation with deductions.",
    results: [
      { metric: "Payroll processing", before: "4 hours",  after: "8 minutes", icon: "⚡" },
      { metric: "Salary errors",       before: "6/month", after: "0",         icon: "🎯" },
      { metric: "Employees managed",   before: "Manual",  after: "80 auto",   icon: "👥" },
      { metric: "HR cost",             before: "2 staff", after: "0.5 staff", icon: "📉" },
    ],
    quote: "80 logon ki payroll pehle 4 ghante lagti thi. Ab 8 minute mein complete ho jati hai. Salary slip automatically generate hoti hai — koi error nahi.",
    tag: "Manufacturing",
    color: "#f59e0b",
  },
  {
    id: "dubai-importer",
    name: "Gulf Import Solutions",
    owner: "Rania Al-Hassan",
    role: "Finance Manager",
    city: "Dubai",
    industry: "Import / Export",
    flag: "🇦🇪",
    avatar: "RA",
    avatarGrad: "linear-gradient(135deg,#059669,#10b981)",
    challenge: "Multi-currency invoicing across USD, AED, PKR. Bank reconciliation took 3 days per month.",
    solution: "FinovaOS multi-currency ledger with live exchange rates and bank reconciliation.",
    results: [
      { metric: "Bank reconciliation", before: "3 days",  after: "2 hours",  icon: "🏦" },
      { metric: "Currencies handled",  before: "Manual",  after: "Auto live", icon: "💱" },
      { metric: "FX gain/loss tracking", before: "None", after: "Real-time",  icon: "📊" },
      { metric: "Audit prep time",     before: "2 weeks", after: "3 hours",   icon: "📁" },
    ],
    quote: "Multi-currency management used to be a nightmare. FinovaOS handles USD, AED, and PKR automatically with live rates. Bank reconciliation went from 3 days to 2 hours.",
    tag: "Import/Export",
    color: "#10b981",
  },
  {
    id: "islamabad-services",
    name: "TechServe Solutions",
    owner: "Zara Khan",
    role: "Founder",
    city: "Islamabad",
    industry: "IT Services",
    flag: "🇵🇰",
    avatar: "ZK",
    avatarGrad: "linear-gradient(135deg,#7c3aed,#a78bfa)",
    challenge: "Invoicing 30+ clients monthly. Chasing late payments. No visibility into cash flow.",
    solution: "FinovaOS invoicing with automatic WhatsApp payment reminders and cash flow dashboard.",
    results: [
      { metric: "Payment collection",  before: "45 days", after: "18 days",  icon: "📅" },
      { metric: "Late invoices",       before: "40%",     after: "8%",       icon: "📬" },
      { metric: "Cash flow visibility",before: "None",    after: "Real-time",icon: "📊" },
      { metric: "Admin hours saved",   before: "—",       after: "15 hrs/mo",icon: "⏰" },
    ],
    quote: "Payments jo pehle 45 din mein aati thi, ab 18 din mein aa jati hain. Automatic WhatsApp reminders game changer hain — client khud notice karta hai.",
    tag: "Services",
    color: "#a78bfa",
  },
  {
    id: "retail-chain",
    name: "Metro Retail Group",
    owner: "Imran Siddiqui",
    role: "Operations Head",
    city: "Karachi",
    industry: "Retail",
    flag: "🇵🇰",
    avatar: "IS",
    avatarGrad: "linear-gradient(135deg,#e11d48,#f43f5e)",
    challenge: "3 retail outlets, no POS integration. Daily stock count manual. Running out of stock unknowingly.",
    solution: "FinovaOS inventory + POS integration across 3 branches with low-stock alerts.",
    results: [
      { metric: "Stockouts per month", before: "12",     after: "1",        icon: "📦" },
      { metric: "Daily stock count",   before: "2 hours","after": "0 min auto", icon: "🔢" },
      { metric: "Wastage reduced",     before: "8%",     after: "2%",       icon: "♻️" },
      { metric: "Revenue increase",    before: "—",      after: "+18%",     icon: "📈" },
    ],
    quote: "Pehle pta hi nahi chalta tha ke koi item khatam ho gaya hai. Ab system alert deta hai 3 din pehle. Wastage 8% se 2% aa gayi — akele isi se bohot farak para.",
    tag: "Retail",
    color: "#f43f5e",
  },
];

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, vis };
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, vis } = useInView();
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(28px)", transition: `opacity .6s ease ${delay}s, transform .6s ease ${delay}s` }}>
      {children}
    </div>
  );
}

export default function CaseStudiesPage() {
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");

  const tags = ["All", ...Array.from(new Set(CASES.map(c => c.tag)))];
  const filtered = filter === "All" ? CASES : CASES.filter(c => c.tag === filter);

  const s = {
    page: { minHeight: "100vh", background: "linear-gradient(160deg,#04061a 0%,#080c2a 50%,#04061a 100%)", fontFamily: "'Outfit','Inter',sans-serif", color: "#e2e8f0" } as React.CSSProperties,
    hero: { padding: "100px 24px 60px", textAlign: "center" as const, maxWidth: 720, margin: "0 auto" },
  };

  return (
    <div style={s.page}>
      {/* Nav back */}
      <div style={{ padding: "20px 32px" }}>
        <Link href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
          ← Back to FinovaOS
        </Link>
      </div>

      {/* Hero */}
      <div style={s.hero}>
        <div style={{ display: "inline-block", background: "rgba(129,140,248,.12)", border: "1px solid rgba(129,140,248,.3)", color: "#818cf8", padding: "5px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          Customer Stories
        </div>
        <h1 style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 800, margin: "0 0 16px", lineHeight: 1.15 }}>
          Real businesses.<br /><span style={{ background: "linear-gradient(135deg,#818cf8,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Real results.</span>
        </h1>
        <p style={{ fontSize: 18, color: "#94a3b8", margin: "0 0 32px", lineHeight: 1.6 }}>
          See how businesses across Pakistan and beyond transformed their operations with FinovaOS.
        </p>

        {/* Stats */}
        <div style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap", marginBottom: 40 }}>
          {[
            { val: "500+", label: "Businesses" },
            { val: "10x", label: "Avg. ROI" },
            { val: "97%", label: "Retention Rate" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#818cf8" }}>{s.val}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {tags.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{ padding: "6px 18px", borderRadius: 20, border: `1px solid ${filter === t ? "rgba(129,140,248,.5)" : "rgba(255,255,255,.1)"}`, background: filter === t ? "rgba(129,140,248,.15)" : "transparent", color: filter === t ? "#818cf8" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all .2s" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 24 }}>
          {filtered.map((c, i) => (
            <FadeIn key={c.id} delay={i * 0.08}>
              <div
                onClick={() => setActive(active === c.id ? null : c.id)}
                style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${active === c.id ? c.color + "55" : "rgba(255,255,255,.08)"}`, borderRadius: 20, padding: 28, cursor: "pointer", transition: "all .3s", boxShadow: active === c.id ? `0 0 32px ${c.color}18` : "none" }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: c.avatarGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {c.avatar}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>{c.flag} {c.city} · {c.industry}</div>
                  </div>
                  <span style={{ marginLeft: "auto", background: `${c.color}18`, border: `1px solid ${c.color}44`, color: c.color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{c.tag}</span>
                </div>

                {/* Results grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {c.results.map(r => (
                    <div key={r.metric} style={{ background: "rgba(255,255,255,.03)", borderRadius: 12, padding: "12px 14px" }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{r.icon}</div>
                      <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{r.metric}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "#f87171", textDecoration: "line-through" }}>{r.before}</span>
                        <span style={{ fontSize: 10, color: "#64748b" }}>→</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: c.color }}>{r.after}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quote */}
                <div style={{ borderLeft: `3px solid ${c.color}`, paddingLeft: 14, color: "#94a3b8", fontSize: 13, lineHeight: 1.6, fontStyle: "italic" }}>
                  "{c.quote}"
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>— {c.owner}, {c.role}</div>

                {/* Expand for challenge/solution */}
                {active === c.id && (
                  <div style={{ marginTop: 20, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 20, display: "grid", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>The Challenge</div>
                      <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{c.challenge}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>The Solution</div>
                      <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{c.solution}</div>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "#475569" }}>
                  {active === c.id ? "▲ Show less" : "▼ Read full story"}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "60px 24px 100px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 12px" }}>Ready to write your success story?</h2>
        <p style={{ color: "#64748b", marginBottom: 28, fontSize: 16 }}>Join 500+ businesses already running on FinovaOS.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/onboarding/choose-plan" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", padding: "13px 28px", borderRadius: 12, fontWeight: 700, textDecoration: "none", fontSize: 15 }}>
            Get Started →
          </Link>
          <Link href="/roi-calculator" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", padding: "13px 28px", borderRadius: 12, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>
            Calculate Your ROI
          </Link>
        </div>
      </div>
    </div>
  );
}
