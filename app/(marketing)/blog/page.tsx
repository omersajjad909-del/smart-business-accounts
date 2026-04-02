"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const CATEGORIES = [
  { id: "all",        label: "All",            color: "#818cf8", bg: "#818cf820" },
  { id: "accounting", label: "Accounting",     color: "#38bdf8", bg: "#38bdf820" },
  { id: "guides",     label: "How-to Guides",  color: "#34d399", bg: "#34d39920" },
  { id: "business",   label: "Business",       color: "#fbbf24", bg: "#fbbf2420" },
  { id: "product",    label: "Product",        color: "#818cf8", bg: "#818cf820" },
  { id: "fintech",    label: "Fintech",        color: "#c4b5fd", bg: "#c4b5fd20" },
];

const FEATURED = {
  slug: "bank-reconciliation-guide",
  title: "The Complete Guide to Bank Reconciliation for SMEs in 2025",
  excerpt: "Bank reconciliation doesn't have to take days. Learn how modern businesses close their books in hours using automation, smart matching, and real-time data.",
  category: "accounting", categoryLabel: "Accounting Tips",
  author: "Nadia Qureshi", authorRole: "Head of Finance", avatar: "NQ",
  date: "March 10, 2025", readTime: "8 min read",
};

const POSTS = [
  { slug: "1", title: "How to Create and Send Professional Invoices with Finova", excerpt: "From custom templates to automatic payment reminders — get paid faster using Finova's invoicing module.", category: "guides", categoryLabel: "How-to Guides", author: "Finova Team", date: "Mar 8, 2025", readTime: "5 min", color: "#34d399", icon: "📄" },
  { slug: "2", title: "Finova HR & Payroll: Complete Setup Guide for Global Businesses", excerpt: "Social security, gratuity, tax withholding — all automated and adapts to your country's rules.", category: "guides", categoryLabel: "How-to Guides", author: "Finova Team", date: "Mar 6, 2025", readTime: "7 min", color: "#fbbf24", icon: "👥" },
  { slug: "3", title: "Using Finova CRM to Convert More Leads into Paying Customers", excerpt: "Connect your customer relationships directly to your financial data — close deals faster.", category: "product", categoryLabel: "Product Features", author: "Finova Team", date: "Mar 5, 2025", readTime: "5 min", color: "#818cf8", icon: "🎯" },
  { slug: "4", title: "Finova Inventory: Track Stock, Purchases, and Sales in Real Time", excerpt: "Every purchase invoice updates stock automatically. Every sales invoice deducts it. No manual counting.", category: "product", categoryLabel: "Product Features", author: "Finova Team", date: "Mar 3, 2025", readTime: "6 min", color: "#38bdf8", icon: "📦" },
  { slug: "5", title: "Tax Compliance with Finova: A Complete Guide for 2025", excerpt: "Sales tax, VAT, income tax withholding — Finova generates all tax authority reports automatically.", category: "accounting", categoryLabel: "Accounting Tips", author: "Finova Team", date: "Mar 1, 2025", readTime: "8 min", color: "#c4b5fd", icon: "📊" },
  { slug: "6", title: "Multi-Branch Accounting: One Dashboard, Every Location", excerpt: "Manage New York, London, and Dubai from one Finova account. Consolidated reports in one click.", category: "business", categoryLabel: "Business Growth", author: "Finova Team", date: "Feb 27, 2025", readTime: "6 min", color: "#f9a8d4", icon: "🌍" },
  { slug: "7", title: "How to Use Finova's Quotation Module to Close Deals Faster", excerpt: "Create professional quotes in minutes and convert them to invoices with one click — no re-entry.", category: "guides", categoryLabel: "How-to Guides", author: "Finova Team", date: "Feb 25, 2025", readTime: "5 min", color: "#38bdf8", icon: "⚡" },
  { slug: "8", title: "Finova Custom Plans: Build Your Perfect Accounting Package", excerpt: "Pay only for the modules you use. Accounting, CRM, HR, Inventory — pick and choose.", category: "product", categoryLabel: "Product Features", author: "Finova Team", date: "Feb 22, 2025", readTime: "4 min", color: "#c4b5fd", icon: "🧩" },
  { slug: "9", title: "Finova Reports: Every Financial Report Your Business Needs", excerpt: "P&L, Balance Sheet, Aging, Tax reports — all in one place, jurisdiction-ready for 40+ countries.", category: "accounting", categoryLabel: "Accounting Tips", author: "Finova Team", date: "Feb 20, 2025", readTime: "6 min", color: "#fbbf24", icon: "📈" },
];

