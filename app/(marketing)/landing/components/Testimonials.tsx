"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis] as const;
}

type Testimonial = {
  id: string; name: string; company: string | null;
  role: string | null; message: string;
  rating: number; planUsed: string | null; featured: boolean;
};

const FALLBACK: Testimonial[] = [
  { id:"1", name:"Thomas Miller",  company:"Miller Trading Co.",        role:"CEO",              message:"Finally, accounting that matches our business reality. Bank reconciliation used to take 3 days — now it's done before lunch.", rating:5, planUsed:"PROFESSIONAL",       featured:true },
  { id:"2", name:"Alicia Stevens", company:"Global Distribution Group", role:"CFO",              message:"The dashboard gives us instant clarity across all 5 branches. We scaled from 2 to 5 locations with zero chaos.", rating:5, planUsed:"ENTERPRISE", featured:true },
  { id:"3", name:"Ryan Kennedy",   company:"Apex Supply Chain",         role:"Managing Director",message:"We were running on spreadsheets and prayers. Switching to Finova was the single best operational decision we made this year.", rating:5, planUsed:"PROFESSIONAL",  featured:true },
];

const COLORS = ["#818cf8","#34d399","#fbbf24","#f87171","#a78bfa","#06b6d4"];

export function TestimonialCard({ t, i, vis }: { t: Testimonial; i: number; vis: boolean }) {
  const [hov, setHov] = useState(false);
  const color = COLORS[i % COLORS.length];
  const initials = t.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius:18, padding:"24px 22px",
        background: hov ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.04)",
        border:`1px solid ${hov ? color+"45" : "rgba(255,255,255,.07)"}`,
        display:"flex", flexDirection:"column", gap:16,
        cursor:"default",
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(20px)",
        transition:`opacity .5s ease ${i*90}ms, transform .5s ease ${i*90}ms, background .25s, border .25s, box-shadow .25s`,
        boxShadow: hov ? `0 16px 40px ${color}18` : "none",
        position:"relative", overflow:"hidden",
      }}
    >
      {t.featured && (
        <div style={{ position:"absolute", top:14, right:14, padding:"3px 9px", borderRadius:20, background:"rgba(251,191,36,.12)", border:"1px solid rgba(251,191,36,.25)", fontSize:9, fontWeight:700, color:"#fbbf24" }}>⭐ FEATURED</div>
      )}
      <div style={{ position:"absolute", top:0, left:"20%", right:"20%", height:1, background:`linear-gradient(90deg,transparent,${color},transparent)`, opacity:hov?1:0, transition:"opacity .3s" }}/>

      <div style={{ fontSize:28, lineHeight:1, color:`${color}60` }}>"</div>

      <div style={{ display:"flex", gap:2 }}>
        {[1,2,3,4,5].map(n => (
          <svg key={n} width="12" height="12" viewBox="0 0 24 24" fill={n<=t.rating?"#fbbf24":"rgba(255,255,255,.1)"}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        ))}
      </div>

      <p style={{ fontSize:14, color:"rgba(255,255,255,.68)", lineHeight:1.8, margin:0, flex:1, fontStyle:"italic" }}>
        {t.message}
      </p>

      {t.planUsed && (
        <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, alignSelf:"flex-start", background:`${color}12`, border:`1px solid ${color}25`, fontSize:10, fontWeight:700, color }}>
          {t.planUsed} Plan
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:12, borderTop:"1px solid rgba(255,255,255,.06)", paddingTop:14 }}>
        <div style={{ width:38, height:38, borderRadius:"50%", flexShrink:0, background:`linear-gradient(135deg,${color},${color}99)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"white" }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.9)" }}>{t.name}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.38)", marginTop:1 }}>{[t.role, t.company].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  const [ref, vis] = useInView();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("/api/public/testimonials")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const all: Testimonial[] = d?.testimonials || [];
        setTotal(all.length);
        // Featured first, max 3 on landing page
        const sorted = [...all].sort((a,b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        setTestimonials(sorted.length > 0 ? sorted.slice(0,6) : FALLBACK);
      })
      .catch(() => setTestimonials(FALLBACK));
  }, []);

  const display = testimonials.length > 0 ? testimonials : FALLBACK;
  const hasMore  = total > 6;

  return (
    <section style={{
      background:"linear-gradient(180deg,#0a0d28 0%,#080c22 60%,#070a1e 100%)",
      padding:"100px 24px",
      fontFamily:"'Outfit',sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orb{0%,100%{transform:translate(0,0)}50%{transform:translate(18px,-14px)}}
        @media(max-width:900px){.testi-grid{grid-template-columns:repeat(2,1fr) !important;}}
        @media(max-width:560px){.testi-grid{grid-template-columns:1fr !important;}}
        @media(max-width:600px){.testi-proof{flex-direction:column !important; gap:8px !important;} .testi-divider{display:none !important;}}
      `}</style>

      <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",backgroundSize:"52px 52px"}}/>
        <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",top:-80,right:-60,background:"radial-gradient(circle,rgba(99,102,241,.1),transparent 65%)",animation:"orb 14s ease-in-out infinite"}}/>
        <div style={{position:"absolute",top:0,left:"10%",right:"10%",height:1,background:"linear-gradient(90deg,transparent,rgba(99,102,241,.3),transparent)"}}/>
        <div style={{position:"absolute",bottom:0,left:"10%",right:"10%",height:1,background:"linear-gradient(90deg,transparent,rgba(99,102,241,.15),transparent)"}}/>
      </div>

      <div ref={ref} style={{maxWidth:1160,margin:"0 auto",position:"relative"}}>

        {/* Header */}
        <div style={{
          textAlign:"center", marginBottom:60,
          opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(24px)",
          transition:"all .6s cubic-bezier(.22,1,.36,1)",
        }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:8, padding:"6px 16px",borderRadius:100,marginBottom:20, background:"rgba(251,191,36,.1)",border:"1.5px solid rgba(251,191,36,.22)" }}>
            <span style={{fontSize:14}}>⭐</span>
            <span style={{fontSize:11,fontWeight:700,color:"#fbbf24",letterSpacing:".08em"}}>CUSTOMER STORIES</span>
          </div>
          <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(30px,4vw,50px)", fontWeight:700, color:"white", letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:16 }}>
            Trusted by businesses{" "}
            <span style={{background:"linear-gradient(135deg,#fbbf24,#f97316)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              worldwide
            </span>
          </h2>
          <div className="testi-proof" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{display:"flex",gap:2}}>
                {[...Array(5)].map((_,i)=>(
                  <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="#fbbf24">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ))}
              </div>
              <span style={{fontSize:18,fontWeight:800,color:"white"}}>4.9</span>
              <span style={{fontSize:13,color:"rgba(255,255,255,.4)"}}>average rating</span>
            </div>
            <div className="testi-divider" style={{width:1,height:18,background:"rgba(255,255,255,.1)"}}/>
            <span style={{fontSize:13,color:"rgba(255,255,255,.4)"}}>{total || "2,400"}+ verified reviews</span>
            <div className="testi-divider" style={{width:1,height:18,background:"rgba(255,255,255,.1)"}}/>
            <span style={{fontSize:13,color:"rgba(255,255,255,.4)"}}>40+ countries</span>
          </div>
        </div>

        {/* 6 cards */}
        <div className="testi-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:40 }}>
          {display.map((t,i) => <TestimonialCard key={t.id} t={t} i={i} vis={vis} />)}
        </div>

        {/* View all button — only if more than 3 exist */}
        {hasMore && (
          <div style={{ textAlign:"center", opacity:vis?1:0, transition:"opacity .6s ease .4s" }}>
            <Link href="/testimonials" style={{
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"13px 32px", borderRadius:12, fontSize:14, fontWeight:700,
              border:"1.5px solid rgba(255,255,255,.12)",
              background:"rgba(255,255,255,.04)",
              color:"rgba(255,255,255,.7)", textDecoration:"none",
              transition:"all .25s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.28)";e.currentTarget.style.color="white";e.currentTarget.style.background="rgba(255,255,255,.08)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.12)";e.currentTarget.style.color="rgba(255,255,255,.7)";e.currentTarget.style.background="rgba(255,255,255,.04)";}}
            >
              Read all {total} customer stories
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}
