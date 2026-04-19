"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import { getCurrentUser } from "@/lib/auth";

interface Party { id: string; name: string; partyType: string; code?: string; }
interface AgeingRow { numType:string; date:string; narration:string; billAmount:number; billBalance:number; days:number; totalBalance:number; }

const fmt = (n: number) => Math.abs(n).toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 });
const todayStr = () => new Date().toISOString().slice(0, 10);

function getHeaders(): Record<string, string> {
  const user = getCurrentUser();
  if (!user) return {};
  return { "x-user-id": user.id, "x-user-role": user.role ?? "", "x-company-id": user.companyId ?? "" };
}

export default function AgeingReportPage() {
  const router     = useRouter();
  const dateRef    = useRef<HTMLInputElement>(null);
  const partyRef   = useRef<HTMLInputElement>(null);
  const [showModal,      setShowModal]      = useState(true);
  const [type,           setType]           = useState<"customer"|"supplier">("customer");
  const [asOnDate,       setAsOnDate]       = useState(todayStr());
  const [partyId,        setPartyId]        = useState("");
  const [partyName,      setPartyName]      = useState("");
  const [parties,        setParties]        = useState<Party[]>([]);
  const [data,           setData]           = useState<AgeingRow[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  // Autocomplete states
  const [query,    setQuery]    = useState("");
  const [dropOpen, setDropOpen] = useState(false);

  const loadParties = useCallback(async () => {
    setPartiesLoading(true);
    setPartyId(""); setPartyName(""); setQuery("");
    try {
      const res = await fetch("/api/accounts", { headers: getHeaders(), credentials:"include" });
      const d = await res.json();
      const list: Party[] = Array.isArray(d) ? d : (d.accounts ?? []);
      setParties(list.filter(a => {
        const pt = (a.partyType ?? "").toUpperCase();
        return type === "customer" ? pt === "CUSTOMER" : pt === "SUPPLIER";
      }));
    } catch { setError("Failed to load accounts"); }
    finally { setPartiesLoading(false); }
  }, [type]);

  useEffect(() => { loadParties(); }, [loadParties]);

  const filtered = query.trim() ? parties.filter(p => p.name.toLowerCase().includes(query.toLowerCase())) : parties.slice(0, 12);

  async function loadData(overrideId?: string) {
    const id = overrideId || partyId;
    if (!id) return;
    setLoading(true); setData([]); setError(null);
    setShowModal(false);
    const url = type === "customer"
      ? `/api/reports/ageing/customer?date=${asOnDate}&customerId=${id}`
      : `/api/reports/ageing/supplier?date=${asOnDate}&supplierId=${id}`;
    try {
      const res = await fetch(url, { headers: getHeaders(), credentials:"include" });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to load ageing data"); return; }
      setData(Array.isArray(json) ? json : []);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  const totalBillAmount  = data.reduce((s,r)=>s+r.billAmount,0);
  const totalBillBalance = data.reduce((s,r)=>s+r.billBalance,0);
  const totalBalance     = data.length > 0 ? data[data.length-1].totalBalance : 0;

  const inputStyle: React.CSSProperties = { width:"100%", padding:"11px 14px", borderRadius:10, fontSize:14, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"white", outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
  const thStyle: React.CSSProperties = { padding:"10px 14px", textAlign:"left", fontSize:11, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:.7, borderBottom:"1px solid rgba(255,255,255,.07)", fontWeight:600, whiteSpace:"nowrap", background:"rgba(255,255,255,.02)" };

  return (
    <div style={{ fontFamily:"'Outfit','Inter',sans-serif", color:"rgba(255,255,255,.85)" }}>

      {/* ── MODAL ── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,.78)", backdropFilter:"blur(14px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:480, background:"rgba(10,13,32,.97)", border:"1px solid rgba(255,255,255,.12)", borderRadius:22, padding:"40px 40px 36px", boxShadow:"0 40px 100px rgba(0,0,0,.8)", position:"relative" }}>
            <button onClick={() => data.length > 0 ? setShowModal(false) : router.back()} style={{ position:"absolute", top:14, right:16, background:"none", border:"none", color:"rgba(255,255,255,.35)", fontSize:20, cursor:"pointer", lineHeight:1, padding:4, borderRadius:6 }}>✕</button>
            {/* Title */}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:28 }}>
              <div style={{ width:46, height:46, borderRadius:14, background:"linear-gradient(135deg,#f59e0b,#ef4444)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>📋</div>
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:"white", letterSpacing:"-.3px" }}>Ageing Report</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:2 }}>Bill-wise outstanding analysis</div>
              </div>
            </div>

            {/* Type toggle */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Party Type</label>
              <div style={{ display:"flex", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, overflow:"hidden" }}>
                {(["customer","supplier"] as const).map(t => (
                  <button key={t} onClick={() => setType(t)} style={{ flex:1, padding:"10px 0", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:700, transition:"all .15s", background:type===t?"linear-gradient(135deg,#6366f1,#4f46e5)":"transparent", color:type===t?"white":"rgba(255,255,255,.4)" }}>
                    {t === "customer" ? "👤 Customer" : "🏭 Supplier"}
                  </button>
                ))}
              </div>
            </div>

            {/* As on date */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:7 }}>As On Date</label>
              <DateInput ref={dateRef} value={asOnDate} onChange={setAsOnDate} style={inputStyle} autoFocus onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); partyRef.current?.focus(); setDropOpen(true); } }}/>
            </div>

            {/* Party autocomplete */}
            <div style={{ marginBottom:22, position:"relative" }}>
              <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:7 }}>
                {type === "customer" ? "Customer" : "Supplier"}
              </label>
              <input
                ref={partyRef}
                type="text"
                style={{ ...inputStyle, paddingRight:36 }}
                placeholder={partiesLoading ? "Loading…" : `Search ${type}…`}
                value={query}
                onChange={e => { setQuery(e.target.value); setDropOpen(true); setPartyId(""); setPartyName(""); }}
                onFocus={() => setDropOpen(true)}
                onBlur={() => setTimeout(() => setDropOpen(false), 150)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (partyId) { loadData(); return; }
                    if (filtered.length > 0) {
                      const first = filtered[0];
                      setPartyId(first.id); setPartyName(first.name); setQuery(`${first.code ? first.code + " – " : ""}${first.name}`); setDropOpen(false);
                      loadData(first.id);
                    }
                  }
                }}
              />
              {partyId && <span style={{ position:"absolute", right:12, top:"calc(50% + 7px)", transform:"translateY(-50%)", color:"#34d399", fontSize:14 }}>✓</span>}
              {dropOpen && filtered.length > 0 && (
                <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:100, background:"rgba(13,16,35,.98)", border:"1px solid rgba(255,255,255,.12)", borderRadius:10, maxHeight:200, overflowY:"auto", marginTop:4, boxShadow:"0 12px 40px rgba(0,0,0,.5)" }}>
                  {filtered.map(p => (
                    <div key={p.id} onMouseDown={() => { setPartyId(p.id); setPartyName(p.name); setQuery(`${p.code ? p.code + " – " : ""}${p.name}`); setDropOpen(false); }}
                      style={{ padding:"10px 14px", cursor:"pointer", fontSize:13, color:"rgba(255,255,255,.8)", borderBottom:"1px solid rgba(255,255,255,.05)" }}
                      onMouseEnter={e => (e.currentTarget.style.background="rgba(99,102,241,.15)")}
                      onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                      {p.code && <span style={{ fontFamily:"monospace", fontSize:11, color:"#818cf8", marginRight:8 }}>{p.code}</span>}
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={loadData} disabled={!partyId} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", cursor:partyId?"pointer":"not-allowed", background:partyId?"linear-gradient(135deg,#f59e0b,#ef4444)":"rgba(255,255,255,.06)", color:"white", fontSize:15, fontWeight:700, fontFamily:"inherit", opacity:partyId?1:.5, boxShadow:partyId?"0 6px 24px rgba(245,158,11,.3)":"none" }}>
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
              ⟵ Change Filters
            </button>
            <button onClick={() => window.print()} style={{ padding:"8px 16px", borderRadius:9, border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.5)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🖨 Print</button>
          </div>

          {/* Report info bar */}
          <div style={{ background:"linear-gradient(135deg,rgba(245,158,11,.1),rgba(239,68,68,.06))", border:"1px solid rgba(245,158,11,.2)", borderRadius:14, padding:"16px 20px", marginBottom:20, display:"flex", gap:24, flexWrap:"wrap", alignItems:"center" }}>
            <div><div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".08em" }}>Party</div><div style={{ fontSize:15, fontWeight:800, color:"#fbbf24", marginTop:3 }}>{partyName}</div></div>
            <div><div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".08em" }}>Type</div><div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.7)", marginTop:3, textTransform:"capitalize" }}>{type}</div></div>
            <div><div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".08em" }}>As On</div><div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.7)", marginTop:3 }}>{asOnDate}</div></div>
          </div>

          {error && <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:10, padding:"12px 16px", marginBottom:20, color:"#f87171", fontSize:13 }}>{error}</div>}
          {loading && <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,.25)", fontSize:14 }}>Loading report…</div>}

          {!loading && (
            <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:14, overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Num & Type</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Narration</th>
                      <th style={{ ...thStyle, textAlign:"right" }}>Bill Amount</th>
                      <th style={{ ...thStyle, textAlign:"right" }}>Bill Balance</th>
                      <th style={{ ...thStyle, textAlign:"right" }}>Days</th>
                      <th style={{ ...thStyle, textAlign:"right" }}>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding:"40px 14px", textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:13 }}>No outstanding bills found</td></tr>
                    ) : data.map((r, i) => {
                      const dayColor = r.days>90?"#f87171":r.days>60?"#fb923c":r.days>30?"#fbbf24":"rgba(255,255,255,.7)";
                      return (
                        <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,.04)", background:i%2===0?"transparent":"rgba(255,255,255,.01)" }}
                          onMouseEnter={e=>(e.currentTarget.style.background="rgba(245,158,11,.04)")}
                          onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"transparent":"rgba(255,255,255,.01)")}>
                          <td style={{ padding:"10px 14px", fontSize:12, fontFamily:"monospace", color:"#a5b4fc" }}>{r.numType}</td>
                          <td style={{ padding:"10px 14px", fontSize:12, color:"rgba(255,255,255,.45)", whiteSpace:"nowrap" }}>{r.date}</td>
                          <td style={{ padding:"10px 14px", fontSize:13, color:"rgba(255,255,255,.75)" }}>{r.narration}</td>
                          <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13, color:"rgba(255,255,255,.65)" }}>{fmt(r.billAmount)}</td>
                          <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13, color:r.billBalance<0?"#f87171":"#4ade80", fontWeight:600 }}>{r.billBalance<0?"−":""}{fmt(r.billBalance)}</td>
                          <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13, fontWeight:700, color:dayColor }}>{r.days}</td>
                          <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13, fontWeight:700, color:"rgba(255,255,255,.8)" }}>{r.totalBalance<0?"−":""}{fmt(r.totalBalance)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {data.length > 0 && (
                    <tfoot>
                      <tr style={{ background:"rgba(99,102,241,.08)", borderTop:"2px solid rgba(99,102,241,.2)" }}>
                        <td colSpan={3} style={{ padding:"12px 14px", fontWeight:700, fontSize:12, textTransform:"uppercase", letterSpacing:.5, color:"rgba(255,255,255,.4)" }}>Totals</td>
                        <td style={{ padding:"12px 14px", textAlign:"right", fontWeight:800, fontSize:14, color:"rgba(255,255,255,.8)" }}>{fmt(totalBillAmount)}</td>
                        <td style={{ padding:"12px 14px", textAlign:"right", fontWeight:800, fontSize:14, color:totalBillBalance<0?"#f87171":"#4ade80" }}>{totalBillBalance<0?"−":""}{fmt(totalBillBalance)}</td>
                        <td/>
                        <td style={{ padding:"12px 14px", textAlign:"right", fontWeight:900, fontSize:16, color:totalBalance<0?"#f87171":"#4ade80" }}>{totalBalance<0?"−":""}{fmt(totalBalance)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* Age legend */}
          <div style={{ marginTop:16, display:"flex", gap:20, fontSize:12, color:"rgba(255,255,255,.4)", flexWrap:"wrap" }}>
            <span style={{ color:"rgba(255,255,255,.5)" }}>Age colour:</span>
            {[{ label:"0–30 days", color:"rgba(255,255,255,.7)" }, { label:"31–60 days", color:"#fbbf24" }, { label:"61–90 days", color:"#fb923c" }, { label:"90+ days", color:"#f87171" }].map(({ label, color }) => (
              <span key={label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:10, height:10, borderRadius:"50%", background:color, display:"inline-block" }}/>{label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
