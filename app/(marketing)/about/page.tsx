"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ══════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════ */
const STATS = [
  { value: "12,000+", label: "Businesses Served",  icon: "⬡" },
  { value: "40+",     label: "Countries",           icon: "🌍" },
  { value: "$2.4B+",  label: "Transactions Processed", icon: "◆" },
  { value: "99.9%",   label: "Uptime SLA",          icon: "⬢" },
];

const VALUES = [
  {
    icon: "◈",
    title: "Clarity Over Complexity",
    desc: "Accounting software doesn't have to be intimidating. We obsess over making every feature intuitive — for founders, not just accountants.",
    color: "#818cf8",
    glow: "rgba(129,140,248,.15)",
  },
  {
    icon: "🌍",
    title: "Built for the World",
    desc: "From San Francisco to London to Dubai — every business deserves world-class financial tools, regardless of where they operate.",
    color: "#34d399",
    glow: "rgba(52,211,153,.12)",
  },
  {
    icon: "🔒",
    title: "Trust is Non-Negotiable",
    desc: "Your financial data is sacred. Strong encryption, strict access controls, and zero data selling — ever.",
    color: "#38bdf8",
    glow: "rgba(56,189,248,.12)",
  },
  {
    icon: "⚡",
    title: "Speed Matters",
    desc: "A month-end close should take hours, not days. We build for speed at every layer — from UI to infrastructure.",
    color: "#fbbf24",
    glow: "rgba(251,191,36,.12)",
  },
  {
    icon: "◎",
    title: "Customer Obsession",
    desc: "Every decision starts with the question: does this make our customers' lives easier? Support isn't a department — it's a mindset.",
    color: "#c4b5fd",
    glow: "rgba(196,181,253,.12)",
  },
  {
    icon: "✦",
    title: "Continuous Improvement",
    desc: "We ship updates every week. Our changelog is public. We listen, we iterate, and we never stop getting better.",
    color: "#f9a8d4",
    glow: "rgba(249,168,212,.12)",
  },
];

const TEAM = [
  {
    name: "Zara Ahmed",
    role: "Co-founder & CEO",
    bio: "Former Goldman Sachs. Built and sold two fintech startups before Finova. Passionate about democratising financial tools for emerging markets.",
    avatar: "ZA",
    gradient: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    linkedin: "#",
  },
  {
    name: "Omar Khalid",
    role: "Co-founder & CTO",
    bio: "Ex-Stripe engineering. 12 years building payments infrastructure at scale. Architect of Finova's real-time reconciliation engine.",
    avatar: "OK",
    gradient: "linear-gradient(135deg,#0891b2,#06b6d4)",
    linkedin: "#",
  },
  {
    name: "Sara Malik",
    role: "Chief Product Officer",
    bio: "Previously led product at Xero APAC. Turned complex accounting workflows into delightfully simple experiences used by thousands daily.",
    avatar: "SM",
    gradient: "linear-gradient(135deg,#059669,#34d399)",
    linkedin: "#",
  },
  {
    name: "Ali Hassan",
    role: "VP Engineering",
    bio: "Led backend teams at AWS and Revolut. Obsessed with reliability, latency, and systems that never go down.",
    avatar: "AH",
    gradient: "linear-gradient(135deg,#b45309,#f59e0b)",
    linkedin: "#",
  },
  {
    name: "Nadia Qureshi",
    role: "Head of Finance & Compliance",
    bio: "Chartered accountant with 15 years in Big Four. Ensures Finova meets every regulatory standard across our 40+ operating markets.",
    avatar: "NQ",
    gradient: "linear-gradient(135deg,#be185d,#ec4899)",
    linkedin: "#",
  },
  {
    name: "Tariq Mirza",
    role: "VP Sales & Partnerships",
    bio: "Built revenue from zero to $10M ARR at two SaaS companies. Leads our global GTM and channel partner ecosystem.",
    avatar: "TM",
    gradient: "linear-gradient(135deg,#7c3aed,#a78bfa)",
    linkedin: "#",
  },
];

