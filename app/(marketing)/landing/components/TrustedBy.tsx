"use client";

/* This strip used to scroll twelve "customer" companies with names and cities
   — Al-Raza Traders, Gulf Star Trading, Royal Traders LLC and so on. None of
   them are customers, and a buyer who searches one finds nothing. The marquee
   now carries what the platform actually ships, which needs no vouching. */
const CAPABILITIES = [
  { name: "Double-Entry Accounting", icon: "📒", color: "#6366f1", sub: "Ledger · Trial Balance" },
  { name: "Invoicing & Billing",     icon: "🧾", color: "#10b981", sub: "Quotes · Credit Notes" },
  { name: "Inventory",               icon: "📦", color: "#f59e0b", sub: "Multi-warehouse · GRN" },
  { name: "Bank Reconciliation",     icon: "🏦", color: "#3b82f6", sub: "Statement matching" },
  { name: "HR & Payroll",            icon: "👥", color: "#ec4899", sub: "Payslips · EOBI" },
  { name: "Multi-Branch",            icon: "🏢", color: "#8b5cf6", sub: "Per-branch P&L" },
  { name: "Multi-Currency",          icon: "🌍", color: "#06b6d4", sub: "PKR · AED · USD" },
  { name: "Tax Ready",               icon: "🧮", color: "#f97316", sub: "GST · VAT · WHT" },
  { name: "Purchase Orders",         icon: "🛒", color: "#34d399", sub: "PO · GRN matching" },
  { name: "CRM & Follow-ups",        icon: "💬", color: "#a78bfa", sub: "Leads · Receivables" },
  { name: "Real-Time Reports",       icon: "📊", color: "#fbbf24", sub: "P&L · Balance Sheet" },
  { name: "Role-Based Access",       icon: "🔐", color: "#38bdf8", sub: "Per-user permissions" },
];

export default function TrustedBy() {
  return (
    <section style={{
      background: "linear-gradient(180deg,#070a1e 0%,#080c22 100%)",
      padding: "64px 24px",
      fontFamily: "'Outfit',sans-serif",
      borderTop: "1px solid rgba(255,255,255,.05)",
      borderBottom: "1px solid rgba(255,255,255,.05)",
      overflow: "hidden",
    }}>
      <style>{`
        
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .trust-scroll { animation: scroll-left 30s linear infinite; }
        .trust-scroll:hover { animation-play-state: paused; }
        @media(max-width:640px){.trust-stats{grid-template-columns:repeat(2,1fr) !important;}}
      `}</style>

      <div style={{ maxWidth: 1160, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          {/* Customer counts, ratings and revenue-tracked figures were all
              invented while the product is pre-launch. Replaced with claims the
              platform itself backs. */}
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 16 }}>
            ONE PLATFORM, EVERY DEPARTMENT — LIVE SINCE AUGUST 2026
          </p>

          {/* Stats row */}
          <div className="trust-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, maxWidth: 720, margin: "0 auto 40px" }}>
            {[
              { n: "6",          l: "Industries Live",       color: "#818cf8" },
              { n: "Multi-currency", l: "Invoicing",         color: "#34d399" },
              { n: "GST · VAT · WHT", l: "Tax Support",      color: "#fbbf24" },
              { n: "All-in-one", l: "Accounts · HR · Stock", color: "#38bdf8" },
            ].map((s, i) => (
              <div key={i} style={{
                padding: "16px 12px", textAlign: "center",
                borderRight: i < 3 ? "1px solid rgba(255,255,255,.06)" : "none",
              }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color, letterSpacing: "-0.5px", marginBottom: 4 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", fontWeight: 600 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrolling logos */}
        <div style={{ overflow: "hidden", maskImage: "linear-gradient(90deg,transparent,black 10%,black 90%,transparent)", WebkitMaskImage: "linear-gradient(90deg,transparent,black 10%,black 90%,transparent)" }}>
          <div className="trust-scroll" style={{ display: "flex", gap: 16, width: "max-content" }}>
            {[...CAPABILITIES, ...CAPABILITIES].map((c, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 20px", borderRadius: 12,
                background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: `${c.color}22`, border: `1px solid ${c.color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15,
                }}>
                  {c.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* This row used to show G2 4.9/5 (128 reviews), Capterra 4.8/5 (94)
            and Trustpilot 4.9/5 (211). None of those listings or reviews exist —
            putting real review platforms' names behind invented scores is the
            one claim here a visitor can check in ten seconds, and those
            platforms act on misuse of their marks. Replaced with what the
            product actually offers on day one. */}
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 40, flexWrap: "wrap" }}>
          {[
            { title: "Try before you buy", sub: "Full live demo, no signup",   color: "#f97316" },
            { title: "Money-back",         sub: "14 days, no questions",       color: "#3b82f6" },
            { title: "Your data, exportable", sub: "Excel & PDF, anytime",     color: "#34d399" },
          ].map(r => (
            <div key={r.title} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: r.color, marginBottom: 4 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{r.sub}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
