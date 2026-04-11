"use client";
import { fmtDate } from "@/lib/dateUtils";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const ff = "'Outfit','Inter',sans-serif";
const accent = "#6366f1";
const green  = "#22c55e";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaymentReceipt {
  id: string; receiptNo: string; date: string; amount: number;
  paymentMode: string; referenceNo?: string; status: string;
  narration?: string; party?: { id: string; name: string };
}
interface Party       { id: string; code: string; name: string; phone?: string }
interface BankAccount { id: string; accountNo: string; bankName: string; accountName: string }

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PENDING:  { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
  CLEARED:  { bg: "rgba(34,197,94,0.15)",   text: "#22c55e" },
  BOUNCED:  { bg: "rgba(248,113,113,0.15)", text: "#f87171" },
};

const MODE_LABEL: Record<string, string> = {
  CASH: "Cash", CHEQUE: "Cheque", BANK_TRANSFER: "Bank Transfer",
};

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const EMPTY_FORM = {
  receiptNo: "", date: new Date().toISOString().slice(0, 10),
  amount: 0, paymentMode: "CASH", partyId: "",
  bankAccountId: "", referenceNo: "", narration: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PaymentReceiptsPage() {
  const user = getCurrentUser();

  const [receipts,     setReceipts]     = useState<PaymentReceipt[]>([]);
  const [parties,      setParties]      = useState<Party[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showForm,     setShowForm]     = useState(true);
  const [showList,     setShowList]     = useState(false);
  const [form,         setForm]         = useState({ ...EMPTY_FORM });
  const [loading,      setLoading]      = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [editingId,    setEditingId]    = useState("");
  const [savedId,      setSavedId]      = useState("");
  const [search,       setSearch]       = useState("");

  const h = (json = false): Record<string, string> => ({
    "x-user-role":  user?.role      || "ADMIN",
    "x-user-id":    user?.id        || "",
    "x-company-id": user?.companyId || "",
    ...(json ? { "Content-Type": "application/json" } : {}),
  });

  async function fetchReceipts() {
    try {
      const url = statusFilter ? `/api/payment-receipts?status=${statusFilter}` : "/api/payment-receipts";
      const res = await fetch(url, { headers: h() });
      const data = await res.json();
      setReceipts(Array.isArray(data) ? data : []);
    } catch { setReceipts([]); }
  }

  async function fetchParties() {
    try {
      const res = await fetch("/api/accounts", { headers: h() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.accounts || [];
      setParties(list.filter((a: any) => a.partyType === "CUSTOMER" || a.partyType === "SUPPLIER"));
    } catch { setParties([]); }
  }

  async function fetchBankAccounts() {
    try {
      const res = await fetch("/api/bank-accounts", { headers: h() });
      const data = await res.json();
      setBankAccounts(Array.isArray(data) ? data : []);
    } catch { setBankAccounts([]); }
  }

  useEffect(() => { fetchReceipts(); fetchParties(); fetchBankAccounts(); }, [statusFilter]);

  function openPreview(id: string) {
    if (!id) { toast.error("Save first to preview"); return; }
    window.open(`/view/payment-receipt?id=${id}`, "_blank");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) { toast.error("Amount required"); return; }
    setLoading(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url    = editingId ? `/api/payment-receipts?id=${editingId}` : "/api/payment-receipts";
      const res    = await fetch(url, { method, headers: h(true), body: JSON.stringify({ id: editingId, ...form }) });
      if (res.ok) {
        const saved = await res.json();
        toast.success(editingId ? "Receipt updated!" : "Receipt saved!");
        setSavedId(saved?.id || "");
        clearForm();
        fetchReceipts();
        if (saved?.id) openPreview(saved.id);
      } else {
        const err = await res.json();
        toast.error(err.error || "Save failed");
      }
    } catch { toast.error("Save failed"); }
    setLoading(false);
  }

  function handleEdit(r: PaymentReceipt) {
    setEditingId(r.id); setSavedId(r.id);
    setForm({ receiptNo: r.receiptNo, date: new Date(r.date).toISOString().slice(0, 10), amount: r.amount, paymentMode: r.paymentMode, partyId: r.party?.id || "", bankAccountId: "", referenceNo: r.referenceNo || "", narration: r.narration || "" });
    setShowForm(true); setShowList(false);
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this receipt? This cannot be undone.")) return;
    const res = await fetch(`/api/payment-receipts?id=${id}`, { method: "DELETE", headers: h() });
    if (res.ok) { toast.success("Deleted"); fetchReceipts(); } else toast.error("Delete failed");
  }

  async function handleClearCheque(r: PaymentReceipt) {
    if (!await confirmToast(`Mark cheque ${r.referenceNo || r.receiptNo} as CLEARED?`)) return;
    const res = await fetch(`/api/payment-receipts?id=${r.id}`, { method: "PUT", headers: h(true), body: JSON.stringify({ id: r.id, status: "CLEARED", date: r.date, amount: r.amount, paymentMode: r.paymentMode, partyId: r.party?.id, referenceNo: r.referenceNo, narration: r.narration }) });
    if (res.ok) { toast.success("Cheque cleared!"); fetchReceipts(); } else toast.error("Failed");
  }

  function clearForm() {
    setForm({ ...EMPTY_FORM }); setEditingId(""); setSavedId("");
  }

  const filtered = receipts.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.receiptNo.toLowerCase().includes(q) || (r.party?.name || "").toLowerCase().includes(q) || r.paymentMode.toLowerCase().includes(q);
  });

  const needsBank = form.paymentMode === "CHEQUE" || form.paymentMode === "BANK_TRANSFER";

  // ── Styles ──
  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };
  const inp:   React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl:   React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };
  const btnP:  React.CSSProperties = { background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: "pointer" };
  const btnG:  React.CSSProperties = { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 16px", fontFamily: ff, fontSize: 14, cursor: "pointer" };

  const totalAmount = receipts.reduce((s, r) => s + r.amount, 0);
  const pending     = receipts.filter(r => r.status === "PENDING").length;
  const cleared     = receipts.filter(r => r.status === "CLEARED").length;

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Payment Receipts</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Record incoming payments from customers</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {showForm && savedId && (
            <button style={{ ...btnG, color: green, borderColor: green + "55" }} onClick={() => openPreview(savedId)}>Print Preview</button>
          )}
          {showList && receipts.length > 0 && (
            <button style={{ ...btnG, color: green, borderColor: green + "55" }} onClick={() => exportToCSV(receipts.map(r => ({ receiptNo: r.receiptNo, date: r.date, amount: r.amount, paymentMode: r.paymentMode, referenceNo: r.referenceNo || "", status: r.status, party: r.party?.name || "" })), "payment-receipts")}>Export CSV</button>
          )}
          <button style={btnG} onClick={() => { setShowList(!showList); setShowForm(!showForm); }}>
            {showList ? "New Receipt" : "View List"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Received",  value: "PKR " + fmt(totalAmount), color: accent },
          { label: "Pending Cheques", value: pending,                    color: "#fbbf24" },
          { label: "Cleared",         value: cleared,                    color: green },
        ].map(k => (
          <div key={k.label} style={{ ...panel, padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Entry Form ── */}
      {showForm && (
        <form onSubmit={handleSubmit}>
          <div style={{ ...panel, marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>{editingId ? "Edit Receipt" : "New Payment Receipt"}</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Receipt No <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none" }}>(auto if empty)</span></label>
                <input style={inp} value={form.receiptNo} onChange={e => setForm(f => ({ ...f, receiptNo: e.target.value }))} placeholder="Leave empty for auto-generation" />
              </div>
              <div>
                <label style={lbl}>Date *</label>
                <input type="date" required style={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Amount *</label>
                <input type="number" required step="0.01" min="0.01" style={{ ...inp, fontWeight: 700, fontSize: 16 }} value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
              </div>
              <div>
                <label style={lbl}>Payment Mode</label>
                <select style={inp} value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value, bankAccountId: e.target.value === "CASH" ? "" : f.bankAccountId }))}>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
              {needsBank && (
                <div>
                  <label style={lbl}>Bank Account *</label>
                  <select required style={inp} value={form.bankAccountId} onChange={e => setForm(f => ({ ...f, bankAccountId: e.target.value }))}>
                    <option value="">— Select Bank Account —</option>
                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNo} ({b.accountName})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={lbl}>Party (Customer/Supplier)</label>
                <select style={inp} value={form.partyId} onChange={e => setForm(f => ({ ...f, partyId: e.target.value }))}>
                  <option value="">— Select Party —</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Reference No</label>
                <input style={inp} value={form.referenceNo} onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))} placeholder="Cheque No or Transaction ID" />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Description / Narration</label>
              <textarea style={{ ...inp, minHeight: 72, resize: "vertical" }} value={form.narration} onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} placeholder="Payment details or notes…" />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" style={btnP} disabled={loading}>{loading ? "Saving…" : editingId ? "Update Receipt" : "Save Receipt"}</button>
              {savedId && <button type="button" style={{ ...btnG, color: green, borderColor: green + "55" }} onClick={() => openPreview(savedId)}>Print Preview</button>}
              <button type="button" style={btnG} onClick={clearForm}>Clear</button>
            </div>
          </div>
        </form>
      )}

      {/* ── List View ── */}
      {showList && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Filters */}
          <div style={{ display: "flex", gap: 12 }}>
            <input style={{ ...inp, flex: 1, maxWidth: 300 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search receipt no, party…" />
            <select style={{ ...inp, width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CLEARED">Cleared</option>
              <option value="BOUNCED">Bounced</option>
            </select>
          </div>

          <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Receipt No", "Date", "Amount", "Mode", "Party", "Ref No", "Status", "Actions"].map(col => (
                    <th key={col} style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: col === "Amount" ? "right" : "left" }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No receipts found</td></tr>
                ) : filtered.map((r, idx) => {
                  const sc = STATUS_COLOR[r.status] || STATUS_COLOR.PENDING;
                  return (
                    <tr key={r.id} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: accent, fontSize: 14 }}>{r.receiptNo}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--text-muted)" }}>{fmtDate(r.date)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 600, textAlign: "right" }}>{fmt(r.amount)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13 }}>{MODE_LABEL[r.paymentMode] || r.paymentMode}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13 }}>{r.party?.name || "—"}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)" }}>{r.referenceNo || "—"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.text }}>{r.status}</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {r.status === "PENDING" && r.paymentMode === "CHEQUE" && (
                            <button style={{ ...btnG, padding: "4px 10px", fontSize: 11, color: green, borderColor: green + "55" }} onClick={() => handleClearCheque(r)}>Clear ✓</button>
                          )}
                          <button style={{ ...btnG, padding: "4px 10px", fontSize: 11 }} onClick={() => openPreview(r.id)}>Print</button>
                          <button style={{ ...btnG, padding: "4px 10px", fontSize: 11 }} onClick={() => handleEdit(r)}>Edit</button>
                          <button style={{ ...btnG, padding: "4px 10px", fontSize: 11, color: "#f87171", borderColor: "#f8717144" }} onClick={() => handleDelete(r.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
