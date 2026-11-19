"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Badge, ClassRow, ClassSelect, className, ErrorLine, Field, Modal, Stat, ui, useApi, Guide } from "../_ui";

type Exam = { id: string; name: string; subject: string; date: string | null; totalMarks: number; passMarks: number; class: { name: string; section: string }; resultsEntered: number };
type Detail = {
  exam: Exam; rows: { id: string; name: string; admissionNo: string; marks: number | null; passed: boolean | null; percent: number | null }[];
  summary: { entered: number; total: number; passed: number; passRate: number };
};

export default function ResultsPage() {
  const { data: exams, reload: reloadExams } = useApi<Exam[]>("/api/school/results", []);
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  const [examId, setExamId] = useState("");
  const { data: detail, reload } = useApi<Detail | null>(examId ? `/api/school/results?examId=${examId}` : null, null);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ classId: "", name: "", subjects: [] as string[], date: "", totalMarks: "100", passMarks: "33" });
  const { data: classSubjects, loading: subjectsLoading } = useApi<{ subject: { id: string; name: string } }[]>(form.classId ? `/api/school/allocations?classId=${form.classId}` : null, []);
  const subjectNames = form.classId ? classSubjects.map((c) => c.subject.name) : [];
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setForm((f) => ({ ...f, subjects: [] })); }, [form.classId]);
  const toggleSubject = (n: string) => setForm((f) => ({ ...f, subjects: f.subjects.includes(n) ? f.subjects.filter((x) => x !== n) : [...f.subjects, n] }));
  const [error, setError] = useState(""); const [msg, setMsg] = useState("");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMarks(Object.fromEntries((detail?.rows ?? []).map((r) => [r.id, r.marks === null ? "" : String(r.marks)]))); }, [detail]);

  async function createExam() {
    if (!form.classId) return setError("Select a class first");
    if (!form.name.trim()) return setError("Enter the exam name, e.g. Mid Term 2026");
    if (form.subjects.length === 0) return setError("Select at least one subject");
    const r = await api<{ created: number; skipped: number }>("/api/school/results", { method: "POST", body: { action: "exam", classId: form.classId, name: form.name, subjects: form.subjects, date: form.date, totalMarks: Number(form.totalMarks), passMarks: Number(form.passMarks) } });
    if (!r.ok) return setError(r.error);
    setOpen(false); setError("");
    setMsg(`${r.data.created} exam${r.data.created === 1 ? "" : "s"} created${r.data.skipped ? ` (${r.data.skipped} already existed)` : ""}. Select one from the list to enter marks.`);
    setForm({ classId: "", name: "", subjects: [], date: "", totalMarks: "100", passMarks: "33" });
    void reloadExams();
  }
  async function removeExam() {
    const x = exams.find((e) => e.id === examId);
    if (!x || !confirm(`Delete "${x.name} — ${x.subject}" and all ${x.resultsEntered} mark(s) entered for it? This cannot be undone.`)) return;
    const r = await api(`/api/school/results?id=${examId}`, { method: "DELETE" });
    if (!r.ok) return setError(r.error);
    setExamId(""); setError(""); setMsg("Exam deleted."); void reloadExams();
  }
  async function saveMarks() {
    const entries = Object.entries(marks).filter(([, v]) => v !== "").map(([studentId, v]) => ({ studentId, marks: Number(v) }));
    const r = await api<{ saved: number }>("/api/school/results", { method: "POST", body: { action: "marks", examId, entries } });
    if (!r.ok) return setError(r.error);
    setError(""); setMsg(`Saved ${r.data.saved} results.`); void reload(); void reloadExams();
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>Exams & Results</h1><p style={ui.sub}>Create an exam per class and subject, then enter marks</p></div>
        <button style={ui.btn} onClick={() => setOpen(true)}>+ New Exam</button>
      </div>
      <Guide title="How exams and results work" steps={["Click New Exam and choose the class, exam name (e.g. Mid Term) and subject, with total and pass marks.", "Select the exam from the list and type each student's marks.", "Press Save marks. Pass rate updates, and grades show on each student's report card."]} note="Create one exam entry per subject. Students appear automatically from the class." />
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <select style={{ ...ui.input, width: "auto", minWidth: 280 }} value={examId} onChange={(e) => { setExamId(e.target.value); setMsg(""); }}>
          <option value="">Select exam</option>
          {exams.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.subject} ({className(x.class)}){x.date ? ` · ${x.date.slice(0, 10)}` : ""} · {x.resultsEntered} entered</option>)}
        </select>
        {examId && <button style={ui.ghost} onClick={removeExam}>Delete exam</button>}
      </div>
      {!detail && msg && <div style={{ ...ui.card, padding: 12, fontSize: 13, marginBottom: 14 }}>{msg}</div>}
      <ErrorLine text={error} />
      {detail && (
        <>
          <div style={ui.grid}>
            <Stat label="Marks entered" value={`${detail.summary.entered}/${detail.summary.total}`} />
            <Stat label="Pass rate" value={`${detail.summary.passRate}%`} hint={`${detail.summary.passed} passed (≥ ${detail.exam.passMarks}/${detail.exam.totalMarks})`} />
          </div>
          <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Adm #", "Student", `Marks / ${detail.exam.totalMarks}`, "%", "Result"].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
              <tbody>
                {detail.rows.map((r) => {
                  const v = marks[r.id] ?? ""; const n = Number(v);
                  const pass = v === "" ? null : n >= detail.exam.passMarks;
                  return (
                    <tr key={r.id}>
                      <td style={ui.td}>{r.admissionNo}</td><td style={{ ...ui.td, fontWeight: 600 }}>{r.name}</td>
                      <td style={ui.td}><input style={{ ...ui.input, width: 90 }} type="number" min={0} max={detail.exam.totalMarks} value={v} onChange={(e) => setMarks({ ...marks, [r.id]: e.target.value })} /></td>
                      <td style={ui.td}>{v === "" ? "—" : `${Math.round((n / detail.exam.totalMarks) * 1000) / 10}%`}</td>
                      <td style={ui.td}>{pass === null ? "—" : <Badge value={pass ? "PASS" : "FAIL"} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}><button style={ui.btn} onClick={saveMarks}>Save marks</button>{msg && <span style={{ color: "#4ade80", fontSize: 13 }}>{msg}</span>}</div>
        </>
      )}
      {open && (
        <Modal title="New Exam" onClose={() => setOpen(false)}>
          <ErrorLine text={error} />
          <Field label="Class"><ClassSelect classes={classes} value={form.classId} onChange={(v) => setForm({ ...form, classId: v })} /></Field>
          <Field label="Exam name"><input style={ui.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mid Term 2026" /></Field>
          <Field label="Subjects">
            {!form.classId ? <div style={{ fontSize: 13, color: "rgba(var(--ink),.5)" }}>Select a class to see its subjects.</div>
              : subjectsLoading ? <div style={{ fontSize: 13, color: "rgba(var(--ink),.5)" }}>Loading subjects…</div>
              : subjectNames.length === 0 ? <div style={{ fontSize: 13, color: "#fbbf24" }}>No subjects are assigned to this class yet. <Link href="/dashboard/school/subjects" style={{ color: "#a5b4fc" }}>Add subjects to the class</Link> first.</div>
              : (
                <div>
                  <button type="button" style={{ ...ui.ghost, marginBottom: 8 }} onClick={() => setForm({ ...form, subjects: form.subjects.length === subjectNames.length ? [] : subjectNames })}>
                    {form.subjects.length === subjectNames.length ? "Clear all" : "Select all subjects"}
                  </button>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {subjectNames.map((n) => {
                      const on = form.subjects.includes(n);
                      return <button type="button" key={n} onClick={() => toggleSubject(n)} style={{ ...ui.ghost, border: `1px solid ${on ? "#8b5cf6" : "transparent"}`, background: on ? "rgba(139,92,246,.22)" : undefined, fontWeight: on ? 600 : 400 }}>{on ? "✓ " : ""}{n}</button>;
                    })}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(var(--ink),.45)", marginTop: 8 }}>One exam is created for each selected subject.</div>
                </div>
              )}
          </Field>
          <Field label="Exam date (optional)"><input style={ui.input} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Total marks"><input style={ui.input} type="number" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })} /></Field>
            <Field label="Pass marks"><input style={ui.input} type="number" value={form.passMarks} onChange={(e) => setForm({ ...form, passMarks: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button style={ui.ghost} onClick={() => setOpen(false)}>Cancel</button><button style={ui.btn} onClick={createExam}>Create</button></div>
        </Modal>
      )}
    </div>
  );
}
