"use client";

import toast from "react-hot-toast";
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
  row2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" },
  btnCancel:   { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.55rem 1.1rem", fontFamily: font, fontSize: "0.9rem", cursor: "pointer" },
  loading:     { textAlign: "center" as const, padding: "3rem", color: "var(--text-muted)" },
};

const statusColor: Record<string, string> = { Active: "#34d399", "On-Hold": "#f59e0b", Completed: "#818cf8" };
const typeColor:   Record<string, string> = { Audit: "#38bdf8", Tax: "#f472b6", Consulting: "#a78bfa", Legal: "#fb923c", Other: "#94a3b8" };

const badge = (map: Record<string,string>, val: string) => ({
  display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "999px",
  fontSize: "0.75rem", fontWeight: 600,
  background: (map[val] ?? "#94a3b8") + "22",
  color: map[val] ?? "#94a3b8",
});

const EMPTY = { name: "", client: "", type: "Audit", startDate: "", endDate: "", fee: "", assignedTo: "", status: "Active" };

export default function FirmProjectsPage() {
  const { records, loading, create, setStatus, remove } = useBusinessRecords("firm_project");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const projects = useMemo(() =>
    records.map(r => ({
      id:         r.id,
      status:     r.status,
      name:       String(r.data.name       ?? r.title ?? ""),
      client:     String(r.data.client     ?? ""),
      type:       String(r.data.type       ?? "Other"),
      startDate:  String(r.data.startDate  ?? ""),
      endDate:    String(r.data.endDate    ?? ""),
      fee:        Number(r.amount          ?? 0),
      assignedTo: String(r.data.assignedTo ?? ""),
    })), [records]);

  const kpis = useMemo(() => ({
    total:     projects.length,
    active:    projects.filter(p => p.status === "Active").length,
    completed: projects.filter(p => p.status === "Completed").length,
    totalFees: projects.reduce((s, p) => s + p.fee, 0),
  }), [projects]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const name = form.name.trim();
    const client = form.client.trim();
    const fee = Number(form.fee);
    const duplicateProject = projects.some(p => p.name.toLowerCase() === name.toLowerCase() && p.client.toLowerCase() === client.toLowerCase());
    if (!name || !client || !form.startDate || !form.endDate) {
      toast.error("Project name, client, start, aur end date required hain.");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast("End date start date se pehle nahi ho sakti.");
      return;
    }
    if (fee < 0) {
      toast("Project fee negative nahi ho sakti.");
      return;
    }
    if (duplicateProject) {
      toast("Yeh engagement is client ke liye pehle se maujood hai.");
      return;
    }
    setSaving(true);
    try {
      await create({
        title: form.name,
        status: form.status,
        amount: parseFloat(form.fee) || 0,
        date: form.startDate || undefined,
        data: {
          name: form.name, client: form.client, type: form.type,
          startDate: form.startDate, endDate: form.endDate, assignedTo: form.assignedTo,
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
        <h1 style={S.title}>Firm Projects</h1>
        <button style={S.btn} onClick={() => { setForm({ ...EMPTY }); setShowModal(true); }}>+ Add Project</button>
      </div>

      <div style={S.kpiGrid}>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Total Projects</div>
          <div style={S.kpiVal}>{kpis.total}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Active</div>
          <div style={{ ...S.kpiVal, color: "#34d399" }}>{kpis.active}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Completed</div>
          <div style={{ ...S.kpiVal, color: "#818cf8" }}>{kpis.completed}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Total Fees</div>
          <div style={{ ...S.kpiVal, color: "#38bdf8" }}>${kpis.totalFees.toLocaleString()}</div>
        </div>
      </div>

      <div style={S.panel}>
        {loading ? (
          <div style={S.loading}>Loading projects…</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {["Project Name", "Client", "Type", "Start", "End", "Fee", "Assigned To", "Status", "Actions"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr><td colSpan={9} style={S.emptyRow}>No projects yet. Click &ldquo;Add Project&rdquo; to begin.</td></tr>
              ) : projects.map(p => (
                <tr key={p.id}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{p.name}</td>
                  <td style={S.td}>{p.client     || "—"}</td>
                  <td style={S.td}><span style={badge(typeColor, p.type)}>{p.type}</span></td>
                  <td style={S.td}>{p.startDate  || "—"}</td>
                  <td style={S.td}>{p.endDate    || "—"}</td>
                  <td style={S.td}>${p.fee.toLocaleString()}</td>
                  <td style={S.td}>{p.assignedTo || "—"}</td>
                  <td style={S.td}><span style={badge(statusColor, p.status)}>{p.status}</span></td>
                  <td style={S.td}>
                    {p.status !== "Completed" && <button style={S.btnSm} onClick={() => setStatus(p.id, "Completed")}>Complete</button>}
                    {p.status === "Active"    && <button style={S.btnSm} onClick={() => setStatus(p.id, "On-Hold")}>Hold</button>}
                    {p.status === "On-Hold"   && <button style={S.btnSm} onClick={() => setStatus(p.id, "Active")}>Resume</button>}
                    <button style={S.btnDanger} onClick={() => remove(p.id)}>Remove</button>
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
            <div style={S.modalTitle}>Add Project</div>
            <div style={S.field}>
              <label style={S.label}>Project Name *</label>
              <input style={S.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Annual Audit FY2026" />
            </div>
            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Client</label>
                <input style={S.input} value={form.client} onChange={e => set("client", e.target.value)} placeholder="Acme Corp" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Type</label>
                <select style={S.input} value={form.type} onChange={e => set("type", e.target.value)}>
                  <option>Audit</option><option>Tax</option><option>Consulting</option><option>Legal</option><option>Other</option>
                </select>
              </div>
            </div>
            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Start Date</label>
                <input style={S.input} type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>End Date</label>
                <input style={S.input} type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} />
              </div>
            </div>
            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Project Fee ($)</label>
                <input style={S.input} type="number" min="0" value={form.fee} onChange={e => set("fee", e.target.value)} placeholder="0" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Assigned To</label>
                <input style={S.input} value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} placeholder="John Smith" />
              </div>
            </div>
            <div style={S.field}>
              <label style={S.label}>Status</label>
              <select style={S.input} value={form.status} onChange={e => set("status", e.target.value)}>
                <option>Active</option><option>On-Hold</option><option>Completed</option>
              </select>
            </div>
            <div style={S.modalFooter}>
              <button style={S.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Project"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