const TIMELINE = [
  { year:"2020", title:"The Idea", desc:"Frustrated by outdated accounting software, Zara and Omar sketched the first version of Finova on a whiteboard in a San Francisco co-working space.", color:"#818cf8" },
  { year:"2021", title:"First 100 Customers", desc:"Launched in private beta. 100 businesses signed up in the first month. We knew we were onto something.", color:"#34d399" },
  { year:"2022", title:"Series A — $8M", desc:"Raised $8M led by Sequoia Southeast Asia. Expanded to UAE, Saudi Arabia, and the UK.", color:"#38bdf8" },
  { year:"2023", title:"10,000 Businesses", desc:"Hit 10,000 active businesses across 30 countries. Launched HR & Payroll module. Team grew to 85 people.", color:"#fbbf24" },
  { year:"2024", title:"Global Expansion", desc:"Opened offices in Dubai and London. Launched Enterprise plan. Processed over $1 billion in transactions.", color:"#c4b5fd" },
  { year:"2025", title:"The Platform Era", desc:"Expanded integrations, added more configurable workflows, and strengthened multi-currency support for growing businesses. 12,000 businesses and counting.", color:"#f9a8d4" },
];

const PRESS = [
  { name:"TechCrunch",   logo:"TC", quote:"Finova is redefining what SME accounting software can be in emerging markets." },
  { name:"Forbes",       logo:"F",  quote:"One of the 50 most promising fintech startups of 2024." },
  { name:"The Guardian", logo:"G",  quote:"The accounting tool quietly powering thousands of global businesses." },
  { name:"Bloomberg",    logo:"B",  quote:"A challenger to Xero and QuickBooks with a distinctly global DNA." },
];

const PERKS = [
  { icon:"🌍", label:"Remote-first" },
  { icon:"💰", label:"Competitive equity" },
  { icon:"🏥", label:"Full health cover" },
  { icon:"📚", label:"$2,000 learning budget" },
  { icon:"✈️",  label:"Annual team retreats" },
  { icon:"🕐", label:"Flexible hours" },
  { icon:"🍼", label:"Generous parental leave" },
  { icon:"💻", label:"Top-spec equipment" },
];

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, vis };
}

