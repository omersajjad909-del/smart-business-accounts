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

const statusColor: Record<string, string> = { Draft: "#94a3b8", Sent: "#38bdf8", Won: "#34d399", Lost: "#f87171" };
const badge = (status: string) => ({
  display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
  background: (statusColor[status] ?? "#94a3b8") + "22", color: statusColor[status] ?? "#94a3b8",
});

const EMPTY = { client: "", serviceLine: "", proposalNo: "", value: "", dueDate: "", status: "Draft" };

export default function ConsultancyProposalsPage() {
  const { records, loading, create, setStatus } = useBusinessRecords("consulting_proposal");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const proposals = useMemo(() => records.map((r) => ({
    id: r.id,
    status: r.status,
    client: String(r.data.client ?? ""),
    serviceLine: String(r.data.serviceLine ?? ""),
    proposalNo: String(r.data.proposalNo ?? r.refId ?? ""),
    value: Number(r.amount ?? 0),
    dueDate: String(r.data.dueDate ?? ""),
  })), [records]);

  const kpis = useMemo(() => ({
    total: proposals.length,
    sent: proposals.filter((p) => p.status === "Sent").length,
    won: proposals.filter((p) => p.status === "Won").length,
    pipeline: proposals.filter((p) => p.status === "Draft" || p.status === "Sent").reduce((s, p) => s + p.value, 0),
  }), [proposals]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const client = form.client.trim();
    const proposalNo = form.proposalNo.trim();
    const value = Number(form.value);
    const duplicateProposal = proposalNo && proposals.some((p) => p.proposalNo.trim().toLowerCase() === proposalNo.toLowerCase());
    if (!client || !proposalNo || !form.dueDate) {
      toast.error("Client, proposal number, aur due date required hain.");
      return;
    }
    if (value <= 0) {
      toast("Proposal value positive honi chahiye.");
      return;
    }
    if (duplicateProposal) {
      toast("Yeh proposal number pehle se maujood hai.");
      return;
    }
    setSaving(true);
    try {
      await create({
        title: `Proposal ${proposalNo}`,
        status: form.status,
        amount: value,
        date: form.dueDate,
        refId: proposalNo,
        data: { client, serviceLine: form.serviceLine, proposalNo, dueDate: form.dueDate },
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
        <h1 style={S.title}>Consulting Proposals</h1>
        <button style={S.btn} onClick={() => { setForm({ ...EMPTY }); setShowModal(true); }}>+ New Proposal</button>
      </div>

      <div style={S.kpiGrid}>
        <div style={S.kpi}><div style={S.kpiLabel}>Total Proposals</div><div style={S.kpiVal}>{kpis.total}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Sent</div><div style={{ ...S.kpiVal, color: "#38bdf8" }}>{kpis.sent}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Won</div><div style={{ ...S.kpiVal, color: "#34d399" }}>{kpis.won}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Pipeline Value</div><div style={{ ...S.kpiVal, color: "#818cf8" }}>${kpis.pipeline.toLocaleString()}</div></div>
      </div>

      <div style={S.panel}>
        {loading ? <div style={S.loading}>Loading proposals…</div> : (
          <table style={S.table}>
            <thead><tr>{["Proposal #", "Client", "Service Line", "Value", "Due Date", "Status", "Actions"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {proposals.length === 0 ? <tr><td colSpan={7} style={S.emptyRow}>No proposals yet.</td></tr> : proposals.map((p) => (
                <tr key={p.id}>
                  <td style={{ ...S.td, fontFamily: "monospace" }}>{p.proposalNo}</td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{p.client}</td>
                  <td style={S.td}>{p.serviceLine || "—"}</td>
                  <td style={S.td}>${p.value.toLocaleString()}</td>
                  <td style={S.td}>{p.dueDate}</td>
                  <td style={S.td}><span style={badge(p.status)}>{p.status}</span></td>
                  <td style={S.td}>
                    {p.status === "Draft" && <button style={S.btnSm} onClick={() => setStatus(p.id, "Sent")}>Send</button>}
                    {p.status === "Sent" && <button style={S.btnSm} onClick={() => setStatus(p.id, "Won")}>Mark Won</button>}
                    {p.status === "Sent" && <button style={S.btnSm} onClick={() => setStatus(p.id, "Lost")}>Mark Lost</button>}
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
            <div style={S.modalTitle}>Create Proposal</div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Client</label><input style={S.input} value={form.client} onChange={(e) => set("client", e.target.value)} placeholder="ABC Traders" /></div>
              <div style={S.field}><label style={S.label}>Proposal No.</label><input style={S.input} value={form.proposalNo} onChange={(e) => set("proposalNo", e.target.value)} placeholder="PROP-2026-001" /></div>
            </div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Service Line</label><input style={S.input} value={form.serviceLine} onChange={(e) => set("serviceLine", e.target.value)} placeholder="Strategy / Ops / Transformation" /></div>
              <div style={S.field}><label style={S.label}>Value ($)</label><input style={S.input} type="number" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="0" /></div>
            </div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Due Date</label><input style={S.input} type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
              <div style={S.field}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={(e) => set("status", e.target.value)}><option>Draft</option><option>Sent</option></select></div>
            </div>
            <div style={S.modalFooter}>
              <button style={S.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Proposal"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
