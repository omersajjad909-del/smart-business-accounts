"use client";
import Link from "next/link";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";

const LAST_UPDATED = "14 April 2026";
const COMPANY = "FinovaOS";
const EMAIL = "finovaos.app@gmail.com";
const ADDRESS = "Global Operations";

const SECTIONS = [
  {
    id: "information-we-collect",
    icon: "📋",
    color: "#818cf8",
    dim: "rgba(129,140,248,.08)",
    border: "rgba(129,140,248,.25)",
    title: "Information We Collect",
    content: [
      {
        sub: "Account & Identity Data",
        body: "When you register, we collect your name, email address, phone number, company name, and business type. This information is necessary to create and manage your account.",
      },
      {
        sub: "Financial & Business Data",
        body: "All accounting records, invoices, ledger entries, inventory data, payroll records, and financial reports you enter into the platform are stored securely and are owned entirely by you.",
      },
      {
        sub: "Usage & Technical Data",
        body: "We collect IP addresses, browser type, device identifiers, pages visited, and session timestamps to operate the platform, detect fraud, and improve performance. This data is never sold.",
      },
      {
        sub: "Communications",
        body: "If you contact our support team, we retain those communications to provide assistance and improve our service quality.",
      },
    ],
  },
  {
    id: "how-we-use",
    icon: "⚙️",
    color: "#34d399",
    dim: "rgba(52,211,153,.08)",
    border: "rgba(52,211,153,.25)",
    title: "How We Use Your Information",
    content: [
      {
        sub: "Service Delivery",
        body: "Your data is used solely to operate FinovaOS — to process transactions, generate reports, send notifications, and maintain your account.",
      },
      {
        sub: "Security & Fraud Prevention",
        body: "We analyze usage patterns to detect unauthorized access, suspicious activity, and potential abuse of the platform.",
      },
      {
        sub: "Product Improvement",
        body: "Aggregated, anonymized usage statistics help us understand how features are used and where to invest development effort. Individual records are never used for this purpose.",
      },
      {
        sub: "Legal Compliance",
        body: "We may process your data when required to comply with applicable laws, court orders, or regulatory obligations.",
      },
    ],
  },
  {
    id: "data-sharing",
    icon: "🔗",
    color: "#fbbf24",
    dim: "rgba(251,191,36,.08)",
    border: "rgba(251,191,36,.25)",
    title: "Data Sharing & Third Parties",
    content: [
      {
        sub: "We Never Sell Your Data",
        body: "Your financial data, customer lists, and business records are never sold, licensed, or shared with advertisers or data brokers. Period.",
      },
      {
        sub: "Service Providers",
        body: "We engage trusted infrastructure providers (cloud hosting, email delivery, payment processing) under strict data processing agreements. They may only process your data as directed by us.",
      },
      {
        sub: "Legal Requirements",
        body: "We may disclose data if compelled by valid legal process, court order, or to protect the rights, property, or safety of our users and the platform.",
      },
      {
        sub: "Business Transfers",
        body: "In the event of a merger or acquisition, your data may be transferred to the successor entity, which will be bound by this privacy policy.",
      },
    ],
  },
  {
    id: "data-security",
    icon: "🔒",
    color: "#a78bfa",
    dim: "rgba(167,139,250,.08)",
    border: "rgba(167,139,250,.25)",
    title: "Data Security",
    content: [
      {
        sub: "Encryption",
        body: "All data in transit is protected by TLS 1.3. All data at rest is encrypted using AES-256. Encryption keys are stored separately from the data they protect.",
      },
      {
        sub: "Access Controls",
        body: "We enforce role-based access controls internally. Only authorized personnel can access production systems, and all access is logged and audited.",
      },
      {
        sub: "Infrastructure",
        body: "Our platform runs on enterprise-grade cloud infrastructure with redundant availability zones, daily automated backups, and 24/7 monitoring.",
      },
      {
        sub: "Incident Response",
        body: "In the event of a data breach affecting your information, we will notify you within 72 hours of discovery, as required by applicable law.",
      },
    ],
  },
  {
    id: "data-retention",
    icon: "🗂️",
    color: "#f87171",
    dim: "rgba(248,113,113,.08)",
    border: "rgba(248,113,113,.25)",
    title: "Data Retention Policy",
    content: [
      {
        sub: "Active Accounts",
        body: "We retain your data for as long as your account is active and as necessary to provide our services. Financial records may be retained for a longer period to comply with applicable tax and accounting regulations in your jurisdiction.",
      },
      {
        sub: "After Subscription Cancellation — 3-Phase Policy",
        body: "When you cancel your subscription, a 90-day data retention window begins automatically. Phase 1 (Days 1–30): Your account is read-only. You can log in and export all your data. Phase 2 (Days 31–90): Your account is locked but data is preserved on our servers. You may reactivate at any time to restore access. Phase 3 (Day 90+): All business data is permanently and irreversibly deleted.",
      },
      {
        sub: "Email Reminders Before Deletion",
        body: "We will send reminder emails to your registered address 14 days and 3 days before the 90-day permanent deletion deadline. It is your responsibility to ensure your email address is current and to export any data you wish to keep.",
      },
      {
        sub: "What Is Deleted at Day 90",
        body: "Permanent deletion includes all invoices, purchase orders, ledger entries, inventory records, payroll data, employee records, contacts, bank reconciliation data, expense vouchers, reports, and any other business data you entered into the platform.",
      },
      {
        sub: "What We Retain After Deletion",
        body: "After permanent deletion we retain only: (1) an anonymized audit log confirming the purge event, and (2) minimum billing records required by applicable financial regulations (plan name, payment amounts, dates). No personal business data is retained after day 90.",
      },
      {
        sub: "Explicit Deletion Request",
        body: "You may request immediate deletion of your account and all associated data at any time by emailing finovaos.app@gmail.com. We will process the request within 7 business days and send written confirmation. Immediate deletion waives any remaining read-only grace period.",
      },
      {
        sub: "Backups",
        body: "System backup snapshots are retained for up to 30 days and are subject to the same security controls and deletion schedule as live data. Backup retention does not extend your data retention window after cancellation.",
      },
    ],
  },
  {
    id: "your-rights",
    icon: "✋",
    color: "#06b6d4",
    dim: "rgba(6,182,212,.08)",
    border: "rgba(6,182,212,.25)",
    title: "Your Rights",
    content: [
      {
        sub: "Access & Portability",
        body: "You may request a full export of your data at any time in standard formats (CSV, Excel, PDF). We will fulfill your request within 14 business days.",
      },
      {
        sub: "Correction",
        body: "You may update or correct your personal information at any time through your account settings or by contacting our support team.",
      },
      {
        sub: "Deletion",
        body: "You have the right to request deletion of your account and all associated personal data. We will confirm deletion in writing within 30 days.",
      },
      {
        sub: "Objection & Restriction",
        body: "You may object to or request restriction of certain types of processing. Contact our privacy team to exercise these rights.",
      },
    ],
  },
  {
    id: "cookies",
    icon: "🍪",
    color: "#34d399",
    dim: "rgba(52,211,153,.08)",
    border: "rgba(52,211,153,.25)",
    title: "Cookies & Tracking",
    content: [
      {
        sub: "Essential Cookies",
        body: "We use strictly necessary cookies to maintain your login session, enforce security policies, and remember your preferences. These cannot be disabled without breaking core functionality.",
      },
      {
        sub: "Analytics",
        body: "We use privacy-respecting analytics to understand page usage and performance. No personal identifiers are included in analytics data.",
      },
      {
        sub: "No Third-Party Advertising Cookies",
        body: "We do not allow any advertising networks or retargeting pixels on our platform. Your browsing behavior within FinovaOS is never shared with advertisers.",
      },
    ],
  },
  {
    id: "changes",
    icon: "📝",
    color: "#818cf8",
    dim: "rgba(129,140,248,.08)",
    border: "rgba(129,140,248,.25)",
    title: "Changes to This Policy",
    content: [
      {
        sub: "Notification",
        body: "We will notify you of material changes to this privacy policy via email and in-app notification at least 14 days before the changes take effect.",
      },
      {
        sub: "Continued Use",
        body: "Your continued use of FinovaOS after the effective date of any changes constitutes your acceptance of the updated policy.",
      },
    ],
  },
];

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

