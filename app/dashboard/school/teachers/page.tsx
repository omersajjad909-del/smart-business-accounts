"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapTeacherRecords, schoolBg, schoolBorder, schoolFont, schoolMuted } from "../_shared";

export default function SchoolTeachersPage() {
  const teacherStore = useBusinessRecords("school_teacher");
  const { records, loading, create } = teacherStore;
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", subject: "", classes: "", phone: "", room: "" });

  const teachers = useMemo(() => mapTeacherRecords(records), [records]);

  async function save() {
    if (!form.name.trim() || !form.subject.trim() || !form.classes.trim()) {
      setError("Teacher name, subject, and classes are required.");
      return;
    }
    if (teachers.some((row) => row.name.toLowerCase() === form.name.trim().toLowerCase() && row.subject.toLowerCase() === form.subject.trim().toLowerCase())) {
      setError("This teacher/subject combination already exists.");
      return;
    }
    await create({
      title: form.name.trim(),
      status: "active",
      data: { subject: form.subject.trim(), classes: form.classes.trim(), phone: form.phone.trim(), room: form.room.trim() },
    });
    setShowModal(false);
    setError("");
    setForm({ name: "", subject: "", classes: "", phone: "", room: "" });
  }

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: schoolFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Teachers & Rooms</h1>
          <p style={{ margin: 0, fontSize: 13, color: schoolMuted }}>Teacher roster, subject ownership, classroom assignments, and contact desk.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Add Teacher</button>
      </div>

      <div style={{ background: schoolBg, border: `1px solid ${schoolBorder}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Teacher", "Subject", "Classes", "Phone", "Room", "Status"].map((head) => (
              <th key={head} style={{ textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${schoolBorder}`, fontSize: 12, color: schoolMuted }}>{head}</th>
            ))}</tr>
          </thead>
          <tbody>
            {teachers.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.name}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.subject}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.classes}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.phone || "—"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.room || "—"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{row.status}</td>
              </tr>
            ))}
            {!loading && teachers.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No teachers yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 560, background: "#161b27", border: `1px solid ${schoolBorder}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 800 }}>Add Teacher</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Teacher Name</label>
                <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Subject</label>
                <input value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Classes</label>
                <input value={form.classes} onChange={(e) => setForm((prev) => ({ ...prev, classes: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Phone</label>
                <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: schoolMuted }}>Room</label>
                <input value={form.room} onChange={(e) => setForm((prev) => ({ ...prev, room: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "#111827", border: `1px solid ${schoolBorder}`, borderRadius: 8, color: "#fff" }} />
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
