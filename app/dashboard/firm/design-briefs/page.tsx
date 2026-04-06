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

const statusColor: Record<string, string> = { Draft: "#94a3b8", Approved: "#34d399", Revision: "#f59e0b" };
const badge = (status: string) => ({
  display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
  background: (statusColor[status] ?? "#94a3b8") + "22", color: statusColor[status] ?? "#94a3b8",
});

const EMPTY = { client: "", project: "", briefNo: "", scope: "", dueDate: "", status: "Draft" };

export default function DesignBriefsPage() {
  const { records, loading, create, setStatus } = useBusinessRecords("design_brief");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const briefs = useMemo(() => records.map((r) => ({
    id: r.id,
    status: r.status,
    client: String(r.data.client ?? ""),
    project: String(r.data.project ?? ""),
    briefNo: String(r.data.briefNo ?? r.refId ?? ""),
    scope: String(r.data.scope ?? r.title ?? ""),
    dueDate: String(r.data.dueDate ?? ""),
  })), [records]);

  const kpis = useMemo(() => ({
    total: briefs.length,
    draft: briefs.filter((b) => b.status === "Draft").length,
    revision: briefs.filter((b) => b.status === "Revision").length,
    approved: briefs.filter((b) => b.status === "Approved").length,
  }), [briefs]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const client = form.client.trim();
    const project = form.project.trim();
    const briefNo = form.briefNo.trim();
    const scope = form.scope.trim();
    const duplicateBrief = briefNo && briefs.some((b) => b.briefNo.trim().toLowerCase() === briefNo.toLowerCase());
    if (!client || !project || !briefNo || !scope || !form.dueDate) {
      toast.error("Client, project, brief no, scope, aur due date required hain.");
      return;
    }
    if (duplicateBrief) {
      toast("Yeh brief number pehle se maujood hai.");
      return;
    }
    setSaving(true);
    try {
      await create({
        title: scope,
        status: form.status,
        date: form.dueDate,
        refId: briefNo,
        data: { client, project, briefNo, scope, dueDate: form.dueDate },
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
        <h1 style={S.title}>Design Briefs</h1>
        <button style={S.btn} onClick={() => { setForm({ ...EMPTY }); setShowModal(true); }}>+ New Brief</button>
      </div>
      <div style={S.kpiGrid}>
        <div style={S.kpi}><div style={S.kpiLabel}>Total Briefs</div><div style={S.kpiVal}>{kpis.total}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Draft</div><div style={{ ...S.kpiVal, color: "#94a3b8" }}>{kpis.draft}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Revision</div><div style={{ ...S.kpiVal, color: "#f59e0b" }}>{kpis.revision}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Approved</div><div style={{ ...S.kpiVal, color: "#34d399" }}>{kpis.approved}</div></div>
      </div>
      <div style={S.panel}>
        {loading ? <div style={S.loading}>Loading briefs…</div> : (
          <table style={S.table}>
            <thead><tr>{["Brief #", "Client", "Project", "Scope", "Due Date", "Status", "Actions"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {briefs.length === 0 ? <tr><td colSpan={7} style={S.emptyRow}>No design briefs yet.</td></tr> : briefs.map((b) => (
                <tr key={b.id}>
                  <td style={{ ...S.td, fontFamily: "monospace" }}>{b.briefNo}</td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{b.client}</td>
                  <td style={S.td}>{b.project}</td>
                  <td style={S.td}>{b.scope}</td>
                  <td style={S.td}>{b.dueDate}</td>
                  <td style={S.td}><span style={badge(b.status)}>{b.status}</span></td>
                  <td style={S.td}>
                    {b.status === "Draft" && <button style={S.btnSm} onClick={() => setStatus(b.id, "Approved")}>Approve</button>}
                    {b.status === "Approved" && <button style={S.btnSm} onClick={() => setStatus(b.id, "Revision")}>Revision</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal && (
        <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.modalTitle}>Create Design Brief</div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Client</label><input style={S.input} value={form.client} onChange={(e) => set("client", e.target.value)} placeholder="ABC Developers" /></div>
              <div style={S.field}><label style={S.label}>Project</label><input style={S.input} value={form.project} onChange={(e) => set("project", e.target.value)} placeholder="Residential Tower" /></div>
            </div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Brief No.</label><input style={S.input} value={form.briefNo} onChange={(e) => set("briefNo", e.target.value)} placeholder="BRF-2026-001" /></div>
              <div style={S.field}><label style={S.label}>Due Date</label><input style={S.input} type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
            </div>
            <div style={S.field}><label style={S.label}>Scope</label><input style={S.input} value={form.scope} onChange={(e) => set("scope", e.target.value)} placeholder="Concept design for mixed-use plot" /></div>
            <div style={S.field}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={(e) => set("status", e.target.value)}><option>Draft</option><option>Approved</option></select></div>
            <div style={S.modalFooter}>
              <button style={S.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Brief"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
