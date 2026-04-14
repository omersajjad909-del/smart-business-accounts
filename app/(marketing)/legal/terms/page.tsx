"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LAST_UPDATED = "14 April 2026";
const EMAIL = "finovaos.app@gmail.com";

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
        sub: "Agreement",
        body: "By accessing or using FinovaOS, you agree to be bound by these Terms, Privacy Policy, and Billing Policy. If you do not agree, you may not use the platform.",
      },
    ],
  },
  {
    id: "description",
    icon: "🧩",
    color: "#34d399",
    dim: "rgba(52,211,153,.08)",
    border: "rgba(52,211,153,.25)",
    title: "Description of Service",
    content: [
      {
        sub: "What FinovaOS Is",
        body: "FinovaOS is a cloud-based business software platform that provides accounting, financial management, reporting, and business tools. FinovaOS is software only and does not provide financial, legal, or tax advice.",
      },
    ],
  },
  {
    id: "accounts",
    icon: "👤",
    color: "#a78bfa",
    dim: "rgba(167,139,250,.08)",
    border: "rgba(167,139,250,.25)",
    title: "User Accounts",
    content: [
      {
        sub: "Your Responsibilities",
        body: "You are responsible for maintaining the confidentiality of your account and password. You are responsible for all activities that occur under your account. You must provide accurate and complete information.",
      },
    ],
  },
  {
    id: "data-ownership",
    icon: "🗂️",
    color: "#06b6d4",
    dim: "rgba(6,182,212,.08)",
    border: "rgba(6,182,212,.25)",
    title: "Data Ownership",
    content: [
      {
        sub: "Your Data Belongs to You",
        body: "All data you enter into FinovaOS remains your property. We do not own your business data. You grant us permission to store, process, and display your data only for the purpose of providing the service.",
      },
    ],
  },
  {
    id: "privacy",
    icon: "🔏",
    color: "#818cf8",
    dim: "rgba(129,140,248,.08)",
    border: "rgba(129,140,248,.25)",
    title: "Privacy & Data Collection",
    content: [
      {
        sub: "What We Collect",
        body: "We may collect: name, email, phone number, company details; financial and accounting data entered by you; usage data such as IP address, browser, and device; support communications.",
      },
      {
        sub: "How We Use It",
        body: "We use this data to: provide and maintain the service; improve the platform; prevent fraud and unauthorized access; comply with legal obligations. We never sell your data to advertisers or third parties.",
      },
      {
        sub: "Data Storage & Payments",
        body: "Your data may be stored on secure cloud servers located in different countries. Payments are processed by third-party payment providers such as LemonSqueezy, PayPal, and others. We do not store your full card details.",
      },
    ],
  },
  {
    id: "security",
    icon: "🔒",
    color: "#34d399",
    dim: "rgba(52,211,153,.08)",
    border: "rgba(52,211,153,.25)",
    title: "Security",
    content: [
      {
        sub: "Data Protection",
        body: "All data is encrypted in transit and at rest. We use secure cloud infrastructure, backups, and access controls to protect your data. However, no system is 100% secure and you use the platform at your own risk.",
      },
    ],
  },
  {
    id: "billing",
    icon: "💳",
    color: "#fbbf24",
    dim: "rgba(251,191,36,.08)",
    border: "rgba(251,191,36,.25)",
    title: "Subscription & Billing",
    content: [
      {
        sub: "Plans & Auto-Renewal",
        body: "FinovaOS operates on a subscription basis with monthly and yearly plans. Subscriptions renew automatically unless cancelled. You authorize us to charge your payment method on file for recurring subscription fees.",
      },
      {
        sub: "Failed Payments",
        body: "If payment fails: after 7 days your account may become read-only; after 30 days your account may be suspended. We may change pricing with prior notice before the next billing cycle.",
      },
    ],
  },
  {
    id: "refund",
    icon: "↩️",
    color: "#f97316",
    dim: "rgba(249,115,22,.08)",
    border: "rgba(249,115,22,.25)",
    title: "Refund Policy",
    content: [
      {
        sub: "Eligibility",
        body: "Monthly subscriptions are non-refundable. Yearly subscriptions are refundable within 14 days of first payment. Refund requests must be sent to finovaos.app@gmail.com and are processed within 7–14 business days.",
      },
    ],
  },
  {
    id: "acceptable-use",
    icon: "📌",
    color: "#f87171",
    dim: "rgba(248,113,113,.08)",
    border: "rgba(248,113,113,.25)",
    title: "Acceptable Use",
    content: [
      {
        sub: "Prohibited Activities",
        body: "You agree NOT to use FinovaOS for: fraud, money laundering, illegal business, hacking or unauthorized access, uploading illegal content, attempting to reverse engineer the software, or reselling the service without permission. We reserve the right to suspend accounts that violate these rules.",
      },
    ],
  },
  {
    id: "liability",
    icon: "⚖️",
    color: "#818cf8",
    dim: "rgba(129,140,248,.08)",
    border: "rgba(129,140,248,.25)",
    title: "Limitation of Liability",
    content: [
      {
        sub: "As-Is Service",
        body: "FinovaOS is provided \"as is\". We are not responsible for: financial losses, tax errors, accounting mistakes, business decisions made using our software, data loss, or service interruptions. Our total liability shall not exceed the amount you paid in the last 3 months.",
      },
    ],
  },
  {
    id: "backup",
    icon: "💾",
    color: "#06b6d4",
    dim: "rgba(6,182,212,.08)",
    border: "rgba(6,182,212,.25)",
    title: "Data Backup & Responsibility",
    content: [
      {
        sub: "Backups",
        body: "We perform backups, but you are responsible for keeping your own copies of important financial data.",
      },
    ],
  },
  {
    id: "termination",
    icon: "🚪",
    color: "#f87171",
    dim: "rgba(248,113,113,.08)",
    border: "rgba(248,113,113,.25)",
    title: "Account Termination & Data Retention",
    content: [
      {
        sub: "Cancellation",
        body: "You may cancel your subscription at any time from your billing settings or by contacting support. Cancellation takes effect at the end of the current billing period. No partial refunds are issued for unused time on monthly plans.",
      },
      {
        sub: "Phase 1 — Read-Only Grace Period (Days 1–30)",
        body: "For the first 30 days after cancellation, your account switches to read-only mode. You can log in, view all your records, and export your data in CSV, Excel, or PDF format. No new data can be created or edited during this period.",
      },
      {
        sub: "Phase 2 — Account Locked (Days 31–90)",
        body: "From day 31 to day 90 after cancellation, your account is locked and login is disabled. Your data remains stored on our servers during this window. You may reactivate your subscription at any time during this period to restore full access instantly.",
      },
      {
        sub: "Phase 3 — Permanent Deletion (Day 90+)",
        body: "90 days after cancellation, all of your business data is permanently and irreversibly deleted from our servers. This includes all invoices, ledger entries, inventory records, payroll data, contacts, and reports. We will send an email reminder 14 days and 3 days before this deadline.",
      },
      {
        sub: "What We Retain After Deletion",
        body: "After permanent deletion, we retain only: (1) an anonymized audit log entry confirming the deletion event, and (2) basic billing records required by law (company name, plan, payment amounts). No financial, accounting, or personal business data is retained.",
      },
      {
        sub: "Reactivation Before Day 90",
        body: "If you reactivate your subscription before the 90-day deadline, all your data is immediately restored and your account returns to full active status. We strongly recommend exporting a backup during the 30-day grace period as a safety measure.",
      },
    ],
  },
  {
    id: "changes",
    icon: "📝",
    color: "#a78bfa",
    dim: "rgba(167,139,250,.08)",
    border: "rgba(167,139,250,.25)",
    title: "Changes to Terms",
    content: [
      {
        sub: "Updates",
        body: "We may update these terms from time to time. Continued use of the platform means you accept the updated terms.",
      },
    ],
  },
  {
    id: "contact",
    icon: "📧",
    color: "#34d399",
    dim: "rgba(52,211,153,.08)",
    border: "rgba(52,211,153,.25)",
    title: "Contact",
    content: [
      {
        sub: "Get in Touch",
        body: "For legal, billing, or privacy questions contact: finovaos.app@gmail.com — FinovaOS Technologies, Lahore, Pakistan.",
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
      padding:"40px 0",
      borderTop:"1px solid rgba(255,255,255,.06)",
      opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(20px)",
      transition:"all .6s cubic-bezier(.22,1,.36,1)",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
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
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <h2 style={{
            fontFamily:"'Lora',serif",
            fontSize:"clamp(17px,2.5vw,22px)",
            fontWeight:700, color:"white",
            letterSpacing:"-.4px", lineHeight:1.2, margin:0,
          }}>
            {s.title}
          </h2>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12, paddingLeft:58 }}>
        {s.content.map((c) => (
          <div key={c.sub} style={{
            padding:"16px 20px", borderRadius:14,
            background:"rgba(255,255,255,.03)",
            border:"1px solid rgba(255,255,255,.07)",
            borderLeft:`3px solid ${s.color}`,
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.055)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.03)"; }}
          >
            <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.45)", marginBottom:5, textTransform:"uppercase", letterSpacing:".06em" }}>{c.sub}</div>
            <div style={{ fontSize:13.5, color:"rgba(255,255,255,.55)", lineHeight:1.8 }}>{c.body}</div>
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
    }, { threshold: 0.35 });
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
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
        .toc-btn{
          display:flex;align-items:center;gap:9px;
          padding:7px 12px;border-radius:10px;
          font-size:11.5px;font-weight:600;
          color:rgba(255,255,255,.35);
          cursor:pointer;transition:all .2s;
          border:1px solid transparent;
          text-align:left;background:none;
          font-family:inherit;width:100%;
        }
        .toc-btn:hover{color:rgba(255,255,255,.7);background:rgba(255,255,255,.04);}
        .toc-btn.active{color:white;background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.3);}
        @media(max-width:1000px){
          .layout-grid{grid-template-columns:1fr!important;}
          .toc-sidebar{display:none!important;}
        }
      `}</style>

      {/* BG */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        <div style={{ position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)",
          backgroundSize:"48px 48px" }}/>
        <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(99,102,241,.1),transparent 65%)",
          top:-120, right:-80, animation:"orbDrift 14s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1,
          background:"linear-gradient(90deg,transparent,rgba(99,102,241,.4),transparent)" }}/>
      </div>

      <div style={{ position:"relative", zIndex:1 }}>
        {/* HERO */}
        <section style={{ padding:"80px 24px 48px", maxWidth:1100, margin:"0 auto" }}>
          <div ref={heroRef}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:28,
              opacity:heroVisible?1:0, transition:"opacity .5s" }}>
              <Link href="/" style={{ fontSize:12, color:"rgba(255,255,255,.28)", textDecoration:"none", fontWeight:500 }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.28)")}>
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
                  These terms govern your use of FinovaOS. By using the platform, you agree to these terms in full.
                </p>
              </div>

              {/* Summary card */}
              <div style={{
                borderRadius:20, padding:"24px 28px", minWidth:250,
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
                <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:14 }}>
                  Key Points
                </div>
                {[
                  { icon:"🔒", text:"Your data stays yours" },
                  { icon:"💳", text:"14-day refund on yearly plans" },
                  { icon:"📤", text:"Export data anytime" },
                  { icon:"🚫", text:"We never sell your data" },
                  { icon:"🇵🇰", text:"FinovaOS Technologies, Lahore" },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <span style={{ fontSize:15 }}>{icon}</span>
                    <span style={{ fontSize:12.5, color:"rgba(255,255,255,.6)", fontWeight:500 }}>{text}</span>
                  </div>
                ))}
                <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.22)", lineHeight:1.6 }}>
                    Questions? Contact us at<br/>
                    <a href={`mailto:${EMAIL}`} style={{ color:"#fbbf24", textDecoration:"none", fontWeight:600 }}>{EMAIL}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN LAYOUT */}
        <div className="layout-grid" style={{
          maxWidth:1100, margin:"0 auto", padding:"0 24px 80px",
          display:"grid", gridTemplateColumns:"220px 1fr", gap:48, alignItems:"start",
        }}>
          {/* Sticky TOC */}
          <aside className="toc-sidebar" style={{ position:"sticky", top:40 }}>
            <div style={{
              borderRadius:16, padding:"14px 10px",
              background:"rgba(255,255,255,.03)",
              border:"1px solid rgba(255,255,255,.07)",
              backdropFilter:"blur(16px)",
            }}>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.25)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:10, paddingLeft:12 }}>
                Contents
              </div>
              {SECTIONS.map(s => (
                <button key={s.id} className={`toc-btn${activeSection === s.id ? " active" : ""}`}
                  onClick={() => scrollTo(s.id)}>
                  <span style={{ fontSize:13 }}>{s.icon}</span>
                  <span style={{ lineHeight:1.3 }}>{s.title}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <div>
            {SECTIONS.map((s, i) => <Section key={s.id} s={s} index={i} />)}

            {/* Footer contact */}
            <div style={{
              marginTop:40, padding:"28px 32px", borderRadius:20,
              background:"rgba(255,255,255,.03)",
              border:"1.5px solid rgba(255,255,255,.08)",
              backdropFilter:"blur(16px)",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", top:0, left:"20%", right:"20%", height:1,
                background:"linear-gradient(90deg,transparent,rgba(251,191,36,.4),transparent)" }}/>
              <h3 style={{ fontFamily:"'Lora',serif", fontSize:18, fontWeight:700, color:"white", marginBottom:8 }}>
                Legal & Billing Questions?
              </h3>
              <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.8, marginBottom:16 }}>
                For any questions about these terms, billing, refunds, or privacy — contact us directly.
              </p>
              <a href={`mailto:${EMAIL}`} style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"10px 18px", borderRadius:12,
                background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.25)",
                color:"#fde68a", textDecoration:"none", fontSize:13, fontWeight:600,
                marginBottom:18,
              }}>
                📧 {EMAIL}
              </a>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <Link href="/legal/privacy" style={{
                  display:"inline-flex", alignItems:"center", gap:7,
                  padding:"9px 16px", borderRadius:10,
                  background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
                  color:"rgba(255,255,255,.55)", fontWeight:600, fontSize:13, textDecoration:"none",
                }}>
                  🔏 Privacy Policy →
                </Link>
                <Link href="/security" style={{
                  display:"inline-flex", alignItems:"center", gap:7,
                  padding:"9px 16px", borderRadius:10,
                  background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
                  color:"rgba(255,255,255,.55)", fontWeight:600, fontSize:13, textDecoration:"none",
                }}>
                  🔒 Security →
                </Link>
              </div>
            </div>

            <div style={{ marginTop:20, padding:"14px 18px", borderRadius:12,
              background:"rgba(251,191,36,.05)", border:"1px solid rgba(251,191,36,.15)" }}>
              <p style={{ fontSize:12, color:"rgba(255,255,255,.3)", lineHeight:1.7, margin:0 }}>
                <span style={{ fontWeight:700, color:"rgba(251,191,36,.6)" }}>Note: </span>
                This document should be reviewed by a qualified legal professional licensed in your jurisdiction before the platform goes live in production.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
