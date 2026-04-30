"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function fmtAmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

type Row = {
  itemId: string; itemCode: string; itemName: string; unit: string; description: string;
  purchasedQty: number; soldQty: number; remainingQty: number;
  purchasedAmt: number; soldAmt: number; remainingAmt: number;
};

type ViewOf = "all" | "remaining" | "nill";

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

function exportCSV(rows: Row[], asOn: string) {
  const header = ["#","Code","Item Name","Unit","Purchased Qty","Purchased Amt","Sold Qty","Sold Amt","Remaining Qty","Remaining Amt"].join(",");
  const lines  = rows.map((r, i) =>
    [i+1, r.itemCode, `"${r.itemName}"`, r.unit, r.purchasedQty, r.purchasedAmt, r.soldQty, r.soldAmt, r.remainingQty, r.remainingAmt].join(",")
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `stock-report-${asOn}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function StockReportPage() {
  const router  = useRouter();
  const today   = new Date().toISOString().slice(0, 10);

  const [showModal, setShowModal] = useState(true);
  const [asOn,      setAsOn]      = useState(today);
  const [unitParam, setUnitParam] = useState("");
  const [viewOf,    setViewOf]    = useState<ViewOf>("all");
  const [search,    setSearch]    = useState("");

  const [rows,    setRows]    = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [units,   setUnits]   = useState<string[]>([]);

  const phrRef  = useRef<HTMLInputElement>(null);

  const user = getCurrentUser();
  const h = () => ({ "x-user-id": user?.id||"", "x-user-role": user?.role||"", "x-company-id": user?.companyId||"" });

  useEffect(() => {
    fetch("/api/reports/stock", { credentials: "include", headers: h() })
      .then(r => r.ok ? r.json() : [])
      .then((d: Row[]) => {
        const u = Array.from(new Set(d.map(r => r.unit).filter(Boolean))).sort() as string[];
        setUnits(u);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateReport() {
    setLoading(true);
    setShowModal(false);
    try {
      const qs = new URLSearchParams({ asOn, ...(unitParam && { unit: unitParam }) });
      const r  = await fetch(`/api/reports/stock?${qs}`, { credentials: "include", headers: h() });
      const d  = await r.json();
      setRows(Array.isArray(d) ? d : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }

  const filtered = rows.filter(r => {
    if (search && !r.itemName.toLowerCase().includes(search.toLowerCase()) && !r.itemCode.toLowerCase().includes(search.toLowerCase())) return false;
    if (viewOf === "remaining" && r.remainingQty <= 0) return false;
    if (viewOf === "nill"      && r.remainingQty >  0) return false;
    return true;
  });

  const totalPurchasedQty  = filtered.reduce((s, r) => s + r.purchasedQty,  0);
  const totalSoldQty       = filtered.reduce((s, r) => s + r.soldQty,       0);
  const totalRemainingQty  = filtered.reduce((s, r) => s + r.remainingQty,  0);
  const totalPurchasedAmt  = filtered.reduce((s, r) => s + r.purchasedAmt,  0);
  const totalSoldAmt       = filtered.reduce((s, r) => s + r.soldAmt,       0);
  const totalRemainingAmt  = filtered.reduce((s, r) => s + r.remainingAmt,  0);

  const inStockCount  = rows.filter(r => r.remainingQty >  0).length;
  const nillCount     = rows.filter(r => r.remainingQty <= 0).length;

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
            border: "1px solid rgba(129,140,248,.25)",
            borderRadius: 18, padding: "36px 40px", width: "100%", maxWidth: 440,
            boxShadow: "0 32px 80px rgba(0,0,0,.6)", position: "relative",
          }}>
            <button onClick={() => router.back()} style={{ position:"absolute", top:14, right:16, background:"none", border:"none", color:"rgba(255,255,255,.35)", fontSize:20, cursor:"pointer", padding:4, borderRadius:6, fontFamily:ff }}>✕</button>

            <div style={{ marginBottom: 28 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <div style={{ width:4, height:24, borderRadius:2, background:"linear-gradient(180deg,#818cf8,#6366f1)" }}/>
                <h2 style={{ margin:0, fontSize:20, fontWeight:800, letterSpacing:"-.3px" }}>Stock Report</h2>
              </div>
              <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,.3)", paddingLeft:14 }}>Purchased · Sold · Remaining — with amounts</p>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>As On Date</label>
              <DateInput value={asOn} onChange={setAsOn} style={inputStyle} autoFocus
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); phrRef.current?.focus(); } }}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Unit Filter</label>
              <select value={unitParam} onChange={e => setUnitParam(e.target.value)} style={selectStyle}>
                <option value="">All</option>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>View</label>
              <select value={viewOf} onChange={e => setViewOf(e.target.value as ViewOf)} style={selectStyle}>
                <option value="all">All</option>
                <option value="remaining">Remaining</option>
                <option value="nill">Nill</option>
              </select>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Search Item</label>
              <input ref={phrRef} type="text" placeholder="Item name or code…" value={search}
                onChange={e => setSearch(e.target.value)} style={inputStyle}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); generateReport(); } }}
              />
            </div>

            <button onClick={generateReport} style={{
              width:"100%", padding:"13px 0", borderRadius:10, border:"none",
              background:"linear-gradient(135deg,#6366f1,#4f46e5)",
              color:"white", fontSize:14, fontWeight:800, cursor:"pointer",
              fontFamily:ff, boxShadow:"0 6px 20px rgba(99,102,241,.35)", letterSpacing:".02em",
            }}>Generate Report →</button>
          </div>
        </div>
      )}

      {/* ── REPORT VIEW ── */}
      {!showModal && (
        <div style={{ padding: "28px 32px", maxWidth: 1300, margin: "0 auto" }}>

          {/* Top bar */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:"rgba(129,140,248,.15)", border:"1px solid rgba(129,140,248,.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📦</div>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:"white" }}>Inventory Stock Report</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2 }}>
                  As on {new Date(asOn).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                  {unitParam && ` · Unit: ${unitParam}`}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={() => setShowModal(true)} style={{ padding:"8px 16px", borderRadius:9, background:"rgba(129,140,248,.1)", border:"1px solid rgba(129,140,248,.25)", color:"#818cf8", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff }}>⚙ Parameters</button>
              <button onClick={() => exportCSV(filtered, asOn)} style={{ padding:"8px 14px", borderRadius:9, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.25)", color:"#34d399", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff }}>↓ CSV</button>
              <button onClick={() => window.print()} style={{ padding:"8px 14px", borderRadius:9, background:"transparent", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.5)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff }}>🖨 Print</button>
              <button onClick={() => router.back()} style={{ width:34, height:34, borderRadius:8, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.2)", color:"#f87171", fontSize:16, cursor:"pointer", fontFamily:ff, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
            {[
              { label:"Total Items",        val: rows.length,               color:"#818cf8", icon:"📦" },
              { label:"In Stock",           val: inStockCount,              color:"#34d399", icon:"✅" },
              { label:"Out of Stock (Nil)", val: nillCount,                 color:"#f87171", icon:"⚠️"  },
              { label:"Total Purchased",    val: `Rs ${fmtAmt(rows.reduce((s,r)=>s+r.purchasedAmt,0))}`, color:"#60a5fa", icon:"📥" },
              { label:"Total Sold",         val: `Rs ${fmtAmt(rows.reduce((s,r)=>s+r.soldAmt,0))}`,      color:"#f59e0b", icon:"📤" },
              { label:"Stock Value",        val: `Rs ${fmtAmt(rows.reduce((s,r)=>s+r.remainingAmt,0))}`, color:"#34d399", icon:"💰" },
            ].map(k => (
              <div key={k.label} style={{ padding:"14px 16px", borderRadius:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:20 }}>{k.icon}</span>
                <div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,.35)", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em" }}>{k.label}</div>
                  <div style={{ fontSize:16, fontWeight:900, color:k.color, lineHeight:1.3 }}>{k.val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters bar */}
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item name or code…"
              style={{ flex:"1 1 220px", minWidth:0, padding:"8px 14px", borderRadius:9, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, outline:"none", fontFamily:ff }}
            />
            <div style={{ display:"flex", borderRadius:9, overflow:"hidden", border:"1px solid rgba(255,255,255,.1)" }}>
              {([["all","All"], ["remaining","Remaining"], ["nill","Nill"]] as [ViewOf,string][]).map(([v,l]) => (
                <button key={v} onClick={() => setViewOf(v)} style={{
                  padding:"8px 16px", border:"none", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff,
                  background: viewOf===v ? (v==="remaining"?"#34d399":v==="nill"?"#f87171":"#6366f1") : "rgba(255,255,255,.04)",
                  color: viewOf===v ? "white" : "rgba(255,255,255,.45)",
                }}>{l} {v==="all" ? `(${rows.length})` : v==="remaining" ? `(${inStockCount})` : `(${nillCount})`}</button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ borderRadius:12, border:"1px solid rgba(255,255,255,.08)", overflow:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:820 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.02)" }}>
                  <th style={th("left", 40)}>#</th>
                  <th style={th("left")}>Item Name</th>
                  <th style={th("center", 70)}>Unit</th>
                  {/* Purchased */}
                  <th colSpan={2} style={{ padding:"6px 14px 2px", fontSize:9, fontWeight:800, color:"#60a5fa", textTransform:"uppercase", letterSpacing:".06em", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,.06)", background:"rgba(96,165,250,.04)" }}>Purchased</th>
                  {/* Sold */}
                  <th colSpan={2} style={{ padding:"6px 14px 2px", fontSize:9, fontWeight:800, color:"#f59e0b", textTransform:"uppercase", letterSpacing:".06em", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,.06)", background:"rgba(245,158,11,.04)" }}>Sold</th>
                  {/* Remaining */}
                  <th colSpan={2} style={{ padding:"6px 14px 2px", fontSize:9, fontWeight:800, color:"#34d399", textTransform:"uppercase", letterSpacing:".06em", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,.06)", background:"rgba(52,211,153,.04)" }}>Remaining</th>
                </tr>
                <tr style={{ borderBottom:"2px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.02)" }}>
                  <th style={th("left", 40)}></th>
                  <th style={th("left")}></th>
                  <th style={th("center", 70)}></th>
                  <th style={{ ...th("right"), borderLeft:"1px solid rgba(255,255,255,.06)", background:"rgba(96,165,250,.04)", fontSize:9, color:"rgba(255,255,255,.3)" }}>Qty</th>
                  <th style={{ ...th("right"), background:"rgba(96,165,250,.04)", fontSize:9, color:"rgba(255,255,255,.3)" }}>Amount</th>
                  <th style={{ ...th("right"), borderLeft:"1px solid rgba(255,255,255,.06)", background:"rgba(245,158,11,.04)", fontSize:9, color:"rgba(255,255,255,.3)" }}>Qty</th>
                  <th style={{ ...th("right"), background:"rgba(245,158,11,.04)", fontSize:9, color:"rgba(255,255,255,.3)" }}>Amount</th>
                  <th style={{ ...th("right"), borderLeft:"1px solid rgba(255,255,255,.06)", background:"rgba(52,211,153,.04)", fontSize:9, color:"rgba(255,255,255,.3)" }}>Qty</th>
                  <th style={{ ...th("right"), background:"rgba(52,211,153,.04)", fontSize:9, color:"rgba(255,255,255,.3)" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ padding:56, textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:13 }}>Loading inventory…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding:56, textAlign:"center" }}>
                    <div style={{ fontSize:36, marginBottom:8 }}>📦</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.3)", fontWeight:600 }}>No items found</div>
                  </td></tr>
                ) : filtered.map((r, i) => {
                  const isNill = r.remainingQty <= 0;
                  return (
                    <tr key={r.itemId}
                      style={{ borderBottom:"1px solid rgba(255,255,255,.05)", background: i%2===0?"transparent":"rgba(255,255,255,.01)", transition:"background .15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background="rgba(99,102,241,.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background=i%2===0?"transparent":"rgba(255,255,255,.01)")}
                    >
                      <td style={{ padding:"10px 14px", fontSize:11, color:"rgba(255,255,255,.25)", fontWeight:600 }}>{i+1}</td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.85)" }}>{r.itemName}</div>
                        {r.itemCode && <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:1 }}>{r.itemCode}</div>}
                      </td>
                      <td style={{ padding:"10px 14px", textAlign:"center", fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600 }}>{r.unit}</td>
                      {/* Purchased */}
                      <td style={{ padding:"10px 14px", textAlign:"right", fontSize:12, fontWeight:700, color:"#93c5fd", borderLeft:"1px solid rgba(255,255,255,.05)", background:"rgba(96,165,250,.03)" }}>{fmt(r.purchasedQty)}</td>
                      <td style={{ padding:"10px 14px", textAlign:"right", fontSize:12, color:"#60a5fa", background:"rgba(96,165,250,.03)" }}>Rs {fmtAmt(r.purchasedAmt)}</td>
                      {/* Sold */}
                      <td style={{ padding:"10px 14px", textAlign:"right", fontSize:12, fontWeight:700, color:"#fcd34d", borderLeft:"1px solid rgba(255,255,255,.05)", background:"rgba(245,158,11,.03)" }}>{fmt(r.soldQty)}</td>
                      <td style={{ padding:"10px 14px", textAlign:"right", fontSize:12, color:"#f59e0b", background:"rgba(245,158,11,.03)" }}>Rs {fmtAmt(r.soldAmt)}</td>
                      {/* Remaining */}
                      <td style={{ padding:"10px 14px", textAlign:"right", borderLeft:"1px solid rgba(255,255,255,.05)", background: isNill?"rgba(248,113,113,.04)":"rgba(52,211,153,.04)" }}>
                        <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:800,
                          background: isNill?"rgba(248,113,113,.12)":"rgba(52,211,153,.12)",
                          color: isNill?"#f87171":"#34d399",
                          border:`1px solid ${isNill?"rgba(248,113,113,.25)":"rgba(52,211,153,.25)"}`,
                        }}>{fmt(r.remainingQty)}</span>
                      </td>
                      <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13, fontWeight:800, color: isNill?"#f87171":"#34d399", background: isNill?"rgba(248,113,113,.04)":"rgba(52,211,153,.04)" }}>
                        {isNill ? "—" : `Rs ${fmtAmt(r.remainingAmt)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {!loading && filtered.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop:"2px solid rgba(255,255,255,.1)", background:"rgba(99,102,241,.06)" }}>
                    <td colSpan={3} style={{ padding:"13px 14px", fontSize:11, fontWeight:800, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em" }}>
                      Grand Total — {filtered.length} item{filtered.length!==1?"s":""}
                    </td>
                    <td style={{ padding:"13px 14px", textAlign:"right", fontSize:14, fontWeight:900, color:"#93c5fd", borderLeft:"1px solid rgba(255,255,255,.08)", background:"rgba(96,165,250,.05)" }}>{fmt(totalPurchasedQty)}</td>
                    <td style={{ padding:"13px 14px", textAlign:"right", fontSize:13, fontWeight:800, color:"#60a5fa", background:"rgba(96,165,250,.05)" }}>Rs {fmtAmt(totalPurchasedAmt)}</td>
                    <td style={{ padding:"13px 14px", textAlign:"right", fontSize:14, fontWeight:900, color:"#fcd34d", borderLeft:"1px solid rgba(255,255,255,.08)", background:"rgba(245,158,11,.05)" }}>{fmt(totalSoldQty)}</td>
                    <td style={{ padding:"13px 14px", textAlign:"right", fontSize:13, fontWeight:800, color:"#f59e0b", background:"rgba(245,158,11,.05)" }}>Rs {fmtAmt(totalSoldAmt)}</td>
                    <td style={{ padding:"13px 14px", textAlign:"right", fontSize:14, fontWeight:900, color:"#34d399", borderLeft:"1px solid rgba(255,255,255,.08)", background:"rgba(52,211,153,.05)" }}>{fmt(totalRemainingQty)}</td>
                    <td style={{ padding:"13px 14px", textAlign:"right", fontSize:13, fontWeight:800, color:"#34d399", background:"rgba(52,211,153,.05)" }}>Rs {fmtAmt(totalRemainingAmt)}</td>
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

function th(align: "left"|"right"|"center", width?: number): React.CSSProperties {
  return {
    padding: "11px 14px", fontSize: 10, fontWeight: 700,
    color: "rgba(255,255,255,.35)", textTransform: "uppercase",
    letterSpacing: ".06em", textAlign: align,
    ...(width ? { width } : {}),
  };
}
