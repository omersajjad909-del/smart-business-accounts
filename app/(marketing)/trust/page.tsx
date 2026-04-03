"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const CERTIFICATIONS = [
  { name:"Security Program", icon:"🛡️", color:"#818cf8", glow:"rgba(129,140,248,.15)", desc:"Security, access control, and data protection practices are reviewed regularly as the platform grows.", badge:"Active", year:"Ongoing" },
  { name:"Policy Controls",  icon:"🔐", color:"#34d399", glow:"rgba(52,211,153,.12)",  desc:"Internal controls, operating procedures, and secure handling standards help protect customer data.", badge:"Managed", year:"Ongoing" },
  { name:"GDPR Compliant", icon:"🇪🇺", color:"#38bdf8", glow:"rgba(56,189,248,.12)",  desc:"Full compliance with EU General Data Protection Regulation. DPA available on request.", badge:"Compliant", year:"Ongoing" },
  { name:"Payment Security",icon:"💳", color:"#fbbf24", glow:"rgba(251,191,36,.12)",  desc:"Payments are handled through secure providers, with encrypted transport and careful operational controls.", badge:"Protected", year:"Ongoing" },
  { name:"CCPA Ready",     icon:"🏛️", color:"#c4b5fd", glow:"rgba(196,181,253,.12)", desc:"California Consumer Privacy Act compliance for all US-based users and data processing.", badge:"Compliant", year:"Ongoing" },
  { name:"Service Standards", icon:"✅", color:"#f9a8d4", glow:"rgba(249,168,212,.12)",  desc:"Operational standards and documented processes help us deliver support and product updates consistently.", badge:"Documented", year:"Ongoing" },
];

const SECURITY_FEATURES = [
  { icon:"🔒", title:"AES-256 Encryption",         desc:"All data encrypted at rest using AES-256 and in transit using TLS 1.3. Zero plaintext storage." },
  { icon:"🌐", title:"99.9% Uptime SLA",            desc:"Multi-region infrastructure on AWS with automatic failover. We've maintained 99.97% uptime in 2024." },
  { icon:"🔑", title:"Zero-Knowledge Architecture", desc:"Our team cannot access your financial data. Encryption keys are managed per-tenant." },
  { icon:"👁️",  title:"Real-Time Monitoring",        desc:"24/7 automated security monitoring with instant anomaly detection and incident response." },
  { icon:"🔄", title:"Automated Backups",            desc:"Your data is backed up every 4 hours to geographically separate data centres. 30-day retention." },
  { icon:"🚪", title:"Role-Based Access Control",    desc:"Granular permissions system. Every user sees only what they need to see — nothing more." },
  { icon:"📋", title:"Full Audit Logs",              desc:"Every action in the system is logged with timestamps, IP addresses, and user identity." },
    { icon:"🧪", title:"Security Reviews",             desc:"Security checks and platform hardening are performed regularly as part of our release process." },
];

const DATA_CENTRES = [
  { region:"Europe",        provider:"AWS eu-west-1", location:"Ireland", flag:"🇮🇪", primary:true },
  { region:"Asia Pacific",  provider:"AWS ap-south-1",location:"Mumbai",  flag:"🇮🇳", primary:false },
  { region:"Middle East",   provider:"AWS me-south-1",location:"Bahrain", flag:"🇧🇭", primary:false },
  { region:"Americas",      provider:"AWS us-east-1", location:"Virginia",flag:"🇺🇸", primary:false },
];

const FAQS = [
  { q:"Who owns my data?", a:"You do — always. Finova is a data processor, not a data controller. We process your data solely to provide the service you've signed up for. We never sell, share, or monetise your data." },
  { q:"Can Finova employees see my financial data?", a:"No. We use a zero-knowledge architecture where your data is encrypted with keys that even our team cannot access. System administrators can see metadata (login times, feature usage) but never financial content." },
  { q:"Where is my data stored?", a:"By default, data is stored in AWS eu-west-1 (Ireland). Enterprise customers can choose their preferred region: US (Virginia), Europe (Ireland), Middle East (Bahrain), Asia Pacific (Singapore), or UK (London)." },
  { q:"What happens to my data if I cancel?", a:"You can export all your data at any time in CSV or JSON format. After cancellation, we retain your data for 90 days so you can retrieve it, then permanently delete it. Deletion certificates are available on request." },
  { q:"Do you support two-factor authentication?", a:"Yes. 2FA is available for all accounts via authenticator app (TOTP) or SMS. Enterprise plans have enforced 2FA for all users." },
  { q:"How do you handle security incidents?", a:"We follow a documented incident response plan. In the event of a breach affecting your data, we notify affected customers within 72 hours as required by GDPR." },
];

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.08 });
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
function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:14 }}>
      <div style={{ height:1, width:32, background:"rgba(99,102,241,.4)" }}/>
      <span style={{ fontSize:11, fontWeight:800, color:"#818cf8", letterSpacing:".12em", textTransform:"uppercase" }}>{text}</span>
      <div style={{ height:1, width:32, background:"rgba(99,102,241,.4)" }}/>
    </div>
  );
}

