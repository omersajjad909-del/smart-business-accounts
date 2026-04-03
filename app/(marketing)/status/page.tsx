"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ─── Types ─── */
type Status = "operational" | "degraded" | "outage" | "maintenance";

/* ─── Static data ─── */
const SERVICES = [
  {
    id: "web",
    icon: "🌐",
    name: "Web Application",
    desc: "Main dashboard & UI",
    status: "operational" as Status,
    uptime: "99.98%",
    latency: "142ms",
  },
  {
    id: "api",
    icon: "⚡",
    name: "API Gateway",
    desc: "REST API & authentication",
    status: "operational" as Status,
    uptime: "99.95%",
    latency: "89ms",
  },
  {
    id: "db",
    icon: "🗄️",
    name: "Database Cluster",
    desc: "Primary data storage",
    status: "operational" as Status,
    uptime: "99.99%",
    latency: "12ms",
  },
  {
    id: "reports",
    icon: "📊",
    name: "Report Engine",
    desc: "PDF & Excel generation",
    status: "operational" as Status,
    uptime: "99.91%",
    latency: "320ms",
  },
  {
    id: "email",
    icon: "📧",
    name: "Email & Notifications",
    desc: "Invoice delivery & alerts",
    status: "operational" as Status,
    uptime: "99.87%",
    latency: "—",
  },
  {
    id: "backups",
    icon: "💾",
    name: "Backup Service",
    desc: "Automated daily backups",
    status: "operational" as Status,
    uptime: "100%",
    latency: "—",
  },
  {
    id: "cdn",
    icon: "🚀",
    name: "CDN & Assets",
    desc: "Static files & media",
    status: "operational" as Status,
    uptime: "99.99%",
    latency: "28ms",
  },
  {
    id: "search",
    icon: "🔍",
    name: "Search & Indexing",
    desc: "Full-text record search",
    status: "operational" as Status,
    uptime: "99.82%",
    latency: "55ms",
  },
];

const INCIDENTS: {
  date: string;
  title: string;
  severity: "minor" | "major" | "resolved";
  updates: { time: string; text: string }[];
}[] = [
  {
    date: "Feb 18, 2025",
    title: "Elevated report generation latency",
    severity: "resolved",
    updates: [
      { time: "14:32 PKT", text: "Issue identified. Report engine experiencing high queue depth due to batch job conflict." },
      { time: "15:10 PKT", text: "Batch jobs paused. Queue draining. Latency returning to normal." },
      { time: "15:45 PKT", text: "Fully resolved. Root cause: scheduled job conflicting with peak usage hours. Fixed scheduling." },
    ],
  },
  {
    date: "Jan 29, 2025",
    title: "Email delivery delays — invoices & reminders",
    severity: "resolved",
    updates: [
      { time: "09:14 PKT", text: "Upstream SMTP provider reporting elevated bounce rates. Investigation started." },
      { time: "10:02 PKT", text: "Switched to secondary mail relay. Queued emails processing." },
      { time: "11:30 PKT", text: "All queued emails delivered. System normal. Monitoring primary provider." },
    ],
  },
];

const UPTIME_MONTHS = [
  { month:"Sep", pct:100 },
  { month:"Oct", pct:99.95 },
  { month:"Nov", pct:100 },
  { month:"Dec", pct:99.91 },
  { month:"Jan", pct:99.98 },
  { month:"Feb", pct:99.97 },
];

/* ─── Helpers ─── */
const STATUS_META: Record<Status, { label: string; color: string; bg: string; border: string; dot: string }> = {
  operational: { label:"Operational", color:"#34d399", bg:"rgba(52,211,153,.1)", border:"rgba(52,211,153,.3)", dot:"#34d399" },
  degraded:    { label:"Degraded",    color:"#fbbf24", bg:"rgba(251,191,36,.1)", border:"rgba(251,191,36,.3)", dot:"#fbbf24" },
  outage:      { label:"Outage",      color:"#f87171", bg:"rgba(248,113,113,.1)", border:"rgba(248,113,113,.3)", dot:"#f87171" },
  maintenance: { label:"Maintenance", color:"#818cf8", bg:"rgba(129,140,248,.1)", border:"rgba(129,140,248,.3)", dot:"#818cf8" },
};

function useVisible(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, v] as const;
}

