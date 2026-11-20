"use client";
import { useMemo, useState } from "react";
import { api, ErrorLine, today, ui, useApi } from "../../_ui";
type Teacher = { classSubjects: { class: { id: string; name: string; section: string } }[] };
type Student = { id: string; name: string; admissionNo: string; status: string; remark: string };
type Resp = { students: Student[] };

export default function TeacherAttendance() {
  const { data: teacher } = useApi<Teacher | null>("/api/school/teacher-portal", null);
  const classes = useMemo(() => Array.from(new Map((teacher?.classSubjects || []).map((x) => [x.class.id, x.class])).values()), [teacher]);
  const [chosenClassId, setChosenClassId] = useState("");
  const [date, setDate] = useState(today());
  const classId = chosenClassId || classes[0]?.id || "";
  const { data, reload } = useApi<Resp | null>(classId ? `/api/school/teacher-attendance?classId=${classId}&date=${date}` : null, null);
  return <div style={ui.page}>
    <div style={ui.head}><div><h1 style={ui.h1}>Mark Class Attendance</h1><p style={ui.sub}>Only classes assigned to you appear here.</p></div></div>
    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
      <select style={{ ...ui.input, width: 220 }} value={classId} onChange={(e) => setChosenClassId(e.target.value)}><option value="">Choose class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}</select>
      <input type="date" max={today()} style={{ ...ui.input, width: 180 }} value={date} onChange={(e) => setDate(e.target.value)} />
    </div>
    {classId && data && <AttendanceTable key={`${classId}-${date}-${data.students.map((s) => `${s.id}:${s.status}:${s.remark}`).join("|")}`} classId={classId} date={date} initialRows={data.students} onSaved={reload} />}
  </div>;
}
function AttendanceTable({ classId, date, initialRows, onSaved }: { classId: string; date: string; initialRows: Student[]; onSaved: () => Promise<void> }) {
  const [rows, setRows] = useState(initialRows), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const set = (id: string, key: "status" | "remark", value: string) => setRows((old) => old.map((r) => r.id === id ? { ...r, [key]: value } : r));
  const save = async () => { const r = await api<{ saved: number }>("/api/school/teacher-attendance", { method: "POST", body: { classId, date, entries: rows } }); if (!r.ok) return setError(r.error); setError(""); setNotice(`${r.data.saved} attendance records saved.`); void onSaved(); };
  return <><div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><button style={ui.btn} disabled={!rows.length} onClick={save}>Save attendance</button></div><ErrorLine text={error} />{notice && <div style={{ ...ui.card, padding: 12, marginBottom: 12 }}>{notice}</div>}<div style={{ ...ui.card, padding: 0, overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Admission #", "Student", "Status", "Remark"].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead><tbody>{rows.map((s) => <tr key={s.id}><td style={ui.td}>{s.admissionNo}</td><td style={ui.td}>{s.name}</td><td style={ui.td}><select style={{ ...ui.input, width: 130, height: 34, padding: "4px 8px" }} value={s.status} onChange={(e) => set(s.id, "status", e.target.value)}>{["PRESENT", "ABSENT", "LATE", "LEAVE"].map((x) => <option key={x}>{x}</option>)}</select></td><td style={ui.td}><input style={{ ...ui.input, height: 34 }} value={s.remark} onChange={(e) => set(s.id, "remark", e.target.value)} placeholder="Optional" /></td></tr>)}{!rows.length && <tr><td colSpan={4} style={{ ...ui.td, textAlign: "center" }}>No active students in this class.</td></tr>}</tbody></table></div></>;
}
