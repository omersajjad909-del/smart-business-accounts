"use client";
import { fmtDate } from "@/lib/dateUtils";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";

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

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  DRAFT:    { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" },
  PENDING:  { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
  APPROVED: { bg: "rgba(34,197,94,0.15)",   text: "#22c55e" },
  REJECTED: { bg: "rgba(248,113,113,0.15)", text: "#f87171" },
};

const CATEGORIES = ["TRAVEL","FOOD","SUPPLIES","UTILITIES","OTHER"];

export default function ExpenseVouchersPage() {
  const user = getCurrentUser();

  const [vouchers,    setVouchers]    = useState<ExpenseVoucher[]>([]);
  const [accounts,    setAccounts]    = useState<Acct[]>([]);
  const [showForm,    setShowForm]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [editingId,   setEditingId]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: accent }}>Expense Vouchers</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Record and track business expenses with approval workflow</p>
        </div>
        <button onClick={() => { if (showForm) { resetForm(); } else { setShowForm(true); } }} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {showForm ? "Cancel" : "+ New Expense"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ ...panel, marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: accent, marginBottom: 18 }}>{editingId ? "Edit Expense Voucher" : "New Expense Voucher"}</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={lbl}>Voucher No *</label>
              <input style={inp} value={form.voucherNo} onChange={e => setForm(f => ({ ...f, voucherNo: e.target.value }))} placeholder="EV-001" required />
            </div>
            <div>
              <label style={lbl}>Date *</label>
              <input type="date" style={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
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
