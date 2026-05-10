"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis] as const;
}

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const [ref, vis] = useInView();
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(26px)",
      transition: `opacity .65s ease ${delay}ms, transform .65s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

const MODULES = [
  { icon: "📊", label: "Accounting" },
  { icon: "📦", label: "Inventory" },
  { icon: "🧾", label: "Invoicing" },
  { icon: "👥", label: "CRM" },
  { icon: "💰", label: "Payroll" },
  { icon: "🏦", label: "Banking" },
  { icon: "🤖", label: "AI Insights" },
  { icon: "🏢", label: "Multi-Branch" },
  { icon: "🌍", label: "Multi-Currency" },
  { icon: "📈", label: "Reports" },
  { icon: "🛒", label: "Procurement" },
  { icon: "🔄", label: "Reconciliation" },
];

const INDUSTRIES = [
  { icon: "🏪", title: "Retail", desc: "POS-ready invoicing, branch stock control, customer loyalty, and daily sales reporting.", color: "#ec4899" },
  { icon: "📦", title: "Trading & Wholesale", desc: "Full PO → GRN → purchase invoice flow with landed cost and outstanding balance tracking.", color: "#38bdf8" },
  { icon: "🚚", title: "Distribution", desc: "Route-based sales, multi-warehouse transfers, van stock management, and collections.", color: "#8b5cf6" },
  { icon: "🏭", title: "Manufacturing", desc: "Bills of materials, production orders, raw material consumption, and job costing.", color: "#f59e0b" },
  { icon: "🚢", title: "Import / Export", desc: "Commercial invoices, packing lists, shipment tracking, LC/TT activity, and trade costing.", color: "#14b8a6" },
  { icon: "✈️", title: "Travel Agency", desc: "Airline tickets, PNRs, visa cases, client quotations, and service billing in one desk.", color: "#818cf8" },
];

const TIMELINE = [
  {
    year: "2024",
    title: "The Frustration",
    desc: "Existing ERP software was either priced out of reach, built for Western markets, or took months to implement. Operational businesses — traders, distributors, manufacturers — were running on spreadsheets and manual work.",
    color: "#818cf8",
  },
  {
    year: "Early 2025",
    title: "First Version Ships",
    desc: "Core accounting, invoicing, inventory, and multi-branch support went live. Built specifically for trading and wholesale businesses first — the industry with the most operational complexity and the least software support.",
    color: "#34d399",
  },
  {
    year: "Mid 2025",
    title: "Platform Expands",
    desc: "Payroll, CRM, AI-powered insights, landed cost, multi-currency, and procurement modules followed. Every feature was requested by real customers — not added for feature-parity with legacy software.",
    color: "#f59e0b",
  },
  {
    year: "Now",
    title: "Growing Every Week",
    desc: "Six focused industries. Weekly releases. A complete operating platform for businesses that actually work hard — with a growing base of teams relying on it every day.",
    color: "#6366f1",
  },
];

const VALUES = [
  { icon: "🎯", title: "Purpose-built, not adapted", desc: "We didn't take a generic accounting tool and add modules. FinovaOS was designed from scratch for operational businesses — the ones running multiple locations, multiple currencies, and complex supply chains.", color: "#818cf8" },
  { icon: "🔒", title: "Your data stays yours", desc: "We don't sell your data. Financial records are encrypted at rest, isolated per workspace, and fully under your control. Full export available at any time.", color: "#34d399" },
  { icon: "⚡", title: "Speed is a feature", desc: "Fast interface, fast reports, fast support. We measure month-end close time in hours, not days. Performance is something we take seriously at every level.", color: "#fbbf24" },
  { icon: "📞", title: "Real humans in support", desc: "When something breaks, a real person responds — not a chatbot ticket queue. Your business can't wait for a three-day resolution time.", color: "#38bdf8" },
  { icon: "🚀", title: "We ship every week", desc: "Our roadmap runs on real customer feedback. Every week, something improves. No waiting months for a feature that was requested a year ago.", color: "#c4b5fd" },
  { icon: "💡", title: "Affordable by design", desc: "Enterprise-level features at a price growing businesses can actually afford. No hidden fees, no per-module paywalls, no charges that appear at renewal.", color: "#f9a8d4" },
];

const COMMITMENTS = [
  { icon: "🔐", title: "No data selling — ever", desc: "Your business data is yours. We will never sell, license, or share it with advertisers, data brokers, or any third party for commercial purposes.", color: "#34d399" },
  { icon: "📤", title: "Export everything, anytime", desc: "Full export in CSV, Excel, and PDF formats — always available, no restrictions. You are never locked into our platform.", color: "#38bdf8" },
  { icon: "🗑️", title: "Clean deletion on exit", desc: "Cancel and a 90-day wind-down begins. After that, your data is permanently purged from our servers and we confirm it in writing.", color: "#f87171" },
  { icon: "🤝", title: "Transparent pricing", desc: "What you see on the pricing page is what you pay. No per-seat surprises, no feature paywalls activated after signup, no fine print charges.", color: "#fbbf24" },
  { icon: "🛡️", title: "Security without compromise", desc: "AES-256 encryption at rest, TLS in transit, isolated workspaces, and role-based access controls. Built on enterprise-grade infrastructure.", color: "#a78bfa" },
  { icon: "🔔", title: "14 days notice on changes", desc: "Any material change to Terms, Privacy Policy, or pricing comes with at least 14 days advance notice via email before taking effect.", color: "#818cf8" },
];

const STATS = [
  { value: "2024", label: "Year Founded", color: "#818cf8" },
  { value: "6", label: "Industry Verticals", color: "#34d399" },
  { value: "40+", label: "Core Modules", color: "#fbbf24" },
  { value: "Weekly", label: "Release Cadence", color: "#38bdf8" },
];

export default function AboutPage() {
  const [heroVis, setHeroVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setHeroVis(true), 80); return () => clearTimeout(t); }, []);

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#04061a 0%,#070a22 50%,#0a0620 100%)",
      color: "white",
      fontFamily: "'Outfit','Inter',sans-serif",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Lora:ital,wght@0,600;0,700;1,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;}
        @keyframes orbA{0%,100%{transform:translate(0,0)}50%{transform:translate(28px,-20px)}}
        @keyframes orbB{0%,100%{transform:translate(0,0)}50%{transform:translate(-18px,14px)}}
        @keyframes gradShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.45)}70%{box-shadow:0 0 0 8px rgba(16,185,129,0)}}

        .about-btn-primary{display:inline-flex;align-items:center;gap:9px;padding:14px 30px;border-radius:13px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-family:inherit;font-size:14px;font-weight:700;border:none;cursor:pointer;text-decoration:none;box-shadow:0 4px 22px rgba(99,102,241,.4);transition:all .22s;}
        .about-btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(99,102,241,.55);}
        .about-btn-ghost{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:13px;border:1.5px solid rgba(255,255,255,.1);color:rgba(255,255,255,.62);background:rgba(255,255,255,.04);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;transition:all .22s;}
        .about-btn-ghost:hover{border-color:rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;transform:translateY(-1px);}

        .val-card{transition:transform .22s,box-shadow .22s,border-color .22s;}
        .val-card:hover{transform:translateY(-5px)!important;}
        .ind-card{transition:transform .22s,background .22s,border-color .22s;}
        .ind-card:hover{transform:translateY(-4px)!important;}
        .mod-tile{transition:background .2s,border-color .2s,transform .2s;}
        .mod-tile:hover{transform:translateY(-3px)!important;background:rgba(99,102,241,.12)!important;border-color:rgba(99,102,241,.35)!important;}
        .commit-card{transition:transform .22s,border-color .22s,background .22s;}
        .commit-card:hover{transform:translateY(-4px)!important;}

        .section-label{display:inline-flex;align-items:center;gap:8px;padding:5px 14px;border-radius:100px;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;margin-bottom:16px;}

        @media(max-width:900px){
          .ab-2col{grid-template-columns:1fr!important;}
          .ab-3col{grid-template-columns:repeat(2,1fr)!important;}
          .ab-stats{flex-direction:column!important;}
          .ab-stat-item{border-right:none!important;border-bottom:1px solid rgba(255,255,255,.07)!important;}
          .ab-stat-item:last-child{border-bottom:none!important;}
        }
        @media(max-width:560px){
          .ab-3col{grid-template-columns:1fr!important;}
          .ab-mod-grid{grid-template-columns:repeat(3,1fr)!important;}
        }
      `}</style>

      {/* ════════════════════════════════
          HERO
      ════════════════════════════════ */}
      <section style={{ position: "relative", overflow: "hidden", padding: "130px 24px 80px", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(99,102,241,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.045) 1px,transparent 1px)",
            backgroundSize: "56px 56px" }} />
          <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%",
            top: -220, left: "50%", transform: "translateX(-50%)",
            background: "radial-gradient(circle,rgba(99,102,241,.16),transparent 65%)",
            animation: "orbA 18s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%",
            bottom: -80, right: "6%",
            background: "radial-gradient(circle,rgba(109,40,217,.1),transparent 65%)",
            animation: "orbB 22s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: 0, left: "12%", right: "12%", height: 1,
            background: "linear-gradient(90deg,transparent,rgba(99,102,241,.45),transparent)" }} />
        </div>

        <div style={{ maxWidth: 780, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 28,
            opacity: heroVis ? 1 : 0, transition: "opacity .5s ease" }}>
            <Link href="/" style={{ fontSize: 12, color: "rgba(255,255,255,.3)", textDecoration: "none", fontWeight: 500, transition: "color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.65)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.3)")}>Home</Link>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.45)", fontWeight: 500 }}>About</span>
          </div>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px 6px 10px",
            borderRadius: 100, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.22)",
            marginBottom: 28,
            opacity: heroVis ? 1 : 0, transform: heroVis ? "translateY(0)" : "translateY(16px)",
            transition: "opacity .55s ease, transform .55s ease",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", letterSpacing: ".08em" }}>OUR STORY</span>
          </div>

          <h1 style={{
            fontFamily: "'Lora',serif",
            fontSize: "clamp(38px,5.5vw,68px)", fontWeight: 700, lineHeight: 1.08,
            letterSpacing: "-2px", color: "#fff", marginBottom: 22,
            opacity: heroVis ? 1 : 0, transform: heroVis ? "translateY(0)" : "translateY(20px)",
            transition: "opacity .6s ease .1s, transform .6s ease .1s",
          }}>
            Built for businesses that{" "}
            <span style={{
              background: "linear-gradient(135deg,#818cf8,#a78bfa,#60a5fa)",
              backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              animation: "gradShift 4s ease infinite",
            }}>
              actually run hard
            </span>
          </h1>

          <p style={{
            fontSize: "clamp(15px,2vw,17px)", color: "rgba(255,255,255,.45)", lineHeight: 1.85,
            maxWidth: 540, margin: "0 auto 40px",
            opacity: heroVis ? 1 : 0, transform: heroVis ? "translateY(0)" : "translateY(20px)",
            transition: "opacity .6s ease .2s, transform .6s ease .2s",
          }}>
            FinovaOS exists because growing businesses deserve enterprise-grade tools — without the enterprise-grade price, complexity, or waiting time.
          </p>

          <div style={{
            display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap",
            opacity: heroVis ? 1 : 0, transform: heroVis ? "translateY(0)" : "translateY(20px)",
            transition: "opacity .6s ease .3s, transform .6s ease .3s",
          }}>
            <Link href="/pricing" className="about-btn-primary">
              Get Started
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
            <Link href="/contact" className="about-btn-ghost">Talk to Us →</Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          MISSION STATEMENT
      ════════════════════════════════ */}
      <FadeIn style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 90px" }}>
        <div style={{
          borderRadius: 24, padding: "64px 56px",
          background: "linear-gradient(135deg,rgba(99,102,241,.08),rgba(109,40,217,.05))",
          border: "1.5px solid rgba(99,102,241,.2)",
          textAlign: "center", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
            width: 400, height: 200, background: "radial-gradient(ellipse,rgba(99,102,241,.14),transparent 70%)",
            pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1,
            background: "linear-gradient(90deg,transparent,rgba(99,102,241,.5),transparent)" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", letterSpacing: ".1em",
            textTransform: "uppercase", marginBottom: 20, position: "relative" }}>
            OUR MISSION
          </div>
          <p style={{
            fontFamily: "'Lora',serif",
            fontSize: "clamp(20px,3vw,32px)", fontWeight: 600,
            color: "rgba(255,255,255,.92)", lineHeight: 1.55,
            maxWidth: 780, margin: "0 auto", position: "relative",
            fontStyle: "italic",
          }}>
            "Every growing business deserves accounting, inventory, and operations software that actually fits how they work — not software they have to reshape themselves to fit."
          </p>
        </div>
      </FadeIn>

      {/* ════════════════════════════════
          STATS
      ════════════════════════════════ */}
      <FadeIn style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 90px" }}>
        <div className="ab-stats" style={{
          display: "flex", borderRadius: 20,
          background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
          overflow: "hidden",
        }}>
          {STATS.map((s, i) => (
            <div key={s.label} className="ab-stat-item" style={{
              flex: 1, padding: "36px 28px", textAlign: "center",
              borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none",
            }}>
              <div style={{
                fontFamily: "'Lora',serif",
                fontSize: "clamp(28px,4vw,44px)", fontWeight: 700,
                color: s.color, letterSpacing: "-1px", lineHeight: 1, marginBottom: 10,
              }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".07em", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* ════════════════════════════════
          OUR STORY + TIMELINE
      ════════════════════════════════ */}
      <FadeIn style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 90px" }}>
        <div className="ab-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>

          {/* Story text */}
          <div>
            <div className="section-label" style={{ background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.22)", color: "#a5b4fc" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#6366f1", animation: "blink 2s ease infinite" }} />
              HOW IT STARTED
            </div>
            <h2 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 700, letterSpacing: "-1.2px", lineHeight: 1.2, marginBottom: 24 }}>
              The problem was obvious. The solution took work.
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                "Most accounting software was built for service businesses — clean, simple, one invoice at a time. But trading, wholesale, and distribution businesses don't work that way. They run purchase orders, goods receipts, multi-branch stock, landed costs, and route-based delivery — simultaneously.",
                "The expensive enterprise options existed, but they required months of setup, expensive consultants, and ongoing licensing fees that made no sense for a business with 20 employees. The affordable options simply didn't have the features.",
                "FinovaOS started as an answer to that gap. A platform that could handle the full operational complexity of a trading or manufacturing business — without requiring a dedicated IT team to run it.",
              ].map((text, i) => (
                <p key={i} style={{ fontSize: 14.5, color: "rgba(255,255,255,.48)", lineHeight: 1.85, margin: 0 }}>{text}</p>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <div className="section-label" style={{ background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.22)", color: "#34d399" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399" }} />
              TIMELINE
            </div>
            <h2 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, letterSpacing: "-1px", lineHeight: 1.2, marginBottom: 28 }}>
              How we got here
            </h2>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 20, top: 12, bottom: 12, width: 2,
                background: "linear-gradient(180deg,#818cf8,#34d399,#f59e0b,#6366f1)", borderRadius: 2 }} />
              {TIMELINE.map((t, i) => (
                <div key={t.year} style={{ display: "flex", gap: 24, marginBottom: i < TIMELINE.length - 1 ? 28 : 0 }}>
                  <div style={{ flexShrink: 0, width: 42, paddingTop: 6, display: "flex", justifyContent: "center" }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: t.color,
                      border: "3px solid #04061a", boxShadow: `0 0 12px ${t.color}80`, zIndex: 1 }} />
                  </div>
                  <div style={{
                    flex: 1, background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.07)",
                    borderLeft: `3px solid ${t.color}`,
                    borderRadius: "0 14px 14px 0", padding: "16px 20px",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: t.color, letterSpacing: ".08em", marginBottom: 5 }}>{t.year}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 7 }}>{t.title}</div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.42)", lineHeight: 1.75 }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ════════════════════════════════
          WHAT WE BUILT
      ════════════════════════════════ */}
      <FadeIn style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 90px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="section-label" style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.22)", color: "#fbbf24" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fbbf24" }} />
            THE PLATFORM
          </div>
          <h2 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 700, letterSpacing: "-1.2px", lineHeight: 1.2, marginBottom: 14 }}>
            One platform. Every tool your business needs.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.38)", maxWidth: 520, margin: "0 auto" }}>
            No switching between apps. No broken integrations. No re-entering data. Everything connected from day one.
          </p>
        </div>

        <div className="ab-mod-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12 }}>
          {MODULES.map(m => (
            <div key={m.label} className="mod-tile" style={{
              background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 14, padding: "18px 10px", textAlign: "center", cursor: "default",
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{m.icon}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,.42)", letterSpacing: ".04em" }}>{m.label}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* ════════════════════════════════
          WHO WE SERVE
      ════════════════════════════════ */}
      <FadeIn style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 90px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="section-label" style={{ background: "rgba(56,189,248,.08)", border: "1px solid rgba(56,189,248,.22)", color: "#38bdf8" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#38bdf8" }} />
            WHO WE SERVE
          </div>
          <h2 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 700, letterSpacing: "-1.2px", lineHeight: 1.2, marginBottom: 14 }}>
            Built for your industry
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.38)", maxWidth: 500, margin: "0 auto" }}>
            Not a generic tool adapted for your business — a platform designed around how each industry actually operates.
          </p>
        </div>
        <div className="ab-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {INDUSTRIES.map(ind => (
            <div key={ind.title} className="ind-card" style={{
              padding: "28px 24px", borderRadius: 18,
              background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
              position: "relative", overflow: "hidden",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = `${ind.color}0d`;
                (e.currentTarget as HTMLElement).style.borderColor = `${ind.color}35`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.03)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.07)";
              }}
            >
              <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%",
                background: `radial-gradient(circle,${ind.color}18,transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ fontSize: 28, marginBottom: 14 }}>{ind.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{ind.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.75 }}>{ind.desc}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* ════════════════════════════════
          WHAT MAKES US DIFFERENT
      ════════════════════════════════ */}
      <FadeIn style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 90px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="section-label" style={{ background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.22)", color: "#c4b5fd" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa" }} />
            WHAT MAKES US DIFFERENT
          </div>
          <h2 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 700, letterSpacing: "-1.2px", lineHeight: 1.2, marginBottom: 14 }}>
            Our principles
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.38)", maxWidth: 480, margin: "0 auto" }}>
            The decisions we made — and refused to make — define what kind of software FinovaOS is.
          </p>
        </div>
        <div className="ab-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {VALUES.map(v => (
            <div key={v.title} className="val-card" style={{
              padding: "28px 24px", borderRadius: 18,
              background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = v.color + "40";
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 14px 44px ${v.color}14`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,.07)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              <div style={{ width: 46, height: 46, borderRadius: 13, background: `${v.color}18`,
                border: `1px solid ${v.color}30`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 22, marginBottom: 16 }}>
                {v.icon}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{v.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.42)", lineHeight: 1.75 }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* ════════════════════════════════
          OUR COMMITMENTS
      ════════════════════════════════ */}
      <FadeIn style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 90px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="section-label" style={{ background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.22)", color: "#34d399" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399" }} />
            OUR COMMITMENTS
          </div>
          <h2 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 700, letterSpacing: "-1.2px", lineHeight: 1.2, marginBottom: 14 }}>
            What we promise — in writing
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.38)", maxWidth: 480, margin: "0 auto" }}>
            These aren't marketing claims. They're documented in our Terms of Service and Privacy Policy.
          </p>
        </div>
        <div className="ab-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {COMMITMENTS.map(c => (
            <div key={c.title} className="commit-card" style={{
              padding: "24px 22px", borderRadius: 18,
              background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
              display: "flex", flexDirection: "column", gap: 12,
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = `${c.color}08`;
                (e.currentTarget as HTMLElement).style.borderColor = `${c.color}30`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.03)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.07)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: `${c.color}14`,
                  border: `1px solid ${c.color}28`, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 19, flexShrink: 0 }}>
                  {c.icon}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{c.title}</div>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.42)", lineHeight: 1.75 }}>{c.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/legal/terms" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px",
              borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)",
              color: "rgba(255,255,255,.5)", textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "all .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "white")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.5)")}>
              Read Terms of Service →
            </Link>
            <Link href="/legal/privacy" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px",
              borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)",
              color: "rgba(255,255,255,.5)", textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "all .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "white")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.5)")}>
              Read Privacy Policy →
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* ════════════════════════════════
          FINAL CTA
      ════════════════════════════════ */}
      <FadeIn style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 120px", textAlign: "center" }}>
        <div style={{
          borderRadius: 24, padding: "64px 52px",
          background: "linear-gradient(135deg,rgba(99,102,241,.1),rgba(109,40,217,.07))",
          border: "1.5px solid rgba(99,102,241,.22)", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280,
            borderRadius: "50%", background: "rgba(99,102,241,.1)", filter: "blur(50px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, left: "18%", right: "18%", height: 1,
            background: "linear-gradient(90deg,transparent,rgba(99,102,241,.5),transparent)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 38, marginBottom: 18 }}>🚀</div>
            <h2 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, letterSpacing: "-1.4px", marginBottom: 14, lineHeight: 1.15 }}>
              Ready to run your business smarter?
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.42)", lineHeight: 1.8, maxWidth: 420, margin: "0 auto 32px" }}>
              Start today — 75% off your first 3 months, 14-day money-back guarantee. No risk, no lock-in.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
              <Link href="/onboarding/signup/starter" className="about-btn-primary">
                Get Started
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </Link>
              <Link href="/contact" className="about-btn-ghost">Talk to Us →</Link>
            </div>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
              {["✓ 14-day money-back guarantee", "✓ 75% off first 3 months", "✓ Cancel anytime"].map(t => (
                <span key={t} style={{ fontSize: 12, color: "rgba(255,255,255,.28)", fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>
    </main>
  );
}
