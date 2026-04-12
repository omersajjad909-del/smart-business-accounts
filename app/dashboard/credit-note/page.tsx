"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { fmtDate } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ff     = "'Outfit','Inter',sans-serif";
const accent = "#22c55e";

interface CreditNote {
  id: string; creditNoteNumber: string; date: string; accountId: string;
  account?: { id: string; name: string };
  amount: number; reason: string; description?: string; reference?: string; status: string;
}
interface Account { id: string; name: string; partyType?: string }

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PENDING:   { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
  APPROVED:  { bg: "rgba(34,197,94,0.15)",   text: "#22c55e" },
  APPLIED:   { bg: "rgba(99,102,241,0.15)",  text: "#818cf8" },
  CANCELLED: { bg: "rgba(248,113,113,0.15)", text: "#f87171" },
};

const REASONS = ["RETURN","DISCOUNT","ERROR","DAMAGE","OTHER"];
const REASON_LABEL: Record<string, string> = { RETURN:"Sales Return", DISCOUNT:"Discount Adjustment", ERROR:"Billing Error", DAMAGE:"Damaged Goods", OTHER:"Other" };

export default function CreditNotePage() {
  const user = getCurrentUser();

  const [notes,     setNotes]     = useState<CreditNote[]>([]);
  const [accounts,  setAccounts]  = useState<Account[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState({ date: new Date().toISOString().slice(0,10), accountId: "", amount: "", reason: "", description: "", reference: "" });

  const h = (json = false): Record<string, string> => ({
    "x-user-role":  user?.role      || "",
    "x-user-id":    user?.id        || "",
    "x-company-id": user?.companyId || "",
    ...(json ? { "Content-Type": "application/json" } : {}),
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [nRes, aRes] = await Promise.all([
        fetch("/api/credit-note", { headers: h() }),
        fetch("/api/accounts",    { headers: h() }),
      ]);
      const [nData, aData] = await Promise.all([nRes.json(), aRes.json()]);
      setNotes(Array.isArray(nData) ? nData : []);
      setAccounts((Array.isArray(aData) ? aData : []).filter((a: Account) => a.partyType === "CUSTOMER"));
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accountId || !form.amount || !form.reason) { toast.error("Fill all required fields"); return; }
    setSaving(true);
    try {
      const res  = await fetch("/api/credit-note", { method: "POST", headers: h(true), body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }) });
      const data = await res.json();
      if (res.ok) {
        toast.success("Credit note created!");
        setShowForm(false);
        setForm({ date: new Date().toISOString().slice(0,10), accountId: "", amount: "", reason: "", description: "", reference: "" });
        fetchAll();
      } else toast.error(data.error || "Failed");
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this credit note?")) return;
    const res = await fetch(`/api/credit-note?id=${id}`, { method: "DELETE", headers: h() });
    if (res.ok) { toast.success("Deleted!"); fetchAll(); } else toast.error("Delete failed");
  }

  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };
  const inp:   React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl:   React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: accent }}>Credit Notes</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Issue credit notes to customers for returns, discounts, or corrections</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New Credit Note
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <form onSubmit={handleSubmit} style={{ ...panel, width: 500, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: accent }}>New Credit Note</div>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Date *</label>
                <input type="date" style={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div>
                <label style={lbl}>Customer Account *</label>
                <select style={inp} value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))} required>
                  <option value="">— Select Customer —</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Amount *</label>
                <input type="number" step="0.01" style={inp} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
              </div>
              <div>
                <label style={lbl}>Reason *</label>
                <select style={inp} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required>
                  <option value="">— Select Reason —</option>
                  {REASONS.map(r => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Description *</label>
                <textarea style={{ ...inp, height: 72, resize: "vertical" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
              </div>
              <div>
                <label style={lbl}>Reference (Optional)</label>
                <input style={inp} value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Invoice number or reference" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="submit" disabled={saving} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Create Credit Note"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 20px", fontFamily: ff, fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ ...panel, textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading…</div>
      ) : (
        <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Credit Note No","Date","Customer","Reason","Amount","Status","Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {notes.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No credit notes found. Create your first one!</td></tr>
              ) : notes.map((n, idx) => {
                const sc = STATUS_COLOR[n.status] || STATUS_COLOR.PENDING;
                return (
                  <tr key={n.id} style={{ borderBottom: idx < notes.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                    <td style={{ padding: "13px 16px", fontWeight: 700, color: accent, fontSize: 13 }}>{n.creditNoteNumber}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-muted)" }}>{fmtDate(n.date)}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{n.account?.name || "—"}</div>
                      {n.reference && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Ref: {n.reference}</div>}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13 }}>
                      <div>{REASON_LABEL[n.reason] || n.reason}</div>
                      {n.description && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{n.description}</div>}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, textAlign: "right", color: accent }}>{fmt(n.amount)}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.text }}>{n.status}</span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <button style={{ background: "transparent", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#f87171", cursor: "pointer", fontFamily: ff }} onClick={() => handleDelete(n.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
