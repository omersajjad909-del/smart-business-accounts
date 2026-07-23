"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "react-hot-toast";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import { useResponsive } from "@/hooks/useResponsive";

const ff     = "'Outfit','Inter',sans-serif";
const PURPLE = "#a78bfa";

type Account = { id: string; name: string; code: string; type: string };
type Entry   = { id: string; accountId: string; accountName: string; amount: string; type: "DEBIT" | "CREDIT" };
type Voucher = { id: string; voucherNo: string; date: string; narration: string; entries: Array<{ accountId: string; accountName: string; amount: number }>; totalDebit: number; totalCredit: number };

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(iso: string) { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}-${m}-${y}`; }

function parseIsoFromInput(raw: string): string {
  const digits = raw.replace(/[-\/\.]/g, "");
  if (/^\d{6}$/.test(digits)) {
    const yy = digits.slice(4, 6);
    const yyyy = parseInt(yy) >= 50 ? `19${yy}` : `20${yy}`;
    return `${yyyy}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  }
  if (/^\d{8}$/.test(digits)) return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return "";
}

function parseDateOp(raw: string): { op: string; iso: string } | null {
  let op = "=", rest = raw.trim();
  if (rest.startsWith(">=")) { op = ">="; rest = rest.slice(2).trim(); }
  else if (rest.startsWith("<=")) { op = "<="; rest = rest.slice(2).trim(); }
  else if (rest.startsWith(">"))  { op = ">";  rest = rest.slice(1).trim(); }
  else if (rest.startsWith("<"))  { op = "<";  rest = rest.slice(1).trim(); }
  else if (rest.startsWith("="))  { op = "=";  rest = rest.slice(1).trim(); }
  const iso = parseIsoFromInput(rest);
  if (!iso) return null;
  return { op, iso };
}

function matchesDateOp(vIso: string, query: string): boolean {
  if (!query.trim()) return true;
  const p = parseDateOp(query);
  if (!p) return false;
  const { op, iso } = p;
  if (op === "=")  return vIso === iso;
  if (op === ">")  return vIso > iso;
  if (op === "<")  return vIso < iso;
  if (op === ">=") return vIso >= iso;
  if (op === "<=") return vIso <= iso;
  return false;
}

function runQuery(vouchers: Voucher[], jvNo: string, dateQ: string, party: string): Voucher[] {
  let r = [...vouchers];
  if (jvNo.trim()) { const q = jvNo.trim().toLowerCase(); r = r.filter(v => v.voucherNo.toLowerCase().includes(q)); }
  if (dateQ.trim()) r = r.filter(v => matchesDateOp(v.date.slice(0, 10), dateQ));
  if (party.trim()) {
    const q = party.trim().toLowerCase();
    r = r.filter(v => v.entries.some(e => e.accountName.toLowerCase().includes(q)));
  }
  return r.sort((a, b) => a.date.localeCompare(b.date));
}

const BLANK_ENTRIES: Entry[] = [
  { id: "1", accountId: "", accountName: "", amount: "", type: "DEBIT" },
  { id: "2", accountId: "", accountName: "", amount: "", type: "CREDIT" },
];

