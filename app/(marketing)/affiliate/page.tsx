"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const TIERS = [
  { name:"Starter",    referrals:"1–5",   commission:"20%", monthly:"$200", color:"#818cf8", glow:"rgba(129,140,248,.15)", icon:"🌱" },
  { name:"Growth",     referrals:"6–20",  commission:"25%", monthly:"$750", color:"#34d399", glow:"rgba(52,211,153,.12)",  icon:"🚀", popular:true },
  { name:"Pro",        referrals:"21–50", commission:"30%", monthly:"$2,400", color:"#fbbf24", glow:"rgba(251,191,36,.12)", icon:"⭐" },
  { name:"Elite",      referrals:"50+",   commission:"35%", monthly:"Custom", color:"#c4b5fd", glow:"rgba(196,181,253,.12)",icon:"💎" },
];

const HOW_IT_WORKS = [
  { step:"01", icon:"🔗", title:"Get your unique link",   desc:"Sign up as a FinovaOS affiliate and receive a personalised referral link and marketing materials." },
  { step:"02", icon:"📣", title:"Share with your network",desc:"Share your link on social media, your website, email newsletters, or directly with business owners you know." },
  { step:"03", icon:"✅", title:"They sign up & subscribe",desc:"When someone uses your link and starts a paid plan, you earn commission from day one." },
  { step:"04", icon:"💰", title:"Get paid monthly",       desc:"Commissions are paid on the 1st of each month via bank transfer, PayPal, or crypto — your choice." },
];

