"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, vis] as const;
}

function CountUp({ to, suffix = "", duration = 1800, start }: { to: number; suffix?: string; duration?: number; start: boolean }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, to, duration]);
  return <>{val.toLocaleString()}{suffix}</>;
}

const STATS = [
  { to: 2400, suffix: "+", label: "Businesses",    color: "#818cf8" },
  { to: 99,    suffix: ".9%",label: "Uptime SLA",    color: "#34d399" },
  { to: 40,    suffix: "+",  label: "Countries",     color: "#fbbf24" },
  { to: 1400,  suffix: "+",  label: "5-Star Reviews", color: "#f87171" },
];

const INCLUDES = [
  { icon: "📒", label: "Double-Entry Accounting" },
  { icon: "🧾", label: "Invoicing & Billing" },
  { icon: "📦", label: "Inventory Management" },
  { icon: "🏦", label: "Bank Reconciliation" },
  { icon: "👥", label: "HR & Payroll" },
  { icon: "🏢", label: "Multi-Branch & Companies" },
  { icon: "📊", label: "Real-Time Reports" },
  { icon: "🌍", label: "Multi-Currency" },
  { icon: "🔐", label: "Role-Based Access" },
  { icon: "💬", label: "CRM & Follow-ups" },
  { icon: "🛒", label: "Purchase Orders & GRN" },
  { icon: "⚙️", label: "API & Integrations" },
  { icon: "🤖", label: "AI Financial Insights" },
  { icon: "🔔", label: "Smart Anomaly Alerts" },
  { icon: "📈", label: "Revenue Forecast (30/60/90d)" },
  { icon: "🌐", label: "Market Intelligence" },
  { icon: "🧭", label: "AI Business Advisor" },
  { icon: "💬", label: "Ask AI — Financial Chat" },
];

const TRUST = [
  { icon: "🔒", label: "Bank-grade encryption" },
  { icon: "⚡", label: "Setup in minutes" },
  { icon: "🔄", label: "Cancel anytime" },
  { icon: "🎧", label: "24/7 support" },
  { icon: "💳", label: "Secure checkout" },
];