function Section({ s, index }: { s: typeof SECTIONS[0]; index: number }) {
  const [ref, visible] = useVisible(0.08);
  return (
    <div ref={ref} id={s.id} style={{
      padding:"48px 0",
      borderTop:"1px solid rgba(255,255,255,.06)",
      opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(20px)",
      transition:"all .6s cubic-bezier(.22,1,.36,1)",
    }}>
      {/* Section header */}
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
              Section {String(index+1).padStart(2,"0")}
            </span>
          </div>
          <h2 style={{
            fontFamily:"'Lora',serif", fontSize:"clamp(18px,2.5vw,24px)",
            fontWeight:700, color:"white", letterSpacing:"-.4px", lineHeight:1.2, margin:0,
          }}>
            {s.title}
          </h2>
        </div>
      </div>

      {/* Content blocks */}
      <div style={{ display:"flex", flexDirection:"column", gap:16, paddingLeft:58 }}>
        {s.content.map((c,i) => (
          <div key={c.sub} style={{
            padding:"18px 20px", borderRadius:14,
            background:"rgba(255,255,255,.03)",
            border:"1px solid rgba(255,255,255,.07)",
            borderLeft:`3px solid ${s.color}`,
            transition:"all .25s",
          }}
            onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background="rgba(255,255,255,.05)";}}
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

export default function PrivacyPage() {
  const [heroRef, heroVisible] = useVisible(0.2);
  const [activeSection, setActiveSection] = useState("information-we-collect");

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
    }, { threshold:0.4 });
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
  };

  return (
    <>
      <Head>
        <title>Privacy Policy – FinovaOS</title>
        <meta name="description" content="How FinovaOS collects, uses, and protects your data."/>
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
          @media(max-width:1000px){.layout-grid{grid-template-columns:1fr!important;} .toc-sidebar{display:none!important;}}
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
                <span style={{ fontSize:12, color:"rgba(255,255,255,.45)", fontWeight:500 }}>Privacy Policy</span>
              </div>

              <div style={{ display:"flex", alignItems:"flex-start", gap:20, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:280 }}>
                  {/* Badge */}
                  <div style={{
                    display:"inline-flex", alignItems:"center", gap:7,
                    padding:"5px 14px", borderRadius:22,
                    background:"rgba(99,102,241,.1)", border:"1.5px solid rgba(99,102,241,.28)",
                    fontSize:10.5, fontWeight:700, color:"#a5b4fc",
                    letterSpacing:".09em", textTransform:"uppercase", marginBottom:18,
                    opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(12px)",
                    transition:"all .5s ease .06s",
                  }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:"#6366f1", animation:"blink 2s ease infinite" }}/>
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
                    Privacy Policy
                    <span style={{ display:"block", fontStyle:"italic",
                      background:"linear-gradient(135deg,#a5b4fc,#818cf8)",
                      WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                      fontSize:"80%" }}>
                      Your data, your rights.
                    </span>
                  </h1>

                  <p style={{
                    fontSize:15, color:"rgba(255,255,255,.4)", lineHeight:1.8, maxWidth:560,
                    opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(12px)",
                    transition:"all .6s ease .16s",
                  }}>
                    This policy explains what data {COMPANY} collects, how we use it, and your rights as a user. We are committed to transparency and your privacy is taken seriously.
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
                    background:"linear-gradient(90deg,transparent,rgba(99,102,241,.5),transparent)" }}/>
                  <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:16 }}>Quick Summary</div>
                  {[
                    { icon:"🚫", text:"We never sell your data" },
                    { icon:"🔒", text:"256-bit encryption always" },
                    { icon:"🌐", text:"Global cloud servers" },
                    { icon:"📤", text:"Full data export anytime" },
                    { icon:"🗑️", text:"Right to deletion" },
                  ].map(({ icon, text }) => (
                    <div key={text} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <span style={{ fontSize:15 }}>{icon}</span>
                      <span style={{ fontSize:12.5, color:"rgba(255,255,255,.6)", fontWeight:500 }}>{text}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.22)", lineHeight:1.6 }}>
                      Questions? Email us at<br/>
                      <a href={`mailto:${EMAIL}`} style={{ color:"#818cf8", textDecoration:"none", fontWeight:600 }}>{EMAIL}</a>
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
            {/* ── Sticky TOC Sidebar ── */}
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

            {/* ── Content ── */}
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
                  background:"linear-gradient(90deg,transparent,rgba(99,102,241,.4),transparent)" }}/>
                <div style={{ fontSize:22, marginBottom:14 }}>📬</div>
                <h3 style={{ fontFamily:"'Lora',serif", fontSize:20, fontWeight:700, color:"white", marginBottom:8 }}>
                  Contact Our Privacy Team
                </h3>
                <p style={{ fontSize:13.5, color:"rgba(255,255,255,.4)", lineHeight:1.8, marginBottom:20 }}>
                  For any questions, requests, or concerns related to this privacy policy or your personal data, please reach out to us directly.
                </p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
                  {[
                    { icon:"📧", label:"Email", val:EMAIL, href:`mailto:${EMAIL}` },
                    { icon:"📍", label:"Address", val:ADDRESS, href:"#" },
                  ].map(({ icon, label, val, href }) => (
                    <a key={label} href={href} style={{
                      display:"inline-flex", alignItems:"center", gap:10,
                      padding:"10px 16px", borderRadius:12,
                      background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.25)",
                      color:"#a5b4fc", textDecoration:"none", fontSize:13, fontWeight:600,
                      transition:"all .22s",
                    }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="rgba(99,102,241,.16)";}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="rgba(99,102,241,.08)";}}
                    >
                      <span>{icon}</span>
                      <div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", fontWeight:500, textTransform:"uppercase", letterSpacing:".07em", marginBottom:1 }}>{label}</div>
                        {val}
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Footer note */}
              <div style={{ marginTop:32, padding:"16px 20px", borderRadius:12,
                background:"rgba(251,191,36,.05)", border:"1px solid rgba(251,191,36,.15)" }}>
                <p style={{ fontSize:12.5, color:"rgba(255,255,255,.35)", lineHeight:1.7, margin:0 }}>
                  <span style={{ fontWeight:700, color:"rgba(251,191,36,.7)" }}>Note: </span>
                  This is a placeholder privacy policy. It should be reviewed and finalized by a qualified legal professional before the platform goes live in production. Laws vary by jurisdiction and your specific use case may require additional clauses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
