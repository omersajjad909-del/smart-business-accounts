"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ══════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════ */
const STATS = [
  { value:"120+",  label:"Team Members",    icon:"👥" },
  { value:"18",    label:"Countries",       icon:"🌍" },
  { value:"4.8★",  label:"Glassdoor Rating",icon:"⭐" },
  { value:"94%",   label:"Would Recommend", icon:"❤️" },
];

const PERKS = [
  { icon:"🌍", title:"Remote-First",         desc:"Work from anywhere in the world. We care about output, not office hours." },
  { icon:"💰", title:"Equity for Everyone",  desc:"Every employee gets meaningful equity. We grow together, we win together." },
  { icon:"🏥", title:"Full Health Cover",    desc:"Medical, dental, and vision — fully covered for you and your family." },
  { icon:"📚", title:"$2,000 Learning Budget",desc:"Books, courses, conferences — invest in yourself, on us." },
  { icon:"✈️",  title:"Annual Team Retreats", desc:"We fly the whole team together once a year to connect in person." },
  { icon:"🕐", title:"Flexible Hours",       desc:"Async-first culture. No mandatory 9-to-5. Own your schedule." },
  { icon:"🍼", title:"Parental Leave",       desc:"16 weeks fully paid for all parents, regardless of how you became one." },
  { icon:"💻", title:"Top-Spec Equipment",  desc:"MacBook Pro, 4K monitor, everything you need to do your best work." },
  { icon:"🧘", title:"Wellness Stipend",     desc:"$100/month for gym, therapy, meditation apps — your wellbeing matters." },
  { icon:"🎯", title:"Clear Growth Paths",  desc:"Bi-annual reviews, promotion frameworks, and a manager who invests in you." },
];

const DEPARTMENTS = [
  { id:"all",         label:"All Roles",       count:24 },
  { id:"engineering", label:"Engineering",     count:10 },
  { id:"product",     label:"Product & Design",count:4  },
  { id:"sales",       label:"Sales & GTM",     count:4  },
  { id:"operations",  label:"Operations",      count:3  },
  { id:"support",     label:"Customer Success",count:3  },
];

