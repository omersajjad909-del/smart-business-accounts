"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getOrCreateVisitorSessionId } from "@/lib/visitorSession";

/* ══════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════ */
const CONTACT_METHODS = [
  {
    icon: "💬",
    title: "Live Chat",
    desc: "Talk to our team in real time",
    detail: "Available Mon–Fri, 9am–6pm GMT",
    action: "Start Chat",
    href: "#chat",
    color: "#818cf8",
    glow: "rgba(129,140,248,.15)",
    border: "rgba(129,140,248,.25)",
  },
  {
    icon: "📧",
    title: "Email Us",
    desc: "We'll respond within 24 hours",
    detail: "finovaos.app@gmail.com",
    action: "Send Email",
    href: "mailto:finovaos.app@gmail.com",
    color: "#34d399",
    glow: "rgba(52,211,153,.12)",
    border: "rgba(52,211,153,.25)",
  },
  {
    icon: "📞",
    title: "Call Us",
    desc: "Speak directly with our team",
    detail: "+1 (888) 456-7890",
    action: "Call Now",
    href: "tel:+18884567890",
    color: "#38bdf8",
    glow: "rgba(56,189,248,.12)",
    border: "rgba(56,189,248,.25)",
  },
  {
    icon: "📅",
    title: "Book a Demo",
    desc: "See FinovaOS in action — 30 min",
    detail: "Free personalised walkthrough",
    action: "Schedule Demo",
    href: "/demo",
    color: "#fbbf24",
    glow: "rgba(251,191,36,.12)",
    border: "rgba(251,191,36,.25)",
  },
];

const OFFICES = [
  {
    city: "San Francisco",
    country: "United States 🇺🇸",
    address: "535 Mission Street, 14th Floor, San Francisco, CA 94105",
    phone: "+1 (800) 555-0100",
    email: "finovaos.app@gmail.com",
    type: "Headquarters",
    color: "#818cf8",
  },
  {
    city: "Dubai",
    country: "UAE 🇦🇪",
    address: "Level 9, Gate District 7, DIFC, Dubai, UAE",
    phone: "+971 4 456 7890",
    email: "finovaos.app@gmail.com",
    type: "Regional Office",
    color: "#34d399",
  },
  {
    city: "London",
    country: "United Kingdom 🇬🇧",
    address: "2nd Floor, 1 Aldgate, London EC3N 1RE, UK",
    phone: "+44 20 7946 0890",
    email: "finovaos.app@gmail.com",
    type: "Regional Office",
    color: "#38bdf8",
  },
];

const FAQS = [
  { q:"How quickly do you respond to support tickets?", a:"Pro and Enterprise customers receive responses within 4 hours. Starter plan customers within 24 hours. We never leave anyone hanging." },
  { q:"Do you offer onboarding help?", a:"Yes — all plans include access to our help centre and video tutorials. Enterprise plans include dedicated onboarding sessions with a FinovaOS specialist." },
  { q:"Can I migrate data from my current software?", a:"Absolutely. We support CSV/Excel imports and have native migration tools for QuickBooks, Xero, Sage, and Tally. Our team can help guide the process." },
  { q:"Is there a phone number for urgent issues?", a:"Enterprise customers have a dedicated support line available 24/7. Pro customers can access our priority callback service during business hours." },
  { q:"Do you have partners or resellers in my country?", a:"We have certified partners in 20+ countries. Contact our partnerships team at finovaos.app@gmail.com to find a local expert." },
];

const DEPARTMENTS = [
  { icon:"💼", label:"Sales",        email:"finovaos.app@gmail.com",        desc:"Plans, pricing, enterprise deals" },
  { icon:"🛠",  label:"Support",      email:"finovaos.app@gmail.com",       desc:"Technical help & account issues" },
  { icon:"🤝", label:"Partnerships", email:"finovaos.app@gmail.com",      desc:"Reseller & integration enquiries" },
  { icon:"📰", label:"Press & Media",email:"finovaos.app@gmail.com",         desc:"Interviews, coverage, assets" },
  { icon:"⚖️",  label:"Legal",        email:"finovaos.app@gmail.com",         desc:"Compliance & data requests" },
  { icon:"💡", label:"Feedback",      email:"finovaos.app@gmail.com",      desc:"Product suggestions & ideas" },
];

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
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
    <div ref={ref} id={id} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(28px)",
      transition: "opacity .6s ease, transform .6s ease",
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

