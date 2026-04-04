"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const TYPE_CONFIG: Record<string,{label:string;icon:string;color:string;bg:string}> = {
  feature:      { label:"New Feature",  icon:"✨", color:"#818cf8", bg:"rgba(129,140,248,.12)" },
  improvement:  { label:"Improvement",  icon:"⚡", color:"#38bdf8", bg:"rgba(56,189,248,.12)"  },
  bugfix:       { label:"Bug Fix",      icon:"🐛", color:"#34d399", bg:"rgba(52,211,153,.12)"  },
  announcement: { label:"Announcement", icon:"📣", color:"#fbbf24", bg:"rgba(251,191,36,.12)"  },
  maintenance:  { label:"Maintenance",  icon:"🔧", color:"#f87171", bg:"rgba(248,113,113,.12)" },
};

// Fallback data if API has nothing yet
const FALLBACK = [
  { id:"1", type:"feature",     version:"v2.5.0", title:"Custom Plan Builder",         body:"Users can now build their own plan by selecting individual modules — CRM, HR & Payroll, Inventory, and more. Price is calculated automatically.", createdAt:"2025-03-10" },
  { id:"2", type:"improvement", version:"v2.4.3", title:"Leaflet World Map for Geo Analytics", body:"Replaced placeholder map with real interactive Leaflet.js world map. Click any country dot for details.", createdAt:"2025-03-08" },
  { id:"3", type:"feature",     version:"v2.4.0", title:"Visitor Analytics Dashboard",  body:"Admins can now see real-time website visitors — country, city, device type, and live map with pulsing dots.", createdAt:"2025-03-05" },
  { id:"4", type:"feature",     version:"v2.3.0", title:"Product Updates System",       body:"Admin can publish product updates. Users see a 'What's New' modal on login with a full changelog.", createdAt:"2025-03-01" },
  { id:"5", type:"bugfix",      version:"v2.2.1", title:"NaN Height Fix in Charts",     body:"Fixed a bug where LineChart and BarChart showed NaN CSS height when data was empty or all-zero.", createdAt:"2025-02-26" },
  { id:"6", type:"feature",     version:"v2.2.0", title:"Email Broadcasts",             body:"Admins can now send email announcements to all users, active subscribers, trial users, or specific plans.", createdAt:"2025-02-20" },
  { id:"7", type:"feature",     version:"v2.1.0", title:"Feature Flags",                body:"Toggle features on/off without deploying. Control rollout percentage per flag.", createdAt:"2025-02-14" },
  { id:"8", type:"announcement",version:"v2.0.0", title:"FinovaOS 2.0 — The Platform Era",body:"New modular architecture, custom plans, API access tier, and 150+ currency support. Biggest release yet.", createdAt:"2025-02-01" },
];

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, vis };
}

