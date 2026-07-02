"use client";
import { useEffect, useRef, useState } from "react";

/* ── TypeWriter hook ── */
function useTypeWriter(text: string, active: boolean, speed = 45) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) return;
    setShown(0);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setShown(i);
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [active, text, speed]);
  return text.slice(0, shown);
}

/* ── Count-up hook ── */
function useCountUp(target: number, active: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    const steps = 50;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setVal(Math.round((target * i) / steps));
      if (i >= steps) clearInterval(t);
    }, duration / steps);
    return () => clearInterval(t);
  }, [active, target, duration]);
  return val;
}

/* ── Cursor blink span ── */
function Cursor({ color = "#818cf8" }: { color?: string }) {
  return <span style={{ display:"inline-block", width:2, height:"1em", background:color, marginLeft:1, verticalAlign:"middle", animation:"blink .7s ease infinite" }}/>;
}

/* ── Badge ── */
function Badge({ text, color, bg, border }: { text:string; color:string; bg:string; border:string }) {
  return (
    <span style={{ padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700, color, background:bg, border:`1px solid ${border}` }}>
      {text}
    </span>
  );
}

/* ══════════════════════════════
   INVOICE ANIMATION  (13 steps)
══════════════════════════════ */
function InvoiceDemo({ step }: { step: number }) {
  const customer  = useTypeWriter("Al-Raza Traders", step === 2, 55);
  const item1Name = useTypeWriter("Samsung 50\" 4K TV", step === 5, 40);
  const item2Name = useTypeWriter("LG Refrigerator 14 Cu Ft", step === 7, 35);
  const item3Name = useTypeWriter("Installation & Delivery", step === 9, 38);

  const items = [
    { name: item1Name,            qty:"2", unit:"Rs. 42,000", total:"Rs. 84,000",  show: step >= 5 },
    { name: item2Name,            qty:"1", unit:"Rs. 32,500", total:"Rs. 32,500",  show: step >= 7 },
    { name: item3Name,            qty:"1", unit:"Rs. 8,000",  total:"Rs. 8,000",   show: step >= 9 },
  ];

  const subtotal = step >= 10 ? "Rs. 1,24,500" : "";
  const tax      = step >= 10 ? "Rs. 0 (Exempt)" : "";
  const total    = step >= 10 ? "Rs. 1,24,500" : "";
  const sent     = step >= 12;

  return (
    <div style={{ flex:1, padding:"14px 18px", display:"flex", flexDirection:"column", gap:0, overflow:"hidden" }}>
      {/* Top bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"white", marginBottom:2 }}>New Sales Invoice</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>Sales → Create Invoice</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {step >= 11 && (
            <Badge text="✓ SENT" color="#34d399" bg="rgba(52,211,153,.12)" border="rgba(52,211,153,.3)" />
          )}
          {step < 11 && (
            <Badge text="DRAFT" color="#818cf8" bg="rgba(99,102,241,.12)" border="rgba(99,102,241,.25)" />
          )}
        </div>
      </div>

      {/* Customer field */}
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>Customer</div>
        <div style={{
          padding:"9px 12px", borderRadius:8,
          border:`1.5px solid ${step === 2 ? "rgba(129,140,248,.5)" : step >= 3 ? "rgba(52,211,153,.3)" : "rgba(255,255,255,.08)"}`,
          background:"rgba(255,255,255,.03)", fontSize:12, fontWeight:600,
          color: step >= 3 ? "white" : "rgba(255,255,255,.6)",
          transition:"all .3s",
        }}>
          {step >= 3 ? "Al-Raza Traders" : step === 2 ? <>{customer}<Cursor /></> : <span style={{ color:"rgba(255,255,255,.2)" }}>Select customer…</span>}
        </div>
        {step === 3 && (
          <div style={{ background:"rgba(10,13,40,.98)", border:"1px solid rgba(99,102,241,.3)", borderRadius:8, marginTop:2, padding:"6px 0", animation:"slideIn .2s ease both" }}>
            {["Al-Raza Traders — Lahore","Al-Raza Electronics"].map((s,i) => (
              <div key={i} style={{ padding:"7px 12px", fontSize:11, color: i===0?"#a5b4fc":"rgba(255,255,255,.4)", background: i===0?"rgba(99,102,241,.1)":"transparent", cursor:"pointer" }}>{s}</div>
            ))}
          </div>
        )}
        {step >= 4 && (
          <div style={{ marginTop:4, padding:"6px 10px", borderRadius:6, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.05)", fontSize:10, color:"rgba(255,255,255,.35)", animation:"slideIn .3s ease both" }}>
            📍 Lahore, Punjab &nbsp;·&nbsp; Outstanding: <span style={{ color:"#fbbf24" }}>Rs. 12,500</span> &nbsp;·&nbsp; Last order: 18 days ago
          </div>
        )}
      </div>

      {/* Invoice meta row */}
      {step >= 4 && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:8, animation:"slideIn .35s ease both" }}>
          {[["Invoice #","INV-2026-0342"],["Date","30-06-2026"],["Due Date","14-07-2026"]].map(([l,v]) => (
            <div key={l} style={{ padding:"7px 10px", borderRadius:7, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)" }}>
              <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.75)" }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Items table */}
      {step >= 5 && (
        <div style={{ flex:1, animation:"slideIn .35s ease both" }}>
          <div style={{ display:"grid", gridTemplateColumns:"3fr 1fr 1fr 1fr", gap:0, marginBottom:4 }}>
            {["Item / Description","Qty","Unit Price","Total"].map(h => (
              <div key={h} style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.25)", padding:"4px 8px", textTransform:"uppercase", letterSpacing:".05em" }}>{h}</div>
            ))}
          </div>
          {items.filter(it => it.show).map((item, i) => (
            <div key={i} style={{
              display:"grid", gridTemplateColumns:"3fr 1fr 1fr 1fr",
              padding:"8px", borderRadius:7, marginBottom:3,
              background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)",
              animation:"slideIn .3s ease both",
            }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.75)", fontWeight:500 }}>
                {item.name}{(step === 5 && i===0) || (step === 7 && i===1) || (step === 9 && i===2) ? <Cursor /> : null}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", textAlign:"center" }}>{item.qty}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", textAlign:"center" }}>{item.unit}</div>
              <div style={{ fontSize:12, fontWeight:700, color:"#818cf8", textAlign:"right" }}>{item.total}</div>
            </div>
          ))}
          {step >= 6 && step < 9 && (
            <div style={{ display:"grid", gridTemplateColumns:"3fr 1fr 1fr 1fr", padding:"8px", borderRadius:7, border:"1px dashed rgba(255,255,255,.08)", opacity:.5 }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.2)" }}>+ Add another item…</div>
            </div>
          )}
        </div>
      )}

      {/* Totals */}
      {step >= 10 && (
        <div style={{ borderTop:"1px solid rgba(255,255,255,.07)", paddingTop:10, marginTop:6, animation:"slideIn .35s ease both" }}>
          {[["Subtotal",subtotal],["Tax / GST",tax]].map(([l,v]) => (
            <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(255,255,255,.4)", padding:"3px 0" }}>
              <span>{l}</span><span>{v}</span>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, padding:"10px 14px", borderRadius:10, background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.25)" }}>
            <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.8)" }}>Total</span>
            <span style={{ fontSize:17, fontWeight:900, color:"#818cf8" }}>{total}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {step >= 11 && (
        <div style={{ display:"flex", gap:8, marginTop:10, animation:"slideIn .35s ease both" }}>
          <div style={{ flex:1, padding:"9px", borderRadius:9, background:"linear-gradient(135deg,#6366f1,#4f46e5)", textAlign:"center", fontSize:12, fontWeight:700, color:"white" }}>
            {sent ? "✓ Invoice Sent via WhatsApp" : "Send Invoice"}
          </div>
          <div style={{ padding:"9px 14px", borderRadius:9, border:"1px solid rgba(255,255,255,.1)", fontSize:12, fontWeight:600, color:"rgba(255,255,255,.5)", textAlign:"center" }}>PDF</div>
        </div>
      )}

      {step >= 13 && (
        <div style={{ marginTop:8, padding:"10px 14px", borderRadius:10, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.3)", display:"flex", alignItems:"center", gap:10, animation:"slideIn .35s ease both" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#34d399", flexShrink:0 }}/>
          <span style={{ fontSize:12, color:"rgba(255,255,255,.6)" }}>Invoice delivered to Al-Raza Traders · Payment link included</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════
   DASHBOARD ANIMATION (12 steps)
══════════════════════════════ */
function DashboardDemo({ step }: { step: number }) {
  const rev  = useCountUp(2_480_000, step >= 3);
  const exp  = useCountUp(1_120_000, step >= 3);
  const cash = useCountUp(4_230_000, step >= 3);

  const bars  = [38,52,44,68,59,82,74,88,70,94,85,100];
  const txns = [
    { party:"Al-Raza Traders",  amount:"+Rs. 45,000",  type:"receipt", time:"2 min ago" },
    { party:"Metro Distributors",amount:"+Rs. 1,20,000",type:"receipt", time:"1 hr ago" },
    { party:"Office Rent — June",amount:"-Rs. 35,000",  type:"expense", time:"Today 9am" },
    { party:"Zain Electronics",  amount:"+Rs. 78,500",  type:"receipt", time:"Yesterday" },
  ];

  return (
    <div style={{ flex:1, padding:"14px 18px", display:"flex", flexDirection:"column", gap:10, overflow:"hidden" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"white" }}>Business Dashboard</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>June 2026 · Last updated just now</div>
        </div>
        {step >= 10 && (
          <div style={{ padding:"5px 12px", borderRadius:20, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.25)", fontSize:11, fontWeight:700, color:"#34d399", animation:"slideIn .3s ease both" }}>
            🔴 Live
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
        {[
          { l:"Total Revenue",   v:`Rs. ${(rev/100000).toFixed(1)}L`,  c:"#34d399", i:"📈" },
          { l:"Total Expenses",  v:`Rs. ${(exp/100000).toFixed(1)}L`,  c:"#f97316", i:"📉" },
          { l:"Cash Balance",    v:`Rs. ${(cash/100000).toFixed(1)}L`, c:"#818cf8", i:"🏦" },
        ].map((kpi, i) => (
          <div key={kpi.l} style={{
            padding:"12px", borderRadius:10,
            background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)",
            opacity: step >= 2 ? 1 : 0,
            transform: step >= 2 ? "translateY(0)" : "translateY(12px)",
            transition:`all .45s ease ${i*0.1}s`,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>{kpi.l}</span>
              <span style={{ fontSize:14 }}>{kpi.i}</span>
            </div>
            <div style={{ fontSize:16, fontWeight:900, color:kpi.c }}>{kpi.v}</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,.25)", marginTop:3 }}>↑ 12% vs last month</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{
        borderRadius:10, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.05)",
        padding:"10px 12px",
        opacity: step >= 4 ? 1 : 0, transition:"opacity .5s ease",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)" }}>Monthly Revenue (Jan – Dec)</span>
          <span style={{ fontSize:10, color:"#818cf8", fontWeight:600 }}>▲ Rs. 2.48L peak</span>
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:52 }}>
          {bars.map((h,i) => (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <div style={{
                width:"100%", borderRadius:"3px 3px 0 0",
                background: i === 11 ? "linear-gradient(180deg,#34d399,#10b981aa)" : `linear-gradient(180deg,#6366f1,#4f46e544)`,
                height: step >= 4 ? `${h}%` : "0%",
                transition:`height .7s ease ${i*0.04}s`,
                minHeight:2,
              }}/>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
          {["Jan","Mar","May","Jul","Sep","Dec"].map(m => (
            <span key={m} style={{ fontSize:8, color:"rgba(255,255,255,.2)" }}>{m}</span>
          ))}
        </div>
      </div>

      {/* Transactions */}
      {step >= 6 && (
        <div style={{ animation:"slideIn .35s ease both" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>Recent Activity</div>
          {txns.slice(0, Math.min(txns.length, step - 5)).map((tx,i) => (
            <div key={i} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"8px 10px", borderRadius:8, marginBottom:3,
              background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.04)",
              animation:"slideIn .3s ease both",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:26, height:26, borderRadius:8, background: tx.type==="receipt" ? "rgba(52,211,153,.12)" : "rgba(249,115,22,.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>
                  {tx.type==="receipt" ? "↓" : "↑"}
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,.7)" }}>{tx.party}</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,.25)" }}>{tx.time}</div>
                </div>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color: tx.type==="receipt" ? "#34d399" : "#f97316" }}>{tx.amount}</div>
            </div>
          ))}
        </div>
      )}

      {step >= 11 && (
        <div style={{ padding:"9px 12px", borderRadius:9, background:"rgba(251,191,36,.07)", border:"1px solid rgba(251,191,36,.25)", fontSize:11, color:"rgba(255,255,255,.55)", animation:"slideIn .3s ease both" }}>
          ⚠️ <strong style={{ color:"#fbbf24" }}>3 invoices overdue</strong> — Rs. 2,35,000 outstanding · <span style={{ color:"#fbbf24", fontWeight:600 }}>Send reminders →</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════
   PAYROLL ANIMATION  (13 steps)
══════════════════════════════ */
function PayrollDemo({ step }: { step: number }) {
  const total = useCountUp(3_60_000, step >= 8);

  const employees = [
    { name:"Ahmed Raza",   role:"Branch Manager",    gross:"Rs. 90,000", eobi:"Rs. 900",  net:"Rs. 85,500", avatar:"A", c:"#818cf8" },
    { name:"Sara Khan",    role:"Senior Accountant", gross:"Rs. 65,000", eobi:"Rs. 650",  net:"Rs. 62,350", avatar:"S", c:"#34d399" },
    { name:"Hassan Ali",   role:"Sales Executive",   gross:"Rs. 72,000", eobi:"Rs. 720",  net:"Rs. 68,880", avatar:"H", c:"#fbbf24" },
    { name:"Fatima Malik", role:"HR Executive",      gross:"Rs. 58,000", eobi:"Rs. 580",  net:"Rs. 55,420", avatar:"F", c:"#f87171" },
    { name:"Bilal Ahmed",  role:"Warehouse Incharge",gross:"Rs. 48,000", eobi:"Rs. 480",  net:"Rs. 46,320", avatar:"B", c:"#a78bfa" },
  ];

  const processing = step === 7;
  const processedCount = step >= 8 ? step - 7 : 0;

  return (
    <div style={{ flex:1, padding:"14px 18px", display:"flex", flexDirection:"column", gap:8, overflow:"hidden" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"white" }}>Payroll Processing</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>June 2026 · 5 employees</div>
        </div>
        {step >= 13 && (
          <Badge text="✓ All Disbursed" color="#34d399" bg="rgba(52,211,153,.12)" border="rgba(52,211,153,.3)" />
        )}
      </div>

      {/* Summary cards */}
      {step >= 2 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, animation:"slideIn .35s ease both" }}>
          {[
            { l:"Gross Total", v:"Rs. 3,33,000", c:"#818cf8" },
            { l:"Deductions",  v:"Rs. 3,330",    c:"#f87171" },
            { l:"Net Payable", v:`Rs. ${(total/100).toFixed(0) !== "0" ? (total/1000).toFixed(1)+"K" : "—"}`, c:"#34d399" },
          ].map(s => (
            <div key={s.l} style={{ padding:"8px 10px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", textAlign:"center" }}>
              <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginBottom:4 }}>{s.l}</div>
              <div style={{ fontSize:13, fontWeight:800, color:s.c }}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Employee rows */}
      {step >= 3 && employees.map((emp, i) => {
        const shown = step >= i + 3;
        const paid  = processedCount > i;
        return (
          <div key={i} style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"8px 12px", borderRadius:9,
            background: paid ? "rgba(52,211,153,.05)" : "rgba(255,255,255,.03)",
            border:`1px solid ${paid ? "rgba(52,211,153,.2)" : "rgba(255,255,255,.05)"}`,
            opacity: shown ? 1 : 0,
            transform: shown ? "translateX(0)" : "translateX(-10px)",
            transition:`all .4s ease`,
          }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${emp.c},${emp.c}88)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"white", flexShrink:0 }}>
              {emp.avatar}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.8)" }}>{emp.name}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,.3)" }}>{emp.role}</div>
            </div>
            {step >= 5 && (
              <div style={{ textAlign:"right", fontSize:10, color:"rgba(255,255,255,.4)" }}>
                <div>Gross: {emp.gross}</div>
                <div>EOBI: {emp.eobi}</div>
              </div>
            )}
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12, fontWeight:800, color: paid ? "#34d399" : "rgba(255,255,255,.6)" }}>{emp.net}</div>
              {paid && <div style={{ fontSize:9, color:"#34d399", fontWeight:700 }}>✓ PAID</div>}
            </div>
          </div>
        );
      })}

      {/* Process button */}
      {step >= 6 && step < 8 && (
        <div style={{
          padding:"11px", borderRadius:10, background:"linear-gradient(135deg,#6366f1,#4f46e5)",
          textAlign:"center", fontSize:13, fontWeight:700, color:"white",
          animation:"slideIn .3s ease both",
          boxShadow: step === 6 ? "0 0 0 4px rgba(99,102,241,.3)" : "none",
          transition:"all .3s",
        }}>
          {processing ? "⏳ Processing payroll…" : "▶ Process Payroll — Rs. 3,29,670"}
        </div>
      )}

      {step >= 13 && (
        <div style={{ padding:"9px 12px", borderRadius:9, background:"rgba(52,211,153,.07)", border:"1px solid rgba(52,211,153,.25)", display:"flex", justifyContent:"space-between", alignItems:"center", animation:"slideIn .3s ease both" }}>
          <span style={{ fontSize:11, color:"rgba(255,255,255,.55)" }}>📄 Bank transfer file ready · 5 payslips sent via email</span>
          <span style={{ fontSize:11, fontWeight:700, color:"#34d399" }}>Download →</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════
   INVENTORY ANIMATION (13 steps)
══════════════════════════════ */
function InventoryDemo({ step }: { step: number }) {
  const items = [
    { name:"Paracetamol 500mg Tab",   cat:"Tablet",  stock:1240, max:2000, alert:false, exp:"Dec 2026", batch:"B-2024-109", c:"#34d399" },
    { name:"Amoxicillin 250mg Cap",   cat:"Capsule", stock:48,   max:500,  alert:true,  exp:"Mar 2026", batch:"B-2024-088", c:"#f87171" },
    { name:"Vitamin C 1000mg Tab",    cat:"Tablet",  stock:560,  max:800,  alert:false, exp:"Aug 2027", batch:"B-2025-022", c:"#34d399" },
    { name:"Cetirizine 10mg Tab",     cat:"Tablet",  stock:22,   max:300,  alert:true,  exp:"Jan 2026", batch:"B-2024-071", c:"#f87171" },
    { name:"Metformin 500mg Tab",     cat:"Tablet",  stock:390,  max:500,  alert:false, exp:"Jun 2027", batch:"B-2025-015", c:"#818cf8" },
  ];

  return (
    <div style={{ flex:1, padding:"14px 18px", display:"flex", flexDirection:"column", gap:8, overflow:"hidden" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"white" }}>Inventory Overview</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>Pharmacy Stock · Real-time</div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {step >= 4 && <Badge text="2 Low Stock" color="#f87171" bg="rgba(248,113,113,.1)" border="rgba(248,113,113,.25)" />}
          {step >= 5 && <Badge text="1 Expiring" color="#fbbf24" bg="rgba(251,191,36,.1)" border="rgba(251,191,36,.25)" />}
        </div>
      </div>

      {/* Summary */}
      {step >= 2 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, animation:"slideIn .35s ease both" }}>
          {[{ l:"Total SKUs", v:"128", c:"#818cf8" },{ l:"In Stock", v:"126", c:"#34d399" },{ l:"Low Stock", v:"2", c:"#f87171" },{ l:"Expiring", v:"1", c:"#fbbf24" }].map(s => (
            <div key={s.l} style={{ padding:"7px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", textAlign:"center" }}>
              <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginBottom:3 }}>{s.l}</div>
              <div style={{ fontSize:15, fontWeight:800, color:s.c }}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Item rows */}
      {step >= 3 && items.map((item, i) => {
        const shown = step >= i + 3;
        const pct   = (item.stock / item.max) * 100;
        const pulseAlert = item.alert && step >= 5;
        return (
          <div key={i} style={{
            padding:"9px 12px", borderRadius:9,
            background: pulseAlert ? "rgba(239,68,68,.06)" : "rgba(255,255,255,.03)",
            border:`1px solid ${pulseAlert ? "rgba(239,68,68,.3)" : "rgba(255,255,255,.05)"}`,
            opacity: shown ? 1 : 0,
            transform: shown ? "translateY(0)" : "translateY(8px)",
            transition:"all .4s ease",
            boxShadow: pulseAlert ? "0 0 14px rgba(239,68,68,.12)" : "none",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.82)" }}>{item.name}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.3)" }}>Batch: {item.batch} · Exp: {item.exp}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, fontWeight:800, color:item.c }}>{item.stock.toLocaleString()} units</div>
                {item.alert && step >= 4 && <div style={{ fontSize:9, fontWeight:700, color:"#ef4444", animation:"blink 1.5s ease infinite" }}>⚠ REORDER</div>}
              </div>
            </div>
            {step >= 6 && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, color:"rgba(255,255,255,.2)", marginBottom:3 }}>
                  <span>0</span><span>Stock level: {Math.round(pct)}%</span><span>{item.max.toLocaleString()}</span>
                </div>
                <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,.06)" }}>
                  <div style={{ height:"100%", borderRadius:2, background:item.c, width:`${pct}%`, transition:"width .8s ease" }}/>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {step >= 9 && (
        <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(251,191,36,.07)", border:"1px solid rgba(251,191,36,.28)", animation:"slideIn .35s ease both" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#fbbf24", marginBottom:4 }}>🔔 Auto Reorder Suggestion</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.5)", marginBottom:6 }}>
            Amoxicillin 250mg (48 units) + Cetirizine 10mg (22 units) below minimum threshold.
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ padding:"6px 14px", borderRadius:8, background:"rgba(251,191,36,.15)", border:"1px solid rgba(251,191,36,.3)", fontSize:11, fontWeight:700, color:"#fbbf24" }}>
              Create Purchase Order →
            </div>
          </div>
        </div>
      )}

      {step >= 12 && (
        <div style={{ padding:"8px 12px", borderRadius:9, background:"rgba(52,211,153,.07)", border:"1px solid rgba(52,211,153,.25)", fontSize:11, color:"rgba(255,255,255,.55)", animation:"slideIn .3s ease both" }}>
          ✅ PO #2026-089 raised · Supplier notified · Expected delivery: 2 July 2026
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════
   AI INSIGHTS ANIMATION (13 steps)
══════════════════════════════ */
function AIDemo({ step }: { step: number }) {
  const summaryText = useTypeWriter(
    "June 2026 analysis complete: Revenue grew 18% vs May. Expense-to-revenue ratio improved to 45%. Cash reserves healthy at Rs. 4.2L. 3 invoices totalling Rs. 2,35,000 overdue — recommended to send WhatsApp reminders today.",
    step >= 9, 28
  );
  const anomalyText = useTypeWriter(
    "Unusual expense: Rs. 45,000 to 'Unknown Vendor' on 22 June — flagged for review.",
    step === 4, 32
  );
  const txCount  = useCountUp(1847, step >= 2, 1200);
  const anomalyN = useCountUp(3,    step >= 3, 800);

  const categories = [
    { label:"Inventory", pct:38, color:"#818cf8" },
    { label:"Payroll",   pct:28, color:"#34d399" },
    { label:"Rent",      pct:14, color:"#fbbf24" },
    { label:"Utilities", pct:10, color:"#f97316" },
    { label:"Other",     pct:10, color:"#f87171" },
  ];

  const forecastMonths = [
    { month:"Jul", rev:2.8, exp:1.3 },
    { month:"Aug", rev:3.1, exp:1.4 },
    { month:"Sep", rev:3.4, exp:1.5 },
  ];

  return (
    <div style={{ flex:1, padding:"14px 18px", display:"flex", flexDirection:"column", gap:8, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"white" }}>AI Insights</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>Powered by FinovaOS Intelligence · June 2026</div>
        </div>
        {step >= 2 && (
          <div style={{ padding:"4px 10px", borderRadius:20, background:"rgba(167,139,250,.1)", border:"1px solid rgba(167,139,250,.3)", fontSize:10, fontWeight:700, color:"#a78bfa", animation:"slideIn .3s ease both" }}>
            🤖 AI Active
          </div>
        )}
      </div>

      {/* Stats row */}
      {step >= 2 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, animation:"slideIn .35s ease both" }}>
          {[
            { l:"Transactions Analysed", v:txCount.toLocaleString(), c:"#a78bfa", i:"🔍" },
            { l:"Anomalies Found",       v:step >= 3 ? String(anomalyN) : "—", c:"#f87171", i:"⚠️" },
            { l:"AI Accuracy",           v:"98.7%", c:"#34d399", i:"✓" },
          ].map(s => (
            <div key={s.l} style={{ padding:"8px 10px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", textAlign:"center" }}>
              <div style={{ fontSize:14, marginBottom:4 }}>{s.i}</div>
              <div style={{ fontSize:15, fontWeight:800, color:s.c }}>{s.v}</div>
              <div style={{ fontSize:8, color:"rgba(255,255,255,.3)", marginTop:2, lineHeight:1.4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Anomaly alert */}
      {step >= 4 && (
        <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(248,113,113,.07)", border:"1px solid rgba(248,113,113,.3)", animation:"slideIn .35s ease both" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#f87171", marginBottom:5, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ animation:"blink 1.5s ease infinite" }}>⚠️</span> Anomaly Detected
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.6)", lineHeight:1.6 }}>
            {step === 4 ? <>{anomalyText}<Cursor color="#f87171"/></> : "Unusual expense: Rs. 45,000 to 'Unknown Vendor' on 22 June — flagged for review."}
          </div>
          {step >= 5 && (
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <div style={{ padding:"5px 12px", borderRadius:7, background:"rgba(248,113,113,.12)", border:"1px solid rgba(248,113,113,.25)", fontSize:10, fontWeight:700, color:"#f87171" }}>Review Transaction →</div>
              <div style={{ padding:"5px 12px", borderRadius:7, border:"1px solid rgba(255,255,255,.08)", fontSize:10, fontWeight:600, color:"rgba(255,255,255,.3)" }}>Dismiss</div>
            </div>
          )}
        </div>
      )}

      {/* Cash flow forecast */}
      {step >= 6 && (
        <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", animation:"slideIn .35s ease both" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>3-Month Cash Flow Forecast</div>
          <div style={{ display:"flex", gap:12, alignItems:"flex-end", height:60 }}>
            {forecastMonths.map((m, i) => (
              <div key={m.month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                <div style={{ width:"100%", display:"flex", gap:3, alignItems:"flex-end", height:46 }}>
                  <div style={{ flex:1, borderRadius:"3px 3px 0 0", background:"rgba(167,139,250,.55)", height: step >= 6 ? `${(m.rev/3.4)*100}%` : "0%", transition:`height .7s ease ${i*0.15}s`, minHeight:2 }}/>
                  <div style={{ flex:1, borderRadius:"3px 3px 0 0", background:"rgba(249,115,22,.45)", height: step >= 6 ? `${(m.exp/3.4)*100}%` : "0%", transition:`height .7s ease ${i*0.15+0.1}s`, minHeight:2 }}/>
                </div>
                <div style={{ fontSize:8, color:"rgba(255,255,255,.3)" }}>{m.month}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:14, marginTop:6 }}>
            {[{ c:"rgba(167,139,250,.6)", l:"Revenue (predicted)" }, { c:"rgba(249,115,22,.5)", l:"Expenses" }].map(k => (
              <div key={k.l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:k.c }}/>
                <span style={{ fontSize:9, color:"rgba(255,255,255,.3)" }}>{k.l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense categories */}
      {step >= 7 && (
        <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", animation:"slideIn .35s ease both" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>Auto-Categorised Expenses</div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {categories.slice(0, Math.max(0, step - 6)).map(cat => (
              <div key={cat.label} style={{ display:"flex", alignItems:"center", gap:8, animation:"slideIn .3s ease both" }}>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", width:54, textAlign:"right", flexShrink:0 }}>{cat.label}</div>
                <div style={{ flex:1, height:6, borderRadius:3, background:"rgba(255,255,255,.05)", overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:3, background:cat.color, width:`${cat.pct}%`, transition:"width .8s ease" }}/>
                </div>
                <div style={{ fontSize:9, fontWeight:700, color:cat.color, width:26, flexShrink:0 }}>{cat.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI summary */}
      {step >= 9 && (
        <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(167,139,250,.06)", border:"1px solid rgba(167,139,250,.22)", animation:"slideIn .35s ease both" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#a78bfa", marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
            🤖 AI Financial Summary
          </div>
          <p style={{ fontSize:11, color:"rgba(255,255,255,.62)", margin:0, lineHeight:1.75 }}>
            {summaryText}
            {summaryText.length < 225 && <Cursor color="#a78bfa"/>}
          </p>
        </div>
      )}

      {/* Smart suggestions */}
      {step >= 12 && (
        <div style={{ padding:"9px 12px", borderRadius:9, background:"rgba(52,211,153,.07)", border:"1px solid rgba(52,211,153,.25)", animation:"slideIn .3s ease both" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#34d399", marginBottom:5 }}>✅ Smart Action Suggestions</div>
          {[
            "Send WhatsApp reminders to 3 overdue clients — Rs. 2,35,000 at risk",
            "Flag Rs. 45,000 unknown expense — request receipt from team",
          ].map((s, i) => (
            <div key={i} style={{ fontSize:10, color:"rgba(255,255,255,.5)", marginBottom:3, display:"flex", gap:6, lineHeight:1.5 }}>
              <span style={{ color:"#34d399", flexShrink:0 }}>→</span>{s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   TABS CONFIG
════════════════════════════════════════ */
const TABS = [
  { id: "invoice",   label: "Sales Invoice", icon: "📄", color: "#818cf8",
    desc: "Create & send invoices in 30 seconds",
    steps: [
      "Opening Sales module…","Entering customer name…","Selecting Al-Raza Traders",
      "Customer details loaded","Auto-filling invoice details…","Adding item 1…",
      "Item 1 added","Adding item 2…","Item 2 added","Adding item 3…",
      "Calculating totals…","Sending invoice via WhatsApp…","Invoice delivered ✓",
    ],
  },
  { id: "dashboard", label: "Dashboard",     icon: "📊", color: "#34d399",
    desc: "Real-time P&L, cash flow & KPIs",
    steps: [
      "Loading dashboard…","Fetching today's data…","Revenue & balance updated",
      "Building revenue chart…","Chart ready","Recent transactions loading…",
      "Transactions loaded","Loading more activity…","Activity complete",
      "Checking receivables…","Overdue alerts detected","Dashboard fully loaded ✓",
    ],
  },
  { id: "payroll",   label: "Payroll",       icon: "👥", color: "#fbbf24",
    desc: "Process full payroll in one click",
    steps: [
      "Opening Payroll module…","Calculating gross salaries…","Loading employees…",
      "Employee 1 ready","Employee 2 ready","Loading deductions…",
      "Net salaries calculated","Processing payroll…","Ahmed Raza — Paid ✓",
      "Sara Khan — Paid ✓","Hassan Ali — Paid ✓","Fatima & Bilal — Paid ✓",
      "Payslips sent · Bank file ready ✓",
    ],
  },
  { id: "inventory", label: "Inventory",     icon: "📦", color: "#f97316",
    desc: "Track stock, expiry & reorder alerts",
    steps: [
      "Loading inventory…","Fetching stock data…","5 items loaded",
      "Checking Paracetamol…","Checking Amoxicillin — LOW","Checking other items…",
      "Drawing stock bars…","Stock bars complete","Checking expiry dates…",
      "Reorder alert triggered","Building PO suggestion…","PO created · Supplier notified ✓",
      "All done ✓",
    ],
  },
  { id: "ai", label: "AI Insights", icon: "🤖", color: "#a78bfa",
    desc: "Anomaly detection, forecasts & AI summaries",
    steps: [
      "Opening AI Insights…","Analysing 1,847 transactions…","Scanning for anomalies…",
      "3 anomalies detected","Showing anomaly details…","Generating cash flow forecast…",
      "Forecast ready","Auto-categorising expenses…","Mapping expense categories…",
      "Generating AI financial summary…","Summary written","Checking overdue invoices…",
      "AI report complete ✓",
    ],
  },
];

const FEATURES_BY_TAB: Record<string, string[]> = {
  invoice:   ["Auto-fill customer details", "Multi-currency support", "PDF & WhatsApp share", "Payment tracking"],
  dashboard: ["Live revenue tracking", "Expense breakdown", "Cash flow forecast", "AI anomaly alerts"],
  payroll:   ["Auto salary calculation", "Tax & EOBI deduction", "Payslip generation", "Bank transfer batch"],
  inventory: ["Low stock alerts", "Batch & expiry tracking", "Multi-warehouse view", "DRAP compliance"],
  ai:        ["Anomaly detection", "3-month cash flow forecast", "Auto expense categorisation", "AI financial summary"],
};

const NAV_ITEMS: Record<string, { label:string; icon:string }[]> = {
  invoice:   [
    { label:"Dashboard",   icon:"📊" },
    { label:"Sales",       icon:"📄" },
    { label:"Purchases",   icon:"🛒" },
    { label:"Inventory",   icon:"📦" },
    { label:"HR & Payroll",icon:"👥" },
    { label:"Reports",     icon:"📈" },
  ],
  dashboard: [
    { label:"Dashboard",   icon:"📊" },
    { label:"Sales",       icon:"📄" },
    { label:"Purchases",   icon:"🛒" },
    { label:"Inventory",   icon:"📦" },
    { label:"HR & Payroll",icon:"👥" },
    { label:"Reports",     icon:"📈" },
  ],
  payroll: [
    { label:"Dashboard",   icon:"📊" },
    { label:"Sales",       icon:"📄" },
    { label:"Purchases",   icon:"🛒" },
    { label:"Inventory",   icon:"📦" },
    { label:"HR & Payroll",icon:"👥" },
    { label:"Reports",     icon:"📈" },
  ],
  inventory: [
    { label:"Dashboard",   icon:"📊" },
    { label:"Sales",       icon:"📄" },
    { label:"Purchases",   icon:"🛒" },
    { label:"Inventory",   icon:"📦" },
    { label:"HR & Payroll",icon:"👥" },
    { label:"Reports",     icon:"📈" },
  ],
  ai: [
    { label:"Dashboard",   icon:"📊" },
    { label:"AI Insights", icon:"🤖" },
    { label:"Sales",       icon:"📄" },
    { label:"Inventory",   icon:"📦" },
    { label:"HR & Payroll",icon:"👥" },
    { label:"Reports",     icon:"📈" },
  ],
};

const ACTIVE_NAV: Record<string, string> = {
  invoice:"Sales", dashboard:"Dashboard", payroll:"HR & Payroll", inventory:"Inventory", ai:"AI Insights",
};

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function VideoDemo() {
  const [activeTab, setActiveTab] = useState("invoice");
  const [playing,   setPlaying]   = useState(false);
  const [step,      setStep]      = useState(0);
  const [done,      setDone]      = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tab = TABS.find(t => t.id === activeTab)!;
  const maxSteps = tab.steps.length - 1;

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!playing) { setStep(0); setDone(false); return; }
    setStep(0); setDone(false);
    let cur = 0;
    timerRef.current = setInterval(() => {
      cur++;
      setStep(cur);
      if (cur >= maxSteps) { clearInterval(timerRef.current!); setDone(true); }
    }, 850);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, activeTab]);

  function replay() { setPlaying(false); setTimeout(() => setPlaying(true), 100); }

  const navItems  = NAV_ITEMS[activeTab];
  const activeNav = ACTIVE_NAV[activeTab];

  return (
    <section style={{
      background:"linear-gradient(180deg,#080c22 0%,#0a0d28 100%)",
      padding:"100px 24px",
      fontFamily:"'Outfit',sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orb2{0%,100%{transform:translate(0,0)}50%{transform:translate(-18px,14px)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes pulse{0%,100%{transform:scale(1);box-shadow:0 8px 32px rgba(99,102,241,.6),0 0 0 14px rgba(99,102,241,.15)}50%{transform:scale(1.06);box-shadow:0 12px 40px rgba(99,102,241,.7),0 0 0 20px rgba(99,102,241,.08)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .demo-tab:hover{background:rgba(255,255,255,.07)!important;border-color:rgba(255,255,255,.12)!important;}
        .demo-tab-active{border-color:var(--tc)!important;background:rgba(255,255,255,.06)!important;}
        @media(max-width:900px){.demo-layout{flex-direction:column!important;}.demo-tabs{width:100%!important;}.demo-mock-sidebar{display:none!important;}}
      `}</style>

      {/* BG */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)", backgroundSize:"52px 52px" }}/>
        <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%", bottom:-150, left:-150, background:"radial-gradient(circle,rgba(52,211,153,.06),transparent 65%)", animation:"orb2 18s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.3),transparent)" }}/>
        <div style={{ position:"absolute", bottom:0, left:"10%", right:"10%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.12),transparent)" }}/>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", position:"relative" }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:100, marginBottom:20, background:"rgba(129,140,248,.1)", border:"1.5px solid rgba(129,140,248,.22)" }}>
            <span style={{ fontSize:14 }}>▶</span>
            <span style={{ fontSize:11, fontWeight:700, color:"#818cf8", letterSpacing:".08em" }}>INTERACTIVE DEMO</span>
          </div>
          <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(28px,4vw,52px)", fontWeight:700, color:"white", letterSpacing:"-2px", lineHeight:1.08, marginBottom:16 }}>
            See FinovaOS in{" "}
            <span style={{ background:"linear-gradient(135deg,#818cf8,#6366f1)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              action
            </span>
          </h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.45)", maxWidth:540, margin:"0 auto" }}>
            Click play on any feature below — watch real workflows animated step-by-step, exactly as your team would use it.
          </p>
        </div>

        {/* Tab selector */}
        <div className="demo-layout" style={{ display:"flex", gap:28, alignItems:"flex-start" }}>

          {/* Left tab selector */}
          <div className="demo-tabs" style={{ display:"flex", flexDirection:"column", gap:10, flexShrink:0, width:230 }}>
            {TABS.map(t => (
              <button key={t.id}
                className={`demo-tab${activeTab === t.id ? " demo-tab-active" : ""}`}
                onClick={() => { setActiveTab(t.id); setPlaying(false); }}
                style={{
                  "--tc": t.color,
                  padding:"14px 16px", borderRadius:14, border:"1.5px solid rgba(255,255,255,.06)",
                  background: activeTab === t.id ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.03)",
                  cursor:"pointer", textAlign:"left", fontFamily:"inherit", transition:"all .2s",
                } as React.CSSProperties}
              >
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
                  <span style={{ fontSize:20 }}>{t.icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color: activeTab === t.id ? t.color : "rgba(255,255,255,.6)" }}>{t.label}</span>
                  {activeTab === t.id && playing && !done && (
                    <svg width="12" height="12" viewBox="0 0 24 24" style={{ marginLeft:"auto", animation:"spin 1s linear infinite", flexShrink:0 }}>
                      <circle cx="12" cy="12" r="9" stroke={t.color} strokeWidth="2.5" fill="none" strokeDasharray="40" strokeDashoffset="10"/>
                    </svg>
                  )}
                  {activeTab === t.id && done && <span style={{ marginLeft:"auto", fontSize:12 }}>✓</span>}
                </div>
                <p style={{ fontSize:11, color:"rgba(255,255,255,.3)", margin:0, lineHeight:1.5 }}>{t.desc}</p>
              </button>
            ))}

            {/* Step log below tabs on desktop */}
            {playing && (
              <div style={{ marginTop:8, padding:"14px 16px", borderRadius:14, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>Steps</div>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {tab.steps.map((s, i) => (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:8, fontSize:10,
                      color: i < step ? "#34d399" : i === step ? tab.color : "rgba(255,255,255,.2)",
                      fontWeight: i === step ? 700 : 400,
                      transition:"all .3s",
                    }}>
                      <span style={{ flexShrink:0, fontSize:9 }}>{i < step ? "✓" : i === step ? "▶" : "○"}</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main demo area */}
          <div style={{ flex:1, minWidth:0 }}>

            {/* Mock browser chrome */}
            <div style={{
              borderRadius:16, overflow:"hidden",
              border:"1.5px solid rgba(255,255,255,.08)",
              boxShadow:"0 32px 80px rgba(0,0,0,.5)",
            }}>

              {/* Browser bar */}
              <div style={{ background:"rgba(14,18,44,.98)", padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ display:"flex", gap:5 }}>
                  {["#f87171","#fbbf24","#34d399"].map((c,i) => (
                    <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:c, opacity:.7 }}/>
                  ))}
                </div>
                <div style={{ flex:1, background:"rgba(255,255,255,.04)", borderRadius:6, padding:"5px 12px", fontSize:11, color:"rgba(255,255,255,.25)", fontWeight:500 }}>
                  🔒 app.finovaos.com/dashboard
                </div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.2)" }}>FinovaOS</div>
              </div>

              {/* App shell */}
              <div style={{ display:"flex", background:"rgba(8,12,34,.99)", height:440 }}>

                {/* App sidebar */}
                <div className="demo-mock-sidebar" style={{ width:160, borderRight:"1px solid rgba(255,255,255,.05)", padding:"12px 8px", display:"flex", flexDirection:"column", gap:2, flexShrink:0 }}>
                  {/* Logo */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", marginBottom:10 }}>
                    <div style={{ width:24, height:24, borderRadius:7, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"white" }}>F</div>
                    <span style={{ fontSize:12, fontWeight:800, color:"white" }}>FinovaOS</span>
                  </div>
                  {navItems.map(item => (
                    <div key={item.label} style={{
                      display:"flex", alignItems:"center", gap:7, padding:"7px 8px", borderRadius:7,
                      background: item.label === activeNav ? "rgba(99,102,241,.15)" : "transparent",
                      border: `1px solid ${item.label === activeNav ? "rgba(99,102,241,.25)" : "transparent"}`,
                    }}>
                      <span style={{ fontSize:13 }}>{item.icon}</span>
                      <span style={{ fontSize:10, fontWeight: item.label === activeNav ? 700 : 500, color: item.label === activeNav ? tab.color : "rgba(255,255,255,.35)" }}>{item.label}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:"auto", padding:"8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
                    <div style={{ width:24, height:24, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"white", marginBottom:5 }}>U</div>
                    <div style={{ fontSize:9, fontWeight:600, color:"rgba(255,255,255,.5)" }}>Demo User</div>
                    <div style={{ fontSize:8, color:"rgba(255,255,255,.25)" }}>Enterprise Plan</div>
                  </div>
                </div>

                {/* Content area */}
                <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", overflow:"hidden" }}>
                  {/* Content header */}
                  <div style={{ padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:14 }}>{tab.icon}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.6)" }}>{tab.label}</span>
                    </div>
                    {playing && (
                      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:20, background:`${tab.color}15`, border:`1px solid ${tab.color}30` }}>
                        {!done ? (
                          <svg width="9" height="9" viewBox="0 0 24 24" style={{ animation:"spin .8s linear infinite" }}>
                            <circle cx="12" cy="12" r="9" stroke={tab.color} strokeWidth="3" fill="none" strokeDasharray="40" strokeDashoffset="10"/>
                          </svg>
                        ) : (
                          <span style={{ fontSize:10 }}>✓</span>
                        )}
                        <span style={{ fontSize:10, fontWeight:600, color:tab.color }}>{tab.steps[Math.min(step, maxSteps)]}</span>
                      </div>
                    )}
                  </div>

                  {/* Animated demo content */}
                  <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
                    {activeTab === "invoice"   && <InvoiceDemo   step={step} />}
                    {activeTab === "dashboard" && <DashboardDemo step={step} />}
                    {activeTab === "payroll"   && <PayrollDemo   step={step} />}
                    {activeTab === "inventory" && <InventoryDemo step={step} />}
                    {activeTab === "ai"        && <AIDemo        step={step} />}
                  </div>

                  {/* Bottom feature pills */}
                  <div style={{ padding:"8px 16px", borderTop:"1px solid rgba(255,255,255,.04)", display:"flex", gap:10, flexWrap:"wrap", background:"rgba(8,12,34,.9)" }}>
                    {FEATURES_BY_TAB[activeTab].map((f,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background:tab.color }}/>
                        <span style={{ fontSize:10, color:"rgba(255,255,255,.4)", fontWeight:600 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height:3, background:"rgba(255,255,255,.04)" }}>
                <div style={{
                  height:"100%", background:`linear-gradient(90deg,${tab.color},${tab.color}88)`,
                  width: playing ? `${(step / maxSteps) * 100}%` : "0%",
                  transition:"width .8s ease", borderRadius:2,
                }}/>
              </div>
            </div>

            {/* Play / Replay button */}
            <div style={{ display:"flex", justifyContent:"center", marginTop:20, gap:12 }}>
              {!playing ? (
                <button onClick={() => setPlaying(true)} style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"14px 36px", borderRadius:14,
                  background:"linear-gradient(135deg,#6366f1,#4f46e5)",
                  border:"none", color:"white", fontWeight:700, fontSize:15,
                  cursor:"pointer", fontFamily:"inherit",
                  boxShadow:"0 8px 32px rgba(99,102,241,.5)",
                  transition:"all .25s",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 12px 40px rgba(99,102,241,.6)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(99,102,241,.5)";}}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Play {tab.label} Demo
                </button>
              ) : done ? (
                <>
                  <button onClick={replay} style={{
                    display:"flex", alignItems:"center", gap:8,
                    padding:"12px 28px", borderRadius:12,
                    border:"1.5px solid rgba(255,255,255,.15)", background:"rgba(255,255,255,.06)",
                    color:"white", fontWeight:700, fontSize:14,
                    cursor:"pointer", fontFamily:"inherit", transition:"all .2s",
                  }}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.1)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.06)";}}
                  >↺ Replay</button>
                  <a href="/onboarding/signup/starter" style={{
                    display:"flex", alignItems:"center", gap:8,
                    padding:"12px 28px", borderRadius:12,
                    background:"linear-gradient(135deg,#6366f1,#4f46e5)",
                    color:"white", fontWeight:700, fontSize:14, textDecoration:"none",
                    boxShadow:"0 6px 20px rgba(99,102,241,.4)",
                  }}>
                    Get Started Free →
                  </a>
                </>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 28px", borderRadius:12, border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.5)", fontSize:14 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation:"spin .8s linear infinite" }}>
                    <circle cx="12" cy="12" r="9" stroke={tab.color} strokeWidth="2.5" fill="none" strokeDasharray="40" strokeDashoffset="10"/>
                  </svg>
                  Demo running… {Math.round((step / maxSteps) * 100)}% complete
                </div>
              )}
            </div>

            {/* CTA row */}
            <div style={{ display:"flex", gap:12, marginTop:16, flexWrap:"wrap", justifyContent:"center" }}>
              <a href="/contact" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"12px 24px", borderRadius:11, fontSize:13, fontWeight:700,
                border:"1.5px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)",
                color:"rgba(255,255,255,.6)", textDecoration:"none", transition:"all .25s",
              }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,.24)"; e.currentTarget.style.color="white"; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,.1)"; e.currentTarget.style.color="rgba(255,255,255,.6)"; }}
              >
                📅 Book a Live Demo
              </a>
              <a href="/pricing" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"12px 24px", borderRadius:11, fontSize:13, fontWeight:700,
                border:"1.5px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)",
                color:"rgba(255,255,255,.6)", textDecoration:"none", transition:"all .25s",
              }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,.24)"; e.currentTarget.style.color="white"; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,.1)"; e.currentTarget.style.color="rgba(255,255,255,.6)"; }}
              >
                💳 View Pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
