"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Menu, X } from "lucide-react"

/* ─── Features Mega Data ─── */
const FEATURES_COLS = [
  {
    heading: "Accounting",
    color: "#818cf8",
    links: [
      { label: "Ledger & Trial Balance",  href: "/features" },
      { label: "Profit & Loss",           href: "/features" },
      { label: "Balance Sheet",           href: "/features" },
      { label: "Cash Flow",               href: "/features" },
      { label: "Tax Summary",             href: "/features" },
    ],
  },
  {
    heading: "Sales & Inventory",
    color: "#34d399",
    links: [
      { label: "Sales Invoices",         href: "/features" },
      { label: "Quotations",             href: "/features" },
      { label: "Inventory Management",   href: "/features" },
      { label: "Stock Reports",          href: "/features" },
      { label: "Customer Accounts",      href: "/features" },
    ],
  },
  {
    heading: "Banking & Payments",
    color: "#fbbf24",
    links: [
      { label: "Bank Reconciliation",    href: "/features" },
      { label: "Payment Receipts",       href: "/features" },
      { label: "Payment Vouchers",       href: "/features" },
      { label: "Recurring Transactions", href: "/features" },
      { label: "Bank Accounts",          href: "/features" },
    ],
  },
  {
    heading: "AI Intelligence",
    color: "#a78bfa",
    links: [
      { label: "AI Financial Insights",   href: "/features" },
      { label: "Ask AI (Chat)",           href: "/demo" },
      { label: "Smart Alerts",            href: "/features" },
      { label: "Revenue Forecast",        href: "/features" },
      { label: "Market Intelligence",     href: "/features" },
      { label: "AI Business Advisor",     href: "/features" },
    ],
  },
]

const FEATURES_CARDS = [
  {
    emoji: "📄",
    title: "Create professional invoices",
    desc: "Send invoices and get paid faster with smart automation.",
    cta: "Try Invoicing",
    href: "/features",
    color: "#818cf8",
    glow: "rgba(129,140,248,.18)",
    border: "rgba(129,140,248,.28)",
  },
  {
    emoji: "🤖",
    title: "AI Financial Intelligence",
    desc: "Ask your finances anything. Get alerts, forecasts & market insights — all powered by your real data.",
    cta: "Try AI Now",
    href: "/demo",
    color: "#a78bfa",
    glow: "rgba(167,139,250,.18)",
    border: "rgba(167,139,250,.28)",
  },
]

/* ─── Solutions Mega Data ─── */
const SOLUTIONS_COLS = [
  {
    heading: "By Industry",
    color: "#a78bfa",
    links: [
      { label: "Trading & Wholesale",    href: "/solutions?industry=trading",    icon: "🛒" },
      { label: "Distribution & FMCG",   href: "/solutions?industry=distribution",icon: "🚚" },
      { label: "Retail & Multi-Store",   href: "/solutions?industry=retail",     icon: "🏪" },
      { label: "Import Business",        href: "/solutions?industry=import",     icon: "📦" },
      { label: "Export Business",        href: "/solutions?industry=export",     icon: "🚢" },
      { label: "View All Solutions",     href: "/solutions",                     icon: "🌐" },
    ],
  },
  {
    heading: "By Business Size",
    color: "#06b6d4",
    links: [
      { label: "Startups & Freelancers", href: "/pricing?plan=starter",    icon: "🌱" },
      { label: "Small Businesses",       href: "/pricing?plan=starter",    icon: "🏢" },
      { label: "Growing Teams",          href: "/pricing?plan=professional", icon: "📈" },
      { label: "Enterprise & Groups",    href: "/pricing?plan=enterprise",  icon: "🏛️" },
      { label: "Multi-branch Ops",       href: "/solutions?industry=enterprise",           icon: "🔗" },
    ],
  },
  {
    heading: "Popular Use Cases",
    color: "#f87171",
    links: [
      { label: "Multi-currency Accounting", href: "/features", icon: "💱" },
      { label: "Global Tax Compliance", href: "/features", icon: "📋" },
      { label: "Payroll Management",        href: "/features", icon: "👥" },
      { label: "Inventory Tracking",        href: "/features", icon: "📦" },
      { label: "Financial Reporting",       href: "/features", icon: "📊" },
    ],
  },
]

