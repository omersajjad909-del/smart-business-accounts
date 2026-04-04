"use client";
import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const STEPS = [
  { icon: "🏢", label: "Creating your workspace",       sub: "Setting up company profile & settings"       },
  { icon: "📊", label: "Configuring chart of accounts", sub: "Building your industry-specific ledger"       },
  { icon: "⚡", label: "Activating modules",            sub: "Enabling features for your business type"    },
  { icon: "🎨", label: "Personalising dashboard",       sub: "Arranging KPIs & shortcuts for you"          },
  { icon: "✅", label: "Workspace ready!",              sub: "Everything is configured — opening dashboard" },
];

function SetupPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const businessType = searchParams.get("businessType") || "";
  const companyId    = searchParams.get("companyId")    || "";

  const [step,      setStep]      = useState(0);   // 0-4
  const [progress,  setProgress]  = useState(0);   // 0-100
  const [done,      setDone]      = useState(false);
  const [apiCalled, setApiCalled] = useState(false);
  const calledRef = useRef(false);

  /* ── Call setup API once ── */
  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    async function runSetup() {
      if (!businessType) return;
      try {
        const u = getCurrentUser();
        if (!u) return;
        const cid = companyId || u.companyId || "";
        if (!cid) return;

        await fetch("/api/company/setup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-company-id": cid,
            "x-user-id":    u.id    || "",
            "x-user-role":  u.role  || "",
          },
          body: JSON.stringify({ businessType }),
        });
      } catch {}
      setApiCalled(true);
    }

    runSetup();
  }, [businessType, companyId]);

  /* ── Progress animation — 5 seconds total ── */
  useEffect(() => {
    const totalMs   = 5000;
    const intervalMs = 50;
    const totalTicks = totalMs / intervalMs;
    let tick = 0;

    const id = setInterval(() => {
      tick++;
      const pct = Math.min((tick / totalTicks) * 100, 100);
      setProgress(pct);
      setStep(Math.min(Math.floor(pct / 20), 4));

      if (tick >= totalTicks) {
        clearInterval(id);
        setDone(true);
        setTimeout(() => router.replace("/dashboard"), 600);
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [router]);

  const current = STEPS[step] || STEPS[0];
  const stepsComplete = Math.floor(progress / 20);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#060818 0%,#0b0e28 50%,#080c1e 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Outfit','DM Sans',sans-serif", color: "white",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orb{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-16px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes barFill{from{width:0}to{width:100%}}
        .step-in{animation:fadeUp .4s ease both;}
      `}</style>

      {/* Background orbs */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
        <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",top:-150,left:-100,background:"radial-gradient(circle,rgba(99,102,241,.12),transparent 65%)",animation:"orb 14s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",bottom:-80,right:-80,background:"radial-gradient(circle,rgba(124,58,237,.09),transparent 65%)",animation:"orb 18s ease-in-out infinite reverse"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)",backgroundSize:"52px 52px"}}/>
      </div>

      {/* Card */}
      <div style={{
        position:"relative", zIndex:1,
        width:"100%", maxWidth:520,
        padding:"48px 44px",
        borderRadius:28,
        background:"rgba(255,255,255,.04)",
        border:"1px solid rgba(255,255,255,.09)",
        backdropFilter:"blur(24px)",
        boxShadow:"0 32px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(99,102,241,.1)",
        textAlign:"center",
      }}>

        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:36}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#4f46e5)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 14px rgba(99,102,241,.4)"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{fontFamily:"'Lora',serif",fontSize:18,fontWeight:700,color:"white"}}>FinovaOS</span>
        </div>

        {/* Big animated icon */}
        <div style={{
          width:88,height:88,borderRadius:"50%",margin:"0 auto 24px",
          background:"rgba(99,102,241,.1)",border:"2px solid rgba(99,102,241,.25)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:38,
          boxShadow:"0 0 40px rgba(99,102,241,.2)",
          animation: done ? "pulse .6s ease" : "pulse 2s ease-in-out infinite",
          transition:"all .4s",
        }}>
          {current.icon}
        </div>

        {/* Step label */}
        <div key={step} className="step-in">
          <h2 style={{
            fontFamily:"'Lora',serif",
            fontSize:22,fontWeight:700,color:"white",
            letterSpacing:"-.3px",margin:"0 0 6px",
          }}>
            {current.label}
          </h2>
          <p style={{fontSize:13,color:"rgba(255,255,255,.4)",margin:"0 0 32px",lineHeight:1.6}}>
            {current.sub}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{marginBottom:32}}>
          <div style={{height:6,borderRadius:6,background:"rgba(255,255,255,.07)",overflow:"hidden",marginBottom:10}}>
            <div style={{
              height:"100%",borderRadius:6,
              background:"linear-gradient(90deg,#6366f1,#818cf8,#a78bfa)",
              width:`${progress}%`,
              transition:"width .1s linear",
              boxShadow:"0 0 12px rgba(99,102,241,.6)",
            }}/>
          </div>
          <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,.3)",textAlign:"right"}}>
            {Math.round(progress)}%
          </div>
        </div>

        {/* Step indicators */}
        <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:32}}>
          {STEPS.map((s,i) => {
            const isDone    = i < stepsComplete;
            const isActive  = i === step;
            return (
              <div key={i} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:5,
              }}>
                <div style={{
                  width:34,height:34,borderRadius:"50%",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,transition:"all .3s",
                  background: isDone ? "rgba(52,211,153,.15)" : isActive ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.04)",
                  border:`1.5px solid ${isDone?"rgba(52,211,153,.5)":isActive?"rgba(99,102,241,.6)":"rgba(255,255,255,.07)"}`,
                  boxShadow: isActive ? "0 0 16px rgba(99,102,241,.4)" : "none",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                }}>
                  {isDone ? <span style={{color:"#34d399",fontWeight:700,fontSize:13}}>✓</span> : s.icon}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status text */}
        <div style={{
          display:"inline-flex",alignItems:"center",gap:8,
          padding:"7px 16px",borderRadius:100,
          background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.2)",
          fontSize:12,fontWeight:600,color:"#a5b4fc",
        }}>
          {done ? (
            <>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#34d399",display:"block"}}/>
              Opening your dashboard…
            </>
          ) : (
            <>
              <div style={{width:12,height:12,borderRadius:"50%",border:"2px solid rgba(129,140,248,.6)",borderTopColor:"#6366f1",animation:"spin .8s linear infinite"}}/>
              Setting up your workspace…
            </>
          )}
        </div>

        {businessType && (
          <div style={{marginTop:16,fontSize:11,color:"rgba(255,255,255,.2)"}}>
            Configured for: <span style={{color:"rgba(255,255,255,.45)",fontWeight:600}}>
              {businessType.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0a0f" }} />}>
      <SetupPageInner />
    </Suspense>
  );
}
