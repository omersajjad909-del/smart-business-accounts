"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Update = {
  id: string;
  title: string;
  body: string;
  type: string;
  version?: string;
  createdAt: string;
};

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  feature:      { label: "New Feature",   icon: "✨", color: "#818cf8", bg: "rgba(129,140,248,.1)",  border: "rgba(129,140,248,.25)" },
  improvement:  { label: "Improvement",   icon: "⚡", color: "#38bdf8", bg: "rgba(56,189,248,.1)",   border: "rgba(56,189,248,.25)"  },
  bugfix:       { label: "Bug Fix",        icon: "🐛", color: "#34d399", bg: "rgba(52,211,153,.1)",   border: "rgba(52,211,153,.25)"  },
  announcement: { label: "Announcement",  icon: "📣", color: "#fbbf24", bg: "rgba(251,191,36,.1)",   border: "rgba(251,191,36,.25)"  },
  maintenance:  { label: "Maintenance",   icon: "🔧", color: "#f87171", bg: "rgba(248,113,113,.1)",  border: "rgba(248,113,113,.25)" },
};
const fallback = TYPE_CONFIG.feature;

const FILTERS = [
  { id: "all",          label: "All Updates" },
  { id: "feature",      label: "Features"    },
  { id: "improvement",  label: "Improvements"},
  { id: "bugfix",       label: "Bug Fixes"   },
  { id: "announcement", label: "Announcements"},
];

function useVisible(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis] as const;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    day:   d.toLocaleDateString("en-US", { day: "2-digit" }),
    month: d.toLocaleDateString("en-US", { month: "short" }),
    year:  d.getFullYear(),
    full:  d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  };
}

function SkeletonCard({ i }: { i: number }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"80px 1fr", gap:24, opacity: 1 - i * 0.2 }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", paddingTop:4, gap:6 }}>
        <div style={{ width:40, height:14, borderRadius:6, background:"rgba(255,255,255,.06)" }}/>
        <div style={{ width:28, height:11, borderRadius:5, background:"rgba(255,255,255,.04)" }}/>
      </div>
      <div style={{ borderRadius:20, padding:"28px 28px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display:"flex", gap:8, marginBottom:18 }}>
          <div style={{ width:90, height:22, borderRadius:20, background:"rgba(255,255,255,.06)" }}/>
          <div style={{ width:60, height:22, borderRadius:20, background:"rgba(255,255,255,.04)" }}/>
        </div>
        <div style={{ width:"70%", height:20, borderRadius:7, background:"rgba(255,255,255,.06)", marginBottom:14 }}/>
        <div style={{ width:"100%", height:13, borderRadius:5, background:"rgba(255,255,255,.04)", marginBottom:8 }}/>
        <div style={{ width:"88%", height:13, borderRadius:5, background:"rgba(255,255,255,.04)", marginBottom:8 }}/>
        <div style={{ width:"60%", height:13, borderRadius:5, background:"rgba(255,255,255,.04)" }}/>
      </div>
    </div>
  );
}

function UpdateCard({ update, index }: { update: Update; index: number }) {
  const [ref, vis] = useVisible(0.05);
  const tc = TYPE_CONFIG[update.type] || fallback;
  const dt = formatDate(update.createdAt);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={ref}
      style={{
        display:"grid", gridTemplateColumns:"80px 1fr", gap:24,
        opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)",
        transition: `opacity .5s ease ${index * 60}ms, transform .5s ease ${index * 60}ms`,
      }}
    >
      {/* Date sidebar */}
      <div className="upd-date-col" style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", paddingTop:8, gap:2 }}>
        <div style={{ fontSize:20, fontWeight:800, color:"rgba(255,255,255,.55)", fontFamily:"'Lora',serif", lineHeight:1 }}>{dt.day}</div>
        <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.25)", letterSpacing:".05em", textTransform:"uppercase" as const }}>{dt.month}</div>
        <div style={{ fontSize:10, color:"rgba(255,255,255,.15)", marginTop:2 }}>{dt.year}</div>
      </div>

      {/* Card */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius:20, padding:"26px 28px",
          background: hovered ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.025)",
          border:`1.5px solid ${hovered ? tc.border : "rgba(255,255,255,.07)"}`,
          transition:"all .25s ease",
          boxShadow: hovered ? `0 12px 40px rgba(0,0,0,.3), 0 0 0 1px ${tc.color}15` : "none",
          position:"relative", overflow:"hidden",
        }}
      >
        {/* Top accent line on hover */}
        {hovered && (
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
            background:`linear-gradient(90deg,transparent,${tc.color},transparent)`,
            borderRadius:"20px 20px 0 0" }}/>
        )}

        {/* Badges */}
        <div style={{ display:"flex", flexWrap:"wrap" as const, alignItems:"center", gap:8, marginBottom:14 }}>
          <span style={{
            display:"inline-flex", alignItems:"center", gap:5,
            padding:"4px 11px", borderRadius:20,
            background:tc.bg, border:`1px solid ${tc.border}`,
            fontSize:10, fontWeight:800, color:tc.color, letterSpacing:".07em", textTransform:"uppercase" as const,
          }}>
            {tc.icon} {tc.label}
          </span>
          {update.version && (
            <span style={{
              padding:"4px 10px", borderRadius:20,
              background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)",
              fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)",
              fontFamily:"'Roboto Mono',monospace",
            }}>
              {update.version}
            </span>
          )}
          {/* Mobile date */}
          <span className="upd-mobile-date" style={{ display:"none", fontSize:11, color:"rgba(255,255,255,.25)", marginLeft:"auto" }}>
            {dt.full}
          </span>
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily:"'Lora',serif", fontSize:"clamp(16px,2vw,21px)",
          fontWeight:700, color: hovered ? "white" : "rgba(255,255,255,.9)",
          letterSpacing:"-.3px", lineHeight:1.3, marginBottom:12,
          transition:"color .2s",
        }}>
          {update.title}
        </h2>

        {/* Body */}
        <div style={{
          fontSize:14, color:"rgba(255,255,255,.45)", lineHeight:1.8,
          whiteSpace:"pre-wrap" as const,
        }}>
          {update.body}
        </div>
      </div>
    </div>
  );
}

