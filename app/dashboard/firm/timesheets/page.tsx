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
  modal:       { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "540px", fontFamily: font, maxHeight: "90vh", overflowY: "auto" as const },
  modalTitle:  { fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--text-primary)" },
  field:       { marginBottom: "1rem" },
  label:       { display: "block", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.35rem" },
  input:       { width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.55rem 0.75rem", color: "var(--text-primary)", fontFamily: font, fontSize: "0.92rem", boxSizing: "border-box" as const, outline: "none" },
  textarea:    { width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.55rem 0.75rem", color: "var(--text-primary)", fontFamily: font, fontSize: "0.92rem", boxSizing: "border-box" as const, outline: "none", minHeight: "70px", resize: "vertical" as const },
  row2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  row3:        { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" },
  btnCancel:   { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.55rem 1.1rem", fontFamily: font, fontSize: "0.9rem", cursor: "pointer" },
  loading:     { textAlign: "center" as const, padding: "3rem", color: "var(--text-muted)" },
};

const billableColor: Record<string, string> = { Yes: "#34d399", No: "#f87171" };
const badge = (val: string, map: Record<string,string>) => ({
  display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "999px",
  fontSize: "0.75rem", fontWeight: 600,
  background: (map[val] ?? "#94a3b8") + "22",
  color: map[val] ?? "#94a3b8",
});

const EMPTY = { staffName: "", project: "", client: "", date: "", hours: "", rate: "", billable: "Yes", notes: "" };

export default function FirmTimesheetsPage() {
  const { records, loading, create, remove } = useBusinessRecords("firm_timesheet");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const entries = useMemo(() =>
    records.map(r => ({
      id:        r.id,
      status:    r.status,
      staffName: String(r.data.staffName ?? ""),
      project:   String(r.data.project   ?? ""),
      client:    String(r.data.client    ?? ""),
      date:      String(r.data.date      ?? r.date ?? ""),
      hours:     Number(r.data.hours     ?? 0),
      rate:      Number(r.data.rate      ?? 0),
      billable:  String(r.data.billable  ?? "Yes"),
      notes:     String(r.data.notes     ?? ""),
      revenue:   Number(r.amount         ?? 0),
    })), [records]);

  const kpis = useMemo(() => {
    const totalHours    = entries.reduce((s, e) => s + e.hours, 0);
    const billableHours = entries.filter(e => e.billable === "Yes").reduce((s, e) => s + e.hours, 0);
    const revenue       = entries.reduce((s, e) => s + e.revenue, 0);
    const nonBillable   = totalHours - billableHours;
    return { totalHours, billableHours, revenue, nonBillable };
  }, [entries]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const staffName = form.staffName.trim();
    const date = form.date;
    const hours = parseFloat(form.hours) || 0;
    const rate = parseFloat(form.rate) || 0;
    const duplicateEntry = entries.some(e => e.staffName.toLowerCase() === staffName.toLowerCase() && e.project.trim().toLowerCase() === form.project.trim().toLowerCase() && e.date === date);
    if (!staffName || !date) {
      alert("Staff name aur date required hain.");
      return;
    }
    if (hours <= 0 || rate < 0) {
      alert("Hours positive hon, aur rate negative na ho.");
      return;
    }
    if (duplicateEntry) {
      alert("Is staff ke liye isi project aur date par entry already maujood hai.");
      return;
    }
    setSaving(true);
    const hrs = hours;
    try {
      await create({
        title: `${form.staffName} — ${form.project || "No project"}`,
        status: form.billable === "Yes" ? "Billable" : "Non-Billable",
        amount: hrs * rate,
        date: form.date || undefined,
        data: {
          staffName: form.staffName, project: form.project, client: form.client,
          date: form.date, hours: hrs, rate, billable: form.billable, notes: form.notes,
        },
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
        <h1 style={S.title}>Timesheets</h1>
        <button style={S.btn} onClick={() => { setForm({ ...EMPTY }); setShowModal(true); }}>+ Log Hours</button>
      </div>

      <div style={S.kpiGrid}>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Total Hours</div>
          <div style={S.kpiVal}>{kpis.totalHours.toFixed(1)}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Billable Hours</div>
          <div style={{ ...S.kpiVal, color: "#34d399" }}>{kpis.billableHours.toFixed(1)}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Revenue</div>
          <div style={{ ...S.kpiVal, color: "#818cf8" }}>${kpis.revenue.toLocaleString()}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Non-Billable Hours</div>
          <div style={{ ...S.kpiVal, color: "#f87171" }}>{kpis.nonBillable.toFixed(1)}</div>
        </div>
      </div>

      <div style={S.panel}>
        {loading ? (
          <div style={S.loading}>Loading timesheets…</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {["Staff", "Project", "Client", "Date", "Hours", "Rate", "Revenue", "Billable", "Notes", "Actions"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={10} style={S.emptyRow}>No timesheet entries yet. Click &ldquo;Log Hours&rdquo; to start.</td></tr>
              ) : entries.map(e => (
                <tr key={e.id}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{e.staffName}</td>
                  <td style={S.td}>{e.project  || "—"}</td>
                  <td style={S.td}>{e.client   || "—"}</td>
                  <td style={S.td}>{e.date     || "—"}</td>
                  <td style={S.td}>{e.hours.toFixed(1)}</td>
                  <td style={S.td}>${e.rate}/hr</td>
                  <td style={S.td}>${e.revenue.toLocaleString()}</td>
                  <td style={S.td}><span style={badge(e.billable, billableColor)}>{e.billable}</span></td>
                  <td style={{ ...S.td, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.notes || "—"}</td>
                  <td style={S.td}>
                    <button style={S.btnDanger} onClick={() => remove(e.id)}>Remove</button>
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
            <div style={S.modalTitle}>Log Hours</div>
            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Staff Name *</label>
                <input style={S.input} value={form.staffName} onChange={e => set("staffName", e.target.value)} placeholder="John Smith" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Date</label>
                <input style={S.input} type="date" value={form.date} onChange={e => set("date", e.target.value)} />
              </div>
            </div>
            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Project</label>
                <input style={S.input} value={form.project} onChange={e => set("project", e.target.value)} placeholder="Annual Audit" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Client</label>
                <input style={S.input} value={form.client} onChange={e => set("client", e.target.value)} placeholder="Acme Corp" />
              </div>
            </div>
            <div style={S.row3}>
              <div style={S.field}>
                <label style={S.label}>Hours</label>
                <input style={S.input} type="number" min="0" step="0.5" value={form.hours} onChange={e => set("hours", e.target.value)} placeholder="0" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Rate ($/hr)</label>
                <input style={S.input} type="number" min="0" value={form.rate} onChange={e => set("rate", e.target.value)} placeholder="0" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Billable</label>
                <select style={S.input} value={form.billable} onChange={e => set("billable", e.target.value)}>
                  <option>Yes</option><option>No</option>
                </select>
              </div>
            </div>
            <div style={S.field}>
              <label style={S.label}>Notes</label>
              <textarea style={S.textarea} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Work description…" />
            </div>
            <div style={S.modalFooter}>
              <button style={S.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Entry"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
