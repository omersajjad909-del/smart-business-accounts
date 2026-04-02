"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapAttendanceRecords, mapStudentRecords, schoolBg, schoolBorder, schoolFont, schoolMuted, todayIso } from "../_shared";

export default function SchoolAttendancePage() {
  const attendanceStore = useBusinessRecords("school_attendance");
  const studentStore = useBusinessRecords("student");
  const { records, loading, create } = attendanceStore;
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ student: "", className: "", date: todayIso(), status: "present", remarks: "" });

  const attendance = useMemo(() => mapAttendanceRecords(records), [records]);
  const students = useMemo(() => mapStudentRecords(studentStore.records), [studentStore.records]);

  async function save() {
    if (!form.student || !form.className || !form.date) {
      setError("Student, class, and date are required.");
      return;
    }
    if (!students.some((row) => row.name === form.student && row.className === form.className)) {
      setError("Selected student does not exist in the selected class.");
      return;
    }
    if (attendance.some((row) => row.student === form.student && row.className === form.className && row.date === form.date)) {
      setError("Attendance already exists for this student on this date.");
      return;
    }
    await create({
      title: form.student,
      status: form.status,
      date: form.date,
      data: { class: form.className, remarks: form.remarks.trim() },
    });
    setShowModal(false);
    setError("");
    setForm({ student: "", className: "", date: todayIso(), status: "present", remarks: "" });
  }

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: schoolFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Attendance Register</h1>
          <p style={{ margin: 0, fontSize: 13, color: schoolMuted }}>Daily student attendance by class with duplicate-day protection.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Mark Attendance</button>
      </div>

      <div style={{ background: schoolBg, border: `1px solid ${schoolBorder}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Student", "Class", "Date", "Status", "Remarks"].map((head) => (
              <th key={head} style={{ textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${schoolBorder}`, fontSize: 12, color: schoolMuted }}>{head}</th>
            ))}</tr>
          </thead>
          <tbody>
            {attendance.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.student}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>Class {row.className}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.date}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.status}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.remarks || "—"}</td>
              </tr>
            ))}
            {!loading && attendance.length === 0 && <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No attendance records yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 560, background: "#161b27", border: `1px solid ${schoolBorder}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800 }}>Mark Attendance</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Student</label>
                <select value={form.student} onChange={(e) => setForm((prev) => ({ ...prev, student: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }}>
                  <option value="">Select student</option>
                  {students.map((row) => <option key={row.id} value={row.name}>{row.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Class</label>
                <input value={form.className} onChange={(e) => setForm((prev) => ({ ...prev, className: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Status</label>
                <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }}>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="leave">Leave</option>
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Remarks</label>
                <input value={form.remarks} onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }} />
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
