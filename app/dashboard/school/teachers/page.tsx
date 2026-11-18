"use client";
import Link from "next/link";
import { useState } from "react";
import { api, Avatar, Badge, className, Guide, ui, useApi } from "../_ui";
import { EMPLOYMENT, TeacherForm, type TeacherRecord } from "./_form";

type Teacher = TeacherRecord & { employeeNo: string; status: string; classSubjects: { class: { name: string; section: string }; subject: { name: string } }[] };

export default function TeachersPage() {
  const { data: teachers, loading, reload } = useApi<Teacher[]>("/api/school/teachers", []);
  const [form, setForm] = useState<{ teacher?: Teacher } | null>(null);
  const [notice, setNotice] = useState("");
  const [q, setQ] = useState("");
  const shown = teachers.filter((t) => !q || `${t.name} ${t.employeeNo} ${t.designation ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  async function setStatus(id: string, status: string) {
    const r = await api("/api/school/teachers", { method: "PATCH", body: { id, status } });
    if (!r.ok) alert(r.error); else void reload();
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>Teachers</h1><p style={ui.sub}>Teaching staff — profile, job details, documents and the classes they take</p></div>
        <button style={ui.btn} onClick={() => setForm({})}>+ Add Teacher</button>
      </div>
      <Guide title="How teachers work" steps={["Add each teacher with their details and documents.", "Go to Subjects & Teachers to give each one their subjects and classes.", "The timetable then shows who teaches every period, and a teacher can never be in two classes at once."]} note="Salaries are paid from the Salaries / Employees section — the salary here is for your reference." />
      {notice && <div style={{ ...ui.card, padding: 12, fontSize: 13, marginBottom: 14 }}>{notice}</div>}
      <input style={{ ...ui.input, width: 280, marginBottom: 14 }} placeholder="Search name, emp # or designation" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Emp #", "Teacher", "Designation", "Type", "Phone", "Teaches", "Status", ""].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!loading && shown.length === 0 && <tr><td colSpan={8} style={{ ...ui.td, textAlign: "center", padding: 32 }}>{teachers.length ? "No teachers match." : "No teachers yet. Click “+ Add Teacher” to add your first one."}</td></tr>}
            {shown.map((t) => (
              <tr key={t.id}>
                <td style={{ ...ui.td, fontWeight: 700 }}>{t.employeeNo}</td>
                <td style={{ ...ui.td, fontWeight: 600 }}><span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}><Avatar url={t.photoUrl} name={t.name} /><Link href={`/dashboard/school/teachers/${t.id}`} style={{ color: "inherit" }}>{t.name}</Link></span></td>
                <td style={ui.td}>{t.designation || "—"}</td><td style={ui.td}>{t.employmentType ? EMPLOYMENT[t.employmentType] : "—"}</td><td style={ui.td}>{t.phone || "—"}</td>
                <td style={{ ...ui.td, maxWidth: 260, fontSize: 12.5 }}>{t.classSubjects.length ? t.classSubjects.map((c) => `${c.subject.name} (${className(c.class)})`).join(", ") : <span style={{ color: "#fbbf24" }}>Not assigned yet</span>}</td>
                <td style={ui.td}><Badge value={t.status} /></td>
                <td style={{ ...ui.td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <button style={ui.ghost} onClick={() => setForm({ teacher: t })}>Edit</button>{" "}
                  {t.status === "ACTIVE" ? <button style={ui.ghost} onClick={() => confirm(`Mark ${t.name} as left?`) && setStatus(t.id, "LEFT")}>Mark left</button> : <button style={ui.ghost} onClick={() => setStatus(t.id, "ACTIVE")}>Reactivate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && <TeacherForm teacher={form.teacher} onClose={() => setForm(null)} onSaved={(note) => { setForm(null); setNotice(note ?? ""); void reload(); }} />}
    </div>
  );
}
