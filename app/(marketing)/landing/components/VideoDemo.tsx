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

export default function VideoDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  const [activeTab, setActiveTab] = useState("invoice");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const active = TABS.find(t => t.id === activeTab)!;

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

      <div ref={ref} style={{ maxWidth:1160, margin:"0 auto", position:"relative" }}>

        {/* Header */}
        <div style={{
          textAlign:"center", marginBottom:56,
          opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)",
          transition:"all .6s cubic-bezier(.22,1,.36,1)",
        }}>
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
        <div className="demo-layout" style={{
          display:"flex", gap:28, alignItems:"flex-start",
          opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(32px)",
          transition:"all .7s cubic-bezier(.22,1,.36,1) .15s",
        }}>

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
            <div style={{
              borderRadius:20, overflow:"hidden",
              border:"1.5px solid rgba(255,255,255,.07)",
              background:"rgba(255,255,255,.03)",
              position:"relative", aspectRatio:"16/9",
            }}>
              {/* Mock UI preview */}
              {!playing ? (
                <div style={{
                  position:"absolute", inset:0,
                  background:`linear-gradient(135deg,rgba(8,12,34,.98),rgba(10,13,40,.95))`,
                  display:"flex", flexDirection:"column",
                }}>
                  {/* Mock app header */}
                  <div style={{ padding:"12px 20px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"white" }}>F</div>
                    <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)" }}>FinovaOS</span>
                    <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                      {["rgba(255,255,255,.08)","rgba(255,255,255,.05)","rgba(255,255,255,.04)"].map((bg,i) => (
                        <div key={i} style={{ height:6, width:[48,36,28][i], borderRadius:3, background:bg }}/>
                      ))}
                    </div>
                  </div>

                  {/* Mock content based on active tab */}
                  <div style={{ flex:1, padding:"20px", display:"flex", flexDirection:"column", gap:14, overflow:"hidden" }}>
                    {activeTab === "dashboard" && (
                      <>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                          {[
                            { l:"Revenue", v:"Rs. 24.8L", c:"#34d399" },
                            { l:"Expenses", v:"Rs. 11.2L", c:"#f97316" },
                            { l:"Net Profit", v:"Rs. 13.6L", c:"#818cf8" },
                          ].map(kpi => (
                            <div key={kpi.l} style={{ padding:"12px 14px", borderRadius:12, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.06)" }}>
                              <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginBottom:6 }}>{kpi.l}</div>
                              <div style={{ fontSize:15, fontWeight:800, color:kpi.c }}>{kpi.v}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ flex:1, borderRadius:12, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.05)", padding:14, display:"flex", flexDirection:"column", gap:8 }}>
                          <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", fontWeight:600 }}>Monthly Revenue</div>
                          <div style={{ flex:1, display:"flex", alignItems:"flex-end", gap:6 }}>
                            {[40,55,48,70,62,85,78,90,72,95,88,100].map((h,i) => (
                              <div key={i} style={{ flex:1, height:`${h}%`, borderRadius:"4px 4px 0 0", background:`linear-gradient(180deg,#6366f1,#4f46e588)` }}/>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {activeTab === "invoice" && (
                      <>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)" }}>New Sales Invoice</div>
                          <div style={{ padding:"5px 12px", borderRadius:20, background:"rgba(99,102,241,.2)", border:"1px solid rgba(99,102,241,.3)", fontSize:11, fontWeight:700, color:"#818cf8" }}>DRAFT</div>
                        </div>
                        {[["Customer","Al-Raza Traders"],["Invoice #","INV-2026-0342"],["Date","15-06-2026"],["Due Date","30-06-2026"]].map(([l,v]) => (
                          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                            <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{l}</span>
                            <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.7)" }}>{v}</span>
                          </div>
                        ))}
                        <div style={{ marginTop:4, padding:"12px 14px", borderRadius:12, background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.18)" }}>
                          <div style={{ display:"flex", justifyContent:"space-between" }}>
                            <span style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>Total Amount</span>
                            <span style={{ fontSize:16, fontWeight:900, color:"#818cf8" }}>Rs. 1,24,500</span>
                          </div>
                        </div>
                      </>
                    )}
                    {activeTab === "payroll" && (
                      <>
                        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", marginBottom:4 }}>June 2026 Payroll</div>
                        {["Ahmed Raza — Rs. 85,000","Sara Khan — Rs. 65,000","Hassan Ali — Rs. 72,000","Fatima Malik — Rs. 58,000"].map((emp,i) => (
                          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${["#818cf8","#34d399","#fbbf24","#f87171"][i]},${["#6366f1","#10b981","#d97706","#dc2626"][i]})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"white" }}>
                                {emp[0]}
                              </div>
                              <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.65)" }}>{emp.split(" — ")[0]}</span>
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, color:"#34d399" }}>{emp.split(" — ")[1]}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {activeTab === "inventory" && (
                      <>
                        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", marginBottom:4 }}>Stock Overview</div>
                        {[
                          { name:"Paracetamol 500mg", stock:1240, alert:false, exp:"12-2026" },
                          { name:"Amoxicillin 250mg", stock:48, alert:true, exp:"03-2026" },
                          { name:"Vitamin C 1000mg", stock:560, alert:false, exp:"08-2027" },
                          { name:"Cetirizine 10mg", stock:22, alert:true, exp:"01-2026" },
                        ].map((item,i) => (
                          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderRadius:10, background: item.alert ? "rgba(239,68,68,.06)" : "rgba(255,255,255,.03)", border:`1px solid ${item.alert ? "rgba(239,68,68,.2)" : "rgba(255,255,255,.05)"}` }}>
                            <div>
                              <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.7)" }}>{item.name}</div>
                              <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:2 }}>Exp: {item.exp}</div>
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:13, fontWeight:700, color: item.alert ? "#f87171" : "#34d399" }}>{item.stock} units</div>
                              {item.alert && <div style={{ fontSize:9, fontWeight:700, color:"#ef4444" }}>⚠ LOW STOCK</div>}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(8,12,34,.98)" }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:24, fontWeight:700, color:"rgba(255,255,255,.5)", marginBottom:8 }}>Video coming soon</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.3)" }}>Interactive preview above</div>
                  </div>
                </div>
              )}

              {/* Play button overlay */}
              {!playing && (
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                  <div style={{
                    width:72, height:72, borderRadius:"50%",
                    background:"rgba(99,102,241,.9)", backdropFilter:"blur(4px)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:"0 8px 32px rgba(99,102,241,.6), 0 0 0 12px rgba(99,102,241,.15)",
                    pointerEvents:"auto", cursor:"pointer",
                  }} onClick={() => setPlaying(true)}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="white" style={{ marginLeft:3 }}>
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>
                </div>
              )}

              {/* Bottom feature bar */}
              <div style={{
                position:"absolute", bottom:0, left:0, right:0,
                padding:"12px 20px",
                background:"linear-gradient(0deg,rgba(8,12,34,.98),transparent)",
                display:"flex", gap:12, flexWrap:"wrap",
              }}>
                {FEATURES_BY_TAB[activeTab].map((f,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:active.color }}/>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,.45)", fontWeight:600 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA below video */}
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
