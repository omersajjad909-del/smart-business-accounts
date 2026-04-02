"use client";

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
  modal: { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "620px", fontFamily: font, maxHeight: "90vh", overflowY: "auto" as const },
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

const statusColor: Record<string, string> = { Draft: "#94a3b8", Submitted: "#38bdf8", Approved: "#34d399", Revision: "#f59e0b" };
const badge = (status: string) => ({ display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: (statusColor[status] ?? "#94a3b8") + "22", color: statusColor[status] ?? "#94a3b8" });
const EMPTY = { project: "", drawingNo: "", packageName: "", submittedTo: "", dueDate: "", status: "Draft" };

export default function DrawingsPage() {
  const { records, loading, create, setStatus } = useBusinessRecords("architectural_drawing");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const drawings = useMemo(() => records.map((r) => ({ id: r.id, status: r.status, project: String(r.data.project ?? ""), drawingNo: String(r.data.drawingNo ?? r.refId ?? ""), packageName: String(r.data.packageName ?? r.title ?? ""), submittedTo: String(r.data.submittedTo ?? ""), dueDate: String(r.data.dueDate ?? "") })), [records]);
  const kpis = useMemo(() => ({ total: drawings.length, draft: drawings.filter((d) => d.status === "Draft").length, submitted: drawings.filter((d) => d.status === "Submitted").length, approved: drawings.filter((d) => d.status === "Approved").length }), [drawings]);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const handleSave = async () => {
    const project = form.project.trim();
    const drawingNo = form.drawingNo.trim();
    const packageName = form.packageName.trim();
    const duplicateDrawing = drawingNo && drawings.some((d) => d.drawingNo.trim().toLowerCase() === drawingNo.toLowerCase());
    if (!project || !drawingNo || !packageName || !form.dueDate) return alert("Project, drawing no, package, aur due date required hain.");
    if (duplicateDrawing) return alert("Yeh drawing number pehle se maujood hai.");
    setSaving(true);
    try {
      await create({ title: packageName, status: form.status, date: form.dueDate, refId: drawingNo, data: { project, drawingNo, packageName, submittedTo: form.submittedTo, dueDate: form.dueDate } });
      setShowModal(false); setForm({ ...EMPTY });
    } finally { setSaving(false); }
  };
  return (
    <div style={S.page}>
      <div style={S.header}><h1 style={S.title}>Architectural Drawings</h1><button style={S.btn} onClick={() => { setForm({ ...EMPTY }); setShowModal(true); }}>+ New Drawing Set</button></div>
      <div style={S.kpiGrid}>
        <div style={S.kpi}><div style={S.kpiLabel}>Total Sets</div><div style={S.kpiVal}>{kpis.total}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Draft</div><div style={{ ...S.kpiVal, color: "#94a3b8" }}>{kpis.draft}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Submitted</div><div style={{ ...S.kpiVal, color: "#38bdf8" }}>{kpis.submitted}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Approved</div><div style={{ ...S.kpiVal, color: "#34d399" }}>{kpis.approved}</div></div>
      </div>
      <div style={S.panel}>
        {loading ? <div style={S.loading}>Loading drawings…</div> : <table style={S.table}>
          <thead><tr>{["Drawing #", "Project", "Package", "Submitted To", "Due Date", "Status", "Actions"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {drawings.length === 0 ? <tr><td colSpan={7} style={S.emptyRow}>No drawing sets yet.</td></tr> : drawings.map((d) => <tr key={d.id}>
              <td style={{ ...S.td, fontFamily: "monospace" }}>{d.drawingNo}</td><td style={{ ...S.td, fontWeight: 600 }}>{d.project}</td><td style={S.td}>{d.packageName}</td><td style={S.td}>{d.submittedTo || "—"}</td><td style={S.td}>{d.dueDate}</td><td style={S.td}><span style={badge(d.status)}>{d.status}</span></td><td style={S.td}>{d.status === "Draft" && <button style={S.btnSm} onClick={() => setStatus(d.id, "Submitted")}>Submit</button>}{d.status === "Submitted" && <button style={S.btnSm} onClick={() => setStatus(d.id, "Approved")}>Approve</button>}{d.status === "Approved" && <button style={S.btnSm} onClick={() => setStatus(d.id, "Revision")}>Revision</button>}</td>
            </tr>)}
          </tbody>
        </table>}
      </div>
      {showModal && <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}><div style={S.modal}><div style={S.modalTitle}>Create Drawing Submission</div>
        <div style={S.row2}><div style={S.field}><label style={S.label}>Project</label><input style={S.input} value={form.project} onChange={(e) => set("project", e.target.value)} placeholder="Residential Tower" /></div><div style={S.field}><label style={S.label}>Drawing No.</label><input style={S.input} value={form.drawingNo} onChange={(e) => set("drawingNo", e.target.value)} placeholder="DRW-A-001" /></div></div>
        <div style={S.row2}><div style={S.field}><label style={S.label}>Package Name</label><input style={S.input} value={form.packageName} onChange={(e) => set("packageName", e.target.value)} placeholder="Concept Plan Set" /></div><div style={S.field}><label style={S.label}>Submitted To</label><input style={S.input} value={form.submittedTo} onChange={(e) => set("submittedTo", e.target.value)} placeholder="Client / Authority" /></div></div>
        <div style={S.row2}><div style={S.field}><label style={S.label}>Due Date</label><input style={S.input} type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div><div style={S.field}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={(e) => set("status", e.target.value)}><option>Draft</option><option>Submitted</option></select></div></div>
        <div style={S.modalFooter}><button style={S.btnCancel} onClick={() => setShowModal(false)}>Cancel</button><button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Drawing"}</button></div>
      </div></div>}
    </div>
  );
}
