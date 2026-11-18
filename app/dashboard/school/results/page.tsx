"use client";
import { useEffect, useState } from "react";
import { api, Badge, ClassRow, ClassSelect, className, ErrorLine, Field, Modal, Stat, ui, useApi } from "../_ui";

type Exam = { id: string; name: string; subject: string; totalMarks: number; passMarks: number; class: { name: string; section: string }; resultsEntered: number };
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
  const [form, setForm] = useState({ classId: "", name: "", subject: "", totalMarks: "100", passMarks: "33" });
  const [error, setError] = useState(""); const [msg, setMsg] = useState("");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMarks(Object.fromEntries((detail?.rows ?? []).map((r) => [r.id, r.marks === null ? "" : String(r.marks)]))); }, [detail]);

  async function createExam() {
    const r = await api("/api/school/results", { method: "POST", body: { action: "exam", ...form, totalMarks: Number(form.totalMarks), passMarks: Number(form.passMarks) } });
    if (!r.ok) return setError(r.error);
    setOpen(false); setError(""); void reloadExams();
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
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <select style={{ ...ui.input, width: "auto", minWidth: 280 }} value={examId} onChange={(e) => { setExamId(e.target.value); setMsg(""); }}>
          <option value="">Select exam</option>
          {exams.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.subject} ({className(x.class)}) · {x.resultsEntered} entered</option>)}
        </select>
      </div>
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
          <Field label="Subject"><input style={ui.input} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
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
