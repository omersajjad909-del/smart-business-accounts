"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ══════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════ */
const VALUES = [
  {
    icon: "◈", title: "Clarity Over Complexity",
    color: "var(--tx-818cf8, #818cf8)", glow: "rgba(129,140,248,.15)",
    short: "We make hard things simple.",
    long: "Accounting is already complex enough for our customers. We never add unnecessary complexity to our internal culture either. Clear communication, simple processes, direct feedback — always.",
    examples: ["Write docs before building", "Say what you mean, mean what you say", "One-page briefs over 30-slide decks"],
  },
  {
    icon: "🌍", title: "Global by Default",
    color: "var(--tx-34d399, #34d399)", glow: "rgba(52,211,153,.12)",
    short: "The world is our team and our market.",
    long: "We build for businesses in many countries and currencies, and we work async so the team can be anywhere. Every decision we make considers whether it works for everyone — regardless of timezone, background, or culture.",
    examples: ["Async-first communication", "Decisions written down, not lost in calls", "Inclusive meeting scheduling"],
  },
  {
    icon: "🚢", title: "Ship, Learn, Repeat",
    color: "var(--tx-38bdf8, #38bdf8)", glow: "rgba(56,189,248,.12)",
    short: "Done is better than perfect.",
    long: "We ship every week. We'd rather get something imperfect in front of customers and learn, than spend months perfecting something in private. Speed of learning is our competitive advantage.",
    examples: ["Weekly production deploys", "Public changelog", "No-blame postmortems"],
  },
  {
    icon: "🎯", title: "Outcomes Over Hours",
    color: "var(--tx-fbbf24, #fbbf24)", glow: "rgba(251,191,36,.12)",
    short: "We measure impact, not time.",
    long: "We don't care when you work or how long you work. We care about what you produce and the impact you have. If you do great work in 6 hours, we celebrate that.",
    examples: ["No mandatory core hours", "Results-based performance reviews", "Unlimited annual leave"],
  },
  {
    icon: "💬", title: "Radical Transparency",
    color: "var(--tx-c4b5fd, #c4b5fd)", glow: "rgba(196,181,253,.12)",
    short: "We share everything, honestly.",
    long: "Company financials, strategy, board meeting notes — all shared with the team. We believe people do better work when they understand the full picture. No information silos.",
    examples: ["Monthly all-hands with real numbers", "Open salary bands", "Strategy docs shared company-wide"],
  },
  {
    icon: "❤️", title: "People First",
    color: "var(--tx-f9a8d4, #f9a8d4)", glow: "rgba(249,168,212,.12)",
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
      <span style={{ fontSize:11, fontWeight:800, color:"var(--tx-818cf8, #818cf8)", letterSpacing:".12em", textTransform:"uppercase" }}>{text}</span>
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

  useEffect(() => { setTimeout(()=>setHeroVis(true), 80); }, []);

  return (
    <main style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,var(--dk-080c1e, #080c1e) 0%,var(--dk-0c0f2e, #0c0f2e) 50%,var(--dk-080c1e, #080c1e) 100%)",
      color:"var(--ink-solid, white)", fontFamily:"'DM Sans','Outfit',system-ui,sans-serif", overflowX:"hidden",
    }}>

      {/* ── HERO ── */}
      <section className="culture-hero" style={{ position:"relative", overflow:"hidden", padding:"130px 24px 90px", textAlign:"center" }}>
        <div style={{ position:"absolute", top:-120, left:"50%", transform:"translateX(-50%)", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.16) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:200, background:"linear-gradient(to bottom, transparent, var(--dk-080c1e, #080c1e))", pointerEvents:"none", zIndex:1 }}/>

        <div style={{ maxWidth:680, margin:"0 auto", position:"relative", zIndex:2 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:24, background:"rgba(249,168,212,.1)", border:"1px solid rgba(249,168,212,.25)", marginBottom:24, opacity:heroVis?1:0, transition:"all .5s ease" }}>
            <span style={{ fontSize:16 }}>❤️</span>
            <span style={{ fontSize:12, fontWeight:800, color:"var(--tx-f9a8d4, #f9a8d4)", letterSpacing:".06em" }}>OUR CULTURE</span>
          </div>
          <h1 style={{ fontSize:"clamp(38px,6vw,64px)", fontWeight:900, letterSpacing:"-.03em", lineHeight:1.1, fontFamily:"Lora,Georgia,serif", margin:"0 0 22px", opacity:heroVis?1:0, transition:"all .6s ease .1s" }}>
            A company people
            <span style={{ display:"block", background:"linear-gradient(90deg,var(--tx-f9a8d4, #f9a8d4),var(--tx-818cf8, #818cf8),var(--tx-38bdf8, #38bdf8))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              are proud to build
            </span>
          </h1>
          <p style={{ fontSize:"clamp(15px,2vw,17px)", color:"rgba(var(--ink),var(--ta-50, .5))", lineHeight:1.75, maxWidth:500, margin:"0 auto 36px", opacity:heroVis?1:0, transition:"all .6s ease .2s" }}>
            Culture isn't a ping-pong table. It's how we make decisions, treat each other, and show up for our customers every single day.
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", opacity:heroVis?1:0, transition:"all .6s ease .3s" }}>
            <a href="#values" style={{ padding:"12px 28px", borderRadius:12, fontWeight:800, fontSize:13, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"white", textDecoration:"none", boxShadow:"0 4px 24px rgba(79,70,229,.4)" }}>
              Our Values
            </a>
            <Link href="/careers" style={{ padding:"12px 28px", borderRadius:12, fontWeight:700, fontSize:13, background:"rgba(var(--ink),.06)", border:"1px solid rgba(var(--ink),.12)", color:"rgba(var(--ink),.8)", textDecoration:"none" }}>
              Careers →
            </Link>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <Section id="values">
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <SectionLabel text="Core Values"/>
            <h2 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 14px" }}>
              Six things we believe deeply
            </h2>
            <p style={{ fontSize:14, color:"rgba(var(--ink),var(--ta-40, .4))", maxWidth:480, margin:"0 auto" }}>
              These aren't poster words. They're how we actually make decisions every day.
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {VALUES.map((v,i)=>(
              <div key={v.title}
                onClick={()=>setOpenValue(openValue===i?null:i)}
                style={{ background:openValue===i?`linear-gradient(135deg,${v.glow},rgba(var(--ink),.02))`:"rgba(var(--ink),.03)", borderRadius:16, border:`1px solid ${openValue===i?`color-mix(in srgb, ${v.color} 33.3%, transparent)`:"rgba(var(--ink),.07)"}`, cursor:"pointer", overflow:"hidden", transition:"all .2s" }}
              >
                <div style={{ padding:"22px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                    <div style={{ width:48, height:48, borderRadius:13, background:`color-mix(in srgb, ${v.color} 12.5%, transparent)`, border:`1px solid color-mix(in srgb, ${v.color} 25.1%, transparent)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                      {v.icon}
                    </div>
                    <div>
                      <div style={{ fontSize:16, fontWeight:700, color:"var(--ink-solid, white)" }}>{v.title}</div>
                      <div style={{ fontSize:13, color:"rgba(var(--ink),var(--ta-40, .4))", marginTop:2 }}>{v.short}</div>
                    </div>
                  </div>
                  <span style={{ fontSize:20, color:v.color, transform:openValue===i?"rotate(45deg)":"rotate(0)", transition:"transform .2s", display:"inline-block", flexShrink:0 }}>+</span>
                </div>
                {openValue===i && (
                  <div style={{ padding:"0 24px 24px", borderTop:"1px solid rgba(var(--ink),.07)" }}>
                    <p style={{ fontSize:14, color:"rgba(var(--ink),var(--ta-60, .6))", lineHeight:1.8, margin:"20px 0 16px" }}>{v.long}</p>
                    <div style={{ fontSize:11, fontWeight:800, color:"rgba(var(--ink),var(--ta-30, .3))", letterSpacing:".07em", textTransform:"uppercase", marginBottom:10 }}>In practice</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {v.examples.map(e=>(
                        <span key={e} style={{ padding:"5px 14px", borderRadius:20, background:`color-mix(in srgb, ${v.color} 8.2%, transparent)`, border:`1px solid color-mix(in srgb, ${v.color} 18.8%, transparent)`, color:v.color, fontSize:12, fontWeight:600 }}>✓ {e}</span>
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
            <p style={{ fontSize:14, color:"rgba(var(--ink),var(--ta-40, .4))", maxWidth:500, margin:"0 auto" }}>
              We've been remote since day one. Not remote-friendly — remote-first. Here's what that actually means.
            </p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16 }}>
            {REMOTE_PRINCIPLES.map(p=>(
              <div key={p.title} style={{ padding:"24px 22px", borderRadius:16, background:"rgba(var(--ink),.03)", border:"1px solid rgba(var(--ink),.07)", display:"flex", gap:14 }}>
                <span style={{ fontSize:26, flexShrink:0 }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"var(--ink-solid, white)", marginBottom:6 }}>{p.title}</div>
                  <div style={{ fontSize:12, color:"rgba(var(--ink),var(--ta-40, .4))", lineHeight:1.65 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tools we use */}
          <div style={{ marginTop:32, padding:"24px 28px", borderRadius:16, background:"rgba(99,102,241,.06)", border:"1px solid rgba(99,102,241,.2)" }}>
            <div style={{ fontSize:12, fontWeight:800, color:"rgba(var(--ink),var(--ta-50, .5))", textTransform:"uppercase", letterSpacing:".06em", marginBottom:14 }}>Our Remote Stack</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
              {[
                { name:"Notion",     desc:"Docs & Wiki",      color:"var(--tx-818cf8, #818cf8)" },
                { name:"Linear",     desc:"Project Mgmt",     color:"var(--tx-818cf8, #818cf8)" },
                { name:"Slack",      desc:"Communication",    color:"var(--tx-34d399, #34d399)" },
                { name:"Loom",       desc:"Async Video",      color:"var(--tx-f9a8d4, #f9a8d4)" },
                { name:"Figma",      desc:"Design",           color:"var(--tx-fbbf24, #fbbf24)" },
                { name:"GitHub",     desc:"Code",             color:"var(--tx-38bdf8, #38bdf8)" },
                { name:"Zoom",       desc:"Sync Calls",       color:"var(--tx-818cf8, #818cf8)" },
                { name:"Deel",       desc:"Global Payroll",   color:"var(--tx-34d399, #34d399)" },
              ].map(t=>(
                <div key={t.name} style={{ padding:"7px 14px", borderRadius:20, background:`color-mix(in srgb, ${t.color} 8.2%, transparent)`, border:`1px solid color-mix(in srgb, ${t.color} 18.8%, transparent)`, display:"flex", gap:6, alignItems:"center" }}>
                  <span style={{ fontSize:12, fontWeight:800, color:t.color }}>{t.name}</span>
                  <span style={{ fontSize:10, color:"rgba(var(--ink),var(--ta-30, .3))" }}>{t.desc}</span>
                </div>
              ))}
            </div>
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
              <p style={{ fontSize:14, color:"rgba(var(--ink),var(--ta-45, .45))", lineHeight:1.7, margin:"0 auto 28px", maxWidth:420 }}>
                We&apos;re not hiring right now — but if you want to build this with us, leave your email and we&apos;ll reach out when roles open.
              </p>
              <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
                <Link href="/careers" style={{ padding:"13px 30px", borderRadius:12, fontWeight:800, fontSize:14, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"white", textDecoration:"none", boxShadow:"0 4px 24px rgba(79,70,229,.4)" }}>
                  Careers →
                </Link>
                <Link href="/roles" style={{ padding:"13px 30px", borderRadius:12, fontWeight:700, fontSize:14, background:"rgba(var(--ink),.06)", border:"1px solid rgba(var(--ink),.12)", color:"rgba(var(--ink),.8)", textDecoration:"none" }}>
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