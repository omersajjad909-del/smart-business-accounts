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

const statusColor: Record<string, string> = { Planning: "#38bdf8", Fieldwork: "#f59e0b", Review: "#a78bfa", Closed: "#34d399" };
const badge = (status: string) => ({
  display: "inline-block",
  padding: "0.2rem 0.65rem",
  borderRadius: "999px",
  fontSize: "0.75rem",
  fontWeight: 600,
  background: (statusColor[status] ?? "#94a3b8") + "22",
  color: statusColor[status] ?? "#94a3b8",
});

const EMPTY = { engagement: "", client: "", partner: "", startDate: "", targetDate: "", status: "Planning" };

export default function AuditPlanningPage() {
  const { records, loading, create, setStatus } = useBusinessRecords("audit_plan");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const plans = useMemo(() => records.map((r) => ({
    id: r.id,
    status: r.status,
    engagement: String(r.data.engagement ?? r.title ?? ""),
    client: String(r.data.client ?? ""),
    partner: String(r.data.partner ?? ""),
    startDate: String(r.data.startDate ?? r.date ?? ""),
    targetDate: String(r.data.targetDate ?? ""),
  })), [records]);

  const kpis = useMemo(() => ({
    total: plans.length,
    fieldwork: plans.filter((p) => p.status === "Fieldwork").length,
    review: plans.filter((p) => p.status === "Review").length,
    closed: plans.filter((p) => p.status === "Closed").length,
  }), [plans]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const engagement = form.engagement.trim();
    const client = form.client.trim();
    const duplicatePlan = plans.some((p) => p.engagement.toLowerCase() === engagement.toLowerCase() && p.client.toLowerCase() === client.toLowerCase() && p.status !== "Closed");
    if (!engagement || !client || !form.startDate || !form.targetDate) {
      toast.error("Engagement, client, start date, aur target date required hain.");
      return;
    }
    if (new Date(form.targetDate) < new Date(form.startDate)) {
      toast("Target date start date se pehle nahi ho sakti.");
      return;
    }
    if (duplicatePlan) {
      toast("Yeh audit engagement pehle se planning me maujood hai.");
      return;
    }
    setSaving(true);
    try {
      await create({
        title: engagement,
        status: form.status,
        date: form.startDate,
        data: {
          engagement,
          client,
          partner: form.partner,
          startDate: form.startDate,
          targetDate: form.targetDate,
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
        <h1 style={S.title}>Audit Planning</h1>
        <button style={S.btn} onClick={() => { setForm({ ...EMPTY }); setShowModal(true); }}>+ New Audit Plan</button>
      </div>

      <div style={S.kpiGrid}>
        <div style={S.kpi}><div style={S.kpiLabel}>Total Plans</div><div style={S.kpiVal}>{kpis.total}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Fieldwork</div><div style={{ ...S.kpiVal, color: "#f59e0b" }}>{kpis.fieldwork}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Review</div><div style={{ ...S.kpiVal, color: "#a78bfa" }}>{kpis.review}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Closed</div><div style={{ ...S.kpiVal, color: "#34d399" }}>{kpis.closed}</div></div>
      </div>

      <div style={S.panel}>
        {loading ? <div style={S.loading}>Loading audit plans…</div> : (
          <table style={S.table}>
            <thead><tr>{["Engagement", "Client", "Partner", "Start", "Target", "Status", "Actions"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {plans.length === 0 ? (
                <tr><td colSpan={7} style={S.emptyRow}>No audit plans yet.</td></tr>
              ) : plans.map((p) => (
                <tr key={p.id}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{p.engagement}</td>
                  <td style={S.td}>{p.client}</td>
                  <td style={S.td}>{p.partner || "—"}</td>
                  <td style={S.td}>{p.startDate}</td>
                  <td style={S.td}>{p.targetDate}</td>
                  <td style={S.td}><span style={badge(p.status)}>{p.status}</span></td>
                  <td style={S.td}>
                    {p.status === "Planning" && <button style={S.btnSm} onClick={() => setStatus(p.id, "Fieldwork")}>Start Fieldwork</button>}
                    {p.status === "Fieldwork" && <button style={S.btnSm} onClick={() => setStatus(p.id, "Review")}>Send Review</button>}
                    {p.status === "Review" && <button style={S.btnSm} onClick={() => setStatus(p.id, "Closed")}>Close</button>}
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
            <div style={S.modalTitle}>Create Audit Plan</div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Engagement</label><input style={S.input} value={form.engagement} onChange={(e) => set("engagement", e.target.value)} placeholder="FY2026 External Audit" /></div>
              <div style={S.field}><label style={S.label}>Client</label><input style={S.input} value={form.client} onChange={(e) => set("client", e.target.value)} placeholder="ABC Traders" /></div>
            </div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Partner / Manager</label><input style={S.input} value={form.partner} onChange={(e) => set("partner", e.target.value)} placeholder="A. Rehman" /></div>
              <div style={S.field}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={(e) => set("status", e.target.value)}><option>Planning</option><option>Fieldwork</option><option>Review</option></select></div>
            </div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Start Date</label><input style={S.input} type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
              <div style={S.field}><label style={S.label}>Target Date</label><input style={S.input} type="date" value={form.targetDate} onChange={(e) => set("targetDate", e.target.value)} /></div>
            </div>
            <div style={S.modalFooter}>
              <button style={S.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Plan"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
