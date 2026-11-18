"use client";
import Link from "next/link";
import { use } from "react";
import { Badge, className, money, Stat, ui, useApi } from "../../_ui";

type Profile = {
  student: { id: string; admissionNo: string; name: string; guardianName: string | null; phone: string | null; gender: string | null; address: string | null; dob: string | null; admissionDate: string; status: string; discount: number; class: { name: string; section: string } | null };
  fees: { billed: number; paid: number; balance: number };
  invoices: { id: string; period: string; title: string; payable: number; paid: number; balance: number; status: string; dueDate: string; payments: { id: string; receiptNo: string; amount: number; method: string; paidAt: string }[] }[];
  attendance: { PRESENT: number; ABSENT: number; LATE: number; LEAVE: number; marked: number; percent: number | null };
  reportCards: { exam: string; marks: number; total: number; percent: number; grade: string; passed: boolean; subjects: { subject: string; marks: number; total: number; percent: number; grade: string; passed: boolean }[] }[];
};

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error } = useApi<Profile | null>(`/api/school/students/${id}`, null);
  if (loading) return <div style={ui.page}>Loading…</div>;
  if (error || !data) return <div style={ui.page}>{error || "Student not found"} <Link href="/dashboard/school/students">← Back</Link></div>;
  const s = data.student;
  const info: [string, string][] = [
    ["Class", className(s.class)], ["Guardian", s.guardianName || "—"], ["Phone", s.phone || "—"], ["Gender", s.gender || "—"],
    ["Date of birth", s.dob ? s.dob.slice(0, 10) : "—"], ["Admitted", s.admissionDate.slice(0, 10)], ["Address", s.address || "—"], ["Monthly discount", s.discount ? money(s.discount) : "—"],
  ];

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div>
          <Link href="/dashboard/school/students" style={{ ...ui.sub, textDecoration: "none" }}>← Students</Link>
          <h1 style={{ ...ui.h1, marginTop: 6 }}>{s.name} <Badge value={s.status} /></h1>
          <p style={ui.sub}>Admission # {s.admissionNo}</p>
        </div>
        <button style={ui.ghost} onClick={() => window.print()}>Print profile / report card</button>
      </div>

      <div style={ui.grid}>
        <Stat label="Fee billed" value={money(data.fees.billed)} />
        <Stat label="Fee paid" value={money(data.fees.paid)} />
        <Stat label="Balance due" value={money(data.fees.balance)} />
        <Stat label="Attendance (last 90 days)" value={data.attendance.percent === null ? "—" : `${data.attendance.percent}%`} hint={`${data.attendance.PRESENT} present · ${data.attendance.ABSENT} absent · ${data.attendance.LEAVE} leave`} />
      </div>

      <div style={{ ...ui.card, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Student information</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          {info.map(([k, v]) => <div key={k}><span style={ui.label}>{k}</span><div>{v}</div></div>)}
        </div>
      </div>

      <div style={{ ...ui.card, marginBottom: 20, padding: 0, overflowX: "auto" }}>
        <div style={{ fontWeight: 700, padding: "16px 20px 4px" }}>Fee history</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Period", "Fee", "Due", "Payable", "Paid", "Balance", "Status", "Receipts"].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
          <tbody>
            {data.invoices.length === 0 && <tr><td colSpan={8} style={{ ...ui.td, textAlign: "center", padding: 24 }}>No invoices yet.</td></tr>}
            {data.invoices.map((i) => (
              <tr key={i.id}>
                <td style={ui.td}>{i.period}</td><td style={ui.td}>{i.title}</td><td style={ui.td}>{i.dueDate.slice(0, 10)}</td>
                <td style={ui.td}>{money(i.payable)}</td><td style={ui.td}>{money(i.paid)}</td><td style={{ ...ui.td, fontWeight: 700 }}>{money(i.balance)}</td>
                <td style={ui.td}><Badge value={i.status} /></td><td style={ui.td}>{i.payments.map((p) => p.receiptNo).join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontWeight: 700, margin: "8px 0 12px" }}>Report card</div>
      {data.reportCards.length === 0 && <div style={ui.sub}>No exam results entered yet.</div>}
      {data.reportCards.map((rc) => (
        <div key={rc.exam} style={{ ...ui.card, marginBottom: 16, padding: 0, overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px 8px", flexWrap: "wrap", gap: 8 }}>
            <strong>{rc.exam}</strong>
            <span>{rc.marks}/{rc.total} · {rc.percent}% · Grade {rc.grade} · <Badge value={rc.passed ? "PASS" : "FAIL"} /></span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Subject", "Marks", "Total", "%", "Grade"].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
            <tbody>{rc.subjects.map((x) => (
              <tr key={x.subject}><td style={ui.td}>{x.subject}</td><td style={ui.td}>{x.marks}</td><td style={ui.td}>{x.total}</td><td style={ui.td}>{x.percent}%</td><td style={ui.td}>{x.grade}</td></tr>
            ))}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
