import toast from "react-hot-toast";
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

const statusColor: Record<string, string> = { Active: "#34d399", Inactive: "#94a3b8", Prospect: "#f59e0b" };
const badge = (status: string) => ({
  display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "999px",
  fontSize: "0.75rem", fontWeight: 600,
  background: (statusColor[status] ?? "#94a3b8") + "22",
  color: statusColor[status] ?? "#94a3b8",
});

const EMPTY = { name: "", industry: "", contactPerson: "", email: "", phone: "", retainerAmt: "", status: "Active" };

export default function FirmClientsPage() {
  const { records, loading, create, setStatus, remove } = useBusinessRecords("firm_client");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const clients = useMemo(() =>
    records.map(r => ({
      id: r.id,
      status: r.status,
      name:          String(r.data.name          ?? r.title ?? ""),
      industry:      String(r.data.industry      ?? ""),
      contactPerson: String(r.data.contactPerson ?? ""),
      email:         String(r.data.email         ?? ""),
      phone:         String(r.data.phone         ?? ""),
      retainerAmt:   Number(r.amount             ?? 0),
    })), [records]);

  const kpis = useMemo(() => ({
    total:    clients.length,
    active:   clients.filter(c => c.status === "Active").length,
    prospect: clients.filter(c => c.status === "Prospect").length,
    retainer: clients.reduce((s, c) => s + c.retainerAmt, 0),
  }), [clients]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openModal = () => { setForm({ ...EMPTY }); setShowModal(true); };

  const handleSave = async () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const duplicateClient = clients.some(c => c.name.toLowerCase() === name.toLowerCase() || (email && c.email.trim().toLowerCase() === email) || (phone && c.phone.trim() === phone));
    if (!name) {
      toast.error("Client name required hai.");
      return;
    }
    if (form.retainerAmt && Number(form.retainerAmt) < 0) {
      toast("Retainer negative nahi ho sakta.");
      return;
    }
    if (duplicateClient) {
      toast("Yeh client name, phone, ya email pehle se maujood hai.");
      return;
    }
    setSaving(true);
    try {
      await create({
        title: form.name,
        status: form.status,
        amount: parseFloat(form.retainerAmt) || 0,
        data: {
          name: form.name,
          industry: form.industry,
          contactPerson: form.contactPerson,
          email: form.email,
          phone: form.phone,
        },
      });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Firm Clients</h1>
        <button style={S.btn} onClick={openModal}>+ Add Client</button>
      </div>

      <div style={S.kpiGrid}>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Total Clients</div>
          <div style={S.kpiVal}>{kpis.total}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Active</div>
          <div style={{ ...S.kpiVal, color: "#34d399" }}>{kpis.active}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Prospects</div>
          <div style={{ ...S.kpiVal, color: "#f59e0b" }}>{kpis.prospect}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Total Retainer Value</div>
          <div style={{ ...S.kpiVal, color: "#818cf8" }}>${kpis.retainer.toLocaleString()}</div>
        </div>
      </div>

      <div style={S.panel}>
        {loading ? (
          <div style={S.loading}>Loading clients…</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {["Client Name", "Industry", "Contact Person", "Email", "Phone", "Retainer / mo", "Status", "Actions"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr><td colSpan={8} style={S.emptyRow}>No clients yet. Click &ldquo;Add Client&rdquo; to get started.</td></tr>
              ) : clients.map(c => (
                <tr key={c.id}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{c.name}</td>
                  <td style={S.td}>{c.industry  || "—"}</td>
                  <td style={S.td}>{c.contactPerson || "—"}</td>
                  <td style={S.td}>{c.email     || "—"}</td>
                  <td style={S.td}>{c.phone     || "—"}</td>
                  <td style={S.td}>${c.retainerAmt.toLocaleString()}</td>
                  <td style={S.td}><span style={badge(c.status)}>{c.status}</span></td>
                  <td style={S.td}>
                    {c.status !== "Active"   && <button style={S.btnSm} onClick={() => setStatus(c.id, "Active")}>Activate</button>}
                    {c.status === "Active"   && <button style={S.btnSm} onClick={() => setStatus(c.id, "Inactive")}>Deactivate</button>}
                    <button style={S.btnDanger} onClick={() => remove(c.id)}>Remove</button>
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
            <div style={S.modalTitle}>Add Client</div>
            <div style={S.field}>
              <label style={S.label}>Client Name *</label>
              <input style={S.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Acme Corp" />
            </div>
            <div style={S.field}>
              <label style={S.label}>Industry</label>
              <input style={S.input} value={form.industry} onChange={e => set("industry", e.target.value)} placeholder="Finance, Healthcare, Legal…" />
            </div>
            <div style={S.field}>
              <label style={S.label}>Contact Person</label>
              <input style={S.input} value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} placeholder="Jane Doe" />
            </div>
            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Email</label>
                <input style={S.input} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jane@acme.com" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Phone</label>
                <input style={S.input} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
              </div>
            </div>
            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Monthly Retainer ($)</label>
                <input style={S.input} type="number" min="0" value={form.retainerAmt} onChange={e => set("retainerAmt", e.target.value)} placeholder="0" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Status</label>
                <select style={S.input} value={form.status} onChange={e => set("status", e.target.value)}>
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Prospect</option>
                </select>
              </div>
            </div>
            <div style={S.modalFooter}>
              <button style={S.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Client"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
