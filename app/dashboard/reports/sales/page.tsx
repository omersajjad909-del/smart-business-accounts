"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

type Account = { id: string; name: string };
type Row = { date: string; invoiceNo: string; customer: string; item: string; unit: string; qty: number; rate: number; amount: number; status: string };

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 8, color: "rgba(255,255,255,.85)", padding: "10px 14px",
  fontSize: 13, fontFamily: ff, outline: "none", width: "100%", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)",
  letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6, display: "block",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: "pointer", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,.4)' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32,
};

export default function SalesReportPage() {
  const router = useRouter();
  const today  = new Date().toISOString().slice(0, 10);

  // Modal params
  const [showModal,   setShowModal]   = useState(true);
  const [from,        setFrom]        = useState(`${new Date().getFullYear()}-01-01`);
  const [to,          setTo]          = useState(today);
  const [customerId,  setCustomerId]  = useState("");
  const [unitParam,   setUnitParam]   = useState("");
  const [itemSearch,  setItemSearch]  = useState("");
  const [statusParam, setStatusParam] = useState("");

  // Data
  const [customers, setCustomers] = useState<Account[]>([]);
  const [units,     setUnits]     = useState<string[]>([]);
  const [rows,      setRows]      = useState<Row[]>([]);
  const [loading,   setLoading]   = useState(false);

  // Refs for keyboard nav
  const fromRef   = useRef<HTMLInputElement>(null);
  const toRef     = useRef<HTMLInputElement>(null);
  const itemRef   = useRef<HTMLInputElement>(null);

  const user = getCurrentUser();
  const h = () => ({ "x-user-id": user?.id||"", "x-user-role": user?.role||"", "x-company-id": user?.companyId||"" });

  useEffect(() => {
    fetch("/api/accounts", { credentials: "include", headers: h() })
      .then(r => r.json())
      .then(d => setCustomers((Array.isArray(d) ? d : []).filter((a: any) => a.partyType === "CUSTOMER")))
      .catch(() => {});
    // Pre-fetch units from stock
    fetch("/api/reports/stock", { credentials: "include", headers: h() })
      .then(r => r.ok ? r.json() : [])
      .then((d: any[]) => {
        const u = Array.from(new Set(d.map((r: any) => r.unit).filter(Boolean))).sort() as string[];
        setUnits(u);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateReport() {
    setLoading(true);
    setShowModal(false);
    const qs = new URLSearchParams({
      from, to,
      ...(customerId && { customerId }),
      ...(unitParam   && { unit: unitParam }),
      ...(itemSearch  && { item: itemSearch }),
      ...(statusParam && { status: statusParam }),
    });
    try {
      const r = await fetch(`/api/reports/sales?${qs}`, { credentials: "include", headers: h() });
      const d = await r.json();
      setRows(Array.isArray(d) ? d : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }

  const totalQty    = rows.reduce((s, r) => s + (Number(r.qty)    || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const uniqueInvoices  = new Set(rows.map(r => r.invoiceNo)).size;
  const uniqueCustomers = new Set(rows.map(r => r.customer)).size;

  return (
    <div style={{ fontFamily: ff, color: "rgba(255,255,255,.85)", minHeight: "100vh" }}>

      {/* ── PARAMETER MODAL ── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,.72)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "linear-gradient(145deg,#0f1a35,#0b1225)",
            border: "1px solid rgba(52,211,153,.2)",
            borderRadius: 18, padding: "36px 40px", width: "100%", maxWidth: 500,
            boxShadow: "0 32px 80px rgba(0,0,0,.6)", position: "relative",
          }}>
            <button
              onClick={() => router.back()}
              style={{ position:"absolute", top:14, right:16, background:"none", border:"none", color:"rgba(255,255,255,.35)", fontSize:20, cursor:"pointer", padding:4, borderRadius:6, fontFamily:ff }}
            >✕</button>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <div style={{ width:4, height:24, borderRadius:2, background:"linear-gradient(180deg,#34d399,#10b981)" }}/>
                <h2 style={{ margin:0, fontSize:20, fontWeight:800, letterSpacing:"-.3px" }}>Sale Reports</h2>
              </div>
              <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,.3)", paddingLeft:14 }}>
                Enter parameters to generate sales report
              </p>
            </div>

            {/* From / To Date */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
              <div>
                <label style={labelStyle}>From Date</label>
                <input ref={fromRef} type="date" value={from} onChange={e => setFrom(e.target.value)}
                  style={{ ...inputStyle, colorScheme:"dark" }} autoFocus
                  onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); toRef.current?.focus(); } }}
                />
              </div>
              <div>
                <label style={labelStyle}>To Date</label>
                <input ref={toRef} type="date" value={to} onChange={e => setTo(e.target.value)}
                  style={{ ...inputStyle, colorScheme:"dark" }}
                  onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); } }}
                />
              </div>
            </div>

            {/* Party (Customer) */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Party (Customer)</label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={selectStyle}>
                <option value="">— All Customers —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Unit / Item row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
              <div>
                <label style={labelStyle}>Unit</label>
                <select value={unitParam} onChange={e => setUnitParam(e.target.value)} style={selectStyle}>
                  <option value="">— ALL —</option>
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Item</label>
                <input ref={itemRef} type="text" placeholder="Search item…" value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)} style={inputStyle}
                  onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); generateReport(); } }}
                />
              </div>
            </div>

            {/* Status (Type) */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Status / Type</label>
              <select value={statusParam} onChange={e => setStatusParam(e.target.value)} style={selectStyle}>
                <option value="">— All —</option>
                <option value="APPROVED">Approved</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Generate */}
            <button
              onClick={generateReport}
              style={{
                width:"100%", padding:"13px 0", borderRadius:10, border:"none",
                background:"linear-gradient(135deg,#34d399,#10b981)",
                color:"white", fontSize:14, fontWeight:800, cursor:"pointer",
                fontFamily:ff, boxShadow:"0 6px 20px rgba(52,211,153,.3)",
                letterSpacing:".02em",
              }}
            >
              Preview Report →
            </button>
          </div>
        </div>
      )}

      {/* ── FULL PAGE REPORT ── */}
      {!showModal && (
        <div style={{ padding:"28px 32px", maxWidth:1140, margin:"0 auto" }}>

          {/* Top bar */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:"rgba(52,211,153,.12)", border:"1px solid rgba(52,211,153,.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📊</div>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:"white" }}>Sales Report</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2 }}>
                  {from} → {to}
                  {customerId && customers.find(c=>c.id===customerId) ? ` · ${customers.find(c=>c.id===customerId)!.name}` : ""}
                  {unitParam ? ` · Unit: ${unitParam}` : ""}
                  {itemSearch ? ` · Item: ${itemSearch}` : ""}
                  {statusParam ? ` · ${statusParam}` : ""}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setShowModal(true)}
                style={{ padding:"8px 16px", borderRadius:9, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.25)", color:"#34d399", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff }}>
                ⚙ Parameters
              </button>
              {rows.length > 0 && (
                <button onClick={() => exportToCSV(rows, "sales-report")}
                  style={{ padding:"8px 14px", borderRadius:9, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.2)", color:"#34d399", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff, display:"flex", alignItems:"center", gap:6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export CSV
                </button>
              )}
              <button onClick={() => window.print()}
                style={{ padding:"8px 14px", borderRadius:9, background:"transparent", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.5)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff }}>
                🖨 Print
              </button>
              <button onClick={() => router.back()}
                style={{ width:34, height:34, borderRadius:8, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.2)", color:"#f87171", fontSize:16, cursor:"pointer", fontFamily:ff, display:"flex", alignItems:"center", justifyContent:"center" }}>
                ✕
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
            {[
              { label:"Total Invoices",  val: uniqueInvoices,            color:"#818cf8", icon:"🧾" },
              { label:"Customers",       val: uniqueCustomers,           color:"#38bdf8", icon:"👥" },
              { label:"Total Qty",       val: fmt(totalQty),             color:"#fbbf24", icon:"📦" },
              { label:"Total Amount",    val: `Rs ${fmt(totalAmount)}`,  color:"#34d399", icon:"💰" },
            ].map(k => (
              <div key={k.label} style={{ padding:"14px 16px", borderRadius:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:20 }}>{k.icon}</span>
                <div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em" }}>{k.label}</div>
                  <div style={{ fontSize:18, fontWeight:900, color:k.color, lineHeight:1.3 }}>{k.val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ borderRadius:12, border:"1px solid rgba(255,255,255,.08)", overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.02)" }}>
                  {["#","Date","Invoice","Customer","Item","Unit","Qty","Rate","Amount","Status"].map((h, i) => (
                    <th key={h} style={{ padding:"11px 12px", fontSize:11, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".06em", textAlign: i>5 ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ padding:56, textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:13 }}>Fetching data…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding:56, textAlign:"center" }}>
                    <div style={{ fontSize:36, marginBottom:8 }}>📊</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.3)", fontWeight:600 }}>No sales data found</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.2)", marginTop:4 }}>Try changing the parameters</div>
                  </td></tr>
                ) : rows.map((r, i) => (
                  <tr key={i}
                    style={{ borderBottom:"1px solid rgba(255,255,255,.05)", background:i%2===0?"transparent":"rgba(255,255,255,.01)", transition:"background .15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background="rgba(99,102,241,.05)")}
                    onMouseLeave={e => (e.currentTarget.style.background=i%2===0?"transparent":"rgba(255,255,255,.01)")}
                  >
                    <td style={{ padding:"10px 12px", fontSize:11, color:"rgba(255,255,255,.25)", fontWeight:600 }}>{i+1}</td>
                    <td style={{ padding:"10px 12px", fontSize:12, color:"rgba(255,255,255,.5)" }}>{r.date}</td>
                    <td style={{ padding:"10px 12px", fontSize:12, fontWeight:700, color:"#818cf8" }}>#{r.invoiceNo}</td>
                    <td style={{ padding:"10px 12px", fontSize:12, fontWeight:600, color:"rgba(255,255,255,.8)" }}>{r.customer}</td>
                    <td style={{ padding:"10px 12px", fontSize:12, color:"rgba(255,255,255,.6)" }}>{r.item}</td>
                    <td style={{ padding:"10px 12px", fontSize:11, color:"rgba(255,255,255,.35)", fontWeight:600 }}>{r.unit}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", fontSize:12, fontWeight:700, color:"rgba(255,255,255,.7)" }}>{fmt(r.qty)}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", fontSize:12, color:"rgba(255,255,255,.45)" }}>{fmt(r.rate)}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", fontSize:13, fontWeight:800, color:"#34d399" }}>{fmt(r.amount)}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right" }}>
                      <span style={{
                        display:"inline-block", padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700,
                        background: r.status==="APPROVED"?"rgba(52,211,153,.12)":r.status==="DRAFT"?"rgba(129,140,248,.12)":r.status==="PENDING"?"rgba(251,191,36,.12)":"rgba(248,113,113,.12)",
                        color: r.status==="APPROVED"?"#34d399":r.status==="DRAFT"?"#818cf8":r.status==="PENDING"?"#fbbf24":"#f87171",
                      }}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {!loading && rows.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop:"1px solid rgba(255,255,255,.1)", background:"rgba(52,211,153,.04)" }}>
                    <td colSpan={6} style={{ padding:"13px 12px", fontSize:11, fontWeight:800, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em" }}>
                      Grand Total — {rows.length} line item{rows.length!==1?"s":""}
                    </td>
                    <td style={{ padding:"13px 12px", textAlign:"right", fontSize:15, fontWeight:900, color:"#818cf8" }}>{fmt(totalQty)}</td>
                    <td/>
                    <td style={{ padding:"13px 12px", textAlign:"right", fontSize:15, fontWeight:900, color:"#34d399" }}>Rs {fmt(totalAmount)}</td>
                    <td/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
