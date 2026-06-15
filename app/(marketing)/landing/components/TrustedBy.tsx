"use client";
import { useEffect, useRef, useState } from "react";

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
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

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
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .trust-scroll { animation: scroll-left 30s linear infinite; }
        .trust-scroll:hover { animation-play-state: paused; }
        @media(max-width:640px){.trust-stats{grid-template-columns:repeat(2,1fr) !important;}}
      `}</style>

      <div ref={ref} style={{ maxWidth: 1160, margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          textAlign: "center", marginBottom: 40,
          opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)",
          transition: "all .5s ease",
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 16 }}>
            TRUSTED BY 500+ BUSINESSES IN 20+ COUNTRIES
          </p>

          {/* Stats row */}
          <div className="trust-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, maxWidth: 720, margin: "0 auto 40px" }}>
            {[
              { n: "500+",   l: "Businesses",      color: "#818cf8" },
              { n: "20+",    l: "Countries",        color: "#34d399" },
              { n: "4.9★",   l: "Average Rating",  color: "#fbbf24" },
              { n: "Rs. 2Cr+", l: "Monthly Revenue Tracked", color: "#38bdf8" },
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

        {/* Bottom ratings */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 32, marginTop: 40, flexWrap: "wrap",
          opacity: vis ? 1 : 0, transition: "opacity .6s ease .3s",
        }}>
          {[
            { platform: "G2", rating: "4.9/5", reviews: "128 reviews", color: "#f97316" },
            { platform: "Capterra", rating: "4.8/5", reviews: "94 reviews", color: "#3b82f6" },
            { platform: "Trustpilot", rating: "4.9/5", reviews: "211 reviews", color: "#34d399" },
          ].map(r => (
            <div key={r.platform} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.3)", letterSpacing: ".06em", marginBottom: 4 }}>{r.platform}</div>
              <div style={{ display: "flex", gap: 2, justifyContent: "center", marginBottom: 4 }}>
                {[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 12, color: "#fbbf24" }}>★</span>)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: r.color }}>{r.rating}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)" }}>{r.reviews}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
