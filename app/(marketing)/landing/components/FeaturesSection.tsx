"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis] as const;
}

/* ── Mini sparkline ── */
function Spark({ d, color }: { d: number[]; color: string }) {
  const W = 64, H = 24, mx = Math.max(...d), mn = Math.min(...d);
  const pts = d.map((v, i) => `${(i / (d.length - 1)) * W},${H - ((v - mn) / (mx - mn + 1)) * H}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/* ── Feature 1 visual: Live P&L Dashboard ── */
function PLVisual({ vis }: { vis: boolean }) {
  const rows = [
    { label: "Revenue",   val: "$248,000", change: "+18.2%", up: true,  color: "#10b981" },
    { label: "COGS",      val: "$91,000",  change: "+4.1%",  up: false, color: "#f87171" },
    { label: "Gross Profit", val: "$157,000", change: "+28%", up: true, color: "#a5b4fc" },
    { label: "Expenses",  val: "$42,000",  change: "-3.2%",  up: true,  color: "#34d399" },
    { label: "Net Profit",val: "$115,000", change: "+31%",   up: true,  color: "#818cf8" },
  ];
  return (
    <div style={{
      borderRadius: 20, overflow: "hidden",
      background: "rgba(10,12,30,.9)", border: "1px solid rgba(255,255,255,.09)",
      boxShadow: "0 32px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(129,140,248,.12)",
    }}>
      {/* Window bar */}
      <div style={{ padding:"11px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", background:"rgba(255,255,255,.03)", display:"flex", alignItems:"center", gap:8 }}>
        {["#f87171","#fbbf24","#34d399"].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:c,opacity:.7}}/>)}
        <span style={{flex:1,textAlign:"center",fontSize:10,color:"rgba(255,255,255,.25)",letterSpacing:".04em"}}>P&L Statement · Live</span>
        <span style={{fontSize:10,color:"#34d399",fontWeight:600}}>● Live</span>
      </div>
      <div style={{ padding: "18px 18px 20px" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", fontWeight: 600, letterSpacing: ".07em", marginBottom: 12 }}>PERIOD: JAN–MAR 2025</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r, i) => (
            <div key={r.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", borderRadius: 10,
              background: i === rows.length - 1 ? "rgba(129,140,248,.1)" : "rgba(255,255,255,.03)",
              border: `1px solid ${i === rows.length - 1 ? "rgba(129,140,248,.2)" : "rgba(255,255,255,.06)"}`,
              opacity: vis ? 1 : 0,
              transform: vis ? "translateX(0)" : "translateX(16px)",
              transition: `all .4s ease ${i * 80}ms`,
            }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)", fontWeight: 500 }}>{r.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Spark d={[40,55,48,70,62,58,75,80,72,90,85,100].slice(i*2, i*2+7)} color={r.color} />
                <span style={{ fontSize: 13, fontWeight: 800, color: r.color, fontFamily:"'Lora',serif", letterSpacing:"-.3px" }}>{r.val}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: r.up ? "#34d399" : "#f87171", minWidth: 40, textAlign:"right" }}>{r.change}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Feature 2 visual: Invoice tracker ── */
function InvoiceVisual({ vis }: { vis: boolean }) {
  const invoices = [
    { id:"INV-1042", client:"Alpha Trading Co.", amount:"$12,400", status:"Paid",    color:"#34d399" },
    { id:"INV-1041", client:"Beta Distributors", amount:"$8,750",  status:"Pending", color:"#fbbf24" },
    { id:"INV-1040", client:"Gamma Retail Ltd.", amount:"$5,200",  status:"Paid",    color:"#34d399" },
    { id:"INV-1039", client:"Delta Supplies",    amount:"$3,900",  status:"Overdue", color:"#f87171" },
  ];
  return (
    <div style={{
      borderRadius: 20, overflow: "hidden",
      background: "rgba(10,12,30,.9)", border: "1px solid rgba(255,255,255,.09)",
      boxShadow: "0 32px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(52,211,153,.1)",
    }}>
      <div style={{ padding:"11px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", background:"rgba(255,255,255,.03)", display:"flex", alignItems:"center", gap:8 }}>
        {["#f87171","#fbbf24","#34d399"].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:c,opacity:.7}}/>)}
        <span style={{flex:1,textAlign:"center",fontSize:10,color:"rgba(255,255,255,.25)"}}>Invoices · All clients</span>
      </div>
      {/* Summary pills */}
      <div style={{ padding:"14px 16px 10px", display:"flex", gap:8 }}>
        {[{label:"Total",val:"$30,250",c:"#818cf8"},{label:"Paid",val:"$17,600",c:"#34d399"},{label:"Pending",val:"$8,750",c:"#fbbf24"},{label:"Overdue",val:"$3,900",c:"#f87171"}].map(s=>(
          <div key={s.label} style={{flex:1,borderRadius:10,padding:"8px 6px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",textAlign:"center"}}>
            <div style={{fontSize:11,fontWeight:800,color:s.c}}>{s.val}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,.3)",marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "4px 16px 18px", display:"flex", flexDirection:"column", gap:6 }}>
        {invoices.map((inv, i) => (
          <div key={inv.id} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"10px 12px", borderRadius:10,
            background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)",
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(10px)",
            transition:`all .4s ease ${i*80}ms`,
          }}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.8)"}}>{inv.id} · {inv.client}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:1}}>{inv.amount}</div>
            </div>
            <div style={{padding:"3px 10px",borderRadius:20,background:`${inv.color}18`,border:`1px solid ${inv.color}35`,fontSize:10,fontWeight:700,color:inv.color}}>
              {inv.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Feature 3 visual: Inventory ── */
function InventoryVisual({ vis }: { vis: boolean }) {
  const items = [
    { name:"Samsung 4K TV 55\"",   sku:"TV-001", stock:42,  reorder:20, val:"$31,500", ok:true },
    { name:"iPhone 15 Pro 256GB",  sku:"PH-102", stock:8,   reorder:15, val:"$9,600",  ok:false },
    { name:"Sony WH-1000XM5",      sku:"HP-055", stock:95,  reorder:30, val:"$23,750", ok:true },
    { name:"Dell XPS 15 Laptop",   sku:"LT-033", stock:3,   reorder:10, val:"$7,200",  ok:false },
  ];
  return (
    <div style={{
      borderRadius: 20, overflow:"hidden",
      background:"rgba(10,12,30,.9)", border:"1px solid rgba(255,255,255,.09)",
      boxShadow:"0 32px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(251,191,36,.1)",
    }}>
      <div style={{padding:"11px 16px",borderBottom:"1px solid rgba(255,255,255,.06)",background:"rgba(255,255,255,.03)",display:"flex",alignItems:"center",gap:8}}>
        {["#f87171","#fbbf24","#34d399"].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:c,opacity:.7}}/>)}
        <span style={{flex:1,textAlign:"center",fontSize:10,color:"rgba(255,255,255,.25)"}}>Inventory · Main Warehouse</span>
        <span style={{fontSize:10,color:"#f87171",fontWeight:600}}>⚠ 2 low stock</span>
      </div>
      <div style={{padding:"14px 16px 18px",display:"flex",flexDirection:"column",gap:6}}>
        {items.map((item,i)=>(
          <div key={item.sku} style={{
            padding:"11px 12px", borderRadius:11,
            background: item.ok ? "rgba(255,255,255,.03)" : "rgba(248,113,113,.06)",
            border:`1px solid ${item.ok ? "rgba(255,255,255,.06)" : "rgba(248,113,113,.18)"}`,
            opacity: vis ? 1 : 0,
            transform: vis ? "translateX(0)" : "translateX(16px)",
            transition:`all .4s ease ${i*80}ms`,
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.85)"}}>{item.name}</div>
                <div style={{fontSize:9.5,color:"rgba(255,255,255,.3)",marginTop:1}}>SKU: {item.sku}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#a5b4fc",fontFamily:"'Lora',serif"}}>{item.val}</div>
                {!item.ok && <div style={{fontSize:9,color:"#f87171",fontWeight:700,marginTop:1}}>LOW STOCK</div>}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,height:4,borderRadius:2,background:"rgba(255,255,255,.08)",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min((item.stock/100)*100,100)}%`,borderRadius:2,background:item.ok?"#34d399":"#f87171",transition:"width .6s ease"}}/>
              </div>
              <span style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600,minWidth:50}}>{item.stock} units</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Feature 4 visual: Multi-branch ── */
