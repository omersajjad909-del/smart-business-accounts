"use client";
import Link from "next/link";
import { use } from "react";
import { useRef, useState } from "react";
import { AddChargeModal } from "../../fees/_AddCharge";
import { api, Avatar, Badge, className, money, Stat, ui, uploadStudentPhoto, useApi } from "../../_ui";

type Profile = {
  student: { id: string; admissionNo: string; name: string; guardianName: string | null; phone: string | null; gender: string | null; address: string | null; dob: string | null; admissionDate: string; status: string; discount: number; class: { name: string; section: string } | null; bFormNo: string | null; religion: string | null; bloodGroup: string | null; city: string | null; previousSchool: string | null; previousClass: string | null; guardianRelation: string | null; guardianCnic: string | null; guardianOccupation: string | null; motherName: string | null; alternatePhone: string | null; emergencyContact: string | null; emergencyPhone: string | null; medicalNotes: string | null; documents: string[]; photoUrl: string | null };
  fees: { billed: number; paid: number; balance: number };
  invoices: { id: string; period: string; title: string; payable: number; paid: number; balance: number; status: string; dueDate: string; payments: { id: string; receiptNo: string; amount: number; method: string; paidAt: string }[] }[];
  attendance: { PRESENT: number; ABSENT: number; LATE: number; LEAVE: number; marked: number; percent: number | null };
  promotions: { id: string; fromClass: string; toClass: string; kind: string; reason: string | null; createdAt: string }[];
  reportCards: { exam: string; marks: number; total: number; percent: number; grade: string; passed: boolean; subjects: { subject: string; marks: number; total: number; percent: number; grade: string; passed: boolean }[] }[];
};

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useApi<Profile | null>(`/api/school/students/${id}`, null);
  const { data: optionalHeads } = useApi<{ heads: { id: string; name: string; optional: boolean; active: boolean; defaultAmount: number }[] }>("/api/school/fee-heads", { heads: [] });
  const { data: enrolled, reload: reloadEnrolled } = useApi<{ id: string; headId: string; amount: number; head: { name: string } }[]>(`/api/school/student-fees?studentId=${id}`, []);
  const [enrol, setEnrol] = useState({ headId: "", amount: "" });
  const [feeMsg, setFeeMsg] = useState("");
  async function addOptional() {
    const r = await api("/api/school/student-fees", { method: "POST", body: { studentId: id, headId: enrol.headId, amount: Number(enrol.amount) } });
    setFeeMsg(r.ok ? "" : r.error); if (r.ok) { setEnrol({ headId: "", amount: "" }); void reloadEnrolled(); }
  }
  async function dropOptional(rowId: string) { await api(`/api/school/student-fees?id=${rowId}`, { method: "DELETE" }); void reloadEnrolled(); }
  const [addCharge, setAddCharge] = useState(false);
  const [chargeMsg, setChargeMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoMsg, setPhotoMsg] = useState("");
  async function onPick(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setPhotoMsg("Photo must be under 2MB");
    setPhotoMsg("Uploading…");
    const r = await uploadStudentPhoto(id, file);
    setPhotoMsg(r.error ?? ""); if (!r.error) void reload();
  }
  async function removePhoto() {
    if (!confirm("Remove this photo?")) return;
    const r = await api(`/api/school/students/photo?studentId=${id}`, { method: "DELETE" });
    setPhotoMsg(r.ok ? "" : r.error); if (r.ok) void reload();
  }
  if (loading) return <div style={ui.page}>Loading…</div>;
  if (error || !data) return <div style={ui.page}>{error || "Student not found"} <Link href="/dashboard/school/students">← Back</Link></div>;
  const s = data.student;
  const v = (x: string | null | undefined) => x || "—";
  const DOC_LABELS: Record<string, string> = { BFORM: "B-Form", GUARDIAN_CNIC: "Guardian CNIC", PHOTOS: "Photos", PREV_RESULT: "Previous result card", LEAVING_CERT: "Leaving certificate", VACCINATION: "Vaccination card" };
  const info: [string, string][] = [
    ["Class", className(s.class)], ["Gender", v(s.gender)], ["Date of birth", s.dob ? s.dob.slice(0, 10) : "—"], ["B-Form no.", v(s.bFormNo)],
    ["Religion", v(s.religion)], ["Blood group", v(s.bloodGroup)], ["Admitted", s.admissionDate.slice(0, 10)], ["Monthly discount", s.discount ? money(s.discount) : "—"],
    [`Guardian (${(s.guardianRelation || "").toLowerCase() || "—"})`, v(s.guardianName)], ["Guardian CNIC", v(s.guardianCnic)], ["Occupation", v(s.guardianOccupation)], ["Mother", v(s.motherName)],
    ["Phone", v(s.phone)], ["Alternate phone", v(s.alternatePhone)], ["Emergency contact", s.emergencyContact ? `${s.emergencyContact} · ${v(s.emergencyPhone)}` : "—"],
    ["Address", [s.address, s.city].filter(Boolean).join(", ") || "—"], ["Previous school", s.previousSchool ? `${s.previousSchool}${s.previousClass ? ` (${s.previousClass})` : ""}` : "—"], ["Medical notes", v(s.medicalNotes)],
    ["Documents", s.documents.length ? s.documents.map((d) => DOC_LABELS[d] ?? d).join(", ") : "None received"],
  ];

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <Avatar url={s.photoUrl} name={s.name} size={84} />
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { void onPick(e.target.files?.[0]); e.target.value = ""; }} />
            <div style={{ marginTop: 6, display: "flex", gap: 6, justifyContent: "center" }} className="no-print">
              <button style={{ ...ui.ghost, padding: "4px 8px", fontSize: 11 }} onClick={() => fileRef.current?.click()}>{s.photoUrl ? "Change" : "Add photo"}</button>
              {s.photoUrl && <button style={{ ...ui.ghost, padding: "4px 8px", fontSize: 11 }} onClick={removePhoto}>Remove</button>}
            </div>
            {photoMsg && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4, maxWidth: 150 }}>{photoMsg}</div>}
          </div>
          <div>
            <Link href="/dashboard/school/students" style={{ ...ui.sub, textDecoration: "none" }}>← Students</Link>
            <h1 style={{ ...ui.h1, marginTop: 6 }}>{s.name} <Badge value={s.status} /></h1>
            <p style={ui.sub}>Admission # {s.admissionNo}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="no-print">
          <Link href={`/dashboard/school/print?kind=idcards&studentId=${id}`} style={{ ...ui.ghost, textDecoration: "none" }}>🪪 ID card</Link>
          <Link href={`/dashboard/school/print?kind=certificate&type=leaving&studentId=${id}`} style={{ ...ui.ghost, textDecoration: "none" }}>Leaving certificate</Link>
          <Link href={`/dashboard/school/print?kind=certificate&type=character&studentId=${id}`} style={{ ...ui.ghost, textDecoration: "none" }}>Character certificate</Link>
          <button style={ui.ghost} onClick={() => window.print()}>Print profile / report card</button>
        </div>
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

      {data.promotions.length > 0 && (
        <div style={{ ...ui.card, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Class history</div>
          {data.promotions.map((p) => (
            <div key={p.id} style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap", padding: "8px 0", borderBottom: "1px solid rgba(var(--ink),.06)", fontSize: 13 }}>
              <span style={{ ...ui.sub, minWidth: 90 }}>{p.createdAt.slice(0, 10)}</span>
              <span style={{ fontWeight: 600 }}>{p.fromClass} → {p.toClass}</span>
              <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "2px 8px", color: "#fff", background: p.kind === "SKIPPED" ? "#d97706" : p.kind === "GRADUATED" ? "#7c3aed" : "#16a34a" }}>{p.kind === "SKIPPED" ? "SKIPPED A CLASS" : p.kind}</span>
              {p.reason && <span style={ui.sub}>“{p.reason}”</span>}
            </div>
          ))}
        </div>
      )}

      {optionalHeads.heads.some((h) => h.optional && h.active) && (
        <div style={{ ...ui.card, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Optional fees (transport, hostel …)</div>
          <p style={{ ...ui.sub, marginTop: 0 }}>Billed monthly only to students enrolled here, at the amount you set for this student.</p>
          {enrolled.map((e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(var(--ink),.06)" }}>
              <span>{e.head.name} · {money(e.amount)}</span><button style={ui.ghost} onClick={() => dropOptional(e.id)}>Remove</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <select style={{ ...ui.input, width: 200 }} value={enrol.headId} onChange={(e) => setEnrol({ headId: e.target.value, amount: String(optionalHeads.heads.find((h) => h.id === e.target.value)?.defaultAmount || "") })}>
              <option value="">Enrol in…</option>{optionalHeads.heads.filter((h) => h.optional && h.active && !enrolled.some((x) => x.headId === h.id)).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <input style={{ ...ui.input, width: 130 }} type="number" min={1} placeholder="Amount" value={enrol.amount} onChange={(e) => setEnrol({ ...enrol, amount: e.target.value })} />
            <button style={ui.btn} disabled={!enrol.headId || !enrol.amount} onClick={addOptional}>Enrol</button>
          </div>
          {feeMsg && <div style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{feeMsg}</div>}
        </div>
      )}

      <div style={{ ...ui.card, marginBottom: 20, padding: 0, overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 4px", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700 }}>Fee history</div>
          <div style={{ display: "flex", gap: 8 }} className="no-print">
            <button style={ui.btn} onClick={() => setAddCharge(true)}>+ Add charge</button>
            <Link href={`/dashboard/school/collect?student=${id}`} style={{ ...ui.btn, textDecoration: "none" }}>💰 Collect fee</Link>
          </div>
        </div>
        {chargeMsg && <div style={{ padding: "4px 20px 8px", fontSize: 13, color: "#4ade80" }}>{chargeMsg}</div>}
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
      {addCharge && <AddChargeModal student={{ id, name: s.name }} onClose={() => setAddCharge(false)} onSaved={(m) => { setAddCharge(false); setChargeMsg(m); void reload(); }} />}
    </div>
  );
}
