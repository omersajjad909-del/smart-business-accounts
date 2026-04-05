"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ══════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════ */
const VALUES = [
  {
    icon: "◈", title: "Clarity Over Complexity",
    color: "#818cf8", glow: "rgba(129,140,248,.15)",
    short: "We make hard things simple.",
    long: "Accounting is already complex enough for our customers. We never add unnecessary complexity to our internal culture either. Clear communication, simple processes, direct feedback — always.",
    examples: ["Write docs before building", "Say what you mean, mean what you say", "One-page briefs over 30-slide decks"],
  },
  {
    icon: "🌍", title: "Global by Default",
    color: "#34d399", glow: "rgba(52,211,153,.12)",
    short: "The world is our team and our market.",
    long: "We have teammates in Lagos, Dubai, London, Singapore, and São Paulo. Every decision we make considers whether it works for everyone — regardless of timezone, background, or culture.",
    examples: ["Async-first communication", "Cultural sensitivity training", "Inclusive meeting scheduling"],
  },
  {
    icon: "🚢", title: "Ship, Learn, Repeat",
    color: "#38bdf8", glow: "rgba(56,189,248,.12)",
    short: "Done is better than perfect.",
    long: "We ship every week. We'd rather get something imperfect in front of customers and learn, than spend months perfecting something in private. Speed of learning is our competitive advantage.",
    examples: ["Weekly production deploys", "Public changelog", "No-blame postmortems"],
  },
  {
    icon: "🎯", title: "Outcomes Over Hours",
    color: "#fbbf24", glow: "rgba(251,191,36,.12)",
    short: "We measure impact, not time.",
    long: "We don't care when you work or how long you work. We care about what you produce and the impact you have. If you do great work in 6 hours, we celebrate that.",
    examples: ["No mandatory core hours", "Results-based performance reviews", "Unlimited annual leave"],
  },
  {
    icon: "💬", title: "Radical Transparency",
    color: "#c4b5fd", glow: "rgba(196,181,253,.12)",
    short: "We share everything, honestly.",
    long: "Company financials, strategy, board meeting notes — all shared with the team. We believe people do better work when they understand the full picture. No information silos.",
    examples: ["Monthly all-hands with real numbers", "Open salary bands", "Strategy docs shared company-wide"],
  },
  {
    icon: "❤️", title: "People First",
    color: "#f9a8d4", glow: "rgba(249,168,212,.12)",
    short: "We invest in humans, not headcount.",
    long: "We care about your career, your wellbeing, and your life outside of work. FinovaOS should make your life better — not just fill your calendar. Burnout is a failure of leadership, not personal weakness.",
    examples: ["Mandatory minimum vacation", "Mental health support", "No meetings Fridays"],
  },
];

const REMOTE_PRINCIPLES = [
  { icon:"📝", title:"Write Everything Down", desc:"If it wasn't written, it didn't happen. Decisions, context, and reasoning live in Notion — not in someone's head or a Slack thread." },
  { icon:"🕐", title:"Async First, Sync When Needed", desc:"Default to async. A well-written message beats a 30-minute meeting. We only meet synchronously when real-time collaboration genuinely adds value." },
  { icon:"🌏", title:"Timezone-Inclusive",          desc:"No meeting should require someone to join at 2am. We rotate schedules for recurring calls and record everything." },
  { icon:"🎥", title:"Cameras Optional",             desc:"We don't mandate cameras on calls. Your face is not proof of engagement. Your work is." },
  { icon:"📅", title:"Flexible Hours",               desc:"Work when you're most effective. Early bird or night owl — it doesn't matter to us. Own your schedule." },
  { icon:"🏖️", title:"Disconnect to Reconnect",      desc:"Mandatory minimum 15 days off per year. No 'always on' culture. Slack is not checked on vacation — by anyone." },
];

