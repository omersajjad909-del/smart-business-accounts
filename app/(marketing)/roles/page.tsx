"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ══════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════ */
const DEPARTMENTS = [
  {
    id: "engineering",
    name: "Engineering",
    icon: "⚙️",
    color: "#818cf8",
    glow: "rgba(129,140,248,.15)",
    border: "rgba(129,140,248,.25)",
    headcount: 52,
    desc: "We build the financial infrastructure powering 12,000+ businesses. Our stack is TypeScript, Next.js, PostgreSQL, and we ship every week.",
    leads: ["Omar Khalid — CTO", "Ali Hassan — VP Eng"],
    tools: ["TypeScript", "Next.js", "PostgreSQL", "Redis", "AWS", "Kubernetes"],
    teams: ["Core Platform", "Payments", "Reporting", "Mobile", "Security", "Infrastructure"],
  },
  {
    id: "product",
    name: "Product & Design",
    icon: "🎨",
    color: "#34d399",
    glow: "rgba(52,211,153,.12)",
    border: "rgba(52,211,153,.25)",
    headcount: 18,
    desc: "We turn complex financial workflows into delightfully simple experiences. Product and design work as one team, shipping together.",
    leads: ["Sara Malik — CPO"],
    tools: ["Figma", "Linear", "Notion", "Maze", "Hotjar"],
    teams: ["Core Product", "Growth", "Design Systems", "Research"],
  },
  {
    id: "sales",
    name: "Sales & Marketing",
    icon: "💼",
    color: "#fbbf24",
    glow: "rgba(251,191,36,.12)",
    border: "rgba(251,191,36,.25)",
    headcount: 24,
    desc: "We bring FinovaOS to businesses around the world. From inbound leads to enterprise deals — this team owns growth.",
    leads: ["Tariq Mirza — VP Sales"],
    tools: ["HubSpot", "Apollo", "Gong", "Notion", "Slack"],
    teams: ["Enterprise Sales", "SMB Sales", "Marketing", "Partnerships"],
  },
  {
    id: "customer",
    name: "Customer Success",
    icon: "🤝",
    color: "#38bdf8",
    glow: "rgba(56,189,248,.12)",
    border: "rgba(56,189,248,.25)",
    headcount: 16,
    desc: "We make sure every customer gets maximum value from FinovaOS. Zero churn is the goal. Customer obsession is the culture.",
    leads: ["Mina Rashid — Head of CS"],
    tools: ["Intercom", "Notion", "Loom", "Zoom", "HubSpot"],
    teams: ["Enterprise CS", "SMB CS", "Technical Support", "Onboarding"],
  },
  {
    id: "operations",
    name: "Operations",
    icon: "🏢",
    color: "#c4b5fd",
    glow: "rgba(196,181,253,.12)",
    border: "rgba(196,181,253,.25)",
    headcount: 10,
    desc: "Finance, legal, people ops, and compliance. We keep the business running smoothly so everyone else can focus on building.",
    leads: ["Nadia Qureshi — Head of Finance & Compliance"],
    tools: ["Deel", "Notion", "Rippling", "DocuSign"],
    teams: ["Finance", "Legal & Compliance", "People Ops", "IT"],
  },
];

const ENGINEERING_LADDER = [
  {
    level: "L1",
    title: "Engineer I",
    color: "#818cf8",
    yoe: "0–2 years",
    desc: "You write clean, tested code with guidance. You're learning fast, asking great questions, and shipping features with support from your team.",
    focus: ["Code quality", "Learning velocity", "Communication"],
  },
  {
    level: "L2",
    title: "Engineer II",
    color: "#6366f1",
    yoe: "2–4 years",
    desc: "You work independently on well-defined problems. You review code, mentor juniors, and consistently deliver features on time.",
    focus: ["Independence", "Code review", "Technical depth"],
  },
  {
    level: "L3",
    title: "Senior Engineer",
    color: "#4f46e5",
    yoe: "4–8 years",
    desc: "You own systems end-to-end. You design technical solutions, influence product direction, and make your team significantly more effective.",
    focus: ["System design", "Technical leadership", "Cross-team impact"],
  },
  {
    level: "L4",
    title: "Staff Engineer",
    color: "#38bdf8",
    yoe: "8–12 years",
    desc: "You define engineering strategy across multiple teams. Your architectural decisions shape the platform. You're a force multiplier.",
    focus: ["Architecture", "Org-wide impact", "Engineering strategy"],
  },
  {
    level: "L5",
    title: "Principal Engineer",
    color: "#34d399",
    yoe: "12+ years",
    desc: "You set the technical direction for the entire company. You solve our hardest problems and your influence is felt across all of FinovaOS.",
    focus: ["Company-wide vision", "Industry expertise", "Executive partnership"],
  },
];

