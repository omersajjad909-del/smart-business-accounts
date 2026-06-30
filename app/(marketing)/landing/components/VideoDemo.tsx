"use client";
import { useEffect, useRef, useState } from "react";

const TABS = [
  { id: "invoice",   label: "Sales Invoice",    icon: "📄", color: "#818cf8", desc: "Create & send professional invoices in 30 seconds" },
  { id: "dashboard", label: "Dashboard",         icon: "📊", color: "#34d399", desc: "Real-time P&L, cash flow & KPIs in one view" },
  { id: "payroll",   label: "Payroll",           icon: "👥", color: "#fbbf24", desc: "Process salary for entire team with one click" },
  { id: "inventory", label: "Inventory",         icon: "📦", color: "#f97316", desc: "Track stock, batches & expiry across warehouses" },
];

const FEATURES_BY_TAB: Record<string, string[]> = {
  invoice:   ["Auto-fill customer details", "Multi-currency support", "PDF & WhatsApp share", "Payment tracking"],
  dashboard: ["Live revenue tracking", "Expense breakdown", "Cash flow forecast", "AI anomaly alerts"],
  payroll:   ["Auto salary calculation", "Tax & EOBI deduction", "Payslip generation", "Bank transfer batch"],
  inventory: ["Low stock alerts", "Batch & expiry tracking", "Multi-warehouse view", "DRAP compliance"],
};

// Max animation steps per tab
const MAX_STEPS: Record<string, number> = {
  invoice: 6, dashboard: 5, payroll: 5, inventory: 5,
};

function useCountUp(target: number, active: boolean, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    const steps = 40;
    const inc = target / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.round(cur));
    }, duration / steps);
    return () => clearInterval(t);
  }, [active, target, duration]);
  return val;
}

/* ── Animated content per tab ── */

