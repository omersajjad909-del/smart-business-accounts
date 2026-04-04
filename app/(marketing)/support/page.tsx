"use client";
import Link from "next/link";
import { useState } from "react";

/* ─────────────────────────────────────────
   Data
───────────────────────────────────────── */
const FAQS = [
  { q: "How do I sync my bank transactions?", a: "Navigate to Transactions → Integrations → Plaid Bank Connect in your dashboard. We support 10,000+ banks via Plaid. Credentials are encrypted end-to-end and never stored on our servers." },
  { q: "Can I export my financial reports?", a: "Yes. Navigate to Reports, choose your date range and format (PDF, CSV, or XLSX). Reports include P&L, Cash Flow, Balance Sheet, and custom dashboards." },
  { q: "How are transactions categorized?", a: "Our system helps you categorize transactions into ledgers. You can review and manage your Chart of Accounts under the Accounts menu." },
  { q: "Is my financial data secure?", a: "Yes. We use industry-standard encryption for data at rest and in transit. Your financial data is isolated per company and never shared." },
  { q: "How do I invite my accountant?", a: "Go to the Team menu in your dashboard and click 'Add User'. You can assign roles like 'Accountant' or 'Viewer' to give specific access levels." },
  { q: "Can I manage multiple branches?", a: "Yes. FinovaOS supports multi-branch management. You can track branch-level P&L and consolidate data across all entities from a single dashboard." },
];

