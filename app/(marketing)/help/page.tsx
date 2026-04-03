"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const CATEGORIES = [
  {
    id: "getting-started",
    icon: "🚀",
    color: "#818cf8",
    dim: "rgba(129,140,248,.1)",
    border: "rgba(129,140,248,.28)",
    title: "Getting Started",
    desc: "Setup your account and first steps",
    articles: [
      { title: "How to create your Finova account",       time: "3 min", popular: true, slug: "create-account" },
      { title: "Choosing the right plan for your business",time: "4 min", popular: true, slug: "choose-plan" },
      { title: "Setting up your company profile",         time: "5 min",               slug: "company-profile" },
      { title: "Inviting team members & setting roles",   time: "3 min",               slug: "invite-team" },
      { title: "Connecting your bank account",            time: "6 min", popular: true, slug: "connect-bank" },
      { title: "Your first invoice — step by step",       time: "4 min",               slug: "first-invoice" },
    ],
  },
  {
    id: "invoicing",
    icon: "🧾",
    color: "#34d399",
    dim: "rgba(52,211,153,.1)",
    border: "rgba(52,211,153,.28)",
    title: "Invoicing & Billing",
    desc: "Create, send, and track invoices",
    articles: [
      { title: "Creating a sales invoice",                        time: "3 min", popular: true, slug: "create-invoice" },
      { title: "Setting up recurring invoices",                   time: "4 min",               slug: "recurring-invoices" },
      { title: "Sending invoices via email or WhatsApp",          time: "2 min",               slug: "send-invoice" },
      { title: "Recording payments & receipts",                   time: "3 min",               slug: "record-payment" },
      { title: "Creating quotations and converting to invoice",   time: "4 min",               slug: "quotation-invoice" },
      { title: "Credit notes and refunds",                        time: "3 min",               slug: "credit-notes" },
    ],
  },
  {
    id: "reports",
    icon: "📊",
    color: "#fbbf24",
    dim: "rgba(251,191,36,.1)",
    border: "rgba(251,191,36,.28)",
    title: "Reports & Analytics",
    desc: "Financial statements and insights",
    articles: [
      { title: "Understanding your P&L statement",        time: "5 min", popular: true, slug: "pl-statement" },
      { title: "Balance sheet explained",                 time: "6 min",               slug: "balance-sheet" },
      { title: "Cash flow report walkthrough",            time: "4 min",               slug: "cash-flow" },
      { title: "Tax summary and filing reports",          time: "5 min", popular: true, slug: "tax-summary" },
      { title: "Exporting reports to PDF & Excel",        time: "2 min",               slug: "export-reports" },
      { title: "Scheduling automated report emails",      time: "3 min",               slug: "scheduled-reports" },
    ],
  },
  {
    id: "banking",
    icon: "🏦",
    color: "#a78bfa",
    dim: "rgba(167,139,250,.1)",
    border: "rgba(167,139,250,.28)",
    title: "Banking & Reconciliation",
    desc: "Sync and reconcile your accounts",
    articles: [
      { title: "How bank reconciliation works",           time: "6 min", popular: true, slug: "bank-reconciliation" },
      { title: "Importing bank statements (CSV/Excel)",   time: "4 min",               slug: "import-statements" },
      { title: "Matching transactions automatically",     time: "3 min",               slug: "match-transactions" },
      { title: "Handling unmatched transactions",         time: "4 min",               slug: "unmatched-transactions" },
      { title: "Setting up multiple bank accounts",       time: "3 min",               slug: "multiple-accounts" },
      { title: "Cash payment vouchers (CPV)",             time: "3 min",               slug: "cpv" },
    ],
  },
  {
    id: "inventory",
    icon: "📦",
    color: "#06b6d4",
    dim: "rgba(6,182,212,.1)",
    border: "rgba(6,182,212,.28)",
    title: "Inventory & Stock",
    desc: "Manage products and stock levels",
    articles: [
      { title: "Adding products and services",                time: "3 min",               slug: "add-products" },
      { title: "Setting stock alert levels",                  time: "2 min",               slug: "stock-alerts" },
      { title: "Stock in / stock out entries",                time: "3 min",               slug: "stock-entries" },
      { title: "Inventory valuation methods (FIFO/LIFO)",     time: "5 min", popular: true, slug: "inventory-valuation" },
      { title: "Stock transfer between branches",             time: "4 min",               slug: "stock-transfer" },
      { title: "Generating stock reports",                    time: "2 min",               slug: "stock-reports" },
    ],
  },
  {
    id: "account",
    icon: "⚙️",
    color: "#f87171",
    dim: "rgba(248,113,113,.1)",
    border: "rgba(248,113,113,.28)",
    title: "Account & Billing",
    desc: "Manage your subscription and settings",
    articles: [
      { title: "Upgrading or downgrading your plan",  time: "3 min",               slug: "upgrade-plan" },
      { title: "Updating payment method",             time: "2 min",               slug: "update-payment" },
      { title: "Downloading invoices and receipts",   time: "2 min",               slug: "download-invoices" },
      { title: "Cancelling your subscription",        time: "3 min",               slug: "cancel-subscription" },
      { title: "Data export and backup",              time: "4 min",               slug: "data-export" },
      { title: "Deleting your account",               time: "3 min",               slug: "delete-account" },
    ],
  },
];

