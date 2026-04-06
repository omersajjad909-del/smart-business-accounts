"use client";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapAdmissionRecords, mapStudentRecords, schoolBg, schoolBorder, schoolFont, schoolMuted, todayIso } from "../_shared";

export default function SchoolAdmissionsPage() {
  const admissionStore = useBusinessRecords("school_admission");
  const studentStore = useBusinessRecords("student");
  const { records, loading, create, update } = admissionStore;
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ applicant: "", className: "", guardian: "", phone: "", interviewDate: todayIso() });

  const admissions = useMemo(() => mapAdmissionRecords(records), [records]);
  const students = useMemo(() => mapStudentRecords(studentStore.records), [studentStore.records]);

  async function save() {
    if (!form.applicant.trim() || !form.className.trim() || !form.guardian.trim()) {
      setError("Applicant, class, and guardian are required.");
      return;
    }
    if (admissions.some((row) => row.applicant.toLowerCase() === form.applicant.trim().toLowerCase() && row.className === form.className && row.status !== "rejected")) {
      setError("This admission request already exists.");
      return;
    }
    await create({
      title: form.applicant.trim(),
      status: "pending",
      date: form.interviewDate,
      data: { class: form.className.trim(), guardian: form.guardian.trim(), phone: form.phone.trim(), interviewDate: form.interviewDate },
    });
    setShowModal(false);
    setError("");
    setForm({ applicant: "", className: "", guardian: "", phone: "", interviewDate: todayIso() });
  }

  async function decide(id: string, status: "approved" | "rejected") {
    const row = admissions.find((entry) => entry.id === id);
    if (!row) return;
    if (status === "approved" && students.some((student) => student.name.toLowerCase() === row.applicant.toLowerCase() && student.className === row.className)) {
      toast.error("Student already exists in this class.");
      return;
    }
    await update(id, { status });
  }

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: schoolFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Admissions Desk</h1>
          <p style={{ margin: 0, fontSize: 13, color: schoolMuted }}>Manage admission pipeline, interviews, and approval decisions.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, cursor: "pointer" }}>New Admission</button>
      </div>

      <div style={{ background: schoolBg, border: `1px solid ${schoolBorder}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Applicant", "Class", "Guardian", "Phone", "Interview", "Status", "Action"].map((head) => (
              <th key={head} style={{ textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${schoolBorder}`, fontSize: 12, color: schoolMuted }}>{head}</th>
            ))}</tr>
          </thead>
          <tbody>
            {admissions.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.applicant}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Class {row.className}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.guardian}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.phone || "—"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.interviewDate}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.status}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {row.status === "pending" && <button onClick={() => decide(row.id, "approved")} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", cursor: "pointer" }}>Approve</button>}
                    {row.status === "pending" && <button onClick={() => decide(row.id, "rejected")} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)", color: "#f87171", cursor: "pointer" }}>Reject</button>}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && admissions.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No admissions yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 560, background: "#161b27", border: `1px solid ${schoolBorder}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800 }}>New Admission</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Applicant</label>
                <input value={form.applicant} onChange={(e) => setForm((prev) => ({ ...prev, applicant: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Class</label>
                <input value={form.className} onChange={(e) => setForm((prev) => ({ ...prev, className: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Interview Date</label>
                <input type="date" value={form.interviewDate} onChange={(e) => setForm((prev) => ({ ...prev, interviewDate: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Guardian</label>
                <input value={form.guardian} onChange={(e) => setForm((prev) => ({ ...prev, guardian: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Phone</label>
                <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
            </div>
            {error && <div style={{ marginTop: 12, color: "#fda4af", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 18px", borderRadius: 8, border: `1px solid ${schoolBorder}`, background: "transparent", color: "#cbd5e1", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