function BranchVisual({ vis }: { vis: boolean }) {
  const branches = [
    { name:"Head Office — Karachi",  revenue:"$82k", profit:"$24k", status:"Active" },
    { name:"Branch A — Lahore",      revenue:"$54k", profit:"$15k", status:"Active" },
    { name:"Branch B — Islamabad",   revenue:"$38k", profit:"$9k",  status:"Active" },
    { name:"Branch C — Dubai",       revenue:"$96k", profit:"$31k", status:"Active" },
  ];
  return (
    <div style={{
      borderRadius:20,overflow:"hidden",
      background:"rgba(10,12,30,.9)",border:"1px solid rgba(255,255,255,.09)",
      boxShadow:"0 32px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(6,182,212,.1)",
    }}>
      <div style={{padding:"11px 16px",borderBottom:"1px solid rgba(255,255,255,.06)",background:"rgba(255,255,255,.03)",display:"flex",alignItems:"center",gap:8}}>
        {["#f87171","#fbbf24","#34d399"].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:c,opacity:.7}}/>)}
        <span style={{flex:1,textAlign:"center",fontSize:10,color:"rgba(255,255,255,.25)"}}>Branch Overview · All Companies</span>
      </div>
      {/* Consolidated total */}
      <div style={{padding:"14px 16px 10px",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
        <div style={{fontSize:10,color:"rgba(255,255,255,.3)",fontWeight:600,letterSpacing:".07em",marginBottom:6}}>CONSOLIDATED REVENUE</div>
        <div style={{display:"flex",alignItems:"baseline",gap:12}}>
          <div style={{fontSize:28,fontWeight:800,color:"white",fontFamily:"'Lora',serif",letterSpacing:"-.8px"}}>$270k</div>
          <div style={{fontSize:12,color:"#34d399",fontWeight:700}}>↑ +22% vs last quarter</div>
        </div>
      </div>
      <div style={{padding:"10px 16px 18px",display:"flex",flexDirection:"column",gap:6}}>
        {branches.map((b,i)=>(
          <div key={b.name} style={{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"10px 12px",borderRadius:10,
            background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",
            opacity:vis?1:0,
            transform:vis?"translateX(0)":"translateX(16px)",
            transition:`all .4s ease ${i*80}ms`,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:"#34d399",flexShrink:0}}/>
              <span style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.75)"}}>{b.name}</span>
            </div>
            <div style={{display:"flex",gap:16}}>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#a5b4fc"}}>{b.revenue}</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>Revenue</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#34d399"}}>{b.profit}</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>Profit</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Feature 5 visual: AI Intelligence ── */
function AIVisual({ vis }: { vis: boolean }) {
  const items = [
    { icon: "📈", label: "Revenue up 18% vs last month", color: "#10b981", badge: "Insight", badgeColor: "#10b981" },
    { icon: "🚨", label: "3 overdue invoices — $14,200 at risk", color: "#f87171", badge: "Alert", badgeColor: "#f87171" },
    { icon: "🌐", label: "Add solar panels — high demand in Q2", color: "#a78bfa", badge: "Market", badgeColor: "#a78bfa" },
    { icon: "🎯", label: "Collect overdue payments today", color: "#fbbf24", badge: "Action", badgeColor: "#fbbf24" },
    { icon: "📊", label: "30-day forecast: $285k revenue projected", color: "#38bdf8", badge: "Forecast", badgeColor: "#38bdf8" },
  ];
  return (
    <div style={{
      borderRadius: 20, overflow: "hidden",
      background: "rgba(10,12,30,.9)", border: "1px solid rgba(255,255,255,.09)",
      boxShadow: "0 32px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(167,139,250,.12)",
    }}>
      <div style={{ padding: "11px 16px", borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)", display: "flex", alignItems: "center", gap: 8 }}>
        {["#f87171","#fbbf24","#34d399"].map((c,i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: .7 }} />)}
        <span style={{ flex: 1, textAlign: "center", fontSize: 10, color: "rgba(255,255,255,.25)", letterSpacing: ".04em" }}>Finova AI — Intelligence Center</span>
        <span style={{ fontSize: 10, color: "#a78bfa", fontWeight: 600 }}>● AI Active</span>
      </div>
      <div style={{ padding: "16px 18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(167,139,250,.15)", border: "1px solid rgba(167,139,250,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>AI Financial Assistant</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)" }}>Analyzing your business data…</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#a78bfa" }}>87</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)" }}>Health Score</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 10,
              background: "rgba(255,255,255,.03)", border: `1px solid ${item.badgeColor}18`,
              opacity: vis ? 1 : 0,
              transform: vis ? "translateX(0)" : "translateX(16px)",
              transition: `all .4s ease ${i * 80}ms`,
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.7)", flex: 1, lineHeight: 1.4 }}>{item.label}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0,
                background: `${item.badgeColor}18`, color: item.badgeColor, border: `1px solid ${item.badgeColor}30`,
              }}>{item.badge}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Feature row ── */
const FEATURES = [
  {
    tag: "Finance", color: "#818cf8",
    title: "Real-Time P&L — Always Live",
    desc: "Stop waiting for month-end. Finova's accounting engine updates your P&L, balance sheet, and trial balance the moment any transaction is recorded. See exactly where your business stands — right now.",
    bullets: ["Instant P&L by date range or branch", "Auto-posted journal entries", "Tax-ready reports in one click"],
    link: "/features/accounting",
    Visual: PLVisual,
    flip: false,
  },
  {
    tag: "Trade Flow", color: "#34d399",
    title: "Quotation → Order → Delivery → Invoice",
    desc: "Run your entire trade cycle in one place. Create a quotation, convert it to a sales order, issue the delivery challan, and generate the invoice — all linked, all tracked, all posted to your accounts automatically.",
    bullets: ["Quotation → Sales Order → Invoice conversion", "Customer statements & payment follow-up", "Credit limits & overdue alerts per customer"],
    link: "/features/invoicing",
    Visual: InvoiceVisual,
    flip: true,
  },
  {
    tag: "Purchasing", color: "#fbbf24",
    title: "Landed Cost & Multi-Warehouse Stock",
    desc: "Import goods from anywhere and get the true cost — Finova allocates freight, customs, and handling charges across your items automatically. Track stock across multiple warehouses in real time with full lot and batch traceability.",
    bullets: ["Landed cost allocation (freight, customs, handling)", "Multi-warehouse with real-time stock levels", "Purchase Order → GRN → Invoice 3-way match"],
    link: "/features/inventory",
    Visual: InventoryVisual,
    flip: false,
  },
  {
    tag: "Scale", color: "#06b6d4",
    title: "One Login. Every Branch. Every Company.",
    desc: "Whether you have 2 branches or 20 companies, Finova keeps them all under one roof. Switch between entities instantly, run consolidated reports, and manage user access per company — without any confusion.",
    bullets: ["Unlimited branches & companies", "Consolidated financial reports", "Per-company role & access control"],
    link: "/features/multi-branch",
    Visual: BranchVisual,
    flip: true,
  },
  {
    tag: "AI Intelligence", color: "#a78bfa",
    title: "Your Business Has a Brain Now.",
    desc: "Finova AI reads your real financial data every day and tells you exactly what to do. Spot overdue invoices, predict next month's revenue, discover what new products to stock, and get a personalized growth plan — all without leaving your dashboard.",
    bullets: ["Ask AI anything about your finances", "Smart alerts: overdue, cash risk, expense spikes", "Market Intelligence — what products to add next", "30/60/90-day revenue & cashflow forecast", "AI Business Advisor with step-by-step growth plan"],
    link: "/demo",
    Visual: AIVisual,
    flip: false,
  },
];

function FeatureRow({ f, i }: { f: typeof FEATURES[0]; i: number }) {
  const [ref, vis] = useInView();
  const { Visual } = f;

  const text = (
    <div style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(24px)",
      transition: "all .65s cubic-bezier(.22,1,.36,1)",
    }}>
      <div style={{
        display:"inline-flex", alignItems:"center", gap:7,
        padding:"5px 13px", borderRadius:100, marginBottom:18,
        background:`${f.color}14`, border:`1.5px solid ${f.color}30`,
        fontSize:11, fontWeight:700, color:f.color, letterSpacing:".08em",
      }}>
        {f.tag}
      </div>
      <h3 style={{
        fontFamily:"'Lora',serif",
        fontSize:"clamp(26px,3vw,38px)",
        fontWeight:700, color:"white",
        letterSpacing:"-1px", lineHeight:1.15, marginBottom:16,
      }}>{f.title}</h3>
      <p style={{fontSize:15.5,color:"rgba(255,255,255,.45)",lineHeight:1.85,marginBottom:28,maxWidth:440}}>
        {f.desc}
      </p>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:32}}>
        {f.bullets.map((b,bi)=>(
          <div key={bi} style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:18,height:18,borderRadius:6,background:`${f.color}18`,border:`1px solid ${f.color}35`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                <polyline points="2 6 5 9 10 3" stroke={f.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{fontSize:14,color:"rgba(255,255,255,.65)",fontWeight:500}}>{b}</span>
          </div>
        ))}
      </div>
      <Link href={f.link} style={{
        display:"inline-flex", alignItems:"center", gap:8,
        fontSize:14, fontWeight:700, color:f.color,
        textDecoration:"none",
        borderBottom:`1.5px solid ${f.color}40`,
        paddingBottom:2, transition:"all .2s",
      }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=f.color; e.currentTarget.style.gap="12px";}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=`${f.color}40`; e.currentTarget.style.gap="8px";}}
      >
        Explore this feature
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </Link>
    </div>
  );

  const visual = (
    <div style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(24px)",
      transition: "all .65s cubic-bezier(.22,1,.36,1) .15s",
    }}>
      <Visual vis={vis} />
    </div>
  );

  return (
    <div ref={ref} className="feat-grid" style={{
      display:"grid", gridTemplateColumns:"1fr 1fr",
      gap:64, alignItems:"center",
      paddingBottom: i < FEATURES.length - 1 ? 100 : 0,
    }}>
      {f.flip ? <>{visual}{text}</> : <>{text}{visual}</>}
    </div>
  );
}

