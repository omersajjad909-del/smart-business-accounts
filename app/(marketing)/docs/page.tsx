"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, vis] as const;
}

/* ─── Data ──────────────────────────────────────────────────────────── */

const SECTIONS = [
  {
    id: "getting-started",
    icon: "🚀",
    color: "#818cf8",
    glow: "rgba(129,140,248,.12)",
    border: "rgba(129,140,248,.25)",
    title: "Getting Started",
    desc: "Set up your account, add your company, and invite your team in minutes.",
    links: [
      { label: "Create your account",             href: "/help/create-account",    badge: "Start here" },
      { label: "Company profile setup",            href: "/help/company-profile"   },
      { label: "Invite team members & roles",      href: "/help/invite-team"        },
      { label: "Choosing the right plan",          href: "/help/choose-plan"        },
      { label: "Connect your bank account",        href: "/help/connect-bank"       },
      { label: "Your first invoice",               href: "/help/first-invoice",     badge: "Popular" },
    ],
  },
  {
    id: "accounting",
    icon: "📒",
    color: "#34d399",
    glow: "rgba(52,211,153,.12)",
    border: "rgba(52,211,153,.25)",
    title: "Accounting & Ledger",
    desc: "Double-entry accounting, chart of accounts, journal entries, and financial statements.",
    links: [
      { label: "Chart of accounts overview",       href: "/help/chart-of-accounts"  },
      { label: "Journal entries & JVs",            href: "/help/journal-entries"     },
      { label: "Period locking & audit trails",    href: "/help/period-locking"      },
      { label: "Profit & Loss statement",          href: "/help/pl-statement",       badge: "Popular" },
      { label: "Balance sheet walkthrough",        href: "/help/balance-sheet"       },
      { label: "Trial balance",                    href: "/help/trial-balance"       },
    ],
  },
  {
    id: "invoicing",
    icon: "🧾",
    color: "#fbbf24",
    glow: "rgba(251,191,36,.12)",
    border: "rgba(251,191,36,.25)",
    title: "Invoicing & Sales",
    desc: "Create, send, and track sales invoices, quotations, receipts, and credit notes.",
    links: [
      { label: "Create a sales invoice",           href: "/help/create-invoice",     badge: "Popular" },
      { label: "Send via email or WhatsApp",       href: "/help/send-invoice"        },
      { label: "Record payments & receipts",       href: "/help/record-payment"      },
      { label: "Recurring invoices",               href: "/help/recurring-invoices"  },
      { label: "Quotations → invoice conversion",  href: "/help/quotation-invoice"   },
      { label: "Credit notes & refunds",           href: "/help/credit-notes"        },
    ],
  },
  {
    id: "inventory",
    icon: "📦",
    color: "#06b6d4",
    glow: "rgba(6,182,212,.12)",
    border: "rgba(6,182,212,.25)",
    title: "Inventory & Stock",
    desc: "Manage products, warehouses, stock levels, GRNs, and purchase orders.",
    links: [
      { label: "Add products & services",          href: "/help/add-products"        },
      { label: "FIFO / LIFO / Average cost",       href: "/help/inventory-valuation", badge: "Popular" },
      { label: "Set low-stock alerts",             href: "/help/stock-alerts"        },
      { label: "Stock transfer between branches",  href: "/help/stock-transfer"      },
      { label: "Goods received notes (GRN)",       href: "/help/grn"                 },
      { label: "Purchase orders",                  href: "/help/purchase-orders"     },
    ],
  },
  {
    id: "banking",
    icon: "🏦",
    color: "#a78bfa",
    glow: "rgba(167,139,250,.12)",
    border: "rgba(167,139,250,.25)",
    title: "Banking & Reconciliation",
    desc: "Sync bank accounts, import statements, and reconcile transactions automatically.",
    links: [
      { label: "How bank reconciliation works",    href: "/help/bank-reconciliation", badge: "Popular" },
      { label: "Import CSV/Excel statements",      href: "/help/import-statements"   },
      { label: "Auto-match transactions",          href: "/help/match-transactions"  },
      { label: "Cash payment vouchers (CPV)",      href: "/help/cpv"                 },
      { label: "Cash receipt vouchers (CRV)",      href: "/help/crv"                 },
      { label: "Multiple bank accounts",           href: "/help/multiple-accounts"   },
    ],
  },
  {
    id: "hr-payroll",
    icon: "👥",
    color: "#f87171",
    glow: "rgba(248,113,113,.12)",
    border: "rgba(248,113,113,.25)",
    title: "HR & Payroll",
    desc: "Employee management, attendance, leave policies, and automated payroll processing.",
    links: [
      { label: "Add employees & departments",      href: "/help/add-employees"       },
      { label: "Attendance & timesheets",          href: "/help/attendance"          },
      { label: "Leave management",                 href: "/help/leave-management"    },
      { label: "Run monthly payroll",              href: "/help/run-payroll",         badge: "Popular" },
      { label: "Payslips & PDF export",            href: "/help/payslips"            },
      { label: "Salary advance management",        href: "/help/salary-advance"      },
    ],
  },
  {
    id: "multi-branch",
    icon: "🏢",
    color: "#f97316",
    glow: "rgba(249,115,22,.12)",
    border: "rgba(249,115,22,.25)",
    title: "Multi-Branch & Companies",
    desc: "Manage multiple locations and companies from a single login with consolidated reports.",
    links: [
      { label: "Add a new branch / location",      href: "/help/add-branch"          },
      { label: "Consolidated P&L report",          href: "/help/consolidated-pl",     badge: "Popular" },
      { label: "Per-branch roles & permissions",   href: "/help/branch-roles"        },
      { label: "Stock transfer across branches",   href: "/help/stock-transfer"      },
      { label: "Multi-company setup",              href: "/help/multi-company"       },
      { label: "Switching between companies",      href: "/help/switch-company"      },
    ],
  },
  {
    id: "api",
    icon: "⚙️",
    color: "#6366f1",
    glow: "rgba(99,102,241,.12)",
    border: "rgba(99,102,241,.25)",
    title: "API & Integrations",
    desc: "Connect external systems using company-scoped API keys and webhooks.",
    links: [
      { label: "API authentication",               href: "/developers/api",           badge: "Dev" },
      { label: "Available endpoints",              href: "/developers/api#endpoints", badge: "Dev" },
      { label: "cURL & SDK examples",              href: "/developers/api#examples",  badge: "Dev" },
      { label: "Webhook events",                   href: "/developers/api#webhooks",  badge: "Dev" },
      { label: "Generate an API key",              href: "/dashboard/integrations"   },
      { label: "Zapier integration",               href: "/integrations/zapier"      },
    ],
  },
];

