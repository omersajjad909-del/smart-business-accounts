"use client";
import { useEffect, useState } from "react";
import { api, ClassRow, ClassSelect, ErrorLine, className, ui, useApi } from "../../_ui";

type Student = { id: string; admissionNo: string; name: string };

export default function PromotePage() {
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const { data: students, reload } = useApi<Student[]>(from ? `/api/school/students?classId=${from}&status=ACTIVE` : null, []);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState(""); const [msg, setMsg] = useState("");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPicked(new Set(students.map((s) => s.id))); }, [students]);

  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  async function run() {
    const target = to === "GRADUATE" ? "graduate" : className(classes.find((c) => c.id === to));
    if (!confirm(`Move ${picked.size} students to ${target}?`)) return;
    const r = await api<{ moved: number }>("/api/school/students/promote", { method: "POST", body: { fromClassId: from, toClassId: to, studentIds: [...picked] } });
    if (!r.ok) return setError(r.error);
    setError(""); setMsg(`${r.data.moved} students moved.`); void reload(); setFrom(""); setPicked(new Set());
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}><div><h1 style={ui.h1}>Promote Students</h1><p style={ui.sub}>Move a class up at the end of the session, or graduate the final class</p></div></div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <ClassSelect classes={classes} value={from} onChange={(v) => { setFrom(v); setMsg(""); }} allLabel="From class" />
        <span>→</span>
        <select style={{ ...ui.input, width: "auto", minWidth: 180 }} value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">To class</option>
          {classes.filter((c) => c.id !== from).map((c) => <option key={c.id} value={c.id}>{className(c)}</option>)}
          <option value="GRADUATE">🎓 Graduate (leave school)</option>
        </select>
      </div>
      <ErrorLine text={error} />{msg && <div style={{ color: "#4ade80", marginBottom: 12 }}>{msg}</div>}
      {from && (
        <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {students.length === 0 && <tr><td style={{ ...ui.td, textAlign: "center", padding: 24 }}>No active students in this class.</td></tr>}
              {students.map((s) => (
                <tr key={s.id}><td style={ui.td}><input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} /></td><td style={ui.td}>{s.admissionNo}</td><td style={{ ...ui.td, fontWeight: 600 }}>{s.name}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {from && to && picked.size > 0 && <button style={{ ...ui.btn, marginTop: 16 }} onClick={run}>Promote {picked.size} students</button>}
    </div>
  );
}
