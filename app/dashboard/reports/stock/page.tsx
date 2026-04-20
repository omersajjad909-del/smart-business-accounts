"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

type Row = { itemId: string; itemName: string; unit: string; description: string; stockQty: number; stockValue: number };

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
  ...inputStyle,
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,.4)' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  paddingRight: 32,
};

export default function StockReportPage() {
  const router = useRouter();
  const today  = new Date().toISOString().slice(0, 10);

  // Modal state
  const [showModal, setShowModal] = useState(true);
  const [asOn,      setAsOn]      = useState(today);
  const [unitParam, setUnitParam] = useState("");        // "" = All
  const [viewOf,    setViewOf]    = useState<"all"|"remaining"|"nill">("all");
  const [phr,       setPhr]       = useState("");        // item name search

  // Report state
  const [rows,    setRows]    = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [units,   setUnits]   = useState<string[]>([]);  // distinct units for dropdown

  const phrRef  = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const user = getCurrentUser();
  const h = () => ({ "x-user-id": user?.id||"", "x-user-role": user?.role||"", "x-company-id": user?.companyId||"" });

  // Pre-fetch to populate unit dropdown
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
      const r = await fetch(`/api/reports/stock?${qs}`, { credentials: "include", headers: h() });
      const d = await r.json();
      setRows(Array.isArray(d) ? d : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }

  // Apply client-side filters (viewOf + phr search)
  const filtered = rows.filter(r => {
    if (phr && !r.itemName.toLowerCase().includes(phr.toLowerCase())) return false;
    if (viewOf === "remaining" && r.stockQty <= 0) return false;
    if (viewOf === "nill"      && r.stockQty >  0) return false;
    return true;
  });

  const totalQty   = filtered.reduce((s, r) => s + r.stockQty,   0);
  const totalValue = filtered.reduce((s, r) => s + r.stockValue, 0);
  const inStock    = rows.filter(r => r.stockQty > 0).length;
  const outStock   = rows.filter(r => r.stockQty <= 0).length;

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
            {/* Close */}
            <button
              onClick={() => router.back()}
              style={{ position:"absolute", top:14, right:16, background:"none", border:"none", color:"rgba(255,255,255,.35)", fontSize:20, cursor:"pointer", padding:4, borderRadius:6, fontFamily:ff }}
            >✕</button>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <div style={{ width:4, height:24, borderRadius:2, background:"linear-gradient(180deg,#818cf8,#6366f1)" }}/>
                <h2 style={{ margin:0, fontSize:20, fontWeight:800, letterSpacing:"-.3px" }}>
                  Stock Report
                </h2>
              </div>
              <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,.3)", paddingLeft:14 }}>
                Enter parameters to generate inventory stock report
              </p>
            </div>

            {/* As On */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>As On</label>
              <input
                ref={dateRef}
                type="date"
                value={asOn}
                onChange={e => setAsOn(e.target.value)}
                style={{ ...inputStyle, colorScheme: "dark" }}
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); phrRef.current?.focus(); } }}
              />
            </div>

            {/* Unit */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Unit</label>
              <select value={unitParam} onChange={e => setUnitParam(e.target.value)} style={selectStyle}>
                <option value="">— ALL —</option>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* View Of */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>View Of</label>
              <select value={viewOf} onChange={e => setViewOf(e.target.value as any)} style={selectStyle}>
                <option value="all">All</option>
                <option value="remaining">Remaining (In Stock)</option>
                <option value="nill">Nill (Out of Stock)</option>
              </select>
            </div>

            {/* PHR — item name search */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Item Name / PHR</label>
              <input
                ref={phrRef}
                type="text"
                placeholder="Search item name..."
                value={phr}
                onChange={e => setPhr(e.target.value)}
                style={inputStyle}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); generateReport(); } }}
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={generateReport}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer",
                fontFamily: ff, boxShadow: "0 6px 20px rgba(99,102,241,.35)",
                letterSpacing: ".02em",
              }}
            >
              Generate Report →
            </button>
          </div>
        </div>
      )}

      {/* ── FULL PAGE REPORT ── */}
      {!showModal && (
        <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

          {/* Top bar */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:"rgba(129,140,248,.15)", border:"1px solid rgba(129,140,248,.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📦</div>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:"white" }}>Inventory Stock Report</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2 }}>
                  As on {new Date(asOn).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                  {unitParam && ` · Unit: ${unitParam}`}
                  {` · ${viewOf === "all" ? "All Items" : viewOf === "remaining" ? "In Stock" : "Out of Stock"}`}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button
                onClick={() => setShowModal(true)}
                style={{ padding:"8px 16px", borderRadius:9, background:"rgba(129,140,248,.1)", border:"1px solid rgba(129,140,248,.25)", color:"#818cf8", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff }}
              >
                ⚙ Parameters
              </button>
              <button
                onClick={() => window.print()}
                style={{ padding:"8px 14px", borderRadius:9, background:"transparent", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.5)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff }}
              >
                🖨 Print
              </button>
              <button
                onClick={() => router.back()}
                style={{ width:34, height:34, borderRadius:8, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.2)", color:"#f87171", fontSize:16, cursor:"pointer", fontFamily:ff, display:"flex", alignItems:"center", justifyContent:"center" }}
              >✕</button>
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
            {[
              { label:"Total Items",   val: rows.length,              color:"#818cf8", icon:"📦" },
              { label:"In Stock",      val: inStock,                  color:"#34d399", icon:"✅" },
              { label:"Out of Stock",  val: outStock,                 color:"#f87171", icon:"⚠️" },
              { label:"Total Value",   val: `Rs ${fmt(totalValue)}`,  color:"#fbbf24", icon:"💰" },
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

          {/* Live PHR search (post-generate) */}
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
            <input
              value={phr}
              onChange={e => setPhr(e.target.value)}
              placeholder="Search item name…"
              style={{ flex:"1 1 220px", minWidth:0, padding:"8px 14px", borderRadius:9, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, outline:"none", fontFamily:ff }}
            />
            <div style={{ display:"flex", borderRadius:9, overflow:"hidden", border:"1px solid rgba(255,255,255,.1)" }}>
              {([ ["all","All"], ["remaining","Remaining"], ["nill","Nill"] ] as const).map(([v,l]) => (
                <button key={v} onClick={() => setViewOf(v)} style={{
                  padding:"8px 14px", border:"none", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff,
                  background: viewOf===v ? (v==="remaining"?"#34d399":v==="nill"?"#f87171":"#6366f1") : "rgba(255,255,255,.04)",
                  color: viewOf===v ? "white" : "rgba(255,255,255,.45)",
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ borderRadius:12, border:"1px solid rgba(255,255,255,.08)", overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.02)" }}>
                  {["#","Item Name","Unit","Stock Qty","Inventory Value"].map((h, i) => (
                    <th key={h} style={{ padding:"11px 14px", fontSize:11, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".06em", textAlign: i > 2 ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding:56, textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:13 }}>Loading inventory…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding:56, textAlign:"center" }}>
                    <div style={{ fontSize:36, marginBottom:8 }}>📦</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.3)", fontWeight:600 }}>No items found</div>
                  </td></tr>
                ) : filtered.map((r, i) => (
                  <tr key={r.itemId}
                    style={{ borderBottom:"1px solid rgba(255,255,255,.05)", background: i%2===0?"transparent":"rgba(255,255,255,.01)", transition:"background .15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background="rgba(99,102,241,.05)")}
                    onMouseLeave={e => (e.currentTarget.style.background=i%2===0?"transparent":"rgba(255,255,255,.01)")}
                  >
                    <td style={{ padding:"11px 14px", fontSize:11, color:"rgba(255,255,255,.25)", fontWeight:600 }}>{i+1}</td>
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.85)" }}>{r.itemName}</div>
                      {r.description && <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>{r.description}</div>}
                    </td>
                    <td style={{ padding:"11px 14px", fontSize:12, color:"rgba(255,255,255,.4)", fontWeight:600 }}>{r.unit}</td>
                    <td style={{ padding:"11px 14px", textAlign:"right" }}>
                      <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:800,
                        background: r.stockQty>0?"rgba(52,211,153,.1)":"rgba(248,113,113,.1)",
                        color: r.stockQty>0?"#34d399":"#f87171",
                        border:`1px solid ${r.stockQty>0?"rgba(52,211,153,.25)":"rgba(248,113,113,.25)"}`,
                      }}>
                        {fmt(r.stockQty)}
                      </span>
                    </td>
                    <td style={{ padding:"11px 14px", textAlign:"right", fontSize:13, fontWeight:800, color:"#818cf8" }}>{fmt(r.stockValue)}</td>
                  </tr>
                ))}
              </tbody>
              {!loading && filtered.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop:"1px solid rgba(255,255,255,.1)", background:"rgba(99,102,241,.06)" }}>
                    <td colSpan={3} style={{ padding:"13px 14px", fontSize:11, fontWeight:800, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em" }}>
                      Grand Total — {filtered.length} item{filtered.length!==1?"s":""}
                    </td>
                    <td style={{ padding:"13px 14px", textAlign:"right", fontSize:15, fontWeight:900, color:"#34d399" }}>{fmt(totalQty)}</td>
                    <td style={{ padding:"13px 14px", textAlign:"right", fontSize:15, fontWeight:900, color:"#818cf8" }}>{fmt(totalValue)}</td>
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
