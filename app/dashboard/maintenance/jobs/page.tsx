"use client";
import { useState } from "react";
import { useBusinessRecords, BusinessRecord } from "@/lib/useBusinessRecords";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
const STATUSES   = ["Pending", "In-Progress", "Completed", "Cancelled"] as const;

const priorityColor: Record<string, string> = {
  Low: "#22c55e", Medium: "#f59e0b", High: "#f97316", Urgent: "#ef4444",
};
const statusColor: Record<string, string> = {
  Pending: "#f59e0b", "In-Progress": "#3b82f6", Completed: "#22c55e", Cancelled: "#6b7280",
};

const EMPTY = {
  jobNo: "", client: "", assetType: "", issue: "", assignedTo: "",
  priority: "Medium", scheduledDate: "", status: "Pending",
};

const S = {
  page: { padding: "28px 32px", fontFamily: "'Outfit','Inter',sans-serif", color: "var(--text-primary)", minHeight: "100vh", background: "var(--app-bg)" } as React.CSSProperties,
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 } as React.CSSProperties,
  h1: { margin: 0, fontSize: 24, fontWeight: 700 } as React.CSSProperties,
  sub: { margin: "4px 0 0", color: "var(--text-muted)", fontSize: 14 } as React.CSSProperties,
  addBtn: { padding: "10px 20px", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", fontFamily: "'Outfit','Inter',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 } as React.CSSProperties,
  kpiCard: { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" } as React.CSSProperties,
  kpiLabel: { fontSize: 13, color: "var(--text-muted)", marginBottom: 8 } as React.CSSProperties,
  searchBar: { padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--app-bg)", color: "var(--text-primary)", fontFamily: "'Outfit','Inter',sans-serif", fontSize: 14, width: 340, marginBottom: 16 } as React.CSSProperties,
  tableWrap: { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { padding: "13px 16px", textAlign: "left" as const, fontSize: 12, fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" as const, borderBottom: "1px solid var(--border)" },
  td: { padding: "12px 16px", fontSize: 14, borderBottom: "1px solid var(--border)" },
  overlay: { position: "fixed" as const, inset: 0, background: "#000a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto" as const },
  label: { fontSize: 13, color: "var(--text-muted)", marginBottom: 4, display: "block" } as React.CSSProperties,
  inp: { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--app-bg)", color: "var(--text-primary)", fontFamily: "'Outfit','Inter',sans-serif", fontSize: 14, boxSizing: "border-box" as const },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } as React.CSSProperties,
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 } as React.CSSProperties,
  cancelBtn: { padding: "9px 20px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "var(--text-primary)", fontSize: 14, cursor: "pointer", fontFamily: "'Outfit','Inter',sans-serif" } as React.CSSProperties,
  saveBtn: { padding: "9px 20px", borderRadius: 9, border: "none", background: "#6366f1", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit','Inter',sans-serif" } as React.CSSProperties,
  editBtn: { marginRight: 8, padding: "5px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-primary)", fontSize: 12, cursor: "pointer" } as React.CSSProperties,
  delBtn: { padding: "5px 12px", borderRadius: 7, border: "1px solid #ef444455", background: "transparent", color: "#ef4444", fontSize: 12, cursor: "pointer" } as React.CSSProperties,
};

function badge(label: string, colorMap: Record<string, string>) {
  const c = colorMap[label] ?? "#6b7280";
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: c + "22", color: c }}>
      {label}
    </span>
  );
}

