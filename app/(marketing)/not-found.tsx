"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const QUICK_LINKS = [
  { icon:"🏠", label:"Go Home",          href:"/" },
  { icon:"💰", label:"Pricing",          href:"/pricing" },
  { icon:"✨", label:"Features",         href:"/features" },
  { icon:"📖", label:"Help Centre",      href:"/help" },
  { icon:"💬", label:"Contact Us",       href:"/contact" },
  { icon:"🚀", label:"Get Started", href:"/signup" },
];

export default function NotFoundPage() {
  const [vis, setVis] = useState(false);
  const [count, setCount] = useState(10);

  useEffect(() => {
    setTimeout(()=>setVis(true), 80);
    const t = setInterval(()=>{
      setCount(c=>{ if (c<=1) { clearInterval(t); window.location.href="/"; return 0; } return c-1; });
    }, 1000);
    return ()=>clearInterval(t);
  }, []);

  return (
    <main style={{
      minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(160deg,#080c1e 0%,#0c0f2e 50%,#080c1e 100%)",
      color:"white", fontFamily:"'DM Sans','Outfit',system-ui,sans-serif",
      padding:"40px 24px", textAlign:"center", overflow:"hidden", position:"relative",
    }}>
      {/* Background orbs */}
      <div style={{ position:"absolute", top:"10%", left:"15%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 70%)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:"15%", right:"10%", width:250, height:250, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,.1) 0%,transparent 70%)", pointerEvents:"none" }}/>

      <div style={{ maxWidth:560, position:"relative", zIndex:1 }}>
        {/* 404 large */}
        <div style={{
          fontSize:"clamp(100px,20vw,160px)", fontWeight:900, lineHeight:1,
          fontFamily:"Lora,serif", letterSpacing:"-.04em",
          background:"linear-gradient(135deg,rgba(99,102,241,.3),rgba(129,140,248,.1))",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          marginBottom:8,
          opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(30px)",
          transition:"opacity .7s ease, transform .7s ease",
        }}>
          404
        </div>

        {/* Icon */}
        <div style={{ fontSize:52, marginBottom:20, opacity:vis?1:0, transition:"opacity .6s ease .1s" }}>
          🗺️
        </div>

        <h1 style={{
          fontSize:"clamp(22px,4vw,36px)", fontWeight:800, letterSpacing:"-.02em",
          fontFamily:"Lora,serif", margin:"0 0 14px",
          opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(20px)",
          transition:"opacity .6s ease .15s, transform .6s ease .15s",
        }}>
          Looks like you're lost
        </h1>

        <p style={{
          fontSize:15, color:"rgba(255,255,255,.45)", lineHeight:1.75,
          maxWidth:400, margin:"0 auto 32px",
          opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(16px)",
          transition:"opacity .6s ease .2s, transform .6s ease .2s",
        }}>
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Auto-redirect notice */}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:8, padding:"8px 16px",
          borderRadius:20, background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.2)",
          marginBottom:36, fontSize:12, color:"rgba(255,255,255,.5)",
          opacity:vis?1:0, transition:"opacity .6s ease .25s",
        }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#818cf8", animation:"blink 1s ease infinite" }}/>
          Redirecting to home in <strong style={{color:"#818cf8"}}>{count}s</strong>
        </div>

        {/* Quick links */}
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, maxWidth:460, margin:"0 auto",
          opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(16px)",
          transition:"opacity .6s ease .3s, transform .6s ease .3s",
        }}>
          {QUICK_LINKS.map(l=>(
            <Link key={l.href} href={l.href} style={{ textDecoration:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"16px 12px", borderRadius:14, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", transition:"all .15s" }}
              onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(99,102,241,.1)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(99,102,241,.25)"; (e.currentTarget as HTMLElement).style.transform="translateY(-2px)"; }}
              onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.03)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,.07)"; (e.currentTarget as HTMLElement).style.transform="translateY(0)"; }}>
              <span style={{ fontSize:22 }}>{l.icon}</span>
              <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.6)" }}>{l.label}</span>
            </Link>
          ))}
        </div>

        {/* Search hint */}
        <div style={{ marginTop:36, opacity:vis?1:0, transition:"opacity .6s ease .4s" }}>
          <p style={{ fontSize:13, color:"rgba(255,255,255,.25)", margin:"0 0 12px" }}>Or search for what you need</p>
          <div style={{ display:"flex", gap:10, maxWidth:380, margin:"0 auto" }}>
            <input placeholder="Search FinovaOS..." style={{ flex:1, padding:"11px 16px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, outline:"none" }}
              onKeyDown={e=>{ if (e.key==="Enter") window.location.href=`/help?q=${(e.target as HTMLInputElement).value}`; }}/>
            <button style={{ padding:"11px 18px", borderRadius:10, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", flexShrink:0 }}>Search</button>
          </div>
        </div>
      </div>

      {/* FinovaOS wordmark at bottom */}
      <div style={{ position:"absolute", bottom:32, left:"50%", transform:"translateX(-50%)", fontSize:13, color:"rgba(255,255,255,.15)", fontWeight:700, letterSpacing:".08em" }}>
        FINOVA
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:.3} }
        * { box-sizing:border-box; }
      `}</style>
    </main>
  );
}