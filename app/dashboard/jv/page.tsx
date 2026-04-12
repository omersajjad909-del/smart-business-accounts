"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "react-hot-toast";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ff     = "'Outfit','Inter',sans-serif";
const accent = "#a78bfa";

type Account = { id: string; name: string; code: string; type: string };
type Entry   = { id: string; accountId: string; accountName: string; amount: string; type: "DEBIT" | "CREDIT" };
type Voucher = { id: string; voucherNo: string; date: string; narration: string; entries: Array<{ accountId: string; accountName: string; amount: number }>; totalDebit: number; totalCredit: number };

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const BLANK_ENTRIES: Entry[] = [
  { id: "1", accountId: "", accountName: "", amount: "", type: "DEBIT" },
  { id: "2", accountId: "", accountName: "", amount: "", type: "CREDIT" },
];

export default function JVPage() {
  const today = new Date().toISOString().slice(0, 10);
  const user  = getCurrentUser();

  const [accounts,  setAccounts]  = useState<Account[]>([]);
  const [vouchers,  setVouchers]  = useState<Voucher[]>([]);
  const [showList,  setShowList]  = useState(false);
  const [editing,   setEditing]   = useState<Voucher | null>(null);
  const [saved,     setSaved]     = useState<any>(null);
  const [entries,   setEntries]   = useState<Entry[]>(BLANK_ENTRIES);
  const [date,      setDate]      = useState(today);
  const [narration, setNarration] = useState("");
  const [saving,    setSaving]    = useState(false);

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
    setEditing(v); setDate(v.date.slice(0,10)); setNarration(v.narration);
    setEntries(v.entries.map((e, i) => ({
      id: (i+1).toString(), accountId: e.accountId, accountName: e.accountName,
      amount: e.amount.toString(), type: e.amount > 0 ? "DEBIT" : "CREDIT",
    })));
    setShowList(false); setSaved(null);
  }

  async function deleteVoucher(id: string) {
    if (!await confirmToast("Delete this JV?")) return;
    const res = await fetch(`/api/jv?id=${id}`, { method: "DELETE", headers: h() });
    if (res.ok) { toast.success("Deleted!"); await loadAll(); } else toast.error("Delete failed");
  }

  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };
  const inp:   React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", color: "var(--text-primary)", fontFamily: ff, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const lbl:   React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <>
      <style>{`
        @media print { body * { visibility:hidden!important; } .print-area,.print-area * { visibility:visible!important; } .print-area { position:fixed; inset:0; } @page { margin:8mm 10mm; } }
        @media screen { .print-area { display:none; } }
      `}</style>

      <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1000 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: accent }}>Journal Voucher (JV)</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Record double-entry journal entries — debit must equal credit</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowList(v => !v)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 18px", fontFamily: ff, fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
              {showList ? "Hide List" : "View List"}
            </button>
            <button onClick={() => { resetForm(); setEditing(null); setSaved(null); }} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              + New JV
            </button>
          </div>
        </div>

        {/* List */}
        {showList && (
          <div style={{ ...panel, padding: 0, overflow: "hidden", marginBottom: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Voucher No","Date","Narration","Debit","Credit","Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: ["Debit","Credit"].includes(h) ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No JVs found</td></tr>
                ) : vouchers.map((v, idx) => (
                  <tr key={v.id} style={{ borderBottom: idx < vouchers.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: accent, fontSize: 13 }}>{v.voucherNo}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>{v.date?.slice(0,10)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{v.narration}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, textAlign: "right", color: "#22c55e" }}>{fmt(v.totalDebit)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, textAlign: "right", color: "#f87171" }}>{fmt(v.totalCredit)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", fontFamily: ff }} onClick={() => startEdit(v)}>Edit</button>
                        <button style={{ background: "transparent", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#f87171", cursor: "pointer", fontFamily: ff }} onClick={() => deleteVoucher(v.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Form */}
        {!saved && (
          <div style={panel}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: accent }}>{editing ? "Edit Journal Voucher" : "New Journal Voucher"}</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={lbl}>Date *</label>
                <input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} />
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
                <button onClick={addEntry} style={{ background: accent, color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontFamily: ff, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add Entry</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Account","Type","Amount",""].map(h => (
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
                          <input type="number" style={{ ...inp, textAlign: "right" }} value={Math.abs(Number(e.amount)||0) || ""} onChange={ev => updateEntry(e.id, "amount", ev.target.value)} placeholder="0.00" />
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
              <button onClick={saveJV} disabled={saving || !balanced} style={{ background: balanced ? accent : "rgba(255,255,255,0.1)", color: balanced ? "#fff" : "var(--text-muted)", border: "none", borderRadius: 8, padding: "10px 24px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: saving || !balanced ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editing ? "Update JV" : "Save JV"}
              </button>
              {editing && (
                <button onClick={() => { resetForm(); setEditing(null); }} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 20px", fontFamily: ff, fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
              )}
            </div>
          </div>
        )}

        {/* After save */}
        {saved && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...panel, display: "flex", gap: 10 }}>
              <button onClick={() => window.print()} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Print JV</button>
              <button onClick={() => { setSaved(null); resetForm(); }} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>New JV</button>
            </div>
            <div style={{ ...panel, background: "#fff", color: "#111", padding: 36 }}>
              <div style={{ textAlign: "center", borderBottom: "3px solid #111", paddingBottom: 14, marginBottom: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>JOURNAL VOUCHER</div>
                <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>No: {saved.voucherNo} &nbsp;|&nbsp; Date: {date}</div>
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
      </div>

      {saved && (
        <div className="print-area" style={{ fontFamily: "'Outfit','Arial',sans-serif", color: "#000", background: "#fff", padding: "8mm 10mm", fontSize: 12 }}>
          <div style={{ textAlign: "center", borderBottom: "3px solid #000", paddingBottom: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>JOURNAL VOUCHER</div>
            <div style={{ fontSize: 11, color: "#333", marginTop: 3 }}>No: {saved.voucherNo} &nbsp;|&nbsp; Date: {date}</div>
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