export default function FeaturesSection() {
  const [hRef, hVis] = useInView();

  return (
    <section style={{
      background:"linear-gradient(180deg,#070a1e 0%,#080c22 50%,#0a0d28 100%)",
      padding:"100px 24px",
      fontFamily:"'Outfit',sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orb{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-15px)}}
        @media(max-width:860px){
          .feat-grid{grid-template-columns:1fr !important; gap:36px !important;}
          .feat-flip{flex-direction:column-reverse !important;}
        }
      `}</style>

      {/* BG */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",backgroundSize:"52px 52px"}}/>
        <div style={{position:"absolute",width:480,height:480,borderRadius:"50%",top:-80,right:-60,background:"radial-gradient(circle,rgba(99,102,241,.1),transparent 65%)",animation:"orb 16s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:360,height:360,borderRadius:"50%",bottom:-60,left:-40,background:"radial-gradient(circle,rgba(124,58,237,.07),transparent 65%)",animation:"orb 20s ease-in-out infinite reverse"}}/>
        <div style={{position:"absolute",top:0,left:"10%",right:"10%",height:1,background:"linear-gradient(90deg,transparent,rgba(99,102,241,.3),transparent)"}}/>
        <div style={{position:"absolute",bottom:0,left:"10%",right:"10%",height:1,background:"linear-gradient(90deg,transparent,rgba(99,102,241,.15),transparent)"}}/>
      </div>

      <div style={{maxWidth:1160,margin:"0 auto",position:"relative"}}>

        {/* Header */}
        <div ref={hRef} style={{
          textAlign:"center",marginBottom:88,
          opacity:hVis?1:0,transform:hVis?"translateY(0)":"translateY(24px)",
          transition:"all .6s cubic-bezier(.22,1,.36,1)",
        }}>
          <div style={{
            display:"inline-flex",alignItems:"center",gap:8,
            padding:"6px 16px",borderRadius:100,marginBottom:20,
            background:"rgba(99,102,241,.1)",border:"1.5px solid rgba(99,102,241,.22)",
          }}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#6366f1",display:"inline-block"}}/>
            <span style={{fontSize:11,fontWeight:700,color:"#a5b4fc",letterSpacing:".08em"}}>BUILT FOR TRADE</span>
          </div>
          <h2 style={{
            fontFamily:"'Lora',serif",
            fontSize:"clamp(30px,4vw,50px)",
            fontWeight:700,color:"white",
            letterSpacing:"-1.5px",lineHeight:1.1,marginBottom:16,
          }}>
            Everything a trading business{" "}
            <span style={{background:"linear-gradient(135deg,#818cf8,#6366f1,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              actually needs
            </span>
          </h2>
          <p style={{fontSize:16,color:"rgba(255,255,255,.4)",lineHeight:1.8,maxWidth:560,margin:"0 auto"}}>
            Designed for importers, wholesalers, and distributors — not a generic accounting tool retrofitted for trade. Every workflow maps to how you actually operate.
          </p>
        </div>

        {/* Feature rows */}
        <div style={{display:"flex",flexDirection:"column"}}>
          {FEATURES.map((f,i)=>(
            <FeatureRow key={i} f={f} i={i}/>
          ))}
        </div>

      </div>
    </section>
  );
}
