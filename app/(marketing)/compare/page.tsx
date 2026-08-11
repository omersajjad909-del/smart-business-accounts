"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ROWS, COMPETITORS, RIVALS, type Val } from "./_data";

function Cell({ val, highlight }: { val: Val; highlight?: boolean }) {
  const cls = "col";
  if (val === true)  return <td className={cls} style={{ textAlign: "center", padding: "10px 14px" }}><span style={{ color: highlight ? "#34d399" : "#4ade80", fontSize: 16 }}>✓</span></td>;
  if (val === false) return <td className={cls} style={{ textAlign: "center", padding: "10px 14px" }}><span style={{ color: "#374151", fontSize: 14 }}>—</span></td>;
  if (typeof val === "string" && val !== "") return <td className={cls} style={{ textAlign: "center", padding: "10px 14px", fontSize: 12, color: highlight ? "#fbbf24" : "#6b7280", fontWeight: 600 }}>{val}</td>;
  return <td className={cls} style={{ padding: "10px 14px" }} />;
}

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.05 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, vis };
}

export default function ComparePage() {
  const { ref, vis } = useInView();
  const [search, setSearch] = useState("");

  const filtered = ROWS.filter(r => r.category || r.feature.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#04061a 0%,#080c2a 60%,#04061a 100%)", fontFamily: "'Outfit','Inter',sans-serif", color: "#e2e8f0" }}>
      <div style={{ padding: "20px 32px" }}>
        <Link href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 14 }}>← Back to FinovaOS</Link>
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "60px 24px 48px", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "inline-block", background: "rgba(129,140,248,.12)", border: "1px solid rgba(129,140,248,.3)", color: "#818cf8", padding: "5px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          FinovaOS vs Competitors
        </div>
        <h1 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 800, margin: "0 0 14px", lineHeight: 1.2 }}>
          How does FinovaOS compare?
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 16, marginBottom: 32 }}>
          An honest comparison of FinovaOS vs Xero, Zoho Books, Wave, and QuickBooks — feature by feature.
        </p>

        {/* Win badges */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
          {[
            { icon: "🤖", label: "7 AI features — more than all competitors combined" },
            { icon: "🌍", label: "Multi-region: PKR · AED · SAR · USD & more" },
            { icon: "👥", label: "Unlimited users — no per-seat fees" },
          ].map(b => (
            <div key={b.label} style={{ background: "rgba(129,140,248,.08)", border: "1px solid rgba(129,140,248,.2)", borderRadius: 12, padding: "8px 14px", fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{b.icon}</span> {b.label}
            </div>
          ))}
        </div>

        {/* Head-to-head links. The five-column table below is good for
            browsing, but someone searching for one specific rival needs a page
            about exactly that pairing. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 30 }}>
          {RIVALS.map(r => (
            <Link key={r.slug} href={`/compare/${r.slug}`} style={{
              display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
              background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)",
              borderRadius: 12, padding: "13px 15px",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, color: "#94a3b8",
              }}>{r.logo}</div>
              <span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600 }}>vs {r.name}</span>
            </Link>
          ))}
        </div>

        {/* Search */}
        <input
          placeholder="Search features…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 400, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "#e2e8f0", padding: "10px 16px", fontSize: 14, outline: "none", fontFamily: "inherit" }}
        />
      </div>

      {/* Table */}
      <div ref={ref} className="cmp-wrap" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 12px 60px", opacity: vis ? 1 : 0, transition: "opacity .5s" }}>
        <style>{`
          .cmp-scroll{overflow-x:auto;border-radius:20px;border:1px solid rgba(255,255,255,.08);background:#070a22;}
          .cmp-table{width:100%;border-collapse:collapse;background:#070a22;}
          .cmp-table th,.cmp-table td{border-bottom:1px solid rgba(255,255,255,.04);}

          @media(max-width:780px){
            .cmp-wrap{padding:0 8px 40px !important;}
            .cmp-table{min-width:640px;}
            .cmp-table th.feat-col,.cmp-table td.feat-col{min-width:150px;}
            .cmp-table th.col,.cmp-table td.col{min-width:80px;}
            .cmp-table td{padding:9px 8px !important;font-size:12px !important;}
            .cmp-table th{padding:12px 8px !important;font-size:12px !important;}
            .cmp-hint{display:flex !important;}
          }
          .cmp-hint{display:none;align-items:center;gap:6px;justify-content:center;color:#475569;font-size:11px;margin-top:8px;}
        `}</style>

        <div className="cmp-hint">← swipe to compare Xero · Zoho · Wave · QuickBooks →</div>

        <div className="cmp-scroll">
          <table className="cmp-table">
            <thead>
              <tr style={{ background: "rgba(99,102,241,.1)" }}>
                <th className="feat-col" style={{ textAlign: "left", padding: "16px 20px", fontWeight: 700, fontSize: 14, width: "35%" }}>Feature</th>
                {COMPETITORS.map(c => (
                  <th key={c.key} className="col" style={{ textAlign: "center", padding: "16px 14px", fontWeight: 700, fontSize: 13 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: c.highlight ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: c.highlight ? "#fff" : "#64748b" }}>
                        {c.logo}
                      </div>
                      <span style={{ color: c.highlight ? "#818cf8" : "#64748b", fontSize: 12 }}>{c.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                if (row.category) {
                  return (
                    <tr key={i} className="cat-row" style={{ background: "rgba(255,255,255,.03)" }}>
                      <td className="feat-col" colSpan={1} style={{ padding: "12px 20px", fontSize: 13, fontWeight: 700, color: "#64748b", letterSpacing: ".04em", whiteSpace: "nowrap" }}>{row.feature}</td>
                      <td className="col" colSpan={5} style={{ background: "rgba(255,255,255,.03)" }} />
                    </tr>
                  );
                }
                return (
                  <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.01)" }}>
                    <td className="feat-col" style={{ padding: "10px 20px", fontSize: 14 }}>
                      {row.feature}
                      {row.note && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{row.note}</div>}
                    </td>
                    <Cell val={row.finova} highlight />
                    <Cell val={row.xero} />
                    <Cell val={row.zoho} />
                    <Cell val={row.wave} />
                    <Cell val={row.quickbooks} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: "#374151", textAlign: "center" }}>
          * Wave free plan has limited features and charges transaction fees. Data accurate as of June 2026.
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "60px 24px 100px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <h2 style={{ fontSize: 30, fontWeight: 700, margin: "0 0 12px" }}>Make the switch to FinovaOS</h2>
        <p style={{ color: "#64748b", marginBottom: 28, fontSize: 15 }}>Import your data from Xero, Zoho, or QuickBooks in minutes.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/onboarding/choose-plan" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", padding: "13px 28px", borderRadius: 12, fontWeight: 700, textDecoration: "none", fontSize: 15 }}>
            Get Started →
          </Link>
          <Link href="/pricing" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", padding: "13px 28px", borderRadius: 12, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>
            View Pricing
          </Link>
          <Link href="/roi-calculator" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", padding: "13px 28px", borderRadius: 12, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>
            Calculate ROI
          </Link>
        </div>
      </div>
    </div>
  );
}