const SOLUTIONS_CARDS = [
  {
    emoji: "🌍",
    title: "Built for global businesses",
    desc: "Multi-currency, multi-branch support for growing businesses on one platform.",
    cta: "Explore Global",
    href: "/solutions",
    color: "#a78bfa",
    glow: "rgba(167,139,250,.18)",
    border: "rgba(167,139,250,.28)",
    stats: [
      { val: "40+", label: "Countries" },
      { val: "14k+", label: "Businesses" },
    ],
  },
  {
    emoji: "⚡",
    title: "Setup in under 10 minutes",
    desc: "Import your data, invite your team, start in minutes — not days.",
    cta: "Get Started",
    href: "/pricing",
    color: "#fbbf24",
    glow: "rgba(251,191,36,.14)",
    border: "rgba(251,191,36,.25)",
    stats: [
      { val: "75%", label: "OFF First 3mo" },
      { val: "24/7", label: "Support" },
    ],
  },
]

/* ─── Simple nav links ─── */
const NAV_LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Blog",    href: "/blog" },
]

/* ─── Shared styles ─── */
const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Lora:wght@700&display=swap');
  *, *::before, *::after { box-sizing: border-box; }

  @keyframes megaIn   { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes mobileIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }

  .fn-link {
    position:relative; font-size:13.5px; font-weight:600;
    color:rgba(255,255,255,.5); text-decoration:none;
    padding:6px 0; font-family:'Outfit',sans-serif; letter-spacing:.01em;
    transition:color .2s;
  }
  .fn-link::after {
    content:''; position:absolute; bottom:0; left:0;
    width:0; height:1.5px; border-radius:2px;
    background:linear-gradient(90deg,#818cf8,#6366f1);
    transition:width .25s ease;
  }
  .fn-link:hover        { color:#fff; }
  .fn-link:hover::after { width:100%; }

  .fn-feat {
    position:relative; font-size:13.5px; font-weight:600;
    color:rgba(255,255,255,.5); background:none; border:none; cursor:pointer;
    padding:6px 0; font-family:'Outfit',sans-serif; letter-spacing:.01em;
    display:flex; align-items:center; gap:5px; transition:color .2s;
  }
  .fn-feat::after {
    content:''; position:absolute; bottom:0; left:0;
    width:0; height:1.5px; border-radius:2px;
    background:linear-gradient(90deg,#818cf8,#6366f1);
    transition:width .25s ease;
  }
  .fn-feat:hover,.fn-feat.open        { color:#fff; }
  .fn-feat:hover::after,.fn-feat.open::after { width:100%; }

  .fn-ml {
    font-size:13px; font-weight:500; color:rgba(255,255,255,.42);
    text-decoration:none; padding:4px 0;
    display:flex; align-items:center; gap:7px;
    font-family:'Outfit',sans-serif; transition:all .2s;
  }
  .fn-ml:hover { color:rgba(255,255,255,.88); padding-left:4px; }

  .fn-hc {
    border-radius:14px; padding:14px; border:1.5px solid;
    background:rgba(255,255,255,.03);
    transition:all .25s; cursor:pointer; text-decoration:none; display:block;
  }
  .fn-hc:hover { background:rgba(255,255,255,.06); transform:translateY(-2px); }

  .fn-mob {
    display:block; font-size:15px; font-weight:600;
    color:rgba(255,255,255,.65); text-decoration:none;
    padding:12px 0; border-bottom:1px solid rgba(255,255,255,.06);
    transition:color .2s; font-family:'Outfit',sans-serif;
  }
  .fn-mob:hover { color:#fff; }

  .fn-cta {
    display:inline-flex; align-items:center; gap:7px;
    padding:9px 20px; border-radius:11px;
    background:linear-gradient(135deg,#6366f1,#4f46e5);
    color:#fff; font-size:13px; font-weight:700;
    font-family:'Outfit',sans-serif; text-decoration:none;
    border:none; cursor:pointer; letter-spacing:.01em;
    transition:all .25s; box-shadow:0 4px 16px rgba(99,102,241,.35);
  }
  .fn-cta:hover { transform:translateY(-1px); box-shadow:0 6px 22px rgba(99,102,241,.52); }

  @media(max-width:767px) {
    .fn-desk { display:none !important; }
    .fn-ham  { display:flex !important; }
  }
  @media(min-width:768px) {
    .fn-ham { display:none !important; }
  }
`

/* ─── Reusable Mega Panel ─── */
function MegaPanel({
  cols, cards, footerText, footerLink, footerHref, onClose, accentColor,
}: {
  cols: typeof FEATURES_COLS
  cards: typeof FEATURES_CARDS
  footerText: string
  footerLink: string
  footerHref: string
  onClose: () => void
  accentColor: string
}) {
  return (
    <>
      {/* Grid texture */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",
        backgroundSize:"40px 40px",
      }}/>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"32px 24px 24px", position:"relative" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:36 }}>

          {/* 3 link columns */}
          {cols.map(col => (
            <div key={col.heading}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:16 }}>
                <div style={{ width:3, height:13, borderRadius:2, background:col.color }}/>
                <span style={{ fontSize:10, fontWeight:700, color:col.color, letterSpacing:".1em", textTransform:"uppercase" }}>
                  {col.heading}
                </span>
              </div>
              <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:1 }}>
                {col.links.map(({ label, href, icon }: any) => (
                  <li key={label}>
                    <Link href={href} className="fn-ml" onClick={onClose}>
                      {icon
                        ? <span style={{ fontSize:13, flexShrink:0 }}>{icon}</span>
                        : <svg width="5" height="5" viewBox="0 0 6 6" fill={col.color} opacity=".55" style={{ flexShrink:0 }}><circle cx="3" cy="3" r="3"/></svg>
                      }
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Highlight cards */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {cards.map((card: any) => (
              <Link key={card.title} href={card.href} className="fn-hc"
                onClick={onClose}
                style={{ borderColor:card.border, boxShadow:`0 4px 16px ${card.glow}` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = card.color + "55"; e.currentTarget.style.boxShadow = `0 8px 26px ${card.glow}`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = card.border; e.currentTarget.style.boxShadow = `0 4px 16px ${card.glow}`; }}
              >
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, background:`${card.color}15`, border:`1px solid ${card.color}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>
                    {card.emoji}
                  </div>
                  <span style={{ fontSize:12.5, fontWeight:700, color:"rgba(255,255,255,.85)", lineHeight:1.3 }}>
                    {card.title}
                  </span>
                </div>
                <p style={{ fontSize:11.5, color:"rgba(255,255,255,.35)", lineHeight:1.6, margin:"0 0 8px" }}>
                  {card.desc}
                </p>
                {/* Stats row if present */}
                {card.stats && (
                  <div style={{ display:"flex", gap:12, marginBottom:8 }}>
                    {card.stats.map((s: any) => (
                      <div key={s.label}>
                        <div style={{ fontSize:13, fontWeight:800, color:card.color, fontFamily:"'Lora',serif" }}>{s.val}</div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,.28)", fontWeight:500 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, color:card.color }}>
                  {card.cta}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(255,255,255,.018)", padding:"11px 24px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:12.5, color:"rgba(255,255,255,.28)", fontWeight:500 }}>{footerText}</span>
          <Link href={footerHref} onClick={onClose}
            style={{ display:"flex", alignItems:"center", gap:5, fontSize:12.5, fontWeight:700, color:accentColor, textDecoration:"none", transition:"color .2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#c4b5fd")}
            onMouseLeave={e => (e.currentTarget.style.color = accentColor)}>
            {footerLink}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>
      </div>
    </>
  )
}

export default function Navbar() {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://usefinova.app"
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeMega, setActiveMega] = useState<"features" | "solutions" | null>(null)
  const [scrolled,   setScrolled]   = useState(false)
  const featuresRef  = useRef<HTMLDivElement>(null)
  const solutionsRef = useRef<HTMLDivElement>(null)
  const megaRef      = useRef<HTMLDivElement>(null)
  const megaTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    const onKey    = (e: KeyboardEvent) => { if (e.key === "Escape") setActiveMega(null) }
    const onDown   = (e: MouseEvent) => {
      const t = e.target as Node
      if (featuresRef.current?.contains(t)) return
      if (solutionsRef.current?.contains(t)) return
      if (megaRef.current?.contains(t)) return
      setActiveMega(null)
    }
    window.addEventListener("scroll",    onScroll, { passive:true })
    window.addEventListener("keydown",   onKey)
    window.addEventListener("mousedown", onDown)
    return () => {
      window.removeEventListener("scroll",    onScroll)
      window.removeEventListener("keydown",   onKey)
      window.removeEventListener("mousedown", onDown)
    }
  }, [])

  const openMega  = (which: "features" | "solutions") => {
    if (megaTimer.current) clearTimeout(megaTimer.current)
    setActiveMega(which)
  }
  const closeMega = () => {
    megaTimer.current = setTimeout(() => setActiveMega(null), 130)
  }

  return (
    <>
      <style>{SHARED_CSS}</style>

      <nav style={{
        position:"relative", zIndex:50, width:"100%",
        background: scrolled ? "rgba(8,12,30,.94)" : "rgba(8,12,30,.78)",
        backdropFilter:"blur(22px)",
        borderBottom:`1px solid ${scrolled ? "rgba(99,102,241,.22)" : "rgba(255,255,255,.07)"}`,
        transition:"all .3s ease",
        boxShadow: scrolled ? "0 4px 32px rgba(0,0,0,.45)" : "none",
        fontFamily:"'Outfit',sans-serif",
      }}>
        {/* Top shimmer */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:1, pointerEvents:"none", background:"linear-gradient(90deg,transparent,rgba(99,102,241,.65),rgba(167,139,250,.45),transparent)" }}/>

        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px" }}>
          <div style={{ height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>

            {/* Logo */}
            <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
              <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, background:"linear-gradient(135deg,#4f46e5,#818cf8)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(99,102,241,.4)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5" opacity=".7"/>
                  <path d="M2 12l10 5 10-5" opacity=".88"/>
                </svg>
              </div>
              <span style={{ fontFamily:"'Lora',serif", fontSize:18, fontWeight:700, color:"white", letterSpacing:"-.2px" }}>Finova</span>
            </Link>

            {/* Desktop links */}
            <div className="fn-desk" style={{ display:"flex", alignItems:"center", gap:28 }}>

              {/* Features trigger */}
              <div ref={featuresRef} style={{ position:"relative" }}
                onMouseEnter={() => openMega("features")}
                onMouseLeave={closeMega}>
                <button className={`fn-feat${activeMega === "features" ? " open" : ""}`} aria-expanded={activeMega === "features"}>
                  Features
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition:"transform .2s", transform: activeMega === "features" ? "rotate(180deg)" : "rotate(0)" }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>

              {/* Solutions trigger */}
              <div ref={solutionsRef} style={{ position:"relative" }}
                onMouseEnter={() => openMega("solutions")}
                onMouseLeave={closeMega}>
                <button className={`fn-feat${activeMega === "solutions" ? " open" : ""}`} aria-expanded={activeMega === "solutions"}>
                  Solutions
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition:"transform .2s", transform: activeMega === "solutions" ? "rotate(180deg)" : "rotate(0)" }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>

              {NAV_LINKS.map(({ label, href }) => (
                <Link key={label} href={href} className="fn-link">{label}</Link>
              ))}
            </div>

            {/* Desktop right */}
            <div className="fn-desk" style={{ display:"flex", alignItems:"center", gap:14 }}>

              <Link href={`${APP_URL}/auth`}
                style={{
                  display:"flex", alignItems:"center", gap:6,
                  fontSize:13, fontWeight:600, color:"rgba(255,255,255,.5)",
                  textDecoration:"none", transition:"color .2s", letterSpacing:"-.01em",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "white")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.5)")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                </svg>
                Sign In
              </Link>

              <Link href="/pricing" className="fn-cta">
                Get Started
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>

            {/* Hamburger */}
            <button className="fn-ham" onClick={() => setMobileOpen(v => !v)}
              style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:8, cursor:"pointer", color:"white", alignItems:"center", justifyContent:"center", transition:"background .2s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.11)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}>
              {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>

        {/* ── Mega Menu Panel ── */}
        {activeMega && (
          <div ref={megaRef}
            onMouseEnter={() => { if (megaTimer.current) clearTimeout(megaTimer.current) }}
            onMouseLeave={closeMega}
            style={{
              position:"absolute", left:0, right:0, top:"100%",
              background:"rgba(7,10,27,.97)", backdropFilter:"blur(28px)",
              borderTop:"1px solid rgba(255,255,255,.07)",
              borderBottom:"1px solid rgba(255,255,255,.07)",
              boxShadow:"0 28px 72px rgba(0,0,0,.65)",
              animation:"megaIn .2s ease both", zIndex:40,
            }}>

            {/* Colored top accent line per menu */}
            <div style={{
              position:"absolute", top:0, left:0, right:0, height:2,
              background: activeMega === "solutions"
                ? "linear-gradient(90deg,#a78bfa,#06b6d4,transparent)"
                : "linear-gradient(90deg,#818cf8,#34d399,transparent)",
              opacity:.7,
            }}/>

            {activeMega === "features" && (
              <MegaPanel
                cols={FEATURES_COLS}
                cards={FEATURES_CARDS}
                footerText="Comprehensive financial tools built for growing businesses worldwide"
                footerLink="See all features"
                footerHref="/features"
                onClose={() => setActiveMega(null)}
                accentColor="#818cf8"
              />
            )}

            {activeMega === "solutions" && (
              <MegaPanel
                cols={SOLUTIONS_COLS}
                cards={SOLUTIONS_CARDS}
                footerText="Built for Trading, Distribution, Retail, Import & Export businesses"
                footerLink="Explore all solutions"
                footerHref="/solutions"
                onClose={() => setActiveMega(null)}
                accentColor="#a78bfa"
              />
            )}
          </div>
        )}

        {/* ── Mobile Menu ── */}
        {mobileOpen && (
          <div style={{ background:"rgba(7,10,27,.98)", backdropFilter:"blur(24px)", borderTop:"1px solid rgba(255,255,255,.07)", padding:"18px 24px 28px", animation:"mobileIn .22s ease both" }}>
            <div style={{ display:"flex", flexDirection:"column" }}>
              <Link href="/features"  className="fn-mob" onClick={() => setMobileOpen(false)}>Features</Link>
              <Link href="/solutions" className="fn-mob" onClick={() => setMobileOpen(false)}>Solutions</Link>
              {NAV_LINKS.map(({ label, href }) => (
                <Link key={label} href={href} className="fn-mob" onClick={() => setMobileOpen(false)}>{label}</Link>
              ))}
            </div>
            <div style={{ marginTop:20, paddingTop:20, borderTop:"1px solid rgba(255,255,255,.07)", display:"flex", flexDirection:"column", gap:11 }}>
              <Link href={`${APP_URL}/auth`} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px 16px", borderRadius:12, background:"rgba(255,255,255,.05)", border:"1.5px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.8)", fontSize:14, fontWeight:700, textDecoration:"none", textAlign:"center", fontFamily:"'Outfit',sans-serif" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
                Sign In to Dashboard
              </Link>
              <Link href="/pricing" style={{ display:"block", padding:"13px 16px", borderRadius:12, background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"white", fontSize:14, fontWeight:700, textDecoration:"none", textAlign:"center", fontFamily:"'Outfit',sans-serif", boxShadow:"0 4px 16px rgba(99,102,241,.4)" }}>
                Get Started Now →
              </Link>
            </div>
          </div>
        )}

      </nav>
    </>
  )
}
