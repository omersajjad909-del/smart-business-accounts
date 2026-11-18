"use client";
import Link from "next/link";
import { useState } from "react";
import { api, Badge, className, ClassRow, ClassSelect, ErrorLine, Field, Modal, today, ui, useApi } from "../_ui";

type Student = { id: string; admissionNo: string; name: string; guardianName: string | null; phone: string | null; status: string; discount: number; class: { name: string; section: string } | null; classId: string | null };
const blank = { name: "", guardianName: "", phone: "", classId: "", gender: "", dob: "", admissionDate: today(), discount: "", status: "ACTIVE" };

export default function StudentsPage() {
  const [q, setQ] = useState(""); const [classId, setClassId] = useState(""); const [status, setStatus] = useState("");
  const qs = new URLSearchParams({ ...(q && { q }), ...(classId && { classId }), ...(status && { status }) }).toString();
  const { data: students, loading, reload } = useApi<Student[]>(`/api/school/students?${qs}`, []);
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");

  async function save() {
    const r = await api("/api/school/students", { method: "POST", body: { ...form, discount: Number(form.discount || 0) } });
    if (!r.ok) return setError(r.error);
    setOpen(false); setError(""); setForm(blank); void reload();
  }
  async function setStudentStatus(id: string, s: string) {
    const r = await api("/api/school/students", { method: "PATCH", body: { id, status: s } });
    if (!r.ok) alert(r.error); else void reload();
  }
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>Students</h1><p style={ui.sub}>Admissions and student records. Only ACTIVE students are billed and marked.</p></div>
        <div style={{ display: "flex", gap: 10 }}><Link href="/dashboard/school/students/promote" style={{ ...ui.ghost, textDecoration: "none" }}>Promote class</Link><button style={ui.btn} onClick={() => setOpen(true)}>+ New Admission</button></div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input style={{ ...ui.input, width: 240 }} placeholder="Search name, admission no, guardian" value={q} onChange={(e) => setQ(e.target.value)} />
        <ClassSelect classes={classes} value={classId} onChange={setClassId} allLabel="All classes" />
        <select style={{ ...ui.input, width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>{["ACTIVE", "APPLICANT", "LEFT", "GRADUATED"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Adm #", "Name", "Class", "Guardian", "Phone", "Status", ""].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!loading && students.length === 0 && <tr><td colSpan={7} style={{ ...ui.td, textAlign: "center", padding: 32 }}>No students found.</td></tr>}
            {students.map((s) => (
              <tr key={s.id}>
                <td style={{ ...ui.td, fontWeight: 700 }}>{s.admissionNo}</td><td style={{ ...ui.td, fontWeight: 600 }}><Link href={`/dashboard/school/students/${s.id}`} style={{ color: "inherit" }}>{s.name}</Link></td>
                <td style={ui.td}>{className(s.class)}</td><td style={ui.td}>{s.guardianName || "—"}</td><td style={ui.td}>{s.phone || "—"}</td>
                <td style={ui.td}><Badge value={s.status} /></td>
                <td style={{ ...ui.td, textAlign: "right" }}>
                  {s.status === "APPLICANT" && <button style={ui.ghost} onClick={() => setStudentStatus(s.id, "ACTIVE")}>Confirm</button>}
                  {s.status === "ACTIVE" && <button style={ui.ghost} onClick={() => confirm(`Mark ${s.name} as left?`) && setStudentStatus(s.id, "LEFT")}>Mark left</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal title="New Admission" onClose={() => setOpen(false)}>
          <ErrorLine text={error} />
          <Field label="Student name"><input style={ui.input} value={form.name} onChange={set("name")} /></Field>
          <Field label="Class"><ClassSelect classes={classes} value={form.classId} onChange={(v) => setForm({ ...form, classId: v })} /></Field>
          <Field label="Guardian"><input style={ui.input} value={form.guardianName} onChange={set("guardianName")} /></Field>
          <Field label="Phone"><input style={ui.input} value={form.phone} onChange={set("phone")} placeholder="03XX-XXXXXXX" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Date of birth"><input style={ui.input} type="date" value={form.dob} onChange={set("dob")} /></Field>
            <Field label="Admission date"><input style={ui.input} type="date" value={form.admissionDate} onChange={set("admissionDate")} /></Field>
            <Field label="Monthly discount"><input style={ui.input} type="number" min={0} value={form.discount} onChange={set("discount")} /></Field>
            <Field label="Status"><select style={ui.input} value={form.status} onChange={set("status")}><option>ACTIVE</option><option>APPLICANT</option></select></Field>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button style={ui.ghost} onClick={() => setOpen(false)}>Cancel</button><button style={ui.btn} onClick={save}>Admit</button></div>
        </Modal>
      )}
    </div>
  );
}