export default function UpdatesPage() {
  const [updates, setUpdates]     = useState<Update[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");
  const [heroRef, heroVis]        = useVisible(0.2);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  useEffect(() => {
    fetch("/api/public/updates")
      .then(r => r.ok ? r.json() : { updates: [] })
      .then(d => { setUpdates(d.updates || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all"
    ? updates
    : updates.filter(u => u.type === filter);

  const typeCounts = updates.reduce<Record<string, number>>((acc, u) => {
    acc[u.type] = (acc[u.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(180deg,#06071a 0%,#080c22 50%,#06071a 100%)", color:"white", fontFamily:"'Outfit','DM Sans',sans-serif", overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&family=Outfit:wght@400;500;600;700;800;900&family=Roboto+Mono:wght@500&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes rotateSlow{to{transform:rotate(360deg)}}
        .upd-filter-btn{
          display:inline-flex; align-items:center; gap:6px;
          padding:7px 16px; border-radius:20px; cursor:pointer;
          font-size:12px; font-weight:700; font-family:'Outfit',sans-serif;
          border:1.5px solid rgba(255,255,255,.08);
          background:rgba(255,255,255,.03);
          color:rgba(255,255,255,.35);
          transition:all .18s ease; white-space:nowrap;
        }
        .upd-filter-btn:hover{color:rgba(255,255,255,.75);border-color:rgba(255,255,255,.16);background:rgba(255,255,255,.06);}
        .upd-filter-btn.active{color:white; background:rgba(129,140,248,.12); border-color:rgba(129,140,248,.35);}
        .upd-timeline-line{position:absolute; left:79px; top:0; bottom:0; width:1px; background:linear-gradient(to bottom,transparent,rgba(255,255,255,.07) 10%,rgba(255,255,255,.07) 90%,transparent);}
        @media(max-width:640px){
          .upd-date-col{display:none!important;}
          .upd-mobile-date{display:inline!important;}
          .upd-timeline-line{display:none!important;}
          div[style*="grid-template-columns: 80px"]{grid-template-columns:1fr!important; gap:0!important;}
        }
      `}</style>

      {/* ── HERO ── */}
      <section style={{ padding:"110px 24px 60px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", inset:0,
            backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",
            backgroundSize:"48px 48px" }}/>
          <div style={{ position:"absolute", width:600, height:600, borderRadius:"50%",
            background:"radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 65%)",
            top:-200, left:"50%", transform:"translateX(-50%)", animation:"rotateSlow 60s linear infinite" }}/>
        </div>

        <div ref={heroRef} style={{ maxWidth:640, margin:"0 auto", position:"relative",
          opacity:mounted?1:0, transform:mounted?"none":"translateY(20px)", transition:"opacity .6s ease, transform .6s ease" }}>

          {/* Breadcrumb */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:24, fontSize:12, color:"rgba(255,255,255,.25)" }}>
            <a href="/" style={{ color:"rgba(255,255,255,.3)", textDecoration:"none" }}>Home</a>
            <span>›</span>
            <span style={{ color:"rgba(255,255,255,.55)" }}>Updates</span>
          </div>

          {/* Badge */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 16px 5px 10px",
            borderRadius:24, background:"rgba(99,102,241,.1)", border:"1.5px solid rgba(99,102,241,.22)",
            marginBottom:24 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:"#818cf8",
              display:"inline-block", animation:"pulse-dot 2s infinite" }}/>
            <span style={{ fontSize:11, fontWeight:800, color:"#a5b4fc", letterSpacing:".08em" }}>PRODUCT CHANGELOG</span>
          </div>

          <h1 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(32px,5vw,52px)", fontWeight:700,
            color:"white", letterSpacing:"-1.5px", lineHeight:1.1, margin:"0 0 16px" }}>
            What&rsquo;s new in
            <span style={{ display:"block", fontStyle:"italic",
              backgroundImage:"linear-gradient(90deg,#818cf8 0%,#c4b5fd 50%,#38bdf8 100%)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              FinovaOS
            </span>
          </h1>

          <p style={{ fontSize:16, color:"rgba(255,255,255,.4)", lineHeight:1.8, maxWidth:440, margin:"0 auto" }}>
            Every feature shipped, every bug fixed, every improvement made — logged here in real time.
          </p>
        </div>
      </section>

      {/* ── FILTER BAR ── */}
      <div style={{ maxWidth:860, margin:"0 auto", padding:"0 24px 48px" }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", justifyContent:"center" }}>
          {FILTERS.map(f => {
            const count = f.id === "all" ? updates.length : (typeCounts[f.id] || 0);
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`upd-filter-btn${filter === f.id ? " active" : ""}`}
              >
                {f.label}
                {!loading && count > 0 && (
                  <span style={{
                    padding:"1px 7px", borderRadius:10, fontSize:10, fontWeight:800,
                    background: filter === f.id ? "rgba(129,140,248,.2)" : "rgba(255,255,255,.06)",
                    color: filter === f.id ? "#a5b4fc" : "rgba(255,255,255,.25)",
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── FEED ── */}
      <div style={{ maxWidth:860, margin:"0 auto", padding:"0 24px 80px", position:"relative" }}>

        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", gap:32 }}>
            {[0,1,2].map(i => <SkeletonCard key={i} i={i}/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:"80px 40px", textAlign:"center", borderRadius:24,
            background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>
              {filter === "all" ? "📭" : TYPE_CONFIG[filter]?.icon || "🔍"}
            </div>
            <h3 style={{ fontSize:18, fontWeight:700, color:"rgba(255,255,255,.7)", marginBottom:8 }}>
              {filter === "all" ? "No updates yet" : `No ${FILTERS.find(f=>f.id===filter)?.label} yet`}
            </h3>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.25)" }}>
              {filter === "all"
                ? "Updates will appear here as we ship new features."
                : "Try switching to a different filter above."}
            </p>
            {filter !== "all" && (
              <button onClick={() => setFilter("all")} style={{
                marginTop:20, padding:"9px 22px", borderRadius:12,
                background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)",
                color:"rgba(255,255,255,.6)", fontSize:13, fontWeight:700, cursor:"pointer",
              }}>
                View all updates
              </button>
            )}
          </div>
        ) : (
          <div style={{ position:"relative" }}>
            {/* Timeline vertical line */}
            <div className="upd-timeline-line"/>

            <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
              {filtered.map((update, i) => (
                <UpdateCard key={update.id} update={update} index={i}/>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CTA ── */}
      <div style={{ maxWidth:860, margin:"0 auto", padding:"0 24px 100px" }}>
        <div style={{ borderRadius:24, overflow:"hidden", position:"relative",
          background:"linear-gradient(135deg,rgba(79,70,229,.18) 0%,rgba(124,58,237,.1) 50%,rgba(56,189,248,.08) 100%)",
          border:"1px solid rgba(99,102,241,.2)", padding:"52px 40px", textAlign:"center" }}>

          <div style={{ position:"absolute", top:-60, right:-60, width:220, height:220, borderRadius:"50%",
            background:"radial-gradient(circle,rgba(99,102,241,.15) 0%,transparent 70%)", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", bottom:-40, left:40, width:160, height:160, borderRadius:"50%",
            background:"radial-gradient(circle,rgba(56,189,248,.1) 0%,transparent 70%)", pointerEvents:"none" }}/>

          <div style={{ position:"relative" }}>
            <div style={{ width:52, height:52, borderRadius:16, background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, margin:"0 auto 20px" }}>
              🚀
            </div>
            <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(20px,3vw,28px)", fontWeight:700,
              color:"white", margin:"0 0 10px", letterSpacing:"-.5px" }}>
              Want to see these in action?
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", maxWidth:380, margin:"0 auto 28px", lineHeight:1.75 }}>
              Every update ships straight into your workspace. Start today and get access to everything we build.
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
              <Link href="/onboarding/choose-plan" style={{
                padding:"13px 28px", borderRadius:13,
                background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
                color:"white", fontWeight:800, fontSize:14, textDecoration:"none",
                boxShadow:"0 6px 24px rgba(79,70,229,.4)",
              }}>
                Get Started →
              </Link>
              <Link href="/pricing" style={{
                padding:"12px 24px", borderRadius:13,
                background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)",
                color:"rgba(255,255,255,.7)", fontWeight:700, fontSize:14, textDecoration:"none",
              }}>
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
