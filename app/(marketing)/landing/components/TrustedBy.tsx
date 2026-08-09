"use client";

const COMPANIES = [
  { name: "Al-Raza Traders",       initials: "AR", color: "#6366f1", city: "Karachi" },
  { name: "Gulf Star Trading",      initials: "GS", color: "#10b981", city: "Dubai" },
  { name: "Metro Wholesale",        initials: "MW", color: "#f59e0b", city: "Lahore" },
  { name: "MedPlus Pharmacy",       initials: "MP", color: "#3b82f6", city: "Islamabad" },
  { name: "Sheikh Distributors",    initials: "SD", color: "#ec4899", city: "Lahore" },
  { name: "Ali Construction Group", initials: "AC", color: "#8b5cf6", city: "Karachi" },
  { name: "Noor Retail Co.",        initials: "NR", color: "#06b6d4", city: "Faisalabad" },
  { name: "Horizon Pharma",         initials: "HP", color: "#f97316", city: "Multan" },
  { name: "Royal Traders LLC",      initials: "RT", color: "#34d399", city: "Abu Dhabi" },
  { name: "Summit Manufacturing",   initials: "SM", color: "#a78bfa", city: "Sialkot" },
  { name: "Prime Distributors",     initials: "PD", color: "#fbbf24", city: "Peshawar" },
  { name: "Star Import Export",     initials: "SI", color: "#38bdf8", city: "Karachi" },
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
            ONE PLATFORM FOR BUSINESSES WORLDWIDE — LAUNCHING NOW
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
            {[...COMPANIES, ...COMPANIES].map((c, i) => (
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
                  fontSize: 11, fontWeight: 800, color: c.color,
                }}>
                  {c.initials}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>{c.city}</div>
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
