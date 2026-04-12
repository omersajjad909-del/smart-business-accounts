"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { fmtDate } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ff     = "'Outfit','Inter',sans-serif";
const accent = "#f59e0b";

type AdvancePayment = {
  id: string; advanceNo: string; date: string; amount: number;
  adjustedAmount: number; balance: number; status: string; narration?: string;
  supplier: { id: string; name: string };
  adjustments: any[];
};
type Account = { id: string; name: string; partyType?: string | null };

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  OPEN:     { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
  ADJUSTED: { bg: "rgba(99,102,241,0.15)",  text: "#818cf8" },
  CLOSED:   { bg: "rgba(34,197,94,0.15)",   text: "#22c55e" },
};

export default function AdvancePaymentPage() {
  const today = new Date().toISOString().slice(0, 10);
  const user  = getCurrentUser();

  const [advances,       setAdvances]       = useState<AdvancePayment[]>([]);
  const [suppliers,      setSuppliers]      = useState<Account[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showForm,       setShowForm]       = useState(false);
  const [showAdjForm,    setShowAdjForm]    = useState(false);
  const [selAdvance,     setSelAdvance]     = useState<AdvancePayment | null>(null);
  const [saving,         setSaving]         = useState(false);

  // New advance form
  const [advanceNo,  setAdvanceNo]  = useState("ADV-001");
  const [date,       setDate]       = useState(today);
  const [amount,     setAmount]     = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [narration,  setNarration]  = useState("");

  // Adjust form
  const [invoiceNo,      setInvoiceNo]      = useState("");
  const [adjAmount,      setAdjAmount]      = useState("");
  const [adjRemarks,     setAdjRemarks]     = useState("");

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
      const [aRes, acRes] = await Promise.all([
        fetch("/api/advance-payment", { headers: h() }),
        fetch("/api/accounts",        { headers: h() }),
      ]);
      const [aData, acData] = await Promise.all([aRes.json(), acRes.json()]);
      const list: AdvancePayment[] = Array.isArray(aData) ? aData : [];
      setAdvances(list);
      setSuppliers((Array.isArray(acData) ? acData : []).filter((a: Account) => a.partyType === "SUPPLIER"));
      // auto next no
      if (list.length > 0) {
        const max = Math.max(...list.map((a) => { const m = a.advanceNo.match(/\d+/); return m ? parseInt(m[0]) : 0; }));
        setAdvanceNo(`ADV-${String(max+1).padStart(3,"0")}`);
      }
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || !amount) { toast.error("Supplier and amount required"); return; }
    setSaving(true);
    try {
      const res  = await fetch("/api/advance-payment", { method: "POST", headers: h(true), body: JSON.stringify({ advanceNo, date, amount: parseFloat(amount), supplierId, narration }) });
      const data = await res.json();
      if (res.ok) { toast.success("Advance saved!"); setShowForm(false); resetForm(); fetchAll(); }
      else toast.error(data.error || "Failed");
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!selAdvance || !invoiceNo || !adjAmount) { toast.error("All fields required"); return; }
    const adj = parseFloat(adjAmount);
    if (adj > selAdvance.balance) { toast.error(`Cannot exceed balance: ${fmt(selAdvance.balance)}`); return; }
    setSaving(true);
    try {
      const res  = await fetch("/api/advance-payment", { method: "PUT", headers: h(true), body: JSON.stringify({ id: selAdvance.id, invoiceNo, adjustedAmount: adj, date: new Date().toISOString(), remarks: adjRemarks }) });
      const data = await res.json();
      if (res.ok) { toast.success("Adjusted!"); setShowAdjForm(false); setSelAdvance(null); setInvoiceNo(""); setAdjAmount(""); setAdjRemarks(""); fetchAll(); }
      else toast.error(data.error || "Failed");
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this advance payment?")) return;
    const res = await fetch(`/api/advance-payment?id=${id}`, { method: "DELETE", headers: h() });
    if (res.ok) { toast.success("Deleted!"); fetchAll(); } else toast.error("Delete failed");
  }

  function resetForm() {
    setDate(today); setAmount(""); setSupplierId(""); setNarration("");
  }

  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };
  const inp:   React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl:   React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: accent }}>Advance Payments</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Track supplier advances and adjust against invoices</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {showForm ? "Cancel" : "+ New Advance"}
        </button>
      </div>

      {/* New Advance Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ ...panel, marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, color: accent }}>New Advance Payment</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={lbl}>Advance No *</label>
              <input style={inp} value={advanceNo} onChange={e => setAdvanceNo(e.target.value)} required />
            </div>
            <div>
              <label style={lbl}>Date *</label>
              <input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label style={lbl}>Amount *</label>
              <input type="number" step="0.01" style={inp} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Supplier *</label>
              <select style={inp} value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                <option value="">— Select Supplier —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Narration</label>
              <input style={inp} value={narration} onChange={e => setNarration(e.target.value)} placeholder="Optional description" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={saving} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save Advance Payment"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 20px", fontFamily: ff, fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Adjust Form */}
      {showAdjForm && selAdvance && (
        <form onSubmit={handleAdjust} style={{ ...panel, marginBottom: 24, border: `1px solid ${accent}44` }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: accent }}>Adjust Advance: {selAdvance.advanceNo}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>
            Supplier: <strong style={{ color: "var(--text-primary)" }}>{selAdvance.supplier.name}</strong> &nbsp;|&nbsp;
            Balance: <strong style={{ color: accent }}>{fmt(selAdvance.balance)}</strong>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Invoice No *</label>
              <input style={inp} value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="e.g. INV-123" required />
            </div>
            <div>
              <label style={lbl}>Adjusted Amount *</label>
              <input type="number" step="0.01" style={inp} value={adjAmount} onChange={e => setAdjAmount(e.target.value)} placeholder="0.00" max={selAdvance.balance} required />
            </div>
            <div>
              <label style={lbl}>Remarks</label>
              <input style={inp} value={adjRemarks} onChange={e => setAdjRemarks(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={saving} style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Adjusting…" : "Adjust Advance"}
            </button>
            <button type="button" onClick={() => { setShowAdjForm(false); setSelAdvance(null); }} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 20px", fontFamily: ff, fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ ...panel, textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading…</div>
      ) : (
        <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Advance No","Date","Supplier","Amount","Adjusted","Balance","Status","Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: ["Amount","Adjusted","Balance"].includes(h) ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {advances.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No advance payments found. Create your first one!</td></tr>
              ) : advances.map((adv, idx) => {
                const sc = STATUS_COLOR[adv.status] || STATUS_COLOR.OPEN;
                return (
                  <tr key={adv.id} style={{ borderBottom: idx < advances.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                    <td style={{ padding: "13px 16px", fontWeight: 700, color: accent, fontSize: 13 }}>{adv.advanceNo}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-muted)" }}>{fmtDate(adv.date)}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600 }}>{adv.supplier.name}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, textAlign: "right" }}>{fmt(adv.amount)}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, textAlign: "right", color: "#818cf8" }}>{fmt(adv.adjustedAmount)}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700, textAlign: "right", color: "#22c55e" }}>{fmt(adv.balance)}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.text }}>{adv.status}</span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        {adv.status !== "CLOSED" && (
                          <button style={{ background: "transparent", border: `1px solid ${accent}55`, borderRadius: 6, padding: "4px 12px", fontSize: 12, color: accent, cursor: "pointer", fontFamily: ff }} onClick={() => { setSelAdvance(adv); setShowAdjForm(true); }}>Adjust</button>
                        )}
                        <button style={{ background: "transparent", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#f87171", cursor: "pointer", fontFamily: ff }} onClick={() => handleDelete(adv.id)}>Delete</button>
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
  );
}