const CONTACTS = [
  { tag: "Most Popular", label: "Email Support", value: "finovaos.app@gmail.com", note: "Reply within 4 business hours", href: "mailto:finovaos.app@gmail.com", color: "#818cf8", glow: "rgba(129,140,248,.22)", dim: "rgba(129,140,248,.08)", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> },
  { tag: "Fastest", label: "Live Chat", value: "Mon–Fri, 9am–6pm UTC", note: "Avg. wait under 2 minutes", href: "#chat", color: "#34d399", glow: "rgba(52,211,153,.22)", dim: "rgba(52,211,153,.08)", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg> },
  { tag: "Self-Serve", label: "Help Center", value: "Browse 200+ articles", note: "Guides, tutorials & video walkthroughs", href: "/help", color: "#fbbf24", glow: "rgba(251,191,36,.22)", dim: "rgba(251,191,36,.08)", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg> },
];

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp    { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gridDrift { from{transform:translateY(0)} to{transform:translateY(40px)} }
        @keyframes orb1      { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-30px) scale(1.1)} }
        @keyframes orb2      { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-30px,20px) scale(1.08)} }
        @keyframes pulseRing { 0%{transform:scale(.9);opacity:0} 50%{opacity:.6} 100%{transform:scale(1.8);opacity:0} }
        @keyframes blink     { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes faqIn     { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

        .sp-fade-1 { opacity:0; animation:fadeUp .65s ease forwards .1s; }
        .sp-fade-2 { opacity:0; animation:fadeUp .65s ease forwards .25s; }
        .sp-fade-3 { opacity:0; animation:fadeUp .65s ease forwards .4s; }
        .sp-fade-4 { opacity:0; animation:fadeUp .65s ease forwards .55s; }
        .sp-fade-5 { opacity:0; animation:fadeUp .65s ease forwards .7s; }

        .live-dot { display:inline-block; width:7px; height:7px; border-radius:50%; background:#10b981; position:relative; }
        .live-dot::after { content:''; position:absolute; inset:-4px; border-radius:50%; background:rgba(16,185,129,.4); animation:pulseRing 2s ease infinite; }

        .sp-contact-card { transition:all .35s cubic-bezier(.22,1,.36,1); }
        .sp-contact-card:hover { transform:translateY(-6px) !important; }

        .sp-faq-btn { width:100%; background:none; border:none; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-family:inherit; font-weight:600; font-size:14px; text-align:left; gap:12px; }
        .sp-faq-answer { animation:faqIn .22s ease both; }

        .sp-cta-primary { display:inline-flex; align-items:center; gap:8px; padding:13px 28px; border-radius:12px; background:linear-gradient(135deg,#6366f1,#4f46e5); color:white; font-weight:700; font-size:14px; font-family:inherit; text-decoration:none; border:none; cursor:pointer; box-shadow:0 4px 20px rgba(99,102,241,.4); transition:all .25s; }
        .sp-cta-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(99,102,241,.55); }

        .sp-ghost { display:inline-flex; align-items:center; gap:8px; padding:12px 22px; border-radius:12px; border:1.5px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); color:rgba(255,255,255,.65); font-weight:600; font-size:14px; font-family:inherit; text-decoration:none; transition:all .25s; }
        .sp-ghost:hover { border-color:rgba(255,255,255,.28); color:white; background:rgba(255,255,255,.08); }

        .sp-quick-link { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; text-decoration:none; margin-bottom:2px; transition:background .2s; }
        .sp-quick-link:hover { background:rgba(255,255,255,.06) !important; }
      `}</style>

      <main style={{
        background: "linear-gradient(160deg,#06071a 0%,#0c0f2e 40%,#0f0c2e 70%,#080c1e 100%)",
        minHeight: "100vh",
        fontFamily: "'Outfit',sans-serif",
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Background */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.07) 1px,transparent 1px)", backgroundSize:"48px 48px", animation:"gridDrift 8s linear infinite alternate", opacity:.6 }}/>
          <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 65%)", top:-200, left:-100, animation:"orb1 12s ease-in-out infinite" }}/>
          <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,.12) 0%,transparent 65%)", bottom:-100, right:100, animation:"orb2 15s ease-in-out infinite" }}/>
          <div style={{ position:"absolute", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(20,184,166,.07) 0%,transparent 65%)", top:"44%", right:"28%", animation:"orb1 18s ease-in-out infinite reverse" }}/>
          <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.5),transparent)" }}/>
        </div>

        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px 100px", position: "relative", zIndex: 1 }}>

          {/* ── HERO ── */}
          <div className="sp-fade-1" style={{ textAlign:"center", marginBottom:80 }}>
            <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, color:"rgba(255,255,255,.28)", textDecoration:"none", fontSize:12, fontWeight:500, marginBottom:28, transition:"color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.28)")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back to Home
            </Link>

            <div style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"7px 14px 7px 10px", borderRadius:24, background:"rgba(99,102,241,.12)", border:"1px solid rgba(99,102,241,.25)", marginBottom:28 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div className="live-dot" />
                <span style={{ fontSize:11, fontWeight:700, color:"#10b981", letterSpacing:".06em", textTransform:"uppercase" }}>Support Center</span>
              </div>
              <div style={{ width:1, height:14, background:"rgba(255,255,255,.15)" }}/>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:500 }}>Typical reply under 4 hours</span>
            </div>

            <h1 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(36px,4.5vw,58px)", fontWeight:700, color:"white", lineHeight:1.1, letterSpacing:"-1.5px", marginBottom:18 }}>
              How can we{" "}
              <span style={{ background:"linear-gradient(135deg,#818cf8 0%,#6366f1 40%,#a78bfa 80%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                help you today?
              </span>
            </h1>
            <p style={{ fontSize:17, color:"rgba(255,255,255,.45)", lineHeight:1.75, maxWidth:480, margin:"0 auto" }}>
              Get answers fast, reach our team directly, or dive into our knowledge base — we&apos;re here every step of the way.
            </p>
          </div>

          {/* ── CONTACT CARDS ── */}
          <section style={{ marginBottom:88 }}>
            <div className="sp-fade-2" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:24, background:"rgba(99,102,241,.1)", border:"1.5px solid rgba(99,102,241,.28)", fontSize:11, fontWeight:700, color:"#a5b4fc", letterSpacing:".09em", textTransform:"uppercase", marginBottom:28 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#6366f1", animation:"blink 2s ease infinite" }}/>
              Get in Touch
            </div>

            <div className="sp-fade-2" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
              {CONTACTS.map((c, i) => {
                const isChat = c.label === "Live Chat";
                const Tag = isChat ? "button" : "a";
                const props = isChat 
                  ? { onClick: () => window.dispatchEvent(new CustomEvent("open-chat")) } 
                  : { href: c.href };

                return (
                  <Tag key={i} {...props} className="sp-contact-card" style={{
                    borderRadius:20, padding:"26px 24px",
                    background:"rgba(255,255,255,.04)",
                    border:"1.5px solid rgba(255,255,255,.08)",
                    backdropFilter:"blur(16px)",
                    textDecoration:"none", color:"inherit",
                    display:"flex", flexDirection:"column",
                    position:"relative", overflow:"hidden",
                    boxShadow:"0 4px 20px rgba(0,0,0,.2)",
                    textAlign: "left", cursor: "pointer", width: "100%"
                  }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.border=`1.5px solid ${c.color}55`; el.style.background="rgba(255,255,255,.06)"; el.style.boxShadow=`0 20px 48px ${c.glow},0 0 0 1px ${c.color}30`; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.border="1.5px solid rgba(255,255,255,.08)"; el.style.background="rgba(255,255,255,.04)"; el.style.boxShadow="0 4px 20px rgba(0,0,0,.2)"; }}
                  >
                    <div style={{ position:"absolute", top:-50, right:-50, width:180, height:180, borderRadius:"50%", background:`radial-gradient(circle,${c.glow},transparent 70%)`, opacity:.45, pointerEvents:"none" }}/>
                    <div style={{ position:"absolute", top:0, left:0, right:0, height:2.5, background:`linear-gradient(90deg,transparent,${c.color},transparent)`, borderRadius:"20px 20px 0 0", opacity:.6 }}/>

                    <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:20, marginBottom:18, background:c.dim, border:`1px solid ${c.color}30`, fontSize:10, fontWeight:700, color:c.color, letterSpacing:".09em", textTransform:"uppercase", width:"fit-content" }}>
                      <span style={{ width:5, height:5, borderRadius:"50%", background:c.color }}/>
                      {c.tag}
                    </div>
                    <div style={{ width:50, height:50, borderRadius:13, background:c.dim, border:`1.5px solid ${c.color}25`, display:"flex", alignItems:"center", justifyContent:"center", color:c.color, marginBottom:16 }}>
                      {c.icon}
                    </div>
                    <div style={{ fontFamily:"'Lora',serif", fontSize:18, fontWeight:700, color:"rgba(255,255,255,.92)", letterSpacing:"-.2px", marginBottom:6 }}>{c.label}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,.65)", marginBottom:4 }}>{c.value}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,.3)", fontWeight:500 }}>{c.note}</div>
                  </Tag>
                );
              })}
            </div>
          </section>

          {/* ── FAQ + SIDEBAR ── */}
          <div className="sp-fade-3" style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:24, marginBottom:88, alignItems:"start" }}>

            {/* FAQ */}
            <div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:24, background:"rgba(251,191,36,.1)", border:"1.5px solid rgba(251,191,36,.28)", fontSize:11, fontWeight:700, color:"#fbbf24", letterSpacing:".09em", textTransform:"uppercase", marginBottom:22 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#fbbf24" }}/>FAQ
              </div>
              <h2 style={{ fontFamily:"'Lora',serif", fontSize:28, fontWeight:700, color:"rgba(255,255,255,.9)", letterSpacing:"-.4px", marginBottom:22 }}>Frequently Asked Questions</h2>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {FAQS.map((faq, i) => (
                  <div key={i} style={{ borderRadius:14, background:openFaq===i ? "rgba(99,102,241,.08)" : "rgba(255,255,255,.04)", border:`1.5px solid ${openFaq===i ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.08)"}`, overflow:"hidden", transition:"all .3s" }}>
                    <button className="sp-faq-btn" onClick={() => setOpenFaq(openFaq===i ? null : i)} style={{ color:openFaq===i ? "#a5b4fc" : "rgba(255,255,255,.75)" }}>
                      <span>{faq.q}</span>
                      <div style={{ width:24, height:24, borderRadius:"50%", background:openFaq===i ? "rgba(99,102,241,.3)" : "rgba(255,255,255,.07)", border:`1px solid ${openFaq===i ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:openFaq===i ? "#a5b4fc" : "rgba(255,255,255,.4)", fontSize:16, lineHeight:1, transform:openFaq===i ? "rotate(45deg)" : "rotate(0)", transition:"all .3s" }}>+</div>
                    </button>
                    {openFaq === i && (
                      <div className="sp-faq-answer" style={{ padding:"2px 20px 16px", paddingTop:14, fontSize:13.5, color:"rgba(255,255,255,.45)", lineHeight:1.75, borderTop:"1px solid rgba(255,255,255,.06)" }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {/* Quick Links */}
              <div style={{ borderRadius:20, padding:"24px", background:"rgba(255,255,255,.04)", border:"1.5px solid rgba(255,255,255,.08)", backdropFilter:"blur(16px)", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:2.5, background:"linear-gradient(90deg,transparent,#818cf8,transparent)", borderRadius:"20px 20px 0 0" }}/>
                <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.28)", letterSpacing:".09em", textTransform:"uppercase", marginBottom:16 }}>Quick Links</div>
                {[
                  { label:"Getting Started Guide", icon:"📖", href:"/help/create-account" },
                  { label:"Bank Integration Setup", icon:"🏦", href:"/help/import-statements" },
                  { label:"Invoice & Billing Docs", icon:"🧾", href:"/help/pl-statement" },
                  { label:"Multi-Branch Setup", icon:"🏢", href:"/help/choose-plan" },
                  { label:"Submit a Support Ticket", icon:"🎫", href:"mailto:finovaos.app@gmail.com" },
                ].map(({ label, icon, href }) => (
                  <Link key={label} href={href} className="sp-quick-link">
                    <span style={{ fontSize:16 }}>{icon}</span>
                    <span style={{ fontSize:13.5, color:"rgba(255,255,255,.58)", fontWeight:500 }}>{label}</span>
                    <svg style={{ marginLeft:"auto", flexShrink:0 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </Link>
                ))}
              </div>

              {/* Stats */}
              <div style={{ borderRadius:20, padding:"22px 24px", background:"rgba(99,102,241,.07)", border:"1.5px solid rgba(99,102,241,.22)", backdropFilter:"blur(16px)" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"rgba(165,180,252,.45)", letterSpacing:".09em", textTransform:"uppercase", marginBottom:16 }}>Support Stats</div>
                {[
                  { label:"Avg. Response Time", val:"< 4 hrs", color:"#34d399" },
                  { label:"Customer Satisfaction", val:"98.7%", color:"#fbbf24" },
                  { label:"Resolved Daily", val:"340+", color:"#818cf8" },
                ].map(({ label, val, color }, i, arr) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom: i < arr.length-1 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                    <span style={{ fontSize:12.5, color:"rgba(255,255,255,.38)", fontWeight:500 }}>{label}</span>
                    <span style={{ fontFamily:"'Lora',serif", fontSize:16, fontWeight:700, color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── BOTTOM CTA ── */}
          <div className="sp-fade-4" style={{ borderRadius:22, padding:"36px 44px", background:"rgba(99,102,241,.07)", border:"1.5px solid rgba(99,102,241,.22)", backdropFilter:"blur(16px)", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:20, position:"relative", overflow:"hidden", boxShadow:"0 0 0 1px rgba(99,102,241,.1),0 8px 40px rgba(0,0,0,.25)" }}>
            <div style={{ position:"absolute", right:-60, top:"50%", transform:"translateY(-50%)", width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.14),transparent 70%)", pointerEvents:"none" }}/>
            <div style={{ position:"relative" }}>
              <div style={{ fontFamily:"'Lora',serif", fontSize:22, fontWeight:700, color:"white", letterSpacing:"-.3px", marginBottom:8 }}>Can&apos;t find what you&apos;re looking for?</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:16 }}>
                {["Submit a ticket","Schedule a call","Join community"].map(t => (
                  <div key={t} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"rgba(255,255,255,.38)", fontWeight:500 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="rgba(99,102,241,.2)"/><path d="M4 7l2.5 2.5L10 4.5" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:12, position:"relative" }}>
              <Link href="/support/ticket" className="sp-cta-primary">
                Submit a Ticket
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
              <Link href="/help" className="sp-ghost">Help Center</Link>
            </div>
          </div>

          {/* Trust strip */}
          <div className="sp-fade-5" style={{ marginTop:80, borderTop:"1px solid rgba(255,255,255,.07)", paddingTop:40 }}>
            <div style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,.2)", fontWeight:500, letterSpacing:".08em", textTransform:"uppercase", marginBottom:22 }}>
              Trusted by businesses across multiple regions worldwide
            </div>
            <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:48, flexWrap:"wrap", marginBottom:24 }}>
              {["Atlas Group","Meridian Corp","Faisal Traders","Nova Dist.","Crescent SME"].map(name => (
                <div key={name} style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.2)", letterSpacing:".04em", textTransform:"uppercase", transition:"color .2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.5)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.2)")}
                >{name}</div>
              ))}
            </div>
            <div style={{ display:"flex", justifyContent:"center", gap:24, flexWrap:"wrap" }}>
              {["Security controls","Encrypted connections","GDPR-ready practices","Reliable platform operations"].map(b => (
                <div key={b} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"rgba(255,255,255,.28)", fontWeight:500 }}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="rgba(99,102,241,.2)"/><path d="M4 7l2.5 2.5L10 4.5" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {b}
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
