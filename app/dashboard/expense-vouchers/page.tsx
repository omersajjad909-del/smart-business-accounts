"use client";
import { fmtDate } from "@/lib/dateUtils";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import { useResponsive } from "@/hooks/useResponsive";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ff     = "'Outfit','Inter',sans-serif";
const accent = "#f97316";

interface ExpenseVoucher {
  id: string; voucherNo: string; date: string; description: string;
  totalAmount: number; approvalStatus: string;
  expenseAccount?: { id: string; name: string };
  paymentAccount?: { id: string; name: string };
  items?: ExpenseItem[];
}
interface ExpenseItem { description: string; amount: number; category: string; }
type Acct = { id: string; code?: string; name: string; type?: string | null; partyType?: string | null; };

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function parseIsoFromInput(raw: string): string {
  const d = raw.replace(/[-\/\.]/g, "");
  if (/^\d{6}$/.test(d)) { const yy=d.slice(4,6); return `${parseInt(yy)>=50?`19${yy}`:`20${yy}`}-${d.slice(2,4)}-${d.slice(0,2)}`; }
  if (/^\d{8}$/.test(d)) return `${d.slice(4,8)}-${d.slice(2,4)}-${d.slice(0,2)}`;
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
function evRunQuery(vouchers: ExpenseVoucher[], vNo: string, dateQ: string, desc: string): ExpenseVoucher[] {
  let r=[...vouchers];
  if (vNo.trim()) { const q=vNo.trim().toLowerCase(); r=r.filter(v=>v.voucherNo.toLowerCase().includes(q)); }
  if (dateQ.trim()) r=r.filter(v=>matchesDateOp(new Date(v.date).toISOString().slice(0,10), dateQ));
  if (desc.trim()) { const q=desc.trim().toLowerCase(); r=r.filter(v=>v.description.toLowerCase().includes(q)||(v.expenseAccount?.name||"").toLowerCase().includes(q)); }
  return r.sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  DRAFT:    { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" },
  PENDING:  { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
  APPROVED: { bg: "rgba(34,197,94,0.15)",   text: "#22c55e" },
  REJECTED: { bg: "rgba(248,113,113,0.15)", text: "#f87171" },
};

const CATEGORIES = ["TRAVEL","FOOD","SUPPLIES","UTILITIES","OTHER"];

export default function ExpenseVouchersPage() {
  const { isMobile } = useResponsive();
  const user = getCurrentUser();

  const [vouchers,    setVouchers]    = useState<ExpenseVoucher[]>([]);
  const [accounts,    setAccounts]    = useState<Acct[]>([]);
  const [showForm,    setShowForm]    = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [editingId,   setEditingId]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ── Query Mode (F7 / F8) ────────────────────────────────────────────────────
  const [queryMode,    setQueryMode]    = useState(false);
  const [queryVNo,     setQueryVNo]     = useState("");
  const [queryDate,    setQueryDate]    = useState("");
  const [queryDesc,    setQueryDesc]    = useState("");
  const [queryResults, setQueryResults] = useState<ExpenseVoucher[]>([]);
  const [queryIdx,     setQueryIdx]     = useState(-1);
  const [items,       setItems]       = useState<ExpenseItem[]>([{ description: "", amount: 0, category: "" }]);
  const [form,        setForm]        = useState({
    voucherNo: "", date: new Date().toISOString().slice(0, 10),
    description: "", expenseAccountId: "", paymentAccountId: "",
  });

  const h = (json = false): Record<string, string> => ({
    "x-user-role":  user?.role      || "",
    "x-user-id":    user?.id        || "",
    "x-company-id": user?.companyId || "",
    ...(json ? { "Content-Type": "application/json" } : {}),
  });

  useEffect(() => { fetchVouchers(); fetchAccounts(); }, [statusFilter]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key==="F7") { e.preventDefault(); evEnterQuery(); }
      if (e.key==="Escape" && queryMode) { e.preventDefault(); evExitQuery(); }
      if (e.key==="PageDown" && queryIdx>=0) { e.preventDefault(); evNavTo(queryIdx+1); }
      if (e.key==="PageUp"   && queryIdx>=0) { e.preventDefault(); evNavTo(queryIdx-1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryMode, queryIdx, queryResults]);

  async function fetchVouchers() {
    try {
      const url = statusFilter ? `/api/expense-vouchers?status=${statusFilter}` : "/api/expense-vouchers";
      const res  = await fetch(url, { headers: h() });
      const data = await res.json();
      setVouchers(Array.isArray(data) ? data : []);
    } catch { setVouchers([]); }
  }

  async function fetchAccounts() {
    try {
      const res  = await fetch("/api/accounts", { headers: h() });
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch { setAccounts([]); }
  }

  const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url    = editingId ? `/api/expense-vouchers?id=${editingId}` : "/api/expense-vouchers";
      const res    = await fetch(url, {
        method, headers: h(true),
        body: JSON.stringify({ ...form, totalAmount, items: items.map(i => ({ ...i, amount: parseFloat(String(i.amount)) })) }),
      });
      if (res.ok) {
        toast.success(editingId ? "Voucher updated!" : "Voucher saved!");
        resetForm();
        fetchVouchers();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed");
      }
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  function evEnterQuery() { setQueryMode(true); setQueryVNo(""); setQueryDate(""); setQueryDesc(""); setQueryResults([]); setQueryIdx(-1); }
  function evExitQuery()  { setQueryMode(false); setQueryIdx(-1); setQueryResults([]); }
  function evNavTo(idx: number) {
    if (idx<0||idx>=queryResults.length) return;
    setQueryIdx(idx); handleEdit(queryResults[idx]);
  }
  function evExecuteQuery(vNo: string, dateQ: string, desc: string) {
    const results = evRunQuery(vouchers, vNo, dateQ, desc);
    if (results.length===0) { toast.error("No records found"); return; }
    setQueryResults(results); setQueryIdx(0); setQueryMode(false);
    handleEdit(results[0]);
    toast.success(`${results.length} record${results.length>1?"s":""} found — ${results[0].voucherNo}`);
  }

  function resetForm() {
    setForm({ voucherNo: "", date: new Date().toISOString().slice(0, 10), description: "", expenseAccountId: "", paymentAccountId: "" });
    setItems([{ description: "", amount: 0, category: "" }]);
    setEditingId("");
    setShowForm(false);
  }

  function handleEdit(v: ExpenseVoucher) {
    setEditingId(v.id);
    setForm({
      voucherNo: v.voucherNo,
      date: new Date(v.date).toISOString().slice(0, 10),
      description: v.description,
      expenseAccountId: v.expenseAccount?.id || "",
      paymentAccountId: v.paymentAccount?.id || "",
    });
    setItems(v.items && v.items.length > 0
      ? v.items.map(i => ({ description: i.description || "", amount: i.amount || 0, category: i.category || "" }))
      : [{ description: "", amount: 0, category: "" }]);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this expense voucher?")) return;
    const res = await fetch(`/api/expense-vouchers?id=${id}`, { method: "DELETE", headers: h() });
    if (res.ok) { toast.success("Deleted!"); fetchVouchers(); } else toast.error("Delete failed");
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/expense-vouchers?id=${id}`, {
      method: "PUT", headers: h(true), body: JSON.stringify({ id, approvalStatus: status }),
    });
    if (res.ok) { toast.success(`Status → ${status}`); fetchVouchers(); } else toast.error("Failed");
  }

  const expenseAccounts = accounts.filter(a => {
    const n = a.name.toLowerCase(), t = (a.type || "").toLowerCase(), p = (a.partyType || "").toLowerCase();
    return n.includes("expense") || t.includes("expense") || p.includes("expense");
  });
  const paymentAccounts = accounts.filter(a => {
    const n = a.name.toLowerCase(), t = (a.type || "").toLowerCase(), p = (a.partyType || "").toLowerCase();
    return n.includes("cash") || n.includes("bank") || t.includes("cash") || t.includes("bank") || p.includes("bank");
  });

  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };
  const inp:   React.CSSProperties = { width: "100%", background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl:   React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div style={{ padding: isMobile ? "13px 13px" : "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: queryMode ? "#facc15" : accent }}>
            {queryMode ? "🔍 QUERY MODE — Expense Vouchers" : "Expense Vouchers"}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: queryMode ? "rgba(250,204,21,.5)" : "var(--text-muted)" }}>
            {queryMode ? "Enter search criteria then press F8 to execute" : "Record and track business expenses with approval workflow"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {queryIdx >= 0 && !queryMode && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(249,115,22,.08)", border: "1px solid rgba(249,115,22,.2)", borderRadius: 10, padding: "6px 12px" }}>
              <button onClick={() => evNavTo(queryIdx-1)} disabled={queryIdx===0} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: queryIdx===0?"rgba(255,255,255,.2)":"rgba(255,255,255,.7)", fontSize: 13, cursor: queryIdx===0?"default":"pointer", fontFamily: ff }}>◀</button>
              <span style={{ fontSize: 12, color: accent, fontWeight: 700, minWidth: 80, textAlign: "center" }}>{queryResults[queryIdx]?.voucherNo} · {queryIdx+1}/{queryResults.length}</span>
              <button onClick={() => evNavTo(queryIdx+1)} disabled={queryIdx===queryResults.length-1} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: queryIdx===queryResults.length-1?"rgba(255,255,255,.2)":"rgba(255,255,255,.7)", fontSize: 13, cursor: queryIdx===queryResults.length-1?"default":"pointer", fontFamily: ff }}>▶</button>
              <button onClick={evExitQuery} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", color: "#f87171", fontSize: 11, cursor: "pointer", fontFamily: ff }}>✕ Clear</button>
            </div>
          )}
          <button onClick={queryMode ? evExitQuery : evEnterQuery}
            style={{ background: queryMode ? "rgba(250,204,21,.1)" : "rgba(249,115,22,.08)", border: `1px solid ${queryMode?"rgba(250,204,21,.3)":"rgba(249,115,22,.3)"}`, color: queryMode?"#facc15":accent, borderRadius: 8, padding: "9px 16px", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: queryMode?"#facc15":accent, color: "#fff", borderRadius: 3, padding: "0 5px", fontSize: 10, fontWeight: 800 }}>F7</span>
            {queryMode ? "Cancel Query" : "Query Mode"}
          </button>
          <button onClick={() => { if (showForm) { resetForm(); } else { setShowForm(true); evExitQuery(); } }} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {showForm ? "Cancel" : "+ New Expense"}
          </button>
        </div>
      </div>

      {/* Query Mode Form */}
      {queryMode && (
        <div style={{ background: "rgba(250,204,21,.04)", border: "2px solid rgba(250,204,21,.3)", borderRadius: 16, padding: 28, marginBottom: 28 }}>
          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 12, color: "rgba(250,204,21,.7)" }}>Enter criteria — leave blank to get all records. Use <b style={{ color: "#facc15" }}>&gt;</b>, <b style={{ color: "#facc15" }}>&lt;</b>, <b style={{ color: "#facc15" }}>&gt;=</b> for date range.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "180px 240px 1fr", gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ ...lbl, color: "rgba(250,204,21,.6)" }}>Voucher # (e.g. EV-5)</label>
              <input autoFocus value={queryVNo} onChange={e=>setQueryVNo(e.target.value)} placeholder="EV-1 or blank…"
                style={{ ...inp, border: "1px solid rgba(250,204,21,.3)", background: "rgba(250,204,21,.05)" }}
                onKeyDown={e=>{ if(e.key==="F8"){e.preventDefault();evExecuteQuery(queryVNo,queryDate,queryDesc);} if(e.key==="Escape")evExitQuery(); }} />
            </div>
            <div>
              <label style={{ ...lbl, color: "rgba(250,204,21,.6)" }}>Date (e.g. &gt;010425 or 01-05-2026)</label>
              <input value={queryDate} onChange={e=>setQueryDate(e.target.value)} placeholder=">010125 or blank…"
                style={{ ...inp, border: "1px solid rgba(250,204,21,.3)", background: "rgba(250,204,21,.05)" }}
                onKeyDown={e=>{ if(e.key==="F8"){e.preventDefault();evExecuteQuery(queryVNo,queryDate,queryDesc);} if(e.key==="Escape")evExitQuery(); }} />
            </div>
            <div>
              <label style={{ ...lbl, color: "rgba(250,204,21,.6)" }}>Description / Account</label>
              <input value={queryDesc} onChange={e=>setQueryDesc(e.target.value)} placeholder="e.g. Travel, Rent, or blank…"
                style={{ ...inp, border: "1px solid rgba(250,204,21,.3)", background: "rgba(250,204,21,.05)" }}
                onKeyDown={e=>{ if(e.key==="F8"){e.preventDefault();evExecuteQuery(queryVNo,queryDate,queryDesc);} if(e.key==="Escape")evExitQuery(); }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => evExecuteQuery(queryVNo, queryDate, queryDesc)}
              style={{ padding: "10px 32px", borderRadius: 9, background: "linear-gradient(135deg,#facc15,#ca8a04)", border: "none", color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: ff, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "rgba(0,0,0,.2)", borderRadius: 4, padding: "1px 7px", fontSize: 11 }}>F8</span>Execute Query
            </button>
            <button onClick={evExitQuery} style={{ padding: "10px 20px", borderRadius: 9, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", fontFamily: ff }}>Cancel (Esc)</button>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ ...panel, marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: accent, marginBottom: 18 }}>{editingId ? "Edit Expense Voucher" : "New Expense Voucher"}</div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={lbl}>Voucher No *</label>
              <input style={inp} value={form.voucherNo} onChange={e => setForm(f => ({ ...f, voucherNo: e.target.value }))} placeholder="EV-001" required />
            </div>
            <div>
              <label style={lbl}>Date *</label>
              <DateInput value={form.date} onChange={value => setForm(f => ({ ...f, date: value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Expense Account *</label>
              <select style={inp} value={form.expenseAccountId} onChange={e => setForm(f => ({ ...f, expenseAccountId: e.target.value }))} required>
                <option value="">— Select —</option>
                {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Payment Account *</label>
              <select style={inp} value={form.paymentAccountId} onChange={e => setForm(f => ({ ...f, paymentAccountId: e.target.value }))} required>
                <option value="">— Select —</option>
                {paymentAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>Description</label>
            <textarea style={{ ...inp, height: 56, resize: "vertical" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Items */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>Expense Items</div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--panel-bg)", borderBottom: "1px solid var(--border)" }}>
                    {["Description", "Category", "Amount", ""].map(h => (
                      <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textAlign: h === "Amount" ? "right" : "left", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < items.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "8px 14px" }}>
                        <input style={{ ...inp, padding: "6px 10px" }} value={item.description}
                          onChange={e => { const n = [...items]; n[idx] = { ...n[idx], description: e.target.value }; setItems(n); }} placeholder="Description" />
                      </td>
                      <td style={{ padding: "8px 14px" }}>
                        <select style={{ ...inp, padding: "6px 10px" }} value={item.category}
                          onChange={e => { const n = [...items]; n[idx] = { ...n[idx], category: e.target.value }; setItems(n); }}>
                          <option value="">— Category —</option>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "8px 14px" }}>
                        <input type="number" step="0.01" style={{ ...inp, padding: "6px 10px", textAlign: "right" }} value={item.amount}
                          onChange={e => { const n = [...items]; n[idx] = { ...n[idx], amount: parseFloat(e.target.value) || 0 }; setItems(n); }} placeholder="0.00" />
                      </td>
                      <td style={{ padding: "8px 14px", textAlign: "center" }}>
                        <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <button type="button" onClick={() => setItems([...items, { description: "", amount: 0, category: "" }])}
                style={{ background: "transparent", border: `1px dashed ${accent}55`, borderRadius: 6, padding: "6px 14px", color: accent, fontFamily: ff, fontSize: 13, cursor: "pointer" }}>
                + Add Item
              </button>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Total: <span style={{ color: accent }}>{fmt(totalAmount)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={saving} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : editingId ? "Update Voucher" : "Save Voucher"}
            </button>
            <button type="button" onClick={resetForm} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 20px", fontFamily: ff, fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div style={{ marginBottom: 16 }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ ...inp, width: "auto", minWidth: 160, display: "inline-block" }}>
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Shortcuts Bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {(queryMode ? [
          { key: "F8", label: "Execute Query", color: "#facc15" },
          { key: "Esc", label: "Cancel Query", color: undefined },
        ] : queryIdx >= 0 ? [
          { key: "F7", label: "New Query", color: accent },
          { key: "PageDown", label: "Next Record", color: undefined },
          { key: "PageUp", label: "Prev Record", color: undefined },
        ] : [
          { key: "F7", label: "Query Mode", color: accent },
        ]).map(s => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 6, padding: "4px 10px" }}>
            <span style={{ background: s.color ? `${s.color}22` : "rgba(255,255,255,.06)", color: s.color || "var(--text-muted)", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 800, fontFamily: "monospace", border: `1px solid ${s.color ? `${s.color}44` : "rgba(255,255,255,.1)"}` }}>{s.key}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Voucher No", "Date", "Description", "Expense Acct", "Payment Acct", "Amount", "Status", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vouchers.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No expense vouchers found. Create your first one!</td></tr>
            ) : vouchers.map((v, idx) => {
              const sc = STATUS_COLOR[v.approvalStatus] || STATUS_COLOR.DRAFT;
              return (
                <tr key={v.id} style={{ borderBottom: idx < vouchers.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--panel-bg)"}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                  <td style={{ padding: "13px 16px", fontWeight: 700, color: accent, fontSize: 13 }}>{v.voucherNo}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-muted)" }}>{fmtDate(v.date)}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13 }}>{v.description || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13 }}>{v.expenseAccount?.name || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13 }}>{v.paymentAccount?.name || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, textAlign: "right", color: accent }}>{fmt(v.totalAmount)}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.text }}>{v.approvalStatus}</span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button onClick={() => handleEdit(v)} style={{ background: "transparent", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#818cf8", cursor: "pointer", fontFamily: ff }}>Edit</button>
                      {v.approvalStatus === "DRAFT" && (
                        <button onClick={() => handleStatusChange(v.id, "PENDING")} style={{ background: "transparent", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#fbbf24", cursor: "pointer", fontFamily: ff }}>Submit</button>
                      )}
                      {v.approvalStatus === "PENDING" && (
                        <button onClick={() => handleStatusChange(v.id, "APPROVED")} style={{ background: "transparent", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#22c55e", cursor: "pointer", fontFamily: ff }}>Approve</button>
                      )}
                      <button onClick={() => handleDelete(v.id)} style={{ background: "transparent", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#f87171", cursor: "pointer", fontFamily: ff }}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
