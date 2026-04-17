"use client";
import Link from "next/link";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";

/* ─── Data ─── */
const CERTIFICATIONS = [
  { icon:"🛡️", label:"256-bit SSL/TLS", sub:"All data in transit" },
  { icon:"🔐", label:"AES-256 Encryption", sub:"All data at rest" },
  { icon:"🏦", label:"Bank-grade Security", sub:"PCI-DSS aligned" },
  { icon:"🌐", label:"Global Data Residency", sub:"Tier-4 data centers" },
];

const PILLARS = [
  {
    id:"encryption",
    icon:"🔒",
    color:"#818cf8",
    glow:"rgba(129,140,248,.22)",
    dim:"rgba(129,140,248,.08)",
    border:"rgba(129,140,248,.3)",
    title:"Encryption at Every Layer",
    subtitle:"Your data is unreadable to anyone but you.",
    points:[
      { icon:"🔑", title:"TLS 1.3 in Transit", desc:"Every byte between your browser and our servers is encrypted using the latest TLS 1.3 protocol. No exceptions." },
      { icon:"💾", title:"AES-256 at Rest", desc:"Your database records, attachments, and backups are encrypted with AES-256 before being written to disk." },
      { icon:"🗝️", title:"Key Management", desc:"Encryption keys are rotated automatically and stored separately from the data they protect, in a dedicated key vault." },
    ],
  },
  {
    id:"access",
    icon:"👤",
    color:"#34d399",
    glow:"rgba(52,211,153,.22)",
    dim:"rgba(52,211,153,.08)",
    border:"rgba(52,211,153,.3)",
    title:"Access Control & Identity",
    subtitle:"The right people see the right data. Nothing more.",
    points:[
      { icon:"🎛️", title:"Role-Based Access (RBAC)", desc:"Define granular permissions per user — by module, branch, and action type. A cashier can never see payroll." },
      { icon:"🏢", title:"Company & Branch Isolation", desc:"Multi-company users have strict data boundaries. Switching companies never leaks data between entities." },
      { icon:"📱", title:"Two-Factor Authentication", desc:"Enforce 2FA for any or all users. Supports TOTP authenticator apps and SMS fallback." },
    ],
  },
  {
    id:"infrastructure",
    icon:"🏗️",
    color:"#fbbf24",
    glow:"rgba(251,191,36,.22)",
    dim:"rgba(251,191,36,.08)",
    border:"rgba(251,191,36,.3)",
    title:"Infrastructure & Uptime",
    subtitle:"Always on. Always backed up. Always recoverable.",
    points:[
      { icon:"⚡", title:"99.9% Uptime SLA", desc:"Our infrastructure runs on redundant cloud nodes across multiple availability zones. No single point of failure." },
      { icon:"💿", title:"Daily Automated Backups", desc:"Full database snapshots are taken every 24 hours and retained for 30 days. Point-in-time recovery available on Enterprise." },
      { icon:"🌐", title:"Global Cloud Infrastructure", desc:"Primary data stored on world-class servers with multi-region replication for disaster recovery." },
    ],
  },
  {
    id:"audit",
    icon:"📋",
    color:"#f87171",
    glow:"rgba(248,113,113,.22)",
    dim:"rgba(248,113,113,.08)",
    border:"rgba(248,113,113,.3)",
    title:"Audit Trails & Compliance",
    subtitle:"Every action logged. Every change attributable.",
    points:[
      { icon:"📝", title:"Immutable Audit Logs", desc:"Every create, edit, and delete is logged with user identity, IP address, device, and precise timestamp. Logs cannot be modified." },
      { icon:"🔍", title:"Change History", desc:"View before/after snapshots for any record. Your auditors and compliance team will love the paper trail." },
      { icon:"📊", title:"Tax Compliance", desc:"Reports and data exports are structured to align with global VAT/GST and local tax authority requirements." },
    ],
  },
  {
    id:"network",
    icon:"🌐",
    color:"#a78bfa",
    glow:"rgba(167,139,250,.22)",
    dim:"rgba(167,139,250,.08)",
    border:"rgba(167,139,250,.3)",
    title:"Network & Application Security",
    subtitle:"Hardened against modern threats, continuously monitored.",
    points:[
      { icon:"🛡️", title:"DDoS Protection", desc:"Multi-layer DDoS mitigation protects platform availability even under large-scale attack traffic." },
      { icon:"🚧", title:"Web Application Firewall", desc:"All requests pass through a WAF that blocks SQL injection, XSS, and OWASP Top 10 vulnerabilities automatically." },
      { icon:"🔬", title:"Penetration Testing", desc:"Third-party security audits and penetration tests are conducted periodically to surface and remediate vulnerabilities." },
    ],
  },
  {
    id:"privacy",
    icon:"🔏",
    color:"#06b6d4",
    glow:"rgba(6,182,212,.22)",
    dim:"rgba(6,182,212,.08)",
    border:"rgba(6,182,212,.3)",
    title:"Privacy & Data Ownership",
    subtitle:"Your data is yours. Always.",
    points:[
      { icon:"🚫", title:"Zero Data Selling",       desc:"We never sell, share, or license your financial data to third parties. Your business data is never used for advertising." },
      { icon:"📤", title:"Full Data Export",         desc:"Export your complete data at any time in standard formats (CSV, Excel, PDF). No lock-in, no hostage data." },
      { icon:"🗑️", title:"Right to Deletion",       desc:"Request full account deletion at any time. We purge all your data within 30 days, with written confirmation." },
    ],
  },
];

