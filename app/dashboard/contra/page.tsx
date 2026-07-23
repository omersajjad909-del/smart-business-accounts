"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { fmtDate } from "@/lib/dateUtils";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import { useResponsive } from "@/hooks/useResponsive";

const ff    = "'Outfit','Inter',sans-serif";
const TEAL  = "#14b8a6";

type Account = { id: string; name: string; code?: string; type?: string };
type ContraEntry = {
  id: string; contraNumber: string; date: string; amount: number; narration?: string;
  fromAccountId?: string; toAccountId?: string;
  fromAccount?: { id: string; name: string }; toAccount?: { id: string; name: string };
};

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function parseIsoFromInput(raw: string): string {
  const digits = raw.replace(/[-\/\.]/g, "");
  if (/^\d{6}$/.test(digits)) { const yy=digits.slice(4,6); return `${parseInt(yy)>=50?`19${yy}`:`20${yy}`}-${digits.slice(2,4)}-${digits.slice(0,2)}`; }
  if (/^\d{8}$/.test(digits)) return `${digits.slice(4,8)}-${digits.slice(2,4)}-${digits.slice(0,2)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return "";
}
function parseDateOp(raw: string): { op: string; iso: string } | null {
  let op="=", rest=raw.trim();
  if (rest.startsWith(">=")) { op=">="; rest=rest.slice(2).trim(); }
  else if (rest.startsWith("<=")) { op="<="; rest=rest.slice(2).trim(); }
  else if (rest.startsWith(">")) { op=">"; rest=rest.slice(1).trim(); }
  else if (rest.startsWith("<")) { op="<"; rest=rest.slice(1).trim(); }
  else if (rest.startsWith("=")) { op="="; rest=rest.slice(1).trim(); }
  const iso=parseIsoFromInput(rest); if (!iso) return null; return {op,iso};
}
function matchesDateOp(vIso: string, q: string): boolean {
  if (!q.trim()) return true; const p=parseDateOp(q); if (!p) return false;
  const {op,iso}=p;
  if (op==="=") return vIso===iso; if (op===">") return vIso>iso;
  if (op==="<") return vIso<iso; if (op===">=") return vIso>=iso;
  if (op==="<=") return vIso<=iso; return false;
}
function runQuery(entries: ContraEntry[], cNo: string, dateQ: string, acct: string): ContraEntry[] {
  let r=[...entries];
  if (cNo.trim()) { const q=cNo.trim().toLowerCase(); r=r.filter(v=>v.contraNumber.toLowerCase().includes(q)); }
  if (dateQ.trim()) r=r.filter(v=>matchesDateOp(v.date.slice(0,10), dateQ));
  if (acct.trim()) { const q=acct.trim().toLowerCase(); r=r.filter(v=>(v.fromAccount?.name||"").toLowerCase().includes(q)||(v.toAccount?.name||"").toLowerCase().includes(q)); }
  return r.sort((a,b)=>a.date.localeCompare(b.date));
}

export default function ContraPage() {
  const { isMobile } = useResponsive();
  const user  = getCurrentUser();
  const today = new Date().toISOString().slice(0, 10);

  const [entries,       setEntries]       = useState<ContraEntry[]>([]);
  const [accounts,      setAccounts]      = useState<Account[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);

  const [date,          setDate]          = useState(today);
  const [fromId,        setFromId]        = useState("");
  const [toId,          setToId]          = useState("");
  const [amount,        setAmount]        = useState("");
  const [narration,     setNarration]     = useState("");
  const [editingId,     setEditingId]     = useState("");

  // ── Query Mode ───────────────────────────────────────────────────────────────
  const [queryMode,    setQueryMode]    = useState(false);
  const [queryCNo,     setQueryCNo]     = useState("");
  const [queryDate,    setQueryDate]    = useState("");
  const [queryAcct,    setQueryAcct]    = useState("");
  const [queryResults, setQueryResults] = useState<ContraEntry[]>([]);
  const [queryIdx,     setQueryIdx]     = useState(-1);

  const h = (json=false): Record<string,string> => ({
    "x-user-role": user?.role||"", "x-user-id": user?.id||"", "x-company-id": user?.companyId||"",
    ...(json?{"Content-Type":"application/json"}:{}),
  });

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key==="F7") { e.preventDefault(); enterQueryMode(); }
      if (e.key==="Escape" && queryMode) { e.preventDefault(); exitQueryMode(); }
      if (e.key==="PageDown" && queryIdx>=0) { e.preventDefault(); navTo(queryIdx+1); }
      if (e.key==="PageUp"   && queryIdx>=0) { e.preventDefault(); navTo(queryIdx-1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryMode, queryIdx, queryResults]);

  async function loadAll() {
    setLoading(true);
    try {
      const [eRes, aRes] = await Promise.all([
        fetch("/api/contra",   { headers: h() }),
        fetch("/api/accounts", { headers: h() }),
      ]);
      const [eData, aData] = await Promise.all([eRes.json(), aRes.json()]);
      if (Array.isArray(eData)) setEntries(eData);
      const allAccts = Array.isArray(aData) ? aData : [];
      setAccounts(allAccts.filter((a: any) => {
        const n=(a.name||"").toLowerCase(), t=(a.type||"").toLowerCase();
        return n.includes("cash")||n.includes("bank")||t.includes("cash")||t.includes("bank");
      }));
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  function applyEntry(v: ContraEntry) {
    setDate(v.date.slice(0,10));
    setFromId(v.fromAccountId || v.fromAccount?.id || "");
    setToId(v.toAccountId || v.toAccount?.id || "");
    setAmount(String(v.amount));
    setNarration(v.narration || "");
    setEditingId(v.id);
  }

  function resetForm() {
    setDate(today); setFromId(""); setToId(""); setAmount(""); setNarration(""); setEditingId("");
  }

  function enterQueryMode() { setQueryMode(true); setQueryCNo(""); setQueryDate(""); setQueryAcct(""); setQueryResults([]); setQueryIdx(-1); }
  function exitQueryMode()  { setQueryMode(false); setQueryIdx(-1); setQueryResults([]); }

  function executeQuery(cNo: string, dateQ: string, acct: string) {
    const results = runQuery(entries, cNo, dateQ, acct);
    if (results.length===0) { toast.error("No records found"); return; }
    setQueryResults(results); setQueryIdx(0); setQueryMode(false);
    applyEntry(results[0]);
    toast.success(`${results.length} record${results.length>1?"s":""} found — ${results[0].contraNumber}`);
  }

  function navTo(idx: number) {
    if (idx<0||idx>=queryResults.length) return;
    setQueryIdx(idx); applyEntry(queryResults[idx]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromId || !toId || !amount) { toast.error("All fields required"); return; }
    if (fromId===toId) { toast.error("From and To accounts cannot be the same"); return; }
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url    = editingId ? `/api/contra?id=${editingId}` : "/api/contra";
      const res    = await fetch(url, { method, headers: h(true), body: JSON.stringify({ date, fromAccountId: fromId, toAccountId: toId, amount: parseFloat(amount), narration }) });
      const data   = await res.json();
      if (res.ok) { toast.success(editingId?"Contra updated!":"Contra saved!"); resetForm(); await loadAll(); }
      else toast.error(data.error||"Failed");
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this contra entry?")) return;
    const res = await fetch(`/api/contra?id=${id}`, { method: "DELETE", headers: h() });
    if (res.ok) { toast.success("Deleted"); await loadAll(); if (editingId===id) resetForm(); } else toast.error("Delete failed");
  }

  const inp:   React.CSSProperties = { width:"100%", background:"rgba(255,255,255,.05)", border:"1px solid var(--border)", borderRadius:8, padding:"8px 12px", color:"var(--text-primary)", fontFamily:ff, fontSize:13, outline:"none", boxSizing:"border-box" };
  const lbl:   React.CSSProperties = { fontSize:11, color:"var(--text-muted)", fontWeight:700, marginBottom:5, display:"block", textTransform:"uppercase", letterSpacing:.5 };
  const panel: React.CSSProperties = { background:"var(--panel-bg)", border:"1px solid var(--border)", borderRadius:12, padding:20, fontFamily:ff };

  return (
    <div style={{ padding: isMobile ? "13px 13px" : "24px 28px", fontFamily:ff, color:"var(--text-primary)", maxWidth:1000 }}>

      {/* Title */}
      <div style={{ marginBottom:20, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:queryMode?"#facc15":TEAL }}>
            {queryMode ? "🔍 QUERY MODE — Contra" : "Contra Entry"}
          </h1>
          <p style={{ margin:"4px 0 0", fontSize:12, color:queryMode?"rgba(250,204,21,.5)":"var(--text-muted)" }}>
            {queryMode ? "Enter search criteria then press F8 to execute" : "Transfer between cash / bank accounts"}
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {queryIdx>=0 && !queryMode && (
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(20,184,166,.08)", border:"1px solid rgba(20,184,166,.2)", borderRadius:10, padding:"6px 12px" }}>
              <button onClick={()=>navTo(queryIdx-1)} disabled={queryIdx===0} style={{ padding:"4px 10px", borderRadius:6, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:queryIdx===0?"rgba(255,255,255,.2)":"rgba(255,255,255,.7)", fontSize:13, cursor:queryIdx===0?"default":"pointer", fontFamily:ff }}>◀</button>
              <span style={{ fontSize:12, color:TEAL, fontWeight:700, minWidth:80, textAlign:"center" }}>{queryResults[queryIdx]?.contraNumber} · {queryIdx+1}/{queryResults.length}</span>
              <button onClick={()=>navTo(queryIdx+1)} disabled={queryIdx===queryResults.length-1} style={{ padding:"4px 10px", borderRadius:6, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:queryIdx===queryResults.length-1?"rgba(255,255,255,.2)":"rgba(255,255,255,.7)", fontSize:13, cursor:queryIdx===queryResults.length-1?"default":"pointer", fontFamily:ff }}>▶</button>
              <button onClick={exitQueryMode} style={{ padding:"4px 10px", borderRadius:6, background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.2)", color:"#f87171", fontSize:11, cursor:"pointer", fontFamily:ff }}>✕ Clear</button>
            </div>
          )}
          {queryIdx<0 && !queryMode && (
            <>
              <div style={{ background:"rgba(20,184,166,.1)", border:"1px solid rgba(20,184,166,.25)", borderRadius:10, padding:"8px 16px", textAlign:"right" }}>
                <div style={{ fontSize:10, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".06em" }}>Next Contra #</div>
                <div style={{ fontSize:16, fontWeight:800, color:TEAL }}>CTR-{entries.length+1}</div>
              </div>
              <div style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:10, padding:"8px 16px", textAlign:"right" }}>
                <div style={{ fontSize:10, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".06em" }}>Saved</div>
                <div style={{ fontSize:16, fontWeight:800, color:"var(--text-primary)" }}>{entries.length}</div>
              </div>
            </>
          )}
          <button onClick={queryMode?exitQueryMode:enterQueryMode}
            style={{ padding:"8px 16px", borderRadius:10, background:queryMode?"rgba(250,204,21,.1)":"rgba(20,184,166,.08)", border:`1px solid ${queryMode?"rgba(250,204,21,.3)":"rgba(20,184,166,.25)"}`, color:queryMode?"#facc15":TEAL, fontSize:12, cursor:"pointer", fontFamily:ff, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ background:queryMode?"#facc15":TEAL, color:"#000", borderRadius:4, padding:"1px 6px", fontSize:10, fontWeight:800 }}>F7</span>
            {queryMode?"Cancel Query":"Query Mode"}
          </button>
          {!queryMode && (
            <button onClick={resetForm} style={{ padding:"8px 16px", borderRadius:10, background:TEAL, border:"none", color:"#fff", fontSize:12, cursor:"pointer", fontFamily:ff, fontWeight:700 }}>+ New Entry</button>
          )}
        </div>
      </div>

      {/* Query Mode Form */}
      {queryMode && (
        <div style={{ background:"rgba(250,204,21,.04)", border:"2px solid rgba(250,204,21,.3)", borderRadius:16, padding:28, marginBottom:28 }}>
          <div style={{ marginBottom:20 }}>
            <span style={{ fontSize:12, color:"rgba(250,204,21,.7)" }}>Enter criteria — leave blank to get all records. Use <b style={{ color:"#facc15" }}>&gt;</b>, <b style={{ color:"#facc15" }}>&lt;</b>, <b style={{ color:"#facc15" }}>&gt;=</b> for date range.</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "180px 240px 1fr", gap:16, marginBottom:24 }}>
            <div>
              <label style={{ ...lbl, color:"rgba(250,204,21,.6)" }}>Contra # (e.g. CTR-5)</label>
              <input autoFocus value={queryCNo} onChange={e=>setQueryCNo(e.target.value)} placeholder="CTR-1 or blank…"
                style={{ ...inp, border:"1px solid rgba(250,204,21,.3)", background:"rgba(250,204,21,.05)" }}
                onKeyDown={e=>{ if(e.key==="F8"){e.preventDefault();executeQuery(queryCNo,queryDate,queryAcct);} if(e.key==="Escape")exitQueryMode(); }} />
            </div>
            <div>
              <label style={{ ...lbl, color:"rgba(250,204,21,.6)" }}>Date (e.g. &gt;010425 or 01-05-2026)</label>
              <input value={queryDate} onChange={e=>setQueryDate(e.target.value)} placeholder=">010125 or blank…"
                style={{ ...inp, border:"1px solid rgba(250,204,21,.3)", background:"rgba(250,204,21,.05)" }}
                onKeyDown={e=>{ if(e.key==="F8"){e.preventDefault();executeQuery(queryCNo,queryDate,queryAcct);} if(e.key==="Escape")exitQueryMode(); }} />
            </div>
            <div>
              <label style={{ ...lbl, color:"rgba(250,204,21,.6)" }}>Account (name)</label>
              <input value={queryAcct} onChange={e=>setQueryAcct(e.target.value)} placeholder="e.g. Cash, HBL, or blank…"
                style={{ ...inp, border:"1px solid rgba(250,204,21,.3)", background:"rgba(250,204,21,.05)" }}
                onKeyDown={e=>{ if(e.key==="F8"){e.preventDefault();executeQuery(queryCNo,queryDate,queryAcct);} if(e.key==="Escape")exitQueryMode(); }} />
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={()=>executeQuery(queryCNo,queryDate,queryAcct)}
              style={{ padding:"10px 32px", borderRadius:9, background:"linear-gradient(135deg,#facc15,#ca8a04)", border:"none", color:"#000", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:ff, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ background:"rgba(0,0,0,.2)", borderRadius:4, padding:"1px 7px", fontSize:11 }}>F8</span>Execute Query
            </button>
            <button onClick={exitQueryMode} style={{ padding:"10px 20px", borderRadius:9, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.5)", fontSize:13, cursor:"pointer", fontFamily:ff }}>Cancel (Esc)</button>
            <span style={{ fontSize:11, color:"rgba(250,204,21,.4)", marginLeft:8 }}>
              Operators: <b style={{ color:"rgba(250,204,21,.7)" }}>&gt;010425</b> (after) &nbsp; <b style={{ color:"rgba(250,204,21,.7)" }}>&lt;010425</b> (before)
            </span>
          </div>
        </div>
      )}

      {/* Form */}
      <div style={{ ...panel, marginBottom:28, display:queryMode?"none":undefined }}>
        <div style={{ fontSize:15, fontWeight:700, color:TEAL, marginBottom:20 }}>{editingId?"Edit Contra Entry":"New Contra Entry"}</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "160px 1fr 1fr 160px", gap:14, marginBottom:16 }}>
            <div>
              <label style={lbl}>Date *</label>
              <DateInput value={date} onChange={setDate} style={inp} />
            </div>
            <div>
              <label style={lbl}>From Account (Source) *</label>
              <select value={fromId} onChange={e=>setFromId(e.target.value)} style={{ ...inp, cursor:"pointer" }} required>
                <option value="">— Select —</option>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>To Account (Destination) *</label>
              <select value={toId} onChange={e=>setToId(e.target.value)} style={{ ...inp, cursor:"pointer" }} required>
                <option value="">— Select —</option>
                {accounts.filter(a=>a.id!==fromId).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Amount *</label>
              <input type="number" step="0.01" min="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" style={{ ...inp, textAlign:"right", color:TEAL, fontWeight:700 }} required />
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Narration</label>
            <input value={narration} onChange={e=>setNarration(e.target.value)} placeholder="Optional description…" style={inp} />
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button type="submit" disabled={saving} style={{ background:TEAL, color:"#fff", border:"none", borderRadius:8, padding:"10px 28px", fontFamily:ff, fontSize:14, fontWeight:700, cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1 }}>
              {saving?"Saving…":editingId?"Update Contra":"Save Contra"}
            </button>
            {editingId && (
              <>
                <button type="button" onClick={resetForm} style={{ background:"transparent", border:"1px solid var(--border)", borderRadius:8, padding:"10px 20px", fontFamily:ff, fontSize:14, color:"var(--text-muted)", cursor:"pointer" }}>Cancel</button>
                <button type="button" onClick={()=>handleDelete(editingId)} style={{ background:"transparent", border:"1px solid rgba(248,113,113,.3)", borderRadius:8, padding:"10px 20px", fontFamily:ff, fontSize:14, color:"#f87171", cursor:"pointer" }}>Delete</button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Shortcuts Bar */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {(queryMode ? [
          { key:"F8", label:"Execute Query", color:"#facc15" },
          { key:"Esc", label:"Cancel Query", color:undefined },
        ] : queryIdx>=0 ? [
          { key:"F7", label:"New Query", color:TEAL },
          { key:"PageDown", label:"Next Record", color:undefined },
          { key:"PageUp", label:"Prev Record", color:undefined },
        ] : [
          { key:"F7", label:"Query Mode", color:TEAL },
          { key:"Enter", label:"Next Field", color:undefined },
        ]).map(s=>(
          <div key={s.key} style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:6, padding:"4px 10px" }}>
            <span style={{ background:s.color?`${s.color}22`:"rgba(255,255,255,.06)", color:s.color||"rgba(255,255,255,.5)", borderRadius:4, padding:"1px 7px", fontSize:10, fontWeight:800, fontFamily:"monospace", border:`1px solid ${s.color?`${s.color}44`:"rgba(255,255,255,.1)"}` }}>{s.key}</span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