const TESTIMONIALS = [
  { name:"David Chen", role:"Accounting Consultant, Singapore", avatar:"DC", gradient:"linear-gradient(135deg,#4f46e5,#7c3aed)", quote:"I recommended FinovaOS to 12 of my clients last year. Made $8,400 in commissions — completely passive income on top of my consulting fees." },
  { name:"Fatima Al-Rashid", role:"Business Coach, Dubai", avatar:"FA", gradient:"linear-gradient(135deg,#0891b2,#06b6d4)", quote:"My audience is SME owners. FinovaOS fits perfectly. My affiliate income now covers my entire content creation costs." },
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

export default function AffiliatePage() {
  const [heroVis,  setHeroVis]  = useState(false);
  const [refs,     setRefs]     = useState(10);
  const [plan,     setPlan]     = useState(99);
  const [form,     setForm]     = useState({ name:"", email:"", website:"", audience:"" });
  const [submitted,setSubmitted]= useState(false);

  useEffect(()=>{ setTimeout(()=>setHeroVis(true), 80); },[]);

  const monthly   = Math.round(refs * plan * 0.25);
  const yearly    = monthly * 12;

  async function handleApply() {
    if (!form.name||!form.email) return;
    try {
      await fetch("/api/public/affiliate-apply",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    } catch {}
    setSubmitted(true);
  }

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(160deg,#080c1e 0%,#0c0f2e 50%,#080c1e 100%)", color:"white", fontFamily:"'DM Sans','Outfit',system-ui,sans-serif", overflowX:"hidden" }}>

      {/* Hero */}
      <Section style={{ padding:"120px 24px 70px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-100, left:"50%", transform:"translateX(-50%)", width:650, height:650, borderRadius:"50%", background:"radial-gradient(circle,rgba(251,191,36,.12) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ maxWidth:680, margin:"0 auto", position:"relative", zIndex:1 }}>
          <div style={{ display:"inline-flex", gap:8, padding:"6px 18px", borderRadius:24, background:"rgba(251,191,36,.1)", border:"1px solid rgba(251,191,36,.3)", marginBottom:22, opacity:heroVis?1:0, transition:"all .5s" }}>
            <span style={{ fontSize:12, fontWeight:800, color:"#fbbf24", letterSpacing:".06em" }}>💰 EARN UP TO 35% COMMISSION</span>
          </div>
          <h1 style={{ fontSize:"clamp(36px,6vw,62px)", fontWeight:900, letterSpacing:"-.03em", lineHeight:1.1, fontFamily:"Lora,serif", margin:"0 0 20px", opacity:heroVis?1:0, transition:"all .6s ease .1s" }}>
            Refer businesses.<br/>
            <span style={{ background:"linear-gradient(90deg,#fbbf24,#f59e0b)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Earn real money.</span>
          </h1>
          <p style={{ fontSize:"clamp(15px,2vw,18px)", color:"rgba(255,255,255,.5)", lineHeight:1.75, maxWidth:500, margin:"0 auto 36px", opacity:heroVis?1:0, transition:"all .6s ease .2s" }}>
            Join 500+ affiliates earning monthly recurring commissions by recommending FinovaOS to businesses they know.
          </p>
          <div style={{ display:"flex", gap:28, justifyContent:"center", flexWrap:"wrap", marginBottom:36, opacity:heroVis?1:0, transition:"all .6s ease .25s" }}>
            {[["20–35%","Recurring commission"],["$0","Cost to join"],["Monthly","Payout schedule"],["500+","Active affiliates"]].map(([val,label])=>(
              <div key={label} style={{ textAlign:"center" }}>
                <div style={{ fontSize:24, fontWeight:900, color:"#fbbf24", fontFamily:"Lora,serif" }}>{val}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginTop:3 }}>{label}</div>
              </div>
            ))}
          </div>
          <a href="#apply" style={{ display:"inline-block", padding:"14px 36px", borderRadius:12, fontWeight:800, fontSize:15, background:"linear-gradient(135deg,#d97706,#f59e0b)", color:"#000", textDecoration:"none", boxShadow:"0 4px 24px rgba(251,191,36,.4)", opacity:heroVis?1:0, transition:"all .6s ease .3s" }}>
            Apply to Join →
          </a>
        </div>
      </Section>

      {/* How it works */}
      <Section>
        <div style={{ maxWidth:960, margin:"0 auto", padding:"0 24px 80px" }}>
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"#818cf8", letterSpacing:".12em", textTransform:"uppercase", marginBottom:10 }}>HOW IT WORKS</div>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,36px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:0 }}>Simple as 1, 2, 3, 4</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16 }}>
            {HOW_IT_WORKS.map(h=>(
              <div key={h.step} style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"24px 20px" }}>
                <div style={{ fontSize:10, fontWeight:800, color:"rgba(99,102,241,.6)", letterSpacing:".1em", marginBottom:12 }}>STEP {h.step}</div>
                <div style={{ fontSize:28, marginBottom:12 }}>{h.icon}</div>
                <div style={{ fontSize:14, fontWeight:700, color:"white", marginBottom:8 }}>{h.title}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.65 }}>{h.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Tiers */}
      <Section>
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"0 24px 80px" }}>
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"#818cf8", letterSpacing:".12em", textTransform:"uppercase", marginBottom:10 }}>COMMISSION TIERS</div>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,36px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:0 }}>Earn more as you refer more</h2>
          </div>
          <div className="aff-4col" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
            {TIERS.map(t=>(
              <div key={t.name} style={{ background:`linear-gradient(135deg,${t.glow},rgba(255,255,255,.02))`, borderRadius:18, border:`1.5px solid ${t.popular?"rgba(52,211,153,.4)":"rgba(255,255,255,.07)"}`, padding:"26px 20px", textAlign:"center", position:"relative" }}>
                {t.popular && <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", padding:"3px 14px", borderRadius:20, background:"#34d399", color:"#000", fontSize:10, fontWeight:800, whiteSpace:"nowrap" }}>MOST POPULAR</div>}
                <div style={{ fontSize:28, marginBottom:10 }}>{t.icon}</div>
                <div style={{ fontSize:16, fontWeight:800, color:"white", marginBottom:4 }}>{t.name}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:16 }}>{t.referrals} active referrals</div>
                <div style={{ fontSize:36, fontWeight:900, color:t.color, fontFamily:"Lora,serif", lineHeight:1 }}>{t.commission}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", margin:"4px 0 16px" }}>recurring commission</div>
                <div style={{ padding:"10px", borderRadius:10, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>Avg monthly earnings</div>
                  <div style={{ fontSize:16, fontWeight:800, color:t.color, marginTop:3 }}>{t.monthly}/mo</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Calculator */}
      <Section>
        <div style={{ maxWidth:680, margin:"0 auto", padding:"0 24px 80px" }}>
          <div style={{ background:"rgba(255,255,255,.03)", borderRadius:22, border:"1px solid rgba(255,255,255,.07)", padding:"36px 32px" }}>
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#fbbf24", letterSpacing:".1em", textTransform:"uppercase", marginBottom:8 }}>EARNINGS CALCULATOR</div>
              <h3 style={{ fontSize:22, fontWeight:800, color:"white", fontFamily:"Lora,serif", margin:0 }}>How much could you earn?</h3>
            </div>

            <div style={{ marginBottom:22 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,.6)" }}>Referrals per month</label>
                <span style={{ fontSize:14, fontWeight:800, color:"#fbbf24" }}>{refs}</span>
              </div>
              <input type="range" min="1" max="100" value={refs} onChange={e=>setRefs(Number(e.target.value))} style={{ width:"100%", accentColor:"#fbbf24" }}/>
            </div>

            <div style={{ marginBottom:28 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,.6)" }}>Avg plan value ($/mo)</label>
                <span style={{ fontSize:14, fontWeight:800, color:"#fbbf24" }}>${plan}</span>
              </div>
              <input type="range" min="49" max="249" step="10" value={plan} onChange={e=>setPlan(Number(e.target.value))} style={{ width:"100%", accentColor:"#fbbf24" }}/>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:10, color:"rgba(255,255,255,.25)" }}>
                <span>Starter $49</span><span>Pro $99</span><span>Enterprise $249</span>
              </div>
            </div>

            <div className="aff-2col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div style={{ padding:"20px", borderRadius:14, background:"rgba(251,191,36,.1)", border:"1px solid rgba(251,191,36,.25)", textAlign:"center" }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginBottom:6 }}>Monthly earnings</div>
                <div style={{ fontSize:32, fontWeight:900, color:"#fbbf24", fontFamily:"Lora,serif" }}>${monthly.toLocaleString()}</div>
              </div>
              <div style={{ padding:"20px", borderRadius:14, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.2)", textAlign:"center" }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginBottom:6 }}>Annual earnings</div>
                <div style={{ fontSize:32, fontWeight:900, color:"#34d399", fontFamily:"Lora,serif" }}>${yearly.toLocaleString()}</div>
              </div>
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.25)", textAlign:"center", marginTop:12 }}>Based on 25% commission rate. Actual earnings may vary.</div>
          </div>
        </div>
      </Section>

      {/* Testimonials */}
      <Section>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 24px 80px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))", gap:20 }}>
            {TESTIMONIALS.map(t=>(
              <div key={t.name} style={{ background:"rgba(255,255,255,.03)", borderRadius:18, border:"1px solid rgba(255,255,255,.07)", padding:"28px 24px" }}>
                <div style={{ fontSize:28, color:"#fbbf24", marginBottom:14 }}>"</div>
                <p style={{ fontSize:14, color:"rgba(255,255,255,.6)", lineHeight:1.75, margin:"0 0 20px", fontStyle:"italic" }}>{t.quote}</p>
                <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:t.gradient, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"white" }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"white" }}>{t.name}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Apply form */}
      <Section>
        <div id="apply" style={{ maxWidth:600, margin:"0 auto", padding:"0 24px 120px" }}>
          <div style={{ background:"rgba(255,255,255,.03)", borderRadius:22, border:"1px solid rgba(255,255,255,.07)", padding:"36px 32px" }}>
            {submitted ? (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <div style={{ fontSize:48, marginBottom:16 }}>🎉</div>
                <div style={{ fontSize:20, fontWeight:800, color:"white", fontFamily:"Lora,serif", marginBottom:10 }}>Application received!</div>
                <div style={{ fontSize:14, color:"rgba(255,255,255,.5)", lineHeight:1.7 }}>We review applications within 2 business days and will email you your affiliate link and dashboard access.</div>
              </div>
            ) : (
              <>
                <div style={{ textAlign:"center", marginBottom:28 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:"#fbbf24", letterSpacing:".1em", textTransform:"uppercase", marginBottom:8 }}>JOIN THE PROGRAM</div>
                  <h3 style={{ fontSize:22, fontWeight:800, color:"white", fontFamily:"Lora,serif", margin:0 }}>Apply to become an affiliate</h3>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {[
                    {label:"Full Name",     key:"name",     type:"text",  ph:"Your full name"},
                    {label:"Email",         key:"email",    type:"email", ph:"you@example.com"},
                    {label:"Website / Social",key:"website",type:"text",  ph:"https://yoursite.com"},
                  ].map(field=>(
                    <div key={field.key}>
                      <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>{field.label}</label>
                      <input type={field.type} value={(form as any)[field.key]} onChange={e=>setForm(p=>({...p,[field.key]:e.target.value}))} placeholder={field.ph}
                        style={{ width:"100%", padding:"11px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.12)", color:"white", fontSize:13, outline:"none", boxSizing:"border-box" as any }}/>
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Your Audience</label>
                    <select value={form.audience} onChange={e=>setForm(p=>({...p,audience:e.target.value}))}
                      style={{ width:"100%", padding:"11px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.12)", color:form.audience?"white":"rgba(255,255,255,.55)", fontSize:13, outline:"none", boxSizing:"border-box" as any }}>
                      <option value="" style={{ color:"#0f172a", background:"#ffffff" }}>Select your audience...</option>
                      {["Accounting professionals","Business consultants","Content creators / bloggers","Social media influencers","Entrepreneurs / founders","Other"].map(o=>(
                        <option key={o} value={o} style={{ color:"#0f172a", background:"#ffffff" }}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={handleApply} disabled={!form.name||!form.email}
                    style={{ padding:"14px", borderRadius:11, background:(!form.name||!form.email)?"rgba(251,191,36,.2)":"linear-gradient(135deg,#d97706,#f59e0b)", border:"none", color:"#000", fontSize:14, fontWeight:800, cursor:"pointer" }}>
                    Apply Now — It's Free →
                  </button>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.25)", textAlign:"center" }}>Applications reviewed within 2 business days</div>
                </div>
              </>
            )}
          </div>
        </div>
      </Section>

      <style>{`
        *{box-sizing:border-box}
        @media(max-width:860px){.aff-4col{grid-template-columns:repeat(2,1fr)!important;} .aff-2col{grid-template-columns:1fr!important;}}
        @media(max-width:480px){.aff-4col{grid-template-columns:1fr!important;}}
      `}</style>
    </main>
  );
}