const catColor = (id: string) => CATEGORIES.find(c => c.id === id)?.color || "#818cf8";
const catBg    = (id: string) => CATEGORIES.find(c => c.id === id)?.bg    || "#818cf820";

export default function BlogPage() {
  const [active,  setActive]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const filtered = POSTS.filter(p =>
    (active === "all" || p.category === active) &&
    (!search || p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <main style={{ minHeight: "100vh", background: "#06071a", color: "white", fontFamily: "'DM Sans',system-ui,sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .blog-card { background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.07); border-radius: 20px; overflow: hidden; transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease; }
        .blog-card:hover { transform: translateY(-5px); box-shadow: 0 20px 60px rgba(0,0,0,.4); }
        .cat-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 20px; font-size: 10px; font-weight: 800; letter-spacing: .05em; }
        .filter-btn { padding: 8px 18px; border-radius: 24px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid transparent; transition: all .18s ease; }
        .newsletter-input { flex: 1; padding: 13px 16px; border-radius: 12px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: white; font-size: 13px; outline: none; transition: border-color .2s; }
        .newsletter-input:focus { border-color: rgba(99,102,241,.5); }
        ::placeholder { color: rgba(255,255,255,.25); }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{ padding: "110px 24px 56px", textAlign: "center", position: "relative" }}>
        {/* Ambient glow */}
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: "radial-gradient(ellipse at 50% 0%,rgba(99,102,241,.18) 0%,transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 620, margin: "0 auto", position: "relative", zIndex: 1, opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(20px)", transition: "opacity .6s ease, transform .6s ease" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px 5px 8px", borderRadius: 24, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)", marginBottom: 24 }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✦</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#818cf8", letterSpacing: ".08em" }}>FINOVA BLOG</span>
          </div>

          <h1 style={{ fontSize: "clamp(32px,5vw,54px)", fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1.1, fontFamily: "Lora,serif", margin: "0 0 16px" }}>
            Ideas that help your
            <span style={{ display: "block", backgroundImage: "linear-gradient(90deg,#818cf8 0%,#c4b5fd 50%,#38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              business grow
            </span>
          </h1>

          <p style={{ fontSize: 16, color: "rgba(255,255,255,.45)", lineHeight: 1.8, maxWidth: 440, margin: "0 auto 32px" }}>
            Accounting tips, product updates, fintech trends, and real stories from businesses worldwide.
          </p>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: 400, margin: "0 auto" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, opacity: .4 }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search articles..."
              style={{ width: "100%", padding: "13px 18px 13px 40px", borderRadius: 14, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "white", fontSize: 13, outline: "none" }}
            />
          </div>
        </div>
      </section>

      {/* ── Featured Article ─────────────────────────────── */}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 52px" }}>
        <Link href={`/blog/${FEATURED.slug}`} style={{ textDecoration: "none", display: "block" }}>
          <div className="blog-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 300, borderColor: "rgba(99,102,241,.2)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,.45)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-5px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,.2)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
            {/* Left: image area */}
            <div style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 100%)", position: "relative", overflow: "hidden", minHeight: 260 }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 70% 30%,rgba(129,140,248,.3) 0%,transparent 60%), radial-gradient(circle at 20% 80%,rgba(196,181,253,.15) 0%,transparent 50%)" }} />
              {/* Decorative grid lines */}
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .08 }} xmlns="http://www.w3.org/2000/svg">
                <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
                <rect width="100%" height="100%" fill="url(#g)"/>
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 72, filter: "drop-shadow(0 0 30px rgba(129,140,248,.5))" }}>📊</span>
              </div>
              {/* Featured badge */}
              <div style={{ position: "absolute", top: 20, left: 20, padding: "5px 12px", borderRadius: 20, background: "rgba(255,255,255,.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.2)", fontSize: 10, fontWeight: 800, color: "white", letterSpacing: ".06em" }}>★ FEATURED</div>
            </div>

            {/* Right: content */}
            <div style={{ padding: "36px 40px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
              <span className="cat-pill" style={{ color: "#818cf8", background: "#818cf820", alignSelf: "flex-start" }}>
                {FEATURED.categoryLabel.toUpperCase()}
              </span>
              <h2 style={{ fontSize: "clamp(18px,2.2vw,26px)", fontWeight: 800, color: "white", letterSpacing: "-.02em", lineHeight: 1.3, margin: 0, fontFamily: "Lora,serif" }}>
                {FEATURED.title}
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.75, margin: 0 }}>
                {FEATURED.excerpt}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0 }}>NQ</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.85)" }}>{FEATURED.author}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{FEATURED.date} · {FEATURED.readTime}</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#818cf8" }}>
                  Read more <span>→</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Category Filters ─────────────────────────────── */}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 28px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.25)", letterSpacing: ".06em", marginRight: 4 }}>FILTER</span>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setActive(c.id)} className="filter-btn"
              style={{
                background: active === c.id ? c.bg : "rgba(255,255,255,.04)",
                color: active === c.id ? c.color : "rgba(255,255,255,.35)",
                borderColor: active === c.id ? `${c.color}40` : "rgba(255,255,255,.06)",
              }}>
              {c.label}
            </button>
          ))}
          {search && (
            <button onClick={() => setSearch("")} className="filter-btn" style={{ background: "rgba(239,68,68,.1)", color: "#f87171", borderColor: "rgba(239,68,68,.2)", marginLeft: "auto" }}>
              ✕ Clear search
            </button>
          )}
        </div>
      </div>

      {/* ── Posts Grid ───────────────────────────────────── */}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.25)" }}>No articles match your search.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(310px,1fr))", gap: 22 }}>
            {filtered.map(p => (
              <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none", display: "flex", flexDirection: "column" }}>
                <article className="blog-card" style={{ flex: 1, display: "flex", flexDirection: "column" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${catColor(p.category)}45`; (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px rgba(0,0,0,.4), 0 0 0 1px ${catColor(p.category)}20`; (e.currentTarget as HTMLElement).style.transform = "translateY(-5px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.07)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>

                  {/* Card image area */}
                  <div style={{ height: 130, background: `linear-gradient(135deg,${p.color}18 0%,${p.color}08 100%)`, position: "relative", overflow: "hidden", borderBottom: `1px solid ${p.color}15` }}>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 80% 20%,${p.color}25 0%,transparent 55%)` }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: "linear-gradient(to top,rgba(6,7,26,.9),transparent)" }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 44, filter: `drop-shadow(0 0 16px ${p.color}60)` }}>{p.icon}</span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "20px 22px 22px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="cat-pill" style={{ color: catColor(p.category), background: catBg(p.category) }}>
                        {p.categoryLabel.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,.2)", marginLeft: "auto" }}>{p.readTime}</span>
                    </div>

                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,.92)", lineHeight: 1.5, margin: 0, fontFamily: "Lora,serif", flex: 1 }}>
                      {p.title}
                    </h3>

                    <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.35)", lineHeight: 1.7, margin: 0 }}>
                      {p.excerpt}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.05)", marginTop: "auto" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,.25)", fontWeight: 600 }}>{p.date}</span>
                      <span style={{ fontSize: 12, color: catColor(p.category), fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        Read <span style={{ transition: "transform .2s" }}>→</span>
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {/* ── Newsletter ───────────────────────────────────── */}
        <div style={{ marginTop: 64, borderRadius: 24, overflow: "hidden", position: "relative" }}>
          {/* Background */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(79,70,229,.15) 0%,rgba(124,58,237,.08) 50%,rgba(56,189,248,.06) 100%)", border: "1px solid rgba(99,102,241,.18)", borderRadius: 24 }} />
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.15) 0%,transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: -30, left: 60, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle,rgba(56,189,248,.1) 0%,transparent 70%)" }} />

          <div style={{ position: "relative", zIndex: 1, padding: "48px 40px", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 20px" }}>📬</div>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: "white", fontFamily: "Lora,serif", margin: "0 0 10px" }}>
              Stay ahead of the curve
            </h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", margin: "0 auto 28px", maxWidth: 380, lineHeight: 1.75 }}>
              Weekly digest — best articles, product updates, and tips. No spam, ever. Unsubscribe anytime.
            </p>
            <div style={{ display: "flex", gap: 10, maxWidth: 440, margin: "0 auto" }}>
              <input placeholder="your@email.com" className="newsletter-input" />
              <button style={{ padding: "13px 24px", borderRadius: 12, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
                Subscribe →
              </button>
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,.2)", marginTop: 14 }}>
              Joined by 4,200+ business owners · Unsubscribe anytime
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
