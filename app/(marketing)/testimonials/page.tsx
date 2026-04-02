"use client";
import { useEffect, useState } from "react";
import { TestimonialCard } from "../landing/components/Testimonials";

type Testimonial = {
  id: string; name: string; company: string | null;
  role: string | null; message: string;
  rating: number; planUsed: string | null; featured: boolean;
};

const FALLBACK: Testimonial[] = [
  { id:"1", name:"Thomas Miller",   company:"Miller Trading Co.",        role:"CEO",              message:"Finally, accounting that matches our business reality. Bank reconciliation used to take 3 days — now it's done before lunch.", rating:5, planUsed:"PROFESSIONAL",        featured:true  },
  { id:"2", name:"Alicia Stevens",  company:"Global Distribution Group", role:"CFO",              message:"The dashboard gives us instant clarity across all 5 branches. We scaled from 2 to 5 locations with zero chaos.", rating:5, planUsed:"ENTERPRISE",  featured:true  },
  { id:"3", name:"Ryan Kennedy",    company:"Apex Supply Chain",         role:"Managing Director",message:"We were running on spreadsheets and prayers. Switching to Finova was the single best operational decision this year.", rating:5, planUsed:"PROFESSIONAL",        featured:true  },
  { id:"4", name:"Fiona Murphy",    company:"Meridian Importers",        role:"Finance Director", message:"Real-time P&L was a game-changer. I can see exactly where every dollar is going before the month closes, not after.", rating:5, planUsed:"PROFESSIONAL",        featured:false },
  { id:"5", name:"Samir Al-Rashid", company:"Gulf Trade Solutions",      role:"Owner",            message:"Multi-currency support is flawless. We invoice in USD, AED, and PKR — Finova handles exchange rates automatically.", rating:5, planUsed:"ENTERPRISE",  featured:false },
  { id:"6", name:"Priya Sharma",    company:"Spark Retail Chain",        role:"Operations Head",  message:"Inventory syncs with sales in real time. No more end-of-day stock counts. Our team saves 8 hours every week.", rating:5, planUsed:"PROFESSIONAL",              featured:false },
  { id:"7", name:"James Okonkwo",   company:"Lagos Supply Co.",          role:"Director",         message:"Finally a system that works for African businesses too. Multi-currency and multi-branch — exactly what we needed.", rating:5, planUsed:"PROFESSIONAL",         featured:false },
  { id:"8", name:"Sofia Reyes",     company:"Reyes Importaciones",       role:"CFO",              message:"The payroll module alone saved us 2 full days every month. Now payslips go out in minutes.", rating:5, planUsed:"ENTERPRISE",                       featured:false },
];

const PLANS = ["ALL","STARTER","PROFESSIONAL","ENTERPRISE"];