function InvoiceDemo({ step }: { step: number }) {
  const rows = [
    ["Customer",   "Al-Raza Traders"],
    ["Invoice #",  "INV-2026-0342"],
    ["Date",       "15-06-2026"],
    ["Due Date",   "30-06-2026"],
  ];
  const items = [
    { name: "Samsung 50\" 4K TV × 2",     amount: "Rs. 84,000" },
    { name: "LG Refrigerator 14 Cu Ft",   amount: "Rs. 32,500" },
    { name: "Installation & Delivery",    amount: "Rs. 8,000" },
  ];
  const sent = step >= 6;

  return (
    <div style={{ flex:1, padding:"16px 20px", display:"flex", flexDirection:"column", gap:10, overflow:"hidden" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.8)" }}>New Sales Invoice</div>
        <div style={{
          padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700,
          background: sent ? "rgba(52,211,153,.2)" : "rgba(99,102,241,.2)",
          border: `1px solid ${sent ? "rgba(52,211,153,.4)" : "rgba(99,102,241,.35)"}`,
          color: sent ? "#34d399" : "#818cf8",
          transition:"all .4s",
        }}>
          {sent ? "✓ SENT" : "DRAFT"}
        </div>
      </div>

      {/* Fields appearing */}
      {rows.map(([l,v], i) => (
        <div key={l} style={{
          display:"flex", justifyContent:"space-between", padding:"7px 0",
          borderBottom:"1px solid rgba(255,255,255,.04)",
          opacity: step > i ? 1 : 0,
          transform: step > i ? "translateY(0)" : "translateY(6px)",
          transition:"all .35s ease",
        }}>
          <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{l}</span>
          <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.75)" }}>{v}</span>
        </div>
      ))}

      {/* Items table */}
      {step >= 4 && items.map((item, i) => (
        <div key={i} style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"8px 12px", borderRadius:8,
          background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)",
          opacity: 1, animation:"slideIn .3s ease both",
          animationDelay:`${i * 0.12}s`,
        }}>
          <span style={{ fontSize:11, color:"rgba(255,255,255,.6)" }}>{item.name}</span>
          <span style={{ fontSize:12, fontWeight:700, color:"#818cf8" }}>{item.amount}</span>
        </div>
      ))}

      {/* Total */}
      {step >= 5 && (
        <div style={{
          padding:"12px 14px", borderRadius:12,
          background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.25)",
          animation:"slideIn .4s ease both",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>Total Amount</span>
            <span style={{ fontSize:18, fontWeight:900, color:"#818cf8" }}>Rs. 1,24,500</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardDemo({ step }: { step: number }) {
  const rev  = useCountUp(2480000, step >= 2);
  const exp  = useCountUp(1120000, step >= 2);
  const prof = useCountUp(1360000, step >= 2);

  const kpis = [
    { l:"Revenue",    v: `Rs. ${(rev/100000).toFixed(1)}L`,   c:"#34d399" },
    { l:"Expenses",   v: `Rs. ${(exp/100000).toFixed(1)}L`,   c:"#f97316" },
    { l:"Net Profit", v: `Rs. ${(prof/100000).toFixed(1)}L`,  c:"#818cf8" },
  ];

  const bars = [40,55,48,70,62,85,78,90,72,95,88,100];

  return (
    <div style={{ flex:1, padding:"16px 20px", display:"flex", flexDirection:"column", gap:12, overflow:"hidden" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
        {kpis.map((kpi,i) => (
          <div key={kpi.l} style={{
            padding:"12px 14px", borderRadius:12,
            background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.06)",
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? "translateY(0)" : "translateY(10px)",
            transition:`all .4s ease ${i*0.1}s`,
          }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginBottom:6 }}>{kpi.l}</div>
            <div style={{ fontSize:15, fontWeight:800, color:kpi.c }}>{kpi.v}</div>
          </div>
        ))}
      </div>

      <div style={{
        flex:1, borderRadius:12, background:"rgba(255,255,255,.02)",
        border:"1px solid rgba(255,255,255,.05)", padding:"12px 14px",
        display:"flex", flexDirection:"column", gap:8,
        opacity: step >= 2 ? 1 : 0, transition:"opacity .5s ease",
      }}>
        <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", fontWeight:600 }}>Monthly Revenue</div>
        <div style={{ flex:1, display:"flex", alignItems:"flex-end", gap:5 }}>
          {bars.map((h,i) => (
            <div key={i} style={{
              flex:1, borderRadius:"4px 4px 0 0",
              background:`linear-gradient(180deg,#6366f1,#4f46e588)`,
              height: step >= 2 ? `${h}%` : "0%",
              transition:`height .6s ease ${i * 0.05}s`,
            }}/>
          ))}
        </div>
      </div>

      {step >= 4 && (
        <div style={{
          padding:"10px 14px", borderRadius:10,
          background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.25)",
          display:"flex", alignItems:"center", gap:10,
          animation:"slideIn .35s ease both",
        }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#34d399", animation:"blink 1.5s ease infinite" }}/>
          <span style={{ fontSize:12, color:"rgba(255,255,255,.6)" }}>New payment received — <strong style={{ color:"#34d399" }}>Rs. 45,000</strong> from City Pharma</span>
        </div>
      )}
    </div>
  );
}

function PayrollDemo({ step }: { step: number }) {
  const employees = [
    { name:"Ahmed Raza",   role:"Manager",    sal:"Rs. 85,000", c:"#818cf8", g:"#6366f1" },
    { name:"Sara Khan",    role:"Accountant", sal:"Rs. 65,000", c:"#34d399", g:"#10b981" },
    { name:"Hassan Ali",   role:"Sales",      sal:"Rs. 72,000", c:"#fbbf24", g:"#d97706" },
    { name:"Fatima Malik", role:"HR",         sal:"Rs. 58,000", c:"#f87171", g:"#dc2626" },
  ];

  return (
    <div style={{ flex:1, padding:"16px 20px", display:"flex", flexDirection:"column", gap:10, overflow:"hidden" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.8)" }}>June 2026 Payroll</div>
        {step >= 5 && (
          <div style={{
            padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700,
            background:"rgba(52,211,153,.15)", border:"1px solid rgba(52,211,153,.3)",
            color:"#34d399", animation:"slideIn .3s ease both",
          }}>✓ All Processed</div>
        )}
      </div>

      {employees.map((emp, i) => {
        const paid = step >= i + 2;
        return (
          <div key={i} style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"10px 14px", borderRadius:10,
            background: paid ? "rgba(52,211,153,.05)" : "rgba(255,255,255,.03)",
            border:`1px solid ${paid ? "rgba(52,211,153,.18)" : "rgba(255,255,255,.05)"}`,
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? "translateX(0)" : "translateX(-12px)",
            transition:`all .4s ease ${i*0.08}s`,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${emp.c},${emp.g})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"white" }}>
                {emp.name[0]}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.75)" }}>{emp.name}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>{emp.role}</div>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:13, fontWeight:700, color: paid ? "#34d399" : "rgba(255,255,255,.5)" }}>{emp.sal}</div>
              {paid && <div style={{ fontSize:9, fontWeight:700, color:"#34d399", animation:"slideIn .2s ease both" }}>✓ PAID</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InventoryDemo({ step }: { step: number }) {
  const items = [
    { name:"Paracetamol 500mg",  stock:1240, alert:false, exp:"12-2026", color:"#34d399" },
    { name:"Amoxicillin 250mg",  stock:48,   alert:true,  exp:"03-2026", color:"#f87171" },
    { name:"Vitamin C 1000mg",   stock:560,  alert:false, exp:"08-2027", color:"#34d399" },
    { name:"Cetirizine 10mg",    stock:22,   alert:true,  exp:"01-2026", color:"#f87171" },
  ];

  return (
    <div style={{ flex:1, padding:"16px 20px", display:"flex", flexDirection:"column", gap:10, overflow:"hidden" }}>
      <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.8)", marginBottom:2 }}>Stock Overview</div>

      {items.map((item, i) => (
        <div key={i} style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"10px 14px", borderRadius:10,
          background: item.alert ? "rgba(239,68,68,.06)" : "rgba(255,255,255,.03)",
          border:`1px solid ${item.alert && step >= 3 ? "rgba(239,68,68,.35)" : item.alert ? "rgba(239,68,68,.15)" : "rgba(255,255,255,.05)"}`,
          opacity: step >= 1 ? 1 : 0,
          transform: step >= 1 ? "translateX(0)" : "translateX(12px)",
          transition:`all .4s ease ${i*0.1}s`,
          boxShadow: item.alert && step >= 3 ? "0 0 12px rgba(239,68,68,.15)" : "none",
        }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.75)" }}>{item.name}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:2 }}>Exp: {item.exp}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:13, fontWeight:700, color:item.color }}>{item.stock} units</div>
            {item.alert && step >= 2 && (
              <div style={{ fontSize:9, fontWeight:700, color:"#ef4444", animation:"blink 1.5s ease infinite" }}>⚠ LOW STOCK</div>
            )}
          </div>
        </div>
      ))}

      {step >= 4 && (
        <div style={{
          padding:"10px 14px", borderRadius:10,
          background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.3)",
          animation:"slideIn .35s ease both",
        }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#fbbf24", marginBottom:4 }}>🔔 Reorder Alert</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.5)" }}>2 items below reorder level — Amoxicillin & Cetirizine. <span style={{ color:"#fbbf24", fontWeight:600 }}>Create PO →</span></div>
        </div>
      )}
    </div>
  );
}

export default function VideoDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("invoice");
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const active = TABS.find(t => t.id === activeTab)!;

  // Drive animation steps
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!playing) { setStep(0); setDone(false); return; }

    setStep(0);
    setDone(false);
    const max = MAX_STEPS[activeTab] ?? 5;
    let cur = 0;

    intervalRef.current = setInterval(() => {
      cur++;
      setStep(cur);
      if (cur >= max) {
        clearInterval(intervalRef.current!);
        setDone(true);
      }
    }, 700);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, activeTab]);

  function replay() { setPlaying(false); setTimeout(() => setPlaying(true), 80); }

  return (
    <section style={{
      background: "linear-gradient(180deg,#080c22 0%,#0a0d28 100%)",
      padding: "100px 24px",
      fontFamily: "'Outfit',sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orb2{0%,100%{transform:translate(0,0)}50%{transform:translate(-18px,14px)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
        .demo-tab:hover{background:rgba(255,255,255,.07)!important;border-color:rgba(255,255,255,.12)!important;}
        .demo-tab-active{border-color:var(--tc)!important;background:rgba(255,255,255,.06)!important;}
        @media(max-width:768px){.demo-layout{flex-direction:column!important;}.demo-tabs{flex-direction:row!important;flex-wrap:wrap!important;}}
      `}</style>

      {/* Background decoration */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)", backgroundSize:"52px 52px" }}/>
        <div style={{ position:"absolute", width:600, height:600, borderRadius:"50%", bottom:-100, left:-100, background:"radial-gradient(circle,rgba(52,211,153,.07),transparent 65%)", animation:"orb2 16s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.25),transparent)" }}/>
        <div style={{ position:"absolute", bottom:0, left:"10%", right:"10%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.12),transparent)" }}/>
      </div>

      <div style={{ maxWidth:1160, margin:"0 auto", position:"relative" }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:100, marginBottom:20, background:"rgba(129,140,248,.1)", border:"1.5px solid rgba(129,140,248,.22)" }}>
            <span style={{ fontSize:14 }}>▶</span>
            <span style={{ fontSize:11, fontWeight:700, color:"#818cf8", letterSpacing:".08em" }}>PRODUCT DEMO</span>
          </div>
          <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(28px,4vw,48px)", fontWeight:700, color:"white", letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:16 }}>
            See FinovaOS in{" "}
            <span style={{ background:"linear-gradient(135deg,#818cf8,#6366f1)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              action
            </span>
          </h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.45)", maxWidth:520, margin:"0 auto" }}>
            Watch how 500+ businesses manage their entire accounting in minutes — not days.
          </p>
        </div>

        {/* Main layout */}
        <div className="demo-layout" style={{ display:"flex", gap:28, alignItems:"flex-start" }}>

          {/* Tab sidebar */}
          <div className="demo-tabs" style={{ display:"flex", flexDirection:"column", gap:10, flexShrink:0, width:220 }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`demo-tab${activeTab === tab.id ? " demo-tab-active" : ""}`}
                onClick={() => { setActiveTab(tab.id); setPlaying(false); }}
                style={{
                  "--tc": tab.color,
                  padding:"13px 16px", borderRadius:14, border:"1.5px solid rgba(255,255,255,.06)",
                  background: activeTab === tab.id ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.03)",
                  cursor:"pointer", textAlign:"left", fontFamily:"inherit", transition:"all .2s",
                } as React.CSSProperties}
              >
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
                  <span style={{ fontSize:18 }}>{tab.icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color: activeTab === tab.id ? tab.color : "rgba(255,255,255,.6)" }}>{tab.label}</span>
                </div>
                <p style={{ fontSize:11, color:"rgba(255,255,255,.3)", margin:0, lineHeight:1.5 }}>{tab.desc}</p>
              </button>
            ))}
          </div>

          {/* Video / Preview panel */}
          <div style={{ flex:1, minWidth:0 }}>
            <div ref={ref} style={{
              borderRadius:20, overflow:"hidden",
              border:"1.5px solid rgba(255,255,255,.07)",
              background:"rgba(255,255,255,.03)",
              position:"relative", aspectRatio:"16/9",
            }}>
              {/* App shell */}
              <div style={{
                position:"absolute", inset:0,
                background:`linear-gradient(135deg,rgba(8,12,34,.98),rgba(10,13,40,.95))`,
                display:"flex", flexDirection:"column",
              }}>
                {/* Mock app header */}
                <div style={{ padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                  <div style={{ width:26, height:26, borderRadius:8, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"white" }}>F</div>
                  <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.7)" }}>FinovaOS</span>
                  <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                    {["rgba(255,255,255,.08)","rgba(255,255,255,.05)","rgba(255,255,255,.04)"].map((bg,i) => (
                      <div key={i} style={{ height:5, width:[44,32,24][i], borderRadius:3, background:bg }}/>
                    ))}
                  </div>
                </div>

                {/* Animated content */}
                {activeTab === "invoice"   && <InvoiceDemo   step={step} />}
                {activeTab === "dashboard" && <DashboardDemo step={step} />}
                {activeTab === "payroll"   && <PayrollDemo   step={step} />}
                {activeTab === "inventory" && <InventoryDemo step={step} />}
              </div>

              {/* Play button overlay — only when not playing */}
              {!playing && (
                <div
                  onClick={() => setPlaying(true)}
                  style={{
                    position:"absolute", inset:0,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background:"rgba(8,12,34,.55)", backdropFilter:"blur(2px)",
                    cursor:"pointer",
                  }}
                >
                  <div style={{
                    width:76, height:76, borderRadius:"50%",
                    background:"rgba(99,102,241,.9)", backdropFilter:"blur(4px)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:"0 8px 32px rgba(99,102,241,.6), 0 0 0 14px rgba(99,102,241,.15)",
                    animation:"pulse 2s ease infinite",
                  }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="white" style={{ marginLeft:3 }}>
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>
                </div>
              )}

              {/* Replay button when done */}
              {playing && done && (
                <div style={{
                  position:"absolute", bottom:14, right:14,
                  display:"flex", gap:8, alignItems:"center",
                  animation:"slideIn .3s ease both",
                }}>
                  <button onClick={replay} style={{
                    padding:"7px 16px", borderRadius:10, border:"1.5px solid rgba(255,255,255,.15)",
                    background:"rgba(255,255,255,.07)", color:"rgba(255,255,255,.7)",
                    fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                    display:"flex", alignItems:"center", gap:6, transition:"all .2s",
                  }}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.12)"; e.currentTarget.style.color="white";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.07)"; e.currentTarget.style.color="rgba(255,255,255,.7)";}}
                  >
                    ↺ Replay
                  </button>
                </div>
              )}

              {/* Progress bar while playing */}
              {playing && !done && (
                <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:"rgba(255,255,255,.05)" }}>
                  <div style={{
                    height:"100%",
                    background:`linear-gradient(90deg,${active.color},${active.color}88)`,
                    width:`${(step / (MAX_STEPS[activeTab] ?? 5)) * 100}%`,
                    transition:"width .65s ease",
                    borderRadius:2,
                  }}/>
                </div>
              )}

              {/* Bottom feature bar */}
              <div style={{
                position:"absolute", bottom:0, left:0, right:0,
                padding:"10px 20px",
                background:"linear-gradient(0deg,rgba(8,12,34,.95),transparent)",
                display:"flex", gap:12, flexWrap:"wrap",
                pointerEvents:"none",
              }}>
                {FEATURES_BY_TAB[activeTab].map((f,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:active.color }}/>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,.45)", fontWeight:600 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA below */}
            <div style={{ display:"flex", gap:12, marginTop:20, flexWrap:"wrap" }}>
              <a href="/auth/register" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"13px 28px", borderRadius:12, fontSize:14, fontWeight:700,
                background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"white",
                textDecoration:"none", boxShadow:"0 6px 20px rgba(99,102,241,.45)",
                transition:"all .25s",
              }}
                onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 10px 28px rgba(99,102,241,.55)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(99,102,241,.45)"; }}
              >
                Get Started Free →
              </a>
              <a href="/contact" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"13px 28px", borderRadius:12, fontSize:14, fontWeight:700,
                border:"1.5px solid rgba(255,255,255,.12)", background:"rgba(255,255,255,.04)",
                color:"rgba(255,255,255,.7)", textDecoration:"none", transition:"all .25s",
              }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,.28)"; e.currentTarget.style.color="white"; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,.12)"; e.currentTarget.style.color="rgba(255,255,255,.7)"; }}
              >
                Book a Live Demo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
