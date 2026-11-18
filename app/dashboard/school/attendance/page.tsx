"use client";
import { useEffect, useState } from "react";
import { api, ClassRow, ClassSelect, ErrorLine, today, ui, useApi } from "../_ui";

type Row = { id: string; name: string; admissionNo: string; status: string | null };
const OPTIONS = [["PRESENT", "#16a34a"], ["ABSENT", "#dc2626"], ["LATE", "#ca8a04"], ["LEAVE", "#0284c7"]] as const;

export default function AttendancePage() {
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(today());
  const { data: loaded, loading } = useApi<Row[]>(classId ? `/api/school/attendance?classId=${classId}&date=${date}` : null, []);
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState(""); const [error, setError] = useState("");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setRows(loaded.map((r) => ({ ...r, status: r.status ?? "PRESENT" }))); setMsg(""); }, [loaded]);

  const mark = (id: string, status: string) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  async function save() {
    const r = await api<{ saved: number }>("/api/school/attendance", { method: "POST", body: { date, classId, entries: rows.map((x) => ({ studentId: x.id, status: x.status })) } });
    if (!r.ok) return setError(r.error);
    setError(""); setMsg(`Attendance saved for ${r.data.saved} students.`);
  }
  const absent = rows.filter((r) => r.status === "ABSENT").length;

  return (
    <div style={ui.page}>
      <div style={ui.head}><div><h1 style={ui.h1}>Attendance</h1><p style={ui.sub}>Pick a class and date — everyone starts as present</p></div></div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <ClassSelect classes={classes} value={classId} onChange={setClassId} />
        <input style={{ ...ui.input, width: 170 }} type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
      </div>
      <ErrorLine text={error} />
      {!classId ? <div style={ui.sub}>Select a class to begin.</div> : (
        <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {!loading && rows.length === 0 && <tr><td style={{ ...ui.td, textAlign: "center", padding: 32 }}>No active students in this class.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={ui.td}>{r.admissionNo}</td><td style={{ ...ui.td, fontWeight: 600 }}>{r.name}</td>
                  <td style={{ ...ui.td, textAlign: "right" }}>
                    {OPTIONS.map(([s, c]) => (
                      <button key={s} onClick={() => mark(r.id, s)} style={{ ...ui.ghost, marginLeft: 6, padding: "6px 10px", fontSize: 12, background: r.status === s ? c : undefined, color: r.status === s ? "#fff" : undefined }}>{s[0] + s.slice(1).toLowerCase()}</button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
          <button style={ui.btn} onClick={save}>Save attendance</button>
          <span style={ui.sub}>{rows.length} students · {absent} absent</span>{msg && <span style={{ color: "#4ade80", fontSize: 13 }}>{msg}</span>}
        </div>
      )}
    </div>
  );
}
