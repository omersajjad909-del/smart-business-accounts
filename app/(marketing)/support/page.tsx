"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const SUPPORT_EMAIL = "support@finovaos.app";

const CHANNELS = [
  {
    tag: "Most Popular",
    label: "Email Support",
    href: `mailto:${SUPPORT_EMAIL}`,
    display: SUPPORT_EMAIL,
    note: "Reply within 4 business hours",
    color: "#818cf8",
    glow: "rgba(129,140,248,.22)",
    dim: "rgba(129,140,248,.08)",
    icon: "📧",
    action: "Send Email",
    external: true,
  },
  {
    tag: "Fastest Response",
    label: "Live Chat",
    href: "#chat",
    display: "Mon–Fri, 9am–6pm UTC",
    note: "Average wait under 2 minutes",
    color: "#34d399",
    glow: "rgba(52,211,153,.22)",
    dim: "rgba(52,211,153,.08)",
    icon: "💬",
    action: "Start Chat",
    external: false,
  },
  {
    tag: "Track Progress",
    label: "Submit a Ticket",
    href: "/support/ticket",
    display: "For complex issues",
    note: "Get a reference number and updates",
    color: "#f59e0b",
    glow: "rgba(245,158,11,.22)",
    dim: "rgba(245,158,11,.08)",
    icon: "🎫",
    action: "Open Ticket",
    external: false,
  },
  {
    tag: "Self-Serve",
    label: "Help Center",
    href: "/help",
    display: "Guides, FAQs & walkthroughs",
    note: "Videos, walkthroughs, and how-tos",
    color: "#06b6d4",
    glow: "rgba(6,182,212,.22)",
    dim: "rgba(6,182,212,.08)",
    icon: "📚",
    action: "Browse Docs",
    external: false,
  },
] as const;

const CATEGORIES = [
  {
    icon: "🚀",
    label: "Getting Started",
    desc: "First setup, company profile, onboarding walkthrough, and initial configuration.",
    count: "Browse →",
    color: "#6366f1",
    href: "/help",
  },
  {
    icon: "💳",
    label: "Billing & Plans",
    desc: "Subscription management, plan upgrades, invoices, payment methods, and refunds.",
    count: "Browse →",
    color: "#10b981",
    href: "/help",
  },
  {
    icon: "🔧",
    label: "Technical Issues",
    desc: "Error messages, performance, login issues, and platform troubleshooting steps.",
    count: "Browse →",
    color: "#f59e0b",
    href: "/help",
  },
  {
    icon: "🔗",
    label: "Integrations & Imports",
    desc: "Bank connections, data import from Excel/CSV, third-party integrations, and APIs.",
    count: "Browse →",
    color: "#06b6d4",
    href: "/help",
  },
  {
    icon: "🔒",
    label: "Security & Data",
    desc: "Encryption, backup policy, user permissions, compliance practices, and access logs.",
    count: "Browse →",
    color: "#a78bfa",
    href: "/help",
  },
  {
    icon: "💡",
    label: "Feature Requests",
    desc: "Submit ideas, vote on the product roadmap, and track the status of your suggestions.",
    count: "View Roadmap →",
    color: "#f87171",
    href: "/roadmap",
  },
] as const;

const FAQ_CATS = ["All", "Getting Started", "Billing", "Features", "Security", "Technical", "Integrations"] as const;

