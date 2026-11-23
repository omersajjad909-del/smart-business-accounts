"use client";
import { useState } from "react";
import { api, ClassRow, ClassSelect, ErrorLine, Field, FormSection, Modal, PhotoPicker, today, ui, uploadStudentPhoto } from "../_ui";

/** The student as the API returns it — only the fields the form reads. */
export type StudentRecord = {
  id: string; name: string; admissionNo: string; rollNo: string | null; classId: string | null; status: string; gender: string | null; dob: string | null; bFormNo: string | null;
  religion: string | null; bloodGroup: string | null; admissionDate: string; guardianName: string | null; guardianRelation: string | null; guardianCnic: string | null;
  guardianOccupation: string | null; motherName: string | null; phone: string | null; alternatePhone: string | null; emergencyContact: string | null; emergencyPhone: string | null;
  address: string | null; city: string | null; previousSchool: string | null; previousClass: string | null; medicalNotes: string | null; discount: number; documents: string[];
};

export const STUDENT_DOCS: [string, string][] = [["BFORM", "B-Form copy"], ["GUARDIAN_CNIC", "Guardian CNIC copy"], ["PHOTOS", "Passport photos"], ["PREV_RESULT", "Previous result card"], ["LEAVING_CERT", "School leaving certificate"], ["VACCINATION", "Vaccination card"]];

const fromRecord = (s?: StudentRecord) => ({
  admissionNo: s?.admissionNo ?? "", rollNo: s?.rollNo ?? "", name: s?.name ?? "", gender: s?.gender ?? "", dob: s?.dob?.slice(0, 10) ?? "", bFormNo: s?.bFormNo ?? "", religion: s?.religion ?? "",
  bloodGroup: s?.bloodGroup ?? "", classId: s?.classId ?? "", admissionDate: s?.admissionDate?.slice(0, 10) ?? today(), status: s?.status ?? "ACTIVE",
  guardianName: s?.guardianName ?? "", guardianRelation: s?.guardianRelation ?? "FATHER", guardianCnic: s?.guardianCnic ?? "", guardianOccupation: s?.guardianOccupation ?? "", motherName: s?.motherName ?? "",
  phone: s?.phone ?? "", alternatePhone: s?.alternatePhone ?? "", emergencyContact: s?.emergencyContact ?? "", emergencyPhone: s?.emergencyPhone ?? "", address: s?.address ?? "", city: s?.city ?? "",
  previousSchool: s?.previousSchool ?? "", previousClass: s?.previousClass ?? "", medicalNotes: s?.medicalNotes ?? "",
  admissionFee: "", discount: s?.discount ? String(s.discount) : "", documents: s?.documents ?? ([] as string[]),
});

export type Saved = { id: string; name: string; created: boolean; admissionFee: number; note?: string };