const DEI_STATS = [
  { value:"47%", label:"Women on leadership team",  color:"#f9a8d4" },
  { value:"18",  label:"Nationalities in the team", color:"#818cf8" },
  { value:"38%", label:"Underrepresented backgrounds", color:"#34d399" },
  { value:"100%",label:"Pay equity across genders",  color:"#fbbf24" },
];

const DEI_COMMITMENTS = [
  { icon:"📊", title:"Transparent Pay",    desc:"Salary bands are published internally. No negotiation disadvantage based on gender, race, or background." },
  { icon:"🎓", title:"Sponsored Education",desc:"We sponsor certifications, degrees, and courses — with a focus on teammates from underserved communities." },
  { icon:"🤝", title:"Inclusive Hiring",   desc:"Structured interviews, diverse panels, and bias training for every hiring manager. We track and publish our numbers." },
  { icon:"🌱", title:"ERGs & Community",   desc:"Employee Resource Groups for women in tech, Muslim professionals, LGBTQ+ teammates, and more." },
];

const DAY_IN_LIFE = [
  {
    role:"Senior Engineer",
    name:"Yusuf A.", location:"Lagos, Nigeria 🇳🇬",
    avatar:"YA", gradient:"linear-gradient(135deg,#4f46e5,#7c3aed)",
    schedule:[
      { time:"8:30am",  activity:"Morning coffee, check Linear for today's tasks" },
      { time:"9:00am",  activity:"Deep work — no meetings before 11am, personal rule" },
      { time:"11:00am", activity:"Async standup posted in Slack (no meeting)" },
      { time:"11:30am", activity:"Code review — 2 PRs from teammates in London" },
      { time:"1:00pm",  activity:"Lunch break — 90 min, no questions asked" },
      { time:"2:30pm",  activity:"1:1 with engineering manager (biweekly)" },
      { time:"3:30pm",  activity:"Feature work — building bank reconciliation API" },
      { time:"6:00pm",  activity:"Ship a PR, write up tomorrow's plan in Notion" },
    ],
  },
  {
    role:"Product Manager",
    name:"Clara M.", location:"Berlin, Germany 🇩🇪",
    avatar:"CM", gradient:"linear-gradient(135deg,#0891b2,#06b6d4)",
    schedule:[
      { time:"9:00am",  activity:"Review customer feedback from Intercom & Notion" },
      { time:"10:00am", activity:"Weekly product sync with engineering leads" },
      { time:"11:30am", activity:"User interview — 45 min with Enterprise customer" },
      { time:"1:00pm",  activity:"Lunch + afternoon walk (flexible hours culture)" },
      { time:"2:30pm",  activity:"Write PRD for new invoice automation feature" },
      { time:"4:00pm",  activity:"Design review with product designer" },
      { time:"5:00pm",  activity:"Async update posted — progress, blockers, next steps" },
      { time:"5:30pm",  activity:"Done for the day — evening belongs to life" },
    ],
  },
];

