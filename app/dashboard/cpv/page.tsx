"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "react-hot-toast";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";

const ff = "'Outfit','Inter',sans-serif";
const BLUE = "#6366f1";

type Account  = { id: string; name: string; code?: string; phone?: string };
type BankAcc  = { id: string; name: string };
type EntryRow = { id: number; accountId: string; accountName: string; amount: string; narration: string };
type Voucher  = {
  id: string; voucherNo: string; date: string; narration: string;
  paymentMode: string; paymentAccName: string; totalAmount: number;
  entries: { accountId: string; accountName: string; accountCode: string; amount: number; narration: string }[];
};

let nextId = 1;
function newRow(): EntryRow { return { id: nextId++, accountId: "", accountName: "", amount: "", narration: "" }; }
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// ── Receipt print for one party ──────────────────────────────────────────────
function printReceipt(entry: EntryRow, voucherNo: string, date: string, mode: string, company: any) {
  const co  = company?.name || "Company";
  const cur = company?.baseCurrency || "PKR";
  const w   = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
  <style>
    body{font-family:Arial,sans-serif;padding:20mm 15mm;max-width:80mm;margin:0 auto;font-size:12px}
    .center{text-align:center} .bold{font-weight:700} .line{border-top:1px dashed #000;margin:10px 0}
    .row{display:flex;justify-content:space-between;margin:4px 0}
  </style></head><body>
  <div class="center bold" style="font-size:15px">${co}</div>
  <div class="center" style="font-size:10px;letter-spacing:1px">PAYMENT RECEIPT</div>
  <div class="line"></div>
  <div class="row"><span>Voucher #</span><span class="bold">${voucherNo}</span></div>
  <div class="row"><span>Date</span><span>${date}</span></div>
  <div class="row"><span>Mode</span><span>${mode}</span></div>
  <div class="line"></div>
  <div class="row"><span>Paid To</span><span class="bold">${entry.accountName}</span></div>
  <div class="row bold" style="font-size:14px"><span>Amount</span><span>${cur} ${fmt(Number(entry.amount))}</span></div>
  <div class="line"></div>
  ${entry.narration ? `<div style="font-size:11px;margin-top:6px">Narration: ${entry.narration}</div>` : ""}
  <div style="margin-top:20px;text-align:center;font-size:9px">Powered by FinovaOS</div>
  <script>window.print();<\/script></body></html>`);
  w.document.close();
}

// ── Full voucher print ────────────────────────────────────────────────────────
function printVoucher(entries: EntryRow[], voucherNo: string, date: string, mode: string, totalAmt: number, company: any, narration: string) {
  const co  = company?.name || "Company";
  const cur = company?.baseCurrency || "PKR";
  const rows = entries.filter(e => e.accountId && Number(e.amount) > 0);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>CPV ${voucherNo}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:30px;max-width:680px;margin:0 auto;color:#111}
    .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #111;padding-bottom:14px;margin-bottom:20px}
    .co{font-size:22px;font-weight:900}.rh{font-size:16px;font-weight:900;text-decoration:underline;text-align:right}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#f3f4f6;border:1px solid #999;padding:8px 10px;font-size:11px;text-transform:uppercase;text-align:left}
    td{border:1px solid #ccc;padding:8px 10px;font-size:12px}
    .amt{text-align:right;font-weight:700;color:#1e40af}
    .sig{border-top:2px solid #111;padding-top:4px;font-size:9px;font-weight:700;text-transform:uppercase;text-align:center;width:120px}
    .sigs{display:flex;justify-content:space-between;margin-top:48px}
    @media print{body{padding:8mm}}
  </style></head><body>
  <div class="hdr">
    <div><div class="co">${co}</div><div style="font-size:10px;color:#666;letter-spacing:2px">INTERNAL ACCOUNTING VOUCHER</div></div>
    <div><div class="rh">CASH PAYMENT VOUCHER</div>
    <div style="font-size:12px;font-weight:700;text-align:right">CPV No: ${voucherNo}</div>
    <div style="font-size:12px;font-weight:700;text-align:right">Date: ${date}</div>
    <div style="font-size:12px;text-align:right">Mode: ${mode}</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Account</th><th>Narration</th><th style="text-align:right">Amount (${cur})</th></tr></thead>
    <tbody>
      ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.accountName}</td><td>${r.narration || "—"}</td><td class="amt">${fmt(Number(r.amount))}</td></tr>`).join("")}
    </tbody>
    <tfoot>
      <tr style="background:#eff6ff"><td colspan="3" style="text-align:right;font-weight:800;border-top:2px solid #111">TOTAL PAID</td>
      <td style="text-align:right;font-weight:900;font-size:15px;border-top:2px solid #111;color:#1e40af">${cur} ${fmt(totalAmt)}</td></tr>
    </tfoot>
  </table>
  ${narration ? `<div style="margin-top:14px;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;font-size:12px"><b>Narration:</b> ${narration}</div>` : ""}
  <div class="sigs"><div class="sig">Prepared By</div><div class="sig">Reviewed By</div><div class="sig">Approved By</div></div>
  <div style="margin-top:20px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:8px">Auto-generated — FinovaOS — ${new Date().toLocaleString()}</div>
  <script>window.print();<\/script></body></html>`);
  w.document.close();
}

export default function CPVPage() {
  const user    = getCurrentUser();
  const today   = new Date().toISOString().slice(0, 10);

  const [accounts,   setAccounts]   = useState<Account[]>([]);
  const [bankAccs,   setBankAccs]   = useState<BankAcc[]>([]);
  const [vouchers,   setVouchers]   = useState<Voucher[]>([]);
  const [company,    setCompany]    = useState<any>(null);
  const [saving,     setSaving]     = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const [date,       setDate]       = useState(today);
  const [mode,       setMode]       = useState<"CASH"|"BANK">("CASH");
  const [bankId,     setBankId]     = useState("");
  const [narration,  setNarration]  = useState("");
  const [entries,    setEntries]    = useState<EntryRow[]>([newRow()]);
  const [search,     setSearch]     = useState<Record<number, string>>({});
  const [dropOpen,   setDropOpen]   = useState<Record<number, boolean>>({});

  const h = () => ({ "x-user-role": user?.role||"", "x-user-id": user?.id||"", "x-company-id": user?.companyId||"", "Content-Type": "application/json" });

  useEffect(() => {
    Promise.all([
      fetch("/api/cpv",          { headers: h() }).then(r => r.json()),
      fetch("/api/accounts",     { headers: h() }).then(r => r.json()),
      fetch("/api/bank-accounts",{ headers: h() }).then(r => r.json()),
      fetch("/api/me/company",   { headers: h() }).then(r => r.ok ? r.json() : null),
    ]).then(([v, a, b, co]) => {
      if (Array.isArray(v)) setVouchers(v);
      if (Array.isArray(a)) setAccounts(a.filter((x: any) => x.partyType !== "CUSTOMER"));
      if (Array.isArray(b)) setBankAccs(b.map((x: any) => ({ id: x.id, name: x.accountName || `${x.bankName} - ${x.accountNo}` })));
      if (co) setCompany(co);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setEntryField(id: number, field: keyof EntryRow, val: string) {
    setEntries(prev => {
      const next = prev.map(e => e.id === id ? { ...e, [field]: val } : e);
      const idx = next.findIndex(e => e.id === id);
      if (idx === next.length - 1 && val !== "") next.push(newRow());
      return next;
    });
  }
  function removeRow(id: number) { setEntries(prev => prev.length > 1 ? prev.filter(e => e.id !== id) : prev); }
  function selectAccount(rowId: number, acc: Account) {
    setEntries(prev => prev.map(e => e.id === rowId ? { ...e, accountId: acc.id, accountName: acc.name } : e));
    setSearch(prev => ({ ...prev, [rowId]: acc.name }));
    setDropOpen(prev => ({ ...prev, [rowId]: false }));
  }

  const total = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  async function save() {
    const valid = entries.filter(e => e.accountId && Number(e.amount) > 0);
    if (!valid.length) { toast.error("Kam az kam aik valid entry add karein"); return; }
    if (mode === "BANK" && !bankId) { toast.error("Bank account select karein"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/cpv", {
        method: "POST", headers: h(),
        body: JSON.stringify({ date, paymentMode: mode, bankAccountId: bankId || undefined, narration, entries: valid.map(e => ({ accountId: e.accountId, amount: Number(e.amount), narration: e.narration })) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(`CPV ${d.voucherNo} save ho gaya!`);
      setEntries([newRow()]); setNarration(""); setMode("CASH"); setBankId("");
      fetch("/api/cpv", { headers: h() }).then(r => r.json()).then(v => Array.isArray(v) && setVouchers(v));
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function deleteVoucher(id: string) {
    if (!confirm("Ye voucher delete karein?")) return;
    const r = await fetch(`/api/cpv?id=${id}`, { method: "DELETE", headers: h() });
    if (r.ok) {
      toast.success("Deleted"); setVouchers(prev => prev.filter(v => v.id !== id));
    }
  }

  const inp: React.CSSProperties = { background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", borderRadius:8, color:"rgba(255,255,255,.85)", padding:"8px 12px", fontSize:13, fontFamily:ff, outline:"none", width:"100%", boxSizing:"border-box" };
  const lbl: React.CSSProperties = { fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:5, display:"block" };

  return (
    <div style={{ padding:"24px 28px", fontFamily:ff, color:"rgba(255,255,255,.85)", maxWidth:1100 }}>

      {/* Title */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:BLUE }}>Cash Payment Voucher (CPV)</h1>
        <p style={{ margin:"4px 0 0", fontSize:12, color:"rgba(255,255,255,.35)" }}>Suppliers, expenses, ya banks ko cash ya bank payment karein</p>
      </div>

      {/* ── FORM ── */}
      <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:16, padding:24, marginBottom:28 }}>

        {/* Header row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 2fr", gap:14, marginBottom:20 }}>
          <div>
            <label style={lbl}>Date</label>
            <DateInput value={date} onChange={setDate} style={inp} />
          </div>
          <div>
            <label style={lbl}>Mode</label>
            <select value={mode} onChange={e => setMode(e.target.value as any)} style={{ ...inp, cursor:"pointer" }}>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Transfer</option>
            </select>
          </div>
          {mode === "BANK" && (
            <div>
              <label style={lbl}>Bank Account</label>
              <select value={bankId} onChange={e => setBankId(e.target.value)} style={{ ...inp, cursor:"pointer" }}>
                <option value="">Select Bank…</option>
                {bankAccs.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ gridColumn: mode === "BANK" ? "auto" : "3 / span 2" }}>
            <label style={lbl}>Voucher Narration</label>
            <input value={narration} onChange={e => setNarration(e.target.value)} placeholder="Optional overall narration…" style={inp} />
          </div>
        </div>

        {/* Entry rows */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginBottom: 10 }}>new row appears automatically when you fill in the last entry</div>
          {isMobile ? (
            <div>
              {entries.map((row, i) => {
                const filtered = accounts.filter(a => !search[row.id] || a.name.toLowerCase().includes((search[row.id]||"").toLowerCase()));
                return (
                  <div key={row.id} style={{ border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"12px 14px", marginBottom:10, background:"rgba(255,255,255,.02)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase" }}>Entry {i+1}</span>
                      <button onClick={()=>removeRow(row.id)} style={{ padding:"3px 8px", borderRadius:6, background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.2)", color:"#f87171", fontSize:12, cursor:"pointer", fontFamily:ff }}>✕</button>
                    </div>
                    <div style={{ position:"relative", marginBottom:8 }}>
                      <input value={row.accountId ? row.accountName : (search[row.id]||"")} placeholder="Type account name…" style={{ ...inp, fontSize:12 }}
                        onChange={e=>{ setSearch(p=>({...p,[row.id]:e.target.value})); setEntryField(row.id,"accountId",""); setEntryField(row.id,"accountName",""); setDropOpen(p=>({...p,[row.id]:true})); }}
                        onFocus={()=>setDropOpen(p=>({...p,[row.id]:true}))}
                        onBlur={()=>setTimeout(()=>setDropOpen(p=>({...p,[row.id]:false})),180)}
                      />
                      {dropOpen[row.id] && filtered.length > 0 && (
                        <div style={{ position:"absolute", top:"calc(100% + 2px)", left:0, right:0, background:"#0e1120", border:"1px solid rgba(255,255,255,.12)", borderRadius:9, zIndex:100, maxHeight:200, overflowY:"auto", boxShadow:"0 8px 30px rgba(0,0,0,.5)" }}>
                          {filtered.slice(0,20).map(a=>(
                            <div key={a.id} onMouseDown={()=>selectAccount(row.id,a)} style={{ padding:"8px 12px", fontSize:12, cursor:"pointer", color:"rgba(255,255,255,.75)" }} onMouseEnter={e=>(e.currentTarget.style.background="rgba(99,102,241,.1)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                              <span style={{ color:"rgba(255,255,255,.35)", fontSize:11, marginRight:8 }}>{a.code}</span>{a.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input value={row.narration} onChange={e=>setEntryField(row.id,"narration",e.target.value)} placeholder="Narration…" style={{ ...inp, fontSize:12, marginBottom:8 }} />
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <input value={row.amount} onChange={e=>setEntryField(row.id,"amount",e.target.value)} placeholder="0.00" type="number" min="0" style={{ ...inp, flex:1, fontSize:14, fontWeight:700, textAlign:"right" as const, color:BLUE }} />
                      <button title="Party Receipt" onClick={()=>row.accountId&&printReceipt(row,"NEW",date,mode,company)} disabled={!row.accountId||!Number(row.amount)} style={{ padding:"9px 12px", borderRadius:7, background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.25)", color:BLUE, fontSize:13, cursor:"pointer", fontFamily:ff, opacity:(!row.accountId||!Number(row.amount))?0.3:1 }}>🧾</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ border:"1px solid rgba(255,255,255,.08)", borderRadius:10, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"rgba(255,255,255,.04)", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
                    <th style={{ padding:"9px 12px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".06em", textAlign:"left", width:32 }}>#</th>
                    <th style={{ padding:"9px 12px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".06em", textAlign:"left" }}>Account / Party</th>
                    <th style={{ padding:"9px 12px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".06em", textAlign:"left" }}>Narration</th>
                    <th style={{ padding:"9px 12px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".06em", textAlign:"right", width:130 }}>Amount</th>
                    <th style={{ padding:"9px 12px", width:80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row, i) => {
                    const filtered = accounts.filter(a => !search[row.id] || a.name.toLowerCase().includes((search[row.id]||"").toLowerCase()));
                    return (
                      <tr key={row.id} style={{ borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                        <td style={{ padding:"8px 12px", fontSize:12, color:"rgba(255,255,255,.3)", fontWeight:600 }}>{i + 1}</td>
                        <td style={{ padding:"6px 8px", position:"relative" }}>
                          <input value={row.accountId ? row.accountName : (search[row.id]||"")} placeholder="Type account name…" style={{ ...inp, fontSize:12 }}
                            onChange={e=>{ setSearch(p=>({...p,[row.id]:e.target.value})); setEntryField(row.id,"accountId",""); setEntryField(row.id,"accountName",""); setDropOpen(p=>({...p,[row.id]:true})); }}
                            onFocus={()=>setDropOpen(p=>({...p,[row.id]:true}))}
                            onBlur={()=>setTimeout(()=>setDropOpen(p=>({...p,[row.id]:false})),180)}
                          />
                          {dropOpen[row.id] && filtered.length > 0 && (
                            <div style={{ position:"absolute", top:"calc(100% + 2px)", left:8, right:8, background:"#0e1120", border:"1px solid rgba(255,255,255,.12)", borderRadius:9, zIndex:100, maxHeight:200, overflowY:"auto", boxShadow:"0 8px 30px rgba(0,0,0,.5)" }}>
                              {filtered.slice(0,20).map(a=>(
                                <div key={a.id} onMouseDown={()=>selectAccount(row.id,a)} style={{ padding:"8px 12px", fontSize:12, cursor:"pointer", color:"rgba(255,255,255,.75)" }} onMouseEnter={e=>(e.currentTarget.style.background="rgba(99,102,241,.1)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                                  <span style={{ color:"rgba(255,255,255,.35)", fontSize:11, marginRight:8 }}>{a.code}</span>{a.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding:"6px 8px" }}><input value={row.narration} onChange={e=>setEntryField(row.id,"narration",e.target.value)} placeholder="Narration…" style={{ ...inp, fontSize:12 }} /></td>
                        <td style={{ padding:"6px 8px" }}><input value={row.amount} onChange={e=>setEntryField(row.id,"amount",e.target.value)} placeholder="0.00" type="number" min="0" style={{ ...inp, fontSize:13, fontWeight:700, textAlign:"right" as const, color:BLUE }} /></td>
                        <td style={{ padding:"6px 8px", textAlign:"center" }}>
                          <div style={{ display:"flex", gap:4, justifyContent:"center" }}>
                            <button title="Party Receipt Preview" onClick={()=>row.accountId&&printReceipt(row,"NEW",date,mode,company)} disabled={!row.accountId||!Number(row.amount)} style={{ padding:"4px 8px", borderRadius:6, background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.25)", color:BLUE, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:ff, opacity:(!row.accountId||!Number(row.amount))?0.3:1 }}>🧾</button>
                            <button onClick={()=>removeRow(row.id)} style={{ padding:"4px 8px", borderRadius:6, background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.2)", color:"#f87171", fontSize:12, cursor:"pointer", fontFamily:ff }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Total + buttons */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".06em" }}>Total Amount</div>
              <div style={{ fontSize:22, fontWeight:900, color:BLUE }}>{company?.baseCurrency || "PKR"} {fmt(total)}</div>
            </div>
            <button
              onClick={() => printVoucher(entries, "PREVIEW", date, mode, total, company, narration)}
              disabled={total <= 0}
              style={{ padding:"10px 18px", borderRadius:9, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.65)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:ff, opacity:total<=0?0.4:1 }}
            >
              🖨 Print Voucher
            </button>
            <button
              onClick={save}
              disabled={saving || total <= 0}
              style={{ padding:"10px 28px", borderRadius:9, background:`linear-gradient(135deg,${BLUE},#4f46e5)`, border:"none", color:"white", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:ff, opacity:(saving||total<=0)?0.6:1, boxShadow:`0 4px 16px rgba(99,102,241,.3)` }}
            >
              {saving ? "Saving…" : "Save CPV"}
            </button>
          </div>
        </div>
      </div>

      {/* ── HISTORY ── */}
      <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.7)" }}>Past CPV Vouchers</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>{vouchers.length} vouchers</div>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"rgba(255,255,255,.02)", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
              {["CPV #","Date","Accounts","Mode","Total","Actions"].map((h,i) => (
                <th key={h} style={{ padding:"10px 14px", fontSize:11, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".06em", textAlign: i===4?"right":"left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vouchers.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,.25)", fontSize:13 }}>Koi CPV nahi mila</td></tr>
            ) : vouchers.map((v, idx) => (
              <tr key={v.id} style={{ borderBottom: idx < vouchers.length-1 ? "1px solid rgba(255,255,255,.04)" : "none" }}
                onMouseEnter={e => (e.currentTarget.style.background="rgba(255,255,255,.02)")}
                onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                <td style={{ padding:"11px 14px", fontWeight:700, color:BLUE, fontSize:13 }}>{v.voucherNo}</td>
                <td style={{ padding:"11px 14px", fontSize:12, color:"rgba(255,255,255,.5)" }}>{v.date}</td>
                <td style={{ padding:"11px 14px", fontSize:12 }}>
                  {v.entries.map((e, i) => (
                    <div key={i} style={{ color:"rgba(255,255,255,.7)", marginBottom:i<v.entries.length-1?2:0 }}>
                      {e.accountName} <span style={{ color:BLUE, fontWeight:700 }}>Rs {fmt(e.amount)}</span>
                    </div>
                  ))}
                </td>
                <td style={{ padding:"11px 14px", fontSize:11, color:"rgba(255,255,255,.4)" }}>{v.paymentMode}</td>
                <td style={{ padding:"11px 14px", fontSize:14, fontWeight:800, color:BLUE, textAlign:"right" }}>Rs {fmt(v.totalAmount)}</td>
                <td style={{ padding:"11px 14px" }}>
                  <div style={{ display:"flex", gap:6 }}>
                    <button
                      onClick={() => {
                        const fakeEntries: EntryRow[] = v.entries.map(e => ({ id: nextId++, accountId: e.accountId, accountName: e.accountName, amount: String(e.amount), narration: e.narration }));
                        printVoucher(fakeEntries, v.voucherNo, v.date, v.paymentMode, v.totalAmount, company, v.narration);
                      }}
                      style={{ padding:"5px 12px", borderRadius:7, background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", color:BLUE, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:ff }}>
                      🖨 Print
                    </button>
                    <button onClick={() => deleteVoucher(v.id)} style={{ padding:"5px 10px", borderRadius:7, background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.2)", color:"#f87171", fontSize:11, cursor:"pointer", fontFamily:ff }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
