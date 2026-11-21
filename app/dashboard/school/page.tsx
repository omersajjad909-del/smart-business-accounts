"use client";
import Link from "next/link";
import { api, money, PlanUsage, Stat, ui, useApi } from "./_ui";

type Overview = {
  activeStudents: number; classes: number; collectedThisMonth: number; outstanding: number; overdue: number;
  defaulters: { name: string; admissionNo: string; balance: number }[];
  attendanceToday: { marked: number; present: number; absent: number };
};
const empty: Overview = { activeStudents: 0, classes: 0, collectedThisMonth: 0, outstanding: 0, overdue: 0, defaulters: [], attendanceToday: { marked: 0, present: 0, absent: 0 } };

export default function SchoolOverview() {
  const { data, loading, error } = useApi<Overview>("/api/school/overview", empty);
  const { data: setup, reload: reloadSetup } = useApi<{ doneCount: number; total: number; complete: boolean; dismissed: boolean } | null>("/api/school/setup", null);
  const a = data.attendanceToday;
  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>School Overview</h1><p style={ui.sub}>Students, fee collection and today&apos;s attendance</p></div>
        <Link href="/dashboard/school/fees" style={{ ...ui.btn, textDecoration: "none" }}>Collect Fee</Link>
      </div>
      {error && <div style={{ color: "#f87171", marginBottom: 12 }}>{error}</div>}
      {setup && !setup.complete && !setup.dismissed && (
        <div style={{ ...ui.card, marginBottom: 18, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div><div style={{ fontWeight: 700 }}>🚀 Finish setting up your school — {setup.doneCount} of {setup.total} done</div><div style={{ ...ui.sub, marginTop: 2 }}>Profile, session, classes, fees, subjects, teachers and students.</div></div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/dashboard/school/setup" style={{ ...ui.btn, textDecoration: "none" }}>Continue setup</Link>
              <button style={ui.ghost} onClick={async () => { await api("/api/school/settings", { method: "PUT", body: { dismissSetup: true } }); void reloadSetup(); }}>Hide</button>
            </div>
          </div>
          <div style={{ height: 6, borderRadius: 6, background: "rgba(var(--ink),.1)", marginTop: 12, overflow: "hidden" }}><div style={{ width: `${(setup.doneCount / setup.total) * 100}%`, height: "100%", background: "#6366f1" }} /></div>
        </div>
      )}
      <PlanUsage />
      <div style={ui.grid}>
        <Stat label="Active Students" value={loading ? "…" : data.activeStudents} hint={`${data.classes} classes`} />
        <Stat label="Collected This Month" value={money(data.collectedThisMonth)} />
        <Stat label="Outstanding" value={money(data.outstanding)} hint={`${money(data.overdue)} overdue`} />
        <Stat label="Attendance Today" value={a.marked ? `${Math.round((a.present / a.marked) * 100)}%` : "Not marked"} hint={a.marked ? `${a.present} present · ${a.absent} absent` : undefined} />
      </div>
      <div style={ui.card}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Top defaulters (overdue)</div>
        {data.defaulters.length === 0 ? <div style={ui.sub}>No overdue fees.</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>{data.defaulters.map((d) => (
              <tr key={d.admissionNo}><td style={ui.td}>{d.admissionNo}</td><td style={ui.td}>{d.name}</td><td style={{ ...ui.td, textAlign: "right", fontWeight: 600 }}>{money(d.balance)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