const ALL_ROLES = [
  // Engineering
  { title:"Senior Backend Engineer",      dept:"engineering", location:"Remote",          type:"Full-time", level:"Senior",     color:"#818cf8" },
  { title:"Frontend Engineer (React)",    dept:"engineering", location:"Remote",          type:"Full-time", level:"Mid–Senior", color:"#818cf8" },
  { title:"DevOps / Platform Engineer",   dept:"engineering", location:"Remote",          type:"Full-time", level:"Senior",     color:"#818cf8" },
  { title:"Mobile Engineer (RN)",         dept:"engineering", location:"Remote",          type:"Full-time", level:"Mid–Senior", color:"#818cf8" },
  { title:"Security Engineer",            dept:"engineering", location:"Remote",          type:"Full-time", level:"Senior",     color:"#818cf8" },
  { title:"QA Engineer",                  dept:"engineering", location:"Remote",          type:"Full-time", level:"Mid",        color:"#818cf8" },
  // Product
  { title:"Product Manager — Accounting", dept:"product",     location:"Remote",          type:"Full-time", level:"Senior",     color:"#34d399" },
  { title:"Senior Product Designer",      dept:"product",     location:"Remote",          type:"Full-time", level:"Senior",     color:"#34d399" },
  { title:"UX Researcher",                dept:"product",     location:"Remote",          type:"Full-time", level:"Mid",        color:"#34d399" },
  { title:"Product Analyst",              dept:"product",     location:"Remote",          type:"Full-time", level:"Mid",        color:"#34d399" },
  // Sales
  { title:"Account Executive — MENA",    dept:"sales",       location:"Dubai, UAE",       type:"Full-time", level:"Mid–Senior", color:"#fbbf24" },
  { title:"Account Executive — UK/EU",   dept:"sales",       location:"London (Remote)",  type:"Full-time", level:"Mid–Senior", color:"#fbbf24" },
  { title:"Partnerships Manager",         dept:"sales",       location:"Remote",           type:"Full-time", level:"Mid",        color:"#fbbf24" },
  { title:"Growth Marketing Manager",     dept:"sales",       location:"Remote",           type:"Full-time", level:"Senior",     color:"#fbbf24" },
  // Customer Success
  { title:"Customer Success Manager",     dept:"customer",    location:"Remote",           type:"Full-time", level:"Mid",        color:"#38bdf8" },
  { title:"Technical Support Engineer",   dept:"customer",    location:"Remote",           type:"Full-time", level:"Mid",        color:"#38bdf8" },
  { title:"Onboarding Specialist",        dept:"customer",    location:"Remote / Global",  type:"Full-time", level:"Junior",     color:"#38bdf8" },
  // Operations
  { title:"Finance Manager",              dept:"operations",  location:"Remote",           type:"Full-time", level:"Senior",     color:"#c4b5fd" },
  { title:"People Operations Manager",    dept:"operations",  location:"Remote",           type:"Full-time", level:"Mid",        color:"#c4b5fd" },
  { title:"Legal & Compliance Counsel",   dept:"operations",  location:"Remote",           type:"Contract",  level:"Senior",     color:"#c4b5fd" },
];

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, vis };
}

