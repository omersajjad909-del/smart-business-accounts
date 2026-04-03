"use client";
import Link from "next/link";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";

const LAST_UPDATED = "1 March 2025";
const COMPANY = "Finova";
const EMAIL = "finovaos.app@gmail.com";
const ADDRESS = "Global Operations";

const SECTIONS = [
  {
    id: "acceptance",
    icon: "✅",
    color: "#818cf8",
    dim: "rgba(129,140,248,.08)",
    border: "rgba(129,140,248,.25)",
    title: "Acceptance of Terms",
    content: [
      {
        sub: "Agreement to Terms",
        body: "By accessing or using Finova, you confirm that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, you may not use the platform.",
      },
      {
        sub: "Eligibility",
        body: "You must be at least 18 years old and legally capable of entering into contracts under applicable law to use this platform. By using the service, you represent that you meet these requirements.",
      },
      {
        sub: "Business Use",
        body: "Finova is designed for business use. By registering, you represent that you are using the platform for lawful business purposes and not for personal, household, or consumer use.",
      },
    ],
  },
  {
    id: "account",
    icon: "👤",
    color: "#34d399",
    dim: "rgba(52,211,153,.08)",
    border: "rgba(52,211,153,.25)",
    title: "Account Registration & Responsibilities",
    content: [
      {
        sub: "Account Creation",
        body: "You must provide accurate, current, and complete information when creating your account. You are responsible for maintaining the accuracy of your account information at all times.",
      },
      {
        sub: "Account Security",
        body: "You are solely responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorized access.",
      },
      {
        sub: "Multiple Users",
        body: "If you grant access to other users (employees, accountants, managers), you are fully responsible for their use of the platform and ensuring they comply with these terms.",
      },
      {
        sub: "Account Suspension",
        body: "We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or pose a risk to the security or integrity of the platform.",
      },
    ],
  },
  {
    id: "subscription",
    icon: "💳",
    color: "#fbbf24",
    dim: "rgba(251,191,36,.08)",
    border: "rgba(251,191,36,.25)",
    title: "Subscription, Billing & Payments",
    content: [
      {
        sub: "Subscription Plans",
        body: "Finova is offered on subscription plans (Starter, Professional, Enterprise) with monthly and annual billing cycles. Plan features and pricing are described on our pricing page.",
      },
      {
        sub: "Billing & Auto-Renewal",
        body: "Subscriptions renew automatically at the end of each billing period. You authorize us to charge your payment method on file. We will provide advance notice before any price changes take effect.",
      },
      {
        sub: "Refunds",
        body: "Annual subscriptions cancelled within 14 days of initial payment are eligible for a full refund. Monthly subscriptions are non-refundable once the billing period has commenced.",
      },
      {
        sub: "Failed Payments",
        body: "If payment fails, we will retry the charge. After 7 days of failed payment, your account will be downgraded to read-only access. After 30 days, the account may be suspended.",
      },
      {
        sub: "Taxes",
        body: "All prices are exclusive of applicable taxes. Where required, taxes will be added to your invoice as required by law.",
      },
    ],
  },
  {
    id: "acceptable-use",
    icon: "📌",
    color: "#f87171",
    dim: "rgba(248,113,113,.08)",
    border: "rgba(248,113,113,.25)",
    title: "Acceptable Use Policy",
    content: [
      {
        sub: "Permitted Use",
        body: "You may use Finova only for lawful business accounting, inventory management, and related financial operations in accordance with applicable law.",
      },
      {
        sub: "Prohibited Activities",
        body: "You must not use the platform to: process fraudulent transactions, engage in money laundering, evade taxes, store illegal content, attempt unauthorized access to other accounts, reverse-engineer the software, or resell the service without written authorization.",
      },
      {
        sub: "Data Integrity",
        body: "You must not intentionally enter false, misleading, or fraudulent financial data into the platform. We reserve the right to cooperate with regulatory and law enforcement authorities if illegal activity is suspected.",
      },
      {
        sub: "Fair Use",
        body: "Automated bulk data extraction, API abuse, or use that places excessive load on our infrastructure may result in rate limiting or account suspension.",
      },
    ],
  },
  {
    id: "data-ownership",
    icon: "🗂️",
    color: "#a78bfa",
    dim: "rgba(167,139,250,.08)",
    border: "rgba(167,139,250,.25)",
    title: "Data Ownership & Intellectual Property",
    content: [
      {
        sub: "Your Data",
        body: "All financial data, records, reports, and business information you enter into Finova remains your property. We do not claim ownership of your data.",
      },
      {
        sub: "License to Us",
        body: "You grant us a limited, non-exclusive license to store, process, and display your data solely for the purpose of providing the service to you. We will never use your data for any other purpose.",
      },
      {
        sub: "Our Intellectual Property",
        body: "Finova, its software, design, trademarks, and documentation are the exclusive property of Finova SME Solutions. You receive a limited, non-transferable license to use the platform during your subscription period.",
      },
      {
        sub: "Feedback",
        body: "Any suggestions or feedback you provide about the platform may be used by us to improve the service without any obligation to compensate you.",
      },
    ],
  },
  {
    id: "availability",
    icon: "⚡",
    color: "#06b6d4",
    dim: "rgba(6,182,212,.08)",
    border: "rgba(6,182,212,.25)",
    title: "Service Availability & Modifications",
    content: [
      {
        sub: "Uptime Commitment",
        body: "We target 99.9% monthly uptime for the platform. Planned maintenance windows will be communicated in advance with at least 48 hours notice where possible.",
      },
      {
        sub: "Service Changes",
        body: "We reserve the right to modify, update, or discontinue features of the platform at any time. Material changes that affect core functionality will be communicated with advance notice.",
      },
      {
        sub: "Third-Party Integrations",
        body: "Integrations with third-party services (banks, payment gateways, government portals) are subject to those parties' terms and availability. We are not liable for disruptions caused by third parties.",
      },
    ],
  },
  {
    id: "limitation",
    icon: "⚖️",
    color: "#818cf8",
    dim: "rgba(129,140,248,.08)",
    border: "rgba(129,140,248,.25)",
    title: "Limitation of Liability & Disclaimer",
    content: [
      {
        sub: "Service Provided As-Is",
        body: "Finova is provided on an \"as-is\" and \"as-available\" basis. We make no warranties, express or implied, regarding the accuracy, reliability, or fitness for a particular purpose of the service.",
      },
      {
        sub: "Not Professional Advice",
        body: "The platform is an accounting tool. It does not constitute tax advice, legal advice, or professional financial advice. You should consult qualified professionals for such matters.",
      },
      {
        sub: "Limitation of Liability",
        body: "To the maximum extent permitted by applicable law, our total liability for any claim arising from your use of the platform shall not exceed the subscription fees paid by you in the 3 months preceding the claim.",
      },
      {
        sub: "Indirect Damages",
        body: "We shall not be liable for any indirect, incidental, consequential, or punitive damages, including loss of profits, data loss, or business interruption, even if we have been advised of the possibility of such damages.",
      },
    ],
  },
  {
    id: "termination",
    icon: "🚪",
    color: "#f87171",
    dim: "rgba(248,113,113,.08)",
    border: "rgba(248,113,113,.25)",
    title: "Termination",
    content: [
      {
        sub: "Cancellation by You",
        body: "You may cancel your subscription at any time through account settings or by contacting support. Cancellation takes effect at the end of the current billing period. Your data will be accessible in read-only mode for 30 days after cancellation.",
      },
      {
        sub: "Termination by Us",
        body: "We may terminate your account immediately for material violations of these terms, non-payment, or activity that endangers the platform or other users.",
      },
      {
        sub: "Data After Termination",
        body: "After account termination, you may request a full data export within 30 days. After this period, your data will be permanently deleted from our systems.",
      },
    ],
  },
  {
    id: "governing-law",
    icon: "🏛️",
    color: "#34d399",
    dim: "rgba(52,211,153,.08)",
    border: "rgba(52,211,153,.25)",
    title: "Governing Law & Disputes",
    content: [
      {
        sub: "Governing Law",
        body: "These Terms of Service are governed by and construed in accordance with the laws applicable to the service provider’s principal place of business, without regard to conflict of law principles.",
      },
      {
        sub: "Dispute Resolution",
        body: "Any disputes arising from these terms or your use of the platform shall first be attempted to be resolved through good-faith negotiation. If unresolved, disputes shall be submitted to courts of competent jurisdiction.",
      },
      {
        sub: "Changes to Terms",
        body: "We may update these terms from time to time. Material changes will be communicated via email and in-app notification at least 14 days before taking effect. Continued use after the effective date constitutes acceptance.",
      },
    ],
  },
];

