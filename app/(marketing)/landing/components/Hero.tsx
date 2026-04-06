"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

/* ── Animated counter ── */
function useCounter(target: number, duration = 1800, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return val;
}

/* ── Mini sparkline ── */
function Sparkline({ d, color }: { d: number[]; color: string }) {
  const W = 80, H = 32, max = Math.max(...d), min = Math.min(...d);
  const pts = d.map((v, i) => `${(i / (d.length - 1)) * W},${H - ((v - min) / (max - min + 1)) * H}`).join(" ");
  const area = `M${pts.split(" ").join(" L")} L${W},${H} L0,${H} Z`;
  const id = `sp${color.replace("#", "")}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <polyline points={pts} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export default function Hero() {
  const [ready, setReady] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const rev  = useCounter(284000, 1800, ready);
  const prof = useCounter(112000, 2000, ready);
  const fmt  = (n: number) => `$${n >= 1000 ? (n / 1000).toFixed(1) + "k" : n}`;

  return (
    <section ref={sectionRef} style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#04061a 0%,#07091f 50%,#0a0620 100%)",
      position: "relative", overflow: "hidden",
      fontFamily: "'Outfit',sans-serif",
      display: "flex", flexDirection: "column",
    }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; }

        @keyframes fadeUp   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes floatY   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes floatY2  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes orbA     { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,-30px)} }
        @keyframes orbB     { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-25px,20px)} }
        @keyframes pulse2   { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)} 70%{box-shadow:0 0 0 7px rgba(16,185,129,0)} }
        @keyframes slideInR { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideInL { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes countUp  { from{transform:translateY(8px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes barGrow  { from{height:0} to{height:var(--h)} }
        @keyframes gradShift{ 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes spin     { to{transform:rotate(360deg)} }

        .h1 { animation:fadeUp .65s ease .08s both; }
        .h2 { animation:fadeUp .65s ease .2s both; }
        .h3 { animation:fadeUp .65s ease .32s both; }
        .h4 { animation:fadeUp .65s ease .44s both; }
        .h5 { animation:fadeUp .65s ease .56s both; }
        .hd { animation:slideInR .8s cubic-bezier(.22,1,.36,1) .15s both; }

        .cta-primary {
          display:inline-flex; align-items:center; gap:9px;
          padding:15px 30px; border-radius:14px;
          background:linear-gradient(135deg,#6366f1 0%,#5b21b6 100%);
          color:#fff; font-family:inherit; font-size:15px; font-weight:700;
          border:none; cursor:pointer; text-decoration:none; letter-spacing:.01em;
          box-shadow:0 4px 20px rgba(99,102,241,.45), inset 0 1px 0 rgba(255,255,255,.12);
          transition:all .22s;
        }
        .cta-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(99,102,241,.55), inset 0 1px 0 rgba(255,255,255,.15); }

        .cta-ghost {
          display:inline-flex; align-items:center; gap:8px;
          padding:14px 24px; border-radius:14px;
          border:1.5px solid rgba(255,255,255,.1);
          color:rgba(255,255,255,.65); background:rgba(255,255,255,.04);
          font-family:inherit; font-size:14px; font-weight:600;
          cursor:pointer; text-decoration:none; transition:all .22s;
          backdrop-filter:blur(8px);
        }
        .cta-ghost:hover { border-color:rgba(255,255,255,.22); background:rgba(255,255,255,.08); color:#fff; transform:translateY(-1px); }

        .stat-pill:hover { background:rgba(255,255,255,.06) !important; transform:translateY(-1px); }
        .stat-pill { transition:all .2s; }

        .feature-tag:hover { border-color:rgba(99,102,241,.5) !important; background:rgba(99,102,241,.12) !important; }
        .feature-tag { transition:all .2s; }

        @media(max-width:1024px) {
          .hero-right { display:none !important; }
          .hero-grid  { grid-template-columns:1fr !important; }
          .hero-left  { align-items:center !important; text-align:center !important; }
          .hero-left .cta-primary,.hero-left .cta-ghost { /* stay flex */ }
          .hero-ctarow { justify-content:center !important; }
          .hero-proof  { justify-content:center !important; }
          .hero-tags   { justify-content:center !important; }
        }
        @media(max-width:640px) {
          .hero-stats { grid-template-columns:repeat(2,1fr) !important; }
          .hero-stats > div:nth-child(2){ border-right:none !important; }
          .hero-stats > div:nth-child(3){ border-bottom:none !important; }
          .hero-main-pad { padding:90px 20px 60px !important; }
          .hero-ctarow { flex-wrap:wrap !important; }
        }
      `}</style>

      {/* ── Background layers ── */}
      <div aria-hidden style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        {/* Grid */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(99,102,241,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.05) 1px,transparent 1px)",
          backgroundSize:"56px 56px", opacity:.7,
        }}/>
        {/* Glow orbs */}
        <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%", top:-200, left:-120, animation:"orbA 16s ease-in-out infinite", background:"radial-gradient(circle,rgba(99,102,241,.14),transparent 62%)" }}/>
        <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", bottom:-100, right:60, animation:"orbB 20s ease-in-out infinite", background:"radial-gradient(circle,rgba(109,40,217,.11),transparent 62%)" }}/>
        <div style={{ position:"absolute", width:300, height:300, borderRadius:"50%", top:"40%", right:"38%", animation:"orbA 26s ease-in-out infinite reverse", background:"radial-gradient(circle,rgba(14,165,233,.07),transparent 65%)" }}/>
        {/* Horizontal accent lines */}
        <div style={{ position:"absolute", top:0, left:"6%", right:"6%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.35),transparent)" }}/>
        <div style={{ position:"absolute", bottom:0, left:"10%", right:"10%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.15),transparent)" }}/>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex:1, display:"flex", alignItems:"center", position:"relative", zIndex:1 }}>
        <div className="hero-main-pad" style={{ maxWidth:1220, margin:"0 auto", padding:"120px 28px 80px", width:"100%" }}>

          <div className="hero-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:56, alignItems:"center" }}>

            {/* ════════════ LEFT ════════════ */}
            <div className="hero-left" style={{ display:"flex", flexDirection:"column", gap:0 }}>

              {/* Badge */}
              <div className="h1" style={{ marginBottom:20 }}>
                <div style={{
                  display:"inline-flex", alignItems:"center", gap:8,
                  padding:"6px 12px 6px 8px", borderRadius:100,
                  background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.22)",
                }}>
                  <span style={{
                    width:8, height:8, borderRadius:"50%", background:"#10b981",
                    animation:"pulse2 2s infinite", display:"inline-block", flexShrink:0,
                  }}/>
                  <span style={{ fontSize:11, fontWeight:700, color:"#a5b4fc", letterSpacing:".07em" }}>
                    PURPOSE-BUILT FOR TRADING & WHOLESALE
                  </span>
                </div>
              </div>

              {/* Headline */}
              <h1 className="h2" style={{
                fontSize:"clamp(38px,4vw,60px)", fontWeight:900,
                lineHeight:1.06, letterSpacing:"-2px",
                color:"#fff", marginBottom:22,
              }}>
                Run Your Business.{" "}
                <span style={{
                  background:"linear-gradient(135deg,#818cf8,#a78bfa,#60a5fa)",
                  backgroundSize:"200% auto",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                  animation:"gradShift 4s ease infinite",
                }}>
                  Let AI Handle the Numbers.
                </span>
              </h1>

              {/* Subheadline */}
              <p className="h3" style={{
                fontSize:16, lineHeight:1.78,
                color:"rgba(255,255,255,.48)", marginBottom:32,
                maxWidth:430,
              }}>
                From accounting and inventory to payroll and CRM — FinovaOS manages your entire business while AI monitors your numbers and tells you exactly what to do next.
              </p>

              {/* Feature tags */}
              <div className="h3 hero-tags" style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:36 }}>
                {[
                  "Sales & Purchase Orders","Landed Cost","Multi-Warehouse",
                  "Customer Statements","Built-in AI","Double-Entry Accounting",
                ].map(f => (
                  <span key={f} className="feature-tag" style={{
                    fontSize:11.5, fontWeight:600, color:"rgba(255,255,255,.45)",
                    padding:"5px 12px", borderRadius:100,
                    background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)",
                    cursor:"default",
                  }}>
                    {f}
                  </span>
                ))}
              </div>

              {/* CTAs */}
              <div className="h4 hero-ctarow" style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:40 }}>
                <Link href="/onboarding/signup/starter" className="cta-primary">
                  Get Started
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
                <Link href="/demo" className="cta-ghost">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Watch Demo
                </Link>
              </div>

              {/* Social proof row */}
              <div className="h5 hero-proof" style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {/* Stars */}
                  <div style={{ display:"flex", gap:2 }}>
                    {[...Array(5)].map((_,i) => (
                      <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="#fbbf24">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ))}
                  </div>
                  <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.4)" }}>
                    <span style={{ color:"rgba(255,255,255,.75)" }}>4.9/5</span> • 2,400+ reviews
                  </span>
                </div>
                <span style={{ width:1, height:16, background:"rgba(255,255,255,.1)", display:"inline-block" }}/>
                <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.35)" }}>No credit card required</span>
                <span style={{ width:1, height:16, background:"rgba(255,255,255,.1)", display:"inline-block" }}/>
                <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.35)" }}>Cancel anytime</span>
              </div>
            </div>

            {/* ════════════ RIGHT — Product preview ════════════ */}
            <div className="hero-right hd" style={{ position:"relative" }}>

              {/* Floating notification — top left */}
              <div style={{
                position:"absolute", top:-16, left:-12, zIndex:10,
                animation:"floatY2 5s ease-in-out infinite .8s",
              }}>
                <div style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"10px 14px", borderRadius:13,
                  background:"rgba(8,10,28,.92)", border:"1px solid rgba(255,255,255,.1)",
                  backdropFilter:"blur(16px)", boxShadow:"0 12px 32px rgba(0,0,0,.4)",
                  whiteSpace:"nowrap",
                }}>
                  <div style={{
                    width:32, height:32, borderRadius:9, flexShrink:0,
                    background:"rgba(167,139,250,.18)", border:"1px solid rgba(167,139,250,.3)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {/* Sparkle / AI icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize:11.5, fontWeight:700, color:"#fff" }}>AI Insight: Revenue up 22% MoM</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginTop:1 }}>FinovaOS AI • Health score 91/100</div>
                  </div>
                </div>
              </div>

              {/* Floating notification — bottom right */}
              <div style={{
                position:"absolute", bottom:32, right:-20, zIndex:10,
                animation:"floatY2 6s ease-in-out infinite 1.4s",
              }}>
                <div style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"10px 14px", borderRadius:13,
                  background:"rgba(8,10,28,.92)", border:"1px solid rgba(16,185,129,.2)",
                  backdropFilter:"blur(16px)", boxShadow:"0 12px 32px rgba(0,0,0,.4)",
                  whiteSpace:"nowrap",
                }}>
                  <div style={{
                    width:32, height:32, borderRadius:9, flexShrink:0,
                    background:"rgba(52,211,153,.15)", border:"1px solid rgba(52,211,153,.3)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {/* Dollar circle icon */}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v12m-3-8.5h4.5a2 2 0 0 1 0 4H9a2 2 0 0 0 0 4H13.5"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize:11.5, fontWeight:700, color:"#34d399" }}>Payment received • $18,400</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginTop:1 }}>Al-Falah Trading • just now</div>
                  </div>
                </div>
              </div>

              {/* Main product card */}
              <div style={{
                borderRadius:22,
                background:"rgba(8,10,26,.9)", border:"1px solid rgba(255,255,255,.08)",
                backdropFilter:"blur(24px)",
                boxShadow:"0 48px 120px rgba(0,0,0,.65), 0 0 0 1px rgba(99,102,241,.1), inset 0 1px 0 rgba(255,255,255,.05)",
                animation:"floatY 9s ease-in-out infinite",
                overflow:"hidden",
              }}>

                {/* Window chrome */}
                <div style={{
                  padding:"12px 18px", display:"flex", alignItems:"center", gap:10,
                  borderBottom:"1px solid rgba(255,255,255,.06)",
                  background:"rgba(255,255,255,.025)",
                }}>
                  <div style={{ display:"flex", gap:6 }}>
                    {["#f87171","#fbbf24","#34d399"].map((c,i) => (
                      <div key={i} style={{ width:9, height:9, borderRadius:"50%", background:c, opacity:.7 }}/>
                    ))}
                  </div>
                  <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
                    <div style={{
                      display:"flex", alignItems:"center", gap:7,
                      padding:"4px 14px", borderRadius:8,
                      background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.07)",
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <span style={{ fontSize:10.5, color:"rgba(255,255,255,.3)", fontWeight:500 }}>usefinova.app/dashboard</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{
                      width:7, height:7, borderRadius:"50%", background:"#10b981",
                      animation:"pulse2 2.5s infinite",
                    }}/>
                    <span style={{ fontSize:10, color:"#10b981", fontWeight:700 }}>Live</span>
                  </div>
                </div>

                <div style={{ padding:"22px 22px 24px", display:"flex", flexDirection:"column", gap:16 }}>

                  {/* Header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.9)" }}>Business Dashboard</div>
                      <div style={{ fontSize:10.5, color:"rgba(255,255,255,.3)", marginTop:2 }}>March 2026 • All warehouses</div>
                    </div>
                    <div style={{ display:"flex", gap:5 }}>
                      {["Week","Month","Year"].map((l,i) => (
                        <div key={l} style={{
                          padding:"3px 10px", borderRadius:7, fontSize:10.5, fontWeight:600,
                          background: i===1 ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)",
                          color: i===1 ? "#a5b4fc" : "rgba(255,255,255,.28)",
                          border:`1px solid ${i===1 ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.06)"}`,
                          cursor:"default",
                        }}>{l}</div>
                      ))}
                    </div>
                  </div>

                  {/* 2-col metrics */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

                    {/* Revenue */}
                    <div style={{ borderRadius:14, padding:"14px 16px", background:"rgba(16,185,129,.07)", border:"1px solid rgba(16,185,129,.18)" }}>
                      <div style={{ fontSize:9.5, fontWeight:700, color:"rgba(52,211,153,.6)", letterSpacing:".07em", marginBottom:6 }}>REVENUE</div>
                      <div style={{ fontSize:24, fontWeight:800, color:"#fff", letterSpacing:"-0.6px", marginBottom:8 }}>{fmt(rev)}</div>
                      <Sparkline d={[48,62,50,75,60,85,76,95,82,110,94,120]} color="#10b981"/>
                      <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:8 }}>
                        <span style={{ fontSize:10.5, fontWeight:700, color:"#34d399" }}>↑ 22%</span>
                        <span style={{ fontSize:10, color:"rgba(255,255,255,.28)" }}>vs last month</span>
                      </div>
                    </div>

                    {/* Net Profit */}
                    <div style={{ borderRadius:14, padding:"14px 16px", background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)" }}>
                      <div style={{ fontSize:9.5, fontWeight:700, color:"rgba(165,180,252,.6)", letterSpacing:".07em", marginBottom:6 }}>NET PROFIT</div>
                      <div style={{ fontSize:24, fontWeight:800, color:"#a5b4fc", letterSpacing:"-0.6px", marginBottom:8 }}>{fmt(prof)}</div>
                      <Sparkline d={[28,40,32,50,42,60,54,70,62,80,72,90]} color="#818cf8"/>
                      <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:8 }}>
                        <span style={{ fontSize:10.5, fontWeight:700, color:"#818cf8" }}>63%</span>
                        <span style={{ fontSize:10, color:"rgba(255,255,255,.28)" }}>profit margin</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent invoices mini list */}
                  <div style={{ borderRadius:14, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
                    <div style={{ padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.5)" }}>Recent Invoices</span>
                      <span style={{ fontSize:10, color:"#818cf8", fontWeight:600, cursor:"default" }}>{"View all ->"}</span>
                    </div>
                    {[
                      { name:"Gulf Star Trading",   amount:"$12,400", status:"Paid",    color:"#34d399" },
                      { name:"Al-Noor Distributors", amount:"$8,750",  status:"Pending", color:"#fbbf24" },
                      { name:"Metro Wholesale Co.",  amount:"$21,100", status:"Paid",    color:"#34d399" },
                    ].map((inv,i) => (
                      <div key={i} style={{
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"9px 14px",
                        borderBottom: i < 2 ? "1px solid rgba(255,255,255,.04)" : "none",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)",
                      }}>
                        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                          <div style={{
                            width:28, height:28, borderRadius:8,
                            background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.2)",
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:11, fontWeight:800, color:"#a5b4fc", flexShrink:0,
                          }}>
                            {inv.name[0]}
                          </div>
                          <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.7)" }}>{inv.name}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{inv.amount}</span>
                          <span style={{
                            fontSize:10, fontWeight:700, color:inv.color,
                            padding:"2px 8px", borderRadius:20,
                            background:`${inv.color}18`, border:`1px solid ${inv.color}30`,
                          }}>{inv.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick stat pills */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {([
                      { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, iconBg:"rgba(251,191,36,.12)", iconBorder:"rgba(251,191,36,.25)", label:"Warehouses", val:"3 active" },
                      { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>, iconBg:"rgba(52,211,153,.12)", iconBorder:"rgba(52,211,153,.25)", label:"Open Orders", val:"28" },
                      { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>, iconBg:"rgba(167,139,250,.12)", iconBorder:"rgba(167,139,250,.25)", label:"AI Score", val:"91/100" },
                    ] as { icon: React.ReactNode; iconBg: string; iconBorder: string; label: string; val: string }[]).map(s => (
                      <div key={s.label} style={{
                        borderRadius:10, padding:"10px 8px", textAlign:"center",
                        background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)",
                      }}>
                        <div style={{ width:26, height:26, borderRadius:7, margin:"0 auto 5px", background:s.iconBg, border:`1px solid ${s.iconBorder}`, display:"flex", alignItems:"center", justifyContent:"center" }}>{s.icon}</div>
                        <div style={{ fontSize:12, fontWeight:800, color:"rgba(255,255,255,.85)" }}>{s.val}</div>
                        <div style={{ fontSize:9.5, color:"rgba(255,255,255,.28)", marginTop:1, fontWeight:500 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Glow behind card */}
              <div aria-hidden style={{
                position:"absolute", inset:-80, zIndex:-1, pointerEvents:"none",
                background:"radial-gradient(ellipse at 50% 50%,rgba(99,102,241,.1),transparent 65%)",
              }}/>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ position:"relative", zIndex:1, borderTop:"1px solid rgba(255,255,255,.06)" }}>
        <div style={{ maxWidth:1220, margin:"0 auto", padding:"32px 28px" }}>
          <div className="hero-stats" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:1 }}>
            {[
              { n:"18,000+",  l:"Businesses",  desc:"across 40 countries",   color:"#818cf8" },
              { n:"99.9%",    l:"Uptime",       desc:"guaranteed SLA",         color:"#34d399" },
              { n:"4.9 / 5", l:"Rating",       desc:"from verified users",     color:"#fbbf24" },
              { n:"< 2 min",  l:"Setup time",   desc:"from signup to first invoice", color:"#60a5fa" },
            ].map((s, i) => (
              <div key={s.l} className="stat-pill" style={{
                padding:"20px 28px", cursor:"default",
                borderRight: i < 3 ? "1px solid rgba(255,255,255,.05)" : "none",
              }}>
                <div style={{ fontSize:28, fontWeight:900, color:s.color, letterSpacing:"-1px", marginBottom:4 }}>{s.n}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", marginBottom:2 }}>{s.l}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.28)", fontWeight:500 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