function FloatingInput({
  label, type="text", value, onChange, placeholder, required, textarea,
}: {
  label:string; type?:string; value:string; onChange:(v:string)=>void;
  placeholder?:string; required?:boolean; textarea?:boolean;
}) {
  const [focused, setFocused] = useState(false);
  const hasVal = value.length > 0;
  const base: React.CSSProperties = {
    width:"100%", background:"rgba(255,255,255,.05)",
    border:`1.5px solid ${focused?"rgba(99,102,241,.6)":hasVal?"rgba(99,102,241,.3)":"rgba(255,255,255,.1)"}`,
    borderRadius:12, color:"white", fontSize:14, outline:"none",
    transition:"border-color .2s", boxSizing:"border-box" as const,
    padding: textarea ? "18px 16px 10px" : "22px 16px 8px",
    resize: textarea ? "vertical" as const : undefined,
    minHeight: textarea ? 120 : undefined,
    fontFamily:"inherit",
  };
  return (
    <div style={{ position:"relative" }}>
      <label style={{
        position:"absolute", left:16,
        top: focused||hasVal ? 8 : textarea ? 18 : "50%",
        transform: focused||hasVal ? "none" : textarea ? "none" : "translateY(-50%)",
        fontSize: focused||hasVal ? 10 : 13,
        color: focused ? "#818cf8" : "rgba(255,255,255,.35)",
        fontWeight: focused||hasVal ? 700 : 500,
        transition:"all .2s", pointerEvents:"none",
        letterSpacing: focused||hasVal ? ".05em" : 0,
        textTransform: focused||hasVal ? "uppercase" as const : "none" as const,
        zIndex:1,
      }}>
        {label}{required && " *"}
      </label>
      {textarea ? (
        <textarea value={value} onChange={e=>onChange(e.target.value)}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          placeholder={focused ? placeholder : ""} style={base}/>
      ) : (
        <input type={type} value={value} onChange={e=>onChange(e.target.value)}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          placeholder={focused ? placeholder : ""} style={base}/>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function ContactPage() {
  const [heroVis, setHeroVis] = useState(false);
  const [form, setForm] = useState({
    name:"", email:"", company:"", phone:"", subject:"general", message:"",
  });
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState("");
  const [openFaq,  setOpenFaq]  = useState<number|null>(null);

  useEffect(() => { setTimeout(()=>setHeroVis(true), 80); }, []);

  async function handleSubmit() {
    if (!form.name.trim()||!form.email.trim()||!form.message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setSending(true);
    try {
      await fetch("/api/public/contact", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          ...form,
          sessionId: getOrCreateVisitorSessionId(),
        }),
      });
      setSent(true);
      setForm({ name:"", email:"", company:"", phone:"", subject:"general", message:"" });
    } catch {
      setError("Something went wrong. Please try again or email us directly.");
    }
    setSending(false);
  }

  const f = (k: keyof typeof form) => (v: string) => setForm(p=>({...p,[k]:v}));

  return (
    <main style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#080c1e 0%,#0c0f2e 50%,#080c1e 100%)",
      color:"white",
      fontFamily:"'DM Sans','Outfit',system-ui,sans-serif",
      overflowX:"hidden",
    }}>

      {/* ── HERO ── */}
      <section style={{ position:"relative", overflow:"hidden", padding:"130px 24px 80px", textAlign:"center" }}>
        <div style={{ position:"absolute", top:-100, left:"50%", transform:"translateX(-50%)", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.16) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ maxWidth:640, margin:"0 auto", position:"relative", zIndex:1 }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"6px 16px", borderRadius:24,
            background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.25)",
            marginBottom:24,
            opacity:heroVis?1:0, transform:heroVis?"translateY(0)":"translateY(16px)",
            transition:"opacity .5s ease, transform .5s ease",
          }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", animation:"blink 2s ease infinite" }}/>
            <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:".06em" }}>GET IN TOUCH</span>
          </div>

          <h1 style={{
            fontSize:"clamp(36px,6vw,62px)", fontWeight:900,
            letterSpacing:"-.03em", lineHeight:1.1,
            fontFamily:"Lora,Georgia,serif", margin:"0 0 20px",
            opacity:heroVis?1:0, transform:heroVis?"translateY(0)":"translateY(20px)",
            transition:"opacity .6s ease .1s, transform .6s ease .1s",
          }}>
            We&apos;d love to
            <span style={{ display:"block", background:"linear-gradient(90deg,#818cf8,#c4b5fd,#38bdf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              hear from you
            </span>
          </h1>

          <p style={{
            fontSize:"clamp(15px,2vw,18px)", color:"rgba(255,255,255,.5)", lineHeight:1.75,
            maxWidth:480, margin:"0 auto",
            opacity:heroVis?1:0, transform:heroVis?"translateY(0)":"translateY(16px)",
            transition:"opacity .6s ease .2s, transform .6s ease .2s",
          }}>
            Whether you have a question about pricing, need a demo, or just want to say hello, our team is here.
          </p>
        </div>
      </section>

      {/* ── CONTACT METHODS ── */}
      <Section>
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"0 24px 80px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:16 }}>
            {CONTACT_METHODS.map(m=>(
              <a key={m.title} href={m.href}
                style={{ textDecoration:"none", display:"block",
                  background:`linear-gradient(135deg,${m.glow},rgba(255,255,255,.02))`,
                  borderRadius:18, border:`1px solid ${m.border}`,
                  padding:"24px 22px", transition:"transform .2s, box-shadow .2s", cursor:"pointer",
                }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.transform="translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow=`0 12px 40px ${m.glow}`; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.transform="translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow="none"; }}
              >
                <div style={{ fontSize:28, marginBottom:12 }}>{m.icon}</div>
                <div style={{ fontSize:15, fontWeight:700, color:"white", marginBottom:4 }}>{m.title}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginBottom:8, lineHeight:1.5 }}>{m.desc}</div>
                <div style={{ fontSize:12, fontWeight:600, color:m.color, marginBottom:14 }}>{m.detail}</div>
                <div style={{ fontSize:12, fontWeight:700, color:m.color, display:"flex", alignItems:"center", gap:4 }}>
                  {m.action} <span>→</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CONTACT FORM + DEPARTMENTS ── */}
      <Section>
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"0 24px 100px" }}>
          <div className="contact-main" style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:24, alignItems:"start" }}>

            {/* Form */}
            <div style={{ background:"rgba(255,255,255,.03)", borderRadius:22, border:"1px solid rgba(255,255,255,.07)", padding:"36px 32px" }}>
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:20, fontWeight:800, color:"white", marginBottom:6 }}>Send us a message</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.35)" }}>We will get back to you within one business day.</div>
              </div>

              {sent ? (
                <div style={{ padding:"40px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
                  <div style={{ fontSize:18, fontWeight:800, color:"white", marginBottom:8 }}>Message sent!</div>
                  <div style={{ fontSize:14, color:"rgba(255,255,255,.4)", lineHeight:1.6 }}>
                    Thank you for reaching out. Our team will get back to you within 24 hours.
                  </div>
                  <button onClick={()=>setSent(false)}
                    style={{ marginTop:24, padding:"10px 24px", borderRadius:10, background:"rgba(99,102,241,.2)", border:"1px solid rgba(99,102,241,.3)", color:"#818cf8", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    Send another message
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {/* Subject selector */}
                  <div>
                    <label style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".07em", display:"block", marginBottom:8 }}>
                      What&apos;s this about? *
                    </label>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {[
                        { value:"general",     label:"General" },
                        { value:"sales",       label:"Sales / Pricing" },
                        { value:"support",     label:"Support" },
                        { value:"demo",        label:"Book a Demo" },
                        { value:"partnership", label:"Partnership" },
                        { value:"press",       label:"Press" },
                      ].map(s=>(
                        <div key={s.value} onClick={()=>setForm(p=>({...p,subject:s.value}))}
                          style={{
                            padding:"6px 14px", borderRadius:20, cursor:"pointer", fontSize:12, fontWeight:700,
                            background:form.subject===s.value?"rgba(99,102,241,.2)":"rgba(255,255,255,.04)",
                            border:`1px solid ${form.subject===s.value?"rgba(99,102,241,.5)":"rgba(255,255,255,.08)"}`,
                            color:form.subject===s.value?"#818cf8":"rgba(255,255,255,.4)",
                            transition:"all .15s",
                          }}>
                          {s.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Name + Email */}
                  <div className="contact-half" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    <FloatingInput label="Full Name"  value={form.name}  onChange={f("name")}  required/>
                    <FloatingInput label="Work Email" type="email" value={form.email} onChange={f("email")} required/>
                  </div>

                  {/* Company + Phone */}
                  <div className="contact-half" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    <FloatingInput label="Company"      value={form.company} onChange={f("company")} placeholder="Your company name"/>
                    <FloatingInput label="Phone Number" type="tel" value={form.phone} onChange={f("phone")} placeholder="+1 234 567 8900"/>
                  </div>

                  {/* Message */}
                  <FloatingInput label="Message" value={form.message} onChange={f("message")} textarea required placeholder="Tell us how we can help..."/>

                  {error && (
                    <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)", color:"#f87171", fontSize:12, fontWeight:600 }}>
                      {error}
                    </div>
                  )}

                  <button onClick={handleSubmit} disabled={sending}
                    style={{
                      padding:"14px", borderRadius:12, fontWeight:800, fontSize:14,
                      background:sending?"rgba(99,102,241,.3)":"linear-gradient(135deg,#4f46e5,#7c3aed)",
                      border:"none", color:"white", cursor:sending?"not-allowed":"pointer",
                      boxShadow:sending?"none":"0 4px 24px rgba(79,70,229,.4)",
                      transition:"all .2s",
                    }}>
                    {sending ? "Sending..." : "Send Message →"}
                  </button>

                  <div style={{ fontSize:11, color:"rgba(255,255,255,.2)", textAlign:"center" }}>
                    🔒 Your data is safe. We never share or sell it.
                  </div>
                </div>
              )}
            </div>

            {/* Departments */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>
                Contact by Department
              </div>
              {DEPARTMENTS.map(d=>(
                <a key={d.label} href={`mailto:${d.email}`}
                  style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderRadius:14, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", transition:"all .15s" }}
                  onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(99,102,241,.08)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(99,102,241,.25)"; }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.03)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,.07)"; }}
                >
                  <span style={{ fontSize:20, width:28, textAlign:"center", flexShrink:0 }}>{d.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"white" }}>{d.label}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:1 }}>{d.desc}</div>
                  </div>
                  <div style={{ fontSize:11, color:"#818cf8", fontWeight:600, flexShrink:0 }}>↗</div>
                </a>
              ))}

              {/* Response time */}
              <div style={{ marginTop:6, padding:"16px 18px", borderRadius:14, background:"rgba(52,211,153,.06)", border:"1px solid rgba(52,211,153,.15)" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#34d399", marginBottom:8 }}>⏱ Response Times</div>
                {[
                  { plan:"Enterprise", time:"< 1 hour", color:"#34d399" },
                  { plan:"Pro",        time:"< 4 hours", color:"#818cf8" },
                  { plan:"Starter",    time:"< 24 hours", color:"#fbbf24" },
                ].map(r=>(
                  <div key={r.plan} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>{r.plan}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:r.color }}>{r.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── OFFICES ── */}
      <Section>
        <div style={{ maxWidth:1060, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <SectionLabel text="Our Offices"/>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,38px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:0 }}>
              Find us around the world
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:20 }}>
            {OFFICES.map(o=>(
              <div key={o.city} style={{
                background:"rgba(255,255,255,.03)", borderRadius:18,
                border:"1px solid rgba(255,255,255,.07)",
                padding:"28px 24px", position:"relative", overflow:"hidden",
                transition:"transform .2s, border-color .2s",
              }}
                onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.borderColor=`${o.color}55`; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="rgba(255,255,255,.07)"; }}
              >
                {/* Top color bar */}
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:o.color, borderRadius:"18px 18px 0 0" }}/>

                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:20, fontWeight:800, color:"white", fontFamily:"Lora,serif" }}>{o.city}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2 }}>{o.country}</div>
                  </div>
                  <span style={{ padding:"4px 10px", borderRadius:20, background:`${o.color}20`, color:o.color, fontSize:10, fontWeight:800, letterSpacing:".04em" }}>
                    {o.type}
                  </span>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <span style={{ fontSize:14, marginTop:1, flexShrink:0 }}>📍</span>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,.45)", lineHeight:1.6 }}>{o.address}</span>
                  </div>
                  <a href={`tel:${o.phone}`} style={{ display:"flex", gap:10, alignItems:"center", textDecoration:"none" }}
                    onMouseEnter={e=>(e.currentTarget.style.opacity=".8")}
                    onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
                    <span style={{ fontSize:14, flexShrink:0 }}>📞</span>
                    <span style={{ fontSize:12, color:o.color, fontWeight:600 }}>{o.phone}</span>
                  </a>
                  <a href={`mailto:${o.email}`} style={{ display:"flex", gap:10, alignItems:"center", textDecoration:"none" }}
                    onMouseEnter={e=>(e.currentTarget.style.opacity=".8")}
                    onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
                    <span style={{ fontSize:14, flexShrink:0 }}>📧</span>
                    <span style={{ fontSize:12, color:o.color, fontWeight:600 }}>{o.email}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section>
        <div style={{ maxWidth:740, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <SectionLabel text="FAQ"/>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,38px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 12px" }}>
              Common questions
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", margin:0 }}>
              Can&apos;t find what you&apos;re looking for?{" "}
              <Link href="/help" style={{ color:"#818cf8", fontWeight:700, textDecoration:"none" }}>Browse the Help Centre →</Link>
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {FAQS.map((faq, i)=>(
              <div key={i}
                style={{ background:"rgba(255,255,255,.03)", borderRadius:14, border:`1px solid ${openFaq===i?"rgba(99,102,241,.3)":"rgba(255,255,255,.07)"}`, overflow:"hidden", transition:"border-color .2s" }}>
                <button onClick={()=>setOpenFaq(openFaq===i?null:i)}
                  style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px", background:"none", border:"none", cursor:"pointer", textAlign:"left", gap:12 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:"white", lineHeight:1.4 }}>{faq.q}</span>
                  <span style={{ fontSize:18, color:"#818cf8", flexShrink:0, transition:"transform .2s", transform:openFaq===i?"rotate(45deg)":"rotate(0)" }}>+</span>
                </button>
                {openFaq===i && (
                  <div style={{ padding:"0 20px 18px" }}>
                    <div style={{ fontSize:14, color:"rgba(255,255,255,.5)", lineHeight:1.75 }}>{faq.a}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── BOTTOM CTA ── */}
      <Section>
        <div style={{ maxWidth:700, margin:"0 auto", padding:"0 24px 120px", textAlign:"center" }}>
          <div style={{ padding:"52px 40px", borderRadius:24, background:"linear-gradient(135deg,rgba(79,70,229,.2),rgba(124,58,237,.12))", border:"1px solid rgba(99,102,241,.25)", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:"rgba(99,102,241,.15)", filter:"blur(50px)", pointerEvents:"none" }}/>
            <div style={{ position:"relative", zIndex:1 }}>
              <div style={{ fontSize:36, marginBottom:14 }}>👋</div>
              <h2 style={{ fontSize:"clamp(22px,3vw,32px)", fontWeight:800, letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 12px" }}>
                Still have questions?
              </h2>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.45)", lineHeight:1.7, margin:"0 auto 28px", maxWidth:420 }}>
                Our team is genuinely happy to help. No bots, no runarounds — just real people who care about your business.
              </p>
              <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
                <Link href="/help" style={{ padding:"12px 26px", borderRadius:11, fontWeight:700, fontSize:13, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"white", textDecoration:"none", boxShadow:"0 4px 20px rgba(79,70,229,.4)" }}>
                  Help Centre
                </Link>
                <a href="mailto:finovaos.app@gmail.com" style={{ padding:"12px 26px", borderRadius:11, fontWeight:700, fontSize:13, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.8)", textDecoration:"none" }}>
                  Email Us Directly
                </a>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:.3} }
        @media(max-width:860px){.contact-main{grid-template-columns:1fr!important;} .contact-form-grid{grid-template-columns:1fr!important;}}
        @media(max-width:480px){.contact-half{grid-template-columns:1fr!important;}}
      `}</style>
    </main>
  );
}
