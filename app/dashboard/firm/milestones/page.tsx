"use client";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const font = "'Outfit','Inter',sans-serif";
const S = {
  page: { background: "var(--app-bg)", minHeight: "100vh", padding: "2rem", fontFamily: font, color: "var(--text-primary)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, margin: 0 },
  btn: { background: "#6366f1", color: "#fff", border: "none", borderRadius: "8px", padding: "0.55rem 1.25rem", fontFamily: font, fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: "1rem", marginBottom: "1.5rem" },
  kpi: { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.2rem 1.4rem" },
  kpiLabel: { fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: "0.4rem" },
  kpiVal: { fontSize: "1.75rem", fontWeight: 700 },
  panel: { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { padding: "0.75rem 1rem", textAlign: "left" as const, fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" },
  td: { padding: "0.75rem 1rem", fontSize: "0.9rem", borderBottom: "1px solid var(--border)", color: "var(--text-primary)" },
  emptyRow: { padding: "3rem", textAlign: "center" as const, color: "var(--text-muted)" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "560px", fontFamily: font, maxHeight: "90vh", overflowY: "auto" as const },
  modalTitle: { fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--text-primary)" },
  field: { marginBottom: "1rem" },
  label: { display: "block", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.35rem" },
  input: { width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.55rem 0.75rem", color: "var(--text-primary)", fontFamily: font, fontSize: "0.92rem", boxSizing: "border-box" as const, outline: "none" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" },
  btnCancel: { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.55rem 1.1rem", fontFamily: font, fontSize: "0.9rem", cursor: "pointer" },
  loading: { textAlign: "center" as const, padding: "3rem", color: "var(--text-muted)" },
  btnSm: { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.3rem 0.7rem", fontFamily: font, fontSize: "0.8rem", cursor: "pointer", marginRight: "0.4rem" },
};
const statusColor: Record<string, string> = { Pending: "#f59e0b", Submitted: "#38bdf8", Approved: "#34d399" };
const badge = (status: string) => ({ display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: (statusColor[status] ?? "#94a3b8") + "22", color: statusColor[status] ?? "#94a3b8" });
const EMPTY = { project: "", milestone: "", owner: "", dueDate: "", status: "Pending" };

export default function MilestonesPage() {
  const { records, loading, create, setStatus } = useBusinessRecords("architecture_milestone");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const milestones = useMemo(() => records.map((r) => ({ id: r.id, status: r.status, project: String(r.data.project ?? ""), milestone: String(r.data.milestone ?? r.title ?? ""), owner: String(r.data.owner ?? ""), dueDate: String(r.data.dueDate ?? "") })), [records]);
  const kpis = useMemo(() => ({ total: milestones.length, pending: milestones.filter((m) => m.status === "Pending").length, submitted: milestones.filter((m) => m.status === "Submitted").length, approved: milestones.filter((m) => m.status === "Approved").length }), [milestones]);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const handleSave = async () => {
    const project = form.project.trim();
    const milestone = form.milestone.trim();
    const duplicateMilestone = milestones.some((m) => m.project.toLowerCase() === project.toLowerCase() && m.milestone.toLowerCase() === milestone.toLowerCase() && m.status !== "Approved");
    if (!project || !milestone || !form.dueDate) return toast.error("Project, milestone, aur due date required hain.");
    if (duplicateMilestone) return toast.error("Yeh milestone already active hai.");
    setSaving(true);
    try {
      await create({ title: milestone, status: form.status, date: form.dueDate, data: { project, milestone, owner: form.owner, dueDate: form.dueDate } });
      setShowModal(false); setForm({ ...EMPTY });
    } finally { setSaving(false); }
  };
  return (
    <div style={S.page}>
      <div style={S.header}><h1 style={S.title}>Architecture Milestones</h1><button style={S.btn} onClick={() => { setForm({ ...EMPTY }); setShowModal(true); }}>+ New Milestone</button></div>
      <div style={S.kpiGrid}>
        <div style={S.kpi}><div style={S.kpiLabel}>Total Milestones</div><div style={S.kpiVal}>{kpis.total}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Pending</div><div style={{ ...S.kpiVal, color: "#f59e0b" }}>{kpis.pending}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Submitted</div><div style={{ ...S.kpiVal, color: "#38bdf8" }}>{kpis.submitted}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Approved</div><div style={{ ...S.kpiVal, color: "#34d399" }}>{kpis.approved}</div></div>
      </div>
      <div style={S.panel}>
        {loading ? <div style={S.loading}>Loading milestones…</div> : <table style={S.table}>
          <thead><tr>{["Project", "Milestone", "Owner", "Due Date", "Status", "Actions"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {milestones.length === 0 ? <tr><td colSpan={6} style={S.emptyRow}>No milestones yet.</td></tr> : milestones.map((m) => <tr key={m.id}>
              <td style={{ ...S.td, fontWeight: 600 }}>{m.project}</td><td style={S.td}>{m.milestone}</td><td style={S.td}>{m.owner || "—"}</td><td style={S.td}>{m.dueDate}</td><td style={S.td}><span style={badge(m.status)}>{m.status}</span></td><td style={S.td}>{m.status === "Pending" && <button style={S.btnSm} onClick={() => setStatus(m.id, "Submitted")}>Submit</button>}{m.status === "Submitted" && <button style={S.btnSm} onClick={() => setStatus(m.id, "Approved")}>Approve</button>}</td>
            </tr>)}
          </tbody>
        </table>}
      </div>
      {showModal && <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}><div style={S.modal}><div style={S.modalTitle}>Create Milestone</div>
        <div style={S.row2}><div style={S.field}><label style={S.label}>Project</label><input style={S.input} value={form.project} onChange={(e) => set("project", e.target.value)} placeholder="Residential Tower" /></div><div style={S.field}><label style={S.label}>Milestone</label><input style={S.input} value={form.milestone} onChange={(e) => set("milestone", e.target.value)} placeholder="Concept Approval" /></div></div>
        <div style={S.row2}><div style={S.field}><label style={S.label}>Owner</label><input style={S.input} value={form.owner} onChange={(e) => set("owner", e.target.value)} placeholder="Lead Architect" /></div><div style={S.field}><label style={S.label}>Due Date</label><input style={S.input} type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div></div>
        <div style={S.field}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={(e) => set("status", e.target.value)}><option>Pending</option><option>Submitted</option></select></div>
        <div style={S.modalFooter}><button style={S.btnCancel} onClick={() => setShowModal(false)}>Cancel</button><button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Milestone"}</button></div>
      </div></div>}
    </div>
  );
}
