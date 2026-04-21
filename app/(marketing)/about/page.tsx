"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const ff = "'Outfit','Inter',sans-serif";

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, vis };
}

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, vis } = useInView();
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(28px)",
      transition: `opacity .7s ease ${delay}ms, transform .7s ease ${delay}ms`,
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
  { icon: "🛒", label: "Purchase Orders" },
  { icon: "⚙️", label: "50+ More" },
];

const VALUES = [
  { icon: "🎯", title: "Built for Real Businesses", desc: "Not demo companies. We built this for trading, wholesale, and distribution businesses — the ones that actually need multi-branch, multi-currency, and landed cost.", color: "#818cf8" },
  { icon: "🔒", title: "Your Data is Yours", desc: "We don't sell your data. Ever. Your financial records stay private, encrypted, and fully under your control.", color: "#34d399" },
  { icon: "⚡", title: "Speed at Every Level", desc: "Fast UI, fast reports, fast support. Month-end close in hours, not days.", color: "#fbbf24" },
  { icon: "📞", title: "Real Support", desc: "When something breaks, a real person responds — not a chatbot. We're here because your business can't wait.", color: "#38bdf8" },
  { icon: "🚀", title: "Continuously Shipping", desc: "We push updates every week based on real feedback. Our roadmap is driven by what you actually need.", color: "#c4b5fd" },
  { icon: "💡", title: "Affordable by Design", desc: "Enterprise-level features at a price that makes sense for growing businesses. No hidden fees, no surprise charges.", color: "#f9a8d4" },
];

const TIMELINE = [
  { year: "2024", title: "The Problem", desc: "Existing accounting software was either too expensive, too complex, or not built for trading and wholesale businesses. We decided to build something better.", color: "#818cf8", dot: "◉" },
  { year: "2025", title: "FinovaOS Launched", desc: "First version shipped with core accounting, inventory, multi-branch, and AI insights. Built specifically for Pakistan, UAE, and regional trading businesses.", color: "#34d399", dot: "◉" },
  { year: "Now", title: "Growing Every Week", desc: "50+ modules, payroll, CRM, landed cost, multi-currency, and more. Every feature built from real customer feedback.", color: "#6366f1", dot: "◉" },
];

