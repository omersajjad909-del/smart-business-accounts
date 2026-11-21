"use client";
import Link from "next/link";
import { useState } from "react";
import { api, Avatar, Badge, PlanUsage, className, ClassRow, ClassSelect, ui, useApi } from "../_ui";
import { StudentForm, type StudentRecord } from "./_form";

type Student = StudentRecord & { photoUrl: string | null; class: { name: string; section: string } | null };
export default function StudentsPage() {
  const [q, setQ] = useState(""); const [classId, setClassId] = useState(""); const [status, setStatus] = useState("");
  const qs = new URLSearchParams({ ...(q && { q }), ...(classId && { classId }), ...(status && { status }) }).toString();
  const { data: students, loading, reload } = useApi<Student[]>(`/api/school/students?${qs}`, []);
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  const [editing, setEditing] = useState<{ student?: Student } | null>(null);
  const [notice, setNotice] = useState("");
  const [justAdmitted, setJustAdmitted] = useState<{ id: string; name: string; fee: number } | null>(null);

  async function setStudentStatus(id: string, s: string) {
    const r = await api("/api/school/students", { method: "PATCH", body: { id, status: s } });
    if (!r.ok) alert(r.error); else void reload();
  }
  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>Students</h1><p style={ui.sub}>Admissions and student records. Only ACTIVE students are billed and marked.</p></div>
        <div style={{ display: "flex", gap: 10 }}><button style={ui.ghost} onClick={() => (classId ? (window.location.href = `/dashboard/school/print?kind=idcards&classId=${classId}`) : alert("Choose a class in the filter first, then print its ID cards."))}>🪪 ID cards</button><Link href="/dashboard/school/students/promote" style={{ ...ui.ghost, textDecoration: "none" }}>Promote class</Link><button style={ui.btn} onClick={() => setEditing({})}>+ New Admission</button></div>
      </div>
      {justAdmitted && (
        <div style={{ ...ui.card, marginBottom: 14, borderColor: "rgba(34,197,94,.4)", background: "rgba(34,197,94,.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div><b>✓ {justAdmitted.name} admitted.</b> <span style={ui.sub}>Admission fee of Rs {justAdmitted.fee.toLocaleString("en-PK")} is waiting to be collected.</span></div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href={`/dashboard/school/collect?student=${justAdmitted.id}`} style={{ ...ui.btn, textDecoration: "none" }}>💰 Collect fee now</Link>
            <button style={ui.ghost} onClick={() => setJustAdmitted(null)}>Later</button>
          </div>
        </div>
      )}
      <PlanUsage compact />
      {notice && <div style={{ ...ui.card, padding: 12, fontSize: 13, marginBottom: 14 }}>{notice}</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input style={{ ...ui.input, width: 240 }} placeholder="Search name, admission no, guardian" value={q} onChange={(e) => setQ(e.target.value)} />
        <ClassSelect classes={classes} value={classId} onChange={setClassId} allLabel="All classes" />
        {classId && <button style={ui.ghost} onClick={async () => { if (!confirm("Give every active student of this class a new roll number, A–Z by name? Existing roll numbers in the class are replaced.")) return; const r = await api<{ assigned: number }>("/api/school/students/rollnos", { method: "POST", body: { classId, order: "name" } }); setNotice(r.ok ? `Roll numbers 1–${r.data.assigned} assigned alphabetically.` : r.error); void reload(); }}>🔢 Assign roll numbers (A–Z)</button>}
        <select style={{ ...ui.input, width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>{["ACTIVE", "APPLICANT", "LEFT", "GRADUATED"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Adm #", "Roll #", "Name", "Class", "Guardian", "Phone", "Status", ""].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!loading && students.length === 0 && <tr><td colSpan={8} style={{ ...ui.td, textAlign: "center", padding: 32 }}>No students found.</td></tr>}
            {students.map((s) => (
              <tr key={s.id}>
                <td style={{ ...ui.td, fontWeight: 700 }}>{s.admissionNo}</td><td style={ui.td}>{s.rollNo || "—"}</td><td style={{ ...ui.td, fontWeight: 600 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Avatar url={s.photoUrl} name={s.name} /><Link href={`/dashboard/school/students/${s.id}`} style={{ color: "inherit" }}>{s.name}</Link></span></td>
                <td style={ui.td}>{className(s.class)}</td><td style={ui.td}>{s.guardianName || "—"}</td><td style={ui.td}>{s.phone || "—"}</td>
                <td style={ui.td}><Badge value={s.status} /></td>
                <td style={{ ...ui.td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <button style={ui.ghost} onClick={() => setEditing({ student: s })}>Edit</button>{" "}
                  {s.status === "APPLICANT" && <button style={ui.ghost} onClick={() => setStudentStatus(s.id, "ACTIVE")}>Confirm</button>}
                  {s.status === "ACTIVE" && <button style={ui.ghost} onClick={() => confirm(`Mark ${s.name} as left?`) && setStudentStatus(s.id, "LEFT")}>Mark left</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <StudentForm student={editing.student} classes={classes} onClose={() => setEditing(null)} onSaved={(r) => {
          setEditing(null); setNotice(r.note ?? (r.created ? "" : `${r.name} updated.`));
          setJustAdmitted(r.created && r.admissionFee > 0 ? { id: r.id, name: r.name, fee: r.admissionFee } : null); void reload();
        }} />
      )}
    </div>
  );
}