const FAQS: { q: string; a: string; cat: string }[] = [
  {
    q: "How do I set up my company profile for the first time?",
    a: "After registration, go to Settings → Company Profile. Fill in your company name, business type, tax ID, and branch information. The onboarding wizard will guide you step by step. You can also import existing data from Excel during this process.",
    cat: "Getting Started",
  },
  {
    q: "How do I add team members and set their access permissions?",
    a: "Go to Settings → Team Management → Add User. Assign a role such as Admin, Accountant, Cashier, or Viewer. Each role has predefined access levels, and you can also configure custom permission sets for specific workflows within your organization.",
    cat: "Getting Started",
  },
  {
    q: "Can I import existing data from Excel, QuickBooks, or other software?",
    a: "Yes. Navigate to Settings → Data Import and select your source format (CSV, Excel, or QuickBooks export). FinovaOS supports importing accounts, customers, vendors, inventory items, and opening balances. A field-mapping interface helps you match columns to the correct fields.",
    cat: "Integrations",
  },
  {
    q: "How do I connect my bank account for reconciliation?",
    a: "Go to Banking → Connect Account. FinovaOS supports bank statement imports via CSV and OFX files. For automated sync, you can use supported integration providers. Imported transactions are matched against your posted entries using intelligent matching rules.",
    cat: "Integrations",
  },
  {
    q: "Does FinovaOS support multiple branches from a single account?",
    a: "Yes. FinovaOS is built for multi-branch operations. Go to Settings → Branches to add and configure branch locations. You can track branch-level P&L, inventory, and sales separately while consolidating financials across all branches in the main dashboard.",
    cat: "Features",
  },
  {
    q: "How do I generate financial statements such as P&L, Balance Sheet, or Cash Flow?",
    a: "Go to Reports → Financial Statements, then choose the report type and date range. Reports are generated in real time and can be exported as PDF, Excel, or CSV. You can also schedule automated monthly reports to be emailed to your team.",
    cat: "Features",
  },
  {
    q: "Can I customize invoice and receipt templates?",
    a: "Yes. Navigate to Settings → Document Templates. You can upload your company logo, change brand colors, configure field visibility, and add custom footer text. The thermal POS receipt layout is also customizable, including paper size and column display preferences.",
    cat: "Features",
  },
  {
    q: "Does FinovaOS support multiple currencies?",
    a: "Yes. Configure a base currency and enable additional transaction currencies under Settings → Currency. Exchange rates can be set manually or updated automatically. Multi-currency transactions are recorded and reported in both the transaction currency and your base currency.",
    cat: "Features",
  },
  {
    q: "How is my financial data backed up and protected?",
    a: "All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Automated daily backups are retained for 30 days on enterprise-grade cloud infrastructure. Each customer workspace is logically isolated — no cross-account data access is possible under any circumstances.",
    cat: "Security",
  },
  {
    q: "Is my data ever used to train AI models?",
    a: "No. Your business data is never used to train public or shared AI models. AI-powered insights and recommendations in FinovaOS are generated solely within your own isolated workspace environment using your own data only.",
    cat: "Security",
  },
  {
    q: "What payment methods does FinovaOS accept for subscriptions?",
    a: "Subscriptions are processed through our payment providers (Stripe or Paddle depending on your region). We accept all major credit and debit cards. Bank transfer options are available for annual Enterprise plans. FinovaOS does not store full card details on its own servers.",
    cat: "Billing",
  },
  {
    q: "How do I cancel my subscription and what happens to my data?",
    a: "Cancel anytime from Settings → Billing → Cancel Subscription. After cancellation, a 90-day data retention window begins: 30 days read-only access, then locked until day 90, after which all data is permanently deleted. Reminder emails are sent 14 days and 3 days before the deletion deadline.",
    cat: "Billing",
  },
  {
    q: "What should I do if I encounter a bug or the platform is running slowly?",
    a: "First, clear your browser cache and reload the page. If the issue continues, check status.finovaos.app for known incidents. For bugs, submit a support ticket with a description, reproduction steps, and a screenshot if possible. We prioritize bug reports by severity and respond within your plan SLA.",
    cat: "Technical",
  },
  {
    q: "Why am I unable to log in to my account?",
    a: "Common causes include an incorrect password, expired session, or an account suspended for overdue billing. Try resetting your password first. If you are on a company account, your admin may have modified your access. Contact support if the issue persists and we will investigate within your SLA window.",
    cat: "Technical",
  },
];

