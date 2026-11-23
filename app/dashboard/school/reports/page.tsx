"use client";
import { className, money, PrintDoc, printTd, printTh, Stat, ui, useApi } from "../_ui";

type Row = { classId: string; name: string; section: string; strength: number; billed: number; collected: number; outstanding: number; collectionRate: number | null; attendancePercent: number | null };

export default function SchoolReportsPage() {
  const { data, loading } = useApi<{ rows: Row[]; totalStudents: number }>("/api/school/reports", { rows: [], totalStudents: 0 });
  const t = data.rows.reduce((s, r) => ({ billed: s.billed + r.billed, collected: s.collected + r.collected, outstanding: s.outstanding + r.outstanding }), { billed: 0, collected: 0, outstanding: 0 });
  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>School Reports</h1><p style={ui.sub}>Class-wise strength, attendance (last 30 days) and fee position</p></div>
        <button style={ui.ghost} onClick={() => window.print()}>Print</button>
      </div>
      <div style={ui.grid}>
        <Stat label="Active students" value={data.totalStudents} /><Stat label="Total billed" value={money(t.billed)} />
        <Stat label="Collected" value={money(t.collected)} /><Stat label="Outstanding" value={money(t.outstanding)} />
      </div>
      <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Class", "Students", "Attendance", "Billed", "Collected", "Outstanding", "Collection rate"].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!loading && data.rows.length === 0 && <tr><td colSpan={7} style={{ ...ui.td, textAlign: "center", padding: 32 }}>No classes yet.</td></tr>}
            {data.rows.map((r) => (
              <tr key={r.classId}>
                <td style={{ ...ui.td, fontWeight: 600 }}>{className(r)}</td><td style={ui.td}>{r.strength}</td>
                <td style={ui.td}>{r.attendancePercent === null ? "—" : `${r.attendancePercent}%`}</td>
                <td style={ui.td}>{money(r.billed)}</td><td style={ui.td}>{money(r.collected)}</td><td style={{ ...ui.td, fontWeight: 700 }}>{money(r.outstanding)}</td>
                <td style={ui.td}>{r.collectionRate === null ? "—" : `${r.collectionRate}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PrintDoc title="Class-wise School Report" subtitle={`${data.totalStudents} active students · billed ${money(t.billed)} · collected ${money(t.collected)} · outstanding ${money(t.outstanding)}`} landscape>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Class", "Students", "Attendance (30 days)", "Billed", "Collected", "Outstanding", "Collection rate"].map((h) => <th key={h} style={printTh}>{h}</th>)}</tr></thead>
          <tbody>{data.rows.map((r) => <tr key={r.classId}><td style={printTd}>{className(r)}</td><td style={printTd}>{r.strength}</td><td style={printTd}>{r.attendancePercent === null ? "—" : `${r.attendancePercent}%`}</td><td style={printTd}>{money(r.billed)}</td><td style={printTd}>{money(r.collected)}</td><td style={printTd}>{money(r.outstanding)}</td><td style={printTd}>{r.collectionRate === null ? "—" : `${r.collectionRate}%`}</td></tr>)}</tbody>
        </table>
      </PrintDoc>
    </div>
  );
}
