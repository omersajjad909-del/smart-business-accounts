"use client";

import toast from "react-hot-toast";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import { getCurrentUser } from "@/lib/auth";

interface PLItem { name: string; amount: number; }
interface PLReport {
  income: PLItem[]; expense: PLItem[];
  totalIncome: number; totalExpense: number;
  grossProfit: number; netProfit: number;
}

const fmt = (n: number | undefined | null) =>
  (n === undefined || n === null) ? "—" : Math.abs(n).toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 });

const todayStr = () => new Date().toISOString().slice(0, 10);
const firstOfYear = () => `${new Date().getFullYear()}-01-01`;

function getHeaders(): Record<string, string> {
  const user = getCurrentUser();
  if (!user) return {};
  return { "x-user-id": user.id, "x-user-role": user.role ?? "", "x-company-id": user.companyId ?? "" };
}

export default function ProfitLossPage() {
  const router  = useRouter();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef   = useRef<HTMLInputElement>(null);
  const [showModal,     setShowModal]     = useState(true);
  const [from,          setFrom]          = useState(firstOfYear());
  const [to,            setTo]            = useState(todayStr());
  const [report,        setReport]        = useState<PLReport | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [sendingEmail,  setSendingEmail]  = useState(false);

  async function loadReport() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/reports/profit-loss?from=${from}&to=${to}`, { headers: getHeaders(), credentials: "include" });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed to load report"); return; }
      setReport(d);
    } catch { setError("Network error — could not load report"); }
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
        method: "POST", credentials: "include",
        headers: { "Content-Type":"application/json", "x-user-role": user?.role ?? "", "x-user-id": user?.id ?? "", "x-company-id": user?.companyId ?? "" },
        body: JSON.stringify({ type:"custom", to:email, subject:`Profit & Loss Report: ${from} to ${to}`, message:`P&L report for the period ${from} to ${to}.` }),
      });
      const data = await res.json();
      res.ok ? toast.success("Email sent successfully") : toast.error(data.error || "Failed to send email");
    } catch { toast.error("Error sending email"); }
    finally { setSendingEmail(false); }
  }

  const profit = report?.netProfit ?? 0;
  const isProfitable = profit >= 0;
  const inputStyle: React.CSSProperties = { width:"100%", padding:"11px 14px", borderRadius:10, fontSize:14, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"white", outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
  const card: React.CSSProperties = { background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:14, overflow:"hidden" };

  return (
    <div style={{ fontFamily:"'Outfit','Inter',sans-serif", color:"rgba(255,255,255,.85)" }}>

      {/* ── MODAL ── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,.78)", backdropFilter:"blur(14px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:460, background:"rgba(10,13,32,.97)", border:"1px solid rgba(255,255,255,.12)", borderRadius:22, padding:"40px 40px 36px", boxShadow:"0 40px 100px rgba(0,0,0,.8)", position:"relative" }}>
            <button onClick={() => report ? setShowModal(false) : router.back()} style={{ position:"absolute", top:14, right:16, background:"none", border:"none", color:"rgba(255,255,255,.35)", fontSize:20, cursor:"pointer", lineHeight:1, padding:4, borderRadius:6 }}>✕</button>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:28 }}>
              <div style={{ width:46, height:46, borderRadius:14, background:"linear-gradient(135deg,#10b981,#059669)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>📊</div>
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:"white", letterSpacing:"-.3px" }}>Profit & Loss</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:2 }}>Select reporting period</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:22 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:7 }}>From</label>
                <DateInput ref={fromRef} value={from} onChange={setFrom} style={inputStyle} autoFocus onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); toRef.current?.focus(); } }}/>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:7 }}>To</label>
                <DateInput ref={toRef} value={to} onChange={setTo} style={inputStyle} onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); handleGenerate(); } }}/>
              </div>
            </div>
            <button onClick={handleGenerate} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#10b981,#059669)", color:"white", fontSize:15, fontWeight:700, fontFamily:"inherit", boxShadow:"0 6px 24px rgba(16,185,129,.35)" }}>
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
              ⟵ Change Dates
            </button>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => window.print()} style={{ padding:"8px 16px", borderRadius:9, border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.5)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🖨 Print</button>
              <button onClick={sendEmail} disabled={sendingEmail || !report} style={{ padding:"8px 16px", borderRadius:9, border:"1px solid rgba(52,211,153,.3)", background:"rgba(52,211,153,.06)", color:"#34d399", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:(sendingEmail||!report)?0.5:1 }}>
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

          {report && !loading && (
            <>
              {/* Period label */}
              <div style={{ textAlign:"center", marginBottom:20, fontSize:13, color:"rgba(255,255,255,.4)" }}>
                Period: <strong style={{ color:"white" }}>{from}</strong> to <strong style={{ color:"white" }}>{to}</strong>
              </div>

              {/* KPI row */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
                {[
                  { label:"Total Revenue",  val:report.totalIncome,  color:"#34d399", bg:"rgba(52,211,153,.08)",  border:"rgba(52,211,153,.2)"  },
                  { label:"Total Expenses", val:report.totalExpense, color:"#f87171", bg:"rgba(248,113,113,.08)", border:"rgba(248,113,113,.2)" },
                  { label:isProfitable?"Net Profit":"Net Loss", val:profit, color:isProfitable?"#34d399":"#f87171", bg:isProfitable?"rgba(52,211,153,.08)":"rgba(248,113,113,.08)", border:isProfitable?"rgba(52,211,153,.2)":"rgba(248,113,113,.2)" },
                ].map(k => (
                  <div key={k.label} style={{ background:k.bg, border:`1px solid ${k.border}`, borderRadius:14, padding:"18px 20px" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>{k.label}</div>
                    <div style={{ fontSize:26, fontWeight:900, color:k.color }}>{!isProfitable && k.label.includes("Net") ? "−" : ""}{fmt(k.val)}</div>
                  </div>
                ))}
              </div>

              {/* Two-column income/expense */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                {/* Expenses */}
                <div style={card}>
                  <div style={{ background:"rgba(239,68,68,.1)", padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:"#f87171", display:"inline-block" }}/>
                    <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:"#f87171" }}>Expenses / Outflows</span>
                  </div>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <tbody>
                      {report.expense.length === 0 ? (
                        <tr><td colSpan={2} style={{ padding:"24px 16px", textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:13 }}>No expenses in this period</td></tr>
                      ) : report.expense.map((item, i) => (
                        <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                          <td style={{ padding:"10px 16px", fontSize:13, color:"rgba(255,255,255,.7)" }}>{item.name}</td>
                          <td style={{ padding:"10px 16px", textAlign:"right", fontWeight:600, fontSize:13, color:"#fca5a5" }}>{fmt(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background:"rgba(239,68,68,.07)", borderTop:"2px solid rgba(239,68,68,.2)" }}>
                        <td style={{ padding:"12px 16px", fontWeight:700, fontSize:12, textTransform:"uppercase", letterSpacing:.5, color:"#f87171" }}>Total Expenses</td>
                        <td style={{ padding:"12px 16px", textAlign:"right", fontWeight:800, fontSize:15, color:"#f87171" }}>{fmt(report.totalExpense)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Income */}
                <div style={card}>
                  <div style={{ background:"rgba(34,197,94,.08)", padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:"#4ade80", display:"inline-block" }}/>
                    <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:"#4ade80" }}>Income / Inflows</span>
                  </div>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <tbody>
                      {report.income.length === 0 ? (
                        <tr><td colSpan={2} style={{ padding:"24px 16px", textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:13 }}>No income in this period</td></tr>
                      ) : report.income.map((item, i) => (
                        <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                          <td style={{ padding:"10px 16px", fontSize:13, color:"rgba(255,255,255,.7)" }}>{item.name}</td>
                          <td style={{ padding:"10px 16px", textAlign:"right", fontWeight:600, fontSize:13, color:"#86efac" }}>{fmt(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background:"rgba(34,197,94,.07)", borderTop:"2px solid rgba(34,197,94,.2)" }}>
                        <td style={{ padding:"12px 16px", fontWeight:700, fontSize:12, textTransform:"uppercase", letterSpacing:.5, color:"#4ade80" }}>Total Income</td>
                        <td style={{ padding:"12px 16px", textAlign:"right", fontWeight:800, fontSize:15, color:"#4ade80" }}>{fmt(report.totalIncome)}</td>
                      </tr>
                    </tfoot>
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
