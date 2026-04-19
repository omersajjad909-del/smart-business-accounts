"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface BizType {
  id: string;
  label: string;
  icon: string;
  phase: 1 | 2 | 3 | 4;
  category: string;
  description: string;
  isLive: boolean;
}

const PHASE_META: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Live Now",   color: "#34d399", bg: "rgba(52,211,153,.15)"  },
  2: { label: "Phase 2",    color: "#818cf8", bg: "rgba(129,140,248,.12)" },
  3: { label: "Phase 3",    color: "#fbbf24", bg: "rgba(251,191,36,.12)"  },
  4: { label: "Phase 4",    color: "#f87171", bg: "rgba(248,113,113,.12)" },
};

const CATEGORY_COLORS: Record<string, string> = {
  Commerce: "#6366f1", Services: "#a78bfa", Healthcare: "#f472b6",
  Education: "#34d399", Hospitality: "#fb923c", Production: "#fbbf24",
  Logistics: "#60a5fa", Technology: "#38bdf8", Agriculture: "#4ade80",
  Finance: "#f59e0b", Corporate: "#818cf8", General: "#94a3b8",
};

function useInView(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect(); }
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, vis] as const;
}

function IndustryCard({ t, i, vis }: { t: BizType; i: number; vis: boolean }) {
  const [hov, setHov] = useState(false);
  const catColor = CATEGORY_COLORS[t.category] ?? "#818cf8";
  const liveColor = "#34d399";

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 18, padding: "22px 20px",
        background: hov
          ? "rgba(255,255,255,.07)"
          : t.isLive ? "rgba(52,211,153,.03)" : "rgba(255,255,255,.03)",
        border: `1px solid ${hov ? catColor + "50" : t.isLive ? "rgba(52,211,153,.18)" : "rgba(255,255,255,.08)"}`,
        display: "flex", flexDirection: "column", gap: 12,
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(22px)",
        transition: `opacity .5s ease ${Math.min(i, 8) * 50}ms, transform .5s ease ${Math.min(i, 8) * 50}ms, background .2s, border .2s`,
        position: "relative", overflow: "hidden",
        boxShadow: hov && t.isLive ? `0 12px 32px rgba(52,211,153,.08)` : "none",
      }}
    >
      {/* Top accent */}
      {t.isLive && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${liveColor}60,transparent)` }} />
      )}

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 34, lineHeight: 1 }}>{t.icon}</span>
        <span style={{
          padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 800,
          letterSpacing: ".05em",
          background: t.isLive ? "rgba(52,211,153,.15)" : PHASE_META[t.phase].bg,
          color: t.isLive ? "#34d399" : PHASE_META[t.phase].color,
          border: `1px solid ${t.isLive ? "rgba(52,211,153,.35)" : PHASE_META[t.phase].color + "40"}`,
        }}>
          {t.isLive ? "🟢 Live" : PHASE_META[t.phase].label}
        </span>
      </div>

      {/* Body */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "white", marginBottom: 5, lineHeight: 1.2 }}>{t.label}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", lineHeight: 1.55 }}>{t.description}</div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: CATEGORY_COLORS[t.category] ?? "#818cf8",
          background: (CATEGORY_COLORS[t.category] ?? "#818cf8") + "15",
          padding: "2px 8px", borderRadius: 10, border: `1px solid ${(CATEGORY_COLORS[t.category] ?? "#818cf8")}30`,
        }}>
          {t.category}
        </span>
        {t.isLive ? (
          <Link href={`/for/${t.id}`} style={{
            fontSize: 12, fontWeight: 700, color: "#34d399",
            textDecoration: "none", display: "flex", alignItems: "center", gap: 3,
            transition: "gap .15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.gap = "6px")}
            onMouseLeave={e => (e.currentTarget.style.gap = "3px")}
          >
            Explore <span>→</span>
          </Link>
        ) : (
          <Link href={`/for/${t.id}`} style={{
            fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.3)",
            textDecoration: "none",
          }}>
            Notify me
          </Link>
        )}
      </div>
    </div>
  );
}

export default function IndustrySelector() {
  const [ref, vis] = useInView();
  const [types, setTypes]       = useState<BizType[]>([]);
  const [filter, setFilter]     = useState<"all" | "live" | "soon">("all");
  const [phaseFilter, setPhaseFilter] = useState<number | null>(null);
  const [showAll, setShowAll]   = useState(false);

  useEffect(() => {
    fetch("/api/public/business-types")
      .then(r => r.json())
      .then(d => setTypes(d.types ?? []))
      .catch(() => {});
  }, []);

  const liveCount = types.filter(t => t.isLive).length;
  const soonCount = types.length - liveCount;

  const filtered = types.filter(t => {
    if (filter === "live" && !t.isLive)  return false;
    if (filter === "soon" &&  t.isLive)  return false;
    if (phaseFilter !== null && t.phase !== phaseFilter) return false;
    return true;
  });

  const displayed = showAll ? filtered : filtered.slice(0, 12);

  const ff = "'Outfit','DM Sans',sans-serif";

  return (
    <section style={{
      padding: "96px 24px",
      background: "linear-gradient(180deg,#080c22 0%,#0a0f2a 100%)",
      fontFamily: ff, position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @media(max-width:900px){.ind-grid{grid-template-columns:repeat(2,1fr) !important}}
        @media(max-width:520px){.ind-grid{grid-template-columns:1fr !important}}
      `}</style>

      {/* bg glow */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", left:"50%", top:-100, transform:"translateX(-50%)", width:700, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.07),transparent 65%)" }}/>
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)", backgroundSize:"52px 52px" }}/>
      </div>

      <div ref={ref} style={{ maxWidth: 1160, margin: "0 auto", position: "relative" }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: 48, opacity: vis?1:0, transform: vis?"translateY(0)":"translateY(24px)", transition: "all .65s cubic-bezier(.22,1,.36,1)" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:100, background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.25)", marginBottom:20 }}>
            <span>🌐</span>
            <span style={{ fontSize:11, fontWeight:700, color:"#818cf8", letterSpacing:".08em" }}>
              {types.length > 0 ? `${types.length} BUSINESS TYPES` : "MULTI-INDUSTRY PLATFORM"}
            </span>
          </div>
          <h2 style={{ fontSize:"clamp(28px,4vw,46px)", fontWeight:900, color:"white", letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:14, margin:"0 0 14px" }}>
            Built for{" "}
            <span style={{ background:"linear-gradient(135deg,#818cf8,#6366f1,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              every business
            </span>
          </h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.42)", lineHeight:1.7, maxWidth:520, margin:"14px auto 0" }}>
            From trading companies to schools, hospitals to restaurants — FinovaOS ships with a pre-configured setup for your exact industry.
          </p>
        </div>

        {/* ── Phase pills ── */}
        {liveCount > 0 && (
          <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:14, flexWrap:"wrap", opacity:vis?1:0, transition:"opacity .7s ease .1s" }}>
            {([null,1,2,3,4] as (number|null)[]).map(p => {
              const active = phaseFilter === p;
              const meta = p ? PHASE_META[p] : null;
              return (
                <button key={String(p)} onClick={() => setPhaseFilter(p)} style={{
                  padding:"6px 15px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer",
                  fontFamily:ff, border:"1px solid",
                  borderColor: active ? (meta?.color ?? "#6366f1") : "rgba(255,255,255,.1)",
                  background: active ? ((meta?.bg ?? "rgba(99,102,241,.2)")) : "rgba(255,255,255,.04)",
                  color: active ? (meta?.color ?? "#a5b4fc") : "rgba(255,255,255,.35)",
                  transition:"all .2s",
                }}>
                  {p === null ? "All" : PHASE_META[p].label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Filter tabs ── */}
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:40, flexWrap:"wrap", opacity:vis?1:0, transition:"opacity .7s ease .15s" }}>
          {[
            { k:"all",  label:`All (${types.length})` },
            { k:"live", label:`🟢 Live Now (${liveCount})` },
            { k:"soon", label:`⏳ Coming Soon (${soonCount})` },
          ].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k as any)} style={{
              padding:"8px 18px", borderRadius:20, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:ff, border:"1px solid", transition:"all .2s",
              borderColor: filter===f.k ? "#6366f1" : "rgba(255,255,255,.1)",
              background:  filter===f.k ? "rgba(99,102,241,.18)" : "rgba(255,255,255,.04)",
              color:       filter===f.k ? "#a5b4fc" : "rgba(255,255,255,.4)",
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Grid ── */}
        {types.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,.2)", fontSize:14 }}>Loading industries…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,.2)", fontSize:14 }}>No industries found for this filter.</div>
        ) : (
          <>
            <div className="ind-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
              {displayed.map((t, i) => <IndustryCard key={t.id} t={t} i={i} vis={vis} />)}
            </div>

            {/* Show more / less */}
            {filtered.length > 12 && (
              <div style={{ textAlign:"center", marginBottom:32 }}>
                <button onClick={() => setShowAll(v => !v)} style={{
                  padding:"10px 24px", borderRadius:12, border:"1px solid rgba(255,255,255,.12)",
                  background:"rgba(255,255,255,.05)", color:"rgba(255,255,255,.55)", fontSize:13,
                  fontWeight:700, cursor:"pointer", fontFamily:ff, transition:"all .2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,.09)"; e.currentTarget.style.color="white"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,.05)"; e.currentTarget.style.color="rgba(255,255,255,.55)"; }}
                >
                  {showAll ? "Show less ↑" : `Show all ${filtered.length} industries ↓`}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Footer CTA ── */}
        <div style={{ textAlign:"center", opacity:vis?1:0, transition:"opacity .8s ease .3s" }}>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.3)", marginBottom:16 }}>
            Can&apos;t find your industry? We&apos;re adding more every phase.
          </div>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/industries" style={{
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"12px 26px", borderRadius:12, textDecoration:"none",
              background:"rgba(99,102,241,.12)", border:"1px solid rgba(99,102,241,.3)",
              color:"#a5b4fc", fontWeight:700, fontSize:13,
            }}>
              Browse all {types.length} industries →
            </Link>
            <Link href="/pricing" style={{
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"12px 26px", borderRadius:12, textDecoration:"none",
              background:"linear-gradient(135deg,#6366f1,#4f46e5)", border:"none",
              color:"white", fontWeight:700, fontSize:13,
            }}>
              Get started today →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
