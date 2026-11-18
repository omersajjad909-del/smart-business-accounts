"use client";
import Link from "next/link";
import { useState } from "react";
import { api, Avatar, Badge, PhotoPicker, uploadStudentPhoto, className, ClassRow, ClassSelect, ErrorLine, Field, Modal, today, ui, useApi } from "../_ui";

type Student = { photoUrl: string | null; id: string; admissionNo: string; name: string; guardianName: string | null; phone: string | null; status: string; discount: number; class: { name: string; section: string } | null; classId: string | null };
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontWeight: 700, fontSize: 13, margin: "10px 0 14px", display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 4, height: 16, borderRadius: 2, background: "#6366f1" }} />{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0 14px" }}>{children}</div>
    </div>
  );
}

const blank = {
  name: "", gender: "", dob: "", bFormNo: "", religion: "", bloodGroup: "", classId: "", admissionDate: today(), status: "ACTIVE",
  guardianName: "", guardianRelation: "FATHER", guardianCnic: "", guardianOccupation: "", motherName: "", phone: "", alternatePhone: "",
  emergencyContact: "", emergencyPhone: "", address: "", city: "",
  previousSchool: "", previousClass: "", medicalNotes: "",
  admissionFee: "", discount: "", documents: [] as string[],
};
const DOCS: [string, string][] = [["BFORM", "B-Form copy"], ["GUARDIAN_CNIC", "Guardian CNIC copy"], ["PHOTOS", "Passport photos"], ["PREV_RESULT", "Previous result card"], ["LEAVING_CERT", "School leaving certificate"], ["VACCINATION", "Vaccination card"]];

