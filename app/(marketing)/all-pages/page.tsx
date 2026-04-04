"use client";
import Link from "next/link";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";

const SITEMAP = [
  {
    id: "main",
    icon: "🏠",
    color: "#818cf8",
    dim: "rgba(129,140,248,.08)",
    border: "rgba(129,140,248,.28)",
    title: "Main Pages",
    links: [
      { label: "Home", href: "/", desc: "Landing page & product overview" },
      { label: "Features", href: "/features", desc: "Full feature breakdown by module" },
      { label: "Pricing", href: "/pricing", desc: "Plans, billing, and comparison table" },
      { label: "Solutions", href: "/solutions", desc: "Industry-specific use cases" },
      { label: "Security", href: "/security", desc: "Data security & compliance" },
      { label: "About Us", href: "/about", desc: "Our story, mission, and team" },
    ],
  },
  {
    id: "auth",
    icon: "🔐",
    color: "#34d399",
    dim: "rgba(52,211,153,.08)",
    border: "rgba(52,211,153,.28)",
    title: "Auth & Onboarding",
    links: [
      { label: "Login", href: "/login", desc: "Sign in to your account" },
      { label: "Sign Up", href: "/website-signup", desc: "Create a new account" },
      { label: "Magic Link Login", href: "/login-email", desc: "Passwordless login via email" },
      { label: "Forgot Password", href: "/forgot-password", desc: "Reset your password" },
      { label: "SSO Login", href: "/sso", desc: "Enterprise single sign-on" },
      { label: "Choose Plan", href: "/pricing", desc: "Select subscription plan" },
    ],
  },
  {
    id: "dashboard",
    icon: "📊",
    color: "#fbbf24",
    dim: "rgba(251,191,36,.08)",
    border: "rgba(251,191,36,.28)",
    title: "Dashboard & Reports",
    links: [
      { label: "Dashboard", href: "/dashboard", desc: "Main financial overview" },
      { label: "Ledger Report", href: "/dashboard/reports/ledger", desc: "General ledger entries" },
      { label: "Profit & Loss", href: "/dashboard/reports/profit-loss", desc: "P&L statement" },
      { label: "Balance Sheet", href: "/dashboard/reports/balance-sheet", desc: "Assets, liabilities & equity" },
      { label: "Cash Flow", href: "/dashboard/reports/cash-flow", desc: "Cash flow statement" },
      { label: "Tax Summary", href: "/dashboard/reports/tax-summary", desc: "Compliance-ready tax reports" },
    ],
  },
  {
    id: "sales",
    icon: "🧾",
    color: "#f87171",
    dim: "rgba(248,113,113,.08)",
    border: "rgba(248,113,113,.28)",
    title: "Sales & Customers",
    links: [
      { label: "Sales Invoice", href: "/dashboard/sales-invoice", desc: "Create & manage invoices" },
      { label: "Quotations", href: "/dashboard/quotation", desc: "Generate & convert quotes" },
      { label: "Customers", href: "/dashboard/customers", desc: "Customer ledger & CRM" },
      { label: "Inventory", href: "/dashboard/inventory", desc: "Stock & product management" },
      { label: "Stock Reports", href: "/dashboard/reports/stock", desc: "Inventory analytics" },
    ],
  },
  {
    id: "banking",
    icon: "🏦",
    color: "#a78bfa",
    dim: "rgba(167,139,250,.08)",
    border: "rgba(167,139,250,.28)",
    title: "Banking & Payments",
    links: [
      { label: "Bank Reconciliation", href: "/dashboard/bank-reconciliation", desc: "Match statements to ledger" },
      { label: "Payment Receipts", href: "/dashboard/payment-receipts", desc: "Record incoming payments" },
      { label: "Cash Payment Vouchers", href: "/dashboard/cpv", desc: "CPV entry & tracking" },
      { label: "Recurring Transactions", href: "/dashboard/recurring-transactions", desc: "Automate regular entries" },
      { label: "Bank Accounts", href: "/dashboard/bank-accounts", desc: "Manage linked accounts" },
    ],
  },
  {
    id: "legal",
    icon: "📋",
    color: "#06b6d4",
    dim: "rgba(6,182,212,.08)",
    border: "rgba(6,182,212,.28)",
    title: "Legal & Support",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy", desc: "Data collection & usage" },
      { label: "Terms of Service", href: "/legal/terms", desc: "Usage terms & conditions" },
      { label: "Security", href: "/security", desc: "Security practices & compliance" },
      { label: "Support Center", href: "/support", desc: "Help docs & contact" },
      { label: "Careers", href: "/careers", desc: "Join our team" },
      { label: "Release Notes", href: "/updates", desc: "Product changelog" },
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

function SitemapGroup({ group, index }: { group: typeof SITEMAP[0]; index: number }) {
  const [ref, visible] = useVisible(0.08);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `all .6s cubic-bezier(.22,1,.36,1) ${index * 80}ms`,
    }}>
      {/* Group header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <div style={{
          width:40, height:40, borderRadius:11, flexShrink:0,
          background: group.dim, border:`1.5px solid ${group.border}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:18,
        }}>
          {group.icon}
        </div>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:1 }}>
            <div style={{ width:16, height:2, borderRadius:1, background:group.color }}/>
            <span style={{ fontSize:10, fontWeight:700, color:group.color, letterSpacing:".1em", textTransform:"uppercase" }}>
              {group.links.length} pages
            </span>
          </div>
          <h2 style={{
            fontFamily:"'Lora',serif", fontSize:17, fontWeight:700,
            color:"white", letterSpacing:"-.3px", margin:0,
          }}>
            {group.title}
          </h2>
        </div>
      </div>

      {/* Links */}
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {group.links.map((link, i) => (
          <Link key={link.href} href={link.href}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"11px 14px", borderRadius:11,
              background: hovered === i ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.025)",
              border:`1px solid ${hovered === i ? group.border : "rgba(255,255,255,.06)"}`,
              textDecoration:"none", transition:"all .22s",
              transform: hovered === i ? "translateX(4px)" : "translateX(0)",
            }}>
            <div style={{
              width:6, height:6, borderRadius:"50%", flexShrink:0,
              background: hovered === i ? group.color : "rgba(255,255,255,.15)",
              transition:"background .22s",
              boxShadow: hovered === i ? `0 0 8px ${group.color}` : "none",
            }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color: hovered === i ? "white" : "rgba(255,255,255,.75)", transition:"color .22s" }}>
                {link.label}
              </div>
              <div style={{ fontSize:11.5, color:"rgba(255,255,255,.28)", marginTop:1 }}>{link.desc}</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={hovered === i ? group.color : "rgba(255,255,255,.18)"}
              strokeWidth="2.5" style={{ transition:"stroke .22s", flexShrink:0 }}>
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AllPagesPage() {
  const [heroRef, heroVisible] = useVisible(0.2);
  const totalPages = SITEMAP.reduce((s, g) => s + g.links.length, 0);

  return (
    <>
      <Head>
        <title>Sitemap – FinovaOS</title>
        <meta name="description" content="Complete sitemap for FinovaOS — all pages organized by category."/>
      </Head>

      <div style={{
        minHeight:"100vh",
        background:"linear-gradient(180deg,#080c1e 0%,#0c0f2e 30%,#080c1e 100%)",
        color:"white", fontFamily:"'Outfit','DM Sans',sans-serif",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Lora:ital,wght@0,700;1,700&display=swap');
          *,*::before,*::after{box-sizing:border-box;}
          @keyframes orbDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(16px,-14px)}}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
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

        <div style={{ position:"relative", zIndex:1, maxWidth:1100, margin:"0 auto", padding:"72px 24px 80px" }}>
          {/* Hero */}
          <div ref={heroRef} style={{ marginBottom:64 }}>
            <div style={{
              display:"flex", alignItems:"center", gap:6, marginBottom:24,
              opacity:heroVisible?1:0, transition:"opacity .5s ease",
            }}>
              <Link href="/" style={{ fontSize:12, color:"rgba(255,255,255,.28)", textDecoration:"none", fontWeight:500 }}
                onMouseEnter={e=>(e.currentTarget.style.color="rgba(255,255,255,.6)")}
                onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.28)")}>Home</Link>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.4)", fontWeight:500 }}>Sitemap</span>
            </div>

            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:20 }}>
              <div>
                <div style={{
                  display:"inline-flex", alignItems:"center", gap:7,
                  padding:"5px 14px", borderRadius:22,
                  background:"rgba(99,102,241,.1)", border:"1.5px solid rgba(99,102,241,.28)",
                  fontSize:10.5, fontWeight:700, color:"#a5b4fc",
                  letterSpacing:".09em", textTransform:"uppercase", marginBottom:16,
                  opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(12px)",
                  transition:"all .5s ease .06s",
                }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:"#6366f1", animation:"blink 2s ease infinite" }}/>
                  {totalPages} Pages · {SITEMAP.length} Categories
                </div>

                <h1 style={{
                  fontFamily:"'Lora',serif",
                  fontSize:"clamp(30px,4vw,48px)",
                  fontWeight:700, color:"white",
                  letterSpacing:"-1.5px", lineHeight:1.1,
                  opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(16px)",
                  transition:"all .6s ease .1s",
                }}>
                  Sitemap
                  <span style={{ display:"block", fontStyle:"italic",
                    background:"linear-gradient(135deg,#a5b4fc,#818cf8)",
                    WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                    fontSize:"75%" }}>
                    Every page, at a glance.
                  </span>
                </h1>
              </div>

              {/* Stats row */}
              <div style={{
                display:"flex", gap:16, flexWrap:"wrap",
                opacity:heroVisible?1:0, transition:"opacity .6s ease .2s",
              }}>
                {SITEMAP.map(g => (
                  <div key={g.id} style={{
                    padding:"8px 14px", borderRadius:10,
                    background:g.dim, border:`1px solid ${g.border}`,
                    fontSize:11, fontWeight:700, color:g.color,
                    display:"flex", alignItems:"center", gap:6,
                  }}>
                    <span>{g.icon}</span>
                    <span>{g.links.length}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",
            gap:32,
          }}>
            {SITEMAP.map((group, i) => (
              <SitemapGroup key={group.id} group={group} index={i}/>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