/** New admission and edit share this form, so a field added once appears in both. */
export function StudentForm({ student, classes, prefill, title, onClose, onSaved }: { student?: StudentRecord; classes: ClassRow[]; prefill?: Partial<ReturnType<typeof fromRecord>>; title?: string; onClose: () => void; onSaved: (r: Saved) => void }) {
  const editing = Boolean(student);
  const [form, setForm] = useState({ ...fromRecord(student), ...(student ? {} : prefill) });
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const toggleDoc = (d: string) => setForm({ ...form, documents: form.documents.includes(d) ? form.documents.filter((x) => x !== d) : [...form.documents, d] });
  const classChanged = editing && form.classId !== (student?.classId ?? "");

  async function save() {
    if (!form.name.trim()) return setError("Student name is required");
    if (!form.classId && form.status === "ACTIVE") return setError("Choose a class for an active student");
    if (!form.guardianName.trim() || !form.phone.trim()) return setError("Guardian name and phone are required");
    setBusy(true); setError("");
    const body = { ...form, discount: Number(form.discount || 0), admissionFee: Number(form.admissionFee || 0) };
    // Moving a student to another class: their old roll number belongs to the old class.
    const payload = editing ? { id: student!.id, ...body, ...(classChanged && form.rollNo === (student?.rollNo ?? "") ? { rollNo: "" } : {}) } : body;
    const r = editing ? await api("/api/school/students", { method: "PATCH", body: payload }) : await api<{ id: string }>("/api/school/students", { method: "POST", body: payload });
    if (!r.ok) { setBusy(false); return setError(r.error); }

    const id = editing ? student!.id : (r.data as { id: string }).id;
    let note: string | undefined;
    if (photo && !editing) {
      const up = await uploadStudentPhoto(id, photo);
      if (up.error) note = `Student admitted, but the photo was not saved: ${up.error}. You can add it from the student profile.`;
    }
    setBusy(false);
    onSaved({ id, name: form.name, created: !editing, admissionFee: editing ? 0 : Number(form.admissionFee || 0), note });
  }

  return (
    <Modal title={title ?? (editing ? `Edit ${student!.name}` : "New Admission")} subtitle={editing ? "Change anything below and save. The photo is changed from the student profile." : "Fields marked * are required. Everything else can be added later from the student profile."} width={820} onClose={onClose}
      footer={<><button style={ui.ghost} onClick={onClose}>Cancel</button><button style={ui.btn} disabled={busy} onClick={save}>{editing ? "Save changes" : "Admit student"}</button></>}>
      <ErrorLine text={error} />
      <FormSection title="Student">
        {!editing && <div style={{ gridColumn: "1 / -1", marginBottom: 14 }}><PhotoPicker file={photo} name={form.name} onChange={setPhoto} onError={setError} /></div>}
        <Field label="Full name *"><input style={ui.input} value={form.name} onChange={set("name")} /></Field>
        <Field label="Gender"><select style={ui.input} value={form.gender} onChange={set("gender")}><option value="">Select</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></Field>
        <Field label="Date of birth"><input style={ui.input} type="date" value={form.dob} max={today()} onChange={set("dob")} /></Field>
        <Field label="B-Form / CRC no. (13 digits)"><input style={ui.input} inputMode="numeric" value={form.bFormNo} onChange={set("bFormNo")} placeholder="3520212345671" /></Field>
        <Field label="Religion"><input style={ui.input} value={form.religion} onChange={set("religion")} /></Field>
        <Field label="Blood group"><select style={ui.input} value={form.bloodGroup} onChange={set("bloodGroup")}><option value="">Unknown</option>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g}>{g}</option>)}</select></Field>
      </FormSection>
      <FormSection title="Admission">
        <Field label="Admission no. (GR no.)"><input style={ui.input} value={form.admissionNo} onChange={set("admissionNo")} placeholder="Leave empty — assigned automatically" /></Field>
        <Field label="Class *"><ClassSelect classes={classes} value={form.classId} onChange={(v) => setForm({ ...form, classId: v })} /></Field>
        <Field label="Roll no. (in this class)"><input style={ui.input} value={classChanged && form.rollNo === (student?.rollNo ?? "") ? "" : form.rollNo} onChange={set("rollNo")} placeholder={editing && classChanged ? "Enter a roll no. for the new class" : "Leave empty — next free number"} /></Field>
        <Field label="Admission date"><input style={ui.input} type="date" value={form.admissionDate} onChange={set("admissionDate")} /></Field>
        <Field label="Status"><select style={ui.input} value={form.status} onChange={set("status")}>
          <option value="ACTIVE">Active (enrolled)</option><option value="APPLICANT">Applicant (not confirmed)</option>{editing && <><option value="LEFT">Left school</option><option value="GRADUATED">Graduated</option></>}
        </select></Field>
        {!editing && <Field label="Admission fee (one-time)"><input style={ui.input} type="number" min={0} value={form.admissionFee} onChange={set("admissionFee")} placeholder="Creates an invoice" /></Field>}
        <Field label="Monthly discount / scholarship"><input style={ui.input} type="number" min={0} value={form.discount} onChange={set("discount")} /></Field>
      </FormSection>
      <FormSection title="Parent / Guardian">
        <Field label="Guardian name *"><input style={ui.input} value={form.guardianName} onChange={set("guardianName")} /></Field>
        <Field label="Relation"><select style={ui.input} value={form.guardianRelation} onChange={set("guardianRelation")}><option value="FATHER">Father</option><option value="MOTHER">Mother</option><option value="OTHER">Other</option></select></Field>
        <Field label="Guardian CNIC (13 digits)"><input style={ui.input} inputMode="numeric" value={form.guardianCnic} onChange={set("guardianCnic")} /></Field>
        <Field label="Occupation"><input style={ui.input} value={form.guardianOccupation} onChange={set("guardianOccupation")} /></Field>
        <Field label="Mother's name"><input style={ui.input} value={form.motherName} onChange={set("motherName")} /></Field>
        <Field label="Phone * (SMS alerts go here)"><input style={ui.input} inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="03XX-XXXXXXX" /></Field>
        <Field label="Alternate phone"><input style={ui.input} inputMode="tel" value={form.alternatePhone} onChange={set("alternatePhone")} /></Field>
      </FormSection>
      <FormSection title="Address & emergency contact">
        <Field label="Home address"><input style={ui.input} value={form.address} onChange={set("address")} /></Field>
        <Field label="City"><input style={ui.input} value={form.city} onChange={set("city")} /></Field>
        <Field label="Emergency contact name"><input style={ui.input} value={form.emergencyContact} onChange={set("emergencyContact")} /></Field>
        <Field label="Emergency phone"><input style={ui.input} inputMode="tel" value={form.emergencyPhone} onChange={set("emergencyPhone")} /></Field>
      </FormSection>
      <FormSection title="Previous school & health">
        <Field label="Previous school"><input style={ui.input} value={form.previousSchool} onChange={set("previousSchool")} /></Field>
        <Field label="Last class passed"><input style={ui.input} value={form.previousClass} onChange={set("previousClass")} /></Field>
        <Field label="Medical notes / allergies"><input style={ui.input} value={form.medicalNotes} onChange={set("medicalNotes")} /></Field>
      </FormSection>
      <div style={{ marginBottom: 6 }}>
        <span style={ui.label}>Documents received</span>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {STUDENT_DOCS.map(([k, l]) => <label key={k} style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={form.documents.includes(k)} onChange={() => toggleDoc(k)} />{l}</label>)}
        </div>
      </div>
    </Modal>
  );
}