const TEAM_MEMBERS = [
  { name:"Zara A.",   role:"CEO",          country:"🇵🇰", avatar:"ZA", g:"linear-gradient(135deg,#4f46e5,#7c3aed)" },
  { name:"Omar K.",   role:"CTO",          country:"🇵🇰", avatar:"OK", g:"linear-gradient(135deg,#0891b2,#06b6d4)" },
  { name:"Sara M.",   role:"CPO",          country:"🇬🇧", avatar:"SM", g:"linear-gradient(135deg,#059669,#34d399)" },
  { name:"Ali H.",    role:"VP Eng",       country:"🇵🇰", avatar:"AH", g:"linear-gradient(135deg,#b45309,#f59e0b)" },
  { name:"Nadia Q.",  role:"Head Finance", country:"🇦🇪", avatar:"NQ", g:"linear-gradient(135deg,#be185d,#ec4899)" },
  { name:"Tariq M.",  role:"VP Sales",     country:"🇦🇪", avatar:"TM", g:"linear-gradient(135deg,#7c3aed,#a78bfa)" },
  { name:"Yusuf A.",  role:"Sr Engineer",  country:"🇳🇬", avatar:"YA", g:"linear-gradient(135deg,#4f46e5,#818cf8)" },
  { name:"Clara M.",  role:"PM",           country:"🇩🇪", avatar:"CM", g:"linear-gradient(135deg,#0891b2,#38bdf8)" },
  { name:"Priya S.",  role:"Designer",     country:"🇮🇳", avatar:"PS", g:"linear-gradient(135deg,#be185d,#f9a8d4)" },
  { name:"Kwame O.",  role:"CS Manager",   country:"🇬🇭", avatar:"KO", g:"linear-gradient(135deg,#059669,#6ee7b7)" },
  { name:"Lena B.",   role:"Marketing",    country:"🇸🇪", avatar:"LB", g:"linear-gradient(135deg,#b45309,#fbbf24)" },
  { name:"Rami S.",   role:"AE - MENA",    country:"🇸🇦", avatar:"RS", g:"linear-gradient(135deg,#7c3aed,#c4b5fd)" },
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
    }, { threshold: 0.08 });
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
export default function CulturePage() {
  const [heroVis,     setHeroVis]     = useState(false);
  const [openValue,   setOpenValue]   = useState<number|null>(null);
  const [activeDay,   setActiveDay]   = useState(0);

  useEffect(() => { setTimeout(()=>setHeroVis(true), 80); }, []);

  return (
    <main style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#080c1e 0%,#0c0f2e 50%,#080c1e 100%)",
      color:"white", fontFamily:"'DM Sans','Outfit',system-ui,sans-serif", overflowX:"hidden",
    }}>

      {/* ── HERO ── */}
      <section className="culture-hero" style={{ position:"relative", overflow:"hidden", padding:"130px 24px 90px", textAlign:"center" }}>
        <div style={{ position:"absolute", top:-120, left:"50%", transform:"translateX(-50%)", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.16) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:200, background:"linear-gradient(to bottom, transparent, #080c1e)", pointerEvents:"none", zIndex:1 }}/>

        {/* Floating team avatars */}
        <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
          {TEAM_MEMBERS.slice(0,8).map((m,i)=>{
            const positions = [
              {top:"15%",left:"5%"},{top:"25%",left:"14%"},{top:"55%",left:"4%"},{top:"70%",left:"16%"},
              {top:"15%",right:"5%"},{top:"30%",right:"12%"},{top:"58%",right:"5%"},{top:"72%",right:"15%"},
            ];
            const pos = positions[i];
            return (
              <div key={m.name} style={{ position:"absolute", ...pos,
                opacity:heroVis?.6:0, transform:heroVis?"translateY(0)":"translateY(20px)",
                transition:`opacity .8s ease ${.1+i*.08}s, transform .8s ease ${.1+i*.08}s`,
              }}>
                <div style={{ width:44, height:44, borderRadius:12, background:m.g, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"white", border:"2px solid rgba(255,255,255,.1)", boxShadow:"0 4px 20px rgba(0,0,0,.4)" }}>
                  {m.avatar}
                </div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", textAlign:"center", marginTop:4 }}>{m.country}</div>
              </div>
            );
          })}
        </div>

        <div style={{ maxWidth:680, margin:"0 auto", position:"relative", zIndex:2 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:24, background:"rgba(249,168,212,.1)", border:"1px solid rgba(249,168,212,.25)", marginBottom:24, opacity:heroVis?1:0, transition:"all .5s ease" }}>
            <span style={{ fontSize:16 }}>❤️</span>
            <span style={{ fontSize:12, fontWeight:800, color:"#f9a8d4", letterSpacing:".06em" }}>OUR CULTURE</span>
          </div>
          <h1 style={{ fontSize:"clamp(38px,6vw,64px)", fontWeight:900, letterSpacing:"-.03em", lineHeight:1.1, fontFamily:"Lora,Georgia,serif", margin:"0 0 22px", opacity:heroVis?1:0, transition:"all .6s ease .1s" }}>
            A company people
            <span style={{ display:"block", background:"linear-gradient(90deg,#f9a8d4,#818cf8,#38bdf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              are proud to build
            </span>
          </h1>
          <p style={{ fontSize:"clamp(15px,2vw,17px)", color:"rgba(255,255,255,.5)", lineHeight:1.75, maxWidth:500, margin:"0 auto 36px", opacity:heroVis?1:0, transition:"all .6s ease .2s" }}>
            Culture isn't a ping-pong table. It's how we make decisions, treat each other, and show up for our customers every single day.
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", opacity:heroVis?1:0, transition:"all .6s ease .3s" }}>
            <a href="#values" style={{ padding:"12px 28px", borderRadius:12, fontWeight:800, fontSize:13, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"white", textDecoration:"none", boxShadow:"0 4px 24px rgba(79,70,229,.4)" }}>
              Our Values
            </a>
            <Link href="/careers" style={{ padding:"12px 28px", borderRadius:12, fontWeight:700, fontSize:13, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.8)", textDecoration:"none" }}>
              We're Hiring →
            </Link>
          </div>
        </div>
      </section>

      {/* ── TEAM MOSAIC ── */}
      <Section>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 24px 80px" }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:12, justifyContent:"center" }}>
            {TEAM_MEMBERS.map(m=>(
              <div key={m.name} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                <div style={{ width:56, height:56, borderRadius:16, background:m.g, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:"white", border:"2px solid rgba(255,255,255,.08)", transition:"transform .2s", cursor:"default" }}
                  onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                >
                  {m.avatar}
                </div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.5)", fontWeight:600 }}>{m.name}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.25)" }}>{m.country} {m.role}</div>
              </div>
            ))}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4 }}>
              <div style={{ width:56, height:56, borderRadius:16, background:"rgba(99,102,241,.15)", border:"1.5px dashed rgba(99,102,241,.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:"#818cf8" }}>+</div>
              <div style={{ fontSize:10, color:"#818cf8", fontWeight:700 }}>108 more</div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── VALUES ── */}
      <Section id="values">
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <SectionLabel text="Core Values"/>
            <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 14px" }}>
              Six things we believe deeply
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", maxWidth:480, margin:"0 auto" }}>
              These aren't poster words. They're how we actually make decisions every day.
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {VALUES.map((v,i)=>(
              <div key={v.title}
                onClick={()=>setOpenValue(openValue===i?null:i)}
                style={{ background:openValue===i?`linear-gradient(135deg,${v.glow},rgba(255,255,255,.02))`:"rgba(255,255,255,.03)", borderRadius:16, border:`1px solid ${openValue===i?v.color+"55":"rgba(255,255,255,.07)"}`, cursor:"pointer", overflow:"hidden", transition:"all .2s" }}
              >
                <div style={{ padding:"22px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                    <div style={{ width:48, height:48, borderRadius:13, background:`${v.color}20`, border:`1px solid ${v.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                      {v.icon}
                    </div>
                    <div>
                      <div style={{ fontSize:16, fontWeight:700, color:"white" }}>{v.title}</div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:2 }}>{v.short}</div>
                    </div>
                  </div>
                  <span style={{ fontSize:20, color:v.color, transform:openValue===i?"rotate(45deg)":"rotate(0)", transition:"transform .2s", display:"inline-block", flexShrink:0 }}>+</span>
                </div>
                {openValue===i && (
                  <div style={{ padding:"0 24px 24px", borderTop:"1px solid rgba(255,255,255,.07)" }}>
                    <p style={{ fontSize:14, color:"rgba(255,255,255,.6)", lineHeight:1.8, margin:"20px 0 16px" }}>{v.long}</p>
                    <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,.3)", letterSpacing:".07em", textTransform:"uppercase", marginBottom:10 }}>In practice</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {v.examples.map(e=>(
                        <span key={e} style={{ padding:"5px 14px", borderRadius:20, background:`${v.color}15`, border:`1px solid ${v.color}30`, color:v.color, fontSize:12, fontWeight:600 }}>✓ {e}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── REMOTE WORK ── */}
      <Section>
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <SectionLabel text="How We Work"/>
            <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 14px" }}>
              Remote-first, seriously
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", maxWidth:500, margin:"0 auto" }}>
              We've been remote since day one. Not remote-friendly — remote-first. Here's what that actually means.
            </p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16 }}>
            {REMOTE_PRINCIPLES.map(p=>(
              <div key={p.title} style={{ padding:"24px 22px", borderRadius:16, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", display:"flex", gap:14 }}>
                <span style={{ fontSize:26, flexShrink:0 }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"white", marginBottom:6 }}>{p.title}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.65 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tools we use */}
          <div style={{ marginTop:32, padding:"24px 28px", borderRadius:16, background:"rgba(99,102,241,.06)", border:"1px solid rgba(99,102,241,.2)" }}>
            <div style={{ fontSize:12, fontWeight:800, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:14 }}>Our Remote Stack</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
              {[
                { name:"Notion",     desc:"Docs & Wiki",      color:"#818cf8" },
                { name:"Linear",     desc:"Project Mgmt",     color:"#818cf8" },
                { name:"Slack",      desc:"Communication",    color:"#34d399" },
                { name:"Loom",       desc:"Async Video",      color:"#f9a8d4" },
                { name:"Figma",      desc:"Design",           color:"#fbbf24" },
                { name:"GitHub",     desc:"Code",             color:"#38bdf8" },
                { name:"Zoom",       desc:"Sync Calls",       color:"#818cf8" },
                { name:"Deel",       desc:"Global Payroll",   color:"#34d399" },
              ].map(t=>(
                <div key={t.name} style={{ padding:"7px 14px", borderRadius:20, background:`${t.color}15`, border:`1px solid ${t.color}30`, display:"flex", gap:6, alignItems:"center" }}>
                  <span style={{ fontSize:12, fontWeight:800, color:t.color }}>{t.name}</span>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>{t.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── DAY IN THE LIFE ── */}
      <Section>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <SectionLabel text="Day in the Life"/>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,38px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 12px" }}>
              What a typical day looks like
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.4)" }}>No two days are identical — but here's a realistic picture.</p>
          </div>

          {/* Role selector */}
          <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:28 }}>
            {DAY_IN_LIFE.map((d,i)=>(
              <button key={d.role} onClick={()=>setActiveDay(i)}
                style={{ padding:"8px 20px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
                  background:activeDay===i?"linear-gradient(135deg,#4f46e5,#7c3aed)":"rgba(255,255,255,.05)",
                  color:activeDay===i?"white":"rgba(255,255,255,.4)" }}>
                {d.role}
              </button>
            ))}
          </div>

          {/* Day card */}
          {(() => {
            const d = DAY_IN_LIFE[activeDay];
            return (
              <div style={{ background:"rgba(255,255,255,.03)", borderRadius:20, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
                {/* Header */}
                <div style={{ padding:"24px 28px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", gap:16, background:"rgba(99,102,241,.06)" }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:d.gradient, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:"white", flexShrink:0 }}>{d.avatar}</div>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:"white" }}>{d.name}</div>
                    <div style={{ fontSize:12, color:"#818cf8", marginTop:2, fontWeight:600 }}>{d.role}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:1 }}>📍 {d.location}</div>
                  </div>
                </div>
                {/* Schedule */}
                <div style={{ padding:"8px 0" }}>
                  {d.schedule.map((s,i)=>(
                    <div key={i} style={{ display:"flex", gap:20, padding:"14px 28px", borderBottom:i<d.schedule.length-1?"1px solid rgba(255,255,255,.04)":"none", alignItems:"center" }}>
                      <div style={{ width:60, fontSize:11, fontWeight:800, color:"#818cf8", flexShrink:0, fontFamily:"monospace" }}>{s.time}</div>
                      <div style={{ width:2, height:2, borderRadius:"50%", background:"rgba(99,102,241,.4)", flexShrink:0 }}/>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,.65)", lineHeight:1.5 }}>{s.activity}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </Section>

      {/* ── DEI ── */}
      <Section>
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <SectionLabel text="Diversity & Inclusion"/>
            <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 14px" }}>
              Diversity isn't a metric.<br/>It's how we build better.
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", maxWidth:520, margin:"0 auto" }}>
              Different perspectives make our product better for every customer around the world. We work hard to build a team that reflects the world we serve.
            </p>
          </div>

          {/* Stats */}
          <div className="culture-4col" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:32 }}>
            {DEI_STATS.map(s=>(
              <div key={s.label} style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"24px 20px", textAlign:"center" }}>
                <div style={{ fontSize:32, fontWeight:900, color:s.color, fontFamily:"Lora,serif" }}>{s.value}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:6, lineHeight:1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Commitments */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:14 }}>
            {DEI_COMMITMENTS.map(c=>(
              <div key={c.title} style={{ padding:"22px 20px", borderRadius:16, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)" }}>
                <div style={{ fontSize:26, marginBottom:10 }}>{c.icon}</div>
                <div style={{ fontSize:14, fontWeight:700, color:"white", marginBottom:6 }}>{c.title}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.65 }}>{c.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:24, padding:"18px 22px", borderRadius:14, background:"rgba(249,168,212,.06)", border:"1px solid rgba(249,168,212,.2)", fontSize:13, color:"rgba(255,255,255,.5)", lineHeight:1.7 }}>
            📊 We publish an annual Diversity Report every January. Our goal is radical transparency — including our shortcomings and what we're doing to address them.
          </div>
        </div>
      </Section>

      {/* ── FINAL CTA ── */}
      <Section>
        <div style={{ maxWidth:700, margin:"0 auto", padding:"0 24px 120px", textAlign:"center" }}>
          <div style={{ padding:"52px 40px", borderRadius:24, background:"linear-gradient(135deg,rgba(79,70,229,.2),rgba(124,58,237,.12))", border:"1px solid rgba(99,102,241,.25)", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:"rgba(99,102,241,.15)", filter:"blur(50px)", pointerEvents:"none" }}/>
            <div style={{ position:"relative", zIndex:1 }}>
              <div style={{ fontSize:36, marginBottom:14 }}>✨</div>
              <h2 style={{ fontSize:"clamp(22px,3vw,32px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 12px" }}>
                Sound like your kind of place?
              </h2>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.45)", lineHeight:1.7, margin:"0 auto 28px", maxWidth:420 }}>
                We're hiring across engineering, product, sales, and more. Come build something that matters.
              </p>
              <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
                <Link href="/careers" style={{ padding:"13px 30px", borderRadius:12, fontWeight:800, fontSize:14, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"white", textDecoration:"none", boxShadow:"0 4px 24px rgba(79,70,229,.4)" }}>
                  See Open Roles
                </Link>
                <Link href="/roles" style={{ padding:"13px 30px", borderRadius:12, fontWeight:700, fontSize:14, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.8)", textDecoration:"none" }}>
                  Team Structure →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:.3} }
        * { box-sizing:border-box; }
        .culture-4col { grid-template-columns:repeat(4,1fr)!important; }
        @media(max-width:900px){
          .culture-4col{ grid-template-columns:repeat(2,1fr)!important; }
          .culture-hero{ padding:60px 20px 40px!important; }
          .culture-section{ padding:60px 20px!important; }
        }
        @media(max-width:480px){
          .culture-4col{ grid-template-columns:1fr 1fr!important; }
          .culture-hero{ padding:48px 16px 32px!important; }
          .culture-section{ padding:48px 16px!important; }
        }
      `}</style>
    </main>
  );
}