const QUICK_LINKS = [
  { icon: "🚀", label: "Quick Start",     sub: "Up and running in 5 min",    href: "/help/create-account",  color: "#818cf8" },
  { icon: "📖", label: "Help Center",     sub: "50+ guides & tutorials",      href: "/help",                 color: "#34d399" },
  { icon: "⚙️", label: "API Reference",   sub: "Endpoints & authentication",   href: "/developers/api",       color: "#6366f1" },
  { icon: "🔄", label: "Changelog",       sub: "Latest updates & releases",    href: "/changelog",            color: "#fbbf24" },
  { icon: "💬", label: "Support",         sub: "Live chat & tickets",          href: "/support",              color: "#a78bfa" },
  { icon: "🎬", label: "Video Tutorials", sub: "Watch step-by-step walkthroughs",href: "/help#videos",        color: "#f87171" },
];

const SEARCH_INDEX = SECTIONS.flatMap(s =>
  s.links.map(l => ({ ...l, section: s.title, icon: s.icon, color: s.color }))
);

/* ─── Components ────────────────────────────────────────────────────── */

function SectionCard({ s, i }: { s: typeof SECTIONS[0]; i: number }) {
  const [ref, vis] = useInView(0.05);
  const [hov, setHov] = useState<number | null>(null);

  return (
    <div ref={ref} style={{
      borderRadius: 20, overflow: "hidden",
      background: "rgba(255,255,255,.025)",
      border: "1.5px solid rgba(255,255,255,.07)",
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(24px)",
      transition: `all .6s cubic-bezier(.22,1,.36,1) ${i * 60}ms`,
      position: "relative",
    }}>
      {/* Top accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)` }}/>

      <div style={{ padding: "22px 22px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
            background: s.glow, border: `1.5px solid ${s.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>{s.icon}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: "'Lora',serif", fontSize: 16, fontWeight: 700, color: "white", margin: "0 0 3px" }}>{s.title}</h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.33)", margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 6 }}>
          {s.links.map((lk, li) => (
            <Link key={li} href={lk.href}
              onMouseEnter={() => setHov(li)}
              onMouseLeave={() => setHov(null)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 10px", borderRadius: 10,
                background: hov === li ? s.glow : "transparent",
                border: `1px solid ${hov === li ? s.border : "transparent"}`,
                textDecoration: "none", transition: "all .18s",
              }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke={hov === li ? s.color : "rgba(255,255,255,.2)"} strokeWidth="2.5"
                style={{ flexShrink: 0, transition: "stroke .18s" }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: hov === li ? "white" : "rgba(255,255,255,.58)", transition: "color .18s" }}>
                {lk.label}
              </span>
              {lk.badge && (
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
                  padding: "2px 8px", borderRadius: 8, flexShrink: 0,
                  background: s.glow, border: `1px solid ${s.border}`, color: s.color,
                }}>{lk.badge}</span>
              )}
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                stroke={hov === li ? s.color : "rgba(255,255,255,.15)"} strokeWidth="2.5"
                style={{ flexShrink: 0, transition: "stroke .18s" }}>
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          ))}
        </div>
      </div>

      <Link href={`/help#${s.id}`} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        padding: "11px", width: "100%",
        borderTop: "1px solid rgba(255,255,255,.05)",
        background: "rgba(255,255,255,.015)",
        fontSize: 11.5, fontWeight: 700, color: s.color, textDecoration: "none",
        transition: "background .2s",
        letterSpacing: ".03em",
      }}
        onMouseEnter={e => (e.currentTarget.style.background = s.glow)}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.015)")}
      >
        All {s.title} docs
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </Link>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function DocsPage() {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVis, setHeroVis] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVis(true), 60);
    return () => clearTimeout(t);
  }, []);

  const results = search.trim().length > 1
    ? SEARCH_INDEX.filter(x => x.label.toLowerCase().includes(search.toLowerCase()) || x.section.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#07091c 0%,#080c22 40%,#06091a 100%)",
      color: "white", fontFamily: "'Outfit',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:ital,wght@0,700;1,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orbDrift{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(-50%,-60%)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;}
        input::placeholder{color:rgba(255,255,255,.22);}
      `}</style>

      {/* Background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)", backgroundSize: "52px 52px" }}/>
        <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", top: "5%", left: "50%", background: "radial-gradient(circle,rgba(99,102,241,.1),transparent 65%)", animation: "orbDrift 16s ease-in-out infinite" }}/>
        <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,.35),transparent)" }}/>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1160, margin: "0 auto", padding: "72px 24px 100px" }}>

        {/* ── Hero ── */}
        <div ref={heroRef} style={{ textAlign: "center", marginBottom: 60 }}>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 28, opacity: heroVis ? 1 : 0, transition: "opacity .5s" }}>
            <Link href="/" style={{ fontSize: 12, color: "rgba(255,255,255,.25)", textDecoration: "none", fontWeight: 500, transition: "color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.25)")}>Home</Link>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontWeight: 500 }}>Documentation</span>
          </div>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "5px 16px", borderRadius: 100, marginBottom: 22,
            background: "rgba(99,102,241,.1)", border: "1.5px solid rgba(99,102,241,.28)",
            fontSize: 10.5, fontWeight: 700, color: "#a5b4fc", letterSpacing: ".09em",
            opacity: heroVis ? 1 : 0, transition: "all .5s ease .1s",
            transform: heroVis ? "translateY(0)" : "translateY(12px)",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "blink 2s ease infinite" }}/>
            FINOVA DOCUMENTATION
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "'Lora',serif",
            fontSize: "clamp(32px,5vw,58px)",
            fontWeight: 700, lineHeight: 1.1,
            letterSpacing: "-2px", color: "white",
            marginBottom: 16,
            opacity: heroVis ? 1 : 0,
            transform: heroVis ? "translateY(0)" : "translateY(18px)",
            transition: "all .6s ease .15s",
          }}>
            Everything you need<br/>
            <span style={{ fontStyle: "italic", background: "linear-gradient(135deg,#a5b4fc,#818cf8,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              to master Finova.
            </span>
          </h1>

          <p style={{
            fontSize: 16, color: "rgba(255,255,255,.4)",
            lineHeight: 1.8, maxWidth: 500, margin: "0 auto 36px",
            opacity: heroVis ? 1 : 0,
            transform: heroVis ? "translateY(0)" : "translateY(14px)",
            transition: "all .6s ease .22s",
          }}>
            Guides, API reference, video walkthroughs, and integrations — all in one place.
          </p>

          {/* Search */}
          <div style={{
            position: "relative", maxWidth: 580, margin: "0 auto",
            opacity: heroVis ? 1 : 0,
            transition: "opacity .6s ease .3s",
          }}>
            <div style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={focused ? "#818cf8" : "rgba(255,255,255,.28)"} strokeWidth="2.2" style={{ transition: "stroke .2s" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder="Search documentation…"
              style={{
                width: "100%", padding: "16px 52px 16px 48px", borderRadius: 16,
                border: `2px solid ${focused ? "rgba(129,140,248,.55)" : "rgba(255,255,255,.1)"}`,
                background: focused ? "rgba(99,102,241,.07)" : "rgba(255,255,255,.04)",
                color: "white", fontSize: 15, fontFamily: "inherit", outline: "none",
                boxShadow: focused ? "0 0 0 4px rgba(99,102,241,.1)" : "none",
                transition: "all .25s",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.28)", fontSize: 16, padding: 4, transition: "color .2s", fontFamily: "inherit" }}
                onMouseEnter={e => (e.currentTarget.style.color = "white")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.28)")}>✕</button>
            )}

            {/* Search results */}
            {results.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, borderRadius: 14, background: "rgba(7,9,28,.97)", border: "1.5px solid rgba(129,140,248,.28)", backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,.7)", overflow: "hidden", zIndex: 50, textAlign: "left" }}>
                <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.28)", letterSpacing: ".08em", textTransform: "uppercase" }}>
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </div>
                {results.slice(0, 8).map((r, i) => (
                  <Link key={i} href={r.href}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,.05)", textDecoration: "none", transition: "background .15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => setSearch("")}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{r.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", marginTop: 1 }}>{r.section}</div>
                    </div>
                    {r.badge && <span style={{ fontSize: 9, fontWeight: 700, color: r.color, letterSpacing: ".06em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 6, background: `${r.color}18`, border: `1px solid ${r.color}30`, flexShrink: 0 }}>{r.badge}</span>}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </Link>
                ))}
                {results.length > 8 && (
                  <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 12, color: "rgba(255,255,255,.3)", textAlign: "center" }}>
                    +{results.length - 8} more results
                  </div>
                )}
              </div>
            )}
            {search.trim().length > 1 && results.length === 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, borderRadius: 14, background: "rgba(7,9,28,.97)", border: "1.5px solid rgba(255,255,255,.08)", padding: "24px", textAlign: "center", zIndex: 50 }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>🔍</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>No results for "<strong style={{ color: "white" }}>{search}</strong>"</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.22)", marginTop: 4 }}>Try different keywords</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Links ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
          gap: 10, marginBottom: 56,
        }}>
          {QUICK_LINKS.map((q, i) => (
            <Link key={i} href={q.href} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px", borderRadius: 14,
              background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
              textDecoration: "none", transition: "all .22s",
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `${q.color}10`;
                e.currentTarget.style.borderColor = `${q.color}30`;
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,.07)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{q.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.8)", marginBottom: 2 }}>{q.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.sub}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Section Heading ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Lora',serif", fontSize: 22, fontWeight: 700, color: "white", margin: 0 }}>
            Browse by Module
          </h2>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.06)" }}/>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.25)", fontWeight: 500 }}>{SECTIONS.length} sections</span>
        </div>

        {/* ── Section Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 18, marginBottom: 72 }}>
          {SECTIONS.map((s, i) => <SectionCard key={s.id} s={s} i={i} />)}
        </div>

        {/* ── API Banner ── */}
        <div style={{
          borderRadius: 22,
          background: "linear-gradient(135deg,rgba(30,27,85,.85),rgba(45,43,107,.85))",
          border: "1.5px solid rgba(99,102,241,.22)",
          padding: "36px 44px",
          display: "grid", gridTemplateColumns: "1fr auto",
          gap: 32, alignItems: "center", flexWrap: "wrap",
          position: "relative", overflow: "hidden", marginBottom: 24,
        }}>
          <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg,transparent,rgba(165,180,252,.4),transparent)" }}/>
          <div style={{ position: "absolute", right: -40, top: "50%", transform: "translateY(-50%)", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.14),transparent 70%)", pointerEvents: "none" }}/>

          <div style={{ position: "relative" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 100, marginBottom: 12, background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.35)", fontSize: 10, fontWeight: 700, color: "#a5b4fc", letterSpacing: ".08em" }}>
              ⚙️ DEVELOPER API
            </div>
            <h3 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 700, color: "white", letterSpacing: "-.4px", marginBottom: 8 }}>
              Build on top of Finova
            </h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.42)", margin: 0, maxWidth: 480, lineHeight: 1.7 }}>
              Use our REST API to sync data, automate workflows, and connect Finova with your existing systems. Company-scoped API keys — no OAuth complexity.
            </p>
            <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
              {[
                { label: "REST API",    val: "JSON" },
                { label: "Auth",        val: "API Key" },
                { label: "Rate limit",  val: "1000 req/hr" },
                { label: "Versioning",  val: "v1" },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative", flexShrink: 0 }}>
            <Link href="/developers/api" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 26px", borderRadius: 12,
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              color: "white", fontWeight: 700, fontSize: 14, textDecoration: "none",
              boxShadow: "0 6px 20px rgba(99,102,241,.4)",
              transition: "all .25s", whiteSpace: "nowrap",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(99,102,241,.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,.4)"; }}
            >
              View API Reference →
            </Link>
            <Link href="/dashboard/integrations" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "12px 22px", borderRadius: 12,
              border: "1.5px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.04)",
              color: "rgba(255,255,255,.6)", fontWeight: 600, fontSize: 13, textDecoration: "none",
              transition: "all .22s", whiteSpace: "nowrap",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.08)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.04)"; e.currentTarget.style.color = "rgba(255,255,255,.6)"; }}
            >
              Generate API Key
            </Link>
          </div>
        </div>

        {/* ── Support Banner ── */}
        <div style={{
          borderRadius: 18, padding: "28px 36px",
          background: "rgba(255,255,255,.025)",
          border: "1px solid rgba(255,255,255,.07)",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 24, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(52,211,153,.1)", border: "1.5px solid rgba(52,211,153,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>💬</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,.85)", marginBottom: 3 }}>Can't find what you're looking for?</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)" }}>Our support team typically responds within 2 hours.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/support" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 22px", borderRadius: 11, background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", fontWeight: 700, fontSize: 13, textDecoration: "none", boxShadow: "0 4px 16px rgba(99,102,241,.35)", transition: "all .22s" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
            >
              Open a Ticket →
            </Link>
            <Link href="/help" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.6)", fontWeight: 600, fontSize: 13, textDecoration: "none", transition: "all .22s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.08)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.04)"; e.currentTarget.style.color = "rgba(255,255,255,.6)"; }}
            >
              Browse Help Center
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
