"use client";
import { useState } from "react";
import { api, Badge, className, ErrorLine, Field, Modal, today, ui, useApi } from "../_ui";

type Teacher = {
  id: string; employeeNo: string; name: string; phone: string | null; email: string | null; qualification: string | null; status: string; joiningDate: string;
  classSubjects: { class: { name: string; section: string }; subject: { name: string } }[];
};
const blank = { name: "", phone: "", email: "", qualification: "", joiningDate: today() };

export default function TeachersPage() {
  const { data: teachers, loading, reload } = useApi<Teacher[]>("/api/school/teachers", []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    const r = await api("/api/school/teachers", { method: "POST", body: form });
    if (!r.ok) return setError(r.error);
    setOpen(false); setError(""); setForm(blank); void reload();
  }
  async function setStatus(id: string, status: string) {
    const r = await api("/api/school/teachers", { method: "PATCH", body: { id, status } });
    if (!r.ok) alert(r.error); else void reload();
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>Teachers</h1><p style={ui.sub}>Teaching staff and the classes and subjects they handle</p></div>
        <button style={ui.btn} onClick={() => setOpen(true)}>+ Add Teacher</button>
      </div>
      <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Emp #", "Name", "Qualification", "Phone", "Teaches", "Status", ""].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!loading && teachers.length === 0 && <tr><td colSpan={7} style={{ ...ui.td, textAlign: "center", padding: 32 }}>No teachers yet.</td></tr>}
            {teachers.map((t) => (
              <tr key={t.id}>
                <td style={{ ...ui.td, fontWeight: 700 }}>{t.employeeNo}</td><td style={{ ...ui.td, fontWeight: 600 }}>{t.name}</td>
                <td style={ui.td}>{t.qualification || "—"}</td><td style={ui.td}>{t.phone || "—"}</td>
                <td style={{ ...ui.td, maxWidth: 280 }}>{t.classSubjects.length ? t.classSubjects.map((c) => `${c.subject.name} (${className(c.class)})`).join(", ") : "Not assigned"}</td>
                <td style={ui.td}><Badge value={t.status} /></td>
                <td style={{ ...ui.td, textAlign: "right" }}>
                  {t.status === "ACTIVE" ? <button style={ui.ghost} onClick={() => confirm(`Mark ${t.name} as left?`) && setStatus(t.id, "LEFT")}>Mark left</button> : <button style={ui.ghost} onClick={() => setStatus(t.id, "ACTIVE")}>Reactivate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal title="Add Teacher" onClose={() => setOpen(false)}>
          <ErrorLine text={error} />
          <Field label="Full name"><input style={ui.input} value={form.name} onChange={set("name")} /></Field>
          <Field label="Qualification"><input style={ui.input} value={form.qualification} onChange={set("qualification")} placeholder="M.Sc Mathematics, B.Ed" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Phone"><input style={ui.input} value={form.phone} onChange={set("phone")} /></Field>
            <Field label="Email"><input style={ui.input} type="email" value={form.email} onChange={set("email")} /></Field>
          </div>
          <Field label="Joining date"><input style={ui.input} type="date" value={form.joiningDate} onChange={set("joiningDate")} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button style={ui.ghost} onClick={() => setOpen(false)}>Cancel</button><button style={ui.btn} onClick={save}>Save</button></div>
        </Modal>
      )}
    </div>
  );
}