const SLA = [
  { plan: "Starter", color: "#818cf8", email: "24 hrs", chat: "Business hours", ticket: "48 hrs", onboarding: "Self-serve docs", manager: "—", phone: "—" },
  { plan: "Professional", color: "#34d399", email: "4 hrs", chat: "Priority queue", ticket: "8 hrs", onboarding: "1 onboarding call", manager: "Shared", phone: "—" },
  { plan: "Enterprise", color: "#f59e0b", email: "1 hr", chat: "Dedicated agent", ticket: "2 hrs", onboarding: "Full onboarding", manager: "Dedicated", phone: "✓" },
];

const SLA_ROWS = [
  { label: "Email Support", key: "email" },
  { label: "Live Chat", key: "chat" },
  { label: "Support Tickets", key: "ticket" },
  { label: "Onboarding Assistance", key: "onboarding" },
  { label: "Account Manager", key: "manager" },
  { label: "Phone / Video Support", key: "phone" },
] as const;

const UPTIME_BARS = Array.from({ length: 30 }, (_, i) =>
  i === 7 || i === 22 ? "partial" : "up"
);

function useVisible(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, v] as const;
}

function CardInner({ c }: { c: typeof CHANNELS[number] }) {
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,transparent,${c.color},transparent)`, opacity: .75 }} />
      <div style={{ position: "absolute", top: -40, right: -40, width: 130, height: 130, borderRadius: "50%",
        background: `radial-gradient(circle,${c.glow},transparent 70%)`, opacity: .4, pointerEvents: "none" }} />
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20,
        background: c.dim, border: `1px solid ${c.color}28`,
        fontSize: 9.5, fontWeight: 700, color: c.color, letterSpacing: ".08em", marginBottom: 16, width: "fit-content" }}>
        {c.tag.toUpperCase()}
      </div>
      <div style={{ fontSize: 30, marginBottom: 14, lineHeight: 1 }}>{c.icon}</div>
      <div style={{ fontFamily: "'Lora',serif", fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,.92)", marginBottom: 6 }}>{c.label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.52)", marginBottom: 4 }}>{c.display}</div>
      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.28)", fontWeight: 500, marginBottom: 18, lineHeight: 1.55, flex: 1 }}>{c.note}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: c.color, marginTop: "auto" }}>
        {c.action}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
      </div>
    </>
  );
}

const CARD_BASE: React.CSSProperties = {
  borderRadius: 20, padding: "24px 22px",
  background: "rgba(255,255,255,.04)",
  border: "1.5px solid rgba(255,255,255,.08)",
  backdropFilter: "blur(16px)",
  position: "relative", overflow: "hidden",
  boxShadow: "0 4px 24px rgba(0,0,0,.2)",
  display: "flex", flexDirection: "column",
};

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeCat, setActiveCat] = useState<string>("All");

  const [heroRef, heroVis] = useVisible(0.1);
  const [chRef, chVis] = useVisible();
  const [catRef, catVis] = useVisible();
  const [faqRef, faqVis] = useVisible();
  const [slaRef, slaVis] = useVisible();
  const [ctaRef, ctaVis] = useVisible();

  const filteredFaqs = activeCat === "All" ? FAQS : FAQS.filter(f => f.cat === activeCat);

  const cardHover = (el: HTMLElement, c: typeof CHANNELS[number], on: boolean) => {
    el.style.border = on ? `1.5px solid ${c.color}50` : "1.5px solid rgba(255,255,255,.08)";
    el.style.background = on ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.04)";
    el.style.boxShadow = on ? `0 20px 50px ${c.glow},0 0 0 1px ${c.color}22` : "0 4px 24px rgba(0,0,0,.2)";
    el.style.transform = on ? "translateY(-5px)" : "translateY(0)";
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes orb{0%,100%{transform:translate(0,0)}50%{transform:translate(28px,-18px)}}
        @keyframes pulse{0%{transform:scale(.88);opacity:0}50%{opacity:.5}100%{transform:scale(2);opacity:0}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes faqIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}

        .live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;position:relative;flex-shrink:0;}
        .live-dot::after{content:'';position:absolute;inset:-5px;border-radius:50%;background:rgba(16,185,129,.32);animation:pulse 2.2s ease infinite;}

        .ch-card{transition:all .3s cubic-bezier(.22,1,.36,1);text-decoration:none;color:inherit;}
        .cat-tile{transition:all .28s cubic-bezier(.22,1,.36,1);text-decoration:none;color:inherit;}
        .cat-tile:hover{transform:translateY(-4px);}

        .faq-btn{width:100%;background:none;border:none;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-family:inherit;font-weight:600;font-size:14.5px;text-align:left;gap:16px;}
        .faq-answer{animation:faqIn .2s ease both;}

        .filter-btn{background:none;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:7px 15px;font-size:12px;font-weight:600;color:rgba(255,255,255,.38);font-family:inherit;cursor:pointer;transition:all .2s;white-space:nowrap;}
        .filter-btn:hover{border-color:rgba(255,255,255,.26);color:rgba(255,255,255,.68);}
        .filter-btn.on{border-color:rgba(99,102,241,.5);color:#a5b4fc;background:rgba(99,102,241,.1);}

        .ql{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;text-decoration:none;margin-bottom:2px;transition:background .2s;}
        .ql:hover{background:rgba(255,255,255,.06);}

        .sp-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;font-weight:700;font-size:14px;font-family:inherit;text-decoration:none;border:none;cursor:pointer;box-shadow:0 4px 22px rgba(99,102,241,.4);transition:all .25s;}
        .sp-btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(99,102,241,.55);}
        .sp-ghost{display:inline-flex;align-items:center;gap:8px;padding:13px 24px;border-radius:12px;border:1.5px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:rgba(255,255,255,.62);font-weight:600;font-size:14px;font-family:inherit;text-decoration:none;transition:all .25s;}
        .sp-ghost:hover{border-color:rgba(255,255,255,.28);color:white;background:rgba(255,255,255,.08);}

        @media(max-width:900px){
          .ch-grid{grid-template-columns:repeat(2,1fr)!important;}
          .cat-grid{grid-template-columns:repeat(2,1fr)!important;}
          .faq-layout{grid-template-columns:1fr!important;}
          .sla-grid{grid-template-columns:1fr repeat(3,1fr)!important;}
        }
        @media(max-width:520px){
          .ch-grid{grid-template-columns:1fr!important;}
          .cat-grid{grid-template-columns:1fr!important;}
          .sla-grid{grid-template-columns:1fr 1fr!important;}
        }
      `}</style>

      <main style={{
        background: "linear-gradient(160deg,#05071a 0%,#0a0e2a 45%,#07091e 100%)",
        minHeight: "100vh",
        fontFamily: "'Outfit',sans-serif",
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* ── BG ── */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(99,102,241,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.05) 1px,transparent 1px)",
            backgroundSize: "52px 52px", opacity: .65 }} />
          <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%",
            background: "radial-gradient(circle,rgba(99,102,241,.14),transparent 65%)",
            top: -150, left: -100, animation: "orb 14s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%",
            background: "radial-gradient(circle,rgba(124,58,237,.1),transparent 65%)",
            bottom: -80, right: -60, animation: "orb 19s ease-in-out infinite reverse" }} />
          <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: 1,
            background: "linear-gradient(90deg,transparent,rgba(99,102,241,.45),transparent)" }} />
        </div>

        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "60px 24px 100px", position: "relative", zIndex: 1 }}>

          {/* ══════════════════════════════
              HERO
          ══════════════════════════════ */}
          <div ref={heroRef}>
            <div style={{ textAlign: "center", marginBottom: 72,
              opacity: heroVis ? 1 : 0, transform: heroVis ? "translateY(0)" : "translateY(22px)",
              transition: "all .65s cubic-bezier(.22,1,.36,1)" }}>

              {/* Breadcrumb */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 24 }}>
                <Link href="/" style={{ fontSize: 12, color: "rgba(255,255,255,.3)", textDecoration: "none", fontWeight: 500, transition: "color .2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.3)")}>Home</Link>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.45)", fontWeight: 500 }}>Support Center</span>
              </div>

              {/* Status badge */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 18px 8px 14px",
                borderRadius: 28, background: "rgba(16,185,129,.07)", border: "1.5px solid rgba(16,185,129,.2)", marginBottom: 26 }}>
                <div className="live-dot" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981", letterSpacing: ".06em" }}>ALL SYSTEMS OPERATIONAL</span>
                <div style={{ width: 1, height: 14, background: "rgba(255,255,255,.12)" }} />
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", fontWeight: 500 }}>99.98% uptime last 30 days</span>
              </div>

              <h1 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(36px,5vw,62px)",
                fontWeight: 700, color: "white", lineHeight: 1.08, letterSpacing: "-1.8px", marginBottom: 18 }}>
                How can we{" "}
                <span style={{ background: "linear-gradient(135deg,#818cf8 0%,#6366f1 50%,#a78bfa 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  help you today?
                </span>
              </h1>
              <p style={{ fontSize: 17, color: "rgba(255,255,255,.4)", lineHeight: 1.8, maxWidth: 500, margin: "0 auto 38px" }}>
                Get answers fast, reach our team directly, or browse the knowledge base — we&apos;re with you at every step.
              </p>

              {/* Search bar */}
              <div style={{ maxWidth: 560, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
                  borderRadius: 16, background: "rgba(255,255,255,.05)", border: "1.5px solid rgba(255,255,255,.1)",
                  backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,.25)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span style={{ fontSize: 14.5, color: "rgba(255,255,255,.26)", fontWeight: 500, flex: 1, textAlign: "left" }}>
                    Search articles, guides, or topics…
                  </span>
                  <div style={{ padding: "6px 12px", borderRadius: 8,
                    background: "rgba(99,102,241,.18)", border: "1px solid rgba(99,102,241,.35)",
                    fontSize: 11, fontWeight: 700, color: "#a5b4fc", flexShrink: 0 }}>
                    ⌘K
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════
              CONTACT CHANNELS
          ══════════════════════════════ */}
          <section ref={chRef} style={{ marginBottom: 80 }}>
            <div style={{ opacity: chVis ? 1 : 0, transform: chVis ? "translateY(0)" : "translateY(20px)",
              transition: "all .6s ease" }}>

              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 24,
                background: "rgba(99,102,241,.1)", border: "1.5px solid rgba(99,102,241,.28)",
                fontSize: 11, fontWeight: 700, color: "#a5b4fc", letterSpacing: ".09em", marginBottom: 24 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: "blink 2s ease infinite" }} />
                GET IN TOUCH
              </div>

              <div className="ch-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
                {CHANNELS.map((c) => {
                  const sharedStyle: React.CSSProperties = { ...CARD_BASE, cursor: "pointer", width: "100%" };
                  const enter = (e: React.MouseEvent) => cardHover(e.currentTarget as HTMLElement, c, true);
                  const leave = (e: React.MouseEvent) => cardHover(e.currentTarget as HTMLElement, c, false);
                  const inner = <CardInner c={c} />;

                  if (c.href === "#chat") {
                    return (
                      <button key={c.label} onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
                        className="ch-card" style={sharedStyle} onMouseEnter={enter} onMouseLeave={leave}>
                        {inner}
                      </button>
                    );
                  }
                  if (c.external) {
                    return (
                      <a key={c.label} href={c.href} className="ch-card" style={sharedStyle} onMouseEnter={enter} onMouseLeave={leave}>
                        {inner}
                      </a>
                    );
                  }
                  return (
                    <Link key={c.label} href={c.href} className="ch-card" style={sharedStyle} onMouseEnter={enter} onMouseLeave={leave}>
                      {inner}
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════
              BROWSE BY CATEGORY
          ══════════════════════════════ */}
          <section ref={catRef} style={{ marginBottom: 80 }}>
            <div style={{ opacity: catVis ? 1 : 0, transform: catVis ? "translateY(0)" : "translateY(20px)",
              transition: "all .6s ease" }}>

              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 26 }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 24,
                    background: "rgba(251,191,36,.1)", border: "1.5px solid rgba(251,191,36,.28)",
                    fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: ".09em", marginBottom: 12 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24" }} />
                    BROWSE BY TOPIC
                  </div>
                  <h2 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(22px,3vw,30px)", fontWeight: 700,
                    color: "white", letterSpacing: "-.5px" }}>
                    Find what you need
                  </h2>
                </div>
                <Link href="/help" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600,
                  color: "rgba(255,255,255,.38)", textDecoration: "none", transition: "color .2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.7)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.38)")}>
                  Browse all help articles
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </Link>
              </div>

              <div className="cat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                {CATEGORIES.map((cat) => (
                  <Link key={cat.label} href={cat.href} className="cat-tile"
                    style={{ borderRadius: 18, padding: "22px", textDecoration: "none",
                      background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.07)",
                      display: "block", position: "relative", overflow: "hidden" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = `${cat.color}0d`;
                      (e.currentTarget as HTMLElement).style.border = `1.5px solid ${cat.color}38`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.04)";
                      (e.currentTarget as HTMLElement).style.border = "1.5px solid rgba(255,255,255,.07)";
                    }}
                  >
                    <div style={{ position: "absolute", top: -28, right: -28, width: 100, height: 100, borderRadius: "50%",
                      background: `radial-gradient(circle,${cat.color}1a,transparent 70%)`, pointerEvents: "none" }} />
                    <div style={{ fontSize: 28, marginBottom: 12, lineHeight: 1 }}>{cat.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,.9)", marginBottom: 8 }}>{cat.label}</div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.38)", lineHeight: 1.65, marginBottom: 14 }}>{cat.desc}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: cat.color, letterSpacing: ".04em" }}>{cat.count}</div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════
              FAQ + SIDEBAR
          ══════════════════════════════ */}
          <section ref={faqRef} style={{ marginBottom: 80 }}>
            <div className="faq-layout" style={{ display: "grid", gridTemplateColumns: "1fr 310px", gap: 24, alignItems: "start",
              opacity: faqVis ? 1 : 0, transform: faqVis ? "translateY(0)" : "translateY(20px)",
              transition: "all .6s ease" }}>

              {/* ── FAQ ── */}
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 24,
                  background: "rgba(129,140,248,.1)", border: "1.5px solid rgba(129,140,248,.28)",
                  fontSize: 11, fontWeight: 700, color: "#a5b4fc", letterSpacing: ".09em", marginBottom: 14 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8" }} />
                  FREQUENTLY ASKED
                </div>
                <h2 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(22px,3vw,30px)", fontWeight: 700,
                  color: "white", letterSpacing: "-.5px", marginBottom: 20 }}>
                  Common Questions
                </h2>

                {/* Category filters */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                  {FAQ_CATS.map(cat => (
                    <button key={cat} className={`filter-btn${activeCat === cat ? " on" : ""}`}
                      onClick={() => { setActiveCat(cat); setOpenFaq(null); }}>
                      {cat}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filteredFaqs.map((faq, i) => (
                    <div key={i} style={{
                      borderRadius: 14, overflow: "hidden",
                      background: openFaq === i ? "rgba(99,102,241,.07)" : "rgba(255,255,255,.04)",
                      border: `1.5px solid ${openFaq === i ? "rgba(99,102,241,.38)" : "rgba(255,255,255,.07)"}`,
                      transition: "all .28s",
                    }}>
                      <button className="faq-btn" onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        style={{ color: openFaq === i ? "#c7d2fe" : "rgba(255,255,255,.7)" }}>
                        <span>{faq.q}</span>
                        <div style={{
                          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                          background: openFaq === i ? "rgba(99,102,241,.28)" : "rgba(255,255,255,.06)",
                          border: `1px solid ${openFaq === i ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.1)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: openFaq === i ? "#a5b4fc" : "rgba(255,255,255,.32)",
                          fontSize: 18, lineHeight: 1,
                          transform: openFaq === i ? "rotate(45deg)" : "rotate(0)",
                          transition: "all .28s",
                        }}>+</div>
                      </button>
                      {openFaq === i && (
                        <div className="faq-answer" style={{
                          padding: "4px 22px 18px",
                          fontSize: 13.5, color: "rgba(255,255,255,.46)", lineHeight: 1.8,
                          borderTop: "1px solid rgba(255,255,255,.05)",
                        }}>
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredFaqs.length === 0 && (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,.22)", fontSize: 14 }}>
                      No FAQs in this category yet.
                    </div>
                  )}
                </div>
              </div>

              {/* ── SIDEBAR ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Response time */}
                <div style={{ borderRadius: 20, padding: "22px", ...CARD_BASE, gap: 0 }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: "linear-gradient(90deg,transparent,#6366f1,transparent)" }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.28)", letterSpacing: ".09em", textTransform: "uppercase", marginBottom: 16 }}>
                    Response Times by Plan
                  </div>
                  {SLA.map((t, i, arr) => (
                    <div key={t.plan} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.color }}>{t.plan}</span>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.65)" }}>Email: {t.email}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 1 }}>Ticket: {t.ticket}</div>
                      </div>
                    </div>
                  ))}
                  <Link href="/pricing" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16, paddingTop: 14,
                    borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 12, fontWeight: 700, color: "#a5b4fc", textDecoration: "none" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "white")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#a5b4fc")}>
                    Compare plans for full SLA details →
                  </Link>
                </div>

                {/* Uptime status */}
                <div style={{ borderRadius: 20, padding: "22px",
                  background: "rgba(16,185,129,.05)", border: "1.5px solid rgba(16,185,129,.18)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.28)", letterSpacing: ".09em", textTransform: "uppercase" }}>
                      Platform Status
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "#10b981" }}>
                      <div className="live-dot" style={{ width: 6, height: 6 }} />
                      Operational
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
                    {UPTIME_BARS.map((s, i) => (
                      <div key={i} style={{ flex: 1, height: 26, borderRadius: 3,
                        background: s === "up" ? "#10b981" : "#f59e0b",
                        opacity: s === "up" ? 0.65 : 0.9 }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.24)", fontWeight: 500 }}>
                    <span>30 days ago</span>
                    <span style={{ color: "#10b981", fontWeight: 700 }}>99.98% uptime</span>
                    <span>Today</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14,
                    paddingTop: 12, borderTop: "1px solid rgba(16,185,129,.12)",
                    fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,.28)" }}>
                    status.finovaos.app — coming soon
                  </div>
                </div>

                {/* Quick links */}
                <div style={{ borderRadius: 20, padding: "22px", ...CARD_BASE, gap: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.28)", letterSpacing: ".09em", textTransform: "uppercase", marginBottom: 14 }}>
                    Helpful Resources
                  </div>
                  {[
                    { label: "Getting Started Guide", icon: "🚀", href: "/help" },
                    { label: "Video Tutorials", icon: "🎬", href: "/help" },
                    { label: "Data Import Guide", icon: "📥", href: "/help" },
                    { label: "Submit a Support Ticket", icon: "🎫", href: "/support/ticket" },
                  ].map(({ label, icon, href }) => (
                    <Link key={label} href={href} className="ql">
                      <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,.52)", fontWeight: 500 }}>{label}</span>
                      <svg style={{ marginLeft: "auto", flexShrink: 0 }} width="11" height="11" viewBox="0 0 24 24"
                        fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>
                  ))}
                </div>

              </div>
            </div>
          </section>

          {/* ══════════════════════════════
              SUPPORT PLAN COMPARISON
          ══════════════════════════════ */}
          <section ref={slaRef} style={{ marginBottom: 80 }}>
            <div style={{ opacity: slaVis ? 1 : 0, transform: slaVis ? "translateY(0)" : "translateY(20px)",
              transition: "all .6s ease" }}>

              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 24,
                    background: "rgba(167,139,250,.1)", border: "1.5px solid rgba(167,139,250,.28)",
                    fontSize: 11, fontWeight: 700, color: "#c4b5fd", letterSpacing: ".09em", marginBottom: 12 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa" }} />
                    SUPPORT PLAN COMPARISON
                  </div>
                  <h2 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(22px,3vw,30px)", fontWeight: 700,
                    color: "white", letterSpacing: "-.5px" }}>
                    Every plan includes support — higher tiers get faster responses.
                  </h2>
                </div>
                <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px",
                  borderRadius: 10, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.28)",
                  color: "#a5b4fc", textDecoration: "none", fontSize: 13, fontWeight: 700, flexShrink: 0, transition: "all .2s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,.2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(99,102,241,.1)")}>
                  View pricing →
                </Link>
              </div>

              <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,.07)" }}>
                {/* Header row */}
                <div className="sla-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(3,1fr)",
                  background: "rgba(255,255,255,.03)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ padding: "16px 22px" }} />
                  {SLA.map(t => (
                    <div key={t.plan} style={{ padding: "16px 16px", borderLeft: "1px solid rgba(255,255,255,.05)" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: t.color, letterSpacing: ".07em", marginBottom: 2 }}>
                        {t.plan.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>

                {SLA_ROWS.map((row, i, arr) => (
                  <div key={row.key} className="sla-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(3,1fr)",
                    borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none",
                    background: i % 2 === 0 ? "rgba(255,255,255,.02)" : "transparent" }}>
                    <div style={{ padding: "14px 22px", fontSize: 13.5, color: "rgba(255,255,255,.5)", fontWeight: 500 }}>
                      {row.label}
                    </div>
                    {SLA.map(t => {
                      const val = t[row.key];
                      return (
                        <div key={t.plan} style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600,
                          color: val === "—" ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.75)",
                          borderLeft: "1px solid rgba(255,255,255,.04)" }}>
                          {val}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Footer row */}
                <div className="sla-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(3,1fr)",
                  background: "rgba(255,255,255,.025)", borderTop: "1px solid rgba(255,255,255,.07)" }}>
                  <div />
                  {SLA.map(t => (
                    <div key={t.plan} style={{ padding: "14px 16px", borderLeft: "1px solid rgba(255,255,255,.04)" }}>
                      <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 12, fontWeight: 700, color: t.color, textDecoration: "none", opacity: .85 }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = ".85")}>
                        See plan →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════
              BOTTOM CTA
          ══════════════════════════════ */}
          <div ref={ctaRef}>
            <div style={{
              borderRadius: 22, padding: "44px 48px",
              background: "rgba(99,102,241,.07)", border: "1.5px solid rgba(99,102,241,.22)",
              backdropFilter: "blur(16px)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 28, position: "relative", overflow: "hidden",
              boxShadow: "0 0 80px rgba(99,102,241,.07)",
              opacity: ctaVis ? 1 : 0, transform: ctaVis ? "translateY(0)" : "translateY(20px)",
              transition: "all .65s ease",
            }}>
              <div style={{ position: "absolute", right: -80, top: "50%", transform: "translateY(-50%)",
                width: 340, height: 340, borderRadius: "50%",
                background: "radial-gradient(circle,rgba(99,102,241,.15),transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px",
                  borderRadius: 20, marginBottom: 14,
                  background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.25)",
                  fontSize: 10.5, fontWeight: 700, color: "#fbbf24", letterSpacing: ".07em" }}>
                  STILL NEED HELP?
                </div>
                <h3 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(20px,2.5vw,28px)",
                  fontWeight: 700, color: "white", letterSpacing: "-.4px", marginBottom: 10 }}>
                  Can&apos;t find what you&apos;re looking for?
                </h3>
                <p style={{ fontSize: 14.5, color: "rgba(255,255,255,.4)", maxWidth: 460, lineHeight: 1.7 }}>
                  Our support team is here to help with setup, technical issues, billing questions, and custom requirements.
                </p>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 18 }}>
                  {["Submit a ticket", "Technical support", "Billing help", "Onboarding call"].map(t => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,.35)", fontWeight: 500 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="7" fill="rgba(99,102,241,.22)" />
                        <path d="M4 7l2.5 2.5L10 4.5" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", position: "relative" }}>
                <Link href="/support/ticket" className="sp-btn">
                  Submit a Support Ticket
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="sp-ghost">
                  📧 Email Us Directly
                </a>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
