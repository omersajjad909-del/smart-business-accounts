"use client";
import { useState } from "react";
import { api, ErrorLine, Field, FormSection, Modal, PhotoPicker, today, ui, uploadTeacherPhoto } from "../_ui";

export type TeacherRecord = {
  id: string; name: string; phone: string | null; email: string | null; qualification: string | null; joiningDate: string; gender: string | null; dob: string | null; cnic: string | null;
  fatherName: string | null; bloodGroup: string | null; address: string | null; city: string | null; designation: string | null; employmentType: string | null; experienceYears: number | null;
  specialization: string | null; previousInstitute: string | null; monthlySalary: number | null; emergencyContact: string | null; emergencyPhone: string | null; documents: string[]; photoUrl: string | null;
};

export const TEACHER_DOCS: [string, string][] = [["CNIC", "CNIC copy"], ["DEGREES", "Degrees / certificates"], ["EXPERIENCE_LETTER", "Experience letter"], ["APPOINTMENT_LETTER", "Signed appointment letter"], ["PHOTOS", "Passport photos"]];
export const EMPLOYMENT: Record<string, string> = { PERMANENT: "Permanent", CONTRACT: "Contract", PART_TIME: "Part time", VISITING: "Visiting faculty" };

const fromRecord = (t?: TeacherRecord) => ({
  name: t?.name ?? "", gender: t?.gender ?? "", dob: t?.dob?.slice(0, 10) ?? "", cnic: t?.cnic ?? "", fatherName: t?.fatherName ?? "", bloodGroup: t?.bloodGroup ?? "",
  phone: t?.phone ?? "", email: t?.email ?? "", address: t?.address ?? "", city: t?.city ?? "", emergencyContact: t?.emergencyContact ?? "", emergencyPhone: t?.emergencyPhone ?? "",
  designation: t?.designation ?? "", employmentType: t?.employmentType ?? "PERMANENT", joiningDate: t?.joiningDate?.slice(0, 10) ?? today(), monthlySalary: t?.monthlySalary != null ? String(t.monthlySalary) : "",
  qualification: t?.qualification ?? "", specialization: t?.specialization ?? "", experienceYears: t?.experienceYears != null ? String(t.experienceYears) : "", previousInstitute: t?.previousInstitute ?? "",
  documents: t?.documents ?? ([] as string[]),
});

/** Add / edit teacher in one place, so the two never drift apart. */
export function TeacherForm({ teacher, onClose, onSaved }: { teacher?: TeacherRecord; onClose: () => void; onSaved: (note?: string) => void }) {
  const [form, setForm] = useState(fromRecord(teacher));
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const toggleDoc = (d: string) => setForm({ ...form, documents: form.documents.includes(d) ? form.documents.filter((x) => x !== d) : [...form.documents, d] });

  async function save() {
    if (!form.name.trim()) return setError("Teacher name is required");
    if (!form.phone.trim()) return setError("Phone number is required");
    setBusy(true);
    const body = { ...form, experienceYears: form.experienceYears, monthlySalary: form.monthlySalary };
    const r = teacher
      ? await api("/api/school/teachers", { method: "PATCH", body: { id: teacher.id, ...body } })
      : await api<{ id: string }>("/api/school/teachers", { method: "POST", body });
    if (!r.ok) { setBusy(false); return setError(r.error); }
    let note: string | undefined;
    if (photo) {
      const id = teacher?.id ?? (r.data as { id: string }).id;
      const up = await uploadTeacherPhoto(id, photo);
      if (up.error) note = `Saved, but the photo was not uploaded: ${up.error}. You can add it from the teacher's profile.`;
    }
    setBusy(false);
    onSaved(note);
  }

  return (
    <Modal title={teacher ? `Edit ${teacher.name}` : "Add Teacher"} subtitle="Fields marked * are required. The rest can be filled in later." width={820} onClose={onClose}
      footer={<><button style={ui.ghost} onClick={onClose}>Cancel</button><button style={ui.btn} disabled={busy} onClick={save}>{teacher ? "Save changes" : "Add teacher"}</button></>}>
      <ErrorLine text={error} />
      {!teacher && <div style={{ marginBottom: 14 }}><PhotoPicker label="Teacher photo" file={photo} name={form.name} onChange={setPhoto} onError={setError} /></div>}
      <FormSection title="Personal details">
        <Field label="Full name *"><input style={ui.input} value={form.name} onChange={set("name")} /></Field>
        <Field label="Gender"><select style={ui.input} value={form.gender} onChange={set("gender")}><option value="">Select</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></Field>
        <Field label="Date of birth"><input style={ui.input} type="date" max={today()} value={form.dob} onChange={set("dob")} /></Field>
        <Field label="CNIC (13 digits)"><input style={ui.input} inputMode="numeric" value={form.cnic} onChange={set("cnic")} placeholder="3520112345671" /></Field>
        <Field label="Father / husband name"><input style={ui.input} value={form.fatherName} onChange={set("fatherName")} /></Field>
        <Field label="Blood group"><select style={ui.input} value={form.bloodGroup} onChange={set("bloodGroup")}><option value="">Unknown</option>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g}>{g}</option>)}</select></Field>
      </FormSection>
      <FormSection title="Contact">
        <Field label="Phone *"><input style={ui.input} inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="03XX-XXXXXXX" /></Field>
        <Field label="Email"><input style={ui.input} type="email" value={form.email} onChange={set("email")} /></Field>
        <Field label="Home address"><input style={ui.input} value={form.address} onChange={set("address")} /></Field>
        <Field label="City"><input style={ui.input} value={form.city} onChange={set("city")} /></Field>
        <Field label="Emergency contact name"><input style={ui.input} value={form.emergencyContact} onChange={set("emergencyContact")} /></Field>
        <Field label="Emergency phone"><input style={ui.input} inputMode="tel" value={form.emergencyPhone} onChange={set("emergencyPhone")} /></Field>
      </FormSection>
      <FormSection title="Job at this school">
        <Field label="Designation"><input style={ui.input} value={form.designation} onChange={set("designation")} placeholder="Class Teacher, Head of Maths…" /></Field>
        <Field label="Employment type"><select style={ui.input} value={form.employmentType} onChange={set("employmentType")}>{Object.entries(EMPLOYMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Joining date"><input style={ui.input} type="date" value={form.joiningDate} onChange={set("joiningDate")} /></Field>
        <Field label="Monthly salary (Rs)"><input style={ui.input} type="number" min={0} value={form.monthlySalary} onChange={set("monthlySalary")} /></Field>
      </FormSection>
      <FormSection title="Qualification & experience">
        <Field label="Highest qualification"><input style={ui.input} value={form.qualification} onChange={set("qualification")} placeholder="M.Sc Mathematics, B.Ed" /></Field>
        <Field label="Subjects they can teach"><input style={ui.input} value={form.specialization} onChange={set("specialization")} placeholder="Maths, Physics" /></Field>
        <Field label="Experience (years)"><input style={ui.input} type="number" min={0} step="0.5" value={form.experienceYears} onChange={set("experienceYears")} /></Field>
        <Field label="Previous school / employer"><input style={ui.input} value={form.previousInstitute} onChange={set("previousInstitute")} /></Field>
      </FormSection>
      <div style={{ marginBottom: 6 }}>
        <span style={ui.label}>Documents received</span>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {TEACHER_DOCS.map(([k, l]) => <label key={k} style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={form.documents.includes(k)} onChange={() => toggleDoc(k)} />{l}</label>)}
        </div>
      </div>
    </Modal>
  );
}