function Section({ children, style, id }: { children: React.ReactNode; style?: React.CSSProperties; id?: string }) {
  const { ref, vis } = useInView();
  return (
    <div ref={ref} id={id} style={{ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(24px)", transition:"opacity .6s ease, transform .6s ease", ...style }}>
      {children}
    </div>
  );
}

export default function ChangelogPage() {
  const [heroVis,  setHeroVis]  = useState(false);
  const [updates,  setUpdates]  = useState<any[]>([]);
  const [filter,   setFilter]   = useState("all");
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setTimeout(()=>setHeroVis(true), 80);
    fetch("/api/public/updates")
      .then(r=>r.json())
      .then(d=>{ setUpdates(d.updates?.length ? d.updates : FALLBACK); })
      .catch(()=>setUpdates(FALLBACK))
      .finally(()=>setLoading(false));
  }, []);

  const filtered = updates.filter(u => filter==="all" || u.type===filter);

  // Group by month-year
  const grouped = filtered.reduce((acc: Record<string,any[]>, u) => {
    const d = new Date(u.createdAt);
    const key = d.toLocaleDateString("en-GB",{ month:"long", year:"numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(u);
    return acc;
  }, {});

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(160deg,#080c1e 0%,#0c0f2e 50%,#080c1e 100%)", color:"white", fontFamily:"'DM Sans','Outfit',system-ui,sans-serif", overflowX:"hidden" }}>

      {/* Hero */}
      <Section style={{ padding:"120px 24px 60px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-100, left:"50%", transform:"translateX(-50%)", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.15) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ maxWidth:600, margin:"0 auto", position:"relative", zIndex:1 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:24, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.25)", marginBottom:22, opacity:heroVis?1:0, transition:"all .5s ease" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", animation:"blink 2s ease infinite" }}/>
            <span style={{ fontSize:12, fontWeight:800, color:"#34d399", letterSpacing:".06em" }}>ALWAYS IMPROVING</span>
          </div>
          <h1 style={{ fontSize:"clamp(34px,5vw,54px)", fontWeight:900, letterSpacing:"-.03em", lineHeight:1.1, fontFamily:"Lora,serif", margin:"0 0 18px", opacity:heroVis?1:0, transition:"all .6s ease .1s" }}>
            Product Changelog
          </h1>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.5)", lineHeight:1.75, maxWidth:440, margin:"0 auto", opacity:heroVis?1:0, transition:"all .6s ease .2s" }}>
            Every improvement, fix, and new feature — documented publicly. We ship every week.
          </p>
        </div>
      </Section>

      {/* Filter */}
      <Section>
        <div style={{ maxWidth:780, margin:"0 auto", padding:"0 24px 24px", display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
          <button onClick={()=>setFilter("all")}
            style={{ padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"none", background:filter==="all"?"rgba(255,255,255,.1)":"rgba(255,255,255,.04)", color:filter==="all"?"white":"rgba(255,255,255,.4)" }}>
            All
          </button>
          {Object.entries(TYPE_CONFIG).map(([k,v])=>(
            <button key={k} onClick={()=>setFilter(k)}
              style={{ padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
                background:filter===k?v.bg:"rgba(255,255,255,.04)",
                color:filter===k?v.color:"rgba(255,255,255,.4)" }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Changelog entries */}
      <Section>
        <div style={{ maxWidth:780, margin:"0 auto", padding:"0 24px 100px" }}>
          {loading ? (
            <div style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,.2)" }}>Loading...</div>
          ) : Object.entries(grouped).length === 0 ? (
            <div style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,.2)" }}>No entries found.</div>
          ) : Object.entries(grouped).map(([month, entries])=>(
            <div key={month} style={{ marginBottom:48 }}>
              {/* Month header */}
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
                <span style={{ fontSize:14, fontWeight:800, color:"rgba(255,255,255,.6)", letterSpacing:".04em" }}>{month}</span>
                <div style={{ flex:1, height:1, background:"rgba(255,255,255,.07)" }}/>
              </div>

              {/* Entries */}
              <div style={{ position:"relative", paddingLeft:28 }}>
                {/* Timeline line */}
                <div style={{ position:"absolute", left:7, top:8, bottom:8, width:2, background:"rgba(99,102,241,.15)" }}/>

                {entries.map((u,i)=>{
                  const tc = TYPE_CONFIG[u.type] || TYPE_CONFIG.feature;
                  return (
                    <div key={u.id} style={{ position:"relative", marginBottom:24 }}>
                      {/* Dot */}
                      <div style={{ position:"absolute", left:-28+7-5, top:6, width:12, height:12, borderRadius:"50%", background:tc.color, border:"3px solid #080c1e", boxShadow:`0 0 8px ${tc.color}66` }}/>

                      <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"20px 22px", transition:"border-color .2s" }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=`${tc.color}44`}
                        onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,.07)"}
                      >
                        {/* Header */}
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                          <span style={{ padding:"3px 10px", borderRadius:20, background:tc.bg, color:tc.color, fontSize:10, fontWeight:800 }}>{tc.icon} {tc.label}</span>
                          {u.version && <span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.4)", fontSize:10, fontWeight:700, fontFamily:"monospace" }}>{u.version}</span>}
                          <span style={{ fontSize:11, color:"rgba(255,255,255,.25)", marginLeft:"auto" }}>
                            {new Date(u.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
                          </span>
                        </div>
                        <div style={{ fontSize:15, fontWeight:700, color:"white", marginBottom:7 }}>{u.title}</div>
                        <div style={{ fontSize:13, color:"rgba(255,255,255,.5)", lineHeight:1.7 }}>{u.body}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Subscribe */}
          <div style={{ padding:"32px 28px", borderRadius:18, background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", textAlign:"center" }}>
            <div style={{ fontSize:22, marginBottom:10 }}>🔔</div>
            <div style={{ fontSize:16, fontWeight:800, color:"white", marginBottom:6 }}>Stay up to date</div>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", margin:"0 auto 20px", maxWidth:340 }}>Get notified when we ship something new. No noise, just real updates.</p>
            <div style={{ display:"flex", gap:10, maxWidth:380, margin:"0 auto" }}>
              <input placeholder="your@email.com" style={{ flex:1, padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"white", fontSize:13, outline:"none" }}/>
              <button style={{ padding:"10px 20px", borderRadius:10, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>Notify Me</button>
            </div>
          </div>
        </div>
      </Section>

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}} *{box-sizing:border-box}`}</style>
    </main>
  );
}