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
  row2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  row3:        { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" },
  btnCancel:   { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.55rem 1.1rem", fontFamily: font, fontSize: "0.9rem", cursor: "pointer" },
  loading:     { textAlign: "center" as const, padding: "3rem", color: "var(--text-muted)" },
};

const statusColor: Record<string, string> = { Active: "#34d399", Inactive: "#94a3b8", Probation: "#f59e0b" };
const badge = (status: string) => ({
  display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "999px",
  fontSize: "0.75rem", fontWeight: 600,
  background: (statusColor[status] ?? "#94a3b8") + "22",
  color: statusColor[status] ?? "#94a3b8",
});

const EMPTY = { outletName: "", location: "", franchisee: "", openDate: "", employees: "", monthlySales: "", status: "Active" };

export default function FranchiseOutletsPage() {
  const { records, loading, create, setStatus, remove } = useBusinessRecords("franchise_outlet");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const outlets = useMemo(() =>
    records.map(r => ({
      id:           r.id,
      status:       r.status,
      outletName:   String(r.data.outletName   ?? r.title ?? ""),
      location:     String(r.data.location     ?? ""),
      franchisee:   String(r.data.franchisee   ?? ""),
      openDate:     String(r.data.openDate     ?? ""),
      employees:    Number(r.data.employees    ?? 0),
      monthlySales: Number(r.amount            ?? 0),
    })), [records]);

  const kpis = useMemo(() => {
    const active   = outlets.filter(o => o.status === "Active");
    const totalRev = outlets.reduce((s, o) => s + o.monthlySales, 0);
    const avgSales = active.length ? (active.reduce((s, o) => s + o.monthlySales, 0) / active.length) : 0;
    return { total: outlets.length, activeCount: active.length, totalRev, avgSales };
  }, [outlets]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.outletName.trim()) return;
    setSaving(true);
    try {
      await create({
        title: form.outletName,
        status: form.status,
        amount: parseFloat(form.monthlySales) || 0,
        date: form.openDate || undefined,
        data: {
          outletName: form.outletName, location: form.location, franchisee: form.franchisee,
          openDate: form.openDate, employees: parseInt(form.employees) || 0,
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
        <h1 style={S.title}>Franchise Outlets</h1>
        <button style={S.btn} onClick={() => { setForm({ ...EMPTY }); setShowModal(true); }}>+ Add Outlet</button>
      </div>

      <div style={S.kpiGrid}>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Total Outlets</div>
          <div style={S.kpiVal}>{kpis.total}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Active</div>
          <div style={{ ...S.kpiVal, color: "#34d399" }}>{kpis.activeCount}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Monthly Revenue</div>
          <div style={{ ...S.kpiVal, color: "#818cf8" }}>${kpis.totalRev.toLocaleString()}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Avg Sales / Outlet</div>
          <div style={{ ...S.kpiVal, color: "#38bdf8" }}>${kpis.avgSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
      </div>

      <div style={S.panel}>
        {loading ? (
          <div style={S.loading}>Loading outlets…</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {["Outlet Name", "Location", "Franchisee", "Open Date", "Employees", "Monthly Sales", "Status", "Actions"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outlets.length === 0 ? (
                <tr><td colSpan={8} style={S.emptyRow}>No outlets yet. Click &ldquo;Add Outlet&rdquo; to begin.</td></tr>
              ) : outlets.map(o => (
                <tr key={o.id}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{o.outletName}</td>
                  <td style={S.td}>{o.location   || "—"}</td>
                  <td style={S.td}>{o.franchisee || "—"}</td>
                  <td style={S.td}>{o.openDate   || "—"}</td>
                  <td style={S.td}>{o.employees}</td>
                  <td style={S.td}>${o.monthlySales.toLocaleString()}</td>
                  <td style={S.td}><span style={badge(o.status)}>{o.status}</span></td>
                  <td style={S.td}>
                    {o.status !== "Active"    && <button style={S.btnSm} onClick={() => setStatus(o.id, "Active")}>Activate</button>}
                    {o.status === "Active"    && <button style={S.btnSm} onClick={() => setStatus(o.id, "Inactive")}>Deactivate</button>}
                    {o.status !== "Probation" && <button style={S.btnSm} onClick={() => setStatus(o.id, "Probation")}>Probation</button>}
                    <button style={S.btnDanger} onClick={() => remove(o.id)}>Remove</button>
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
            <div style={S.modalTitle}>Add Outlet</div>
            <div style={S.field}>
              <label style={S.label}>Outlet Name *</label>
              <input style={S.input} value={form.outletName} onChange={e => set("outletName", e.target.value)} placeholder="Downtown Branch" />
            </div>
            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Location</label>
                <input style={S.input} value={form.location} onChange={e => set("location", e.target.value)} placeholder="New York, NY" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Franchisee</label>
                <input style={S.input} value={form.franchisee} onChange={e => set("franchisee", e.target.value)} placeholder="John Doe" />
              </div>
            </div>
            <div style={S.row3}>
              <div style={S.field}>
                <label style={S.label}>Open Date</label>
                <input style={S.input} type="date" value={form.openDate} onChange={e => set("openDate", e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Employees</label>
                <input style={S.input} type="number" min="0" value={form.employees} onChange={e => set("employees", e.target.value)} placeholder="0" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Monthly Sales ($)</label>
                <input style={S.input} type="number" min="0" value={form.monthlySales} onChange={e => set("monthlySales", e.target.value)} placeholder="0" />
              </div>
            </div>
            <div style={S.field}>
              <label style={S.label}>Status</label>
              <select style={S.input} value={form.status} onChange={e => set("status", e.target.value)}>
                <option>Active</option><option>Inactive</option><option>Probation</option>
              </select>
            </div>
            <div style={S.modalFooter}>
              <button style={S.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Outlet"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
