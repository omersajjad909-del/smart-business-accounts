"use client";
import Link from "next/link";
import { useState } from "react";
import { api, Badge, className, ClassRow, ClassSelect, ErrorLine, Field, Guide, Modal, ui, useApi } from "../_ui";
import { StudentForm } from "../students/_form";

type App = {
  id: string; applicationNo: string; applicantName: string; guardianName: string | null; phone: string | null; gender: string | null; dob: string | null; previousSchool: string | null;
  note: string | null; status: string; createdAt: string; applyClassId: string | null; applyClass: { name: string; section: string } | null; studentId: string | null; student: { admissionNo: string; name: string } | null;
};
const STATUSES = ["SUBMITTED", "REVIEW", "ACCEPTED", "WAITLISTED", "REJECTED"] as const;
const LABEL: Record<string, string> = { SUBMITTED: "New", REVIEW: "In review", ACCEPTED: "Accepted", WAITLISTED: "Waitlisted", REJECTED: "Rejected" };
const blank = { applicantName: "", guardianName: "", phone: "", applyClassId: "", dob: "", gender: "", previousSchool: "", note: "" };

export default function ApplicationsPage() {
  const { data: apps, loading, reload } = useApi<App[]>("/api/school/applications", []);
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [admit, setAdmit] = useState<App | null>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [collect, setCollect] = useState<{ id: string; name: string; fee: number } | null>(null);

  const count = (s: string) => apps.filter((a) => a.status === s).length;
  const shown = apps.filter((a) => !filter || a.status === filter);
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function create() {
    if (!form.applicantName.trim()) return setError("Enter the child's name");
    if (!form.phone.trim()) return setError("Enter a phone number we can reach the family on");
    const r = await api("/api/school/applications", { method: "POST", body: form });
    if (!r.ok) return setError(r.error);
    setOpen(false); setForm(blank); setError(""); setNotice("Application recorded."); void reload();
  }
  async function setStatus(a: App, status: string) {
    const r = await api("/api/school/applications", { method: "PATCH", body: { id: a.id, status } });
    if (!r.ok) setNotice(r.error); void reload();
  }
  async function remove(a: App) {
    if (!confirm(`Delete the application of ${a.applicantName}?`)) return;
    const r = await api(`/api/school/applications?id=${a.id}`, { method: "DELETE" });
    if (!r.ok) setNotice(r.error); void reload();
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>Applications</h1><p style={ui.sub}>Families who have applied or enquired for admission, before the child is a student</p></div>
        <button style={ui.btn} onClick={() => setOpen(true)}>+ New application</button>
      </div>
      <Guide title="How applications work" steps={["Record each family that applies or enquires (+ New application).", "Review them: mark each as In review, Accepted, Waitlisted or Rejected.", "For the ones you accept, press Admit — the admission form opens already filled with what you recorded. The child becomes a student."]} note="If you admit children straight away without an application stage, you can skip this page and use Students → New Admission." />
      {notice && <div style={{ ...ui.card, padding: 12, fontSize: 13, marginBottom: 14 }}>{notice}</div>}
      {collect && (
        <div style={{ ...ui.card, marginBottom: 14, borderColor: "rgba(34,197,94,.4)", background: "rgba(34,197,94,.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div><b>✓ {collect.name} admitted.</b> <span style={ui.sub}>Admission fee of Rs {collect.fee.toLocaleString("en-PK")} is waiting to be collected.</span></div>
          <div style={{ display: "flex", gap: 8 }}><Link href={`/dashboard/school/collect?student=${collect.id}`} style={{ ...ui.btn, textDecoration: "none" }}>💰 Collect fee now</Link><button style={ui.ghost} onClick={() => setCollect(null)}>Later</button></div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button style={{ ...ui.ghost, background: !filter ? "#6366f1" : undefined, color: !filter ? "#fff" : undefined }} onClick={() => setFilter("")}>All ({apps.length})</button>
        {STATUSES.map((s) => <button key={s} style={{ ...ui.ghost, background: filter === s ? "#6366f1" : undefined, color: filter === s ? "#fff" : undefined }} onClick={() => setFilter(filter === s ? "" : s)}>{LABEL[s]} ({count(s)})</button>)}
      </div>

      <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Application", "Child", "Applying for", "Phone", "Applied", "Status", ""].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!loading && shown.length === 0 && <tr><td colSpan={7} style={{ ...ui.td, textAlign: "center", padding: 32 }}>{apps.length ? "No applications with this status." : "No applications yet. Click “+ New application” when a family applies."}</td></tr>}
            {shown.map((a) => (
              <tr key={a.id}>
                <td style={{ ...ui.td, fontWeight: 700 }}>{a.applicationNo}</td>
                <td style={ui.td}><b>{a.applicantName}</b><div style={{ fontSize: 12, opacity: 0.6 }}>{a.guardianName ? `Guardian: ${a.guardianName}` : ""}{a.previousSchool ? ` · From ${a.previousSchool}` : ""}</div></td>
                <td style={ui.td}>{a.applyClass ? className(a.applyClass) : "—"}</td><td style={ui.td}>{a.phone || "—"}</td><td style={ui.td}>{a.createdAt.slice(0, 10)}</td>
                <td style={ui.td}><Badge value={a.status} /></td>
                <td style={{ ...ui.td, textAlign: "right", whiteSpace: "nowrap" }}>
                  {a.studentId ? <Link href={`/dashboard/school/students/${a.studentId}`} style={{ color: "#4ade80", fontSize: 13 }}>Admitted as {a.student?.admissionNo} →</Link> : (
                    <>
                      <select style={{ ...ui.input, width: 130, height: 34, display: "inline-block", marginRight: 6 }} value={a.status} onChange={(e) => setStatus(a, e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}</select>
                      {a.status !== "REJECTED" && <button style={ui.btn} onClick={() => setAdmit(a)}>Admit →</button>}{" "}
                      <button style={ui.ghost} onClick={() => remove(a)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="New application" subtitle="Just what you know today. The full admission form comes later, if the child is accepted." onClose={() => setOpen(false)} footer={<><button style={ui.ghost} onClick={() => setOpen(false)}>Cancel</button><button style={ui.btn} onClick={create}>Save application</button></>}>
          <ErrorLine text={error} />
          <Field label="Child's name *"><input style={ui.input} value={form.applicantName} onChange={set("applicantName")} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Guardian's name"><input style={ui.input} value={form.guardianName} onChange={set("guardianName")} /></Field>
            <Field label="Phone *"><input style={ui.input} inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="03XX-XXXXXXX" /></Field>
            <Field label="Class applying for"><ClassSelect classes={classes} value={form.applyClassId} onChange={(v) => setForm({ ...form, applyClassId: v })} /></Field>
            <Field label="Gender"><select style={ui.input} value={form.gender} onChange={set("gender")}><option value="">Select</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></Field>
            <Field label="Date of birth"><input style={ui.input} type="date" value={form.dob} onChange={set("dob")} /></Field>
            <Field label="Previous school"><input style={ui.input} value={form.previousSchool} onChange={set("previousSchool")} /></Field>
          </div>
          <Field label="Note"><textarea style={{ ...ui.input, height: 80 }} value={form.note} onChange={set("note")} placeholder="Entry test date, fee discussion, anything to remember" /></Field>
        </Modal>
      )}

      {admit && (
        <StudentForm classes={classes} title={`Admit ${admit.applicantName}`} onClose={() => setAdmit(null)}
          prefill={{ name: admit.applicantName, guardianName: admit.guardianName ?? "", phone: admit.phone ?? "", classId: admit.applyClassId ?? "", dob: admit.dob?.slice(0, 10) ?? "", gender: admit.gender ?? "", previousSchool: admit.previousSchool ?? "" }}
          onSaved={async (r) => {
            const link = await api("/api/school/applications", { method: "PATCH", body: { id: admit.id, studentId: r.id } });
            setAdmit(null);
            setNotice(link.ok ? `${r.name} admitted from application ${admit.applicationNo}.` : `${r.name} was admitted, but the application could not be linked: ${link.error}`);
            setCollect(r.admissionFee > 0 ? { id: r.id, name: r.name, fee: r.admissionFee } : null); void reload();
          }} />
      )}
    </div>
  );
}