const POPULAR = CATEGORIES.flatMap(c =>
  c.articles.filter(a => a.popular).map(a => ({ ...a, category: c.title, color: c.color, icon: c.icon, categoryId: c.id }))
).slice(0, 6);

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

function CategoryCard({ cat, index }: { cat: typeof CATEGORIES[0]; index: number }) {
  const [ref, visible] = useVisible();
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = expanded ? cat.articles : cat.articles.slice(0, 4);

  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `all .6s cubic-bezier(.22,1,.36,1) ${index * 70}ms`,
      borderRadius: 20, overflow: "hidden",
      background: "rgba(255,255,255,.03)",
      border: "1.5px solid rgba(255,255,255,.07)",
      backdropFilter: "blur(16px)",
      position: "relative",
    }}>
      {/* Color accent top line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${cat.color}, transparent)` }}/>

      <div style={{ padding: "22px 22px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: cat.dim, border: `1.5px solid ${cat.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>{cat.icon}</div>
          <div>
            <h3 style={{ fontFamily: "'Lora',serif", fontSize: 16, fontWeight: 700, color: "white", marginBottom: 3 }}>{cat.title}</h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", fontWeight: 400 }}>{cat.desc}</p>
          </div>
          <div style={{
            marginLeft: "auto", padding: "3px 10px", borderRadius: 12, flexShrink: 0,
            background: cat.dim, border: `1px solid ${cat.border}`,
            fontSize: 10.5, fontWeight: 700, color: cat.color,
          }}>{cat.articles.length} articles</div>
        </div>

        {/* Articles list — each item is a Link */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
          {shown.map((a, i) => (
            <Link
              key={a.slug}
              href={`/help/${a.slug}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 10,
                background: hovered === i ? cat.dim : "transparent",
                border: `1px solid ${hovered === i ? cat.border : "transparent"}`,
                transition: "all .2s", textDecoration: "none",
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke={hovered === i ? cat.color : "rgba(255,255,255,.2)"} strokeWidth="2.5"
                style={{ flexShrink: 0, transition: "stroke .2s" }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={{ flex: 1, fontSize: 13, color: hovered === i ? "white" : "rgba(255,255,255,.6)", fontWeight: 500, transition: "color .2s" }}>
                {a.title}
              </span>
              {a.popular && (
                <span style={{ fontSize: 9, fontWeight: 700, color: cat.color, background: cat.dim, border: `1px solid ${cat.border}`, padding: "2px 7px", borderRadius: 8, letterSpacing: ".06em", textTransform: "uppercase", flexShrink: 0 }}>
                  Popular
                </span>
              )}
              <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.2)", flexShrink: 0, fontWeight: 500 }}>{a.time}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke={hovered === i ? cat.color : "rgba(255,255,255,.15)"} strokeWidth="2.5"
                style={{ flexShrink: 0, transition: "stroke .2s" }}>
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {cat.articles.length > 4 && (
        <button onClick={() => setExpanded(e => !e)} style={{
          width: "100%", padding: "12px", background: "rgba(255,255,255,.02)",
          borderTop: "1px solid rgba(255,255,255,.06)", border: "none",
          color: cat.color, fontSize: 12, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit", letterSpacing: ".04em", transition: "background .2s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}
          onMouseEnter={e => (e.currentTarget.style.background = cat.dim)}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.02)")}
        >
          {expanded ? "Show less ↑" : `View all ${cat.articles.length} articles ↓`}
        </button>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [heroRef, heroVisible] = useVisible(0.15);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = search.trim().length > 1
    ? CATEGORIES.flatMap(c => c.articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase())).map(a => ({ ...a, category: c.title, color: c.color, icon: c.icon, categoryId: c.id })))
    : [];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#080c1e 0%,#0c0f2e 30%,#080c1e 100%)",
      color: "white", fontFamily: "'Outfit','DM Sans',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Lora:ital,wght@0,700;1,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orbDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(16px,-14px)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        input::placeholder{color:rgba(255,255,255,.22);}
      `}</style>

      {/* BG */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)", backgroundSize: "48px 48px" }}/>
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.1),transparent 65%)", top: -150, left: "50%", transform: "translateX(-50%)", animation: "orbDrift 14s ease-in-out infinite" }}/>
        <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,.4),transparent)" }}/>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "72px 24px 100px" }}>

        {/* HERO */}
        <div ref={heroRef} style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 28, opacity: heroVisible ? 1 : 0, transition: "opacity .5s ease" }}>
            <Link href="/" style={{ fontSize: 12, color: "rgba(255,255,255,.28)", textDecoration: "none", fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.28)")}>Home</Link>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontWeight: 500 }}>Help Center</span>
          </div>

          <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(20px)", transition: "all .6s ease .08s" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 22, background: "rgba(99,102,241,.1)", border: "1.5px solid rgba(99,102,241,.28)", fontSize: 10.5, fontWeight: 700, color: "#a5b4fc", letterSpacing: ".09em", textTransform: "uppercase", marginBottom: 20 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#6366f1", animation: "blink 2s ease infinite" }}/>
              Help & Documentation
            </div>

            <h1 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(30px,4vw,52px)", fontWeight: 700, color: "white", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 14 }}>
              How can we
              <span style={{ display: "block", fontStyle: "italic", background: "linear-gradient(135deg,#a5b4fc,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                help you today?
              </span>
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.38)", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.7 }}>
              Browse our guides, tutorials, and FAQs to get the most out of Finova.
            </p>

            {/* Search bar */}
            <div style={{ position: "relative", maxWidth: 560, margin: "0 auto" }}>
              <div style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={searchFocused ? "#818cf8" : "rgba(255,255,255,.3)"} strokeWidth="2.2" style={{ transition: "stroke .2s" }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search articles, guides, FAQs..."
                style={{
                  width: "100%", padding: "15px 50px 15px 46px", borderRadius: 16,
                  border: `2px solid ${searchFocused ? "rgba(129,140,248,.6)" : "rgba(255,255,255,.1)"}`,
                  background: searchFocused ? "rgba(99,102,241,.08)" : "rgba(255,255,255,.04)",
                  color: "white", fontSize: 15, fontFamily: "inherit", outline: "none",
                  transition: "all .25s",
                  boxShadow: searchFocused ? "0 0 0 4px rgba(99,102,241,.1)" : "none",
                }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)", fontSize: 16, fontFamily: "inherit", padding: 4, transition: "color .2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "white")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.3)")}>✕</button>
              )}
            </div>

            {/* Search results — each result is a Link */}
            {filtered.length > 0 && (
              <div style={{ maxWidth: 560, margin: "12px auto 0", borderRadius: 14, background: "rgba(8,12,30,.97)", border: "1.5px solid rgba(129,140,248,.3)", backdropFilter: "blur(20px)", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.6)", textAlign: "left" }}>
                <div style={{ padding: "10px 14px 6px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".08em", textTransform: "uppercase" }}>
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </div>
                {filtered.map((a, i) => (
                  <Link key={i} href={`/help/${a.slug}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.05)", transition: "background .18s", textDecoration: "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 14 }}>{a.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.8)" }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", marginTop: 1 }}>{a.category} · {a.time} read</div>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </Link>
                ))}
              </div>
            )}
            {search.length > 1 && filtered.length === 0 && (
              <div style={{ maxWidth: 560, margin: "12px auto 0", padding: "24px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.4)" }}>No articles found for “<strong style={{ color: "white" }}>{search}</strong>”</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.2)", marginTop: 4 }}>Try different keywords or contact support</div>
              </div>
            )}
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap", marginBottom: 56 }}>
          {[
            { val: "50+", label: "Help Articles",     color: "#818cf8" },
            { val: "6",   label: "Categories",         color: "#34d399" },
            { val: "< 2h",label: "Support Response",   color: "#fbbf24" },
            { val: "24/7",label: "Live Chat (Pro+)",    color: "#a78bfa" },
          ].map(({ val, label, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Lora',serif", fontSize: 26, fontWeight: 700, color, letterSpacing: "-.5px" }}>{val}</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", fontWeight: 500, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* POPULAR ARTICLES — each card is a Link */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 16 }}>⭐</span>
            <h2 style={{ fontFamily: "'Lora',serif", fontSize: 20, fontWeight: 700, color: "white", margin: 0 }}>Popular Articles</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {POPULAR.map((a, i) => (
              <Link key={i} href={`/help/${a.slug}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "13px 16px", borderRadius: 12,
                  background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
                  transition: "all .22s", textDecoration: "none",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.14)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.07)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 2 }}>{a.category} · {a.time}</div>
                </div>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* CATEGORY GRID */}
        <h2 style={{ fontFamily: "'Lora',serif", fontSize: 22, fontWeight: 700, color: "white", marginBottom: 24 }}>Browse by Category</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20, marginBottom: 64 }}>
          {CATEGORIES.map((cat, i) => <CategoryCard key={cat.id} cat={cat} index={i} />)}
        </div>

        {/* CONTACT SUPPORT BANNER */}
        <div style={{
          borderRadius: 22, padding: "36px 40px",
          background: "linear-gradient(135deg,rgba(45,43,107,.8),rgba(30,27,85,.8))",
          border: "1px solid rgba(165,180,252,.2)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 16px 48px rgba(99,102,241,.2)",
          display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg,transparent,rgba(165,180,252,.5),transparent)" }}/>

          <div>
            <div style={{ fontFamily: "'Lora',serif", fontSize: 22, fontWeight: 700, color: "white", marginBottom: 8 }}>
              Still need help?
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", lineHeight: 1.7, maxWidth: 480 }}>
              Our support team is here for you. Reach out via live chat, email, or WhatsApp — we typically respond within 2 hours.
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
              {[
                { icon: "💬", label: "Live Chat", sub: "Pro & Enterprise", color: "#818cf8" },
                { icon: "✉️", label: "Email Us",  sub: "finovaos.app@gmail.com", color: "#34d399" },
                { icon: "📱", label: "WhatsApp",  sub: "+1 (800) 555-0200",  color: "#fbbf24" },
              ].map(({ icon, label, sub, color }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,.75)" }}>{label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
            <Link href="/support" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px 24px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", fontWeight: 700, fontSize: 14, textDecoration: "none", boxShadow: "0 6px 20px rgba(99,102,241,.35)", transition: "all .25s", whiteSpace: "nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(99,102,241,.5)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,.35)"; }}
            >
              Open Support Ticket →
            </Link>
            <a href="mailto:finovaos.app@gmail.com" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 24px", borderRadius: 12, background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,.6)", fontWeight: 600, fontSize: 13, textDecoration: "none", border: "1px solid rgba(255,255,255,.1)", transition: "all .25s", whiteSpace: "nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.09)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.color = "rgba(255,255,255,.6)"; }}
            >
              ✉️ finovaos.app@gmail.com
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
