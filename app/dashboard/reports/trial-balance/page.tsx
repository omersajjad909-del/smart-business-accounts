"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/dateUtils";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

type TBRow = {
  code: string; name: string; category: string;
  opDebit: number; opCredit: number;
  transDebit: number; transCredit: number;
  clDebit: number; clCredit: number;
};
type TBTotals = {
  opDebit: number; opCredit: number;
  transDebit: number; transCredit: number;
  clDebit: number; clCredit: number;
};

const fmt = (n: number, cur = "") =>
  `${cur ? cur + " " : ""}${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const today = new Date().toISOString().slice(0, 10);

const NUM_COLS = ["opDr", "opCr", "trDr", "trCr", "clDr", "clCr"];
const GROUPS = [
  { label: "Opening Balance",     color: "rgba(var(--txr-818cf8, 129,140,248),.5)" },
  { label: "Period Transactions", color: "rgba(var(--txr-34d399, 52,211,153),.4)" },
  { label: "Closing Balance",     color: "rgba(var(--txr-fbbf24, 251,191,36),.4)" },
];

// The report prints as a plain black-on-white sheet. `print-doc-a4` on the card
// lets the shared rule in globals.css hide the sidebar, topbar, toolbar and demo
// timer; this sheet only has to turn the dark card into paper. @page lives here,
// not in globals.css, so only this report prints sideways.
const PRINT_CSS = `
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  /* html.dark .dashboard-root th (globals.css) outranks a bare .tb-doc *, hence the long selectors. */
  .tb-doc, .tb-doc *, html.dark .dashboard-root .tb-doc th, html.dark .dashboard-root .tb-doc td {
    background: #fff !important; color: #000 !important; border-color: #bbb !important;
    box-shadow: none !important; text-shadow: none !important;
  }
  .tb-doc { border: none !important; border-radius: 0 !important; overflow: visible !important; }
  .tb-doc .tb-head:not(#__rp) { padding: 0 0 10px !important; border-bottom: 2px solid var(--dkb-000000, #000) !important; }
  .tb-doc .tb-scroll { overflow: visible !important; }
  .tb-doc table { min-width: 0 !important; font-size: 9pt !important; }
  .tb-doc th, .tb-doc td { padding: 4px 6px !important; font-size: 8.5pt !important; }
  .tb-doc td { white-space: normal !important; }
  .tb-doc .tb-c-code { width: 70px !important; }
  .tb-doc .tb-c-num  { width: 11.5% !important; }
  .tb-doc thead { display: table-header-group; }
  .tb-doc tr { break-inside: avoid; }
  .tb-doc .tb-group:not(#__rp) { border-bottom: 2px solid var(--dkb-000000, #000) !important; }
  .tb-doc .tb-cat-title:not(#__rp) { background: #f1f1f1 !important; font-weight: 800 !important; }
  .tb-doc .tb-subtotal td:not(#__rp) { border-top: 1px solid var(--dkb-000000, #000) !important; font-weight: 700 !important; }
  .tb-doc .tb-grand td:not(#__rp), .tb-doc .tb-diff:not(#__rp) { border-top: 2px solid var(--dkb-000000, #000) !important; font-weight: 800 !important; }
}`;

export default function TrialBalancePage() {
  const router  = useRouter();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef   = useRef<HTMLInputElement>(null);
  const [showModal,    setShowModal]    = useState(true);
  const [fromDate,     setFromDate]     = useState(`${new Date().getFullYear()}-01-01`);
  const [toDate,       setToDate]       = useState(today);
  const [rows,         setRows]         = useState<TBRow[]>([]);
  const [totals,       setTotals]       = useState<TBTotals | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [companyInfo,  setCompanyInfo]  = useState<any>(null);
  const [cleaning,     setCleaning]     = useState(false);
  const [cleanMsg,     setCleanMsg]     = useState("");

  async function loadReport() {
    setLoading(true);
    try {
      const user = getCurrentUser();
      const h = { "x-user-id": user?.id ?? "", "x-user-role": user?.role ?? "", "x-company-id": user?.companyId ?? "" };
      const [tbRes, coRes] = await Promise.all([
        fetch(`/api/reports/trial-balance?from=${fromDate}&to=${toDate}`, { credentials: "include", headers: h }),
        fetch("/api/me/company", { headers: h }),
      ]);
      const tb = await tbRes.json();
      const co = coRes.ok ? await coRes.json() : null;
      setRows(tb.rows || []);
      setTotals(tb.totals || null);
      if (co) setCompanyInfo(co);
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
    setShowModal(false);
    loadReport();
  }

  async function cleanOrphans() {
    setCleaning(true);
    setCleanMsg("");
    try {
      const user = getCurrentUser();
      const h = { "x-user-id": user?.id ?? "", "x-user-role": user?.role ?? "", "x-company-id": user?.companyId ?? "" };
      const r = await fetch("/api/admin/cleanup-vouchers", { method: "POST", headers: h });
      const d = await r.json();
      setCleanMsg(d.message || "Done");
      if ((d.deleted || 0) > 0) loadReport();
    } catch { setCleanMsg("Cleanup failed"); }
    finally { setCleaning(false); }
  }

  const categories = Array.from(new Set(rows.map(r => r.category)));
  const cur = companyInfo?.baseCurrency || "";
  const t = totals ?? { opDebit:0, opCredit:0, transDebit:0, transCredit:0, clDebit:0, clCredit:0 };
  const difference = t.clDebit - t.clCredit;
  const isBalanced = Math.abs(difference) < 0.01;

  const thStyle = (right = false): React.CSSProperties => ({
    padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "rgba(var(--ink),var(--ta-35, .35))",
    letterSpacing: ".08em", textTransform: "uppercase", textAlign: right ? "right" : "left",
    whiteSpace: "nowrap", borderBottom: "1px solid rgba(var(--ink),.08)",
    borderRight: "1px solid rgba(var(--ink),.05)", background: "rgba(var(--ink),.04)",
  });
  const tdStyle = (right = false, bold = false): React.CSSProperties => ({
    padding: "9px 14px", fontSize: 12, textAlign: right ? "right" : "left",
    fontWeight: bold ? 700 : 400, whiteSpace: "nowrap",
    borderBottom: "1px solid rgba(var(--ink),.04)", borderRight: "1px solid rgba(var(--ink),.03)",
    color: "rgba(var(--ink),var(--ta-65, .65))",
  });
  const grandTd: React.CSSProperties = {
    padding: "14px", fontSize: 13, fontWeight: 800, textAlign: "right", whiteSpace: "nowrap",
    borderTop: "2px solid rgba(99,102,241,.3)", borderRight: "1px solid rgba(var(--ink),.04)",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14,
    background: "rgba(var(--ink),.06)", border: "1px solid rgba(var(--ink),.12)",
    color: "var(--ink-solid, white)", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily:"'Outfit','Inter',sans-serif", color:"rgba(var(--ink),.85)" }}>
      <style>{PRINT_CSS}</style>

      {/* ── MODAL ── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,.78)", backdropFilter:"blur(14px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:460, background:"rgba(var(--dkr-0a0d20, 10,13,32),0.97)", border:"1px solid rgba(var(--ink),.12)", borderRadius:22, padding:"40px 40px 36px", boxShadow:"0 40px 100px rgba(0,0,0,.8)", position:"relative" }}>
            <button onClick={() => rows.length > 0 ? setShowModal(false) : router.back()} style={{ position:"absolute", top:14, right:16, background:"none", border:"none", color:"rgba(var(--ink),var(--ta-35, .35))", fontSize:20, cursor:"pointer", lineHeight:1, padding:4, borderRadius:6 }}>✕</button>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:28 }}>
              <div style={{ width:46, height:46, borderRadius:14, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>⚖️</div>
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:"var(--ink-solid, white)", letterSpacing:"-.3px" }}>Trial Balance</div>
                <div style={{ fontSize:12, color:"rgba(var(--ink),var(--ta-35, .35))", marginTop:2 }}>Select reporting period</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:22 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:"rgba(var(--ink),var(--ta-35, .35))", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:7 }}>From</label>
                <DateInput ref={fromRef} value={fromDate} onChange={setFromDate} style={inputStyle} autoFocus onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); toRef.current?.focus(); } }}/>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:"rgba(var(--ink),var(--ta-35, .35))", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:7 }}>To</label>
                <DateInput ref={toRef} value={toDate} onChange={setToDate} style={inputStyle} onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); handleGenerate(); } }}/>
              </div>
            </div>
            <button onClick={handleGenerate} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"white", fontSize:15, fontWeight:700, fontFamily:"inherit", boxShadow:"0 6px 24px rgba(99,102,241,.4)" }}>
              Generate Report →
            </button>
          </div>
        </div>
      )}

      {/* ── REPORT ── */}
      {!showModal && (
        <>
          {/* Top bar */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:10 }} className="print:hidden">
            <button onClick={() => setShowModal(true)} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:10, border:"1px solid rgba(var(--ink),.1)", background:"rgba(var(--ink),.04)", color:"rgba(var(--ink),var(--ta-60, .6))", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              ⟵ Change Dates
            </button>
            <div style={{ display:"flex", gap:8 }}>
              {rows.length > 0 && (
                <button onClick={() => exportToCSV(rows.map(r => ({ Category:r.category, Code:r.code, Account:r.name, "Op Dr":r.opDebit, "Op Cr":r.opCredit, "Tr Dr":r.transDebit, "Tr Cr":r.transCredit, "Cl Dr":r.clDebit, "Cl Cr":r.clCredit })), "trial-balance")}
                  style={{ padding:"8px 16px", borderRadius:9, border:"1px solid rgba(52,211,153,.3)", background:"rgba(52,211,153,.06)", color:"var(--tx-34d399, #34d399)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  ↓ Export CSV
                </button>
              )}
              <button onClick={() => window.print()} style={{ padding:"8px 16px", borderRadius:9, border:"1px solid rgba(var(--ink),.1)", background:"rgba(var(--ink),.04)", color:"rgba(var(--ink),var(--ta-50, .5))", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                🖨 Print
              </button>
              <button
                onClick={cleanOrphans}
                disabled={cleaning}
                title="Delete voucher entries of deleted invoices"
                style={{ padding:"8px 16px", borderRadius:9, border:"1px solid rgba(248,113,113,.25)", background:"rgba(248,113,113,.06)", color:"var(--tx-f87171, #f87171)", fontSize:12, fontWeight:700, cursor: cleaning ? "not-allowed" : "pointer", fontFamily:"inherit", opacity: cleaning ? 0.6 : 1 }}
              >
                {cleaning ? "Cleaning…" : "🧹 Fix Orphans"}
              </button>
              {cleanMsg && (
                <span style={{ fontSize:12, color:"var(--tx-34d399, #34d399)", fontWeight:600, alignSelf:"center" }}>{cleanMsg}</span>
              )}
            </div>
          </div>

          <div className="print-doc-a4 tb-doc" style={{ background:"rgba(var(--ink),.03)", border:"1px solid rgba(var(--ink),.08)", borderRadius:16, overflow:"hidden" }}>
            {/* Header */}
            <div className="tb-head" style={{ padding:"32px 36px 28px", background:"linear-gradient(135deg,rgba(99,102,241,.12),rgba(79,70,229,.06))", borderBottom:"1px solid rgba(var(--ink),.08)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:22, fontWeight:900, letterSpacing:"-.5px", color:"var(--ink-solid, white)" }}>{companyInfo?.name || "—"}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:"rgba(var(--ink),var(--ta-30, .3))", letterSpacing:".14em", textTransform:"uppercase", marginTop:5 }}>{companyInfo?.country || "Global"} Operations</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:800, color:"var(--tx-818cf8, #818cf8)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:6 }}>Trial Balance</div>
                  <div style={{ fontSize:10, color:"rgba(var(--ink),var(--ta-30, .3))", fontWeight:600, textTransform:"uppercase", letterSpacing:".08em", marginBottom:3 }}>Reporting Period</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"rgba(var(--ink),var(--ta-70, .7))" }}>{fromDate} <span style={{ color:"rgba(var(--ink),var(--ta-25, .25))" }}>—</span> {toDate}</div>
                  <div style={{ fontSize:11, color:"rgba(var(--ink),var(--ta-25, .25))", marginTop:8 }}>Generated: {fmtDate(new Date())}</div>
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding:"80px 0", textAlign:"center", color:"rgba(var(--ink),var(--ta-25, .25))", fontSize:13 }}>Loading report…</div>
            ) : rows.length === 0 ? (
              <div style={{ padding:"80px 0", textAlign:"center", color:"rgba(var(--ink),var(--ta-20, .2))", fontSize:13 }}>No data found for this period</div>
            ) : (
              <>
                {/* One table for every category, so each column sits on the same line from top to bottom.
                    Separate tables per category each sized their own columns and never lined up. */}
                <div className="tb-scroll" style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", minWidth:1040, borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }}>
                    <colgroup>
                      <col className="tb-c-code" style={{ width:110 }}/>
                      <col/>
                      {NUM_COLS.map(k => <col key={k} className="tb-c-num" style={{ width:140 }}/>)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th colSpan={2} style={{ borderBottom:"none" }}/>
                        {GROUPS.map(g => (
                          <th key={g.label} colSpan={2} className="tb-group" style={{ padding:"14px 0 6px", fontSize:9, fontWeight:700, color:g.color, letterSpacing:".1em", textTransform:"uppercase", textAlign:"center", borderBottom:`2px solid ${g.color}` }}>{g.label}</th>
                        ))}
                      </tr>
                      <tr>
                        <th style={thStyle()}>Code</th>
                        <th style={thStyle()}>Account Name</th>
                        <th style={thStyle(true)}>Op Dr</th><th style={thStyle(true)}>Op Cr</th>
                        <th style={{ ...thStyle(true), color:"rgba(var(--txr-34d399, 52,211,153),.6)" }}>Tr Dr</th>
                        <th style={{ ...thStyle(true), color:"rgba(var(--txr-34d399, 52,211,153),.6)" }}>Tr Cr</th>
                        <th style={{ ...thStyle(true), color:"rgba(var(--txr-fbbf24, 251,191,36),.6)" }}>Cl Dr</th>
                        <th style={{ ...thStyle(true), color:"rgba(var(--txr-fbbf24, 251,191,36),.6)", borderRight:"none" }}>Cl Cr</th>
                      </tr>
                    </thead>
                    {categories.map(cat => {
                      const list = rows.filter(r => r.category === cat);
                      const sub = list.reduce((a, r) => ({ opD:a.opD+(r.opDebit||0), opC:a.opC+(r.opCredit||0), trD:a.trD+(r.transDebit||0), trC:a.trC+(r.transCredit||0), clD:a.clD+(r.clDebit||0), clC:a.clC+(r.clCredit||0) }), { opD:0, opC:0, trD:0, trC:0, clD:0, clC:0 });
                      return (
                        <tbody key={cat} className="tb-cat">
                          <tr>
                            <td colSpan={8} className="tb-cat-title" style={{ padding:"10px 20px", fontSize:10, fontWeight:800, color:"var(--tx-818cf8, #818cf8)", letterSpacing:".1em", textTransform:"uppercase", background:"rgba(99,102,241,.06)", borderTop:"1px solid rgba(var(--ink),.06)", borderBottom:"1px solid rgba(var(--ink),.05)" }}>{cat}</td>
                          </tr>
                          {list.map((r, i) => (
                            <tr key={i} style={{ background: i%2===0 ? "transparent" : "rgba(var(--ink),.012)" }}
                              onMouseEnter={e => (e.currentTarget.style.background="rgba(99,102,241,.05)")}
                              onMouseLeave={e => (e.currentTarget.style.background=i%2===0?"transparent":"rgba(var(--ink),.012)")}>
                              <td style={{ ...tdStyle(), color:"var(--tx-818cf8, #818cf8)", fontWeight:600, fontSize:11 }}>{r.code}</td>
                              <td style={{ ...tdStyle(), color:"rgba(var(--ink),.8)", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis" }} title={r.name}>{r.name}</td>
                              <td style={tdStyle(true)}>{r.opDebit  ? fmt(r.opDebit)  : "—"}</td>
                              <td style={tdStyle(true)}>{r.opCredit ? fmt(r.opCredit) : "—"}</td>
                              <td style={{ ...tdStyle(true), color:r.transDebit  ? "var(--tx-34d399, #34d399)":"rgba(var(--ink),var(--ta-20, .2))" }}>{r.transDebit  ? fmt(r.transDebit)  : "—"}</td>
                              <td style={{ ...tdStyle(true), color:r.transCredit ? "var(--tx-f87171, #f87171)":"rgba(var(--ink),var(--ta-20, .2))" }}>{r.transCredit ? fmt(r.transCredit) : "—"}</td>
                              <td style={{ ...tdStyle(true,true), color:r.clDebit  ? "var(--tx-fbbf24, #fbbf24)":"rgba(var(--ink),var(--ta-20, .2))" }}>{r.clDebit  ? fmt(r.clDebit)  : "—"}</td>
                              <td style={{ ...tdStyle(true,true), color:r.clCredit ? "var(--tx-fbbf24, #fbbf24)":"rgba(var(--ink),var(--ta-20, .2))", borderRight:"none" }}>{r.clCredit ? fmt(r.clCredit) : "—"}</td>
                            </tr>
                          ))}
                          <tr className="tb-subtotal" style={{ background:"rgba(var(--ink),.03)" }}>
                            <td colSpan={2} style={{ ...tdStyle(), fontSize:10, fontWeight:700, color:"rgba(var(--ink),var(--ta-30, .3))", letterSpacing:".06em", textTransform:"uppercase" }}>{cat} Subtotal</td>
                            <td style={{ ...tdStyle(true,true), color:"rgba(var(--ink),var(--ta-50, .5))" }}>{fmt(sub.opD)}</td>
                            <td style={{ ...tdStyle(true,true), color:"rgba(var(--ink),var(--ta-50, .5))" }}>{fmt(sub.opC)}</td>
                            <td style={{ ...tdStyle(true,true), color:"var(--tx-34d399, #34d399)" }}>{fmt(sub.trD)}</td>
                            <td style={{ ...tdStyle(true,true), color:"var(--tx-f87171, #f87171)" }}>{fmt(sub.trC)}</td>
                            <td style={{ ...tdStyle(true,true), color:"var(--tx-fbbf24, #fbbf24)" }}>{fmt(sub.clD)}</td>
                            <td style={{ ...tdStyle(true,true), color:"var(--tx-fbbf24, #fbbf24)", borderRight:"none" }}>{fmt(sub.clC)}</td>
                          </tr>
                        </tbody>
                      );
                    })}
                    <tfoot>
                      <tr className="tb-grand" style={{ background:"rgba(99,102,241,.08)" }}>
                        <td colSpan={2} style={{ ...grandTd, textAlign:"left", fontSize:10, fontWeight:800, color:"rgba(var(--ink),var(--ta-40, .4))", letterSpacing:".1em", textTransform:"uppercase" }}>
                          Grand Total{cur ? ` (${cur})` : ""}
                        </td>
                        <td style={{ ...grandTd, color:"rgba(var(--ink),var(--ta-70, .7))" }}>{fmt(t.opDebit)}</td>
                        <td style={{ ...grandTd, color:"rgba(var(--ink),var(--ta-70, .7))" }}>{fmt(t.opCredit)}</td>
                        <td style={{ ...grandTd, color:"var(--tx-34d399, #34d399)" }}>{fmt(t.transDebit)}</td>
                        <td style={{ ...grandTd, color:"var(--tx-f87171, #f87171)" }}>{fmt(t.transCredit)}</td>
                        <td style={{ ...grandTd, color:"var(--tx-fbbf24, #fbbf24)" }}>{fmt(t.clDebit)}</td>
                        <td style={{ ...grandTd, color:"var(--tx-fbbf24, #fbbf24)", borderRight:"none" }}>{fmt(t.clCredit)}</td>
                      </tr>
                      <tr>
                        <td colSpan={8} className="tb-diff" style={{ padding:"14px 20px", textAlign:"right", background:isBalanced?"rgba(52,211,153,.07)":"rgba(248,113,113,.07)", borderTop:`1px solid ${isBalanced?"rgba(52,211,153,.25)":"rgba(248,113,113,.25)"}` }}>
                          <span style={{ fontSize:10, fontWeight:700, color:"rgba(var(--ink),var(--ta-35, .35))", letterSpacing:".1em", textTransform:"uppercase", marginRight:14 }}>Difference</span>
                          <span style={{ fontSize:16, fontWeight:900, color:isBalanced?"var(--tx-34d399, #34d399)":"var(--tx-f87171, #f87171)" }}>{isBalanced ? "✓ Balanced" : fmt(Math.abs(difference), cur)}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {cur && <div style={{ padding:"12px 24px", borderTop:"1px solid rgba(var(--ink),.05)", fontSize:11, color:"rgba(var(--ink),var(--ta-20, .2))" }}>All amounts in {cur}</div>}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