function Section({ children, style, id }: { children: React.ReactNode; style?: React.CSSProperties; id?: string }) {
  const { ref, vis } = useInView();
  return (
    <div ref={ref} id={id} style={{ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(28px)", transition:"opacity .6s ease, transform .6s ease", ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:14 }}>
      <div style={{ height:1, width:32, background:"rgba(99,102,241,.4)" }}/>
      <span style={{ fontSize:11, fontWeight:800, color:"#818cf8", letterSpacing:".12em", textTransform:"uppercase" }}>{text}</span>
      <div style={{ height:1, width:32, background:"rgba(99,102,241,.4)" }}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function RolesPage() {
  const [heroVis,    setHeroVis]    = useState(false);
  const [activeDept, setActiveDept] = useState("all");
  const [expanded,   setExpanded]   = useState<string|null>(null);

  useEffect(() => { setTimeout(()=>setHeroVis(true), 80); }, []);

  const filteredRoles = ALL_ROLES.filter(r =>
    activeDept === "all" || r.dept === activeDept
  );

  const LEVEL_COLOR: Record<string,string> = {
    Junior:"#34d399", Mid:"#818cf8", "Mid–Senior":"#38bdf8", Senior:"#fbbf24",
  };

  return (
    <main style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#080c1e 0%,#0c0f2e 50%,#080c1e 100%)",
      color:"white", fontFamily:"'DM Sans','Outfit',system-ui,sans-serif", overflowX:"hidden",
    }}>

      {/* ── HERO ── */}
      <section style={{ position:"relative", overflow:"hidden", padding:"130px 24px 80px", textAlign:"center" }}>
        <div style={{ position:"absolute", top:-100, left:"50%", transform:"translateX(-50%)", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ maxWidth:680, margin:"0 auto", position:"relative", zIndex:1 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:24, background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.25)", marginBottom:24, opacity:heroVis?1:0, transform:heroVis?"translateY(0)":"translateY(16px)", transition:"all .5s ease" }}>
            <span style={{ fontSize:12, fontWeight:800, color:"#818cf8", letterSpacing:".06em" }}>TEAMS & ROLES</span>
          </div>
          <h1 style={{ fontSize:"clamp(36px,6vw,62px)", fontWeight:900, letterSpacing:"-.03em", lineHeight:1.1, fontFamily:"Lora,Georgia,serif", margin:"0 0 20px", opacity:heroVis?1:0, transform:heroVis?"translateY(0)":"translateY(20px)", transition:"all .6s ease .1s" }}>
            How we're organised
            <span style={{ display:"block", background:"linear-gradient(90deg,#818cf8,#c4b5fd,#38bdf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              and where you fit
            </span>
          </h1>
          <p style={{ fontSize:"clamp(15px,2vw,17px)", color:"rgba(255,255,255,.5)", lineHeight:1.75, maxWidth:500, margin:"0 auto 36px", opacity:heroVis?1:0, transition:"all .6s ease .2s" }}>
            120 people across 5 departments, 18 countries, one mission. Find your place in the team.
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", opacity:heroVis?1:0, transition:"all .6s ease .3s" }}>
            <a href="#departments" style={{ padding:"12px 28px", borderRadius:12, fontWeight:800, fontSize:13, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"white", textDecoration:"none", boxShadow:"0 4px 24px rgba(79,70,229,.4)" }}>
              Explore Departments
            </a>
            <a href="#open-roles" style={{ padding:"12px 28px", borderRadius:12, fontWeight:700, fontSize:13, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.8)", textDecoration:"none" }}>
              See Open Roles ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── ORG OVERVIEW ── */}
      <Section>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 80px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
            {DEPARTMENTS.map(d=>(
              <div key={d.id} style={{ background:`linear-gradient(135deg,${d.glow},rgba(255,255,255,.02))`, borderRadius:16, border:`1px solid ${d.border}`, padding:"20px 18px", textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:10 }}>{d.icon}</div>
                <div style={{ fontSize:22, fontWeight:900, color:d.color, fontFamily:"Lora,serif" }}>{d.headcount}</div>
                <div style={{ fontSize:12, color:"white", fontWeight:700, marginTop:4 }}>{d.name}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── DEPARTMENTS ── */}
      <Section id="departments">
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <SectionLabel text="Our Departments"/>
            <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:0 }}>
              Five teams, one company
            </h2>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            {DEPARTMENTS.map(d=>(
              <div key={d.id} style={{ background:"rgba(255,255,255,.03)", borderRadius:20, border:`1px solid rgba(255,255,255,.07)`, overflow:"hidden" }}>
                {/* Header */}
                <div
                  onClick={()=>setExpanded(expanded===d.id?null:d.id)}
                  style={{ padding:"24px 28px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                    <div style={{ width:52, height:52, borderRadius:14, background:`${d.color}20`, border:`1px solid ${d.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{d.icon}</div>
                    <div>
                      <div style={{ fontSize:18, fontWeight:800, color:"white" }}>{d.name}</div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2 }}>{d.headcount} people · {d.teams.length} sub-teams</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ padding:"5px 14px", borderRadius:20, background:`${d.color}20`, color:d.color, fontSize:11, fontWeight:800 }}>{d.headcount} people</span>
                    <span style={{ fontSize:20, color:"rgba(255,255,255,.3)", transform:expanded===d.id?"rotate(180deg)":"rotate(0)", transition:"transform .2s", display:"inline-block" }}>⌄</span>
                  </div>
                </div>

                {/* Expanded */}
                {expanded===d.id && (
                  <div style={{ padding:"0 28px 28px", borderTop:"1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, paddingTop:24 }}>
                      <div>
                        <p style={{ fontSize:14, color:"rgba(255,255,255,.55)", lineHeight:1.75, margin:"0 0 20px" }}>{d.desc}</p>
                        {/* Leads */}
                        <div style={{ marginBottom:16 }}>
                          <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:8 }}>Leadership</div>
                          {d.leads.map(l=>(
                            <div key={l} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                              <div style={{ width:28, height:28, borderRadius:8, background:`${d.color}25`, border:`1px solid ${d.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:d.color }}>
                                {l[0]}
                              </div>
                              <span style={{ fontSize:12, color:"rgba(255,255,255,.6)", fontWeight:600 }}>{l}</span>
                            </div>
                          ))}
                        </div>
                        {/* Sub-teams */}
                        <div>
                          <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:8 }}>Sub-Teams</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                            {d.teams.map(t=>(
                              <span key={t} style={{ padding:"4px 12px", borderRadius:20, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", fontSize:11, color:"rgba(255,255,255,.6)", fontWeight:600 }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        {/* Tools */}
                        <div style={{ marginBottom:20 }}>
                          <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:8 }}>Tools & Stack</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                            {d.tools.map(t=>(
                              <span key={t} style={{ padding:"4px 12px", borderRadius:20, background:`${d.color}15`, border:`1px solid ${d.color}30`, fontSize:11, color:d.color, fontWeight:700 }}>{t}</span>
                            ))}
                          </div>
                        </div>
                        {/* Open roles in this dept */}
                        <div>
                          <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:8 }}>
                            Open Roles — {ALL_ROLES.filter(r=>r.dept===d.id).length} positions
                          </div>
                          {ALL_ROLES.filter(r=>r.dept===d.id).slice(0,4).map(r=>(
                            <Link key={r.title} href={`/careers?dept=${d.id}`}
                              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", borderRadius:9, background:"rgba(255,255,255,.04)", marginBottom:6, textDecoration:"none", transition:"background .15s" }}
                              onMouseEnter={e=>(e.currentTarget.style.background="rgba(99,102,241,.1)")}
                              onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,.04)")}
                            >
                              <span style={{ fontSize:12, color:"rgba(255,255,255,.7)", fontWeight:600 }}>{r.title}</span>
                              <span style={{ padding:"2px 8px", borderRadius:20, background:`${LEVEL_COLOR[r.level]||"#818cf8"}20`, color:LEVEL_COLOR[r.level]||"#818cf8", fontSize:9, fontWeight:800 }}>{r.level}</span>
                            </Link>
                          ))}
                          {ALL_ROLES.filter(r=>r.dept===d.id).length > 4 && (
                            <Link href="/careers" style={{ fontSize:12, color:"#818cf8", fontWeight:700, textDecoration:"none", display:"block", marginTop:8 }}>
                              +{ALL_ROLES.filter(r=>r.dept===d.id).length - 4} more roles →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── ENGINEERING LADDER ── */}
      <Section>
        <div style={{ maxWidth:960, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <SectionLabel text="Engineering Career Ladder"/>
            <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 14px" }}>
              Clear paths, no guesswork
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", maxWidth:480, margin:"0 auto" }}>
              We publish our full engineering ladder. You'll always know exactly where you are, and what it takes to grow.
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {ENGINEERING_LADDER.map((l,i)=>(
              <div key={l.level} style={{
                display:"grid", gridTemplateColumns:"80px 1fr auto",
                gap:20, alignItems:"center",
                background:"rgba(255,255,255,.03)", borderRadius:16,
                border:"1px solid rgba(255,255,255,.07)", padding:"22px 24px",
                borderLeft:`4px solid ${l.color}`,
                transition:"transform .2s",
              }}
                onMouseEnter={e=>e.currentTarget.style.transform="translateX(4px)"}
                onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}
              >
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:l.color, letterSpacing:".06em" }}>{l.level}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.25)", marginTop:3 }}>{l.yoe}</div>
                </div>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:"white", marginBottom:5 }}>{l.title}</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", lineHeight:1.65, maxWidth:580 }}>{l.desc}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, minWidth:160 }}>
                  {l.focus.map(f=>(
                    <span key={f} style={{ padding:"3px 10px", borderRadius:20, background:`${l.color}15`, color:l.color, fontSize:10, fontWeight:700, textAlign:"center" }}>{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:20, padding:"16px 20px", borderRadius:12, background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", fontSize:13, color:"rgba(255,255,255,.45)", lineHeight:1.7 }}>
            💡 <strong style={{ color:"white" }}>Note:</strong> We also have a parallel management track (Engineering Manager → Director → VP) for those who want to lead teams rather than deepen technical expertise.
          </div>
        </div>
      </Section>

      {/* ── ALL OPEN ROLES TABLE ── */}
      <Section id="open-roles">
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <SectionLabel text="All Open Roles"/>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,38px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 12px" }}>
              {ALL_ROLES.length} open positions
            </h2>
          </div>
          {/* Dept filter */}
          <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap", justifyContent:"center" }}>
            {[{id:"all",label:"All"}, ...DEPARTMENTS.map(d=>({id:d.id,label:d.name}))].map(d=>(
              <button key={d.id} onClick={()=>setActiveDept(d.id)}
                style={{ padding:"7px 16px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
                  background:activeDept===d.id?"linear-gradient(135deg,#4f46e5,#7c3aed)":"rgba(255,255,255,.05)",
                  color:activeDept===d.id?"white":"rgba(255,255,255,.4)" }}>
                {d.label}
              </button>
            ))}
          </div>
          {/* Table */}
          <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.2fr 1fr 100px", gap:0, padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,.07)", fontSize:10, fontWeight:800, color:"rgba(255,255,255,.3)", letterSpacing:".06em", textTransform:"uppercase" }}>
              <span>Role</span><span>Department</span><span>Location</span><span>Level</span><span style={{textAlign:"right"}}>Apply</span>
            </div>
            {filteredRoles.map((r,i)=>(
              <div key={r.title+i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.2fr 1fr 100px", gap:0, padding:"14px 20px", borderBottom:i<filteredRoles.length-1?"1px solid rgba(255,255,255,.04)":"none", alignItems:"center", transition:"background .15s" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(99,102,241,.05)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <span style={{ fontSize:13, fontWeight:600, color:"white" }}>{r.title}</span>
                <span style={{ fontSize:12, color:r.color, fontWeight:600, textTransform:"capitalize" }}>{r.dept}</span>
                <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>📍 {r.location}</span>
                <span style={{ padding:"3px 10px", borderRadius:20, background:`${LEVEL_COLOR[r.level]||"#818cf8"}20`, color:LEVEL_COLOR[r.level]||"#818cf8", fontSize:10, fontWeight:800, width:"fit-content" }}>{r.level}</span>
                <div style={{ display:"flex", justifyContent:"flex-end" }}>
                  <Link href="/careers" style={{ padding:"6px 14px", borderRadius:8, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.25)", color:"#818cf8", fontSize:11, fontWeight:700, textDecoration:"none" }}>
                    Apply →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CTA ── */}
      <Section>
        <div style={{ maxWidth:640, margin:"0 auto", padding:"0 24px 120px", textAlign:"center" }}>
          <h2 style={{ fontSize:"clamp(22px,3vw,32px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 12px" }}>
            Ready to find your role?
          </h2>
          <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", margin:"0 auto 28px", maxWidth:400, lineHeight:1.7 }}>
            Browse all open positions or send us a speculative application — we're always interested in exceptional people.
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/careers" style={{ padding:"13px 30px", borderRadius:12, fontWeight:800, fontSize:14, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"white", textDecoration:"none", boxShadow:"0 4px 24px rgba(79,70,229,.4)" }}>
              See All Jobs
            </Link>
            <Link href="/culture" style={{ padding:"13px 30px", borderRadius:12, fontWeight:700, fontSize:14, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.8)", textDecoration:"none" }}>
              Our Culture →
            </Link>
          </div>
        </div>
      </Section>

      <style>{`* { box-sizing:border-box; }`}</style>
    </main>
  );
}