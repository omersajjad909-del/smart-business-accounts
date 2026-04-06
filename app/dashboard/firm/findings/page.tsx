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
  modal: { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "600px", fontFamily: font, maxHeight: "90vh", overflowY: "auto" as const },
  modalTitle: { fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--text-primary)" },
  field: { marginBottom: "1rem" },
  label: { display: "block", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.35rem" },
  input: { width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.55rem 0.75rem", color: "var(--text-primary)", fontFamily: font, fontSize: "0.92rem", boxSizing: "border-box" as const, outline: "none" },
  textarea: { width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.55rem 0.75rem", color: "var(--text-primary)", fontFamily: font, fontSize: "0.92rem", boxSizing: "border-box" as const, outline: "none", minHeight: "72px", resize: "vertical" as const },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" },
  btnCancel: { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.55rem 1.1rem", fontFamily: font, fontSize: "0.9rem", cursor: "pointer" },
  loading: { textAlign: "center" as const, padding: "3rem", color: "var(--text-muted)" },
  btnSm: { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.3rem 0.7rem", fontFamily: font, fontSize: "0.8rem", cursor: "pointer", marginRight: "0.4rem" },
};

const severityColor: Record<string, string> = { High: "#ef4444", Medium: "#f59e0b", Low: "#38bdf8" };
const statusColor: Record<string, string> = { Open: "#f87171", Discussed: "#f59e0b", Cleared: "#34d399" };
const badge = (status: string, map: Record<string, string>) => ({
  display: "inline-block",
  padding: "0.2rem 0.65rem",
  borderRadius: "999px",
  fontSize: "0.75rem",
  fontWeight: 600,
  background: (map[status] ?? "#94a3b8") + "22",
  color: map[status] ?? "#94a3b8",
});

const EMPTY = { engagement: "", area: "", issue: "", severity: "Medium", status: "Open" };

export default function AuditFindingsPage() {
  const { records, loading, create, setStatus } = useBusinessRecords("audit_finding");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const findings = useMemo(() => records.map((r) => ({
    id: r.id,
    status: r.status,
    engagement: String(r.data.engagement ?? ""),
    area: String(r.data.area ?? ""),
    issue: String(r.data.issue ?? r.title ?? ""),
    severity: String(r.data.severity ?? "Medium"),
  })), [records]);

  const kpis = useMemo(() => ({
    total: findings.length,
    open: findings.filter((f) => f.status === "Open").length,
    high: findings.filter((f) => f.severity === "High" && f.status !== "Cleared").length,
    cleared: findings.filter((f) => f.status === "Cleared").length,
  }), [findings]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const engagement = form.engagement.trim();
    const area = form.area.trim();
    const issue = form.issue.trim();
    const duplicateFinding = findings.some((f) => f.engagement.toLowerCase() === engagement.toLowerCase() && f.area.toLowerCase() === area.toLowerCase() && f.issue.toLowerCase() === issue.toLowerCase() && f.status !== "Cleared");
    if (!engagement || !area || !issue) {
      toast.error("Engagement, area, aur issue detail required hain.");
      return;
    }
    if (duplicateFinding) {
      toast.error("Yeh finding already open hai.");
      return;
    }
    setSaving(true);
    try {
      await create({
        title: issue,
        status: form.status,
        data: { engagement, area, issue, severity: form.severity },
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
        <h1 style={S.title}>Audit Findings</h1>
        <button style={S.btn} onClick={() => { setForm({ ...EMPTY }); setShowModal(true); }}>+ New Finding</button>
      </div>

      <div style={S.kpiGrid}>
        <div style={S.kpi}><div style={S.kpiLabel}>Total Findings</div><div style={S.kpiVal}>{kpis.total}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Open</div><div style={{ ...S.kpiVal, color: "#f87171" }}>{kpis.open}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>High Severity</div><div style={{ ...S.kpiVal, color: "#ef4444" }}>{kpis.high}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>Cleared</div><div style={{ ...S.kpiVal, color: "#34d399" }}>{kpis.cleared}</div></div>
      </div>

      <div style={S.panel}>
        {loading ? <div style={S.loading}>Loading findings…</div> : (
          <table style={S.table}>
            <thead><tr>{["Engagement", "Area", "Issue", "Severity", "Status", "Actions"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {findings.length === 0 ? (
                <tr><td colSpan={6} style={S.emptyRow}>No audit findings yet.</td></tr>
              ) : findings.map((f) => (
                <tr key={f.id}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{f.engagement}</td>
                  <td style={S.td}>{f.area}</td>
                  <td style={S.td}>{f.issue}</td>
                  <td style={S.td}><span style={badge(f.severity, severityColor)}>{f.severity}</span></td>
                  <td style={S.td}><span style={badge(f.status, statusColor)}>{f.status}</span></td>
                  <td style={S.td}>
                    {f.status === "Open" && <button style={S.btnSm} onClick={() => setStatus(f.id, "Discussed")}>Discussed</button>}
                    {f.status !== "Cleared" && <button style={S.btnSm} onClick={() => setStatus(f.id, "Cleared")}>Clear</button>}
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
            <div style={S.modalTitle}>Log Audit Finding</div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Engagement</label><input style={S.input} value={form.engagement} onChange={(e) => set("engagement", e.target.value)} placeholder="FY2026 External Audit" /></div>
              <div style={S.field}><label style={S.label}>Area</label><input style={S.input} value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="Revenue / Inventory / Payroll" /></div>
            </div>
            <div style={S.field}><label style={S.label}>Issue</label><textarea style={S.textarea} value={form.issue} onChange={(e) => set("issue", e.target.value)} placeholder="Describe the observation..." /></div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Severity</label><select style={S.input} value={form.severity} onChange={(e) => set("severity", e.target.value)}><option>High</option><option>Medium</option><option>Low</option></select></div>
              <div style={S.field}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={(e) => set("status", e.target.value)}><option>Open</option><option>Discussed</option></select></div>
            </div>
            <div style={S.modalFooter}>
              <button style={S.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Finding"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
