"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

interface CashFlowItem { date: string; voucherNo: string; description: string; amount: number; type: "INFLOW"|"OUTFLOW"; }
interface CashFlowSection { items: CashFlowItem[]; inflow: number; outflow: number; net: number; }
interface CashFlowData { period: { from: string; to: string }; operating: CashFlowSection; investing: CashFlowSection; financing: CashFlowSection; netCashFlow: number; }

const fmt = (n: number) => Math.abs(n).toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 });
const todayStr = () => new Date().toISOString().slice(0, 10);
const firstOfYear = () => `${new Date().getFullYear()}-01-01`;

function getHeaders(): Record<string, string> {
  const user = getCurrentUser();
  if (!user) return {};
  return { "x-user-id": user.id, "x-user-role": user.role ?? "ADMIN", "x-company-id": user.companyId ?? "" };
}

function Section({ title, accent, section, expanded, onToggle }: { title:string; accent:string; section:CashFlowSection; expanded:boolean; onToggle:()=>void }) {
  const border = "rgba(255,255,255,.06)";
  return (
    <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:12, overflow:"hidden", marginBottom:12 }}>
      <div onClick={onToggle} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", cursor:"pointer", borderBottom: expanded ? `1px solid ${border}` : "none" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ width:10, height:10, borderRadius:"50%", background:accent, display:"inline-block" }}/>
          <span style={{ fontWeight:700, fontSize:15, color:"white" }}>{title}</span>
          <span style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>({section.items.length} transactions)</span>
        </div>
        <div style={{ display:"flex", gap:24, alignItems:"center" }}>
          <span style={{ fontSize:12, color:"#4ade80" }}>In: {fmt(section.inflow)}</span>
          <span style={{ fontSize:12, color:"#f87171" }}>Out: {fmt(section.outflow)}</span>
          <span style={{ fontWeight:800, fontSize:14, color: section.net>=0?"#4ade80":"#f87171" }}>Net: {section.net>=0?"":" −"}{fmt(section.net)}</span>
          <span style={{ color:"rgba(255,255,255,.35)", fontSize:12 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      {expanded && (
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ background:"rgba(255,255,255,.02)" }}>
            {["Date","Voucher No","Description","Type","Amount"].map(h => (
              <th key={h} style={{ padding:"9px 14px", textAlign:h==="Amount"?"right":"left", fontSize:11, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:.6, borderBottom:`1px solid ${border}`, fontWeight:600 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {section.items.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:"20px 14px", textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:13 }}>No transactions in this period</td></tr>
            ) : section.items.map((item, i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${border}` }}>
                <td style={{ padding:"9px 14px", fontSize:12, color:"rgba(255,255,255,.45)" }}>{item.date}</td>
                <td style={{ padding:"9px 14px", fontSize:12, fontFamily:"monospace", color:"rgba(255,255,255,.7)" }}>{item.voucherNo}</td>
                <td style={{ padding:"9px 14px", fontSize:13, color:"rgba(255,255,255,.8)" }}>{item.description}</td>
                <td style={{ padding:"9px 14px" }}>
                  <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:4, background:item.type==="INFLOW"?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)", color:item.type==="INFLOW"?"#4ade80":"#f87171" }}>{item.type}</span>
                </td>
                <td style={{ padding:"9px 14px", textAlign:"right", fontWeight:600, fontSize:13, color:item.type==="INFLOW"?"#86efac":"#fca5a5" }}>{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function CashFlowPage() {
  const router  = useRouter();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef   = useRef<HTMLInputElement>(null);
  const [showModal,  setShowModal]  = useState(true);
  const [from,       setFrom]       = useState(firstOfYear());
  const [to,         setTo]         = useState(todayStr());
  const [data,       setData]       = useState<CashFlowData | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [expanded,   setExpanded]   = useState({ operating:true, investing:false, financing:false });

  const loadReport = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/reports/cash-flow?from=${from}&to=${to}`, { headers: getHeaders(), credentials:"include" });
      const result = await res.json();
      if (!res.ok) { setError(result.error || "Failed to load cash flow report"); return; }
      setData(result);
    } catch { setError("Network error — could not load report"); }
    finally { setLoading(false); }
  }, [from, to]);

  function handleGenerate() { setShowModal(false); loadReport(); }

  function exportCSV(d: CashFlowData) {
    const rows = [
      ["Category","Date","Voucher No","Description","Type","Amount"],
      ...d.operating.items.map(i => ["Operating",i.date,i.voucherNo,i.description,i.type,i.amount]),
      ...d.investing.items.map(i => ["Investing",i.date,i.voucherNo,i.description,i.type,i.amount]),
      ...d.financing.items.map(i => ["Financing",i.date,i.voucherNo,i.description,i.type,i.amount]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type:"text/csv" })), download:`cash-flow-${d.period.from}-to-${d.period.to}.csv` });
    a.click();
  }

  const inputStyle: React.CSSProperties = { width:"100%", padding:"11px 14px", borderRadius:10, fontSize:14, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"white", outline:"none", fontFamily:"inherit", boxSizing:"border-box" };

  return (
    <div style={{ fontFamily:"'Outfit','Inter',sans-serif", color:"rgba(255,255,255,.85)" }}>

      {/* ── MODAL ── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,.78)", backdropFilter:"blur(14px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:460, background:"rgba(10,13,32,.97)", border:"1px solid rgba(255,255,255,.12)", borderRadius:22, padding:"40px 40px 36px", boxShadow:"0 40px 100px rgba(0,0,0,.8)", position:"relative" }}>
            <button onClick={() => data ? setShowModal(false) : router.back()} style={{ position:"absolute", top:14, right:16, background:"none", border:"none", color:"rgba(255,255,255,.35)", fontSize:20, cursor:"pointer", lineHeight:1, padding:4, borderRadius:6 }}>✕</button>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:28 }}>
              <div style={{ width:46, height:46, borderRadius:14, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>💧</div>
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:"white", letterSpacing:"-.3px" }}>Cash Flow</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:2 }}>Select reporting period</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:22 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:7 }}>From</label>
                <input ref={fromRef} type="date" style={inputStyle} value={from} onChange={e => setFrom(e.target.value)} autoFocus onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); toRef.current?.focus(); } }}/>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:7 }}>To</label>
                <input ref={toRef} type="date" style={inputStyle} value={to} onChange={e => setTo(e.target.value)} onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); handleGenerate(); } }}/>
              </div>
            </div>
            <button onClick={handleGenerate} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white", fontSize:15, fontWeight:700, fontFamily:"inherit", boxShadow:"0 6px 24px rgba(99,102,241,.35)" }}>
              Generate Report →
            </button>
          </div>
        </div>
      )}

      {/* ── REPORT ── */}
      {!showModal && (
        <>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:10 }}>
            <button onClick={() => setShowModal(true)} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:10, border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.6)", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              ⟵ Change Dates
            </button>
            <div style={{ display:"flex", gap:8 }}>
              {data && <button onClick={() => exportCSV(data)} style={{ padding:"8px 16px", borderRadius:9, border:"1px solid rgba(52,211,153,.3)", background:"rgba(52,211,153,.06)", color:"#34d399", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>↓ Export CSV</button>}
              <button onClick={() => window.print()} style={{ padding:"8px 16px", borderRadius:9, border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.5)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🖨 Print</button>
            </div>
          </div>

          {error && <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:10, padding:"12px 16px", marginBottom:20, color:"#f87171", fontSize:13 }}>{error}</div>}
          {loading && <div style={{ textAlign:"center", padding:"80px 0", color:"rgba(255,255,255,.25)", fontSize:14 }}>Loading report…</div>}

          {data && !loading && (
            <>
              <div style={{ textAlign:"center", marginBottom:20, fontSize:13, color:"rgba(255,255,255,.4)" }}>
                Period: <strong style={{ color:"white" }}>{data.period.from}</strong> to <strong style={{ color:"white" }}>{data.period.to}</strong>
              </div>

              {/* Net banner */}
              <div style={{ background:data.netCashFlow>=0?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)", border:`1px solid ${data.netCashFlow>=0?"rgba(34,197,94,.25)":"rgba(239,68,68,.25)"}`, borderRadius:12, padding:"16px 24px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,.8)" }}>Net Increase / (Decrease) in Cash</span>
                <span style={{ fontSize:28, fontWeight:800, color:data.netCashFlow>=0?"#4ade80":"#f87171" }}>{data.netCashFlow>=0?"":" −"}{fmt(data.netCashFlow)}</span>
              </div>

              <Section title="Operating Activities" accent="#6366f1" section={data.operating} expanded={expanded.operating} onToggle={() => setExpanded(p=>({...p,operating:!p.operating}))}/>
              <Section title="Investing Activities"  accent="#f59e0b" section={data.investing} expanded={expanded.investing} onToggle={() => setExpanded(p=>({...p,investing:!p.investing}))}/>
              <Section title="Financing Activities" accent="#ec4899" section={data.financing} expanded={expanded.financing} onToggle={() => setExpanded(p=>({...p,financing:!p.financing}))}/>

              {/* Summary */}
              <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:12, overflow:"hidden", marginTop:8 }}>
                <div style={{ padding:"12px 20px", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"white" }}>Summary</span>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <tbody>
                    {[
                      { label:"Net Cash from Operating", value:data.operating.net, accent:"#6366f1" },
                      { label:"Net Cash from Investing",  value:data.investing.net,  accent:"#f59e0b" },
                      { label:"Net Cash from Financing", value:data.financing.net, accent:"#ec4899" },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                        <td style={{ padding:"12px 20px", fontSize:13, color:"rgba(255,255,255,.7)" }}>
                          <span style={{ width:8, height:8, borderRadius:"50%", background:row.accent, display:"inline-block", marginRight:10, verticalAlign:"middle" }}/>{row.label}
                        </td>
                        <td style={{ padding:"12px 20px", textAlign:"right", fontWeight:700, fontSize:14, color:row.value>=0?"#4ade80":"#f87171" }}>{row.value>=0?"":" −"}{fmt(row.value)}</td>
                      </tr>
                    ))}
                    <tr style={{ background:data.netCashFlow>=0?"rgba(34,197,94,.06)":"rgba(239,68,68,.06)" }}>
                      <td style={{ padding:"14px 20px", fontSize:14, fontWeight:800, color:"white" }}>Net Cash Flow</td>
                      <td style={{ padding:"14px 20px", textAlign:"right", fontWeight:900, fontSize:18, color:data.netCashFlow>=0?"#4ade80":"#f87171" }}>{data.netCashFlow>=0?"":" −"}{fmt(data.netCashFlow)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