function useVisible(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, v] as const;
}

function Section({ s, index }: { s: typeof SECTIONS[0]; index: number }) {
  const [ref, visible] = useVisible();
  return (
    <div ref={ref} id={s.id} style={{
      padding:"48px 0",
      borderTop:"1px solid rgba(255,255,255,.06)",
      opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(20px)",
      transition:"all .6s cubic-bezier(.22,1,.36,1)",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:28 }}>
        <div style={{
          width:44, height:44, borderRadius:13, flexShrink:0,
          background:s.dim, border:`1.5px solid ${s.border}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22,
        }}>
          {s.icon}
        </div>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
            <div style={{ width:20, height:2, borderRadius:1, background:s.color }}/>
            <span style={{ fontSize:10, fontWeight:700, color:s.color, letterSpacing:".1em", textTransform:"uppercase" }}>
              Clause {String(index+1).padStart(2,"0")}
            </span>
          </div>
          <h2 style={{
            fontFamily:"'Lora',serif",
            fontSize:"clamp(18px,2.5vw,24px)",
            fontWeight:700, color:"white",
            letterSpacing:"-.4px", lineHeight:1.2, margin:0,
          }}>
            {s.title}
          </h2>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:14, paddingLeft:58 }}>
        {s.content.map((c) => (
          <div key={c.sub} style={{
            padding:"18px 20px", borderRadius:14,
            background:"rgba(255,255,255,.03)",
            border:"1px solid rgba(255,255,255,.07)",
            borderLeft:`3px solid ${s.color}`,
            transition:"background .25s",
          }}
            onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background="rgba(255,255,255,.055)";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background="rgba(255,255,255,.03)";}}
          >
            <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.85)", marginBottom:6 }}>{c.sub}</div>
            <div style={{ fontSize:13.5, color:"rgba(255,255,255,.42)", lineHeight:1.8 }}>{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TermsPage() {
  const [heroRef, heroVisible] = useVisible(0.2);
  const [activeSection, setActiveSection] = useState("acceptance");

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
    }, { threshold:0.35 });
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });

  return (
    <>
      <Head>
        <title>Terms of Service – Finova</title>
        <meta name="description" content="Terms and conditions for using Finova — the accounting platform for modern SMEs."/>
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
          .toc-item{
            display:flex;align-items:center;gap:9px;
            padding:8px 12px;border-radius:10px;
            font-size:12px;font-weight:600;
            color:rgba(255,255,255,.35);
            cursor:pointer;transition:all .2s;
            border:1px solid transparent;
            text-align:left;background:none;
            font-family:inherit;width:100%;
          }
          .toc-item:hover{color:rgba(255,255,255,.7);background:rgba(255,255,255,.04);}
          .toc-item.active{color:white;background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.3);}
          @media(max-width:1000px){
            .layout-grid{grid-template-columns:1fr!important;}
            .toc-sidebar{display:none!important;}
          }
        `}</style>

        {/* Fixed BG */}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
          <div style={{ position:"absolute", inset:0,
            backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)",
            backgroundSize:"48px 48px" }}/>
          <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%",
            background:"radial-gradient(circle,rgba(99,102,241,.1),transparent 65%)",
            top:-120, right:-80, animation:"orbDrift 14s ease-in-out infinite" }}/>
          <div style={{ position:"absolute", width:340, height:340, borderRadius:"50%",
            background:"radial-gradient(circle,rgba(251,191,36,.05),transparent 65%)",
            bottom:100, left:-60, animation:"orbDrift 20s ease-in-out infinite reverse" }}/>
          <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1,
            background:"linear-gradient(90deg,transparent,rgba(99,102,241,.4),transparent)" }}/>
        </div>

        <div style={{ position:"relative", zIndex:1 }}>
          {/* ── HERO ── */}
          <section style={{ padding:"80px 24px 48px", maxWidth:1100, margin:"0 auto" }}>
            <div ref={heroRef}>
              {/* Breadcrumb */}
              <div style={{
                display:"flex", alignItems:"center", gap:6, marginBottom:28, flexWrap:"wrap",
                opacity:heroVisible?1:0, transition:"opacity .5s ease",
              }}>
                <Link href="/" style={{ fontSize:12, color:"rgba(255,255,255,.28)", textDecoration:"none", fontWeight:500, transition:"color .2s" }}
                  onMouseEnter={e=>(e.currentTarget.style.color="rgba(255,255,255,.6)")}
                  onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.28)")}>
                  Home
                </Link>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span style={{ fontSize:12, color:"rgba(255,255,255,.45)", fontWeight:500 }}>Terms of Service</span>
              </div>

              <div style={{ display:"flex", alignItems:"flex-start", gap:20, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:280 }}>
                  <div style={{
                    display:"inline-flex", alignItems:"center", gap:7,
                    padding:"5px 14px", borderRadius:22,
                    background:"rgba(251,191,36,.1)", border:"1.5px solid rgba(251,191,36,.28)",
                    fontSize:10.5, fontWeight:700, color:"#fde68a",
                    letterSpacing:".09em", textTransform:"uppercase", marginBottom:18,
                    opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(12px)",
                    transition:"all .5s ease .06s",
                  }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:"#fbbf24", animation:"blink 2s ease infinite" }}/>
                    Legal Document · Last Updated {LAST_UPDATED}
                  </div>

                  <h1 style={{
                    fontFamily:"'Lora',serif",
                    fontSize:"clamp(32px,4.5vw,52px)",
                    fontWeight:700, color:"white",
                    letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:14,
                    opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(16px)",
                    transition:"all .6s ease .1s",
                  }}>
                    Terms of Service
                    <span style={{ display:"block", fontStyle:"italic",
                      background:"linear-gradient(135deg,#fde68a,#fbbf24)",
                      WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                      fontSize:"80%" }}>
                      Fair, transparent, clear.
                    </span>
                  </h1>

                  <p style={{
                    fontSize:15, color:"rgba(255,255,255,.4)", lineHeight:1.8, maxWidth:560,
                    opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(12px)",
                    transition:"all .6s ease .16s",
                  }}>
                    These terms govern your use of {COMPANY}. Please read them carefully. By using the platform, you agree to these terms in full.
                  </p>
                </div>

                {/* Summary card */}
                <div style={{
                  borderRadius:20, padding:"24px 28px", minWidth:260,
                  background:"rgba(255,255,255,.04)",
                  border:"1.5px solid rgba(255,255,255,.09)",
                  backdropFilter:"blur(20px)",
                  boxShadow:"0 16px 48px rgba(0,0,0,.3)",
                  opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(16px)",
                  transition:"all .6s ease .22s",
                  position:"relative", overflow:"hidden",
                }}>
                  <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1,
                    background:"linear-gradient(90deg,transparent,rgba(251,191,36,.5),transparent)" }}/>
                  <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:16 }}>
                    Key Points
                  </div>
                  {[
                    { icon:"🔒", text:"Your data stays yours" },
                    { icon:"💳", text:"14-day refund on annual plans" },
                    { icon:"📤", text:"Export data anytime" },
                    { icon:"🌍", text:"Compliant with applicable laws" },
                    { icon:"⚖️", text:"Disputes handled by competent courts" },
                  ].map(({ icon, text }) => (
                    <div key={text} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <span style={{ fontSize:15 }}>{icon}</span>
                      <span style={{ fontSize:12.5, color:"rgba(255,255,255,.6)", fontWeight:500 }}>{text}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.22)", lineHeight:1.6 }}>
                      Legal questions? Contact us at<br/>
                      <a href={`mailto:${EMAIL}`} style={{ color:"#fbbf24", textDecoration:"none", fontWeight:600 }}>{EMAIL}</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── MAIN LAYOUT ── */}
          <div className="layout-grid" style={{
            maxWidth:1100, margin:"0 auto", padding:"0 24px 80px",
            display:"grid", gridTemplateColumns:"220px 1fr", gap:48, alignItems:"start",
          }}>
            {/* Sticky TOC */}
            <aside className="toc-sidebar" style={{ position:"sticky", top:40 }}>
              <div style={{
                borderRadius:16, padding:"16px 12px",
                background:"rgba(255,255,255,.03)",
                border:"1px solid rgba(255,255,255,.07)",
                backdropFilter:"blur(16px)",
              }}>
                <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.25)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:12, paddingLeft:12 }}>
                  Contents
                </div>
                {SECTIONS.map(s => (
                  <button key={s.id} className={`toc-item${activeSection===s.id?" active":""}`}
                    onClick={()=>scrollTo(s.id)}>
                    <span style={{ fontSize:14 }}>{s.icon}</span>
                    <span style={{ lineHeight:1.3 }}>{s.title}</span>
                  </button>
                ))}
              </div>
            </aside>

            {/* Content */}
            <div>
              {SECTIONS.map((s,i) => <Section key={s.id} s={s} index={i}/>)}

              {/* Contact block */}
              <div style={{
                marginTop:48, padding:"32px 36px", borderRadius:20,
                background:"rgba(255,255,255,.03)",
                border:"1.5px solid rgba(255,255,255,.08)",
                backdropFilter:"blur(16px)",
                position:"relative", overflow:"hidden",
              }}>
                <div style={{ position:"absolute", top:0, left:"20%", right:"20%", height:1,
                  background:"linear-gradient(90deg,transparent,rgba(251,191,36,.4),transparent)" }}/>
                <div style={{ fontSize:22, marginBottom:14 }}>⚖️</div>
                <h3 style={{ fontFamily:"'Lora',serif", fontSize:20, fontWeight:700, color:"white", marginBottom:8 }}>
                  Legal Questions?
                </h3>
                <p style={{ fontSize:13.5, color:"rgba(255,255,255,.4)", lineHeight:1.8, marginBottom:20 }}>
                  If you have questions about these terms or need clarification on any clause, please contact our legal team directly.
                </p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
                  {[
                    { icon:"📧", label:"Legal Email", val:EMAIL, href:`mailto:${EMAIL}` },
                    { icon:"📍", label:"Jurisdiction", val:ADDRESS, href:"#" },
                  ].map(({ icon, label, val, href }) => (
                    <a key={label} href={href} style={{
                      display:"inline-flex", alignItems:"center", gap:10,
                      padding:"10px 16px", borderRadius:12,
                      background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.25)",
                      color:"#fde68a", textDecoration:"none", fontSize:13, fontWeight:600,
                      transition:"all .22s",
                    }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="rgba(251,191,36,.15)";}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="rgba(251,191,36,.08)";}}
                    >
                      <span>{icon}</span>
                      <div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", fontWeight:500, textTransform:"uppercase", letterSpacing:".07em", marginBottom:1 }}>{label}</div>
                        {val}
                      </div>
                    </a>
                  ))}
                </div>

                <div style={{ marginTop:24, display:"flex", gap:12, flexWrap:"wrap" }}>
                  <Link href="/legal/privacy" style={{
                    display:"inline-flex", alignItems:"center", gap:7,
                    padding:"9px 18px", borderRadius:10,
                    background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
                    color:"rgba(255,255,255,.55)", fontWeight:600, fontSize:13,
                    textDecoration:"none", transition:"all .22s",
                  }}
                    onMouseEnter={e=>{e.currentTarget.style.color="white";e.currentTarget.style.borderColor="rgba(255,255,255,.25)";}}
                    onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,.55)";e.currentTarget.style.borderColor="rgba(255,255,255,.1)";}}
                  >
                    🔏 Privacy Policy →
                  </Link>
                  <Link href="/security" style={{
                    display:"inline-flex", alignItems:"center", gap:7,
                    padding:"9px 18px", borderRadius:10,
                    background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
                    color:"rgba(255,255,255,.55)", fontWeight:600, fontSize:13,
                    textDecoration:"none", transition:"all .22s",
                  }}
                    onMouseEnter={e=>{e.currentTarget.style.color="white";e.currentTarget.style.borderColor="rgba(255,255,255,.25)";}}
                    onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,.55)";e.currentTarget.style.borderColor="rgba(255,255,255,.1)";}}
                  >
                    🔒 Security Policy →
                  </Link>
                </div>
              </div>

              {/* Legal disclaimer */}
              <div style={{ marginTop:24, padding:"16px 20px", borderRadius:12,
                background:"rgba(251,191,36,.05)", border:"1px solid rgba(251,191,36,.15)" }}>
                <p style={{ fontSize:12.5, color:"rgba(255,255,255,.35)", lineHeight:1.7, margin:0 }}>
                  <span style={{ fontWeight:700, color:"rgba(251,191,36,.7)" }}>Note: </span>
                  This is a placeholder terms of service document. It should be reviewed and finalized by a qualified legal professional licensed to practice in your jurisdiction before the platform goes live in production.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
