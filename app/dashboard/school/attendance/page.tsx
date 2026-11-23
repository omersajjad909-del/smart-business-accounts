"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, Avatar, ClassRow, className, ErrorLine, Guide, PrintDoc, printTd, printTh, Stat, thisPeriod, today, ui, useApi } from "../_ui";

type Row = { id: string; name: string; admissionNo: string; photoUrl: string | null; status: string | null; remark: string };
type Monthly = { days: number; daysMarked: number; rows: { id: string; name: string; admissionNo: string; marks: Record<number, string>; present: number; absent: number; late: number; leave: number; percent: number | null }[] };

const STATUS = [["PRESENT", "Present", "#16a34a", "P"], ["ABSENT", "Absent", "#dc2626", "A"], ["LATE", "Late", "#ca8a04", "L"], ["LEAVE", "Leave", "#0284c7", "V"]] as const;
const COLOR: Record<string, string> = Object.fromEntries(STATUS.map(([k, , c]) => [k, c]));
const LETTER: Record<string, string> = Object.fromEntries(STATUS.map(([k, , , l]) => [k, l]));

function shiftDay(iso: string, by: number) { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + by); return d.toISOString().slice(0, 10); }
const pretty = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function AttendancePage() {
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  const [classId, setClassId] = useState("");
  const [tab, setTab] = useState<"daily" | "monthly">("daily");
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(thisPeriod());
  const { data: loaded, loading, reload } = useApi<Row[]>(classId && tab === "daily" ? `/api/school/attendance?classId=${classId}&date=${date}` : null, []);
  const { data: monthly } = useApi<Monthly | null>(classId && tab === "monthly" ? `/api/school/attendance/monthly?classId=${classId}&month=${month}` : null, null);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);

  const alreadyMarked = loaded.some((r) => r.status !== null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setRows(loaded.map((r) => ({ ...r, status: r.status ?? "PRESENT" }))); }, [loaded]);

  const baseline = useMemo(() => JSON.stringify(loaded.map((r) => [r.id, r.status ?? "PRESENT", r.remark])), [loaded]);
  const dirty = rows.length > 0 && (JSON.stringify(rows.map((r) => [r.id, r.status, r.remark])) !== baseline || !alreadyMarked);
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const percent = rows.length ? Math.round(((count("PRESENT") + count("LATE")) / rows.length) * 1000) / 10 : 0;
  const shown = rows.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.admissionNo.includes(q));
  const cls = classes.find((c) => c.id === classId);

  const mark = (id: string, status: string) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  const note = (id: string, remark: string) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, remark } : r)));
  const markAll = (status: string) => setRows((rs) => rs.map((r) => ({ ...r, status })));

  async function save() {
    setSaving(true);
    const r = await api<{ saved: number }>("/api/school/attendance", { method: "POST", body: { date, classId, entries: rows.map((x) => ({ studentId: x.id, status: x.status, remark: x.status === "PRESENT" ? "" : x.remark })) } });
    setSaving(false);
    if (!r.ok) return setError(r.error);
    setError("");
    await reload();
    setMsg(`Saved — ${rows.filter((x) => x.status === "PRESENT").length} present, ${rows.filter((x) => x.status === "ABSENT").length} absent, ${rows.filter((x) => x.status === "LATE").length} late, ${rows.filter((x) => x.status === "LEAVE").length} on leave.`);
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}><div><h1 style={ui.h1}>Attendance</h1><p style={ui.sub}>Daily class register and the monthly summary</p></div></div>
      <Guide title="How to mark attendance" steps={["Choose a class.", "Pick the date — use the arrows to move a day back or forward.", "Everyone starts as Present. Tap Absent, Late or Leave for the exceptions, and add a reason if you like.", "Press Save. You can reopen any day later to correct it."]} note="Parents of absent students can be messaged from Reports → Guardian Messages. The Monthly register tab shows the whole month at a glance." />

      <div style={{ ...ui.card, marginBottom: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>1. Choose a class</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {classes.length === 0 && <span style={ui.sub}>No classes yet. <Link href="/dashboard/school/classes" style={{ color: "#818cf8" }}>Add classes →</Link></span>}
          {classes.map((c) => (
            <button key={c.id} onClick={() => { setClassId(c.id); setMsg(""); setQ(""); }} style={{ padding: "10px 16px", borderRadius: 12, cursor: "pointer", color: "inherit", textAlign: "left", border: c.id === classId ? "2px solid #6366f1" : "1px solid rgba(var(--ink),.14)", background: c.id === classId ? "rgba(99,102,241,.14)" : "rgba(var(--ink),.03)" }}>
              <div style={{ fontWeight: 700 }}>{className(c)}</div><div style={{ fontSize: 12, color: "rgba(var(--ink),.55)" }}>{c.activeStudents} students</div>
            </button>
          ))}
        </div>
      </div>

      {classId && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {([["daily", "Daily register"], ["monthly", "Monthly register"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ ...ui.ghost, background: tab === k ? "#6366f1" : undefined, color: tab === k ? "#fff" : undefined, fontWeight: 600 }}>{l}</button>
            ))}
          </div>

          {tab === "daily" && (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
                <button style={ui.ghost} onClick={() => { setDate(shiftDay(date, -1)); setMsg(""); }} aria-label="Previous day">◀</button>
                <input style={{ ...ui.input, width: 170 }} type="date" value={date} max={today()} onChange={(e) => { if (e.target.value) { setDate(e.target.value); setMsg(""); } }} />
                <button style={ui.ghost} disabled={date >= today()} onClick={() => { setDate(shiftDay(date, 1)); setMsg(""); }} aria-label="Next day">▶</button>
                {date !== today() && <button style={ui.ghost} onClick={() => setDate(today())}>Today</button>}
                <strong style={{ marginLeft: 6 }}>{pretty(date)}</strong>
                {!loading && rows.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "4px 12px", color: "#fff", background: alreadyMarked ? "#16a34a" : "#d97706" }}>{alreadyMarked ? "✓ Attendance taken" : "Not marked yet"}</span>
                )}
              </div>

              {rows.length > 0 && (
                <div style={ui.grid}>
                  <Stat label="Present" value={count("PRESENT")} /><Stat label="Absent" value={count("ABSENT")} /><Stat label="Late" value={count("LATE")} /><Stat label="Leave" value={count("LEAVE")} />
                  <Stat label="Attendance" value={`${percent}%`} hint={`${rows.length} students in ${className(cls)}`} />
                </div>
              )}
              <ErrorLine text={error} />
              {!loading && rows.length === 0 && <div style={ui.card}>No active students in {className(cls)}. <Link href="/dashboard/school/students" style={{ color: "#818cf8" }}>Admit students →</Link></div>}

              {rows.length > 0 && (
                <>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    <input style={{ ...ui.input, width: 240 }} placeholder="Search student" value={q} onChange={(e) => setQ(e.target.value)} />
                    <button style={ui.ghost} onClick={() => markAll("PRESENT")}>Mark all present</button>
                    <button style={ui.ghost} onClick={() => confirm("Mark the whole class absent? Use this for a holiday or closure only.") && markAll("ABSENT")}>Mark all absent</button>
                  </div>
                  <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>{["#", "Student", "Status", "Reason (optional)"].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {shown.map((r) => (
                          <tr key={r.id} style={{ background: r.status === "ABSENT" ? "rgba(220,38,38,.07)" : undefined }}>
                            <td style={ui.td}>{r.admissionNo}</td>
                            <td style={{ ...ui.td, fontWeight: 600 }}><span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}><Avatar url={r.photoUrl} name={r.name} size={30} />{r.name}</span></td>
                            <td style={{ ...ui.td, whiteSpace: "nowrap" }}>
                              {STATUS.map(([k, label, c]) => <button key={k} onClick={() => mark(r.id, k)} style={{ ...ui.ghost, marginRight: 6, padding: "6px 12px", fontSize: 12.5, background: r.status === k ? c : undefined, color: r.status === k ? "#fff" : undefined, fontWeight: r.status === k ? 700 : 500 }}>{label}</button>)}
                            </td>
                            <td style={ui.td}>{r.status !== "PRESENT" && <input style={{ ...ui.input, height: 34, fontSize: 13 }} placeholder="e.g. fever, family function" maxLength={200} value={r.remark} onChange={(e) => note(r.id, e.target.value)} />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ ...ui.card, position: "sticky", bottom: 12, marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: "var(--dk-1a1d2e, #1a1d2e)", boxShadow: "0 8px 30px rgba(0,0,0,.25)" }}>
                    <div>
                      <strong>{count("PRESENT") + count("LATE")} of {rows.length} in school</strong>
                      {dirty && <span style={{ color: "#fbbf24", marginLeft: 10, fontSize: 13 }}>● Unsaved changes</span>}
                      {msg && <div style={{ color: "#4ade80", fontSize: 13 }}>{msg}</div>}
                      {count("ABSENT") > 0 && !dirty && <div style={{ fontSize: 12.5, marginTop: 2 }}><Link href="/dashboard/school/messages" style={{ color: "#818cf8" }}>Message the guardians of {count("ABSENT")} absent student(s) →</Link></div>}
                    </div>
                    <button style={ui.btn} disabled={saving || !dirty} onClick={save}>{saving ? "Saving…" : alreadyMarked ? "Update attendance" : "Save attendance"}</button>
                  </div>
                </>
              )}
            </>
          )}

          {tab === "monthly" && (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
                <input style={{ ...ui.input, width: 170 }} type="month" value={month} max={thisPeriod()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
                <button style={ui.ghost} onClick={() => window.print()}>Print register</button>
                {monthly && <span style={ui.sub}>{monthly.daysMarked} day(s) marked this month</span>}
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12, fontSize: 12.5 }}>
                {STATUS.map(([k, label, c, l]) => <span key={k}><b style={{ color: c }}>{l}</b> = {label}</span>)}
              </div>
              {!monthly || monthly.rows.length === 0 ? <div style={ui.card}>No students or no attendance for this month.</div> : (
                <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", fontSize: 12.5, minWidth: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ ...ui.th, position: "sticky", left: 0, background: "var(--dk-1a1d2e, #1a1d2e)" }}>Student</th>
                        {Array.from({ length: monthly.days }, (_, i) => <th key={i} style={{ ...ui.th, padding: "10px 6px", textAlign: "center" }}>{i + 1}</th>)}
                        {["P", "A", "L", "V", "%"].map((h) => <th key={h} style={{ ...ui.th, textAlign: "center" }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.rows.map((r) => (
                        <tr key={r.id}>
                          <td style={{ ...ui.td, position: "sticky", left: 0, background: "var(--dk-1a1d2e, #1a1d2e)", whiteSpace: "nowrap", fontWeight: 600 }}>{r.admissionNo} · {r.name}</td>
                          {Array.from({ length: monthly.days }, (_, i) => { const s = r.marks[i + 1]; return <td key={i} style={{ ...ui.td, padding: "8px 6px", textAlign: "center", fontWeight: 700, color: s ? COLOR[s] : "rgba(var(--ink),.2)" }}>{s ? LETTER[s] : "·"}</td>; })}
                          <td style={{ ...ui.td, textAlign: "center" }}>{r.present}</td><td style={{ ...ui.td, textAlign: "center", color: r.absent ? "#f87171" : undefined }}>{r.absent}</td>
                          <td style={{ ...ui.td, textAlign: "center" }}>{r.late}</td><td style={{ ...ui.td, textAlign: "center" }}>{r.leave}</td>
                          <td style={{ ...ui.td, textAlign: "center", fontWeight: 700, color: r.percent !== null && r.percent < 75 ? "#f87171" : undefined }}>{r.percent === null ? "—" : `${r.percent}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p style={{ ...ui.sub, marginTop: 10 }}>Percentages below 75% are shown in red.</p>
          {monthly && monthly.rows.length > 0 && (
            <PrintDoc title="Monthly Attendance Register" subtitle={`${className(cls)} · ${month}`} landscape>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={printTh}>Student</th>{Array.from({ length: monthly.days }, (_, i) => <th key={i} style={{ ...printTh, padding: "3px 1px", textAlign: "center", fontSize: 8.5 }}>{i + 1}</th>)}{["P", "A", "L", "V", "%"].map((h) => <th key={h} style={{ ...printTh, textAlign: "center" }}>{h}</th>)}</tr></thead>
                <tbody>{monthly.rows.map((r) => <tr key={r.id}><td style={{ ...printTd, whiteSpace: "nowrap", fontSize: 9.5 }}>{r.admissionNo} · {r.name}</td>{Array.from({ length: monthly.days }, (_, i) => <td key={i} style={{ ...printTd, padding: "3px 1px", textAlign: "center", fontSize: 8.5 }}>{r.marks[i + 1] ? LETTER[r.marks[i + 1]] : ""}</td>)}<td style={{ ...printTd, textAlign: "center" }}>{r.present}</td><td style={{ ...printTd, textAlign: "center" }}>{r.absent}</td><td style={{ ...printTd, textAlign: "center" }}>{r.late}</td><td style={{ ...printTd, textAlign: "center" }}>{r.leave}</td><td style={{ ...printTd, textAlign: "center" }}>{r.percent === null ? "—" : `${r.percent}%`}</td></tr>)}</tbody>
              </table>
              <div style={{ fontSize: 10, marginTop: 6 }}>P = Present · A = Absent · L = Late · V = Leave</div>
            </PrintDoc>
          )}

            </>
          )}
        </>
      )}
    </div>
  );
}