const JOBS = [
  {
    id:"1", title:"Senior Backend Engineer",     dept:"engineering",  location:"Remote · Worldwide",   type:"Full-time",   level:"Senior",
    desc:"Build the core financial infrastructure that powers 12,000+ businesses. Work with Prisma, Next.js, PostgreSQL, and distributed systems at scale.",
    tags:["Node.js","TypeScript","PostgreSQL","Redis"],
    posted:"3 days ago", color:"#818cf8",
  },
  {
    id:"2", title:"Frontend Engineer (React)",    dept:"engineering",  location:"Remote · Worldwide",   type:"Full-time",   level:"Mid–Senior",
    desc:"Own the user-facing product experience. We move fast and ship weekly. You'll work directly with product and design to build features users love.",
    tags:["React","Next.js","TypeScript","Tailwind"],
    posted:"3 days ago", color:"#818cf8",
  },
  {
    id:"3", title:"DevOps / Platform Engineer",   dept:"engineering",  location:"Remote · Worldwide",   type:"Full-time",   level:"Senior",
    desc:"Own our cloud infrastructure. We run on AWS, Kubernetes, and care deeply about latency, reliability, and zero-downtime deployments.",
    tags:["AWS","Kubernetes","Terraform","CI/CD"],
    posted:"1 week ago", color:"#818cf8",
  },
  {
    id:"4", title:"Mobile Engineer (React Native)",dept:"engineering", location:"Remote · Worldwide",   type:"Full-time",   level:"Mid–Senior",
    desc:"Build our iOS and Android apps from scratch. You'll set the architecture and shape the mobile experience for thousands of daily users.",
    tags:["React Native","TypeScript","iOS","Android"],
    posted:"1 week ago", color:"#818cf8",
  },
  {
    id:"5", title:"Security Engineer",            dept:"engineering",  location:"Remote · Worldwide",   type:"Full-time",   level:"Senior",
    desc:"Protect financial data for 12,000+ businesses. Own pen testing, SOC 2 compliance, security reviews, and incident response.",
    tags:["Security","SOC2","Penetration Testing"],
    posted:"2 weeks ago", color:"#818cf8",
  },
  {
    id:"6", title:"Product Manager — Accounting", dept:"product",      location:"Remote · Worldwide",   type:"Full-time",   level:"Senior",
    desc:"Own the core accounting product. Define roadmap, write specs, work with engineers and designers to ship features that delight accountants.",
    tags:["Product","Accounting","B2B SaaS"],
    posted:"5 days ago", color:"#34d399",
  },
  {
    id:"7", title:"Senior Product Designer",      dept:"product",      location:"Remote · Worldwide",   type:"Full-time",   level:"Senior",
    desc:"Design beautiful, intuitive financial tools. We care deeply about craft. Work on complex flows — invoicing, reconciliation, payroll — and make them simple.",
    tags:["Figma","Design Systems","UX Research"],
    posted:"5 days ago", color:"#34d399",
  },
  {
    id:"8", title:"UX Researcher",                dept:"product",      location:"Remote · Worldwide",   type:"Full-time",   level:"Mid",
    desc:"Talk to customers, uncover pain points, translate insights into product decisions. Be the voice of 12,000 businesses inside our product team.",
    tags:["User Research","Qualitative","Usability"],
    posted:"1 week ago", color:"#34d399",
  },
  {
    id:"9",  title:"Account Executive — MENA",    dept:"sales",        location:"Dubai · UAE",          type:"Full-time",   level:"Mid–Senior",
    desc:"Close enterprise deals across the Middle East. You'll own the full sales cycle — from demo to signed contract — for our fastest-growing region.",
    tags:["B2B Sales","SaaS","Arabic (preferred)"],
    posted:"2 days ago", color:"#fbbf24",
  },
  {
    id:"10", title:"Account Executive — UK/EU",   dept:"sales",        location:"London · UK (Remote)", type:"Full-time",   level:"Mid–Senior",
    desc:"Build our UK and European business from the ground up. Significant equity upside for the right candidate who can open new markets.",
    tags:["B2B Sales","SaaS","Fintech"],
    posted:"2 days ago", color:"#fbbf24",
  },
  {
    id:"11", title:"Partnerships Manager",         dept:"sales",        location:"Remote · Worldwide",   type:"Full-time",   level:"Mid",
    desc:"Build our reseller and integration partner ecosystem. Own relationships with accounting firms, ERP vendors, and local channel partners.",
    tags:["Partnerships","Channel Sales","SaaS"],
    posted:"1 week ago", color:"#fbbf24",
  },
  {
    id:"12", title:"Growth Marketing Manager",     dept:"sales",        location:"Remote · Worldwide",   type:"Full-time",   level:"Senior",
    desc:"Own demand gen, SEO, paid acquisition, and product-led growth. Analytical, creative, and hungry to grow a global SaaS brand.",
    tags:["Growth","SEO","Paid Ads","Analytics"],
    posted:"1 week ago", color:"#fbbf24",
  },
  {
    id:"13", title:"Finance & Accounting Manager", dept:"operations",   location:"Remote · Worldwide",   type:"Full-time",   level:"Senior",
    desc:"Manage FinovaOS's own finances — ironic but true. Own month-end close, financial reporting, and help us practice what we preach.",
    tags:["ACCA","Finance","Reporting"],
    posted:"3 days ago", color:"#38bdf8",
  },
  {
    id:"14", title:"People Operations Manager",    dept:"operations",   location:"Remote · Worldwide",   type:"Full-time",   level:"Mid",
    desc:"Build the systems that help 120+ remote teammates thrive. Own hiring ops, onboarding, performance cycles, and team culture.",
    tags:["HR","People Ops","Remote Culture"],
    posted:"1 week ago", color:"#38bdf8",
  },
  {
    id:"15", title:"Legal & Compliance Counsel",   dept:"operations",   location:"Remote · Worldwide",   type:"Contract",    level:"Senior",
    desc:"Navigate financial regulations across 40+ countries. Support GDPR, data privacy, commercial contracts, and regional compliance requirements.",
    tags:["Legal","Compliance","GDPR","Fintech"],
    posted:"2 weeks ago", color:"#38bdf8",
  },
  {
    id:"16", title:"Customer Success Manager",     dept:"support",      location:"Remote · Worldwide",   type:"Full-time",   level:"Mid",
    desc:"Own a portfolio of Pro and Enterprise customers. Reduce churn, drive adoption, run QBRs, and be the trusted advisor our customers deserve.",
    tags:["Customer Success","SaaS","Fintech"],
    posted:"4 days ago", color:"#f9a8d4",
  },
  {
    id:"17", title:"Technical Support Engineer",   dept:"support",      location:"Remote · Worldwide",   type:"Full-time",   level:"Mid",
    desc:"Solve complex technical issues for our business customers. Bridge the gap between customers and engineering. Know the product inside out.",
    tags:["Technical Support","SQL","APIs"],
    posted:"4 days ago", color:"#f9a8d4",
  },
  {
    id:"18", title:"Onboarding Specialist",        dept:"support",      location:"Remote / Global",        type:"Full-time",  level:"Junior",
    desc:"Help new customers get up and running fast. Run live onboarding sessions, create training materials, and make first impressions count.",
    tags:["Onboarding","Training","SaaS"],
    posted:"1 week ago", color:"#f9a8d4",
  },
];

