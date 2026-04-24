"use client";
import { useEffect, useRef, useState } from "react";
import { useRequirePermission } from "@/lib/useRequirePermission";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import { getCurrentUser, getStoredDemoBusinessPreference } from "@/lib/auth";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/businessModules";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import DemoBusinessShowcase from "./DemoBusinessShowcase";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

/* ─── Types ──────────────────────────────────────────────── */
interface RecentActivity { type: string; description: string; amount: number; date: string }
interface TopCustomer    { name: string; revenue: number }
interface DashStats {
  revenue: number; expenses: number; profit: number; cashBalance: number;
  revenueGrowth: number; overdueAmount: number; invoicesPending: number;
  revenueHistory: number[]; expensesHistory: number[];
  topCustomers: TopCustomer[]; recentActivity: RecentActivity[];
}

/* ─── Tooltip style ─────────────────────────────────────── */
const TT = {
  contentStyle: { background:"#0f1629", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, fontSize:12, color:"var(--text-primary)" },
  labelStyle:   { color:"var(--text-muted)", fontWeight:600, marginBottom:4 },
  cursor:       { fill:"rgba(99,102,241,.05)" },
};

/* ─── AI Widget ─────────────────────────────────────────── */
interface AIAlert { severity:"critical"|"warning"|"info"; title:string; description:string; link?:string }
interface AIWidgetData {
  healthScore:number; revenueChange:number; expenseChange:number;
  profitChange:number; cashRisk:"low"|"medium"|"high"; alerts:AIAlert[]; topRec:string;
}
function AIWidget({ companyId, role, userId }: { companyId:string; role:string; userId:string }) {
  const [data, setData]           = useState<AIWidgetData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [failed, setFailed]       = useState(false);
  const [chat, setChat]           = useState("");
  const [chatLoading, setChatLoad]= useState(false);
  const [chatReply, setReply]     = useState("");
  const [chatOpen, setChatOpen]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hdrs: Record<string,string> = { "x-company-id":companyId, "x-user-id":userId, "x-user-role":role };
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 8000);
    Promise.allSettled([
      fetch("/api/ai/alerts",   { headers:hdrs, signal:ctrl.signal }).then(r=>r.json()),
      fetch("/api/ai/insights", { headers:hdrs, signal:ctrl.signal }).then(r=>r.json()),
    ]).then(([ar, ir]) => {
      const alerts = ar.status==="fulfilled" ? (ar.value.alerts||[]) : [];
      const ctx    = ir.status==="fulfilled" ? ir.value.context : null;
      if (!ctx) { setFailed(true); setLoading(false); return; }
      const revChange=ctx.revenue?.change||0, expChange=ctx.expenses?.change||0, profitChange=ctx.profit?.change||0;
      const profit=ctx.profit?.thisMonth||0, overdue=ctx.receivables?.overdue||0, rev=ctx.revenue?.thisMonth||0;
      let score=60;
      if(revChange>0) score+=Math.min(revChange,15);
      if(revChange<0) score+=Math.max(revChange,-15);
      if(expChange<revChange) score+=10;
      if(expChange>20) score-=10;
      if(profit>0) score+=10; if(profit<0) score-=20;
      if(overdue>rev*0.3) score-=8;
      score=Math.max(20,Math.min(100,Math.round(score)));
      const cashRisk: "low"|"medium"|"high" = profit<0?"high":overdue>rev*0.25?"medium":"low";
      const critical=alerts.find((a:AIAlert)=>a.severity==="critical");
      const warning =alerts.find((a:AIAlert)=>a.severity==="warning");
      const topRec  =critical?.title||warning?.title||(alerts[0]?.title)||"All systems healthy ✓";
      setData({ healthScore:score, revenueChange:revChange, expenseChange:expChange, profitChange, cashRisk, alerts:alerts.slice(0,3), topRec });
      setFailed(false); setLoading(false);
    }).catch(()=>{ setFailed(true); setLoading(false); }).finally(()=>clearTimeout(tid));
    return ()=>{ clearTimeout(tid); ctrl.abort(); };
  }, [companyId, role, userId]);

  async function quickChat() {
    if(!chat.trim()||chatLoading) return;
    const msg=chat.trim(); setChat(""); setChatLoad(true); setReply("");
    try {
      const res=await fetch("/api/ai/chat",{ method:"POST", headers:{"Content-Type":"application/json","x-company-id":companyId,"x-user-id":userId,"x-user-role":role}, body:JSON.stringify({message:msg,history:[]}) });
      if(!res.body) throw new Error();
      const reader=res.body.getReader(); const dec=new TextDecoder(); let acc="";
      while(true){ const{done,value}=await reader.read(); if(done) break; acc+=dec.decode(value,{stream:true}); setReply(acc); }
    } catch { setReply("Error — please try again."); } finally { setChatLoad(false); }
  }

  if(loading&&!data) return (
    <div style={{borderRadius:14,padding:"16px 20px",background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.18)",display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:14,height:14,border:"2px solid rgba(99,102,241,.3)",borderTopColor:"#6366f1",borderRadius:"50%",animation:"db-spin .7s linear infinite",flexShrink:0}}/>
      <span style={{fontSize:12,color:"var(--text-muted)"}}>AI Financial Intelligence loading…</span>
    </div>
  );

  if(failed||!data) return (
    <div style={{borderRadius:14,padding:"16px 20px",background:"var(--panel-bg)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",marginBottom:4}}>AI Financial Intelligence</div>
        <div style={{fontSize:12,color:"var(--text-muted)"}}>AI summary unavailable — view full insights in AI center.</div>
      </div>
      <Link prefetch={false} href="/dashboard/ai" style={{padding:"8px 16px",borderRadius:9,background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"white",fontSize:12,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>Open AI →</Link>
    </div>
  );

  const scoreColor=data.healthScore>=75?"#10b981":data.healthScore>=55?"#f59e0b":"#ef4444";
  const riskColor =data.cashRisk==="high"?"#ef4444":data.cashRisk==="medium"?"#f59e0b":"#10b981";
  const sign=(n:number)=>(n>=0?"+":"")+n+"%";

  return (
    <div style={{borderRadius:16,border:"1px solid rgba(99,102,241,.18)",background:"var(--panel-bg)",overflow:"hidden"}}>
      {/* Metric strip */}
      <div className="db-ai-strip" style={{display:"grid",gridTemplateColumns:"auto 1fr 1fr 1fr 1fr auto",gap:0,borderBottom:"1px solid var(--border)"}}>
        <div style={{padding:"13px 16px",borderRight:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8,background:"rgba(99,102,241,.04)"}}>
          <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#6366f1,#4f46e5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>🤖</div>
          <div>
            <div style={{fontSize:9,fontWeight:800,color:"#818cf8",textTransform:"uppercase",letterSpacing:".06em"}}>AI</div>
            <div style={{fontSize:9,color:"var(--text-muted)",whiteSpace:"nowrap"}}>Smart</div>
          </div>
        </div>
        {/* Health */}
        <div style={{padding:"13px 16px",borderRight:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8}}>
          <div style={{position:"relative",width:36,height:36,flexShrink:0}}>
            <svg width="36" height="36" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="15" fill="none" stroke="var(--border)" strokeWidth="3.5"/>
              <circle cx="20" cy="20" r="15" fill="none" stroke={scoreColor} strokeWidth="3.5" strokeDasharray={`${(data.healthScore/100)*94} 94`} strokeLinecap="round" transform="rotate(-90 20 20)"/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:scoreColor}}>{data.healthScore}</div>
          </div>
          <div>
            <div style={{fontSize:9,color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em"}}>Health</div>
            <div style={{fontSize:12,fontWeight:800,color:scoreColor}}>{data.healthScore>=75?"Good":data.healthScore>=55?"Fair":"Poor"}</div>
          </div>
        </div>
        {/* Revenue */}
        <div style={{padding:"13px 16px",borderRight:"1px solid var(--border)"}}>
          <div style={{fontSize:9,color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Revenue</div>
          <div style={{fontSize:13,fontWeight:800,color:data.revenueChange>=0?"#10b981":"#ef4444"}}>{data.revenueChange>=0?"▲":"▼"} {sign(data.revenueChange)}</div>
          <div style={{fontSize:9,color:"var(--text-muted)"}}>vs last month</div>
        </div>
        {/* Expenses */}
        <div style={{padding:"13px 16px",borderRight:"1px solid var(--border)"}}>
          <div style={{fontSize:9,color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Expenses</div>
          <div style={{fontSize:13,fontWeight:800,color:data.expenseChange<=0?"#10b981":data.expenseChange>20?"#ef4444":"#f59e0b"}}>{data.expenseChange>=0?"▲":"▼"} {sign(data.expenseChange)}</div>
          <div style={{fontSize:9,color:"var(--text-muted)"}}>vs last month</div>
        </div>
        {/* Cash Risk */}
        <div style={{padding:"13px 16px",borderRight:"1px solid var(--border)"}}>
          <div style={{fontSize:9,color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Cash Risk</div>
          <div style={{fontSize:13,fontWeight:800,color:riskColor,textTransform:"capitalize"}}>{data.cashRisk==="high"?"🔴":data.cashRisk==="medium"?"🟡":"🟢"} {data.cashRisk}</div>
          <div style={{fontSize:9,color:"var(--text-muted)"}}>30-day</div>
        </div>
        {/* CTA */}
        <div style={{padding:"13px 16px",display:"flex",alignItems:"center"}}>
          <Link prefetch={false} href="/dashboard/ai" style={{padding:"7px 14px",borderRadius:9,background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"white",fontSize:11,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap",boxShadow:"0 4px 12px rgba(99,102,241,.3)"}}>AI Center →</Link>
        </div>
      </div>
      {/* Alerts + chat */}
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",alignItems:"center"}}>
        <div style={{padding:"9px 16px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {data.alerts.length>0 ? (
            <><span style={{fontSize:9,color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",flexShrink:0}}>🔔 Alerts:</span>
            {data.alerts.map((a,i)=>(
              <Link prefetch={false} key={i} href={a.link||"/dashboard/ai"} style={{padding:"3px 9px",borderRadius:20,textDecoration:"none",fontSize:11,fontWeight:600,background:a.severity==="critical"?"rgba(239,68,68,.12)":a.severity==="warning"?"rgba(245,158,11,.1)":"rgba(99,102,241,.1)",border:`1px solid ${a.severity==="critical"?"rgba(239,68,68,.3)":a.severity==="warning"?"rgba(245,158,11,.3)":"rgba(99,102,241,.25)"}`,color:a.severity==="critical"?"#fca5a5":a.severity==="warning"?"#fcd34d":"#a5b4fc"}}>
                {a.severity==="critical"?"🚨":a.severity==="warning"?"⚠️":"ℹ️"} {a.title}
              </Link>
            ))}</>
          ) : <span style={{fontSize:12,color:"var(--text-muted)"}}>✅ No active alerts — financials look healthy</span>}
        </div>
        <div style={{padding:"9px 16px",borderLeft:"1px solid var(--border)"}}>
          <button onClick={()=>{ setChatOpen(o=>!o); setTimeout(()=>inputRef.current?.focus(),50); }}
            style={{background:"none",border:"none",cursor:"pointer",color:"#a5b4fc",fontSize:12,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
            💬 Ask AI {chatOpen?"▲":"▼"}
          </button>
        </div>
      </div>
      {chatOpen && (
        <div style={{borderTop:"1px solid var(--border)",padding:"12px 16px"}}>
          <div style={{display:"flex",gap:8,marginBottom:chatReply?10:0}}>
            <input ref={inputRef} value={chat} onChange={e=>setChat(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") quickChat(); }}
              placeholder="Ask a quick question… e.g. What is my profit this month?"
              style={{flex:1,background:"var(--app-bg)",border:"1px solid var(--border)",borderRadius:9,padding:"8px 14px",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none"}}/>
            <button onClick={quickChat} disabled={!chat.trim()||chatLoading}
              style={{padding:"8px 14px",borderRadius:9,background:chat.trim()&&!chatLoading?"linear-gradient(135deg,#6366f1,#4f46e5)":"var(--panel-bg)",border:"1px solid var(--border)",color:"var(--text-primary)",fontSize:12,fontWeight:700,cursor:chat.trim()&&!chatLoading?"pointer":"not-allowed",fontFamily:"inherit"}}>
              {chatLoading?"…":"Ask"}
            </button>
          </div>
          {chatReply && (
            <div style={{padding:"10px 14px",borderRadius:10,background:"var(--app-bg)",border:"1px solid var(--border)",fontSize:12,color:"var(--text-primary)",lineHeight:1.7,maxHeight:120,overflowY:"auto"}}>{chatReply}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Dashboard ────────────────────────────────────── */
export default function DashboardContent() {
  const allowed   = useRequirePermission(PERMISSIONS.VIEW_DASHBOARD);
  const storedUser= getCurrentUser() as { businessType?:string|null; email?:string|null } | null;
  const initialDemoBusiness =
    typeof window!=="undefined" && storedUser?.email==="finovaos.app@gmail.com"
      ? (getStoredDemoBusinessPreference() as BusinessType|null) : null;

  const [companyInfo, setCompanyInfo] = useState<{plan:string;subscriptionStatus:string;baseCurrency:string}|null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>(initialDemoBusiness||(storedUser?.businessType as BusinessType)||"trading");
  const [stats, setStats] = useState<DashStats>({
    revenue:0, expenses:0, profit:0, cashBalance:0,
    revenueGrowth:0, overdueAmount:0, invoicesPending:0,
    revenueHistory:[], expensesHistory:[],
    topCustomers:[], recentActivity:[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(allowed!==true) return;
    async function load() {
      try {
        const user=getCurrentUser();
        if(!user?.companyId){ setLoading(false); return; }
        const hdrs: Record<string,string> = {};
        if(user.role)      hdrs["x-user-role"]  = user.role;
        if(user.id)        hdrs["x-user-id"]    = user.id;
        if(user.companyId) hdrs["x-company-id"] = user.companyId;

        const [sRes, cRes, mRes, bRes] = await Promise.allSettled([
          fetch("/api/reports/dashboard-summary",          { headers:hdrs, cache:"no-store" }),
          fetch("/api/reports/dashboard-charts?period=month",{ headers:hdrs, cache:"no-store" }),
          fetch("/api/me/company",                         { headers:hdrs, cache:"no-store" }),
          fetch("/api/company/business-type",              { headers:hdrs, cache:"no-store" }),
        ]);

        if(sRes.status==="fulfilled"&&sRes.value.ok) {
          const d=await sRes.value.json();
          setStats({
            revenue:         Number(d.revenue         ||0),
            expenses:        Number(d.expenses        ||0),
            profit:          Number(d.profit          ||0),
            cashBalance:     Number(d.cashBalance     ||0),
            revenueGrowth:   Number(d.revenueGrowth   ||0),
            overdueAmount:   Number(d.overdueAmount   ||0),
            invoicesPending: Number(d.invoicesPending ||0),
            revenueHistory:  Array.isArray(d.revenueHistory)  ? d.revenueHistory  : [],
            expensesHistory: Array.isArray(d.expensesHistory) ? d.expensesHistory : [],
            topCustomers:    Array.isArray(d.topCustomers)    ? d.topCustomers    : [],
            recentActivity:  Array.isArray(d.recentActivity)  ? d.recentActivity  : [],
          });
        }
        if(bRes.status==="fulfilled"&&bRes.value.ok) {
          const b=await bRes.value.json();
          if(!initialDemoBusiness&&b.businessType) setBusinessType(b.businessType as BusinessType);
        }
        if(mRes.status==="fulfilled"&&mRes.value.ok) {
          const s=await mRes.value.json();
          if(initialDemoBusiness) setBusinessType(initialDemoBusiness);
          else if(s.businessType) setBusinessType(s.businessType as BusinessType);
          setCompanyInfo({ plan:String(s.plan||"STARTER"), subscriptionStatus:String(s.subscriptionStatus||"ACTIVE"), baseCurrency:CURRENCY_SYMBOL[String(s.baseCurrency||"")]||CURRENCY_SYMBOL["USD"] });
        }
      } catch(e){ console.error("Dashboard error:",e); }
      finally { setLoading(false); }
    }
    load();
  }, [allowed]);

  useEffect(() => {
    if(storedUser?.email!=="finovaos.app@gmail.com") return;
    const pref=getStoredDemoBusinessPreference() as BusinessType|null;
    if(pref&&pref!==businessType) setBusinessType(pref);
  }, [storedUser?.email, businessType]);

  if(allowed===false) return <div style={{padding:40,textAlign:"center",color:"#f87171",fontWeight:700,fontSize:18}}>Access Denied</div>;
  if(allowed===null)  return <div style={{padding:40,textAlign:"center",color:"var(--text-muted)"}}>Checking permissions…</div>;

  const currentUser = getCurrentUser();
  const isDemoUser  = currentUser?.email==="finovaos.app@gmail.com";
  if(isDemoUser) return <DemoBusinessShowcase businessType={businessType} companyInfo={companyInfo}/>;

  const cur    = companyInfo?.baseCurrency||"Rs";
  const btMeta = BUSINESS_TYPES.find(b=>b.id===businessType);
  const subStatus = companyInfo?.subscriptionStatus;

  /* ── Chart data ── */
  const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now=new Date();
  const overviewData = Array.from({length:12},(_,i)=>({
    m: MONTHS[new Date(now.getFullYear(),now.getMonth()-11+i,1).getMonth()].slice(0,3),
    Revenue:  stats.revenueHistory[i]  || 0,
    Expenses: stats.expensesHistory[i] || 0,
  }));
  const hasData = stats.revenue>0||stats.expenses>0;
  const COLORS  = ["#6366f1","#34d399","#f59e0b","#f87171","#38bdf8","#a78bfa"];
  const fmt = (n:number) => n>=1e6 ? `${(n/1e6).toFixed(1)}M` : n>=1e3 ? `${(n/1e3).toFixed(0)}K` : n.toLocaleString();

  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const userName=(currentUser as any)?.name || "there";

  const profitColor = stats.profit>=0?"#10b981":"#ef4444";
  const growthColor = stats.revenueGrowth>=0?"#10b981":"#ef4444";

  return (
    <div style={{minHeight:"100vh",background:"transparent",padding:0,fontFamily:"inherit"}}>
      <style>{`
        @keyframes db-spin { to { transform:rotate(360deg); } }
        @keyframes db-fadeup { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        /* KPI grid */
        .db-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
        @media(max-width:1100px) { .db-kpi-grid { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:560px)  { .db-kpi-grid { grid-template-columns:1fr 1fr; gap:10px; } }

        /* Main grid */
        .db-main-grid { display:grid; grid-template-columns:1fr 340px; gap:16px; margin-bottom:20px; }
        @media(max-width:1050px) { .db-main-grid { grid-template-columns:1fr; } }

        /* Bottom grid */
        .db-bottom-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
        @media(max-width:800px) { .db-bottom-grid { grid-template-columns:1fr; } }

        /* Alert grid */
        .db-alert-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px; }
        @media(max-width:640px) { .db-alert-grid { grid-template-columns:1fr; } }

        /* AI strip */
        .db-ai-strip { grid-template-columns:auto 1fr 1fr 1fr 1fr auto !important; }
        @media(max-width:700px) { .db-ai-strip { grid-template-columns:auto 1fr 1fr auto !important; } .db-ai-strip > div:nth-child(3),.db-ai-strip > div:nth-child(5) { display:none !important; } }

        /* Quick actions */
        .db-qa-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:10px; }
        @media(max-width:480px) { .db-qa-grid { grid-template-columns:repeat(3,1fr); gap:8px; } }

        /* Hero balance (mobile only) */
        .db-hero { display:none; }
        @media(max-width:640px) {
          .db-hero { display:block; border-radius:20px; padding:28px 24px; background:linear-gradient(135deg,#6366f1 0%,#4f46e5 50%,#312e81 100%); margin-bottom:20px; position:relative; overflow:hidden; animation:db-fadeup .4s ease; }
          .db-hero-wave { position:absolute; bottom:-1px; left:0; right:0; opacity:.15; }
        }

        /* Hide hero balance on desktop */
        @media(min-width:641px) { .db-hero { display:none !important; } }

        /* KPI card — hide cashBalance card on mobile (shown in hero instead) */
        @media(max-width:640px) { .db-kpi-balance { display:none !important; } }

        /* Hover states */
        .db-kpi-card { transition: transform .18s, box-shadow .18s; }
        .db-kpi-card:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(0,0,0,.2); }
        .db-activity-row:hover { background:rgba(255,255,255,.03) !important; }
        .db-qa-btn { transition:transform .15s, background .15s, border-color .15s; }
        .db-qa-btn:hover { transform:translateY(-2px); }
      `}</style>

      {/* ── Pending payment banner ── */}
      {subStatus==="PENDING_PAYMENT" && (
        <div style={{marginBottom:20,padding:"14px 20px",borderRadius:12,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.25)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:20}}>💳</span>
            <div>
              <div style={{fontWeight:700,color:"#a5b4fc",fontSize:13}}>Payment Required</div>
              <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>Complete your payment to unlock all features.</div>
            </div>
          </div>
          <Link prefetch={false} href="/billing" style={{padding:"8px 18px",borderRadius:8,background:"#6366f1",color:"white",fontWeight:700,fontSize:12,textDecoration:"none"}}>Pay Now</Link>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{marginBottom:24,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:13,color:"var(--text-muted)",fontWeight:500,marginBottom:4}}>{greeting}, <span style={{color:"var(--text-primary)",fontWeight:700}}>{userName}</span> 👋</div>
          <h1 style={{fontSize:22,fontWeight:900,color:"var(--text-primary)",margin:0,letterSpacing:"-.4px"}}>Business Overview</h1>
          <p style={{fontSize:12,color:"var(--text-muted)",marginTop:3,marginBottom:0}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {loading && (
            <div style={{display:"flex",alignItems:"center",gap:7,padding:"6px 14px",borderRadius:8,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)"}}>
              <div style={{width:12,height:12,border:"2px solid rgba(99,102,241,.3)",borderTopColor:"#6366f1",borderRadius:"50%",animation:"db-spin .7s linear infinite"}}/>
              <span style={{fontSize:11,color:"#818cf8",fontWeight:600}}>Loading…</span>
            </div>
          )}
          {btMeta && (
            <div style={{padding:"6px 14px",borderRadius:20,background:`${btMeta.color}12`,border:`1px solid ${btMeta.color}25`,fontSize:12,fontWeight:700,color:btMeta.color}}>
              {btMeta.icon} {btMeta.label}
            </div>
          )}
        </div>
      </div>

      {/* ── Hero balance (mobile only) ── */}
      <div className="db-hero">
        <div style={{fontSize:12,color:"rgba(255,255,255,.6)",fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:".08em"}}>Total Balance</div>
        <div style={{fontSize:34,fontWeight:900,color:"white",letterSpacing:"-1px",marginBottom:12}}>{cur} {fmt(stats.cashBalance)}</div>
        <div style={{display:"flex",gap:24}}>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:700}}>Revenue</div>
            <div style={{fontSize:15,fontWeight:800,color:"#86efac"}}>{cur} {fmt(stats.revenue)}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:700}}>Expenses</div>
            <div style={{fontSize:15,fontWeight:800,color:"#fca5a5"}}>{cur} {fmt(stats.expenses)}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:700}}>Profit</div>
            <div style={{fontSize:15,fontWeight:800,color:stats.profit>=0?"#86efac":"#fca5a5"}}>{cur} {fmt(stats.profit)}</div>
          </div>
        </div>
        <svg className="db-hero-wave" viewBox="0 0 400 60" fill="white" preserveAspectRatio="none" style={{height:60}}>
          <path d="M0,30 C100,60 300,0 400,30 L400,60 L0,60 Z"/>
        </svg>
      </div>

      {/* ── KPI Cards ── */}
      <div className="db-kpi-grid">
        {/* Balance */}
        <div className="db-kpi-card db-kpi-balance" style={{borderRadius:16,padding:"20px 22px",background:"linear-gradient(135deg,rgba(99,102,241,.12),rgba(79,70,229,.08))",border:"1px solid rgba(99,102,241,.2)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontSize:11,fontWeight:700,color:"rgba(99,102,241,.8)",textTransform:"uppercase",letterSpacing:".06em"}}>Total Balance</span>
            <div style={{width:36,height:36,borderRadius:10,background:"rgba(99,102,241,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>💳</div>
          </div>
          <div style={{fontSize:26,fontWeight:900,color:"#818cf8",letterSpacing:"-.5px",lineHeight:1,marginBottom:6}}>{cur} {fmt(stats.cashBalance)}</div>
          <div style={{fontSize:11,color:"var(--text-muted)"}}>All bank accounts</div>
        </div>

        {/* Revenue */}
        <div className="db-kpi-card" style={{borderRadius:16,padding:"20px 22px",background:"rgba(16,185,129,.07)",border:"1px solid rgba(16,185,129,.2)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontSize:11,fontWeight:700,color:"rgba(16,185,129,.8)",textTransform:"uppercase",letterSpacing:".06em"}}>Revenue</span>
            <div style={{width:36,height:36,borderRadius:10,background:"rgba(16,185,129,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>📈</div>
          </div>
          <div style={{fontSize:26,fontWeight:900,color:"#10b981",letterSpacing:"-.5px",lineHeight:1,marginBottom:6}}>{cur} {fmt(stats.revenue)}</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:`${growthColor}18`,color:growthColor}}>
              {stats.revenueGrowth>=0?"↑":"↓"} {Math.abs(stats.revenueGrowth).toFixed(1)}%
            </span>
            <span style={{fontSize:10,color:"var(--text-muted)"}}>vs last period</span>
          </div>
        </div>

        {/* Expenses */}
        <div className="db-kpi-card" style={{borderRadius:16,padding:"20px 22px",background:"rgba(248,113,113,.07)",border:"1px solid rgba(248,113,113,.2)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontSize:11,fontWeight:700,color:"rgba(248,113,113,.8)",textTransform:"uppercase",letterSpacing:".06em"}}>Expenses</span>
            <div style={{width:36,height:36,borderRadius:10,background:"rgba(248,113,113,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>📉</div>
          </div>
          <div style={{fontSize:26,fontWeight:900,color:"#f87171",letterSpacing:"-.5px",lineHeight:1,marginBottom:6}}>{cur} {fmt(stats.expenses)}</div>
          <div style={{fontSize:11,color:"var(--text-muted)"}}>This period</div>
        </div>

        {/* Profit */}
        <div className="db-kpi-card" style={{borderRadius:16,padding:"20px 22px",background:`${profitColor}0f`,border:`1px solid ${profitColor}28`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontSize:11,fontWeight:700,color:`${profitColor}cc`,textTransform:"uppercase",letterSpacing:".06em"}}>Net Profit</span>
            <div style={{width:36,height:36,borderRadius:10,background:`${profitColor}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>
              {stats.profit>=0?"💰":"📉"}
            </div>
          </div>
          <div style={{fontSize:26,fontWeight:900,color:profitColor,letterSpacing:"-.5px",lineHeight:1,marginBottom:6}}>{cur} {fmt(stats.profit)}</div>
          <div style={{fontSize:11,color:"var(--text-muted)"}}>{stats.profit<0?"Net loss this period":"Profit this period"}</div>
        </div>
      </div>

      {/* ── Subscription row ── */}
      {companyInfo&&currentUser?.role==="ADMIN" && (
        <div style={{borderRadius:14,padding:"13px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:18,flexWrap:"wrap",background:subStatus==="TRIALING"?"rgba(251,191,36,.06)":"var(--panel-bg)",border:subStatus==="TRIALING"?"1px solid rgba(251,191,36,.2)":"1px solid var(--border)"}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:subStatus==="ACTIVE"?"#34d399":"#f59e0b",flexShrink:0}}/>
            <span style={{fontSize:12,color:"var(--text-muted)"}}>Plan: <strong style={{color:"#a5b4fc"}}>{companyInfo.plan}</strong></span>
          </div>
          <span style={{fontSize:12,color:"var(--text-muted)"}}>Status: <strong style={{color:subStatus==="ACTIVE"?"#34d399":"#f59e0b"}}>{subStatus}</strong></span>
          {subStatus==="TRIALING"&&<span style={{fontSize:11,color:"rgba(251,191,36,.8)"}}>⚠️ Trial active — upgrade to unlock all features</span>}
          <div style={{marginLeft:"auto"}}>
            {subStatus==="TRIALING" ? (
              <Link prefetch={false} href="/dashboard/billing" style={{padding:"7px 18px",borderRadius:9,background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"white",fontSize:12,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap",boxShadow:"0 4px 12px rgba(245,158,11,.3)"}}>🚀 Activate Now →</Link>
            ) : subStatus==="ACTIVE"&&companyInfo.plan!=="ENTERPRISE" ? (
              <Link prefetch={false} href="/dashboard/billing" style={{padding:"7px 16px",borderRadius:9,background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.25)",color:"#a5b4fc",fontSize:11,fontWeight:700,textDecoration:"none"}}>Upgrade Plan →</Link>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Main grid: Overview chart + Side panel ── */}
      <div className="db-main-grid">

        {/* Business Overview chart */}
        <div style={{borderRadius:16,padding:"20px 20px 12px",background:"var(--panel-bg)",border:"1px solid var(--border)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>Business Overview</div>
              <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>12-month revenue &amp; expense trend</div>
            </div>
            <div style={{display:"flex",gap:14,fontSize:11,color:"var(--text-muted)"}}>
              <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{display:"inline-block",width:10,height:3,borderRadius:4,background:"#10b981"}}/> Revenue</span>
              <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{display:"inline-block",width:10,height:3,borderRadius:4,background:"#f87171"}}/> Expenses</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={overviewData} margin={{top:4,right:4,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f87171" stopOpacity={0.18}/>
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="m" tick={{fill:"var(--text-muted)",fontSize:10} as any} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"var(--text-muted)",fontSize:10} as any} axisLine={false} tickLine={false}/>
              <Tooltip {...TT} formatter={(v?:number)=>[`${cur} ${(v??0).toLocaleString()}`,""]}/>
              <Area type="monotone" dataKey="Revenue"  stroke="#10b981" strokeWidth={2} fill="url(#gRev)" dot={false} activeDot={{r:4,fill:"#10b981"}}/>
              <Area type="monotone" dataKey="Expenses" stroke="#f87171" strokeWidth={2} fill="url(#gExp)" dot={false} activeDot={{r:4,fill:"#f87171"}}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Side panel: AI + alerts */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>

          {/* AI Widget */}
          {currentUser?.companyId && (
            <AIWidget companyId={currentUser.companyId} role={currentUser.role||"ADMIN"} userId={currentUser.id||""}/>
          )}

          {/* Overdue alert */}
          <div style={{borderRadius:14,padding:"16px 18px",background:"rgba(248,113,113,.07)",border:"1px solid rgba(248,113,113,.18)",flex:1}}>
            <div style={{fontSize:10,color:"rgba(248,113,113,.8)",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>
              Overdue Receivables {stats.invoicesPending>0?`(${stats.invoicesPending} invoices)`:""}
            </div>
            <div style={{fontSize:22,fontWeight:900,color:"#f87171",letterSpacing:"-.5px",marginBottom:4}}>{cur} {fmt(stats.overdueAmount)}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
              <div style={{fontSize:11,color:"var(--text-muted)"}}>Outstanding from customers</div>
              <Link prefetch={false} href="/dashboard/reports/ageing" style={{padding:"5px 12px",borderRadius:8,background:"rgba(248,113,113,.12)",border:"1px solid rgba(248,113,113,.22)",color:"#f87171",fontSize:11,fontWeight:700,textDecoration:"none",flexShrink:0}}>View →</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: Recent Activity + Top Customers ── */}
      <div className="db-bottom-grid">

        {/* Recent Activity */}
        <div style={{borderRadius:16,padding:"20px",background:"var(--panel-bg)",border:"1px solid var(--border)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>Recent Transactions</div>
            <Link prefetch={false} href="/dashboard/sales" style={{fontSize:11,color:"#818cf8",textDecoration:"none",fontWeight:600}}>View all →</Link>
          </div>
          {stats.recentActivity.length===0 ? (
            <div style={{padding:"32px 0",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>📋</div>
              <div style={{fontSize:12,color:"var(--text-muted)"}}>No recent transactions</div>
            </div>
          ) : stats.recentActivity.map((tx,i)=>(
            <div key={i} className="db-activity-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:i<stats.recentActivity.length-1?"1px solid var(--border)":"none",transition:"background .15s",borderRadius:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,borderRadius:10,background:tx.type==="invoice"?"rgba(16,185,129,.12)":"rgba(248,113,113,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
                  {tx.type==="invoice"?"🧾":"📦"}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--text-primary)"}}>{tx.description}</div>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginTop:1}}>{tx.date}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,fontWeight:700,color:tx.type==="invoice"?"#10b981":"#f87171"}}>{tx.type==="invoice"?"+":"-"}{cur} {fmt(tx.amount)}</div>
                <div style={{fontSize:10,padding:"1px 7px",borderRadius:20,background:tx.type==="invoice"?"rgba(16,185,129,.1)":"rgba(248,113,113,.1)",color:tx.type==="invoice"?"#10b981":"#f87171",marginTop:2,display:"inline-block",fontWeight:600}}>
                  {tx.type==="invoice"?"Sale":"Purchase"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Top Customers */}
        <div style={{borderRadius:16,padding:"20px",background:"var(--panel-bg)",border:"1px solid var(--border)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>Top Customers</div>
            <span style={{fontSize:11,color:"var(--text-muted)"}}>By revenue</span>
          </div>
          {stats.topCustomers.length===0 ? (
            <div style={{padding:"32px 0",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>👥</div>
              <div style={{fontSize:12,color:"var(--text-muted)"}}>No customer data yet</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.topCustomers.slice(0,5).map(c=>({name:c.name.length>12?c.name.slice(0,12)+"…":c.name,value:c.revenue}))} layout="vertical" margin={{top:0,right:20,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                <XAxis type="number" tick={{fill:"var(--text-muted)",fontSize:10} as any} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" width={90} tick={{fill:"var(--text-muted)",fontSize:10} as any} axisLine={false} tickLine={false}/>
                <Tooltip {...TT} formatter={(v?:number)=>[`${cur} ${(v??0).toLocaleString()}`,"Revenue"]}/>
                <Bar dataKey="value" radius={[0,6,6,0]} maxBarSize={18}>
                  {stats.topCustomers.slice(0,5).map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      {(() => {
        const actions=btMeta?.quickActions||[];
        if(!actions.length) return null;
        return (
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em"}}>Quick Actions</div>
              {btMeta&&<div style={{fontSize:10,padding:"2px 10px",borderRadius:20,background:`${btMeta.color}12`,border:`1px solid ${btMeta.color}25`,color:btMeta.color,fontWeight:700}}>{btMeta.icon} {btMeta.label}</div>}
            </div>
            <div className="db-qa-grid">
              {actions.map((a,i)=>(
                <Link prefetch={false} key={i} href={a.href} className="db-qa-btn"
                  style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"16px 10px",borderRadius:12,textDecoration:"none",gap:7,background:"var(--panel-bg)",border:"1px solid var(--border)",textAlign:"center"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${a.color}10`;e.currentTarget.style.borderColor=`${a.color}30`;}}
                  onMouseLeave={e=>{e.currentTarget.style.background="var(--panel-bg)";e.currentTarget.style.borderColor="var(--border)";}}>
                  <span style={{fontSize:22}}>{a.icon}</span>
                  <span style={{fontSize:11,fontWeight:600,color:"var(--text-muted)"}}>{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Getting Started (empty state) ── */}
      {!hasData&&!loading && (
        <div style={{borderRadius:16,padding:"28px 24px",background:"rgba(99,102,241,.05)",border:"1px solid rgba(99,102,241,.18)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(99,102,241,.7)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Getting Started</div>
          <div style={{fontSize:17,fontWeight:800,color:"var(--text-primary)",marginBottom:6}}>Set up your workspace</div>
          <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:18}}>Import opening balances to begin tracking your finances professionally.</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[
              {href:"/dashboard/accounts",        label:"Chart of Accounts"},
              {href:"/dashboard/opening-balances", label:"Opening Balances"},
              {href:"/onboarding/checklist",       label:"Setup Checklist"},
            ].map((btn,i)=>(
              <Link prefetch={false} key={i} href={btn.href} style={{padding:"8px 18px",borderRadius:9,background:"rgba(99,102,241,.12)",border:"1px solid rgba(99,102,241,.28)",color:"#a5b4fc",fontSize:12,fontWeight:600,textDecoration:"none"}}>{btn.label}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