export default function AboutPage() {
  const [heroVis, setHeroVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setHeroVis(true), 80); return () => clearTimeout(t); }, []);

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(160deg,#04061a 0%,#07091f 60%,#0a0620 100%)", color: "white", fontFamily: ff, overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse2{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)}70%{box-shadow:0 0 0 7px rgba(16,185,129,0)}}
        @keyframes gradShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes orbA{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-20px)}}
        @keyframes orbB{0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,15px)}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .about-cta-primary{display:inline-flex;align-items:center;gap:9px;padding:14px 30px;border-radius:13px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-family:inherit;font-size:14px;font-weight:700;border:none;cursor:pointer;text-decoration:none;box-shadow:0 4px 20px rgba(99,102,241,.4);transition:all .2s;}
        .about-cta-primary:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(99,102,241,.5);}
        .about-cta-ghost{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:13px;border:1.5px solid rgba(255,255,255,.1);color:rgba(255,255,255,.65);background:rgba(255,255,255,.04);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;transition:all .2s;}
        .about-cta-ghost:hover{border-color:rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;transform:translateY(-1px);}
        .val-card{transition:transform .2s,box-shadow .2s,border-color .2s;}
        .val-card:hover{transform:translateY(-5px)!important;}
        @media(max-width:860px){.about-grid-3{grid-template-columns:repeat(2,1fr)!important;}.about-grid-2{grid-template-columns:1fr!important;}}
        @media(max-width:560px){.about-grid-3{grid-template-columns:1fr!important;}.about-grid-mod{grid-template-columns:repeat(3,1fr)!important;}}
      `}</style>

      {/* ── HERO ── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "140px 24px 90px", textAlign: "center" }}>
        {/* Background */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)", backgroundSize:"56px 56px" }}/>
          <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%", top:-200, left:"50%", transform:"translateX(-50%)", animation:"orbA 18s ease-in-out infinite", background:"radial-gradient(circle,rgba(99,102,241,.15),transparent 65%)" }}/>
          <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", bottom:-80, right:"5%", animation:"orbB 22s ease-in-out infinite", background:"radial-gradient(circle,rgba(109,40,217,.1),transparent 65%)" }}/>
        </div>

        <div style={{ maxWidth: 780, margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* Badge */}
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8, padding:"6px 14px 6px 10px",
            borderRadius:100, background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.22)",
            marginBottom:28,
            opacity: heroVis?1:0, transform: heroVis?"translateY(0)":"translateY(16px)",
            transition:"opacity .55s ease, transform .55s ease",
          }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#10b981", animation:"pulse2 2s infinite", display:"inline-block" }}/>
            <span style={{ fontSize:11, fontWeight:700, color:"#a5b4fc", letterSpacing:".08em" }}>ABOUT FINOVAOS</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize:"clamp(40px,6vw,70px)", fontWeight:900, lineHeight:1.05,
            letterSpacing:"-2.5px", color:"#fff", marginBottom:24,
            opacity: heroVis?1:0, transform: heroVis?"translateY(0)":"translateY(20px)",
            transition:"opacity .6s ease .1s, transform .6s ease .1s",
          }}>
            Built for businesses that{" "}
            <span style={{
              background:"linear-gradient(135deg,#818cf8,#a78bfa,#60a5fa)",
              backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              animation:"gradShift 4s ease infinite",
            }}>
              actually work hard
            </span>
          </h1>

          {/* Subheading */}
          <p style={{
            fontSize:"clamp(15px,2vw,18px)", color:"rgba(255,255,255,.48)", lineHeight:1.8,
            maxWidth:560, margin:"0 auto 40px",
            opacity: heroVis?1:0, transform: heroVis?"translateY(0)":"translateY(20px)",
            transition:"opacity .6s ease .2s, transform .6s ease .2s",
          }}>
            FinovaOS was built from frustration — expensive, outdated software that never fit
            trading and wholesale businesses. We built what they actually needed.
          </p>

          {/* CTAs */}
          <div style={{
            display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap",
            opacity: heroVis?1:0, transform: heroVis?"translateY(0)":"translateY(20px)",
            transition:"opacity .6s ease .3s, transform .6s ease .3s",
          }}>
            <Link href="/onboarding/pricing" className="about-cta-primary">
              Get Started
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
            <Link href="/contact" className="about-cta-ghost">
              Talk to Us →
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHAT IS FINOVAOS ── */}
      <FadeIn style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 90px" }}>
        <div style={{
          borderRadius:24, padding:"52px 48px",
          background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)",
          display:"grid", gridTemplateColumns:"1fr 1fr", gap:48, alignItems:"center",
        }} className="about-grid-2">
          <div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 14px", borderRadius:100, background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.2)", marginBottom:20 }}>
              <span style={{ fontSize:11, fontWeight:700, color:"#818cf8", letterSpacing:".08em" }}>WHAT WE ARE</span>
            </div>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,40px)", fontWeight:800, letterSpacing:"-1.5px", lineHeight:1.2, marginBottom:18 }}>
              One platform. Every tool your business needs.
            </h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.45)", lineHeight:1.8, marginBottom:24 }}>
              FinovaOS is a complete business management platform — accounting, inventory, payroll, CRM, and AI insights — all connected in one system. No switching between apps. No broken integrations.
            </p>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.45)", lineHeight:1.8 }}>
              Purpose-built for trading, wholesale, distribution, and manufacturing businesses in Pakistan, UAE, and beyond.
            </p>
          </div>
          {/* Module grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }} className="about-grid-mod">
            {MODULES.map(m => (
              <div key={m.label} style={{
                background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)",
                borderRadius:12, padding:"14px 8px", textAlign:"center",
                transition:"background .2s, border-color .2s",
              }}
                onMouseEnter={e=>{ e.currentTarget.style.background="rgba(99,102,241,.1)"; e.currentTarget.style.borderColor="rgba(99,102,241,.3)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,.04)"; e.currentTarget.style.borderColor="rgba(255,255,255,.07)"; }}
              >
                <div style={{ fontSize:20, marginBottom:6 }}>{m.icon}</div>
                <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", letterSpacing:".04em" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* ── TIMELINE ── */}
      <FadeIn style={{ maxWidth:800, margin:"0 auto", padding:"0 24px 90px" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ height:1, width:28, background:"rgba(99,102,241,.4)" }}/>
            <span style={{ fontSize:11, fontWeight:800, color:"#818cf8", letterSpacing:".1em", textTransform:"uppercase" }}>Our Journey</span>
            <div style={{ height:1, width:28, background:"rgba(99,102,241,.4)" }}/>
          </div>
          <h2 style={{ fontSize:"clamp(26px,3.5vw,38px)", fontWeight:800, letterSpacing:"-1.5px", lineHeight:1.2 }}>
            How we got here
          </h2>
        </div>

        <div style={{ position:"relative" }}>
          {/* Line */}
          <div style={{ position:"absolute", left:28, top:14, bottom:14, width:2, background:"linear-gradient(180deg,#6366f1,#34d399,#6366f1)", borderRadius:2 }}/>

          {TIMELINE.map((t, i) => (
            <div key={t.year} style={{ display:"flex", gap:28, marginBottom: i < TIMELINE.length-1 ? 36 : 0 }}>
              {/* Dot */}
              <div style={{ flexShrink:0, width:58, display:"flex", flexDirection:"column", alignItems:"center", paddingTop:4 }}>
                <div style={{ width:16, height:16, borderRadius:"50%", background:t.color, border:"3px solid #04061a", boxShadow:`0 0 14px ${t.color}80`, zIndex:1 }}/>
              </div>
              {/* Card */}
              <div style={{
                flex:1, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)",
                borderLeft:`3px solid ${t.color}`, borderRadius:"0 14px 14px 0",
                padding:"20px 24px", marginBottom:0,
              }}>
                <div style={{ fontSize:11, fontWeight:800, color:t.color, letterSpacing:".08em", marginBottom:6 }}>{t.year}</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#fff", marginBottom:8 }}>{t.title}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", lineHeight:1.7 }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* ── VALUES ── */}
      <FadeIn style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 90px" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ height:1, width:28, background:"rgba(99,102,241,.4)" }}/>
            <span style={{ fontSize:11, fontWeight:800, color:"#818cf8", letterSpacing:".1em", textTransform:"uppercase" }}>What We Believe</span>
            <div style={{ height:1, width:28, background:"rgba(99,102,241,.4)" }}/>
          </div>
          <h2 style={{ fontSize:"clamp(26px,3.5vw,38px)", fontWeight:800, letterSpacing:"-1.5px", lineHeight:1.2 }}>
            Our principles
          </h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }} className="about-grid-3">
          {VALUES.map(v => (
            <div key={v.title} className="val-card" style={{
              padding:"28px 24px", borderRadius:18,
              background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)",
            }}
              onMouseEnter={e=>{ (e.currentTarget as HTMLDivElement).style.borderColor=v.color+"40"; (e.currentTarget as HTMLDivElement).style.boxShadow=`0 12px 40px ${v.color}15`; }}
              onMouseLeave={e=>{ (e.currentTarget as HTMLDivElement).style.borderColor="rgba(255,255,255,.07)"; (e.currentTarget as HTMLDivElement).style.boxShadow="none"; }}
            >
              <div style={{ width:44, height:44, borderRadius:12, background:`${v.color}18`, border:`1px solid ${v.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, marginBottom:16 }}>
                {v.icon}
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:8 }}>{v.title}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.42)", lineHeight:1.7 }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* ── WHY DIFFERENT ── */}
      <FadeIn style={{ maxWidth:900, margin:"0 auto", padding:"0 24px 90px" }}>
        <div style={{
          borderRadius:22, padding:"52px 48px", textAlign:"center",
          background:"linear-gradient(135deg,rgba(99,102,241,.08),rgba(109,40,217,.06))",
          border:"1px solid rgba(99,102,241,.2)", position:"relative", overflow:"hidden",
        }}>
          <div style={{ position:"absolute", top:-60, right:-60, width:250, height:250, borderRadius:"50%", background:"rgba(99,102,241,.08)", filter:"blur(50px)", pointerEvents:"none" }}/>
          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ fontSize:36, marginBottom:16 }}>🤔</div>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,36px)", fontWeight:800, letterSpacing:"-1.5px", marginBottom:16 }}>
              Why not just use QuickBooks or Xero?
            </h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.5)", lineHeight:1.8, maxWidth:640, margin:"0 auto 32px" }}>
              Those tools are great — for Western businesses. They weren't designed for landed cost calculations, local supplier terms, multi-warehouse management, or the way trading businesses in Pakistan and UAE actually operate. FinovaOS was.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, maxWidth:640, margin:"0 auto" }} className="about-grid-3">
              {[
                { label:"Landed Cost", sub:"Built-in calculation" },
                { label:"Local Compliance", sub:"PKR, AED, SAR ready" },
                { label:"Trading Focus", sub:"PO → PI → Payment flow" },
              ].map(f => (
                <div key={f.label} style={{ padding:"16px", borderRadius:12, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:4 }}>{f.label}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>{f.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ── FINAL CTA ── */}
      <FadeIn style={{ maxWidth:680, margin:"0 auto", padding:"0 24px 120px", textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:20 }}>🚀</div>
        <h2 style={{ fontSize:"clamp(28px,4vw,44px)", fontWeight:800, letterSpacing:"-1.5px", marginBottom:16, lineHeight:1.15 }}>
          Ready to run your business smarter?
        </h2>
        <p style={{ fontSize:16, color:"rgba(255,255,255,.4)", lineHeight:1.75, maxWidth:460, margin:"0 auto 36px" }}>
          75% off your first 3 months — 14-day money-back guarantee. No risk.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginBottom:32 }}>
          <Link href="/onboarding/signup/starter" className="about-cta-primary">
            Get Started
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
          <Link href="/demo" className="about-cta-ghost">
            Watch Demo →
          </Link>
        </div>
        <div style={{ display:"flex", gap:24, justifyContent:"center", flexWrap:"wrap" }}>
          {["✓ 14-day money-back guarantee","✓ 75% off first 3 months","✓ Cancel anytime"].map(t => (
            <span key={t} style={{ fontSize:13, color:"rgba(255,255,255,.3)", fontWeight:600 }}>{t}</span>
          ))}
        </div>
      </FadeIn>
    </main>
  );
}