export default function JVPage() {
  const { isMobile } = useResponsive();
  const today = new Date().toISOString().slice(0, 10);
  const user  = getCurrentUser();

  const [accounts,  setAccounts]  = useState<Account[]>([]);
  const [vouchers,  setVouchers]  = useState<Voucher[]>([]);
  const [editing,   setEditing]   = useState<Voucher | null>(null);
  const [saved,     setSaved]     = useState<any>(null);
  const [entries,   setEntries]   = useState<Entry[]>(BLANK_ENTRIES);
  const [date,      setDate]      = useState(today);
  const [narration, setNarration] = useState("");
  const [saving,    setSaving]    = useState(false);

  // ── Query Mode (F7 / F8) ────────────────────────────────────────────────────
  const [queryMode,    setQueryMode]    = useState(false);
  const [queryJvNo,    setQueryJvNo]    = useState("");
  const [queryDate,    setQueryDate]    = useState("");
  const [queryParty,   setQueryParty]   = useState("");
  const [queryResults, setQueryResults] = useState<Voucher[]>([]);
  const [queryIdx,     setQueryIdx]     = useState(-1);

  const h = (json = false): Record<string, string> => ({
    "x-user-role":  user?.role      || "",
    "x-user-id":    user?.id        || "",
    "x-company-id": user?.companyId || "",
    ...(json ? { "Content-Type": "application/json" } : {}),
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [vRes, aRes] = await Promise.all([
      fetch("/api/jv",       { headers: h() }),
      fetch("/api/accounts", { headers: h() }),
    ]);
    const [vData, aData] = await Promise.all([vRes.json(), aRes.json()]);
    if (Array.isArray(vData)) setVouchers(vData);
    setAccounts(Array.isArray(aData) ? aData : aData.accounts || []);
  }

  function addEntry() {
    setEntries(prev => [...prev, { id: Date.now().toString(), accountId: "", accountName: "", amount: "", type: "DEBIT" }]);
  }

  function removeEntry(id: string) {
    if (entries.length <= 2) { toast.error("Minimum 2 entries required"); return; }
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function updateEntry(id: string, field: keyof Entry, value: any) {
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      if (field === "accountId") {
        const acc = accounts.find(a => a.id === value);
        return { ...e, accountId: value, accountName: acc?.name || "" };
      }
      if (field === "type") {
        const abs = Math.abs(Number(e.amount) || 0);
        return { ...e, type: value, amount: value === "DEBIT" ? abs.toString() : (-abs).toString() };
      }
      if (field === "amount") {
        const abs = Math.abs(Number(value) || 0);
        return { ...e, amount: e.type === "DEBIT" ? abs.toString() : (-abs).toString() };
      }
      return { ...e, [field]: value };
    }));
  }

  const totalDebit  = entries.reduce((s, e) => { const n = Number(e.amount)||0; return s + (n > 0 ? n : 0); }, 0);
  const totalCredit = entries.reduce((s, e) => { const n = Number(e.amount)||0; return s + (n < 0 ? Math.abs(n) : 0); }, 0);
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.01;

  async function saveJV() {
    if (!balanced) { toast.error(`Debit (${fmt(totalDebit)}) ≠ Credit (${fmt(totalCredit)})`); return; }
    for (const e of entries) {
      if (!e.accountId) { toast.error("All entries must have an account"); return; }
      if (!Number(e.amount)) { toast.error("All entries must have non-zero amount"); return; }
    }
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const body: any = { entries: entries.map(e => ({ accountId: e.accountId, amount: Number(e.amount) })), date, narration };
      if (editing) body.id = editing.id;
      const res  = await fetch("/api/jv", { method, headers: h(true), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || "Save failed"); return; }
      setSaved(data);
      toast.success(editing ? "JV updated!" : "JV saved!");
      setEditing(null);
      await loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  function resetForm() {
    setEntries(BLANK_ENTRIES); setNarration(""); setDate(today);
  }

  function startEdit(v: Voucher) {
    setEditing(v); setDate(v.date.slice(0, 10)); setNarration(v.narration);
    setEntries(v.entries.map((e, i) => ({
      id: (i + 1).toString(), accountId: e.accountId, accountName: e.accountName,
      amount: e.amount.toString(), type: e.amount > 0 ? "DEBIT" : "CREDIT",
    })));
    setSaved(null);
  }

  async function deleteVoucher(id: string) {
    if (!await confirmToast("Delete this JV?")) return;
    const res = await fetch(`/api/jv?id=${id}`, { method: "DELETE", headers: h() });
    if (res.ok) { toast.success("Deleted!"); await loadAll(); } else toast.error("Delete failed");
  }

  // ── Query Mode helpers ───────────────────────────────────────────────────────
  function enterQueryMode() {
    setQueryMode(true);
    setQueryJvNo("");
    setQueryDate("");
    setQueryParty("");
    setQueryResults([]);
    setQueryIdx(-1);
  }

  function exitQueryMode() {
    setQueryMode(false);
    setQueryIdx(-1);
    setQueryResults([]);
  }

  function executeQuery(jvNo: string, dateQ: string, party: string) {
    const results = runQuery(vouchers, jvNo, dateQ, party);
    if (results.length === 0) { toast.error("No records found matching your criteria"); return; }
    setQueryResults(results);
    setQueryIdx(0);
    setQueryMode(false);
    startEdit(results[0]);
    toast.success(`${results.length} record${results.length > 1 ? "s" : ""} found — ${results[0].voucherNo}`);
  }

  function navTo(idx: number) {
    if (idx < 0 || idx >= queryResults.length) return;
    setQueryIdx(idx);
    startEdit(queryResults[idx]);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F7") { e.preventDefault(); enterQueryMode(); }
      if (e.key === "Escape" && queryMode) { e.preventDefault(); exitQueryMode(); }
      if (e.key === "PageDown" && queryIdx >= 0) { e.preventDefault(); navTo(queryIdx + 1); }
      if (e.key === "PageUp"   && queryIdx >= 0) { e.preventDefault(); navTo(queryIdx - 1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryMode, queryIdx, queryResults]);

  const inp:   React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", color: "var(--text-primary)", fontFamily: ff, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const lbl:   React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };
  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };

  return (
    <>
      <style>{`
        @media print { body * { visibility:hidden!important; } .print-area,.print-area * { visibility:visible!important; } .print-area { position:fixed; inset:0; } @page { margin:8mm 10mm; } }
        @media screen { .print-area { display:none; } }
      `}</style>

      <div style={{ padding: isMobile ? "13px 13px" : "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1000 }}>

        {/* Title */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: queryMode ? "#facc15" : PURPLE }}>
              {queryMode ? "🔍 QUERY MODE — JV" : "Journal Voucher (JV)"}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: queryMode ? "rgba(250,204,21,.5)" : "var(--text-muted)" }}>
              {queryMode ? "Enter search criteria then press F8 to execute" : "Record double-entry journal entries — debit must equal credit"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Browse navigation */}
            {queryIdx >= 0 && !queryMode && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.2)", borderRadius: 10, padding: "6px 12px" }}>
                <button onClick={() => navTo(queryIdx - 1)} disabled={queryIdx === 0}
                  style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: queryIdx === 0 ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.7)", fontSize: 13, cursor: queryIdx === 0 ? "default" : "pointer", fontFamily: ff }}>◀</button>
                <span style={{ fontSize: 12, color: PURPLE, fontWeight: 700, minWidth: 80, textAlign: "center" }}>
                  {queryResults[queryIdx]?.voucherNo} · {queryIdx + 1} / {queryResults.length}
                </span>
                <button onClick={() => navTo(queryIdx + 1)} disabled={queryIdx === queryResults.length - 1}
                  style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: queryIdx === queryResults.length - 1 ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.7)", fontSize: 13, cursor: queryIdx === queryResults.length - 1 ? "default" : "pointer", fontFamily: ff }}>▶</button>
                <button onClick={exitQueryMode}
                  style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", color: "#f87171", fontSize: 11, cursor: "pointer", fontFamily: ff }}>✕ Clear</button>
              </div>
            )}
            {queryIdx < 0 && !queryMode && (
              <>
                <div style={{ background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.25)", borderRadius: 10, padding: "8px 16px", textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Next JV #</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: PURPLE }}>JV-{vouchers.length + 1}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "8px 16px", textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Saved Vouchers</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{vouchers.length}</div>
                </div>
              </>
            )}
            <button
              onClick={queryMode ? exitQueryMode : enterQueryMode}
              style={{ padding: "8px 16px", borderRadius: 10, background: queryMode ? "rgba(250,204,21,.1)" : "rgba(167,139,250,.08)", border: `1px solid ${queryMode ? "rgba(250,204,21,.3)" : "rgba(167,139,250,.25)"}`, color: queryMode ? "#facc15" : PURPLE, fontSize: 12, cursor: "pointer", fontFamily: ff, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}
            >
              <span style={{ background: queryMode ? "#facc15" : PURPLE, color: "#000", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>F7</span>
              {queryMode ? "Cancel Query" : "Query Mode"}
            </button>
            {!queryMode && (
              <button onClick={() => { resetForm(); setEditing(null); setSaved(null); exitQueryMode(); }}
                style={{ padding: "8px 16px", borderRadius: 10, background: PURPLE, border: "none", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: ff, fontWeight: 700 }}>
                + New JV
              </button>
            )}
          </div>
        </div>

        {/* ── QUERY MODE FORM ── */}
        {queryMode && (
          <div style={{ background: "rgba(250,204,21,.04)", border: "2px solid rgba(250,204,21,.3)", borderRadius: 16, padding: 28, marginBottom: 28 }}>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: "rgba(250,204,21,.7)" }}>Enter criteria — leave blank to get all records. Use <b style={{ color: "#facc15" }}>&gt;</b>, <b style={{ color: "#facc15" }}>&lt;</b>, <b style={{ color: "#facc15" }}>&gt;=</b> for date range.</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "180px 240px 1fr", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ ...lbl, color: "rgba(250,204,21,.6)" }}>JV # (e.g. JV-5)</label>
                <input autoFocus value={queryJvNo} onChange={e => setQueryJvNo(e.target.value)} placeholder="JV-1 or blank for all…"
                  style={{ ...inp, border: "1px solid rgba(250,204,21,.3)", background: "rgba(250,204,21,.05)" }}
                  onKeyDown={e => { if (e.key === "F8") { e.preventDefault(); executeQuery(queryJvNo, queryDate, queryParty); } if (e.key === "Escape") exitQueryMode(); }} />
              </div>
              <div>
                <label style={{ ...lbl, color: "rgba(250,204,21,.6)" }}>Date (e.g. &gt;010425 or 01-05-2026)</label>
                <input value={queryDate} onChange={e => setQueryDate(e.target.value)} placeholder=">010125 or 01-01-2025 or blank…"
                  style={{ ...inp, border: "1px solid rgba(250,204,21,.3)", background: "rgba(250,204,21,.05)" }}
                  onKeyDown={e => { if (e.key === "F8") { e.preventDefault(); executeQuery(queryJvNo, queryDate, queryParty); } if (e.key === "Escape") exitQueryMode(); }} />
              </div>
              <div>
                <label style={{ ...lbl, color: "rgba(250,204,21,.6)" }}>Account (name)</label>
                <input value={queryParty} onChange={e => setQueryParty(e.target.value)} placeholder="e.g. Cash, Sales, or blank…"
                  style={{ ...inp, border: "1px solid rgba(250,204,21,.3)", background: "rgba(250,204,21,.05)" }}
                  onKeyDown={e => { if (e.key === "F8") { e.preventDefault(); executeQuery(queryJvNo, queryDate, queryParty); } if (e.key === "Escape") exitQueryMode(); }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => executeQuery(queryJvNo, queryDate, queryParty)}
                style={{ padding: "10px 32px", borderRadius: 9, background: "linear-gradient(135deg,#facc15,#ca8a04)", border: "none", color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: ff, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "rgba(0,0,0,.2)", borderRadius: 4, padding: "1px 7px", fontSize: 11 }}>F8</span>
                Execute Query
              </button>
              <button onClick={exitQueryMode} style={{ padding: "10px 20px", borderRadius: 9, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)", fontSize: 13, cursor: "pointer", fontFamily: ff }}>Cancel (Esc)</button>
              <span style={{ fontSize: 11, color: "rgba(250,204,21,.4)", marginLeft: 8 }}>
                Operators: <b style={{ color: "rgba(250,204,21,.7)" }}>&gt;010425</b> (after) &nbsp; <b style={{ color: "rgba(250,204,21,.7)" }}>&lt;010425</b> (before) &nbsp; <b style={{ color: "rgba(250,204,21,.7)" }}>010425</b> (exact)
              </span>
            </div>
          </div>
        )}

        {/* ── FORM ── */}
        {!saved && (
          <div style={{ ...panel, display: queryMode ? "none" : undefined }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: PURPLE }}>{editing ? `Edit: ${editing.voucherNo}` : "New Journal Voucher"}</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={lbl}>Date *</label>
                <DateInput value={date} onChange={setDate} style={inp} />
              </div>
              <div>
                <label style={lbl}>Narration</label>
                <input type="text" style={inp} value={narration} onChange={e => setNarration(e.target.value)} placeholder="Description of transaction" />
              </div>
            </div>

            {/* Entries table */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Entries</span>
                <button onClick={addEntry} style={{ background: PURPLE, color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontFamily: ff, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add Entry</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Account", "Type", "Amount", ""].map(h => (
                        <th key={h} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", textAlign: h === "Amount" ? "right" : "left", letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => (
                      <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 10px" }}>
                          <select style={inp} value={e.accountId} onChange={ev => updateEntry(e.id, "accountId", ev.target.value)}>
                            <option value="">— Select Account —</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "8px 10px", width: 110 }}>
                          <select style={inp} value={e.type} onChange={ev => updateEntry(e.id, "type", ev.target.value)}>
                            <option value="DEBIT">Debit</option>
                            <option value="CREDIT">Credit</option>
                          </select>
                        </td>
                        <td style={{ padding: "8px 10px", width: 130 }}>
                          <input type="number" style={{ ...inp, textAlign: "right" }} value={Math.abs(Number(e.amount) || 0) || ""} onChange={ev => updateEntry(e.id, "amount", ev.target.value)} placeholder="0.00" />
                        </td>
                        <td style={{ padding: "8px 10px", width: 40, textAlign: "center" }}>
                          {entries.length > 2 && (
                            <button onClick={() => removeEntry(e.id)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid var(--border)" }}>
                      <td colSpan={2} style={{ padding: "10px 10px", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textAlign: "right" }}>Total:</td>
                      <td style={{ padding: "10px 10px", textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 700 }}>Dr: {fmt(totalDebit)}</div>
                        <div style={{ fontSize: 12, color: "#f87171", fontWeight: 700 }}>Cr: {fmt(totalCredit)}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: balanced ? "#22c55e" : "#f87171", marginTop: 2 }}>
                          {balanced ? "✓ Balanced" : "✗ Not Balanced"}
                        </div>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveJV} disabled={saving || !balanced} style={{ background: balanced ? PURPLE : "rgba(255,255,255,0.1)", color: balanced ? "#fff" : "var(--text-muted)", border: "none", borderRadius: 8, padding: "10px 24px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: saving || !balanced ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editing ? "Update JV" : "Save JV"}
              </button>
              {editing && (
                <button onClick={() => { resetForm(); setEditing(null); exitQueryMode(); }} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 20px", fontFamily: ff, fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
              )}
              {editing && (
                <button onClick={() => deleteVoucher(editing.id)} style={{ background: "transparent", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "10px 20px", fontFamily: ff, fontSize: 14, color: "#f87171", cursor: "pointer" }}>Delete</button>
              )}
            </div>
          </div>
        )}

        {/* After save */}
        {saved && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...panel, display: "flex", gap: 10 }}>
              <button onClick={() => window.print()} style={{ background: PURPLE, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Print JV</button>
              <button onClick={() => { setSaved(null); resetForm(); }} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>New JV</button>
            </div>
            <div style={{ ...panel, background: "#fff", color: "#111", padding: 36 }}>
              <div style={{ textAlign: "center", borderBottom: "3px solid #111", paddingBottom: 14, marginBottom: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>JOURNAL VOUCHER</div>
                <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>No: {saved.voucherNo} &nbsp;|&nbsp; Date: {fmtDate(date)}</div>
              </div>
              {narration && <div style={{ marginBottom: 18, fontSize: 13 }}><strong>Narration:</strong> {narration}</div>}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
                <thead>
                  <tr style={{ borderTop: "2px solid #111", borderBottom: "2px solid #111", background: "#f5f5f5" }}>
                    <th style={{ padding: "9px 12px", textAlign: "left" }}>Account</th>
                    <th style={{ padding: "9px 12px", textAlign: "right", width: 120 }}>Debit</th>
                    <th style={{ padding: "9px 12px", textAlign: "right", width: 120 }}>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {(saved.entries || entries).map((e: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e5e5e5" }}>
                      <td style={{ padding: "9px 12px", fontWeight: 600 }}>{e.account?.name || e.accountName || "N/A"}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right" }}>{e.amount > 0 ? fmt(e.amount) : "—"}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right" }}>{e.amount < 0 ? fmt(Math.abs(e.amount)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid #111", fontWeight: 900 }}>
                    <td style={{ padding: "9px 12px", textAlign: "right" }}>Total:</td>
                    <td style={{ padding: "9px 12px", textAlign: "right" }}>{fmt(totalDebit)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right" }}>{fmt(totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Shortcuts Bar ── */}
        {!saved && (
          <div style={{ display: "flex", gap: 6, marginTop: 20, flexWrap: "wrap" }}>
            {(queryMode ? [
              { key: "F8", label: "Execute Query", color: "#facc15" },
              { key: "Esc", label: "Cancel Query", color: undefined },
            ] : queryIdx >= 0 ? [
              { key: "F7", label: "New Query", color: PURPLE },
              { key: "PageDown", label: "Next Record", color: undefined },
              { key: "PageUp", label: "Prev Record", color: undefined },
            ] : [
              { key: "F7", label: "Query Mode", color: PURPLE },
              { key: "Enter", label: "Next Field", color: undefined },
            ]).map(s => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 6, padding: "4px 10px" }}>
                <span style={{ background: s.color ? `${s.color}22` : "rgba(255,255,255,.06)", color: s.color || "rgba(255,255,255,.5)", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 800, fontFamily: "monospace", border: `1px solid ${s.color ? `${s.color}44` : "rgba(255,255,255,.1)"}` }}>{s.key}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {saved && (
        <div className="print-area" style={{ fontFamily: "'Outfit','Arial',sans-serif", color: "#000", background: "#fff", padding: "8mm 10mm", fontSize: 12 }}>
          <div style={{ textAlign: "center", borderBottom: "3px solid #000", paddingBottom: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>JOURNAL VOUCHER</div>
            <div style={{ fontSize: 11, color: "#333", marginTop: 3 }}>No: {saved.voucherNo} &nbsp;|&nbsp; Date: {fmtDate(date)}</div>
          </div>
          {narration && <div style={{ marginBottom: 14, fontSize: 11 }}><strong>Narration:</strong> {narration}</div>}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 18 }}>
            <thead>
              <tr style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", background: "#f0f0f0" }}>
                <th style={{ padding: "7px 10px", textAlign: "left" }}>Account</th>
                <th style={{ padding: "7px 10px", textAlign: "right", width: 100 }}>Debit</th>
                <th style={{ padding: "7px 10px", textAlign: "right", width: 100 }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {(saved.entries || entries).map((e: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "7px 10px", fontWeight: 600 }}>{e.account?.name || e.accountName}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right" }}>{e.amount > 0 ? fmt(e.amount) : "—"}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right" }}>{e.amount < 0 ? fmt(Math.abs(e.amount)) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #000", fontWeight: 900 }}>
                <td style={{ padding: "7px 10px", textAlign: "right" }}>Total:</td>
                <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmt(totalDebit)}</td>
                <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmt(totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
