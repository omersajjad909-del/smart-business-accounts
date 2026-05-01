"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "react-hot-toast";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";

const ff = "'Outfit','Inter',sans-serif";
const GREEN = "#22c55e";

type Account  = { id: string; name: string; code?: string; partyType?: string };
type BankAcc  = { id: string; name: string };
type EntryRow = { id: number; accountId: string; accountCode: string; accountName: string; amount: string; narration: string };
type Voucher  = {
  id: string; voucherNo: string; date: string; narration: string;
  paymentMode: string; paymentAccId: string; paymentAccName: string; totalAmount: number;
  entries: { accountId: string; accountName: string; accountCode: string; amount: number; narration: string }[];
};

let nextId = 1;
function newRow(): EntryRow { return { id: nextId++, accountId: "", accountCode: "", accountName: "", amount: "", narration: "" }; }
function initRows() { return Array.from({ length: 8 }, () => newRow()); }
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(iso: string) { const [y, m, d] = iso.split("-"); return `${d}-${m}-${y}`; }
function dateMatchesQuery(iso: string, q: string): boolean {
  const [y, m, d] = iso.split("-");
  const display = `${d}-${m}-${y}`;
  if (display.includes(q) || iso.includes(q)) return true;
  const digits = q.replace(/[-\/\.]/g, "");
  if (/^\d{6}$/.test(digits)) {
    const yy = digits.slice(4, 6);
    const yyyy = parseInt(yy) >= 50 ? `19${yy}` : `20${yy}`;
    return iso === `${yyyy}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  }
  if (/^\d{8}$/.test(digits)) {
    return iso === `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  }
  return false;
}

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
  <div class="center" style="font-size:10px;letter-spacing:1px">CASH RECEIPT</div>
  <div class="line"></div>
  <div class="row"><span>Voucher #</span><span class="bold">${voucherNo}</span></div>
  <div class="row"><span>Date</span><span>${date}</span></div>
  <div class="row"><span>Mode</span><span>${mode}</span></div>
  <div class="line"></div>
  <div class="row"><span>Received From</span><span class="bold">${entry.accountName}</span></div>
  <div class="row bold" style="font-size:14px"><span>Amount</span><span>${cur} ${fmt(Number(entry.amount))}</span></div>
  <div class="line"></div>
  ${entry.narration ? `<div style="font-size:11px;margin-top:6px">Narration: ${entry.narration}</div>` : ""}
  <div style="margin-top:20px;text-align:center;font-size:9px">Powered by FinovaOS</div>
  <script>window.print();<\/script></body></html>`);
  w.document.close();
}

function printVoucher(entries: EntryRow[], voucherNo: string, date: string, mode: string, totalAmt: number, company: any, narration: string) {
  const co  = company?.name || "Company";
  const cur = company?.baseCurrency || "PKR";
  const rows = entries.filter(e => e.accountId && Number(e.amount) > 0);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>CRV ${voucherNo}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:30px;max-width:680px;margin:0 auto;color:#111}
    .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #111;padding-bottom:14px;margin-bottom:20px}
    .co{font-size:22px;font-weight:900}.rh{font-size:16px;font-weight:900;text-decoration:underline;text-align:right}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#f3f4f6;border:1px solid #999;padding:8px 10px;font-size:11px;text-transform:uppercase;text-align:left}
    td{border:1px solid #ccc;padding:8px 10px;font-size:12px}
    .amt{text-align:right;font-weight:700;color:#166534}
    .sig{border-top:2px solid #111;padding-top:4px;font-size:9px;font-weight:700;text-transform:uppercase;text-align:center;width:120px}
    .sigs{display:flex;justify-content:space-between;margin-top:48px}
    @media print{body{padding:8mm}}
  </style></head><body>
  <div class="hdr">
    <div><div class="co">${co}</div><div style="font-size:10px;color:#666;letter-spacing:2px">INTERNAL ACCOUNTING VOUCHER</div></div>
    <div><div class="rh">CASH RECEIPT VOUCHER</div>
    <div style="font-size:12px;font-weight:700;text-align:right">CRV No: ${voucherNo}</div>
    <div style="font-size:12px;font-weight:700;text-align:right">Date: ${date}</div>
    <div style="font-size:12px;text-align:right">Mode: ${mode}</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Code</th><th>Account</th><th>Narration</th><th style="text-align:right">Amount (${cur})</th></tr></thead>
    <tbody>
      ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.accountCode||"—"}</td><td>${r.accountName}</td><td>${r.narration || "—"}</td><td class="amt">${fmt(Number(r.amount))}</td></tr>`).join("")}
    </tbody>
    <tfoot>
      <tr style="background:#f0fdf4"><td colspan="4" style="text-align:right;font-weight:800;border-top:2px solid #111">TOTAL RECEIVED</td>
      <td style="text-align:right;font-weight:900;font-size:15px;border-top:2px solid #111;color:#166534">${cur} ${fmt(totalAmt)}</td></tr>
    </tfoot>
  </table>
  ${narration ? `<div style="margin-top:14px;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;font-size:12px"><b>Narration:</b> ${narration}</div>` : ""}
  <div class="sigs"><div class="sig">Prepared By</div><div class="sig">Reviewed By</div><div class="sig">Approved By</div></div>
  <div style="margin-top:20px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:8px">Auto-generated — FinovaOS — ${new Date().toLocaleString()}</div>
  <script>window.print();<\/script></body></html>`);
  w.document.close();
}

export default function CRVPage() {
  const user  = getCurrentUser();
  const today = new Date().toISOString().slice(0, 10);

  const [bankAccs,  setBankAccs]  = useState<BankAcc[]>([]);
  const [vouchers,  setVouchers]  = useState<Voucher[]>([]);
  const [company,   setCompany]   = useState<any>(null);
  const [saving,    setSaving]    = useState(false);

  const [date,      setDate]      = useState(today);
  const [mode,      setMode]      = useState<"CASH"|"BANK">("CASH");
  const [bankId,    setBankId]    = useState("");
  const [narration, setNarration] = useState("");
  const [entries,   setEntries]   = useState<EntryRow[]>(initRows);

  // ── Find Record (F7/F8) ─────────────────────────────────────────────────────
  const [findOpen,     setFindOpen]     = useState(false);
  const [findSearch,   setFindSearch]   = useState("");
  const [findSelected, setFindSelected] = useState<string>("");

  // ── Account Picker ──────────────────────────────────────────────────────────
  const [pickerOpen,     setPickerOpen]     = useState(false);
  const [pickerRowId,    setPickerRowId]    = useState<number | null>(null);
  const [pickerSearch,   setPickerSearch]   = useState("");
  const [pickerSelected, setPickerSelected] = useState<string>("");
  const [pickerAccts,    setPickerAccts]    = useState<Account[]>([]);
  const [pickerLoading,  setPickerLoading]  = useState(false);

  const h = () => ({ "x-user-role": user?.role||"", "x-user-id": user?.id||"", "x-company-id": user?.companyId||"", "Content-Type": "application/json" });

  useEffect(() => {
    Promise.all([
      fetch("/api/crv",           { headers: h() }).then(r => r.json()),
      fetch("/api/bank-accounts", { headers: h() }).then(r => r.json()),
      fetch("/api/me/company",    { headers: h() }).then(r => r.ok ? r.json() : null),
    ]).then(([v, b, co]) => {
      if (Array.isArray(v)) setVouchers(v);
      if (Array.isArray(b)) setBankAccs(b.map((x: any) => ({ id: x.id, name: x.accountName || `${x.bankName} - ${x.accountNo}` })));
      if (co) setCompany(co);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openPicker(rowId: number) {
    setPickerRowId(rowId);
    setPickerSearch("");
    setPickerSelected("");
    setPickerOpen(true);
    if (pickerAccts.length === 0) {
      setPickerLoading(true);
      try {
        const r = await fetch("/api/accounts?search=", { headers: h() });
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data)) setPickerAccts(data);
        }
      } catch {}
      setPickerLoading(false);
    }
  }

  function closePicker() { setPickerOpen(false); setPickerRowId(null); }

  // ── F7/F8 Find ──────────────────────────────────────────────────────────────
  const filteredFindVouchers = findSearch.trim()
    ? vouchers.filter(v =>
        v.voucherNo.toLowerCase().includes(findSearch.toLowerCase()) ||
        dateMatchesQuery(v.date, findSearch.trim()) ||
        v.entries.some(e => e.accountName.toLowerCase().includes(findSearch.toLowerCase()))
      )
    : vouchers;

  function openFind() {
    setFindSearch("");
    setFindSelected(vouchers[0]?.id || "");
    setFindOpen(true);
  }
  function closeFind() { setFindOpen(false); }

  function loadVoucher(v: Voucher) {
    setDate(v.date);
    setMode(v.paymentMode as "CASH" | "BANK");
    setNarration(v.narration || "");
    if (v.paymentMode === "BANK") {
      const matched = bankAccs.find(b => b.name === v.paymentAccName);
      setBankId(matched?.id || "");
    } else {
      setBankId("");
    }
    const loaded: EntryRow[] = v.entries.map(e => ({
      id: nextId++, accountId: e.accountId, accountCode: e.accountCode,
      accountName: e.accountName, amount: String(e.amount), narration: e.narration || "",
    }));
    while (loaded.length < 8) loaded.push(newRow());
    setEntries(loaded);
    closeFind();
    toast.success(`${v.voucherNo} loaded`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F7") { e.preventDefault(); if (!pickerOpen) openFind(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);

  function confirmPicker(acc: Account) {
    if (pickerRowId === null) return;
    const rowId = pickerRowId;
    setEntries(prev => {
      const updated = prev.map(e => e.id === rowId
        ? { ...e, accountId: acc.id, accountCode: acc.code || "", accountName: acc.name }
        : e
      );
      const idx = updated.findIndex(e => e.id === rowId);
      if (idx === updated.length - 1) return [...updated, newRow()];
      return updated;
    });
    closePicker();
    setTimeout(() => document.getElementById(`crv-nar-${rowId}`)?.focus(), 30);
  }

  const filteredPickerAccts = pickerSearch.trim()
    ? pickerAccts.filter(a =>
        a.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        (a.code || "").toLowerCase().includes(pickerSearch.toLowerCase())
      )
    : pickerAccts;

  function setEntryField(id: number, field: keyof EntryRow, val: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: val } : e));
  }
  function removeRow(id: number) {
    setEntries(prev => prev.length > 1 ? prev.filter(e => e.id !== id) : prev);
  }

  const total = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  async function save() {
    const valid = entries.filter(e => e.accountId && Number(e.amount) > 0);
    if (!valid.length) { toast.error("Kam az kam aik valid entry add karein"); return; }
    if (mode === "BANK" && !bankId) { toast.error("Bank account select karein"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/crv", {
        method: "POST", headers: h(),
        body: JSON.stringify({ date, paymentMode: mode, bankAccountId: bankId || undefined, narration, entries: valid.map(e => ({ accountId: e.accountId, amount: Number(e.amount), narration: e.narration })) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(`CRV ${d.voucherNo} save ho gaya!`);
      setEntries(initRows()); setNarration(""); setMode("CASH"); setBankId("");
      fetch("/api/crv", { headers: h() }).then(r => r.json()).then(v => Array.isArray(v) && setVouchers(v));
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function deleteVoucher(id: string) {
    if (!confirm("Ye voucher delete karein?")) return;
    const r = await fetch(`/api/crv?id=${id}`, { method: "DELETE", headers: h() });
    if (r.ok) { toast.success("Deleted"); setVouchers(prev => prev.filter(v => v.id !== id)); }
  }

  const inp: React.CSSProperties = { background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", borderRadius:8, color:"rgba(255,255,255,.85)", padding:"8px 12px", fontSize:13, fontFamily:ff, outline:"none", width:"100%", boxSizing:"border-box" };
  const lbl: React.CSSProperties = { fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:5, display:"block" };
  const clickInp: React.CSSProperties = { ...inp, cursor:"pointer", caretColor:"transparent" };

  return (
    <div style={{ padding:"24px 28px", fontFamily:ff, color:"rgba(255,255,255,.85)", maxWidth:1200 }}>

      {/* ── F7 FIND RECORD MODAL ── */}
      {findOpen && (
        <div
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.82)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={closeFind}
        >
          <div
            style={{ background:"#0a0f1e", border:"1px solid rgba(34,197,94,.25)", borderRadius:14, width:780, maxHeight:600, display:"flex", flexDirection:"column", boxShadow:"0 24px 80px rgba(0,0,0,.95)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* header */}
            <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(255,255,255,.08)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:11, fontWeight:800, background:GREEN, color:"#000", borderRadius:5, padding:"2px 8px", letterSpacing:".05em" }}>F7</span>
                <span style={{ fontWeight:800, fontSize:15, color:"rgba(255,255,255,.9)", letterSpacing:".04em" }}>FIND CRV RECORD</span>
              </div>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{filteredFindVouchers.length} records</span>
            </div>
            {/* search */}
            <div style={{ padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
              <input
                autoFocus
                placeholder="Search by voucher no, date (e.g. 01-05-2026 or 010526), or account name…"
                value={findSearch}
                onChange={e => { setFindSearch(e.target.value); setFindSelected(filteredFindVouchers[0]?.id || ""); }}
                onKeyDown={e => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const idx = filteredFindVouchers.findIndex(v => v.id === findSelected);
                    const next = filteredFindVouchers[Math.min(idx + 1, filteredFindVouchers.length - 1)];
                    if (next) setFindSelected(next.id);
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const idx = filteredFindVouchers.findIndex(v => v.id === findSelected);
                    const prev = filteredFindVouchers[Math.max(idx - 1, 0)];
                    if (prev) setFindSelected(prev.id);
                  }
                  if (e.key === "Enter" || e.key === "F8") {
                    e.preventDefault();
                    const v = filteredFindVouchers.find(v => v.id === findSelected) || filteredFindVouchers[0];
                    if (v) loadVoucher(v);
                  }
                  if (e.key === "Escape") closeFind();
                }}
                style={{ ...inp, fontSize:13, width:"100%", boxSizing:"border-box" }}
              />
            </div>
            {/* list */}
            <div style={{ flex:1, overflowY:"auto", maxHeight:400 }}>
              {filteredFindVouchers.length === 0 ? (
                <div style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,.25)", fontSize:13 }}>No records found</div>
              ) : (
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:"rgba(255,255,255,.04)", position:"sticky", top:0 }}>
                      {["CRV #","Date","Account(s)","Mode","Total"].map((h, i) => (
                        <th key={h} style={{ padding:"8px 14px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".06em", textAlign: i===4 ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFindVouchers.map(v => (
                      <tr
                        key={v.id}
                        tabIndex={0}
                        onClick={() => setFindSelected(v.id)}
                        onDoubleClick={() => loadVoucher(v)}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === "F8") { e.preventDefault(); loadVoucher(v); } }}
                        style={{ background: findSelected === v.id ? "rgba(34,197,94,.18)" : "transparent", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,.04)", outline:"none" }}
                        onMouseEnter={e => { if (findSelected !== v.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.04)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = findSelected === v.id ? "rgba(34,197,94,.18)" : "transparent"; }}
                      >
                        <td style={{ padding:"10px 14px", fontWeight:800, color:GREEN, fontSize:13 }}>{v.voucherNo}</td>
                        <td style={{ padding:"10px 14px", fontSize:12, color:"rgba(255,255,255,.55)" }}>{fmtDate(v.date)}</td>
                        <td style={{ padding:"10px 14px", fontSize:12, color:"rgba(255,255,255,.75)" }}>
                          {v.entries.map((e, i) => <div key={i}>{e.accountName}</div>)}
                        </td>
                        <td style={{ padding:"10px 14px", fontSize:11, color:"rgba(255,255,255,.4)" }}>{v.paymentMode}</td>
                        <td style={{ padding:"10px 14px", fontSize:13, fontWeight:700, color:GREEN, textAlign:"right" }}>Rs {fmt(v.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* footer */}
            <div style={{ padding:"12px 20px", borderTop:"1px solid rgba(255,255,255,.07)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.25)" }}>
                <b style={{ color:"rgba(255,255,255,.45)" }}>↑↓</b> Navigate &nbsp;·&nbsp; <b style={{ color:"rgba(255,255,255,.45)" }}>Enter / F8</b> Open &nbsp;·&nbsp; <b style={{ color:"rgba(255,255,255,.45)" }}>Esc</b> Cancel
              </span>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={closeFind} style={{ padding:"8px 18px", borderRadius:8, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.55)", fontSize:13, cursor:"pointer", fontFamily:ff }}>Cancel</button>
                <button
                  onClick={() => { const v = filteredFindVouchers.find(v => v.id === findSelected) || filteredFindVouchers[0]; if (v) loadVoucher(v); }}
                  disabled={filteredFindVouchers.length === 0}
                  style={{ padding:"8px 24px", borderRadius:8, background:`linear-gradient(135deg,${GREEN},#16a34a)`, border:"none", color:"#000", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:ff, opacity:filteredFindVouchers.length===0?0.4:1, letterSpacing:".04em" }}
                >
                  F8 — Open
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CHART OF ACCOUNT MODAL ── */}
      {pickerOpen && (
        <div
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.78)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={closePicker}
        >
          <div
            style={{ background:"#0c0e1a", border:"1px solid rgba(255,255,255,.15)", borderRadius:14, width:640, maxHeight:580, display:"flex", flexDirection:"column", boxShadow:"0 24px 80px rgba(0,0,0,.9)" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(255,255,255,.1)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:800, fontSize:15, color:"rgba(255,255,255,.9)", letterSpacing:".05em" }}>CHART OF ACCOUNT</span>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>Choices in list: {filteredPickerAccts.length}</span>
            </div>
            <div style={{ padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:12, color:"rgba(255,255,255,.4)", minWidth:30 }}>Find</span>
                <input
                  autoFocus
                  placeholder="Search by name or code…"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && filteredPickerAccts.length > 0) {
                      const acc = filteredPickerAccts.find(a => a.id === pickerSelected) || filteredPickerAccts[0];
                      confirmPicker(acc);
                    }
                    if (e.key === "Escape") closePicker();
                  }}
                  style={{ ...inp, flex:1, fontSize:13 }}
                />
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto", maxHeight:380 }}>
              {pickerLoading ? (
                <div style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,.35)", fontSize:13 }}>Loading accounts…</div>
              ) : filteredPickerAccts.length === 0 ? (
                <div style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,.25)", fontSize:13, lineHeight:1.6 }}>
                  No accounts found.<br />
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.18)" }}>Please add accounts in Chart of Accounts first.</span>
                </div>
              ) : (
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:"rgba(255,255,255,.05)", position:"sticky", top:0, zIndex:1 }}>
                      <th style={{ padding:"8px 16px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", textAlign:"left", width:130 }}>CODE</th>
                      <th style={{ padding:"8px 16px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", textAlign:"left" }}>TITLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPickerAccts.map(a => (
                      <tr
                        key={a.id}
                        tabIndex={0}
                        onClick={() => setPickerSelected(a.id)}
                        onDoubleClick={() => confirmPicker(a)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirmPicker(a); } }}
                        style={{ background: pickerSelected === a.id ? "rgba(34,197,94,.2)" : "transparent", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,.04)", transition:"background .1s", outline:"none" }}
                        onMouseEnter={e => { if (pickerSelected !== a.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.05)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = pickerSelected === a.id ? "rgba(34,197,94,.2)" : "transparent"; }}
                      >
                        <td style={{ padding:"9px 16px", fontSize:12, color:"rgba(255,255,255,.45)", fontFamily:"monospace", letterSpacing:".04em" }}>{a.code}</td>
                        <td style={{ padding:"9px 16px", fontSize:13, color:"rgba(255,255,255,.82)", fontWeight: pickerSelected === a.id ? 700 : 400 }}>{a.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ padding:"12px 20px", borderTop:"1px solid rgba(255,255,255,.08)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.28)" }}>Double-click or select + OK to confirm</span>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={closePicker} style={{ padding:"8px 20px", borderRadius:8, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.6)", fontSize:13, cursor:"pointer", fontFamily:ff }}>Cancel</button>
                <button
                  onClick={() => { const acc = filteredPickerAccts.find(a => a.id === pickerSelected) || filteredPickerAccts[0]; if (acc) confirmPicker(acc); }}
                  disabled={filteredPickerAccts.length === 0}
                  style={{ padding:"8px 28px", borderRadius:8, background:GREEN, border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:ff, opacity:filteredPickerAccts.length === 0 ? 0.4 : 1 }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div style={{ marginBottom:20, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:GREEN }}>Cash Receipt Voucher (CRV)</h1>
          <p style={{ margin:"4px 0 0", fontSize:12, color:"rgba(255,255,255,.35)" }}>Customers se cash ya bank payment receive karein</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.25)", borderRadius:10, padding:"8px 16px", textAlign:"right" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".06em" }}>Next CRV #</div>
            <div style={{ fontSize:16, fontWeight:800, color:GREEN }}>
              CRV-{vouchers.length + 1}
            </div>
          </div>
          <div style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:10, padding:"8px 16px", textAlign:"right" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".06em" }}>Saved Vouchers</div>
            <div style={{ fontSize:16, fontWeight:800, color:"rgba(255,255,255,.7)" }}>{vouchers.length}</div>
          </div>
          <button
            onClick={openFind}
            style={{ padding:"8px 16px", borderRadius:10, background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.25)", color:GREEN, fontSize:12, cursor:"pointer", fontFamily:ff, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}
          >
            <span style={{ background:GREEN, color:"#000", borderRadius:4, padding:"1px 6px", fontSize:10, fontWeight:800 }}>F7</span>
            Find Record
          </button>
          <button
            onClick={() => document.getElementById("crv-history")?.scrollIntoView({ behavior:"smooth" })}
            style={{ padding:"8px 16px", borderRadius:10, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.5)", fontSize:12, cursor:"pointer", fontFamily:ff }}
          >
            📋 View History ↓
          </button>
        </div>
      </div>

      {/* ── FORM ── */}
      <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:16, padding:24, marginBottom:28 }}>

        <div style={{ display:"grid", gridTemplateColumns:"160px 160px 1fr 2fr", gap:14, marginBottom:20 }}>
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
          {mode === "BANK" ? (
            <div>
              <label style={lbl}>Bank Account</label>
              <select value={bankId} onChange={e => setBankId(e.target.value)} style={{ ...inp, cursor:"pointer" }}>
                <option value="">Select Bank…</option>
                {bankAccs.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          ) : <div />}
          <div>
            <label style={lbl}>Voucher Narration</label>
            <input value={narration} onChange={e => setNarration(e.target.value)} placeholder="Optional overall narration…" style={inp} />
          </div>
        </div>

        {/* Entry table */}
        <div style={{ border:"1px solid rgba(255,255,255,.08)", borderRadius:10, overflow:"hidden", marginBottom:14 }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.1)" }}>
                <th style={{ padding:"9px 10px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em", textAlign:"center", width:36 }}>#</th>
                <th style={{ padding:"9px 10px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em", textAlign:"left", width:120 }}>A/c Code</th>
                <th style={{ padding:"9px 10px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em", textAlign:"left" }}>Account Title</th>
                <th style={{ padding:"9px 10px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em", textAlign:"left" }}>Narration</th>
                <th style={{ padding:"9px 10px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em", textAlign:"right", width:140 }}>Amount</th>
                <th style={{ padding:"9px 10px", width:70 }}></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row, i) => (
                <tr key={row.id} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.015)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding:"5px 10px", fontSize:11, color:"rgba(255,255,255,.28)", fontWeight:600, textAlign:"center" }}>{i + 1}</td>
                  <td style={{ padding:"4px 6px", width:120 }}>
                    <input
                      id={`crv-code-${row.id}`}
                      value={row.accountCode}
                      placeholder="—"
                      readOnly
                      onClick={() => openPicker(row.id)}
                      style={{ ...clickInp, fontSize:12, fontFamily:"monospace", letterSpacing:".03em" }}
                    />
                  </td>
                  <td style={{ padding:"4px 6px" }}>
                    <input
                      value={row.accountName}
                      placeholder="Click to select account…"
                      readOnly
                      onClick={() => openPicker(row.id)}
                      style={{ ...clickInp, fontSize:12 }}
                    />
                  </td>
                  <td style={{ padding:"4px 6px" }}>
                    <input
                      id={`crv-nar-${row.id}`}
                      value={row.narration}
                      onChange={e => setEntryField(row.id, "narration", e.target.value)}
                      placeholder="Narration…"
                      style={{ ...inp, fontSize:12 }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); document.getElementById(`crv-amt-${row.id}`)?.focus(); } }}
                    />
                  </td>
                  <td style={{ padding:"4px 6px" }}>
                    <input
                      id={`crv-amt-${row.id}`}
                      value={row.amount}
                      onChange={e => setEntryField(row.id, "amount", e.target.value)}
                      placeholder="0.00"
                      type="number"
                      min="0"
                      style={{ ...inp, fontSize:13, fontWeight:700, textAlign:"right" as const, color:GREEN }}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          const idx = entries.findIndex(r => r.id === row.id);
                          const nextRow = entries[idx + 1];
                          if (nextRow) {
                            openPicker(nextRow.id);
                          } else {
                            const nr = newRow();
                            setEntries(prev => [...prev, nr]);
                            setTimeout(() => openPicker(nr.id), 50);
                          }
                        }
                      }}
                    />
                  </td>
                  <td style={{ padding:"4px 8px", textAlign:"center" }}>
                    <div style={{ display:"flex", gap:4, justifyContent:"center" }}>
                      <button
                        type="button"
                        title="Print Receipt"
                        onClick={() => row.accountId && printReceipt(row, "NEW", date, mode, company)}
                        disabled={!row.accountId || !Number(row.amount)}
                        style={{ padding:"4px 8px", borderRadius:6, background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.25)", color:GREEN, fontSize:11, cursor:"pointer", fontFamily:ff, opacity:(!row.accountId || !Number(row.amount)) ? 0.3 : 1 }}
                      >🧾</button>
                      <button
                        onClick={() => removeRow(row.id)}
                        style={{ padding:"4px 8px", borderRadius:6, background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.2)", color:"#f87171", fontSize:12, cursor:"pointer", fontFamily:ff }}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <button
            onClick={() => setEntries(prev => [...prev, newRow()])}
            style={{ padding:"8px 18px", borderRadius:8, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.45)", fontSize:12, cursor:"pointer", fontFamily:ff }}
          >
            + Add Row
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".06em" }}>Total Amount</div>
              <div style={{ fontSize:22, fontWeight:900, color:GREEN }}>{company?.baseCurrency || "PKR"} {fmt(total)}</div>
            </div>
            <button
              onClick={() => printVoucher(entries, "PREVIEW", date, mode, total, company, narration)}
              disabled={total <= 0}
              style={{ padding:"10px 18px", borderRadius:9, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.65)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:ff, opacity:total<=0?0.4:1 }}
            >🖨 Print Voucher</button>
            <button
              onClick={save}
              disabled={saving || total <= 0}
              style={{ padding:"10px 28px", borderRadius:9, background:`linear-gradient(135deg,${GREEN},#16a34a)`, border:"none", color:"white", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:ff, opacity:(saving||total<=0)?0.6:1, boxShadow:`0 4px 16px rgba(34,197,94,.3)` }}
            >
              {saving ? "Saving…" : "Save CRV"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Oracle-style status bar ── */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {[
          { key:"F7", label:"Find Record" },
          { key:"F8", label:"Open (in Find)" },
          { key:"Enter", label:"Next Field" },
          { key:"Esc", label:"Cancel Popup" },
        ].map(s => (
          <div key={s.key} style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:6, padding:"4px 10px" }}>
            <span style={{ background:"rgba(34,197,94,.15)", color:GREEN, borderRadius:4, padding:"1px 7px", fontSize:10, fontWeight:800, fontFamily:"monospace" }}>{s.key}</span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── HISTORY ── */}
      <div id="crv-history" style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.7)" }}>
            Past CRV Vouchers
            {vouchers.length > 0 && <span style={{ marginLeft:10, fontSize:12, background:"rgba(34,197,94,.15)", color:GREEN, borderRadius:20, padding:"2px 10px", fontWeight:600 }}>{vouchers.length}</span>}
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>Last: <b style={{ color:"rgba(255,255,255,.6)" }}>{vouchers[0]?.voucherNo || "—"}</b></div>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"rgba(255,255,255,.02)", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
              {["CRV #","Date","Accounts","Mode","Total","Actions"].map((h, i) => (
                <th key={h} style={{ padding:"10px 14px", fontSize:11, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".06em", textAlign: i===4?"right":"left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vouchers.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,.25)", fontSize:13 }}>No CRV records found</td></tr>
            ) : vouchers.map((v, idx) => (
              <tr key={v.id} style={{ borderBottom: idx < vouchers.length-1 ? "1px solid rgba(255,255,255,.04)" : "none" }}
                onMouseEnter={e => (e.currentTarget.style.background="rgba(255,255,255,.02)")}
                onMouseLeave={e => (e.currentTarget.style.background="transparent")}
              >
                <td style={{ padding:"11px 14px", fontWeight:700, color:GREEN, fontSize:13 }}>{v.voucherNo}</td>
                <td style={{ padding:"11px 14px", fontSize:12, color:"rgba(255,255,255,.5)" }}>{v.date}</td>
                <td style={{ padding:"11px 14px", fontSize:12 }}>
                  {v.entries.map((e, i) => (
                    <div key={i} style={{ color:"rgba(255,255,255,.7)", marginBottom:i<v.entries.length-1?2:0 }}>
                      <span style={{ color:"rgba(255,255,255,.3)", fontSize:11, marginRight:6, fontFamily:"monospace" }}>{e.accountCode}</span>
                      {e.accountName} <span style={{ color:GREEN, fontWeight:700 }}>Rs {fmt(e.amount)}</span>
                    </div>
                  ))}
                </td>
                <td style={{ padding:"11px 14px", fontSize:11, color:"rgba(255,255,255,.4)" }}>{v.paymentMode}</td>
                <td style={{ padding:"11px 14px", fontSize:14, fontWeight:800, color:GREEN, textAlign:"right" }}>Rs {fmt(v.totalAmount)}</td>
                <td style={{ padding:"11px 14px" }}>
                  <div style={{ display:"flex", gap:6 }}>
                    <button
                      onClick={() => {
                        const fakeEntries: EntryRow[] = v.entries.map(e => ({ id: nextId++, accountId: e.accountId, accountCode: e.accountCode, accountName: e.accountName, amount: String(e.amount), narration: e.narration }));
                        printVoucher(fakeEntries, v.voucherNo, v.date, v.paymentMode, v.totalAmount, company, v.narration);
                      }}
                      style={{ padding:"5px 12px", borderRadius:7, background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.2)", color:GREEN, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:ff }}
                    >🖨 Print</button>
                    <button
                      onClick={() => deleteVoucher(v.id)}
                      style={{ padding:"5px 10px", borderRadius:7, background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.2)", color:"#f87171", fontSize:11, cursor:"pointer", fontFamily:ff }}
                    >✕</button>
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
