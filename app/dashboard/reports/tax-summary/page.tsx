"use client";

import { useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

type TaxSummary = {
  taxType: string; taxCode: string; taxRate: number; invoiceCount: number;
  totalSubtotal: number; totalTaxAmount: number; totalAmount: number; averageTaxRate: number;
};

const fmtN = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 });
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function TaxSummaryPage() {
  const [showModal,   setShowModal]   = useState(true);
  const [from,        setFrom]        = useState(`${new Date().getFullYear()}-01-01`);
  const [to,          setTo]          = useState(todayStr());
  const [data,        setData]        = useState<TaxSummary[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [loading,     setLoading]     = useState(false);

  async function loadReport() {
    setLoading(true);
    const user = getCurrentUser();
    const h = { "x-user-id": user?.id||"", "x-user-role": user?.role||"", "x-company-id": user?.companyId||"" };
    try {
      const [taxRes, coRes] = await Promise.all([
        fetch(`/api/reports/tax-summary?from=${from}&to=${to}`, { credentials:"include", headers:h }),
        fetch("/api/me/company", { headers:h }),
      ]);
      const result = await taxRes.json();
      if (Array.isArray(result)) setData(result);
      const co = coRes.ok ? await coRes.json() : null;
      if (co) setCompanyInfo(co);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function handleGenerate() { setShowModal(false); loadReport(); }

  const totalTax = data.reduce((s, d) => s + d.totalTaxAmount, 0);
  const totalAmt = data.reduce((s, d) => s + d.totalAmount, 0);
  const cur = companyInfo?.baseCurrency || "";

  const inputStyle: React.CSSProperties = { width:"100%", padding:"11px 14px", borderRadius:10, fontSize:14, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"white", outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
  const th: React.CSSProperties = { padding:"10px 14px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".08em", borderBottom:"1px solid rgba(255,255,255,.07)", background:"rgba(255,255,255,.03)", whiteSpace:"nowrap" };

  return (
    <div style={{ fontFamily:"'Outfit','Inter',sans-serif", color:"rgba(255,255,255,.85)" }}>

      {/* ── MODAL ── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,.78)", backdropFilter:"blur(14px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:460, background:"rgba(10,13,32,.97)", border:"1px solid rgba(255,255,255,.12)", borderRadius:22, padding:"40px 40px 36px", boxShadow:"0 40px 100px rgba(0,0,0,.8)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:28 }}>
              <div style={{ width:46, height:46, borderRadius:14, background:"linear-gradient(135deg,#f59e0b,#d97706)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🧾</div>
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:"white", letterSpacing:"-.3px" }}>Tax Summary</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:2 }}>Select reporting period</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:22 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:7 }}>From</label>
                <input type="date" style={inputStyle} value={from} onChange={e => setFrom(e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:7 }}>To</label>
                <input type="date" style={inputStyle} value={to} onChange={e => setTo(e.target.value)}/>
              </div>
            </div>
            <button onClick={handleGenerate} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"white", fontSize:15, fontWeight:700, fontFamily:"inherit", boxShadow:"0 6px 24px rgba(245,158,11,.35)" }}>
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
            {data.length > 0 && (
              <button onClick={() => exportToCSV(data, "tax-summary")} style={{ padding:"8px 16px", borderRadius:9, border:"1px solid rgba(52,211,153,.3)", background:"rgba(52,211,153,.06)", color:"#34d399", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                ↓ Export CSV
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:"80px 0", color:"rgba(255,255,255,.25)", fontSize:14 }}>Loading report…</div>
          ) : (
            <>
              {/* KPI cards */}
              {data.length > 0 && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
                  {[
                    { label:"Total Tax Collected", val:totalTax, color:"#fbbf24", bg:"rgba(251,191,36,.08)", border:"rgba(251,191,36,.2)" },
                    { label:"Total Invoice Amount", val:totalAmt, color:"#818cf8", bg:"rgba(129,140,248,.08)", border:"rgba(129,140,248,.2)" },
                    { label:"Tax Types", val:data.length, color:"#34d399", bg:"rgba(52,211,153,.08)", border:"rgba(52,211,153,.2)", isCount:true },
                  ].map(k => (
                    <div key={k.label} style={{ background:k.bg, border:`1px solid ${k.border}`, borderRadius:14, padding:"18px 20px" }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>{k.label}</div>
                      <div style={{ fontSize:26, fontWeight:900, color:k.color }}>{(k as any).isCount ? k.val : `${cur ? cur+" " : ""}${fmtN(k.val as number)}`}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Report header */}
              <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:16, overflow:"hidden" }}>
                <div style={{ padding:"20px 24px", background:"linear-gradient(135deg,rgba(245,158,11,.1),rgba(217,119,6,.05))", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color:"white" }}>{companyInfo?.name || "Tax Summary Report"}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:3 }}>Period: {from} — {to}</div>
                  </div>
                  <div style={{ fontSize:13, color:"#fbbf24", fontWeight:700 }}>🧾 Tax Summary</div>
                </div>

                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ ...th, textAlign:"left" }}>Tax Type</th>
                        <th style={{ ...th, textAlign:"left" }}>Tax Code</th>
                        <th style={{ ...th, textAlign:"right" }}>Rate %</th>
                        <th style={{ ...th, textAlign:"right" }}>Invoices</th>
                        <th style={{ ...th, textAlign:"right" }}>Subtotal</th>
                        <th style={{ ...th, textAlign:"right", color:"rgba(251,191,36,.6)" }}>Tax Amount</th>
                        <th style={{ ...th, textAlign:"right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.length === 0 ? (
                        <tr><td colSpan={7} style={{ padding:"40px 16px", textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:13 }}>No tax data found for this period</td></tr>
                      ) : data.map((d, i) => (
                        <tr key={i} style={{ background:i%2===0?"transparent":"rgba(255,255,255,.012)", borderBottom:"1px solid rgba(255,255,255,.04)" }}
                          onMouseEnter={e => (e.currentTarget.style.background="rgba(245,158,11,.05)")}
                          onMouseLeave={e => (e.currentTarget.style.background=i%2===0?"transparent":"rgba(255,255,255,.012)")}>
                          <td style={{ padding:"10px 14px", fontSize:13, fontWeight:700, color:"#fbbf24" }}>{d.taxType}</td>
                          <td style={{ padding:"10px 14px", fontSize:12, color:"rgba(255,255,255,.5)", fontFamily:"monospace" }}>{d.taxCode}</td>
                          <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13, color:"rgba(255,255,255,.7)" }}>{d.taxRate}%</td>
                          <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13, color:"rgba(255,255,255,.6)" }}>{d.invoiceCount}</td>
                          <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13, color:"rgba(255,255,255,.6)", fontFamily:"monospace" }}>{fmtN(d.totalSubtotal)}</td>
                          <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13, fontWeight:700, color:"#fbbf24", fontFamily:"monospace" }}>{fmtN(d.totalTaxAmount)}</td>
                          <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13, color:"rgba(255,255,255,.7)", fontFamily:"monospace" }}>{fmtN(d.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {data.length > 0 && (
                      <tfoot>
                        <tr style={{ background:"rgba(245,158,11,.08)", borderTop:"2px solid rgba(245,158,11,.25)" }}>
                          <td colSpan={4} style={{ padding:"12px 14px", fontWeight:700, fontSize:12, textTransform:"uppercase", letterSpacing:".06em", color:"rgba(255,255,255,.5)" }}>Grand Total</td>
                          <td style={{ padding:"12px 14px", textAlign:"right", fontWeight:800, fontSize:14, color:"rgba(255,255,255,.7)", fontFamily:"monospace" }}>{fmtN(data.reduce((s,d)=>s+d.totalSubtotal,0))}</td>
                          <td style={{ padding:"12px 14px", textAlign:"right", fontWeight:900, fontSize:14, color:"#fbbf24", fontFamily:"monospace" }}>{fmtN(totalTax)}</td>
                          <td style={{ padding:"12px 14px", textAlign:"right", fontWeight:800, fontSize:14, color:"rgba(255,255,255,.7)", fontFamily:"monospace" }}>{fmtN(totalAmt)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
