"use client";
import { useState } from "react";
import { api, ClassRow, ClassSelect, ErrorLine, ui, useApi } from "../_ui";

type Subject = { id: string; name: string; code: string | null; classes: number };
type Teacher = { id: string; name: string; status: string };
type Allocation = { id: string; subject: { id: string; name: string }; teacher: { id: string; name: string } | null };

export default function SubjectsPage() {
  const { data: subjects, reload: reloadSubjects } = useApi<Subject[]>("/api/school/subjects", []);
  const { data: teachers } = useApi<Teacher[]>("/api/school/teachers?status=ACTIVE", []);
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  const [classId, setClassId] = useState("");
  const { data: alloc, reload: reloadAlloc } = useApi<Allocation[]>(classId ? `/api/school/allocations?classId=${classId}` : null, []);
  const [name, setName] = useState(""); const [code, setCode] = useState("");
  const [addSubject, setAddSubject] = useState("");
  const [error, setError] = useState("");

  async function createSubject() {
    const r = await api("/api/school/subjects", { method: "POST", body: { name, code } });
    if (!r.ok) return setError(r.error);
    setName(""); setCode(""); setError(""); void reloadSubjects();
  }
  async function removeSubject(s: Subject) {
    if (!confirm(`Delete ${s.name}? It will be removed from ${s.classes} class(es) and their timetables.`)) return;
    const r = await api(`/api/school/subjects?id=${s.id}`, { method: "DELETE" });
    if (!r.ok) alert(r.error); else { void reloadSubjects(); void reloadAlloc(); }
  }
  async function assign(subjectId: string, teacherId: string) {
    const r = await api("/api/school/allocations", { method: "POST", body: { classId, subjectId, teacherId: teacherId || null } });
    if (!r.ok) return setError(r.error);
    setError(""); setAddSubject(""); void reloadAlloc(); void reloadSubjects();
  }
  async function unassign(id: string) {
    const r = await api(`/api/school/allocations?id=${id}`, { method: "DELETE" });
    if (!r.ok) alert(r.error); else { void reloadAlloc(); void reloadSubjects(); }
  }
  const taken = new Set(alloc.map((a) => a.subject.id));

  return (
    <div style={ui.page}>
      <div style={ui.head}><div><h1 style={ui.h1}>Subjects & Teacher Allocation</h1><p style={ui.sub}>Create subjects, then choose what each class studies and who teaches it</p></div></div>
      <ErrorLine text={error} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 20, alignItems: "start" }}>
        <div style={ui.card}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Subjects</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input style={ui.input} placeholder="Subject name" value={name} onChange={(e) => setName(e.target.value)} />
            <input style={{ ...ui.input, width: 90 }} placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
            <button style={ui.btn} onClick={createSubject}>Add</button>
          </div>
          {subjects.length === 0 && <div style={ui.sub}>No subjects yet.</div>}
          {subjects.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(var(--ink),.06)" }}>
              <span>{s.name}{s.code ? ` · ${s.code}` : ""} <span style={ui.sub}>({s.classes} classes)</span></span>
              <button style={ui.ghost} onClick={() => removeSubject(s)}>Delete</button>
            </div>
          ))}
        </div>

        <div style={ui.card}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Class allocation</div>
          <div style={{ marginBottom: 14 }}><ClassSelect classes={classes} value={classId} onChange={setClassId} /></div>
          {classId && (
            <>
              {alloc.length === 0 && <div style={ui.sub}>No subjects assigned to this class yet.</div>}
              {alloc.map((a) => (
                <div key={a.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(var(--ink),.06)" }}>
                  <span style={{ flex: 1, fontWeight: 600 }}>{a.subject.name}</span>
                  <select style={{ ...ui.input, width: 170 }} value={a.teacher?.id ?? ""} onChange={(e) => assign(a.subject.id, e.target.value)}>
                    <option value="">No teacher</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <button style={ui.ghost} onClick={() => unassign(a.id)}>Remove</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <select style={ui.input} value={addSubject} onChange={(e) => setAddSubject(e.target.value)}>
                  <option value="">Add subject to class…</option>{subjects.filter((s) => !taken.has(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button style={ui.btn} disabled={!addSubject} onClick={() => assign(addSubject, "")}>Add</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