/* ─── Live clock ─── */
function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleString(undefined, { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{time} {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>;
}

/* ─── Service row ─── */
function ServiceRow({ svc, index }: { svc: typeof SERVICES[0]; index: number }) {
  const m = STATUS_META[svc.status];
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", gap:16,
        padding:"16px 20px", borderRadius:14,
        background: hov ? "rgba(255,255,255,.055)" : "rgba(255,255,255,.025)",
        border:`1px solid ${hov ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.07)"}`,
        transition:"all .25s",
        animationDelay:`${index * 50}ms`,
      }}>
      <div style={{
        width:42, height:42, borderRadius:11, flexShrink:0,
        background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.09)",
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
      }}>
        {svc.icon}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13.5, fontWeight:700, color:"rgba(255,255,255,.88)" }}>{svc.name}</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,.3)", marginTop:2 }}>{svc.desc}</div>
      </div>

      {/* Latency */}
      <div style={{ textAlign:"right", flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end" }}>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.25)", marginBottom:2 }}>Latency</div>
        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.55)" }}>{svc.latency}</div>
      </div>

      {/* Uptime */}
      <div style={{ textAlign:"right", flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end" }}>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.25)", marginBottom:2 }}>30d Uptime</div>
        <div style={{ fontSize:13, fontWeight:700, color:"#34d399" }}>{svc.uptime}</div>
      </div>

      {/* Status badge */}
      <div style={{
        display:"inline-flex", alignItems:"center", gap:6,
        padding:"5px 12px", borderRadius:20, flexShrink:0,
        background:m.bg, border:`1px solid ${m.border}`,
      }}>
        <span style={{
          width:6, height:6, borderRadius:"50%",
          background:m.dot,
          boxShadow: svc.status === "operational" ? `0 0 8px ${m.dot}` : "none",
          animation: svc.status === "operational" ? "blink 2.5s ease infinite" : "none",
        }}/>
        <span style={{ fontSize:11, fontWeight:700, color:m.color, letterSpacing:".06em" }}>{m.label}</span>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function StatusPage() {
  const [heroRef, heroVisible] = useVisible(0.2);
  const [servRef, servVisible] = useVisible(0.08);
  const [histRef, histVisible] = useVisible(0.08);
  const [uptimeRef, uptimeVisible] = useVisible(0.1);
  const [expandedInc, setExpandedInc] = useState<number | null>(null);

  const allOperational = SERVICES.every(s => s.status === "operational");

  return (
    <>
      <div style={{
        minHeight:"100vh",
        background:"linear-gradient(180deg,#080c1e 0%,#0c0f2e 30%,#080c1e 100%)",
        color:"white", fontFamily:"'Outfit','DM Sans',sans-serif",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Lora:ital,wght@0,700;1,700&display=swap');
          *,*::before,*::after{box-sizing:border-box;}
          @keyframes orbDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(16px,-14px)}}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
          @keyframes rotateSlow{to{transform:rotate(360deg)}}
          @keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.4)}50%{box-shadow:0 0 0 12px rgba(52,211,153,0)}}
          @keyframes incExpand{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
          @keyframes barGrow{from{width:0}to{width:var(--bar-w)}}
        `}</style>

        {/* BG */}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
          <div style={{ position:"absolute", inset:0,
            backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)",
            backgroundSize:"48px 48px" }}/>
          <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%",
            background:"radial-gradient(circle,rgba(52,211,153,.08),transparent 65%)",
            top:-120, left:"50%", transform:"translateX(-50%)", animation:"orbDrift 16s ease-in-out infinite" }}/>
          <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1,
            background:"linear-gradient(90deg,transparent,rgba(52,211,153,.4),transparent)" }}/>
        </div>

        <div style={{ position:"relative", zIndex:1, maxWidth:900, margin:"0 auto", padding:"72px 24px 80px" }}>

          {/* ── HERO ── */}
          <div ref={heroRef} style={{ textAlign:"center", marginBottom:56 }}>
            {/* Breadcrumb */}
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:28,
              opacity:heroVisible?1:0, transition:"opacity .5s ease",
            }}>
              <Link href="/" style={{ fontSize:12, color:"rgba(255,255,255,.28)", textDecoration:"none", fontWeight:500 }}
                onMouseEnter={e=>(e.currentTarget.style.color="rgba(255,255,255,.6)")}
                onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.28)")}>Home</Link>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.4)", fontWeight:500 }}>System Status</span>
            </div>

            {/* Big status orb */}
            <div style={{
              display:"inline-flex", alignItems:"center", justifyContent:"center",
              width:88, height:88, borderRadius:"50%", marginBottom:28,
              background:"rgba(52,211,153,.12)",
              border:"2px solid rgba(52,211,153,.35)",
              animation:"pulseGlow 3s ease-in-out infinite",
              opacity:heroVisible?1:0, transition:"opacity .5s ease .1s",
            }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>

            <div style={{
              opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(16px)",
              transition:"all .6s ease .12s",
            }}>
              {allOperational ? (
                <>
                  <div style={{
                    display:"inline-flex", alignItems:"center", gap:8,
                    padding:"6px 18px", borderRadius:24,
                    background:"rgba(52,211,153,.1)", border:"1.5px solid rgba(52,211,153,.3)",
                    fontSize:12, fontWeight:700, color:"#34d399",
                    letterSpacing:".08em", textTransform:"uppercase", marginBottom:18,
                  }}>
                    <span style={{ width:7, height:7, borderRadius:"50%", background:"#34d399", animation:"blink 2s ease infinite" }}/>
                    All Systems Operational
                  </div>
                  <h1 style={{
                    fontFamily:"'Lora',serif",
                    fontSize:"clamp(30px,4vw,46px)",
                    fontWeight:700, color:"white",
                    letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:12,
                  }}>
                    Everything is running
                    <span style={{ display:"block", fontStyle:"italic",
                      background:"linear-gradient(135deg,#6ee7b7,#34d399)",
                      WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                      smoothly.
                    </span>
                  </h1>
                </>
              ) : (
                <h1 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(28px,4vw,44px)", fontWeight:700, color:"white", letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:12 }}>
                  Some services affected
                </h1>
              )}

              <p style={{ fontSize:14, color:"rgba(255,255,255,.38)", lineHeight:1.7, marginBottom:6 }}>
                Last checked: <LiveClock/> · Updated every 60 seconds
              </p>
            </div>
          </div>

          {/* ── SERVICES ── */}
          <div ref={servRef} style={{
            opacity:servVisible?1:0, transform:servVisible?"translateY(0)":"translateY(20px)",
            transition:"all .65s ease",
          }}>
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              marginBottom:20, flexWrap:"wrap", gap:10,
            }}>
              <h2 style={{ fontFamily:"'Lora',serif", fontSize:22, fontWeight:700, color:"white", letterSpacing:"-.4px", margin:0 }}>
                Service Status
              </h2>
              <div style={{ display:"flex", gap:16 }}>
                {(["operational","degraded","outage"] as Status[]).map(s => {
                  const m = STATUS_META[s];
                  return (
                    <div key={s} style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:m.dot, flexShrink:0 }}/>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,.35)", fontWeight:500 }}>{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {SERVICES.map((svc, i) => <ServiceRow key={svc.id} svc={svc} index={i}/>)}
            </div>
          </div>

          {/* ── UPTIME CHART ── */}
          <div ref={uptimeRef} style={{
            marginTop:48,
            opacity:uptimeVisible?1:0, transform:uptimeVisible?"translateY(0)":"translateY(20px)",
            transition:"all .65s ease .1s",
          }}>
            <div style={{
              borderRadius:20, padding:"28px 28px",
              background:"rgba(255,255,255,.03)",
              border:"1px solid rgba(255,255,255,.08)",
              backdropFilter:"blur(16px)",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1,
                background:"linear-gradient(90deg,transparent,rgba(52,211,153,.4),transparent)" }}/>

              <h3 style={{ fontFamily:"'Lora',serif", fontSize:18, fontWeight:700, color:"white", marginBottom:6 }}>
                Platform Uptime — Last 6 Months
              </h3>
              <p style={{ fontSize:12.5, color:"rgba(255,255,255,.3)", marginBottom:28 }}>
                Overall average: <strong style={{ color:"#34d399" }}>99.97%</strong>
              </p>

              <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
                {UPTIME_MONTHS.map(({ month, pct }) => {
                  const h = Math.round(((pct - 99.8) / 0.2) * 60 + 20);
                  const color = pct === 100 ? "#34d399" : pct > 99.9 ? "#818cf8" : "#fbbf24";
                  return (
                    <div key={month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                      <div style={{ fontSize:11, fontWeight:700, color }}>
                        {pct === 100 ? "100%" : `${pct}%`}
                      </div>
                      <div style={{
                        width:"100%", borderRadius:6,
                        background:`${color}18`, border:`1px solid ${color}30`,
                        height:`${h}px`,
                        position:"relative", overflow:"hidden",
                        transition:"height .6s ease",
                      }}>
                        <div style={{
                          position:"absolute", bottom:0, left:0, right:0,
                          background:`linear-gradient(to top, ${color}, ${color}88)`,
                          height: uptimeVisible ? "100%" : "0%",
                          transition:"height .8s ease .3s",
                          borderRadius:5,
                        }}/>
                      </div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", fontWeight:600 }}>{month}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── INCIDENT HISTORY ── */}
          <div ref={histRef} style={{
            marginTop:40,
            opacity:histVisible?1:0, transform:histVisible?"translateY(0)":"translateY(20px)",
            transition:"all .65s ease .15s",
          }}>
            <h2 style={{ fontFamily:"'Lora',serif", fontSize:22, fontWeight:700, color:"white", letterSpacing:"-.4px", marginBottom:20 }}>
              Incident History
            </h2>

            {INCIDENTS.length === 0 ? (
              <div style={{ padding:"32px", textAlign:"center", borderRadius:16,
                background:"rgba(52,211,153,.05)", border:"1px solid rgba(52,211,153,.2)" }}>
                <div style={{ fontSize:28, marginBottom:10 }}>🎉</div>
                <div style={{ fontSize:14, color:"rgba(255,255,255,.5)" }}>No incidents in the past 90 days.</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {INCIDENTS.map((inc, i) => {
                  const isOpen = expandedInc === i;
                  return (
                    <div key={i} style={{
                      borderRadius:16, overflow:"hidden",
                      background:"rgba(255,255,255,.03)",
                      border:"1px solid rgba(255,255,255,.08)",
                      transition:"border-color .25s",
                    }}>
                      <button onClick={() => setExpandedInc(isOpen ? null : i)} style={{
                        width:"100%", display:"flex", alignItems:"center", gap:14,
                        padding:"16px 20px", background:"none", border:"none",
                        cursor:"pointer", textAlign:"left", fontFamily:"inherit",
                      }}>
                        <div style={{
                          width:8, height:8, borderRadius:"50%", flexShrink:0,
                          background: inc.severity === "resolved" ? "#34d399" : "#f87171",
                        }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13.5, fontWeight:700, color:"rgba(255,255,255,.82)" }}>{inc.title}</div>
                          <div style={{ fontSize:11.5, color:"rgba(255,255,255,.3)", marginTop:2 }}>{inc.date}</div>
                        </div>
                        <div style={{
                          padding:"3px 10px", borderRadius:14,
                          background: inc.severity === "resolved" ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)",
                          border: `1px solid ${inc.severity === "resolved" ? "rgba(52,211,153,.25)" : "rgba(248,113,113,.25)"}`,
                          fontSize:10.5, fontWeight:700,
                          color: inc.severity === "resolved" ? "#34d399" : "#f87171",
                          letterSpacing:".06em", textTransform:"uppercase", flexShrink:0,
                        }}>
                          {inc.severity}
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"
                          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition:"transform .3s", flexShrink:0 }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>

                      {isOpen && (
                        <div style={{
                          padding:"0 20px 20px 42px",
                          animation:"incExpand .3s ease both",
                          borderTop:"1px solid rgba(255,255,255,.06)",
                          paddingTop:16,
                        }}>
                          {inc.updates.map((u, ui) => (
                            <div key={ui} style={{
                              display:"flex", gap:12, marginBottom:12, alignItems:"flex-start",
                            }}>
                              <div style={{
                                fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.3)",
                                minWidth:70, paddingTop:2, letterSpacing:".04em",
                              }}>
                                {u.time}
                              </div>
                              <div style={{
                                flex:1, fontSize:13, color:"rgba(255,255,255,.55)",
                                lineHeight:1.7, borderLeft:"2px solid rgba(255,255,255,.08)",
                                paddingLeft:12,
                              }}>
                                {u.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div style={{ textAlign:"center", marginTop:8 }}>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.25)", fontWeight:500 }}>
                    No incidents in the 60 days prior. 🎉
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── SUBSCRIBE BANNER ── */}
          <div style={{
            marginTop:48, borderRadius:20, padding:"28px 32px",
            background:"linear-gradient(135deg,rgba(45,43,107,.8),rgba(30,27,85,.8))",
            border:"1px solid rgba(165,180,252,.2)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            gap:20, flexWrap:"wrap",
            backdropFilter:"blur(20px)",
            boxShadow:"0 16px 48px rgba(99,102,241,.2)",
          }}>
            <div>
              <div style={{ fontSize:13.5, fontWeight:700, color:"white", marginBottom:4 }}>
                📬 Subscribe to status updates
              </div>
              <div style={{ fontSize:12.5, color:"rgba(255,255,255,.4)" }}>
                Get notified by email when incidents occur or are resolved.
              </div>
            </div>
            <a href="mailto:finovaos.app@gmail.com?subject=Subscribe to Status Updates" style={{
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"10px 20px", borderRadius:11,
              background:"linear-gradient(135deg,#6366f1,#4f46e5)",
              color:"white", fontWeight:700, fontSize:13,
              textDecoration:"none", whiteSpace:"nowrap",
              boxShadow:"0 4px 16px rgba(99,102,241,.35)",
              transition:"all .25s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(99,102,241,.5)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 16px rgba(99,102,241,.35)";}}
            >
              Subscribe →
            </a>
          </div>

          {/* Footer links */}
          <div style={{ marginTop:48, display:"flex", justifyContent:"center", gap:24, flexWrap:"wrap" }}>
            {[["Home","/"],["Features","/features"],["Security","/security"],["Privacy","/legal/privacy"],["Terms","/legal/terms"],["Support","/support"]].map(([label, href]) => (
              <Link key={label} href={href} style={{ fontSize:12, color:"rgba(255,255,255,.2)", textDecoration:"none", fontWeight:500, transition:"color .2s" }}
                onMouseEnter={e=>(e.currentTarget.style.color="rgba(255,255,255,.6)")}
                onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.2)")}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