const PROCESS = [
  { step:"01", title:"Apply Online",       desc:"Submit your CV and a short note on why FinovaOS. No cover letter essays — just be genuine.",   icon:"📋", color:"#818cf8" },
  { step:"02", title:"Intro Call",         desc:"30 min with someone from our team. We want to learn about you, and you should learn about us.", icon:"☎️", color:"#34d399" },
  { step:"03", title:"Skills Assessment",  desc:"A practical, paid task relevant to the role. We respect your time — max 3 hours.",              icon:"💡", color:"#38bdf8" },
  { step:"04", title:"Team Interviews",    desc:"2–3 conversations with future teammates and your hiring manager. No trick questions.",           icon:"👥", color:"#fbbf24" },
  { step:"05", title:"Offer & Onboarding", desc:"Fast decisions. Offer within 3 days of final interview. Join a team that's excited to have you.",icon:"🎉", color:"#c4b5fd" },
];

const TESTIMONIALS = [
  { name:"Ayesha K.",   role:"Senior Engineer, 2 years",        avatar:"AK", gradient:"linear-gradient(135deg,#4f46e5,#7c3aed)", quote:"The best team I've ever worked on. Everyone is sharp, kind, and genuinely cares about doing great work. Remote culture actually works here." },
  { name:"James T.",    role:"Product Manager, 1.5 years",       avatar:"JT", gradient:"linear-gradient(135deg,#0891b2,#06b6d4)", quote:"I've worked at Stripe and Monzo. FinovaOS's pace of shipping is unreal. You see your work in production the same week you build it." },
  { name:"Fatima N.",   role:"Customer Success, 3 years",        avatar:"FN", gradient:"linear-gradient(135deg,#059669,#34d399)", quote:"FinovaOS actually invests in your growth. My manager helped me go from Support to CS Lead in 18 months. The learning budget is real — I used all of mine." },
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
export default function CareersPage() {
  const [heroVis,    setHeroVis]    = useState(false);
  const [activeDept, setActiveDept] = useState("all");
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<typeof JOBS[0]|null>(null);

  useEffect(() => { setTimeout(()=>setHeroVis(true), 80); }, []);

  const filtered = JOBS.filter(j =>
    (activeDept==="all" || j.dept===activeDept) &&
    (!search || j.title.toLowerCase().includes(search.toLowerCase()) ||
     j.tags.some(t=>t.toLowerCase().includes(search.toLowerCase())))
  );

  const LEVEL_COLOR: Record<string,string> = {
    Junior:"#34d399", Mid:"#818cf8", "Mid–Senior":"#38bdf8", Senior:"#fbbf24",
  };
  const TYPE_COLOR: Record<string,string> = {
    "Full-time":"#34d399", Contract:"#fbbf24", "Part-time":"#818cf8",
  };

  return (
    <main style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#080c1e 0%,#0c0f2e 50%,#080c1e 100%)",
      color:"white",
      fontFamily:"'DM Sans','Outfit',system-ui,sans-serif",
      overflowX:"hidden",
    }}>

      {/* ── HERO ── */}
      <Section style={{ position:"relative", overflow:"hidden", padding:"130px 24px 90px", textAlign:"center" }}>
        <div style={{ position:"absolute", top:-120, left:"50%", transform:"translateX(-50%)", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:80, left:"8%", width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(52,211,153,.1) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:60, right:"6%", width:240, height:240, borderRadius:"50%", background:"radial-gradient(circle,rgba(56,189,248,.1) 0%,transparent 70%)", pointerEvents:"none" }}/>

        <div style={{ maxWidth:720, margin:"0 auto", position:"relative", zIndex:1 }}>
          {/* Hiring badge */}
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px",
            borderRadius:24, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.25)",
            marginBottom:24,
            opacity:heroVis?1:0, transform:heroVis?"translateY(0)":"translateY(16px)",
            transition:"opacity .5s ease, transform .5s ease",
          }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#34d399", animation:"blink 1.5s ease infinite" }}/>
            <span style={{ fontSize:12, fontWeight:800, color:"#34d399", letterSpacing:".06em" }}>24 OPEN POSITIONS</span>
          </div>

          <h1 style={{
            fontSize:"clamp(38px,6vw,66px)", fontWeight:900, letterSpacing:"-.03em", lineHeight:1.1,
            fontFamily:"Lora,Georgia,serif", margin:"0 0 22px",
            opacity:heroVis?1:0, transform:heroVis?"translateY(0)":"translateY(20px)",
            transition:"opacity .65s ease .1s, transform .65s ease .1s",
          }}>
            Build the future of
            <span style={{ display:"block", background:"linear-gradient(90deg,#818cf8,#c4b5fd,#38bdf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              global finance
            </span>
          </h1>

          <p style={{
            fontSize:"clamp(15px,2vw,18px)", color:"rgba(255,255,255,.5)", lineHeight:1.75,
            maxWidth:520, margin:"0 auto 36px",
            opacity:heroVis?1:0, transform:heroVis?"translateY(0)":"translateY(16px)",
            transition:"opacity .6s ease .2s, transform .6s ease .2s",
          }}>
            We're a remote-first team on a mission to make world-class financial tools accessible to every business on the planet. Come help us do it.
          </p>

          <div style={{
            display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap",
            opacity:heroVis?1:0, transform:heroVis?"translateY(0)":"translateY(16px)",
            transition:"opacity .6s ease .3s, transform .6s ease .3s",
          }}>
            <a href="/roles" style={{ padding:"13px 30px", borderRadius:12, fontWeight:800, fontSize:14, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"white", textDecoration:"none", boxShadow:"0 4px 24px rgba(79,70,229,.4)" }}>
              See Open Roles
            </a>
            <a href="/culture" style={{ padding:"13px 30px", borderRadius:12, fontWeight:700, fontSize:14, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.8)", textDecoration:"none" }}>
              Our Culture
            </a>
          </div>
        </div>
      </Section>

      {/* ── STATS ── */}
      <Section>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 24px 80px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14 }}>
            {STATS.map(s=>(
              <div key={s.label} style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"24px 20px", textAlign:"center" }}>
                <div style={{ fontSize:22, marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontSize:32, fontWeight:900, color:"white", letterSpacing:"-.02em", fontFamily:"Lora,serif" }}>{s.value}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── PERKS ── */}
      <Section id="culture">
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <SectionLabel text="Life at FinovaOS"/>
            <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 14px" }}>
              Where great people do great work
            </h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:500, margin:"0 auto" }}>
              We've built the kind of company we always wanted to work at. Here's what that looks like.
            </p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16 }}>
            {PERKS.map(p=>(
              <div key={p.title} style={{
                padding:"22px 20px", borderRadius:16, background:"rgba(255,255,255,.03)",
                border:"1px solid rgba(255,255,255,.07)", display:"flex", gap:14, alignItems:"flex-start",
                transition:"transform .2s, border-color .2s",
              }}
                onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.borderColor="rgba(99,102,241,.25)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="rgba(255,255,255,.07)"; }}
              >
                <span style={{ fontSize:26, flexShrink:0 }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"white", marginBottom:5 }}>{p.title}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.6 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── TESTIMONIALS ── */}
      <Section>
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <SectionLabel text="From the Team"/>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,38px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:0 }}>
              Don't take our word for it
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:20 }}>
            {TESTIMONIALS.map(t=>(
              <div key={t.name} style={{ background:"rgba(255,255,255,.03)", borderRadius:18, border:"1px solid rgba(255,255,255,.07)", padding:"28px 24px" }}>
                <div style={{ fontSize:28, color:"#818cf8", marginBottom:16, lineHeight:1 }}>"</div>
                <p style={{ fontSize:14, color:"rgba(255,255,255,.6)", lineHeight:1.75, margin:"0 0 20px", fontStyle:"italic" }}>{t.quote}</p>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:t.gradient, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"white", flexShrink:0 }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"white" }}>{t.name}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── HIRING PROCESS ── */}
      <Section>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <SectionLabel text="How We Hire"/>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,38px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 12px" }}>
              A process that respects your time
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.4)" }}>From application to offer in under 3 weeks.</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:0, position:"relative" }}>
            {/* Connector line */}
            <div style={{ position:"absolute", left:27, top:24, bottom:24, width:2, background:"rgba(99,102,241,.15)" }}/>
            {PROCESS.map((p,i)=>(
              <div key={p.step} style={{ display:"flex", gap:20, alignItems:"flex-start", padding:"0 0 28px", position:"relative" }}>
                {/* Step circle */}
                <div style={{ width:56, height:56, borderRadius:"50%", background:`${p.color}20`, border:`2px solid ${p.color}60`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, zIndex:1, position:"relative" }}>
                  {p.icon}
                </div>
                <div style={{ padding:"10px 0" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <span style={{ fontSize:10, fontWeight:800, color:p.color, letterSpacing:".08em" }}>STEP {p.step}</span>
                  </div>
                  <div style={{ fontSize:16, fontWeight:700, color:"white", marginBottom:5 }}>{p.title}</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", lineHeight:1.65, maxWidth:580 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── OPEN ROLES ── */}
      <Section id="roles">
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <SectionLabel text="Open Roles"/>
            <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 12px" }}>
              Find your role
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.4)" }}>
              {JOBS.length} open positions across {DEPARTMENTS.length-1} departments
            </p>
          </div>

          {/* Search + Filter */}
          <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:24, flexWrap:"wrap" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search by title or skill..."
              style={{ flex:1, minWidth:220, padding:"11px 16px", borderRadius:12, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, outline:"none" }}/>
          </div>

          {/* Dept tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:28, flexWrap:"wrap" }}>
            {DEPARTMENTS.map(d=>(
              <button key={d.id} onClick={()=>setActiveDept(d.id)}
                style={{ padding:"7px 16px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
                  background:activeDept===d.id?"linear-gradient(135deg,#4f46e5,#7c3aed)":"rgba(255,255,255,.05)",
                  color:activeDept===d.id?"white":"rgba(255,255,255,.4)" }}>
                {d.label}
                <span style={{ marginLeft:6, padding:"1px 7px", borderRadius:20, background:activeDept===d.id?"rgba(255,255,255,.2)":"rgba(255,255,255,.08)", fontSize:10, fontWeight:800 }}>{d.count}</span>
              </button>
            ))}
          </div>

          {/* Jobs grid */}
          {filtered.length===0 ? (
            <div style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:14 }}>
              No roles found — try a different search or department.
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {filtered.map(job=>(
                <div key={job.id}
                  onClick={()=>setSelected(selected?.id===job.id?null:job)}
                  style={{
                    background:"rgba(255,255,255,.03)", borderRadius:16,
                    border:`1px solid ${selected?.id===job.id?"rgba(99,102,241,.35)":"rgba(255,255,255,.07)"}`,
                    padding:"20px 24px", cursor:"pointer",
                    transition:"all .2s",
                  }}
                  onMouseEnter={e=>{ if(selected?.id!==job.id) e.currentTarget.style.borderColor="rgba(99,102,241,.2)"; e.currentTarget.style.transform="translateY(-2px)"; }}
                  onMouseLeave={e=>{ if(selected?.id!==job.id) e.currentTarget.style.borderColor="rgba(255,255,255,.07)"; e.currentTarget.style.transform="translateY(0)"; }}
                >
                  {/* Job header */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ width:42, height:42, borderRadius:12, background:`${job.color}20`, border:`1px solid ${job.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                        {job.dept==="engineering"?"⚙️":job.dept==="product"?"🎨":job.dept==="sales"?"💼":job.dept==="operations"?"🏢":"🤝"}
                      </div>
                      <div>
                        <div style={{ fontSize:16, fontWeight:700, color:"white" }}>{job.title}</div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2, display:"flex", gap:12 }}>
                          <span>📍 {job.location}</span>
                          <span>⏱ {job.posted}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                      <span style={{ padding:"4px 10px", borderRadius:20, background:`${LEVEL_COLOR[job.level]||"#818cf8"}20`, color:LEVEL_COLOR[job.level]||"#818cf8", fontSize:10, fontWeight:800 }}>{job.level}</span>
                      <span style={{ padding:"4px 10px", borderRadius:20, background:`${TYPE_COLOR[job.type]||"#818cf8"}20`, color:TYPE_COLOR[job.type]||"#818cf8", fontSize:10, fontWeight:800 }}>{job.type}</span>
                      <span style={{ fontSize:18, color:"rgba(255,255,255,.3)", transform:selected?.id===job.id?"rotate(180deg)":"rotate(0)", transition:"transform .2s", display:"inline-block" }}>⌄</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {selected?.id===job.id && (
                    <div style={{ marginTop:20, paddingTop:20, borderTop:"1px solid rgba(255,255,255,.07)" }}>
                      <p style={{ fontSize:14, color:"rgba(255,255,255,.55)", lineHeight:1.75, margin:"0 0 16px" }}>{job.desc}</p>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
                        {job.tags.map(t=>(
                          <span key={t} style={{ padding:"4px 12px", borderRadius:20, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.25)", color:"#818cf8", fontSize:11, fontWeight:700 }}>{t}</span>
                        ))}
                      </div>
                      <div style={{ display:"flex", gap:12 }}>
                        <a href={`/careers/apply?role=${job.id}&title=${encodeURIComponent(job.title)}`}
                          style={{ padding:"11px 28px", borderRadius:11, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"white", fontWeight:800, fontSize:13, textDecoration:"none", boxShadow:"0 4px 20px rgba(79,70,229,.4)" }}
                          onClick={e=>e.stopPropagation()}>
                          Apply Now →
                        </a>
                        <button onClick={e=>{ e.stopPropagation(); navigator.clipboard.writeText(window.location.origin+`/careers?role=${job.id}`); }}
                          style={{ padding:"11px 20px", borderRadius:11, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.6)", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                          Share Role
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── FINAL CTA ── */}
      <Section>
        <div style={{ maxWidth:700, margin:"0 auto", padding:"0 24px 120px", textAlign:"center" }}>
          <div style={{ padding:"52px 40px", borderRadius:24, background:"linear-gradient(135deg,rgba(79,70,229,.2),rgba(124,58,237,.12))", border:"1px solid rgba(99,102,241,.25)", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:"rgba(99,102,241,.15)", filter:"blur(50px)", pointerEvents:"none" }}/>
            <div style={{ position:"relative", zIndex:1 }}>
              <div style={{ fontSize:36, marginBottom:14 }}>🚀</div>
              <h2 style={{ fontSize:"clamp(22px,3vw,32px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 12px" }}>
                Don't see the right role?
              </h2>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.45)", lineHeight:1.7, margin:"0 auto 28px", maxWidth:420 }}>
                We're always looking for exceptional people. Send us your CV and tell us how you'd contribute — we read every email.
              </p>
              <a href="mailto:finovaos.app@gmail.com" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"13px 30px", borderRadius:12, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"white", textDecoration:"none", fontWeight:800, fontSize:14, boxShadow:"0 4px 24px rgba(79,70,229,.4)" }}>
                📧 Email finovaos.app@gmail.com
              </a>
            </div>
          </div>
        </div>
      </Section>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:.3} }
        * { box-sizing:border-box; }
      `}</style>
    </main>
  );
}