export default function MaintenanceJobsPage() {
  const { records, loading, create, update, remove } = useBusinessRecords("maintenance_job");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<string | null>(null);
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const kpis = {
    total:          records.length,
    pending:        records.filter(r => r.status === "Pending").length,
    inProgress:     records.filter(r => r.status === "In-Progress").length,
    completedToday: records.filter(r => r.status === "Completed" && r.date?.slice(0, 10) === today).length,
  };

  const q = search.toLowerCase();
  const filtered = records.filter(r =>
    [r.data.jobNo, r.data.client, r.data.assignedTo, r.data.assetType]
      .some(v => String(v ?? "").toLowerCase().includes(q))
  );

  function openAdd() {
    setEditing(null); setForm({ ...EMPTY }); setShowModal(true);
  }
  function openEdit(r: BusinessRecord) {
    setEditing(r.id);
    setForm({
      jobNo:         String(r.data.jobNo ?? ""),
      client:        String(r.data.client ?? ""),
      assetType:     String(r.data.assetType ?? ""),
      issue:         String(r.data.issue ?? ""),
      assignedTo:    String(r.data.assignedTo ?? ""),
      priority:      String(r.data.priority ?? "Medium"),
      scheduledDate: r.date?.slice(0, 10) ?? "",
      status:        r.status,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        title:  `${form.jobNo || "JOB"} – ${form.client}`,
        status: form.status,
        date:   form.scheduledDate || undefined,
        data:   { jobNo: form.jobNo, client: form.client, assetType: form.assetType, issue: form.issue, assignedTo: form.assignedTo, priority: form.priority },
      };
      if (editing) await update(editing, payload); else await create(payload);
      setShowModal(false);
    } finally { setSaving(false); }
  }

  function field(key: keyof typeof EMPTY, lbl: string, opts?: { type?: string; required?: boolean }) {
    return (
      <div key={key}>
        <label style={S.label}>{lbl}</label>
        <input
          type={opts?.type ?? "text"}
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          style={S.inp}
          required={opts?.required}
        />
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>Maintenance Jobs</h1>
          <p style={S.sub}>Track and manage all maintenance work orders</p>
        </div>
        <button onClick={openAdd} style={S.addBtn}>+ New Job</button>
      </div>

      {/* KPIs */}
      <div style={S.kpiGrid}>
        {[
          { label: "Total Jobs",       value: kpis.total,          color: "#6366f1" },
          { label: "Pending",          value: kpis.pending,        color: "#f59e0b" },
          { label: "In-Progress",      value: kpis.inProgress,     color: "#3b82f6" },
          { label: "Completed Today",  value: kpis.completedToday, color: "#22c55e" },
        ].map(k => (
          <div key={k.label} style={S.kpiCard}>
            <div style={S.kpiLabel}>{k.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by job no, client, assignee…" style={S.searchBar} />

      {/* Table */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {["Job No","Client","Asset Type","Issue","Assigned To","Priority","Scheduled","Status",""].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: "var(--text-muted)", padding: 40 }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: "var(--text-muted)", padding: 40 }}>No jobs found. Click "+ New Job" to get started.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id}>
                <td style={{ ...S.td, fontWeight: 600, color: "#6366f1" }}>{String(r.data.jobNo || "—")}</td>
                <td style={S.td}>{String(r.data.client || "—")}</td>
                <td style={{ ...S.td, color: "var(--text-muted)" }}>{String(r.data.assetType || "—")}</td>
                <td style={{ ...S.td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(r.data.issue || "—")}</td>
                <td style={S.td}>{String(r.data.assignedTo || "—")}</td>
                <td style={S.td}>{badge(String(r.data.priority ?? ""), priorityColor)}</td>
                <td style={{ ...S.td, color: "var(--text-muted)", fontSize: 13 }}>{r.date?.slice(0, 10) || "—"}</td>
                <td style={S.td}>{badge(r.status, statusColor)}</td>
                <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                  <button onClick={() => openEdit(r)} style={S.editBtn}>Edit</button>
                  <button onClick={() => remove(r.id)} style={S.delBtn}>Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>
              {editing ? "Edit Job" : "New Maintenance Job"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={S.grid2}>
                {field("jobNo",      "Job No")}
                {field("client",     "Client", { required: true })}
                {field("assetType",  "Asset Type")}
                {field("assignedTo", "Assigned To")}
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={S.label}>Issue Description</label>
                <textarea value={form.issue} onChange={e => setForm(p => ({ ...p, issue: e.target.value }))}
                  rows={3} style={{ ...S.inp, resize: "vertical" }} />
              </div>
              <div style={S.grid3}>
                <div>
                  <label style={S.label}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} style={S.inp}>
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Scheduled Date</label>
                  <input type="date" value={form.scheduledDate} onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))} style={S.inp} />
                </div>
                <div>
                  <label style={S.label}>Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={S.inp}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowModal(false)} style={S.cancelBtn}>Cancel</button>
                <button type="submit" disabled={saving} style={S.saveBtn}>
                  {saving ? "Saving…" : editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
