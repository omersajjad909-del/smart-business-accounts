"use client";
import Link from "next/link";
import { use, useRef, useState } from "react";
import { api, Avatar, Badge, className, money, Stat, ui, uploadTeacherPhoto, useApi } from "../../_ui";
import { EMPLOYMENT, TEACHER_DOCS, TeacherForm, type TeacherRecord } from "../_form";

type Profile = {
  teacher: TeacherRecord & { employeeNo: string; status: string };
  classSubjects: { id: string; class: { name: string; section: string }; subject: { name: string } }[];
  timetable: { id: string; day: number; periodNo: number; startTime: string; subject: { name: string }; class: { name: string; section: string } }[];
  weeklyPeriods: number;
};
const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useApi<Profile | null>(`/api/school/teachers/${id}`, null);
  const [editing, setEditing] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (loading) return <div style={ui.page}>Loading…</div>;
  if (error || !data) return <div style={ui.page}>{error || "Teacher not found"} <Link href="/dashboard/school/teachers">← Back</Link></div>;
  const t = data.teacher;
  const v = (x: string | number | null | undefined) => (x === null || x === undefined || x === "" ? "—" : String(x));

  async function onPick(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setPhotoMsg("Photo must be under 2MB");
    setPhotoMsg("Uploading…");
    const r = await uploadTeacherPhoto(id, file);
    setPhotoMsg(r.error ?? ""); if (!r.error) void reload();
  }
  async function removePhoto() {
    if (!confirm("Remove this photo?")) return;
    const r = await api(`/api/school/teachers/photo?teacherId=${id}`, { method: "DELETE" });
    setPhotoMsg(r.ok ? "" : r.error); if (r.ok) void reload();
  }
  const info: [string, string][] = [
    ["Gender", v(t.gender)], ["Date of birth", t.dob ? t.dob.slice(0, 10) : "—"], ["CNIC", v(t.cnic)], ["Father / husband", v(t.fatherName)], ["Blood group", v(t.bloodGroup)],
    ["Phone", v(t.phone)], ["Email", v(t.email)], ["Address", [t.address, t.city].filter(Boolean).join(", ") || "—"], ["Emergency contact", t.emergencyContact ? `${t.emergencyContact} · ${v(t.emergencyPhone)}` : "—"],
    ["Designation", v(t.designation)], ["Employment", t.employmentType ? EMPLOYMENT[t.employmentType] : "—"], ["Joined", t.joiningDate.slice(0, 10)], ["Monthly salary", t.monthlySalary != null ? money(t.monthlySalary) : "—"],
    ["Qualification", v(t.qualification)], ["Can teach", v(t.specialization)], ["Experience", t.experienceYears != null ? `${t.experienceYears} years` : "—"], ["Previous employer", v(t.previousInstitute)],
    ["Documents", t.documents.length ? t.documents.map((d) => TEACHER_DOCS.find(([k]) => k === d)?.[1] ?? d).join(", ") : "None received"],
  ];

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <Avatar url={t.photoUrl} name={t.name} size={84} />
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { void onPick(e.target.files?.[0]); e.target.value = ""; }} />
            <div style={{ marginTop: 6, display: "flex", gap: 6, justifyContent: "center" }}>
              <button style={{ ...ui.ghost, padding: "4px 8px", fontSize: 11 }} onClick={() => fileRef.current?.click()}>{t.photoUrl ? "Change" : "Add photo"}</button>
              {t.photoUrl && <button style={{ ...ui.ghost, padding: "4px 8px", fontSize: 11 }} onClick={removePhoto}>Remove</button>}
            </div>
            {photoMsg && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4, maxWidth: 150 }}>{photoMsg}</div>}
          </div>
          <div>
            <Link href="/dashboard/school/teachers" style={{ ...ui.sub, textDecoration: "none" }}>← Teachers</Link>
            <h1 style={{ ...ui.h1, marginTop: 6 }}>{t.name} <Badge value={t.status} /></h1>
            <p style={ui.sub}>{t.employeeNo}{t.designation ? ` · ${t.designation}` : ""}</p>
          </div>
        </div>
        <button style={ui.btn} onClick={() => setEditing(true)}>Edit profile</button>
      </div>

      <div style={ui.grid}>
        <Stat label="Subjects assigned" value={data.classSubjects.length} /><Stat label="Periods per week" value={data.weeklyPeriods} hint="From the timetable" />
        <Stat label="Classes" value={new Set(data.classSubjects.map((c) => className(c.class))).size} />
      </div>

      <div style={{ ...ui.card, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Profile</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}>{info.map(([k, x]) => <div key={k}><span style={ui.label}>{k}</span><div>{x}</div></div>)}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 20, alignItems: "start" }}>
        <div style={ui.card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Classes &amp; subjects</div>
          {data.classSubjects.length === 0 ? <div style={ui.sub}>Not assigned yet. <Link href="/dashboard/school/subjects" style={{ color: "#818cf8" }}>Assign subjects →</Link></div> :
            data.classSubjects.map((c) => <div key={c.id} style={{ padding: "7px 0", borderBottom: "1px solid rgba(var(--ink),.06)" }}><strong>{c.subject.name}</strong> <span style={ui.sub}>· {className(c.class)}</span></div>)}
        </div>
        <div style={ui.card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Weekly timetable</div>
          {data.timetable.length === 0 ? <div style={ui.sub}>No periods yet. <Link href="/dashboard/school/timetable" style={{ color: "#818cf8" }}>Build the timetable →</Link></div> :
            data.timetable.map((e) => <div key={e.id} style={{ padding: "7px 0", borderBottom: "1px solid rgba(var(--ink),.06)", fontSize: 13 }}><strong>{DAYS[e.day]} · P{e.periodNo}</strong> <span style={ui.sub}>{e.startTime}</span> — {e.subject.name}, {className(e.class)}</div>)}
        </div>
      </div>
      {editing && <TeacherForm teacher={t} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); void reload(); }} />}
    </div>
  );
}