const STATS = [
  { val:"256-bit", label:"AES Encryption", color:"#818cf8" },
  { val:"99.9%",   label:"Uptime SLA",     color:"#34d399" },
  { val:"30 days", label:"Backup Retention",color:"#fbbf24" },
  { val:"24/7",    label:"Monitoring",      color:"#f87171" },
];

/* ─── Hook ─── */
function useVisible(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, v] as const;
}

/* ─── Pillar section ─── */
function PillarSection({ p, index }: { p: typeof PILLARS[0]; index: number }) {
  const [ref, visible] = useVisible(0.08);
  const [hov, setHov] = useState<number|null>(null);
  const isEven = index % 2 === 0;

  return (
    <section ref={ref} id={p.id} className="pillar-section" style={{
      padding:"88px 24px",
      background: index % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)",
      borderTop:"1px solid rgba(255,255,255,.05)",
      position:"relative", overflow:"hidden",
    }}>
      <div style={{
        position:"absolute", width:420, height:420, borderRadius:"50%",
        background:`radial-gradient(circle,${p.glow},transparent 65%)`,
        top:isEven?-80:"auto", bottom:isEven?"auto":-80,
        right:isEven?-80:"auto", left:isEven?"auto":-80,
        pointerEvents:"none",
      }}/>

      <div style={{ maxWidth:1100, margin:"0 auto", position:"relative" }}>
        <div className="pillar-grid" style={{
          display:"grid", gridTemplateColumns:"1fr 1fr", gap:72, alignItems:"center",
          direction: isEven ? "ltr" : "rtl",
        }}>
          {/* Copy */}
          <div style={{ direction:"ltr" }}>
            <div style={{
              opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(18px)",
              transition:"all .5s ease",
            }}>
              <div style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"5px 14px", borderRadius:24,
                background:p.dim, border:`1px solid ${p.border}`,
                fontSize:11, fontWeight:700, color:p.color,
                letterSpacing:".09em", textTransform:"uppercase", marginBottom:20,
              }}>
                <span style={{ fontSize:16 }}>{p.icon}</span>
                Security Layer {String(index+1).padStart(2,"0")}
              </div>
            </div>

            <h2 style={{
              fontFamily:"'Lora',serif",
              fontSize:"clamp(24px,3vw,38px)",
              fontWeight:700, color:"white",
              letterSpacing:"-1px", lineHeight:1.15, marginBottom:10,
              opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(18px)",
              transition:"all .55s ease .06s",
            }}>
              {p.title}
            </h2>
            <p style={{
              fontSize:15, color:p.color, fontWeight:600, marginBottom:32,
              opacity:visible?1:0, transition:"opacity .5s ease .1s",
            }}>
              {p.subtitle}
            </p>

            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {p.points.map((pt, i) => (
                <div key={pt.title} style={{
                  display:"flex", gap:14, alignItems:"flex-start",
                  opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(14px)",
                  transition:`all .5s ease ${.15+i*.07}s`,
                }}>
                  <div style={{
                    width:38, height:38, borderRadius:10, flexShrink:0,
                    background:p.dim, border:`1px solid ${p.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:18,
                  }}>
                    {pt.icon}
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.88)", marginBottom:4 }}>{pt.title}</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.7 }}>{pt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual card */}
          <div style={{ direction:"ltr" }}>
            <div style={{
              borderRadius:24, overflow:"hidden",
              background:"rgba(255,255,255,.03)",
              border:`1.5px solid ${p.border}`,
              backdropFilter:"blur(20px)",
              boxShadow:`0 24px 64px rgba(0,0,0,.4), 0 0 0 1px ${p.color}10`,
              opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(24px)",
              transition:"all .65s ease .2s",
              position:"relative",
            }}>
              {/* Top shimmer */}
              <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1,
                background:`linear-gradient(90deg,transparent,${p.color},transparent)` }}/>

              {/* Card header */}
              <div style={{
                padding:"20px 24px",
                borderBottom:`1px solid rgba(255,255,255,.06)`,
                display:"flex", alignItems:"center", gap:12,
              }}>
                <div style={{
                  width:40, height:40, borderRadius:12,
                  background:p.dim, border:`1px solid ${p.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20,
                }}>
                  {p.icon}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.85)" }}>{p.title}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>Security module</div>
                </div>
                <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6,
                  padding:"4px 10px", borderRadius:16,
                  background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.25)" }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:"#34d399",
                    boxShadow:"0 0 8px rgba(52,211,153,.8)" }}/>
                  <span style={{ fontSize:10, fontWeight:700, color:"#34d399" }}>ACTIVE</span>
                </div>
              </div>

              {/* Feature list in card */}
              <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:12 }}>
                {p.points.map((pt, i) => (
                  <div
                    key={pt.title}
                    onMouseEnter={()=>setHov(i)}
                    onMouseLeave={()=>setHov(null)}
                    style={{
                      display:"flex", alignItems:"center", gap:12,
                      padding:"12px 14px", borderRadius:12,
                      background: hov===i ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.02)",
                      border:`1px solid ${hov===i ? p.border : "rgba(255,255,255,.05)"}`,
                      transition:"all .25s", cursor:"default",
                    }}>
                    <div style={{
                      width:30, height:30, borderRadius:8, flexShrink:0,
                      background:p.dim, border:`1px solid ${p.border}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:15,
                    }}>
                      {pt.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12.5, fontWeight:700, color:"rgba(255,255,255,.8)" }}>{pt.title}</div>
                    </div>
                    <div style={{
                      width:18, height:18, borderRadius:"50%",
                      background:`${p.color}18`, border:`1px solid ${p.border}`,
                      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                    }}>
                      <svg width="8" height="8" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4.5 8.5 11 1" stroke={p.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>

              {/* Card footer */}
              <div style={{
                margin:"0 24px 20px",
                padding:"12px 16px", borderRadius:12,
                background:p.dim, border:`1px solid ${p.border}`,
                display:"flex", alignItems:"center", gap:8,
              }}>
                <span style={{ fontSize:13 }}>🔒</span>
                <span style={{ fontSize:12, color:p.color, fontWeight:600 }}>
                  All {p.points.length} protections active on every account
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Page ─── */
export default function SecurityPage() {
  const [heroRef, heroVisible] = useVisible(0.2);
  const [statsRef, statsVisible] = useVisible(0.15);
  const [ctaRef, ctaVisible] = useVisible(0.15);

  return (
    <>
      <Head>
        <title>Security – FinovaOS</title>
        <meta name="description" content="Bank-grade security for your financial data. 256-bit encryption, role-based access, audit trails, and global cloud infrastructure."/>
      </Head>

      <div style={{
        minHeight:"100vh",
        background:"linear-gradient(180deg,#080c1e 0%,#0c0f2e 30%,#080c1e 100%)",
        color:"white",
        fontFamily:"'Outfit','DM Sans',sans-serif",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Lora:ital,wght@0,700;1,700&display=swap');
          *,*::before,*::after{box-sizing:border-box;}
          @keyframes orbDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(16px,-14px)}}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
          @keyframes rotateSlow{to{transform:rotate(360deg)}}
          @keyframes floatBadge{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
          @keyframes pulseRing{0%{transform:translate(-50%,-50%) scale(1);opacity:.6}100%{transform:translate(-50%,-50%) scale(1.6);opacity:0}}
          @keyframes shieldBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
          @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
          @media(max-width:900px){
            .pillar-grid{grid-template-columns:1fr!important;direction:ltr!important;gap:36px!important;}
            .stats-grid{grid-template-columns:repeat(2,1fr)!important;}
          }
          @media(max-width:600px){
            .pillar-section{padding:52px 16px!important;}
            .cert-chip{padding:8px 12px!important;}
          }
          @media(max-width:500px){.stats-grid{grid-template-columns:1fr!important;}}
          .cert-chip{
            display:inline-flex;align-items:center;gap:9px;
            padding:10px 18px;border-radius:14px;
            background:rgba(255,255,255,.04);
            border:1.5px solid rgba(255,255,255,.09);
            backdropFilter:blur(12px);
            transition:all .25s;cursor:default;
          }
          .cert-chip:hover{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.18);transform:translateY(-2px);}
        `}</style>

        {/* ── HERO ── */}
        <section style={{ padding:"100px 24px 64px", position:"relative", overflow:"hidden" }}>
          {/* BG */}
          <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
            <div style={{ position:"absolute", inset:0,
              backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",
              backgroundSize:"48px 48px" }}/>
            <div style={{ position:"absolute", width:600, height:600, borderRadius:"50%",
              background:"radial-gradient(circle,rgba(99,102,241,.12),transparent 65%)",
              top:-140, right:-100, animation:"orbDrift 14s ease-in-out infinite" }}/>
            <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%",
              background:"radial-gradient(circle,rgba(52,211,153,.07),transparent 65%)",
              bottom:-60, left:60, animation:"orbDrift 20s ease-in-out infinite reverse" }}/>
            {/* Rotating ring */}
            <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%",
              border:"1px solid rgba(99,102,241,.05)",
              top:"50%", left:"50%", transform:"translate(-50%,-50%)",
              animation:"rotateSlow 40s linear infinite", pointerEvents:"none" }}>
              <div style={{ position:"absolute", top:-4, left:"50%", width:8, height:8, borderRadius:"50%",
                background:"#6366f1", marginLeft:-4, boxShadow:"0 0 14px rgba(99,102,241,.9)" }}/>
            </div>
            <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1,
              background:"linear-gradient(90deg,transparent,rgba(99,102,241,.5),transparent)" }}/>
          </div>

          <div ref={heroRef} style={{ maxWidth:860, margin:"0 auto", textAlign:"center", position:"relative" }}>
            {/* Shield hero icon */}
            <div style={{
              display:"inline-flex", alignItems:"center", justifyContent:"center",
              width:80, height:80, borderRadius:24, marginBottom:28,
              background:"linear-gradient(135deg,rgba(129,140,248,.2),rgba(99,102,241,.1))",
              border:"1.5px solid rgba(129,140,248,.35)",
              backdropFilter:"blur(16px)",
              boxShadow:"0 8px 32px rgba(99,102,241,.3)",
              animation:"shieldBob 4s ease-in-out infinite",
              position:"relative",
              opacity:heroVisible?1:0, transition:"opacity .5s ease",
            }}>
              {/* Pulse rings */}
              <div style={{ position:"absolute", width:80, height:80, borderRadius:24,
                border:"1px solid rgba(99,102,241,.3)",
                top:"50%", left:"50%",
                animation:"pulseRing 2.5s ease-out infinite" }}/>
              <div style={{ position:"absolute", width:80, height:80, borderRadius:24,
                border:"1px solid rgba(99,102,241,.2)",
                top:"50%", left:"50%",
                animation:"pulseRing 2.5s ease-out .8s infinite" }}/>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>

            {/* Badge */}
            <div style={{
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"6px 16px", borderRadius:24,
              background:"rgba(52,211,153,.1)", border:"1.5px solid rgba(52,211,153,.28)",
              fontSize:11, fontWeight:700, color:"#6ee7b7",
              letterSpacing:".09em", textTransform:"uppercase", marginBottom:24,
              opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(16px)",
              transition:"all .5s ease .1s",
            }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", animation:"blink 2s ease infinite" }}/>
              Bank-Grade Security
            </div>

            <h1 style={{
              fontFamily:"'Lora',serif",
              fontSize:"clamp(36px,5.5vw,62px)",
              fontWeight:700, color:"white",
              letterSpacing:"-2px", lineHeight:1.08, marginBottom:18,
              opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(20px)",
              transition:"all .6s ease .15s",
            }}>
              Your data is safe.
              <span style={{ display:"block", fontStyle:"italic",
                background:"linear-gradient(135deg,#a5b4fc,#818cf8,#c4b5fd)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                We guarantee it.
              </span>
            </h1>

            <p style={{
              fontSize:17, color:"rgba(255,255,255,.42)", lineHeight:1.8,
              maxWidth:580, margin:"0 auto 40px",
              opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(16px)",
              transition:"all .6s ease .22s",
            }}>
              FinovaOS is built on a security-first foundation. Your financial data is encrypted, isolated, audited, and stored on world-class servers — never sold, never shared.
            </p>

            {/* Cert chips */}
            <div style={{
              display:"flex", justifyContent:"center", flexWrap:"wrap", gap:10, marginBottom:48,
              opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(14px)",
              transition:"all .6s ease .28s",
            }}>
              {CERTIFICATIONS.map(c => (
                <div key={c.label} className="cert-chip">
                  <span style={{ fontSize:20 }}>{c.icon}</span>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:12.5, fontWeight:700, color:"rgba(255,255,255,.85)", lineHeight:1.2 }}>{c.label}</div>
                    <div style={{ fontSize:10.5, color:"rgba(255,255,255,.3)", fontWeight:500 }}>{c.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div style={{
              display:"flex", justifyContent:"center", gap:14, flexWrap:"wrap",
              opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(14px)",
              transition:"all .6s ease .34s",
            }}>
              <Link href="/website-signup" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"13px 28px", borderRadius:13,
                background:"linear-gradient(135deg,#6366f1,#4f46e5)",
                color:"white", fontWeight:700, fontSize:14,
                textDecoration:"none", fontFamily:"inherit",
                boxShadow:"0 6px 24px rgba(99,102,241,.4)", transition:"all .25s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 32px rgba(99,102,241,.55)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 6px 24px rgba(99,102,241,.4)";}}
              >
                Get Started →
              </Link>
              <Link href="/support" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"12px 24px", borderRadius:13,
                border:"1.5px solid rgba(255,255,255,.12)",
                background:"rgba(255,255,255,.04)",
                color:"rgba(255,255,255,.65)", fontWeight:600, fontSize:14,
                textDecoration:"none", fontFamily:"inherit", transition:"all .25s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.28)";e.currentTarget.style.color="white";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.12)";e.currentTarget.style.color="rgba(255,255,255,.65)";}}
              >
                Talk to Security Team
              </Link>
            </div>
          </div>
        </section>

        {/* ── STATS STRIP ── */}
        <div style={{
          borderTop:"1px solid rgba(255,255,255,.05)",
          borderBottom:"1px solid rgba(255,255,255,.05)",
          background:"rgba(255,255,255,.02)",
        }}>
          <div ref={statsRef} className="stats-grid" style={{
            maxWidth:1000, margin:"0 auto", padding:"32px 24px",
            display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:0,
            opacity:statsVisible?1:0, transform:statsVisible?"translateY(0)":"translateY(16px)",
            transition:"all .6s ease",
          }}>
            {STATS.map(({val,label,color},i) => (
              <div key={label} style={{
                padding:"0 24px", textAlign:"center",
                borderRight: i<3 ? "1px solid rgba(255,255,255,.06)" : "none",
              }}>
                <div style={{ fontFamily:"'Lora',serif", fontSize:26, fontWeight:700, color, letterSpacing:"-.5px" }}>{val}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.28)", fontWeight:500, marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SCROLLING TICKER ── */}
        <div style={{ overflow:"hidden", padding:"12px 0", background:"rgba(255,255,255,.015)", position:"relative" }}>
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:80, background:"linear-gradient(90deg,#080c1e,transparent)", zIndex:2, pointerEvents:"none" }}/>
          <div style={{ position:"absolute", right:0, top:0, bottom:0, width:80, background:"linear-gradient(270deg,#080c1e,transparent)", zIndex:2, pointerEvents:"none" }}/>
          <div style={{ display:"flex", animation:"ticker 28s linear infinite", width:"max-content" }}>
            {[...Array(2)].map((_,ri) =>
              ["256-bit Encryption","Role-Based Access","Audit Trails","99.9% Uptime","Daily Backups","Tax Authority Compliance","Global Regions","Zero Data Selling","DDoS Protection","WAF Enabled"].map(t=>(
                <div key={`${ri}-${t}`} style={{
                  padding:"0 24px",
                  borderRight:"1px solid rgba(255,255,255,.05)",
                  fontSize:11.5, fontWeight:700,
                  color:"rgba(255,255,255,.2)",
                  letterSpacing:".07em", textTransform:"uppercase", whiteSpace:"nowrap",
                  display:"flex", alignItems:"center", gap:8,
                }}>
                  <span style={{ width:4, height:4, borderRadius:"50%", background:"#34d399", flexShrink:0 }}/>
                  {t}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── SECURITY PILLARS ── */}
        {PILLARS.map((p,i) => <PillarSection key={p.id} p={p} index={i}/>)}

        {/* ── RESPONSIBLE DISCLOSURE ── */}
        <section style={{ padding:"80px 24px", borderTop:"1px solid rgba(255,255,255,.05)" }}>
          <div style={{ maxWidth:760, margin:"0 auto", textAlign:"center" }}>
            <div style={{
              borderRadius:24, padding:"48px 40px",
              background:"rgba(255,255,255,.03)",
              border:"1.5px solid rgba(255,255,255,.08)",
              backdropFilter:"blur(20px)",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", top:0, left:"20%", right:"20%", height:1,
                background:"linear-gradient(90deg,transparent,rgba(129,140,248,.5),transparent)" }}/>
              <div style={{ fontSize:40, marginBottom:20 }}>🤝</div>
              <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(22px,3vw,30px)", fontWeight:700, color:"white", letterSpacing:"-.5px", lineHeight:1.2, marginBottom:12 }}>
                Responsible Disclosure
              </h2>
              <p style={{ fontSize:14.5, color:"rgba(255,255,255,.42)", lineHeight:1.8, marginBottom:24 }}>
                We take all security reports seriously. If you&apos;ve discovered a vulnerability in FinovaOS, please report it directly to our security team. We commit to acknowledging your report within 48 hours and resolving critical issues within 14 days.
              </p>
              <a href="mailto:finovaos.app@gmail.com" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"12px 24px", borderRadius:12,
                background:"rgba(129,140,248,.12)", border:"1.5px solid rgba(129,140,248,.3)",
                color:"#a5b4fc", fontWeight:700, fontSize:14,
                textDecoration:"none", transition:"all .25s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(129,140,248,.2)";e.currentTarget.style.borderColor="rgba(129,140,248,.5)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(129,140,248,.12)";e.currentTarget.style.borderColor="rgba(129,140,248,.3)";}}
              >
                📧 finovaos.app@gmail.com
              </a>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ padding:"40px 24px 80px", maxWidth:1100, margin:"0 auto" }}>
          <div ref={ctaRef} style={{
            borderRadius:28, overflow:"hidden", position:"relative",
            background:"linear-gradient(135deg,#2d2b6b 0%,#1e1b55 35%,#1a1848 70%,#231548 100%)",
            padding:"64px 48px", textAlign:"center",
            boxShadow:"0 32px 80px rgba(99,102,241,.35)",
            border:"1px solid rgba(165,180,252,.2)",
            opacity:ctaVisible?1:0, transform:ctaVisible?"translateY(0)":"translateY(20px)",
            transition:"all .7s ease",
          }}>
            <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%",
              border:"1px solid rgba(165,180,252,.07)",
              top:"50%", left:"50%", transform:"translate(-50%,-50%)",
              animation:"rotateSlow 30s linear infinite", pointerEvents:"none" }}>
              <div style={{ position:"absolute", top:-4, left:"50%", width:8, height:8, borderRadius:"50%",
                background:"#818cf8", marginLeft:-4, boxShadow:"0 0 12px rgba(129,140,248,.8)" }}/>
            </div>
            <div style={{ position:"relative" }}>
              <div style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"6px 16px", borderRadius:24,
                background:"rgba(52,211,153,.12)", border:"1.5px solid rgba(52,211,153,.3)",
                fontSize:11, fontWeight:800, color:"#6ee7b7",
                letterSpacing:".09em", textTransform:"uppercase", marginBottom:20,
                animation:"floatBadge 3s ease-in-out infinite",
              }}>
                🔒 Your data is always protected
              </div>
              <h2 style={{
                fontFamily:"'Lora',serif", fontSize:"clamp(28px,4.5vw,48px)",
                fontWeight:700, color:"white", letterSpacing:"-1.2px", lineHeight:1.12, marginBottom:14,
              }}>
                Secure accounting,
                <span style={{ display:"block", fontStyle:"italic",
                  background:"linear-gradient(135deg,#a5b4fc,#818cf8)",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  peace of mind.
                </span>
              </h2>
              <p style={{ fontSize:15.5, color:"rgba(255,255,255,.45)", marginBottom:36, maxWidth:460, margin:"0 auto 36px", lineHeight:1.8 }}>
                Flexible plans. Full platform access. No credit card required.
              </p>
              <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
                <Link href="/website-signup" style={{
                  padding:"14px 36px", borderRadius:14,
                  background:"linear-gradient(135deg,#fbbf24,#f59e0b)",
                  color:"#0f172a", fontWeight:800, fontSize:15,
                  textDecoration:"none", display:"inline-flex", alignItems:"center", gap:8,
                  boxShadow:"0 6px 24px rgba(251,191,36,.4)", transition:"all .25s",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 32px rgba(251,191,36,.55)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 6px 24px rgba(251,191,36,.4)";}}
                >
                  Get Started →
                </Link>
                <Link href="/support" style={{
                  padding:"13px 28px", borderRadius:14,
                  border:"1.5px solid rgba(255,255,255,.2)",
                  background:"rgba(255,255,255,.06)",
                  color:"rgba(255,255,255,.75)", fontWeight:700, fontSize:15,
                  textDecoration:"none", display:"inline-flex", alignItems:"center", gap:8, transition:"all .25s",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.4)";e.currentTarget.style.color="white";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.2)";e.currentTarget.style.color="rgba(255,255,255,.75)";}}
                >
                  Talk to Sales
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer links */}
        <div style={{ paddingBottom:48, display:"flex", flexDirection:"column", alignItems:"center", gap:32 }}>
          <Link href="/trust" style={{ fontSize:13, fontWeight:700, color:"#34d399", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6 }}>
            🛡️ View our full Trust & Compliance center →
          </Link>
          <div style={{ display:"flex", justifyContent:"center", gap:28, flexWrap:"wrap" }}>
            {["Privacy Policy","Terms of Use","Features","Pricing","Help Center"].map(t=>(
              <a key={t} href="#" style={{ fontSize:12, color:"rgba(255,255,255,.2)", textDecoration:"none", fontWeight:500, transition:"color .2s" }}
                onMouseEnter={e=>(e.currentTarget.style.color="rgba(255,255,255,.6)")}
                onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.2)")}>
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
