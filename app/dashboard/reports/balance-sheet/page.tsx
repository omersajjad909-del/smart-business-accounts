"use client";

import toast from "react-hot-toast";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtN = (n: number) => Math.abs(n).toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 });

export default function BalanceSheetPage() {
  const router  = useRouter();
  const dateRef = useRef<HTMLInputElement>(null);
  const [showModal,     setShowModal]     = useState(true);
  const [date,          setDate]          = useState(todayStr());
  const [data,          setData]          = useState<any>(null);
  const [companyName,   setCompanyName]   = useState("Your Company");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [sendingEmail,  setSendingEmail]  = useState(false);

  async function loadReport() {
    setLoading(true); setError(null);
    const user = getCurrentUser();
    const h = { "x-user-id": user?.id||"", "x-user-role": user?.role||"", "x-company-id": user?.companyId||"" };
    try {
      const [bsRes, coRes] = await Promise.all([
        fetch(`/api/reports/balance-sheet?date=${date}`, { credentials:"include", headers:h }),
        fetch("/api/me/company", { headers:h }),
      ]);
      const bs = await bsRes.json();
      if (!bsRes.ok) { setError(bs.error || "Failed to load report"); return; }
      setData(bs);
      const co = coRes.ok ? await coRes.json() : null;
      if (co?.name) setCompanyName(co.name);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  function handleGenerate() { setShowModal(false); loadReport(); }

  async function sendEmail() {
    const email = window.prompt("Enter email address:");
    if (!email || !email.includes("@")) return;
    setSendingEmail(true);
    try {
      const user = getCurrentUser();
      const res = await fetch("/api/email/send", {
        method:"POST", credentials:"include",
        headers: { "Content-Type":"application/json", "x-user-role":user?.role||"", "x-user-id":user?.id||"", "x-company-id":user?.companyId||"" },
        body: JSON.stringify({ type:"custom", to:email, subject:`Balance Sheet as on ${date}`, message:`Balance Sheet report from ${companyName}.` }),
      });
      const d = await res.json();
      res.ok ? toast.success("Email sent successfully") : toast.error(d.error || "Failed to send email");
    } catch { toast.error("Error sending email"); }
    finally { setSendingEmail(false); }
  }

  const totalL = (data?.totalLiabilities || 0) + (data?.totalEquity || 0);
  const inputStyle: React.CSSProperties = { width:"100%", padding:"11px 14px", borderRadius:10, fontSize:14, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"white", outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
  const sectionCard = (accent: string): React.CSSProperties => ({ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:14, overflow:"hidden" });
  const th: React.CSSProperties = { padding:"10px 16px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".08em", borderBottom:"1px solid rgba(255,255,255,.07)", background:"rgba(255,255,255,.03)" };
  const td: React.CSSProperties = { padding:"10px 16px", fontSize:13, color:"rgba(255,255,255,.7)", borderBottom:"1px solid rgba(255,255,255,.04)" };

  return (
    <div style={{ fontFamily:"'Outfit','Inter',sans-serif", color:"rgba(255,255,255,.85)" }}>

      {/* ── MODAL ── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,.78)", backdropFilter:"blur(14px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:420, background:"rgba(10,13,32,.97)", border:"1px solid rgba(255,255,255,.12)", borderRadius:22, padding:"40px 40px 36px", boxShadow:"0 40px 100px rgba(0,0,0,.8)", position:"relative" }}>
            <button onClick={() => data ? setShowModal(false) : router.back()} style={{ position:"absolute", top:14, right:16, background:"none", border:"none", color:"rgba(255,255,255,.35)", fontSize:20, cursor:"pointer", lineHeight:1, padding:4, borderRadius:6 }}>✕</button>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:28 }}>
              <div style={{ width:46, height:46, borderRadius:14, background:"linear-gradient(135deg,#3b82f6,#2563eb)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🏛️</div>
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:"white", letterSpacing:"-.3px" }}>Balance Sheet</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:2 }}>Select as-of date</div>
              </div>
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:7 }}>As of Date</label>
              <input ref={dateRef} type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} autoFocus onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); handleGenerate(); } }}/>
            </div>
            <button onClick={handleGenerate} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#3b82f6,#2563eb)", color:"white", fontSize:15, fontWeight:700, fontFamily:"inherit", boxShadow:"0 6px 24px rgba(59,130,246,.35)" }}>
              Generate Report →
            </button>
          </div>
        </div>
      )}

      {/* ── REPORT ── */}
      {!showModal && (
        <>
          {/* Top bar */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:10 }}>
            <button onClick={() => setShowModal(true)} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:10, border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.6)", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              ⟵ Change Date
            </button>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => window.print()} style={{ padding:"8px 16px", borderRadius:9, border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.5)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🖨 Print</button>
              <button onClick={sendEmail} disabled={sendingEmail||!data} style={{ padding:"8px 16px", borderRadius:9, border:"1px solid rgba(52,211,153,.3)", background:"rgba(52,211,153,.06)", color:"#34d399", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:(sendingEmail||!data)?0.5:1 }}>
                {sendingEmail ? "Sending…" : "✉ Email"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:10, padding:"12px 16px", marginBottom:20, color:"#f87171", fontSize:13 }}>{error}</div>
          )}

          {loading && (
            <div style={{ textAlign:"center", padding:"80px 0", color:"rgba(255,255,255,.25)", fontSize:14 }}>Loading report…</div>
          )}

          {data && !loading && (
            <>
              {/* Report header */}
              <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:16, padding:"28px 32px", marginBottom:20, background:"linear-gradient(135deg,rgba(59,130,246,.1),rgba(37,99,235,.05))" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
                  <div>
                    <div style={{ fontSize:22, fontWeight:900, color:"white", letterSpacing:"-.5px" }}>{companyName}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", fontWeight:600, textTransform:"uppercase", letterSpacing:".1em", marginTop:4 }}>Balance Sheet Statement</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>As of Date</div>
                    <div style={{ fontSize:16, fontWeight:800, color:"#60a5fa" }}>{date}</div>
                  </div>
                </div>
              </div>

              {/* Two-column layout */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                {/* Assets */}
                <div style={sectionCard("#3b82f6")}>
                  <div style={{ background:"rgba(59,130,246,.12)", padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:"#60a5fa", display:"inline-block" }}/>
                    <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:"#60a5fa" }}>Assets & Receivables</span>
                  </div>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr>
                      <th style={{ ...th, textAlign:"left" }}>Particulars</th>
                      <th style={{ ...th, textAlign:"right" }}>Amount</th>
                    </tr></thead>
                    <tbody>
                      {!data.assets || data.assets.length === 0 ? (
                        <tr><td colSpan={2} style={{ padding:"24px 16px", textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:13 }}>No assets found</td></tr>
                      ) : data.assets.map((a: any, i: number) => (
                        <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                          <td style={td}>{a.name}</td>
                          <td style={{ ...td, textAlign:"right", fontFamily:"monospace", color:"#93c5fd", fontWeight:600 }}>{fmtN(a.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr style={{ background:"rgba(59,130,246,.1)", borderTop:"2px solid rgba(59,130,246,.25)" }}>
                      <td style={{ padding:"12px 16px", fontWeight:700, fontSize:12, textTransform:"uppercase", letterSpacing:.5, color:"#60a5fa" }}>Total Assets</td>
                      <td style={{ padding:"12px 16px", textAlign:"right", fontWeight:900, fontSize:15, color:"#60a5fa", fontFamily:"monospace" }}>{fmtN(data.totalAssets || 0)}</td>
                    </tr></tfoot>
                  </table>
                </div>

                {/* Liabilities & Equity */}
                <div style={sectionCard("#ef4444")}>
                  <div style={{ background:"rgba(239,68,68,.12)", padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:"#f87171", display:"inline-block" }}/>
                    <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:"#f87171" }}>Liabilities & Equity</span>
                  </div>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr>
                      <th style={{ ...th, textAlign:"left" }}>Particulars</th>
                      <th style={{ ...th, textAlign:"right" }}>Amount</th>
                    </tr></thead>
                    <tbody>
                      {data.liabilities?.map((l: any, i: number) => (
                        <tr key={`l-${i}`} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                          <td style={td}>{l.name}</td>
                          <td style={{ ...td, textAlign:"right", fontFamily:"monospace", color:"#fca5a5", fontWeight:600 }}>{fmtN(l.amount)}</td>
                        </tr>
                      ))}
                      {data.equity?.map((e: any, i: number) => (
                        <tr key={`e-${i}`} style={{ borderBottom:"1px solid rgba(255,255,255,.04)", background:"rgba(52,211,153,.03)" }}>
                          <td style={{ ...td, color:"#6ee7b7" }}>{e.name}</td>
                          <td style={{ ...td, textAlign:"right", fontFamily:"monospace", color:"#6ee7b7", fontWeight:600 }}>{fmtN(e.amount)}</td>
                        </tr>
                      ))}
                      {data.netProfit !== undefined && (
                        <tr style={{ borderBottom:"1px solid rgba(255,255,255,.04)", background:"rgba(52,211,153,.05)" }}>
                          <td style={{ ...td, color:"#34d399", fontWeight:600 }}>Net Profit / Loss</td>
                          <td style={{ ...td, textAlign:"right", fontFamily:"monospace", color:"#34d399", fontWeight:700 }}>{fmtN(data.netProfit)}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot><tr style={{ background:"rgba(239,68,68,.1)", borderTop:"2px solid rgba(239,68,68,.25)" }}>
                      <td style={{ padding:"12px 16px", fontWeight:700, fontSize:12, textTransform:"uppercase", letterSpacing:.5, color:"#f87171" }}>Total Liabilities & Equity</td>
                      <td style={{ padding:"12px 16px", textAlign:"right", fontWeight:900, fontSize:15, color:"#f87171", fontFamily:"monospace" }}>{fmtN(totalL)}</td>
                    </tr></tfoot>
                  </table>
                </div>
              </div>

              {/* Balanced indicator */}
              <div style={{
                padding:"18px 24px", borderRadius:14, textAlign:"center", fontSize:16, fontWeight:800, textTransform:"uppercase", letterSpacing:".04em",
                background: data.isBalanced ? "rgba(52,211,153,.1)" : "rgba(239,68,68,.1)",
                border: `2px solid ${data.isBalanced ? "rgba(52,211,153,.35)" : "rgba(239,68,68,.35)"}`,
                color: data.isBalanced ? "#34d399" : "#f87171",
              }}>
                {data.isBalanced
                  ? "✔ BALANCED — Assets = Liabilities + Equity"
                  : `❌ OUT OF BALANCE — Difference: ${fmtN(Math.abs((data.totalAssets||0) - totalL))}`}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