export default function CTASection() {
  const [ref, vis] = useInView();

  return (
    <section ref={ref} style={{
      background: "linear-gradient(180deg, #070a1e 0%, #080c22 50%, #06091a 100%)",
      padding: "100px 24px 80px",
      fontFamily: "'Outfit', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:ital,wght@0,700;1,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orbPulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.6}50%{transform:translate(-50%,-50%) scale(1.08);opacity:.9}}
        @keyframes ringRotate{to{transform:translate(-50%,-50%) rotate(360deg)}}
        @keyframes ringRotateRev{to{transform:translate(-50%,-50%) rotate(-360deg)}}
        @keyframes floatBadge{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @media(max-width:640px){
          .cta-stats{display:grid !important; grid-template-columns:repeat(2,1fr) !important; width:100% !important;}
          .cta-stats > div:nth-child(2){border-right:none !important;}
          .cta-includes-grid{grid-template-columns:repeat(2,1fr) !important;}
        }
        @media(max-width:400px){
          .cta-includes-grid{grid-template-columns:1fr !important;}
        }
        .cta-primary{
          display:inline-flex;align-items:center;gap:10px;
          padding:17px 42px;border-radius:14px;border:none;
          font-family:inherit;font-size:16px;font-weight:800;letter-spacing:.02em;
          color:#0f172a;cursor:pointer;text-decoration:none;position:relative;overflow:hidden;
          background:linear-gradient(135deg,#f0d080 0%,#fbbf24 35%,#f59e0b 65%,#f0d080 100%);
          background-size:200% auto;
          box-shadow:0 6px 28px rgba(251,191,36,.45);
          transition:all .35s ease;
        }
        .cta-primary:hover{
          background-position:right center;
          box-shadow:0 12px 44px rgba(251,191,36,.62);
          transform:translateY(-3px);
        }
        .cta-ghost{
          display:inline-flex;align-items:center;gap:8px;
          padding:16px 32px;border-radius:14px;
          border:1.5px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.05);
          font-family:inherit;font-size:15px;font-weight:600;
          color:rgba(255,255,255,.65);cursor:pointer;text-decoration:none;
          transition:all .25s;
        }
        .cta-ghost:hover{
          border-color:rgba(255,255,255,.3);
          background:rgba(255,255,255,.09);
          color:white;transform:translateY(-2px);
        }
      `}</style>

      {/* ── Background ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(99,102,241,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.05) 1px,transparent 1px)", backgroundSize: "52px 52px" }}/>
        <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", top: "50%", left: "50%", background: "radial-gradient(circle,rgba(99,102,241,.14) 0%,rgba(124,58,237,.06) 45%,transparent 70%)", animation: "orbPulse 9s ease-in-out infinite" }}/>
        <div style={{ position: "absolute", width: 560, height: 560, borderRadius: "50%", top: "50%", left: "50%", border: "1px solid rgba(99,102,241,.09)", animation: "ringRotate 35s linear infinite" }}>
          <div style={{ position: "absolute", top: -4, left: "50%", marginLeft: -4, width: 8, height: 8, borderRadius: "50%", background: "#818cf8", boxShadow: "0 0 14px rgba(129,140,248,.9)" }}/>
        </div>
        <div style={{ position: "absolute", width: 780, height: 780, borderRadius: "50%", top: "50%", left: "50%", border: "1px solid rgba(99,102,241,.05)", animation: "ringRotateRev 50s linear infinite" }}>
          <div style={{ position: "absolute", bottom: -3, left: "50%", marginLeft: -3, width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 10px rgba(167,139,250,.9)" }}/>
        </div>
        <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", top: -60, right: 40, background: "radial-gradient(circle,rgba(251,191,36,.07),transparent 70%)" }}/>
        <div style={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", bottom: 60, left: 60, background: "radial-gradient(circle,rgba(99,102,241,.08),transparent 70%)" }}/>
        <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,.4),transparent)" }}/>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center", position: "relative" }}>

        {/* Offer badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "7px 20px", borderRadius: 100, marginBottom: 32,
          background: "rgba(239,68,68,.1)", border: "1.5px solid rgba(239,68,68,.28)",
          fontSize: 11, fontWeight: 800, color: "#f87171", letterSpacing: ".1em",
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(16px)",
          transition: "all .5s ease",
          animation: vis ? "floatBadge 3.5s ease-in-out infinite 0.6s" : "none",
        }}>
          🔥 LIMITED TIME — 75% OFF · FIRST 3 MONTHS
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: "'Lora', serif",
          fontSize: "clamp(34px, 5.5vw, 64px)",
          fontWeight: 700, lineHeight: 1.08,
          letterSpacing: "-2.5px", color: "white",
          marginBottom: 20,
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(22px)",
          transition: "all .6s ease .1s",
        }}>
          Your business deserves better<br/>
          <span style={{ fontStyle: "italic", background: "linear-gradient(135deg,#a5b4fc 0%,#818cf8 40%,#c4b5fd 80%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            than spreadsheets.
          </span>
        </h2>

        {/* Sub */}
        <p style={{
          fontSize: 17, color: "rgba(255,255,255,.42)",
          lineHeight: 1.85, maxWidth: 540, margin: "0 auto 44px",
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(18px)",
          transition: "all .6s ease .18s",
        }}>
          Join traders, wholesalers, distributors, and import/export businesses using Finova for invoicing, stock control, branches, and trade-ready operations.
        </p>

        {/* CTAs */}
        <div style={{
          display: "flex", justifyContent: "center",
          gap: 14, flexWrap: "wrap", marginBottom: 40,
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(16px)",
          transition: "all .6s ease .26s",
        }}>
          <Link href="/pricing" className="cta-primary">
            Get Started — 75% OFF
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
          <Link href="/demo" className="cta-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Try Live Demo
          </Link>
        </div>

        {/* Social proof */}
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: 20, flexWrap: "wrap", marginBottom: 52,
          opacity: vis ? 1 : 0,
          transition: "opacity .6s ease .34s",
        }}>
          <div style={{ display: "flex" }}>
            {["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b"].map((c, i) => (
              <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${c},${c}88)`, border: "2.5px solid #06091a", marginLeft: i === 0 ? 0 : -9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", zIndex: 5 - i, position: "relative" }}>
                {["T","A","R","F","B"][i]}
              </div>
            ))}
          </div>
          <div>
            <div style={{ display: "flex", gap: 2 }}>
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>4.9 / 5 · 2,400+ reviews</div>
          </div>
          <div style={{ width: 1, height: 26, background: "rgba(255,255,255,.1)" }}/>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.28)", fontWeight: 500 }}>Secure checkout</div>
          <div style={{ width: 1, height: 26, background: "rgba(255,255,255,.1)" }}/>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.28)", fontWeight: 500 }}>Cancel anytime</div>
        </div>

        {/* Stats bar */}
        <div className="cta-stats" style={{
          display: "inline-flex", borderRadius: 20,
          background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
          overflow: "hidden", marginBottom: 56,
          opacity: vis ? 1 : 0,
          transition: "opacity .6s ease .42s",
        }}>
          {STATS.map(({ to, suffix, label, color }, i) => (
            <div key={label} style={{ padding: "20px 30px", borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none", textAlign: "center", minWidth: 110 }}>
              <div style={{ fontFamily: "'Lora',serif", fontSize: 24, fontWeight: 700, color, letterSpacing: "-.3px" }}>
                <CountUp to={to} suffix={suffix} start={vis} duration={1600 + i * 200}/>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", fontWeight: 500, marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── What's Included ── */}
      <div style={{
        maxWidth: 900, margin: "0 auto 64px", position: "relative",
        opacity: vis ? 1 : 0, transition: "opacity .6s ease .5s",
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 16px", borderRadius: 100, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", fontSize: 11, fontWeight: 700, color: "#a5b4fc", letterSpacing: ".08em" }}>
            ✅ EVERYTHING INCLUDED — NO ADD-ONS
          </div>
        </div>

        <div className="cta-includes-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
          {INCLUDES.map(({ icon, label }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 16px", borderRadius: 12,
              background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)",
              fontSize: 13, color: "rgba(255,255,255,.6)", fontWeight: 500,
            }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Trust pills ── */}
      <div style={{
        maxWidth: 860, margin: "0 auto 72px",
        display: "flex", justifyContent: "center",
        gap: 10, flexWrap: "wrap",
        opacity: vis ? 1 : 0,
        transition: "opacity .6s ease .55s",
      }}>
        {TRUST.map(({ icon, label }) => (
          <div key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 100, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: 12, color: "rgba(255,255,255,.42)", fontWeight: 500 }}>
            <span style={{ fontSize: 13 }}>{icon}</span>
            {label}
          </div>
        ))}
      </div>

      {/* ── Footer nav ── */}
      <div style={{
        maxWidth: 860, margin: "0 auto",
        paddingTop: 28,
        borderTop: "1px solid rgba(255,255,255,.05)",
        display: "flex", justifyContent: "center",
        gap: 28, flexWrap: "wrap",
        opacity: vis ? 1 : 0,
        transition: "opacity .6s ease .6s",
      }}>
        {[
          { label: "Privacy Policy", href: "/legal/privacy" },
          { label: "Terms of Use",   href: "/legal/terms"   },
          { label: "Security",       href: "/security" },
          { label: "Help Center",    href: "/help"     },
          { label: "Contact Sales",  href: "/contact"  },
          { label: "System Status",  href: "/status"   },
        ].map(({ label, href }) => (
          <Link key={label} href={href} style={{ fontSize: 12, color: "rgba(255,255,255,.2)", textDecoration: "none", fontWeight: 500, transition: "color .2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.2)")}>
            {label}
          </Link>
        ))}
      </div>

      <div style={{
        marginTop: 18, textAlign: "center",
        fontSize: 12, color: "rgba(255,255,255,.13)",
        opacity: vis ? 1 : 0,
        transition: "opacity .6s ease .65s",
      }}>
        © {new Date().getFullYear()} Finova · Built for growing businesses worldwide.
      </div>
    </section>
  );
}