function Section({ children, style, id }: { children: React.ReactNode; style?: React.CSSProperties; id?: string }) {
  const { ref, vis } = useInView();
  return (
    <div ref={ref} id={id} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(32px)",
      transition: "opacity .65s ease, transform .65s ease",
      ...style,
    }}>
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
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVis, setHeroVis] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVis(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#080c1e 0%,#0c0f2e 50%,#080c1e 100%)",
      color: "white",
      fontFamily: "'DM Sans','Outfit',system-ui,sans-serif",
      overflowX: "hidden",
    }}>

      {/* ── HERO ── */}
      <section style={{
        position: "relative", overflow: "hidden",
        padding: "140px 24px 100px",
        textAlign: "center",
      }}>
        {/* Background orbs */}
        <div style={{ position:"absolute", top:-120, left:"50%", transform:"translateX(-50%)", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:60, left:"10%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,.12) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:40, right:"8%", width:250, height:250, borderRadius:"50%", background:"radial-gradient(circle,rgba(56,189,248,.1) 0%,transparent 70%)", pointerEvents:"none" }}/>

        <div ref={heroRef} style={{ maxWidth:760, margin:"0 auto", position:"relative", zIndex:1 }}>
          {/* Tag */}
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"6px 16px", borderRadius:24,
            background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.25)",
            marginBottom:28,
            opacity: heroVis?1:0, transform: heroVis?"translateY(0)":"translateY(16px)",
            transition:"opacity .6s ease, transform .6s ease",
          }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#34d399" }}/>
            <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:".06em" }}>OUR STORY</span>
          </div>

          {/* Heading */}
          <h1 style={{
            fontSize:"clamp(38px,6vw,68px)", fontWeight:900,
            letterSpacing:"-.03em", lineHeight:1.1,
            fontFamily:"Lora,Georgia,serif",
            margin:"0 0 24px",
            opacity: heroVis?1:0, transform: heroVis?"translateY(0)":"translateY(20px)",
            transition:"opacity .65s ease .1s, transform .65s ease .1s",
          }}>
            We're building the financial
            <span style={{ display:"block", background:"linear-gradient(90deg,#818cf8,#c4b5fd,#38bdf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              OS for global business
            </span>
          </h1>

          <p style={{
            fontSize:"clamp(16px,2vw,19px)", color:"rgba(255,255,255,.55)", lineHeight:1.75,
            margin:"0 auto 40px", maxWidth:580,
            opacity: heroVis?1:0, transform: heroVis?"translateY(0)":"translateY(20px)",
            transition:"opacity .65s ease .2s, transform .65s ease .2s",
          }}>
            Finova was born from a simple belief — every business in the world deserves accounting software that is powerful, beautiful, and actually affordable.
          </p>

          <div style={{
            display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap",
            opacity: heroVis?1:0, transform: heroVis?"translateY(0)":"translateY(20px)",
            transition:"opacity .65s ease .3s, transform .65s ease .3s",
          }}>
            <Link href="/signup" style={{
              padding:"13px 30px", borderRadius:12, fontWeight:800, fontSize:14,
              background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
              color:"white", textDecoration:"none",
              boxShadow:"0 4px 24px rgba(79,70,229,.4)",
            }}>
              Get Started
            </Link>
            <Link href="/careers" style={{
              padding:"13px 30px", borderRadius:12, fontWeight:700, fontSize:14,
              background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)",
              color:"rgba(255,255,255,.8)", textDecoration:"none",
            }}>
              We're Hiring →
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <Section>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 80px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16 }}>
            {STATS.map((s,i)=>(
              <div key={s.label} style={{
                background:"rgba(255,255,255,.03)", borderRadius:18,
                border:"1px solid rgba(255,255,255,.07)",
                padding:"28px 24px", textAlign:"center",
                transition:"transform .2s, box-shadow .2s",
              }}
                onMouseEnter={e=>(e.currentTarget.style.transform="translateY(-4px)")}
                onMouseLeave={e=>(e.currentTarget.style.transform="translateY(0)")}
              >
                <div style={{ fontSize:24, marginBottom:10 }}>{s.icon}</div>
                <div style={{ fontSize:36, fontWeight:900, color:"white", letterSpacing:"-.02em", fontFamily:"Lora,serif" }}>{s.value}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:6, fontWeight:500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── MISSION ── */}
      <Section>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 24px 100px", textAlign:"center" }}>
          <SectionLabel text="Our Mission"/>
          <h2 style={{ fontSize:"clamp(28px,4vw,44px)", fontWeight:800, letterSpacing:"-.02em", lineHeight:1.25, margin:"0 0 24px", fontFamily:"Lora,serif" }}>
            Finance tools shouldn't be a privilege
          </h2>
          <p style={{ fontSize:17, color:"rgba(255,255,255,.5)", lineHeight:1.8, maxWidth:680, margin:"0 auto 40px" }}>
            For too long, world-class accounting software has been expensive, complex, and built only for Western markets. Finova changes that. We're building infrastructure that makes every business — from a boutique in Singapore to a logistics firm in Lagos — financially unstoppable.
          </p>
          {/* Mission pillars */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginTop:20 }}>
            {[
              { icon:"💡", title:"Simplify", desc:"Turn complex accounting into intuitive workflows anyone can use." },
              { icon:"🌐", title:"Globalise", desc:"Multi-currency, multi-language, multi-compliance — one platform." },
              { icon:"🚀", title:"Accelerate", desc:"Close your books faster. Make better decisions. Grow quicker." },
            ].map(p=>(
              <div key={p.title} style={{ padding:"24px 20px", borderRadius:16, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)" }}>
                <div style={{ fontSize:28, marginBottom:10 }}>{p.icon}</div>
                <div style={{ fontSize:15, fontWeight:700, color:"white", marginBottom:6 }}>{p.title}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.6 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── STORY / TIMELINE ── */}
      <Section>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <SectionLabel text="Our Journey"/>
            <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:0 }}>
              From a shared workspace<br/>to 40+ countries
            </h2>
          </div>
          <div style={{ position:"relative" }}>
            {/* Center line */}
            <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:2, background:"rgba(99,102,241,.2)", transform:"translateX(-50%)" }}/>
            {TIMELINE.map((t, i)=>{
              const isLeft = i%2===0;
              return (
                <div key={t.year} style={{
                  display:"flex", justifyContent: isLeft?"flex-start":"flex-end",
                  marginBottom:32, position:"relative",
                }}>
                  {/* Dot */}
                  <div style={{
                    position:"absolute", left:"50%", top:18, transform:"translateX(-50%)",
                    width:14, height:14, borderRadius:"50%",
                    background:t.color, border:"3px solid #080c1e",
                    boxShadow:`0 0 12px ${t.color}66`, zIndex:1,
                  }}/>
                  {/* Card */}
                  <div style={{
                    width:"44%",
                    marginLeft: isLeft?0:"6%",
                    marginRight: isLeft?"6%":0,
                    background:"rgba(255,255,255,.03)", borderRadius:14,
                    border:`1px solid rgba(255,255,255,.07)`,
                    padding:"18px 20px",
                    borderLeft: isLeft?`3px solid ${t.color}`:"1px solid rgba(255,255,255,.07)",
                    borderRight: !isLeft?`3px solid ${t.color}`:"1px solid rgba(255,255,255,.07)",
                  }}>
                    <div style={{ fontSize:11, fontWeight:800, color:t.color, letterSpacing:".08em", marginBottom:6 }}>{t.year}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:"white", marginBottom:6 }}>{t.title}</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", lineHeight:1.6 }}>{t.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ── VALUES ── */}
      <Section>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <SectionLabel text="What We Believe"/>
            <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:0 }}>
              Values that guide everything
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
            {VALUES.map(v=>(
              <div key={v.title} style={{
                padding:"26px 24px", borderRadius:18,
                background:`linear-gradient(135deg,${v.glow},rgba(255,255,255,.02))`,
                border:"1px solid rgba(255,255,255,.07)",
                transition:"transform .2s, box-shadow .2s",
              }}
                onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 12px 40px ${v.glow}`; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}
              >
                <div style={{ fontSize:28, marginBottom:14, color:v.color }}>{v.icon}</div>
                <div style={{ fontSize:15, fontWeight:700, color:"white", marginBottom:8 }}>{v.title}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", lineHeight:1.7 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── TEAM ── */}
      <Section>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <SectionLabel text="The Team"/>
            <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 14px" }}>
              Built by people who've been there
            </h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:520, margin:"0 auto" }}>
              Our team brings together experience from Stripe, Goldman Sachs, Xero, AWS, and Revolut — all united by a passion for building great software.
            </p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:20 }}>
            {TEAM.map(m=>(
              <div key={m.name} style={{
                background:"rgba(255,255,255,.03)", borderRadius:18,
                border:"1px solid rgba(255,255,255,.07)",
                padding:"24px",
                transition:"transform .2s, border-color .2s",
              }}
                onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.borderColor="rgba(99,102,241,.3)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="rgba(255,255,255,.07)"; }}
              >
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:m.gradient, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:"white", flexShrink:0 }}>
                    {m.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:"white" }}>{m.name}</div>
                    <div style={{ fontSize:12, color:"#818cf8", marginTop:2, fontWeight:600 }}>{m.role}</div>
                  </div>
                </div>
                <p style={{ fontSize:13, color:"rgba(255,255,255,.45)", lineHeight:1.7, margin:0 }}>{m.bio}</p>
                <a href={m.linkedin} style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:14, fontSize:12, color:"rgba(255,255,255,.3)", textDecoration:"none", fontWeight:600 }}
                  onMouseEnter={e=>(e.currentTarget.style.color="#818cf8")}
                  onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.3)")}
                >
                  in LinkedIn →
                </a>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── PRESS ── */}
      <Section>
        <div style={{ maxWidth:1000, margin:"0 auto", padding:"0 24px 100px", textAlign:"center" }}>
          <SectionLabel text="In The Press"/>
          <h2 style={{ fontSize:"clamp(22px,3vw,34px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 40px" }}>
            What the world is saying
          </h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16 }}>
            {PRESS.map(p=>(
              <div key={p.name} style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"24px 20px" }}>
                <div style={{ width:40, height:40, borderRadius:10, background:"rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:"white", margin:"0 auto 14px" }}>
                  {p.logo}
                </div>
                <div style={{ fontSize:15, fontWeight:800, color:"white", marginBottom:10 }}>{p.name}</div>
                <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.6, margin:0, fontStyle:"italic" }}>"{p.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CAREERS ── */}
      <Section>
        <div style={{ maxWidth:960, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{
            borderRadius:24, overflow:"hidden", position:"relative",
            background:"linear-gradient(135deg,#1e1b4b,#312e81,#1e1b4b)",
            border:"1px solid rgba(99,102,241,.3)",
            padding:"56px 48px",
          }}>
            {/* BG decoration */}
            <div style={{ position:"absolute", top:-80, right:-80, width:300, height:300, borderRadius:"50%", background:"rgba(99,102,241,.15)", filter:"blur(60px)", pointerEvents:"none" }}/>
            <div style={{ position:"absolute", bottom:-60, left:-60, width:250, height:250, borderRadius:"50%", background:"rgba(124,58,237,.12)", filter:"blur(50px)", pointerEvents:"none" }}/>

            <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", justifyContent:"space-between", gap:32, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:280 }}>
                <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 14px", borderRadius:20, background:"rgba(99,102,241,.2)", border:"1px solid rgba(99,102,241,.3)", marginBottom:16 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"#34d399" }}/>
                  <span style={{ fontSize:11, fontWeight:800, color:"#818cf8", letterSpacing:".08em" }}>WE'RE HIRING</span>
                </div>
                <h2 style={{ fontSize:"clamp(24px,3.5vw,36px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 14px", lineHeight:1.2 }}>
                  Join us in building<br/>the future of finance
                </h2>
                <p style={{ fontSize:15, color:"rgba(255,255,255,.5)", lineHeight:1.7, margin:"0 0 24px", maxWidth:440 }}>
                  We're a remote-first team of 120+ across 18 countries. If you care about craft, customers, and impact — we want to hear from you.
                </p>
                {/* Perks */}
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:28 }}>
                  {PERKS.map(p=>(
                    <div key={p.label} style={{ padding:"5px 12px", borderRadius:20, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", fontSize:12, color:"rgba(255,255,255,.6)", fontWeight:600 }}>
                      {p.icon} {p.label}
                    </div>
                  ))}
                </div>
                <Link href="/careers" style={{
                  display:"inline-flex", alignItems:"center", gap:8,
                  padding:"13px 28px", borderRadius:12,
                  background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
                  color:"white", textDecoration:"none", fontWeight:800, fontSize:14,
                  boxShadow:"0 4px 24px rgba(79,70,229,.4)",
                }}>
                  View Open Roles →
                </Link>
              </div>

              {/* Open roles count */}
              <div style={{ textAlign:"center", flexShrink:0 }}>
                <div style={{ fontSize:72, fontWeight:900, color:"white", letterSpacing:"-.03em", lineHeight:1, fontFamily:"Lora,serif" }}>24</div>
                <div style={{ fontSize:14, color:"rgba(255,255,255,.4)", marginTop:4, fontWeight:600 }}>Open Positions</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.25)", marginTop:4 }}>Across 8 departments</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── FINAL CTA ── */}
      <Section>
        <div style={{ maxWidth:680, margin:"0 auto", padding:"0 24px 120px", textAlign:"center" }}>
          <SectionLabel text="Get Started"/>
          <h2 style={{ fontSize:"clamp(28px,4vw,44px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 16px" }}>
            Ready to transform your finances?
          </h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.45)", lineHeight:1.7, margin:"0 auto 36px", maxWidth:480 }}>
            Join 12,000+ businesses who've made the switch. Free 14-day trial. No credit card required.
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", marginBottom:48 }}>
            <Link href="/signup" style={{
              padding:"14px 34px", borderRadius:12, fontWeight:800, fontSize:15,
              background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
              color:"white", textDecoration:"none",
              boxShadow:"0 4px 24px rgba(79,70,229,.4)",
            }}>
              Get Started
            </Link>
            <Link href="/demo" style={{
              padding:"14px 34px", borderRadius:12, fontWeight:700, fontSize:15,
              background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)",
              color:"rgba(255,255,255,.8)", textDecoration:"none",
            }}>
              Try Live Demo
            </Link>
          </div>

          <div style={{ display:"flex", gap:28, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/blog" style={{ fontSize:13, fontWeight:700, color:"#818cf8", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6 }}>
              📚 Read our blog →
            </Link>
            <Link href="/contact" style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.45)", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6 }}>
              Talk to Sales →
            </Link>
          </div>
        </div>
      </Section>

    </main>
  );
}
