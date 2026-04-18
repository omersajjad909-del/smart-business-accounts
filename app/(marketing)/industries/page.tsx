"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { PHASE_LABELS, PHASE_COLORS } from "@/lib/businessTypes";

interface BizType {
  id: string;
  label: string;
  icon: string;
  phase: 1 | 2 | 3 | 4;
  category: string;
  description: string;
  isLive: boolean;
}

const PHASE_DESC: Record<number, string> = {
  1: "Fully operational. Sign up and get started today.",
  2: "Under active development. Launching soon.",
  3: "Designed and planned. Coming after Phase 2.",
  4: "Enterprise features. On the long-term roadmap.",
};

export default function IndustriesPage() {
  const [types, setTypes] = useState<BizType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activePhase, setActivePhase] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/public/business-types")
      .then(r => r.json())
      .then(d => { setTypes(d.types || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = types;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b => b.label.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
    }
    if (activePhase) list = list.filter(b => b.phase === activePhase);
    return list;
  }, [types, search, activePhase]);

  const byPhase = useMemo(() => {
    const map: Record<number, BizType[]> = { 1: [], 2: [], 3: [], 4: [] };
    filtered.forEach(b => map[b.phase].push(b));
    return map;
  }, [filtered]);

  const liveCount = types.filter(b => b.isLive).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#080c1e 0%,#0a0e28 50%,#060919 100%)",
      color: "white",
      fontFamily: "'Outfit','DM Sans',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Lora:ital,wght@0,700;1,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes ind-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes ind-blink { 0%,100%{opacity:1} 50%{opacity:.3} }

        .ind-card {
          border-radius: 14px;
          padding: 16px;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.07);
          transition: all .22s;
          cursor: default;
          position: relative;
          overflow: hidden;
        }
        .ind-card:hover {
          background: rgba(255,255,255,.06);
          border-color: rgba(255,255,255,.14);
          transform: translateY(-2px);
        }
        .ind-card-live {
          border-color: rgba(52,211,153,.2);
          background: rgba(52,211,153,.04);
        }
        .ind-card-live:hover {
          border-color: rgba(52,211,153,.4);
          background: rgba(52,211,153,.08);
        }
        .ind-filter-btn {
          padding: 7px 16px; border-radius: 100px; font-size: 12px;
          font-weight: 600; border: 1px solid rgba(255,255,255,.1);
          background: transparent; color: rgba(255,255,255,.45);
          cursor: pointer; transition: all .18s; font-family: 'Outfit',sans-serif;
          white-space: nowrap;
        }
        .ind-filter-btn:hover { border-color: rgba(255,255,255,.25); color: rgba(255,255,255,.75); }
        .ind-filter-btn.active { color: white; border-color: currentColor; }

        .ind-search {
          background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px; padding: 10px 16px; color: white;
          font-size: 13.5px; font-family: 'Outfit',sans-serif; width: 100%; max-width: 360px;
          outline: none; transition: border-color .2s;
        }
        .ind-search::placeholder { color: rgba(255,255,255,.3); }
        .ind-search:focus { border-color: rgba(99,102,241,.5); }

        @media (max-width: 600px) {
          .ind-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 400px) {
          .ind-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Hero */}
      <section style={{ padding: "90px 24px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)", backgroundSize: "48px 48px" }}/>
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.1),transparent 65%)", top: -150, right: -80 }}/>
          <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,.5),transparent)" }}/>
        </div>

        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 100, background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.25)", marginBottom: 22 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", animation: "ind-blink 2s ease infinite" }}/>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6ee7b7", letterSpacing: ".1em", textTransform: "uppercase" }}>
              {liveCount} Industries Live Now
            </span>
          </div>

          <h1 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(32px,5vw,56px)", fontWeight: 700, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16 }}>
            Built for every business.
            <span style={{ display: "block", fontStyle: "italic", background: "linear-gradient(135deg,#a5b4fc,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Launching phase by phase.
            </span>
          </h1>

          <p style={{ fontSize: 16, color: "rgba(255,255,255,.45)", lineHeight: 1.8, marginBottom: 36, maxWidth: 560, margin: "0 auto 36px" }}>
            FinovaOS is expanding to cover 61 industry types. Phase 1 is live — more coming soon. Click any live business to get started.
          </p>

          {/* Stats row */}
          <div style={{ display: "flex", justifyContent: "center", gap: 0, flexWrap: "wrap", marginBottom: 8 }}>
            {([1,2,3,4] as const).map((ph, i) => {
              const count = types.filter(b => b.phase === ph).length;
              const color = PHASE_COLORS[ph];
              return (
                <div key={ph} style={{ padding: "10px 22px", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                  <div style={{ fontFamily: "'Lora',serif", fontSize: 22, fontWeight: 700, color }}>{count}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 2 }}>Phase {ph}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Filters */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 36px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="ind-search"
            placeholder="Search business type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className={`ind-filter-btn${activePhase === null ? " active" : ""}`} style={{ color: activePhase === null ? "white" : undefined }} onClick={() => setActivePhase(null)}>
            All Phases
          </button>
          {([1,2,3,4] as const).map(ph => (
            <button
              key={ph}
              className={`ind-filter-btn${activePhase === ph ? " active" : ""}`}
              style={{ color: activePhase === ph ? PHASE_COLORS[ph] : undefined, borderColor: activePhase === ph ? PHASE_COLORS[ph] : undefined }}
              onClick={() => setActivePhase(activePhase === ph ? null : ph)}
            >
              Phase {ph}
            </button>
          ))}
        </div>
      </div>

      {/* Phase sections */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,.3)", fontSize: 14 }}>Loading...</div>
        ) : (
          ([1,2,3,4] as const).map(phase => {
            const list = byPhase[phase];
            if (!list.length) return null;
            const color = PHASE_COLORS[phase];
            const isLivePhase = phase === 1;

            return (
              <div key={phase} style={{ marginBottom: 64 }}>
                {/* Phase header */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 4, height: 22, borderRadius: 2, background: color }}/>
                    <h2 style={{ fontFamily: "'Lora',serif", fontSize: 20, fontWeight: 700, color: "white", margin: 0, letterSpacing: "-.3px" }}>
                      {PHASE_LABELS[phase]}
                    </h2>
                  </div>
                  {isLivePhase && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 100, background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.25)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399", animation: "ind-blink 2s ease infinite" }}/>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "#6ee7b7" }}>LIVE</span>
                    </div>
                  )}
                  <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.3)", marginLeft: 4 }}>{PHASE_DESC[phase]}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11.5, color: "rgba(255,255,255,.22)", fontWeight: 600 }}>{list.length} industries</span>
                </div>

                {/* Cards grid */}
                <div className="ind-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                  {list.map(b => {
                    const isLive = b.isLive;
                    const card = (
                      <div
                        key={b.id}
                        className={`ind-card${isLive ? " ind-card-live" : ""}`}
                      >
                        {/* Live dot */}
                        {isLive && (
                          <div style={{ position: "absolute", top: 10, right: 10, width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,.7)" }}/>
                        )}
                        {!isLive && (
                          <div style={{ position: "absolute", top: 9, right: 10, fontSize: 9, fontWeight: 700, color: `${color}99`, letterSpacing: ".06em", textTransform: "uppercase" }}>
                            Soon
                          </div>
                        )}

                        <div style={{ fontSize: 26, marginBottom: 10 }}>{b.icon}</div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: isLive ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.55)", marginBottom: 5, lineHeight: 1.3 }}>
                          {b.label}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", lineHeight: 1.6, marginBottom: isLive ? 12 : 0 }}>
                          {b.description}
                        </div>

                        {isLive && (
                          <Link
                            href={`/pricing`}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              fontSize: 11.5, fontWeight: 700, color: "#34d399",
                              textDecoration: "none", marginTop: 2,
                              padding: "5px 10px", borderRadius: 7,
                              background: "rgba(52,211,153,.1)",
                              border: "1px solid rgba(52,211,153,.2)",
                              transition: "all .18s",
                            }}
                          >
                            Get Started →
                          </Link>
                        )}
                      </div>
                    );
                    return card;
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* No results */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <p style={{ color: "rgba(255,255,255,.35)", fontSize: 14 }}>No business type found for &quot;{search}&quot;</p>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "48px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.3)", marginBottom: 8 }}>Don&apos;t see your industry?</p>
        <a href="mailto:finovaos.app@gmail.com" style={{ fontSize: 14, fontWeight: 700, color: "#818cf8", textDecoration: "none" }}>
          Contact us — we&apos;ll add it to the roadmap →
        </a>
      </div>
    </div>
  );
}