export default function TestimonialsPage() {
  const [all, setAll]           = useState<Testimonial[]>([]);
  const [filtered, setFiltered] = useState<Testimonial[]>([]);
  const [plan, setPlan]         = useState("ALL");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/public/testimonials")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list: Testimonial[] = d?.testimonials || [];
        const data = list.length > 0 ? list : FALLBACK;
        const sorted = [...data].sort((a,b) => (b.featured?1:0)-(a.featured?1:0));
        setAll(sorted);
        setFiltered(sorted);
      })
      .catch(() => { setAll(FALLBACK); setFiltered(FALLBACK); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setFiltered(plan === "ALL" ? all : all.filter(t => t.planUsed === plan));
  }, [plan, all]);

  return (
    <div style={{ background:"linear-gradient(160deg,#05071a 0%,#080c22 50%,#070a1e 100%)", minHeight:"100vh", fontFamily:"'Outfit',sans-serif", color:"white" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orb{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-15px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* BG */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",backgroundSize:"52px 52px"}}/>
        <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",top:-150,right:-100,background:"radial-gradient(circle,rgba(99,102,241,.1),transparent 65%)",animation:"orb 14s ease-in-out infinite"}}/>
      </div>

      <div style={{maxWidth:1160,margin:"0 auto",padding:"80px 24px 100px",position:"relative",zIndex:1}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:56,animation:"fadeUp .6s ease both"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 16px",borderRadius:100,marginBottom:20,background:"rgba(251,191,36,.1)",border:"1.5px solid rgba(251,191,36,.22)"}}>
            <span style={{fontSize:14}}>⭐</span>
            <span style={{fontSize:11,fontWeight:700,color:"#fbbf24",letterSpacing:".08em"}}>CUSTOMER STORIES</span>
          </div>
          <h1 style={{fontFamily:"'Lora',serif",fontSize:"clamp(32px,5vw,56px)",fontWeight:700,color:"white",letterSpacing:"-1.5px",lineHeight:1.1,marginBottom:16}}>
            What our customers{" "}
            <span style={{background:"linear-gradient(135deg,#fbbf24,#f97316)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              say
            </span>
          </h1>
          <p style={{fontSize:16,color:"rgba(255,255,255,.42)",lineHeight:1.8,maxWidth:480,margin:"0 auto 24px"}}>
            Real businesses. Real results. Hear from our customers around the world.
          </p>

          {/* Stats */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:24,flexWrap:"wrap"}}>
            {[
              {val:"4.9", label:"Average rating"},
              {val:`${all.length || "2,400"}+`, label:"Reviews"},
              {val:"40+", label:"Countries"},
            ].map(s=>(
              <div key={s.label} style={{textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:800,color:"white",letterSpacing:"-.5px"}}>{s.val}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan filter */}
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:40,flexWrap:"wrap"}}>
          {PLANS.map(p=>(
            <button key={p} onClick={()=>setPlan(p)} style={{
              padding:"8px 20px",borderRadius:24,fontSize:12,fontWeight:700,cursor:"pointer",
              background: plan===p ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.04)",
              color: plan===p ? "#a5b4fc" : "rgba(255,255,255,.45)",
              border:`1px solid ${plan===p ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.08)"}`,
              transition:"all .2s",
            }}>{p === "ALL" ? "All Plans" : `${p} Plan`}</button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{textAlign:"center",padding:80,color:"rgba(255,255,255,.3)",fontSize:14}}>Loading reviews…</div>
        ) : filtered.length === 0 ? (
          <div style={{textAlign:"center",padding:80,color:"rgba(255,255,255,.3)",fontSize:14}}>No reviews for this plan yet.</div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:14}}>
            {filtered.map((t,i) => <TestimonialCard key={t.id} t={t} i={i} vis={true} />)}
          </div>
        )}

        {/* CTA */}
        <div style={{
          marginTop:72,borderRadius:20,padding:"36px 44px",
          background:"rgba(99,102,241,.07)",border:"1.5px solid rgba(99,102,241,.2)",
          display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:24,
          position:"relative",overflow:"hidden",
        }}>
          <div style={{position:"absolute",right:-40,top:"50%",transform:"translateY(-50%)",width:260,height:260,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,.14),transparent 70%)",pointerEvents:"none"}}/>
          <div style={{position:"relative"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"4px 12px",borderRadius:100,marginBottom:12,background:"rgba(251,191,36,.1)",border:"1px solid rgba(251,191,36,.25)",fontSize:11,fontWeight:700,color:"#fbbf24"}}>
              🏷️ 75% OFF — FIRST 3 MONTHS
            </div>
            <h3 style={{fontFamily:"'Lora',serif",fontSize:"clamp(18px,2.5vw,26px)",fontWeight:700,color:"white",letterSpacing:"-.4px",marginBottom:6}}>
              Join thousands of businesses on Finova
            </h3>
            <p style={{fontSize:14,color:"rgba(255,255,255,.4)",margin:0}}>Any industry. Any size. Anywhere in the world.</p>
          </div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",position:"relative"}}>
            <a href="/pricing" style={{
              display:"inline-flex",alignItems:"center",gap:8,
              padding:"13px 28px",borderRadius:12,
              background:"linear-gradient(135deg,#6366f1,#4f46e5)",
              color:"white",fontWeight:700,fontSize:14,textDecoration:"none",
              boxShadow:"0 4px 20px rgba(99,102,241,.4)",
            }}>Get Started →</a>
            <a href="/demo" style={{
              display:"inline-flex",alignItems:"center",gap:8,
              padding:"12px 22px",borderRadius:12,
              border:"1.5px solid rgba(255,255,255,.12)",
              background:"rgba(255,255,255,.04)",
              color:"rgba(255,255,255,.7)",fontWeight:600,fontSize:14,textDecoration:"none",
            }}>Watch Demo</a>
          </div>
        </div>

      </div>
    </div>
  );
}
