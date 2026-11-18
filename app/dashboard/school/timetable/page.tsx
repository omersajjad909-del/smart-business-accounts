"use client";
import { useState } from "react";
import { api, ClassRow, ClassSelect, ErrorLine, Field, Modal, ui, useApi, Guide } from "../_ui";

type Entry = { id: string; day: number; periodNo: number; startTime: string; endTime: string; subject: { name: string }; teacher: { name: string } | null };
type Allocation = { subject: { id: string; name: string }; teacher: { id: string; name: string } | null };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TimetablePage() {
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  const [classId, setClassId] = useState("");
  const { data: entries, reload } = useApi<Entry[]>(classId ? `/api/school/timetable?classId=${classId}` : null, []);
  const { data: alloc } = useApi<Allocation[]>(classId ? `/api/school/allocations?classId=${classId}` : null, []);
  const [cell, setCell] = useState<{ day: number; periodNo: number; existing?: Entry } | null>(null);
  const [form, setForm] = useState({ subjectId: "", startTime: "08:00", endTime: "08:40" });
  const [error, setError] = useState("");

  const at = (day: number, p: number) => entries.find((e) => e.day === day && e.periodNo === p);
  function openCell(day: number, periodNo: number) {
    const existing = at(day, periodNo);
    const prev = entries.find((e) => e.periodNo === periodNo);
    setForm({ subjectId: "", startTime: existing?.startTime ?? prev?.startTime ?? "08:00", endTime: existing?.endTime ?? prev?.endTime ?? "08:40" });
    setError(""); setCell({ day, periodNo, existing });
  }
  async function save() {
    if (!cell) return;
    const teacherId = alloc.find((a) => a.subject.id === form.subjectId)?.teacher?.id ?? null;
    const r = await api("/api/school/timetable", { method: "POST", body: { classId, day: cell.day, periodNo: cell.periodNo, teacherId, ...form } });
    if (!r.ok) return setError(r.error);
    setCell(null); void reload();
  }
  async function clear() {
    if (!cell?.existing) return;
    await api(`/api/school/timetable?id=${cell.existing.id}`, { method: "DELETE" });
    setCell(null); void reload();
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}><div><h1 style={ui.h1}>Timetable</h1><p style={ui.sub}>Weekly periods per class. The teacher comes from the class&apos;s subject allocation, and a teacher cannot be double-booked.</p></div></div>
      <Guide title="How to build a timetable" steps={["Under Subjects & Teachers, add the class's subjects and assign a teacher to each.", "Select the class here, then click a cell to place a subject in that period.", "A teacher cannot be put in two classes in the same period — you will be told if there is a clash."]} />
      <div style={{ marginBottom: 16 }}><ClassSelect classes={classes} value={classId} onChange={setClassId} /></div>
      {classId && alloc.length === 0 && <div style={{ ...ui.card, marginBottom: 16 }}>This class has no subjects yet. Add them under Subjects &amp; Teachers first.</div>}
      {classId && (
        <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead><tr><th style={ui.th}>Period</th>{DAYS.map((d) => <th key={d} style={ui.th}>{d}</th>)}</tr></thead>
            <tbody>
              {PERIODS.map((p) => (
                <tr key={p}>
                  <td style={{ ...ui.td, fontWeight: 700 }}>{p}</td>
                  {DAYS.map((_, i) => {
                    const e = at(i + 1, p);
                    return (
                      <td key={i} style={{ ...ui.td, cursor: "pointer", minWidth: 120, background: e ? "rgba(99,102,241,.12)" : undefined }} onClick={() => openCell(i + 1, p)}>
                        {e ? <><div style={{ fontWeight: 600 }}>{e.subject.name}</div><div style={ui.sub}>{e.teacher?.name ?? "No teacher"} · {e.startTime}</div></> : <span style={{ opacity: 0.3 }}>+</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cell && (
        <Modal title={`${DAYS[cell.day - 1]} · Period ${cell.periodNo}`} onClose={() => setCell(null)}>
          <ErrorLine text={error} />
          <Field label="Subject">
            <select style={ui.input} value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">Select subject</option>{alloc.map((a) => <option key={a.subject.id} value={a.subject.id}>{a.subject.name}{a.teacher ? ` — ${a.teacher.name}` : ""}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Start"><input style={ui.input} type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
            <Field label="End"><input style={ui.input} type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
            <div>{cell.existing && <button style={ui.ghost} onClick={clear}>Clear period</button>}</div>
            <div style={{ display: "flex", gap: 10 }}><button style={ui.ghost} onClick={() => setCell(null)}>Cancel</button><button style={ui.btn} disabled={!form.subjectId} onClick={save}>Save</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
