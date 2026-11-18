"use client";
import Link from "next/link";
import { useState } from "react";
import { api, ClassRow, className, ErrorLine, Guide, StepTitle, ui, useApi } from "../_ui";

type Subject = { id: string; name: string; code: string | null; classes: number };
type Teacher = { id: string; name: string; qualification: string | null };
type Allocation = { id: string; subject: { id: string; name: string }; teacher: { id: string; name: string } | null };

export default function SubjectsPage() {
  const { data: subjects, reload: reloadSubjects } = useApi<Subject[]>("/api/school/subjects", []);
  const { data: teachers } = useApi<Teacher[]>("/api/school/teachers?status=ACTIVE", []);
  const { data: classes, reload: reloadClasses } = useApi<ClassRow[]>("/api/school/classes", []);
  const [classId, setClassId] = useState("");
  const { data: alloc, reload: reloadAlloc } = useApi<Allocation[]>(classId ? `/api/school/allocations?classId=${classId}` : null, []);
  const [name, setName] = useState("");
  const [toAdd, setToAdd] = useState<string[]>([]);
  const [copyFrom, setCopyFrom] = useState("");
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");

  const cls = classes.find((c) => c.id === classId);
  const taken = new Set(alloc.map((a) => a.subject.id));
  const available = subjects.filter((s) => !taken.has(s.id));
  const unassigned = alloc.filter((a) => !a.teacher).length;

  const refresh = () => { void reloadSubjects(); void reloadAlloc(); void reloadClasses(); };

  async function seed() {
    const r = await api<{ created: number }>("/api/school/subjects", { method: "POST", body: { action: "seed" } });
    setNotice(r.ok ? `${r.data.created} common subjects added.` : r.error); void reloadSubjects();
  }
  async function createSubject() {
    const r = await api("/api/school/subjects", { method: "POST", body: { name } });
    if (!r.ok) return setError(r.error);
    setName(""); setError(""); void reloadSubjects();
  }
  async function removeSubject(s: Subject) {
    if (!confirm(`Delete ${s.name}?${s.classes ? ` It is taught in ${s.classes} class(es) and will be removed from them and their timetables.` : ""}`)) return;
    const r = await api(`/api/school/subjects?id=${s.id}`, { method: "DELETE" });
    if (!r.ok) setError(r.error); else refresh();
  }
  async function addSelected() {
    const r = await api<{ added: number }>("/api/school/allocations", { method: "POST", body: { action: "bulk", classId, subjectIds: toAdd } });
    if (!r.ok) return setError(r.error);
    setToAdd([]); setError(""); setNotice(`${r.data.added} subject(s) added to ${className(cls)}. Now choose a teacher for each.`); refresh();
  }
  async function copy() {
    const r = await api<{ added: number }>("/api/school/allocations", { method: "POST", body: { action: "copy", classId, fromClassId: copyFrom } });
    if (!r.ok) return setError(r.error);
    setCopyFrom(""); setError(""); setNotice(`${r.data.added} subject(s) copied.`); refresh();
  }
  async function assign(subjectId: string, teacherId: string) {
    const r = await api("/api/school/allocations", { method: "POST", body: { classId, subjectId, teacherId: teacherId || null } });
    if (!r.ok) return setError(r.error);
    setError(""); void reloadAlloc();
  }
  async function unassign(id: string) {
    const r = await api(`/api/school/allocations?id=${id}`, { method: "DELETE" });
    if (!r.ok) setError(r.error); else refresh();
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}><div><h1 style={ui.h1}>Subjects &amp; Teachers</h1><p style={ui.sub}>Decide which subjects each class studies, and which teacher takes each one</p></div></div>

      <Guide
        title="How this page works"
        steps={["Add the subjects your school teaches (Step 1).", "Make sure your teachers are added (Step 2) — a subject can only be given to a teacher who exists.", "Pick a class, add its subjects, then choose the teacher for each subject (Step 3)."]}
        note="Example: Class 9 - A studies Mathematics, and Mr. Ahmed is the Mathematics teacher for Class 9 - A. The timetable uses this to know who teaches each period."
      />
      {notice && <div style={{ ...ui.card, padding: 12, fontSize: 13, marginBottom: 16 }}>{notice}</div>}
      <ErrorLine text={error} />

      {/* Step 1 */}
      <div style={{ ...ui.card, marginBottom: 20 }}>
        <StepTitle n={1} title="Subjects your school teaches" hint="Create each subject once here. You choose which classes study it in Step 3." done={subjects.length > 0} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <input style={{ ...ui.input, maxWidth: 280 }} placeholder="Subject name, e.g. Mathematics" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && createSubject()} />
          <button style={ui.btn} disabled={!name.trim()} onClick={createSubject}>Add subject</button>
          <button style={ui.ghost} onClick={seed}>Add common subjects</button>
        </div>
        {subjects.length === 0 ? <div style={ui.sub}>No subjects yet. Click &quot;Add common subjects&quot; to get English, Urdu, Maths, Science, Islamiat and more in one go.</div> : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {subjects.map((s) => (
              <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 6px 6px 12px", borderRadius: 20, background: "rgba(99,102,241,.14)", fontSize: 13 }}>
                {s.name}<span style={{ fontSize: 11, opacity: 0.6 }}>{s.classes} class{s.classes === 1 ? "" : "es"}</span>
                <button onClick={() => removeSubject(s)} aria-label={`Delete ${s.name}`} style={{ border: "none", background: "rgba(var(--ink),.1)", color: "inherit", width: 20, height: 20, borderRadius: "50%", cursor: "pointer", lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Step 2 */}
      <div style={{ ...ui.card, marginBottom: 20 }}>
        <StepTitle n={2} title="Your teachers" hint="These are the people you can choose from in Step 3." done={teachers.length > 0} />
        {teachers.length === 0 ? (
          <div style={{ padding: 14, borderRadius: 10, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.35)" }}>
            <strong>No teachers added yet.</strong> <span style={{ fontSize: 13 }}>You need to add your teachers before you can give them subjects.</span>
            <div style={{ marginTop: 10 }}><Link href="/dashboard/school/teachers" style={{ ...ui.btn, textDecoration: "none", display: "inline-block" }}>+ Add teachers</Link></div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {teachers.map((t) => <span key={t.id} style={{ padding: "6px 12px", borderRadius: 20, background: "rgba(34,197,94,.14)", fontSize: 13 }}>{t.name}{t.qualification ? ` · ${t.qualification}` : ""}</span>)}
            </div>
            <Link href="/dashboard/school/teachers" style={{ fontSize: 13, color: "#818cf8" }}>Add or edit teachers →</Link>
          </div>
        )}
      </div>

      {/* Step 3 */}
      <div style={{ ...ui.card }}>
        <StepTitle n={3} title="Choose a class and set its subjects and teachers" hint="Select a class, add the subjects it studies, then pick a teacher for each." done={Boolean(classId) && alloc.length > 0 && unassigned === 0} />
        {classes.length === 0 ? (
          <div style={ui.sub}>You have no classes yet. <Link href="/dashboard/school/classes" style={{ color: "#818cf8" }}>Add your classes first →</Link></div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            {classes.map((c) => (
              <button key={c.id} onClick={() => { setClassId(c.id); setToAdd([]); setNotice(""); setError(""); }} style={{ padding: "10px 16px", borderRadius: 12, cursor: "pointer", color: "inherit", border: c.id === classId ? "2px solid #6366f1" : "1px solid rgba(var(--ink),.14)", background: c.id === classId ? "rgba(99,102,241,.14)" : "rgba(var(--ink),.03)", fontWeight: 600 }}>{className(c)}</button>
            ))}
          </div>
        )}

        {classId && (
          <>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{className(cls)} — subjects &amp; teachers</div>
            <div style={{ ...ui.sub, marginBottom: 12 }}>
              {alloc.length === 0 ? "No subjects yet for this class." : `${alloc.length} subject${alloc.length === 1 ? "" : "s"}${unassigned ? ` · ${unassigned} still need a teacher` : " · all have a teacher ✓"}`}
            </div>

            {alloc.length > 0 && (
              <div style={{ overflowX: "auto", marginBottom: 18, border: "1px solid rgba(var(--ink),.08)", borderRadius: 12 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["Subject", "Teacher", ""].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {alloc.map((a) => (
                      <tr key={a.id}>
                        <td style={{ ...ui.td, fontWeight: 600 }}>{a.subject.name}</td>
                        <td style={ui.td}>
                          {teachers.length === 0 ? <span style={{ color: "#fbbf24", fontSize: 13 }}>Add teachers first (Step 2)</span> : (
                            <select style={{ ...ui.input, maxWidth: 260, borderColor: a.teacher ? undefined : "rgba(251,191,36,.6)" }} value={a.teacher?.id ?? ""} onChange={(e) => assign(a.subject.id, e.target.value)}>
                              <option value="">⚠ Not assigned — choose teacher</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          )}
                        </td>
                        <td style={{ ...ui.td, textAlign: "right" }}><button style={ui.ghost} onClick={() => unassign(a.id)}>Remove from class</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ padding: 14, borderRadius: 12, background: "rgba(var(--ink),.03)", border: "1px dashed rgba(var(--ink),.18)" }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Add subjects to {className(cls)}</div>
              {subjects.length === 0 ? <div style={ui.sub}>Create subjects in Step 1 first.</div> : available.length === 0 ? <div style={ui.sub}>All your subjects are already in this class.</div> : (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    {available.map((s) => {
                      const on = toAdd.includes(s.id);
                      return <button key={s.id} onClick={() => setToAdd(on ? toAdd.filter((x) => x !== s.id) : [...toAdd, s.id])} style={{ padding: "6px 14px", borderRadius: 20, cursor: "pointer", color: "inherit", fontSize: 13, border: on ? "2px solid #6366f1" : "1px solid rgba(var(--ink),.2)", background: on ? "rgba(99,102,241,.18)" : "transparent" }}>{on ? "✓ " : "+ "}{s.name}</button>;
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button style={ui.btn} disabled={toAdd.length === 0} onClick={addSelected}>Add {toAdd.length || ""} selected</button>
                    <button style={ui.ghost} onClick={() => setToAdd(available.map((s) => s.id))}>Select all</button>
                  </div>
                </>
              )}
              {classes.length > 1 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(var(--ink),.08)" }}>
                  <span style={{ fontSize: 13 }}>Or copy subjects and teachers from</span>
                  <select style={{ ...ui.input, width: "auto", minWidth: 150 }} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                    <option value="">Choose class</option>{classes.filter((c) => c.id !== classId).map((c) => <option key={c.id} value={c.id}>{className(c)}</option>)}
                  </select>
                  <button style={ui.ghost} disabled={!copyFrom} onClick={copy}>Copy</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
