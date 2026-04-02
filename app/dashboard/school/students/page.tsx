"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const S = {
  page: { minHeight: "100vh", background: "#0f1117", color: "#fff", fontFamily: "'Outfit','Inter',sans-serif", padding: "32px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" },
  title: { fontSize: "24px", fontWeight: 700, margin: 0 },
  sub: { fontSize: "13px", color: "rgba(255,255,255,.45)", marginTop: "4px" },
  btn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "28px" },
  statCard: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "14px", padding: "20px" },
  statLabel: { fontSize: "12px", color: "rgba(255,255,255,.45)", marginBottom: "8px", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
  statValue: { fontSize: "28px", fontWeight: 700 },
  statSub: { fontSize: "12px", color: "rgba(255,255,255,.35)", marginTop: "4px" },
  layout: { display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px" },
  table: { width: "100%", borderCollapse: "collapse" as const, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "14px", overflow: "hidden" },
  th: { padding: "14px 16px", textAlign: "left" as const, fontSize: "11px", color: "rgba(255,255,255,.4)", textTransform: "uppercase" as const, letterSpacing: "0.5px", borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)" },
  tr: (sel: boolean) => ({ background: sel ? "rgba(99,102,241,.1)" : "transparent", cursor: "pointer" }),
  td: { padding: "14px 16px", fontSize: "13px", color: "rgba(255,255,255,.8)", borderBottom: "1px solid rgba(255,255,255,.04)" },
  badge: (color: string) => ({ background: color, color: "#fff", borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, display: "inline-block" }),
  detailPanel: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "14px", padding: "22px" },
  detailTitle: { fontSize: "16px", fontWeight: 700, marginBottom: "6px" },
  detailSub: { fontSize: "12px", color: "rgba(255,255,255,.4)", marginBottom: "18px" },
  detailRow: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "rgba(255,255,255,.6)", marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,.05)" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#1a1d2e", border: "1px solid rgba(255,255,255,.1)", borderRadius: "18px", padding: "32px", width: "520px", maxHeight: "90vh", overflowY: "auto" as const },
  modalTitle: { fontSize: "18px", fontWeight: 700, marginBottom: "24px" },
  formGroup: { marginBottom: "16px" },
  label: { display: "block", fontSize: "12px", color: "rgba(255,255,255,.5)", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.4px" },
  input: { width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" as const },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" },
  modalBtns: { display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" },
  cancelBtn: { background: "rgba(255,255,255,.07)", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
};

const FEE_COLORS: Record<string, string> = {
  paid: "rgba(34,197,94,.7)", pending: "rgba(234,179,8,.7)", overdue: "rgba(239,68,68,.8)"
};

export default function StudentsPage() {
  const { records, loading, create } = useBusinessRecords("student");
  const [selected, setSelected] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ rollNo: "", name: "", class: "", section: "", dob: "", guardian: "", phone: "", feeStatus: "paid", admissionDate: "", status: "active" });

  const students = records.map(r => ({
    id: r.id,
    rollNo: (r.data?.rollNo as string) || r.id,
    name: r.title,
    class: (r.data?.class as string) || "",
    section: (r.data?.section as string) || "",
    dob: (r.data?.dob as string) || "",
    guardian: (r.data?.guardian as string) || "",
    phone: (r.data?.phone as string) || "",
    feeStatus: r.status || "pending",
    admissionDate: r.date || (r.data?.admissionDate as string) || "",
    status: (r.data?.studentStatus as string) || "active",
  }));

  const thisMonth = new Date().toISOString().slice(0, 7);
  const active = students.filter(s => s.status === "active").length;
  const defaulters = students.filter(s => s.feeStatus === "overdue").length;
  const newThisMonth = students.filter(s => s.admissionDate.startsWith(thisMonth)).length;

  const selStudent = students.find(s => s.id === selected);

  async function handleCreate() {
    if (!form.name.trim() || !form.rollNo.trim() || !form.class.trim() || !form.admissionDate) {
      setError("Roll number, student name, class, and admission date are required.");
      return;
    }
    if (students.some(s => s.rollNo.toLowerCase() === form.rollNo.trim().toLowerCase())) {
      setError("This roll number already exists.");
      return;
    }
    await create({ title: form.name, status: form.feeStatus, date: form.admissionDate, data: { rollNo: form.rollNo, class: form.class, section: form.section, dob: form.dob, guardian: form.guardian, phone: form.phone, admissionDate: form.admissionDate, studentStatus: form.status } });
    setShowModal(false);
    setError("");
    setForm({ rollNo: "", name: "", class: "", section: "", dob: "", guardian: "", phone: "", feeStatus: "paid", admissionDate: "", status: "active" });
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Student Management</h1>
          <p style={S.sub}>Manage student records, enrollment and fee status</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>+ Add Student</button>
      </div>

      <div style={S.statsGrid}>
        {[
          { label: "Total Students", value: students.length, sub: "Enrolled" },
          { label: "Active", value: active, sub: "Currently enrolled" },
          { label: "Fee Defaulters", value: defaulters, sub: "Overdue fees" },
          { label: "New This Month", value: newThisMonth, sub: "This month" },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={S.statLabel}>{s.label}</div>
            <div style={S.statValue}>{s.value}</div>
            <div style={S.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,.4)" }}>Loading...</div>}

      <div style={S.layout}>
        <div style={{ overflowX: "auto" as const }}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Roll #", "Name", "Class", "Section", "Guardian", "Phone", "Fee Status", "Admission"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && students.length === 0 && (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "rgba(255,255,255,.25)", padding: "32px" }}>No students found.</td></tr>
              )}
              {students.map(s => (
                <tr key={s.id} style={S.tr(selected === s.id)} onClick={() => setSelected(s.id)}>
                  <td style={{ ...S.td, fontWeight: 700, color: "#fff" }}>{s.rollNo}</td>
                  <td style={{ ...S.td, fontWeight: 600, color: "#fff" }}>{s.name}</td>
                  <td style={S.td}>Class {s.class}</td>
                  <td style={S.td}>{s.section}</td>
                  <td style={S.td}>{s.guardian}</td>
                  <td style={S.td}>{s.phone}</td>
                  <td style={S.td}><span style={S.badge(FEE_COLORS[s.feeStatus] || "rgba(107,114,128,.7)")}>{s.feeStatus.toUpperCase()}</span></td>
                  <td style={S.td}>{s.admissionDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selStudent ? (
          <div style={S.detailPanel}>
            <div style={{ fontSize: "32px", fontWeight: 700, color: "#6366f1", marginBottom: "4px" }}>
              {selStudent.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div style={S.detailTitle}>{selStudent.name}</div>
            <div style={S.detailSub}>{selStudent.rollNo}</div>
            <span style={S.badge(FEE_COLORS[selStudent.feeStatus] || "rgba(107,114,128,.7)")}>{selStudent.feeStatus.toUpperCase()}</span>
            <div style={{ marginTop: "20px" }}>
              {[
                { label: "Class", value: `Class ${selStudent.class} - ${selStudent.section}` },
                { label: "Date of Birth", value: selStudent.dob },
                { label: "Guardian", value: selStudent.guardian },
                { label: "Contact", value: selStudent.phone },
                { label: "Admission Date", value: selStudent.admissionDate },
                { label: "Status", value: selStudent.status.toUpperCase() },
              ].map(r => (
                <div key={r.label} style={S.detailRow}>
                  <span>{r.label}</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ ...S.detailPanel, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.2)" }}>
            Select a student to view details
          </div>
        )}
      </div>

      {showModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalTitle}>Add New Student</div>
            <div style={S.row2}>
              <div style={S.formGroup}><label style={S.label}>Roll Number</label><input style={S.input} value={form.rollNo} onChange={e => setForm(f => ({ ...f, rollNo: e.target.value }))} placeholder="2024-XXX" /></div>
              <div style={S.formGroup}><label style={S.label}>Admission Date</label><input style={S.input} type="date" value={form.admissionDate} onChange={e => setForm(f => ({ ...f, admissionDate: e.target.value }))} /></div>
            </div>
            <div style={S.formGroup}><label style={S.label}>Full Name</label><input style={S.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Student full name" /></div>
            <div style={S.row3}>
              <div style={S.formGroup}><label style={S.label}>Class</label><input style={S.input} value={form.class} onChange={e => setForm(f => ({ ...f, class: e.target.value }))} placeholder="e.g. 9" /></div>
              <div style={S.formGroup}><label style={S.label}>Section</label><input style={S.input} value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder="A / B / C" /></div>
              <div style={S.formGroup}><label style={S.label}>Date of Birth</label><input style={S.input} type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} /></div>
            </div>
            <div style={S.row2}>
              <div style={S.formGroup}><label style={S.label}>Guardian Name</label><input style={S.input} value={form.guardian} onChange={e => setForm(f => ({ ...f, guardian: e.target.value }))} placeholder="Father/Guardian" /></div>
              <div style={S.formGroup}><label style={S.label}>Phone</label><input style={S.input} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0300-XXXXXXX" /></div>
            </div>
            <div style={S.row2}>
              <div style={S.formGroup}><label style={S.label}>Fee Status</label>
                <select style={S.input} value={form.feeStatus} onChange={e => setForm(f => ({ ...f, feeStatus: e.target.value }))}>
                  <option value="paid">Paid</option><option value="pending">Pending</option><option value="overdue">Overdue</option>
                </select>
              </div>
              <div style={S.formGroup}><label style={S.label}>Status</label>
                <select style={S.input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            {error && <div style={{ color: "#fda4af", fontSize: "12px", marginTop: "4px" }}>{error}</div>}
            <div style={S.modalBtns}>
              <button style={S.cancelBtn} onClick={() => { setShowModal(false); setError(""); }}>Cancel</button>
              <button style={S.btn} onClick={handleCreate}>Add Student</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