export default function StudentsPage() {
  const [q, setQ] = useState(""); const [classId, setClassId] = useState(""); const [status, setStatus] = useState("");
  const qs = new URLSearchParams({ ...(q && { q }), ...(classId && { classId }), ...(status && { status }) }).toString();
  const { data: students, loading, reload } = useApi<Student[]>(`/api/school/students?${qs}`, []);
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [notice, setNotice] = useState("");

  async function save() {
    if (!form.name.trim()) return setError("Student name is required");
    if (!form.classId && form.status === "ACTIVE") return setError("Choose a class for an active student");
    if (!form.guardianName.trim() || !form.phone.trim()) return setError("Guardian name and phone are required");
    const r = await api("/api/school/students", { method: "POST", body: { ...form, discount: Number(form.discount || 0), admissionFee: Number(form.admissionFee || 0) } });
    if (!r.ok) return setError(r.error);
    let note = "";
    if (photo) {
      const up = await uploadStudentPhoto((r.data as { id: string }).id, photo);
      if (up.error) note = `Student admitted, but the photo was not saved: ${up.error}. You can add it from the student profile.`;
    }
    setNotice(note);
    setOpen(false); setError(""); setForm(blank); setPhoto(null); void reload();
  }
  async function setStudentStatus(id: string, s: string) {
    const r = await api("/api/school/students", { method: "PATCH", body: { id, status: s } });
    if (!r.ok) alert(r.error); else void reload();
  }
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const toggleDoc = (d: string) => setForm({ ...form, documents: form.documents.includes(d) ? form.documents.filter((x) => x !== d) : [...form.documents, d] });

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>Students</h1><p style={ui.sub}>Admissions and student records. Only ACTIVE students are billed and marked.</p></div>
        <div style={{ display: "flex", gap: 10 }}><Link href="/dashboard/school/students/promote" style={{ ...ui.ghost, textDecoration: "none" }}>Promote class</Link><button style={ui.btn} onClick={() => setOpen(true)}>+ New Admission</button></div>
      </div>
      {notice && <div style={{ ...ui.card, padding: 12, fontSize: 13, marginBottom: 14 }}>{notice}</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input style={{ ...ui.input, width: 240 }} placeholder="Search name, admission no, guardian" value={q} onChange={(e) => setQ(e.target.value)} />
        <ClassSelect classes={classes} value={classId} onChange={setClassId} allLabel="All classes" />
        <select style={{ ...ui.input, width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>{["ACTIVE", "APPLICANT", "LEFT", "GRADUATED"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Adm #", "Name", "Class", "Guardian", "Phone", "Status", ""].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!loading && students.length === 0 && <tr><td colSpan={7} style={{ ...ui.td, textAlign: "center", padding: 32 }}>No students found.</td></tr>}
            {students.map((s) => (
              <tr key={s.id}>
                <td style={{ ...ui.td, fontWeight: 700 }}>{s.admissionNo}</td><td style={{ ...ui.td, fontWeight: 600 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Avatar url={s.photoUrl} name={s.name} /><Link href={`/dashboard/school/students/${s.id}`} style={{ color: "inherit" }}>{s.name}</Link></span></td>
                <td style={ui.td}>{className(s.class)}</td><td style={ui.td}>{s.guardianName || "—"}</td><td style={ui.td}>{s.phone || "—"}</td>
                <td style={ui.td}><Badge value={s.status} /></td>
                <td style={{ ...ui.td, textAlign: "right" }}>
                  {s.status === "APPLICANT" && <button style={ui.ghost} onClick={() => setStudentStatus(s.id, "ACTIVE")}>Confirm</button>}
                  {s.status === "ACTIVE" && <button style={ui.ghost} onClick={() => confirm(`Mark ${s.name} as left?`) && setStudentStatus(s.id, "LEFT")}>Mark left</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal title="New Admission" subtitle="Fields marked * are required. Everything else can be added later from the student profile." width={820} onClose={() => setOpen(false)} footer={<><button style={ui.ghost} onClick={() => setOpen(false)}>Cancel</button><button style={ui.btn} onClick={save}>Admit student</button></>}>
          <ErrorLine text={error} />
          <Section title="Student">
            <div style={{ gridColumn: "1 / -1", marginBottom: 14 }}><PhotoPicker file={photo} name={form.name} onChange={setPhoto} onError={setError} /></div>
            <Field label="Full name *"><input style={ui.input} value={form.name} onChange={set("name")} /></Field>
            <Field label="Gender"><select style={ui.input} value={form.gender} onChange={set("gender")}><option value="">Select</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></Field>
            <Field label="Date of birth"><input style={ui.input} type="date" value={form.dob} max={today()} onChange={set("dob")} /></Field>
            <Field label="B-Form / CRC no. (13 digits)"><input style={ui.input} inputMode="numeric" value={form.bFormNo} onChange={set("bFormNo")} placeholder="3520212345671" /></Field>
            <Field label="Religion"><input style={ui.input} value={form.religion} onChange={set("religion")} /></Field>
            <Field label="Blood group"><select style={ui.input} value={form.bloodGroup} onChange={set("bloodGroup")}><option value="">Unknown</option>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g}>{g}</option>)}</select></Field>
          </Section>
          <Section title="Admission">
            <Field label="Class *"><ClassSelect classes={classes} value={form.classId} onChange={(v) => setForm({ ...form, classId: v })} /></Field>
            <Field label="Admission date"><input style={ui.input} type="date" value={form.admissionDate} onChange={set("admissionDate")} /></Field>
            <Field label="Status"><select style={ui.input} value={form.status} onChange={set("status")}><option value="ACTIVE">Active (enrolled)</option><option value="APPLICANT">Applicant (not confirmed)</option></select></Field>
            <Field label="Admission fee (one-time)"><input style={ui.input} type="number" min={0} value={form.admissionFee} onChange={set("admissionFee")} placeholder="Creates an invoice" /></Field>
            <Field label="Monthly discount / scholarship"><input style={ui.input} type="number" min={0} value={form.discount} onChange={set("discount")} /></Field>
          </Section>
          <Section title="Parent / Guardian">
            <Field label="Guardian name *"><input style={ui.input} value={form.guardianName} onChange={set("guardianName")} /></Field>
            <Field label="Relation"><select style={ui.input} value={form.guardianRelation} onChange={set("guardianRelation")}><option value="FATHER">Father</option><option value="MOTHER">Mother</option><option value="OTHER">Other</option></select></Field>
            <Field label="Guardian CNIC (13 digits)"><input style={ui.input} inputMode="numeric" value={form.guardianCnic} onChange={set("guardianCnic")} /></Field>
            <Field label="Occupation"><input style={ui.input} value={form.guardianOccupation} onChange={set("guardianOccupation")} /></Field>
            <Field label="Mother's name"><input style={ui.input} value={form.motherName} onChange={set("motherName")} /></Field>
            <Field label="Phone * (SMS alerts go here)"><input style={ui.input} inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="03XX-XXXXXXX" /></Field>
            <Field label="Alternate phone"><input style={ui.input} inputMode="tel" value={form.alternatePhone} onChange={set("alternatePhone")} /></Field>
          </Section>
          <Section title="Address & emergency contact">
            <Field label="Home address"><input style={ui.input} value={form.address} onChange={set("address")} /></Field>
            <Field label="City"><input style={ui.input} value={form.city} onChange={set("city")} /></Field>
            <Field label="Emergency contact name"><input style={ui.input} value={form.emergencyContact} onChange={set("emergencyContact")} /></Field>
            <Field label="Emergency phone"><input style={ui.input} inputMode="tel" value={form.emergencyPhone} onChange={set("emergencyPhone")} /></Field>
          </Section>
          <Section title="Previous school & health">
            <Field label="Previous school"><input style={ui.input} value={form.previousSchool} onChange={set("previousSchool")} /></Field>
            <Field label="Last class passed"><input style={ui.input} value={form.previousClass} onChange={set("previousClass")} /></Field>
            <Field label="Medical notes / allergies"><input style={ui.input} value={form.medicalNotes} onChange={set("medicalNotes")} /></Field>
          </Section>
          <div style={{ marginBottom: 18 }}>
            <span style={ui.label}>Documents received</span>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {DOCS.map(([k, l]) => <label key={k} style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={form.documents.includes(k)} onChange={() => toggleDoc(k)} />{l}</label>)}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
