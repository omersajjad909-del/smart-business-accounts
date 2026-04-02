"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const font = "'Outfit','Inter',sans-serif";

const S = {
  page:        { background: "var(--app-bg)", minHeight: "100vh", padding: "2rem", fontFamily: font, color: "var(--text-primary)" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title:       { fontSize: "1.5rem", fontWeight: 700, margin: 0 },
  btn:         { background: "#6366f1", color: "#fff", border: "none", borderRadius: "8px", padding: "0.55rem 1.25rem", fontFamily: font, fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" },
  btnSm:       { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.3rem 0.7rem", fontFamily: font, fontSize: "0.8rem", cursor: "pointer", marginRight: "0.4rem" },
  btnDanger:   { background: "transparent", color: "#f87171", border: "1px solid #f87171", borderRadius: "6px", padding: "0.3rem 0.7rem", fontFamily: font, fontSize: "0.8rem", cursor: "pointer" },
  kpiGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: "1rem", marginBottom: "1.5rem" },
  kpi:         { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.2rem 1.4rem" },
  kpiLabel:    { fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: "0.4rem" },
  kpiVal:      { fontSize: "1.75rem", fontWeight: 700 },
  panel:       { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" },
  table:       { width: "100%", borderCollapse: "collapse" as const },
  th:          { padding: "0.75rem 1rem", textAlign: "left" as const, fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" },
  td:          { padding: "0.75rem 1rem", fontSize: "0.9rem", borderBottom: "1px solid var(--border)", color: "var(--text-primary)" },
  emptyRow:    { padding: "3rem", textAlign: "center" as const, color: "var(--text-muted)" },
  overlay:     { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:       { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "520px", fontFamily: font, maxHeight: "90vh", overflowY: "auto" as const },
  modalTitle:  { fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--text-primary)" },
  field:       { marginBottom: "1rem" },
  label:       { display: "block", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.35rem" },
  input:       { width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.55rem 0.75rem", color: "var(--text-primary)", fontFamily: font, fontSize: "0.92rem", boxSizing: "border-box" as const, outline: "none" },
  row2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" },
  btnCancel:   { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.55rem 1.1rem", fontFamily: font, fontSize: "0.9rem", cursor: "pointer" },
  loading:     { textAlign: "center" as const, padding: "3rem", color: "var(--text-muted)" },
};

const statusColor: Record<string, string> = { Draft: "#94a3b8", Sent: "#38bdf8", Paid: "#34d399", Overdue: "#f87171" };
const badge = (status: string) => ({
  display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "999px",
  fontSize: "0.75rem", fontWeight: 600,
  background: (statusColor[status] ?? "#94a3b8") + "22",
  color: statusColor[status] ?? "#94a3b8",
});

const EMPTY = { client: "", project: "", invoiceNo: "", amount: "", dueDate: "", status: "Draft" };

export default function FirmBillingPage() {
  const { records, loading, create, setStatus, remove } = useBusinessRecords("firm_billing");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const invoices = useMemo(() =>
    records.map(r => ({
      id:        r.id,
      status:    r.status,
      client:    String(r.data.client    ?? ""),
      project:   String(r.data.project   ?? ""),
      invoiceNo: String(r.data.invoiceNo ?? r.refId ?? ""),
      amount:    Number(r.amount         ?? 0),
      dueDate:   String(r.data.dueDate   ?? ""),
    })), [records]);

  const kpis = useMemo(() => ({
    totalBilled:  invoices.reduce((s, i) => s + i.amount, 0),
    paid:         invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0),
    outstanding:  invoices.filter(i => i.status === "Sent").reduce((s, i) => s + i.amount, 0),
    overdueCount: invoices.filter(i => i.status === "Overdue").length,
  }), [invoices]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const client = form.client.trim();
    const invoiceNo = form.invoiceNo.trim();
    const amount = Number(form.amount);
    const duplicateInvoice = invoiceNo && invoices.some(i => i.invoiceNo.trim().toLowerCase() === invoiceNo.toLowerCase());
    if (!client || !invoiceNo || !form.dueDate) {
      alert("Client, invoice number, aur due date required hain.");
      return;
    }
    if (amount <= 0) {
      alert("Invoice amount positive hona chahiye.");
      return;
    }
    if (duplicateInvoice) {
      alert("Yeh invoice number pehle se maujood hai.");
      return;
    }
    setSaving(true);
    try {
      await create({
        title: `Invoice ${form.invoiceNo || "—"} — ${form.client}`,
        status: form.status,
        amount: parseFloat(form.amount) || 0,
        date: form.dueDate || undefined,
        refId: form.invoiceNo || undefined,
        data: { client: form.client, project: form.project, invoiceNo: form.invoiceNo, dueDate: form.dueDate },
      });
      setShowModal(false);
      setForm({ ...EMPTY });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Fee Billing</h1>
        <button style={S.btn} onClick={() => { setForm({ ...EMPTY }); setShowModal(true); }}>+ New Invoice</button>
      </div>

      <div style={S.kpiGrid}>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Total Billed</div>
          <div style={{ ...S.kpiVal, color: "#818cf8" }}>${kpis.totalBilled.toLocaleString()}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Paid</div>
          <div style={{ ...S.kpiVal, color: "#34d399" }}>${kpis.paid.toLocaleString()}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Outstanding</div>
          <div style={{ ...S.kpiVal, color: "#38bdf8" }}>${kpis.outstanding.toLocaleString()}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Overdue Count</div>
          <div style={{ ...S.kpiVal, color: "#f87171" }}>{kpis.overdueCount}</div>
        </div>
      </div>

      <div style={S.panel}>
        {loading ? (
          <div style={S.loading}>Loading invoices…</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {["Invoice #", "Client", "Project", "Amount", "Due Date", "Status", "Actions"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={7} style={S.emptyRow}>No invoices yet. Click &ldquo;New Invoice&rdquo; to create one.</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ ...S.td, fontFamily: "monospace" }}>{inv.invoiceNo || "—"}</td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{inv.client}</td>
                  <td style={S.td}>{inv.project  || "—"}</td>
                  <td style={S.td}>${inv.amount.toLocaleString()}</td>
                  <td style={S.td}>{inv.dueDate  || "—"}</td>
                  <td style={S.td}><span style={badge(inv.status)}>{inv.status}</span></td>
                  <td style={S.td}>
                    {inv.status === "Draft"   && <button style={S.btnSm} onClick={() => setStatus(inv.id, "Sent")}>Send</button>}
                    {inv.status === "Sent"    && <button style={S.btnSm} onClick={() => setStatus(inv.id, "Paid")}>Mark Paid</button>}
                    {inv.status === "Sent"    && <button style={S.btnSm} onClick={() => setStatus(inv.id, "Overdue")}>Overdue</button>}
                    {inv.status === "Overdue" && <button style={S.btnSm} onClick={() => setStatus(inv.id, "Paid")}>Mark Paid</button>}
                    <button style={S.btnDanger} onClick={() => remove(inv.id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.modalTitle}>New Invoice</div>
            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Client *</label>
                <input style={S.input} value={form.client} onChange={e => set("client", e.target.value)} placeholder="Acme Corp" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Project</label>
                <input style={S.input} value={form.project} onChange={e => set("project", e.target.value)} placeholder="Annual Audit" />
              </div>
            </div>
            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Invoice No.</label>
                <input style={S.input} value={form.invoiceNo} onChange={e => set("invoiceNo", e.target.value)} placeholder="INV-2026-001" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Amount ($)</label>
                <input style={S.input} type="number" min="0" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0" />
              </div>
            </div>
            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Due Date</label>
                <input style={S.input} type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Status</label>
                <select style={S.input} value={form.status} onChange={e => set("status", e.target.value)}>
                  <option>Draft</option><option>Sent</option><option>Paid</option><option>Overdue</option>
                </select>
              </div>
            </div>
            <div style={S.modalFooter}>
              <button style={S.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Invoice"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