export default function TrustPage() {
  const [heroVis, setHeroVis] = useState(false);
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  useEffect(()=>{ setTimeout(()=>setHeroVis(true), 80); },[]);

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(160deg,#080c1e 0%,#0c0f2e 50%,#080c1e 100%)", color:"white", fontFamily:"'DM Sans','Outfit',system-ui,sans-serif", overflowX:"hidden" }}>

      {/* Hero */}
      <Section style={{ padding:"120px 24px 80px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-100, left:"50%", transform:"translateX(-50%)", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(52,211,153,.12) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ maxWidth:660, margin:"0 auto", position:"relative", zIndex:1 }}>
          <div style={{ display:"inline-flex", gap:8, padding:"6px 16px", borderRadius:24, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.25)", marginBottom:22, opacity:heroVis?1:0, transition:"all .5s" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", animation:"blink 2s ease infinite" }}/>
            <span style={{ fontSize:12, fontWeight:800, color:"#34d399", letterSpacing:".06em" }}>SECURITY & COMPLIANCE</span>
          </div>
          <h1 style={{ fontSize:"clamp(34px,5vw,56px)", fontWeight:900, letterSpacing:"-.03em", lineHeight:1.1, fontFamily:"Lora,serif", margin:"0 0 20px", opacity:heroVis?1:0, transition:"all .6s ease .1s" }}>
            Your financial data deserves
            <span style={{ display:"block", background:"linear-gradient(90deg,#34d399,#38bdf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>enterprise-grade protection</span>
          </h1>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.5)", lineHeight:1.75, maxWidth:500, margin:"0 auto 36px", opacity:heroVis?1:0, transition:"all .6s ease .2s" }}>
            We take security more seriously than anyone — because your business finances are at stake. Here&apos;s exactly how we protect you.
          </p>
          <div style={{ display:"flex", gap:20, justifyContent:"center", flexWrap:"wrap", opacity:heroVis?1:0, transition:"all .6s ease .25s" }}>
            {[["🛡️","Security Program"],["🔐","Policy Controls"],["🇪🇺","GDPR"],["💳","Payment Security"]].map(([icon,name])=>(
              <div key={name} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:20, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.2)" }}>
                <span style={{ fontSize:16 }}>{icon}</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#34d399" }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Certifications */}
      <Section>
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"0 24px 80px" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <SectionLabel text="Certifications"/>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,38px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:0 }}>
              Independently verified, annually
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))", gap:16 }}>
            {CERTIFICATIONS.map(c=>(
              <div key={c.name} style={{ background:`linear-gradient(135deg,${c.glow},rgba(255,255,255,.02))`, borderRadius:18, border:`1px solid ${c.color}44`, padding:"24px 22px", display:"flex", gap:16 }}>
                <div style={{ width:52, height:52, borderRadius:14, background:`${c.color}20`, border:`1px solid ${c.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{c.icon}</div>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:14, fontWeight:800, color:"white" }}>{c.name}</span>
                    <span style={{ padding:"2px 8px", borderRadius:20, background:`${c.color}20`, color:c.color, fontSize:9, fontWeight:800 }}>{c.badge}</span>
                  </div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.45)", lineHeight:1.6, marginBottom:8 }}>{c.desc}</div>
                  <div style={{ fontSize:10, color:c.color, fontWeight:700 }}>Last verified: {c.year}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Security features */}
      <Section>
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"0 24px 80px" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <SectionLabel text="How We Protect You"/>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,38px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:0 }}>
              Security at every layer
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:14 }}>
            {SECURITY_FEATURES.map(f=>(
              <div key={f.title} style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"22px 20px", transition:"transform .2s, border-color .2s" }}
                onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.borderColor="rgba(52,211,153,.25)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="rgba(255,255,255,.07)"; }}>
                <div style={{ fontSize:24, marginBottom:12 }}>{f.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"white", marginBottom:6 }}>{f.title}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", lineHeight:1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Data centres */}
      <Section>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 24px 80px" }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <SectionLabel text="Infrastructure"/>
            <h2 style={{ fontSize:"clamp(22px,3vw,34px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:0 }}>
              Global infrastructure, local compliance
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
            {DATA_CENTRES.map(dc=>(
              <div key={dc.region} style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:`1px solid ${dc.primary?"rgba(52,211,153,.25)":"rgba(255,255,255,.07)"}`, padding:"22px 18px", textAlign:"center", position:"relative" }}>
                {dc.primary && <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", padding:"2px 10px", borderRadius:20, background:"#34d399", color:"#000", fontSize:9, fontWeight:800, whiteSpace:"nowrap" }}>PRIMARY</div>}
                <div style={{ fontSize:28, marginBottom:8 }}>{dc.flag}</div>
                <div style={{ fontSize:14, fontWeight:700, color:"white", marginBottom:4 }}>{dc.location}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:8 }}>{dc.region}</div>
                <div style={{ fontSize:10, fontWeight:700, color:"#818cf8", fontFamily:"monospace" }}>{dc.provider}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:20, padding:"16px 20px", borderRadius:12, background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", fontSize:13, color:"rgba(255,255,255,.5)", textAlign:"center", lineHeight:1.7 }}>
            🏛️ <strong style={{color:"white"}}>Enterprise customers</strong> can choose their preferred data residency region for full regulatory compliance.
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <div style={{ maxWidth:740, margin:"0 auto", padding:"0 24px 80px" }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <SectionLabel text="Security FAQ"/>
            <h2 style={{ fontSize:"clamp(22px,3vw,34px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:0 }}>
              Your questions, answered honestly
            </h2>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {FAQS.map((f,i)=>(
              <div key={i} style={{ background:"rgba(255,255,255,.03)", borderRadius:14, border:`1px solid ${openFaq===i?"rgba(52,211,153,.3)":"rgba(255,255,255,.07)"}`, overflow:"hidden", transition:"border-color .2s" }}>
                <button onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 20px", background:"none", border:"none", cursor:"pointer", textAlign:"left", gap:12 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:"white", lineHeight:1.4 }}>{f.q}</span>
                  <span style={{ fontSize:18, color:"#34d399", flexShrink:0, transition:"transform .2s", transform:openFaq===i?"rotate(45deg)":"rotate(0)" }}>+</span>
                </button>
                {openFaq===i && (
                  <div style={{ padding:"0 20px 18px" }}>
                    <div style={{ fontSize:14, color:"rgba(255,255,255,.5)", lineHeight:1.75 }}>{f.a}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <div style={{ maxWidth:640, margin:"0 auto", padding:"0 24px 120px", textAlign:"center" }}>
          <div style={{ padding:"48px 36px", borderRadius:22, background:"linear-gradient(135deg,rgba(52,211,153,.1),rgba(56,189,248,.06))", border:"1px solid rgba(52,211,153,.2)", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"relative", zIndex:1 }}>
              <div style={{ fontSize:36, marginBottom:14 }}>🛡️</div>
              <h2 style={{ fontSize:"clamp(20px,3vw,30px)", fontWeight:800, fontFamily:"Lora,serif", margin:"0 0 12px" }}>Have a specific security question?</h2>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.45)", lineHeight:1.7, margin:"0 auto 24px", maxWidth:400 }}>
                Our security team responds to all enquiries within 24 hours. Enterprise customers can request our full security documentation pack.
              </p>
              <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
                <a href="mailto:finovaos.app@gmail.com" style={{ padding:"12px 26px", borderRadius:11, fontWeight:700, fontSize:13, background:"linear-gradient(135deg,#059669,#34d399)", color:"white", textDecoration:"none" }}>
                  finovaos.app@gmail.com
                </a>
                <Link href="/contact" style={{ padding:"12px 26px", borderRadius:11, fontWeight:700, fontSize:13, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.8)", textDecoration:"none" }}>
                  Request Docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}} *{box-sizing:border-box}`}</style>
    </main>
  );
}
