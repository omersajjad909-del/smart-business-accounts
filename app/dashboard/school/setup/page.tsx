"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api, ClassRow, className, ErrorLine, Field, ui, useApi } from "../_ui";

type Setup = { steps: { key: string; done: boolean }[]; doneCount: number; total: number; complete: boolean; counts: Record<string, number> };
type Settings = { name: string; address: string; city: string; phone: string; email: string; principalName: string; registrationNo: string };
type Head = { id: string; name: string };

const STEPS = [
  { key: "profile", title: "School profile", hint: "Address and phone for receipts and certificates" },
  { key: "session", title: "Academic session", hint: "The school year you are running" },
  { key: "classes", title: "Classes & sections", hint: "Nursery to Class 10, A/B/C sections" },
  { key: "fees", title: "Fees", hint: "Fee types and the tuition for each class" },
  { key: "subjects", title: "Subjects", hint: "What each class studies" },
  { key: "people", title: "Teachers & students", hint: "Add your people" },
  { key: "finish", title: "Finish", hint: "You are ready" },
] as const;

const PRESET = ["Play Group", "Nursery", "Prep", ...Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`)];
const SECTION_LETTERS = ["A", "B", "C", "D"];

function sessionDefaults() {
  const n = new Date(); const y = n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1;
  return { name: `${y}–${String((y + 1) % 100).padStart(2, "0")}`, startsOn: `${y}-04-01`, endsOn: `${y + 1}-03-31` };
}

export default function SetupWizardPage() {
  const router = useRouter();
  const { data: setup, reload } = useApi<Setup | null>("/api/school/setup", null);
  const [i, setI] = useState(0);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const step = STEPS[i];
  const doneOf = (k: string) => setup?.steps.find((s) => s.key === k)?.done ?? false;
  const next = () => { setError(""); setNotice(""); setI((x) => Math.min(STEPS.length - 1, x + 1)); void reload(); };
  const back = () => { setError(""); setNotice(""); setI((x) => Math.max(0, x - 1)); };

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>School Setup</h1><p style={ui.sub}>A few quick steps to get your school ready. You can skip any step and come back later.</p></div>
        <Link href="/dashboard/school" style={{ ...ui.ghost, textDecoration: "none" }}>Skip setup for now</Link>
      </div>
      {setup && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}><b>{setup.doneCount} of {setup.total}</b> steps complete</div>
          <div style={{ height: 8, borderRadius: 6, background: "rgba(var(--ink),.1)", overflow: "hidden" }}><div style={{ width: `${(setup.doneCount / setup.total) * 100}%`, height: "100%", background: "#16a34a" }} /></div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,280px) 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ ...ui.card, padding: 10 }}>
          {STEPS.map((s, idx) => {
            const done = s.key === "finish" ? Boolean(setup?.complete) : doneOf(s.key);
            const on = idx === i;
            return (
              <button key={s.key} onClick={() => { setI(idx); setError(""); setNotice(""); }} style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "left", padding: "11px 12px", borderRadius: 10, border: "none", cursor: "pointer", color: "inherit", background: on ? "rgba(99,102,241,.16)" : "transparent" }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: done ? "#16a34a" : on ? "#6366f1" : "rgba(var(--ink),.25)" }}>{done ? "✓" : idx + 1}</span>
                <span><div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div><div style={{ fontSize: 11.5, opacity: 0.55 }}>{s.hint}</div></span>
              </button>
            );
          })}
        </div>

        <div style={ui.card}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>Step {i + 1}: {step.title}</div>
          <div style={{ ...ui.sub, marginBottom: 16, marginTop: 0 }}>{step.hint}</div>
          {notice && <div style={{ padding: 10, borderRadius: 10, background: "rgba(34,197,94,.1)", fontSize: 13, marginBottom: 12 }}>{notice}</div>}
          <ErrorLine text={error} />
          {step.key === "profile" && <ProfileStep onSaved={next} setError={setError} />}
          {step.key === "session" && <SessionStep onDone={next} setError={setError} setNotice={setNotice} reload={reload} />}
          {step.key === "classes" && <ClassesStep setError={setError} setNotice={setNotice} reload={reload} />}
          {step.key === "fees" && <FeesStep setError={setError} setNotice={setNotice} reload={reload} />}
          {step.key === "subjects" && <SubjectsStep setError={setError} setNotice={setNotice} reload={reload} />}
          {step.key === "people" && <PeopleStep setup={setup} />}
          {step.key === "finish" && <FinishStep setup={setup} goTo={setI} onFinish={async () => { await api("/api/school/settings", { method: "PUT", body: { dismissSetup: true } }); router.push("/dashboard/school"); }} />}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(var(--ink),.08)" }}>
            <button style={ui.ghost} disabled={i === 0} onClick={back}>← Back</button>
            {step.key !== "finish" && <div style={{ display: "flex", gap: 8 }}><button style={ui.ghost} onClick={next}>Skip for now</button><button style={ui.btn} onClick={next}>Continue →</button></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

type StepProps = { setError: (m: string) => void; setNotice: (m: string) => void; reload: () => Promise<void> | void };

function ProfileStep({ onSaved, setError }: { onSaved: () => void; setError: (m: string) => void }) {
  const { data, loading } = useApi<Settings | null>("/api/school/settings", null);
  const [form, setForm] = useState<Partial<Settings>>({});
  const v = (k: keyof Settings) => (form[k] ?? data?.[k] ?? "") as string;
  const set = (k: keyof Settings) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  async function save() {
    const r = await api("/api/school/settings", { method: "PUT", body: { address: v("address"), city: v("city"), phone: v("phone"), email: v("email"), principalName: v("principalName"), registrationNo: v("registrationNo") } });
    if (!r.ok) return setError(r.error); onSaved();
  }
  if (loading) return <div>Loading…</div>;
  return (
    <>
      <p style={{ ...ui.sub, marginTop: 0 }}>School name and logo come from your company settings ({data?.name}). Add the rest here — it appears on fee receipts, challans and certificates.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "0 14px" }}>
        <Field label="Address"><input style={ui.input} value={v("address")} onChange={set("address")} /></Field>
        <Field label="City"><input style={ui.input} value={v("city")} onChange={set("city")} /></Field>
        <Field label="Phone"><input style={ui.input} value={v("phone")} onChange={set("phone")} /></Field>
        <Field label="Email"><input style={ui.input} type="email" value={v("email")} onChange={set("email")} /></Field>
        <Field label="Principal's name"><input style={ui.input} value={v("principalName")} onChange={set("principalName")} /></Field>
        <Field label="Registration no."><input style={ui.input} value={v("registrationNo")} onChange={set("registrationNo")} /></Field>
      </div>
      <button style={ui.btn} onClick={save}>Save and continue</button>
    </>
  );
}

function SessionStep({ onDone, setError, setNotice, reload }: StepProps & { onDone: () => void }) {
  const { data, reload: reloadSessions } = useApi<{ sessions: { id: string; name: string; startsOn: string; endsOn: string; active: boolean }[] }>("/api/school/academics", { sessions: [] });
  const [f, setF] = useState(sessionDefaults());
  async function create() {
    const r = await api("/api/school/academics", { method: "POST", body: { type: "session", name: f.name, startsOn: f.startsOn, endsOn: f.endsOn, active: true } });
    if (!r.ok) return setError(r.error);
    setNotice(`Session ${f.name} created and set as current.`); void reloadSessions(); void reload();
  }
  return (
    <>
      {data.sessions.length > 0 && <div style={{ marginBottom: 16 }}>{data.sessions.map((s) => <div key={s.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(var(--ink),.06)" }}><b>{s.name}</b> <span style={ui.sub}>{s.startsOn.slice(0, 10)} → {s.endsOn.slice(0, 10)}</span> {s.active && <span style={{ color: "#4ade80", fontSize: 12 }}>● current</span>}</div>)}</div>}
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{data.sessions.length ? "Add another session" : "Create your first session"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0 14px" }}>
        <Field label="Name"><input style={ui.input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Starts on"><input style={ui.input} type="date" value={f.startsOn} onChange={(e) => setF({ ...f, startsOn: e.target.value })} /></Field>
        <Field label="Ends on"><input style={ui.input} type="date" value={f.endsOn} onChange={(e) => setF({ ...f, endsOn: e.target.value })} /></Field>
      </div>
      <div style={{ display: "flex", gap: 8 }}><button style={ui.btn} onClick={create}>Create session</button>{data.sessions.length > 0 && <button style={ui.ghost} onClick={onDone}>Continue →</button>}</div>
    </>
  );
}

function ClassesStep({ setError, setNotice, reload }: StepProps) {
  const { data: classes, reload: reloadClasses } = useApi<ClassRow[]>("/api/school/classes", []);
  const [picked, setPicked] = useState<string[]>(PRESET.slice(2, 13)); // Prep … Class 10
  const [extra, setExtra] = useState("");
  const [sections, setSections] = useState(1);
  const names = [...picked, ...extra.split(",").map((x) => x.trim()).filter(Boolean)];
  const secs = sections === 1 ? [""] : SECTION_LETTERS.slice(0, sections);
  async function create() {
    const r = await api<{ created: number }>("/api/school/classes", { method: "POST", body: { action: "bulk", names, sections: secs } });
    if (!r.ok) return setError(r.error);
    setNotice(`${r.data.created} class(es) created${r.data.created < names.length * secs.length ? " (existing ones were skipped)" : ""}.`); void reloadClasses(); void reload();
  }
  return (
    <>
      {classes.length > 0 && <div style={{ marginBottom: 16, fontSize: 13 }}><b>Already created:</b> {classes.map((c) => className(c)).join(", ")}</div>}
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Which classes does your school have?</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {PRESET.map((n) => { const on = picked.includes(n); return <button key={n} onClick={() => setPicked(on ? picked.filter((x) => x !== n) : [...picked, n])} style={{ padding: "6px 14px", borderRadius: 20, cursor: "pointer", color: "inherit", fontSize: 13, border: on ? "2px solid #6366f1" : "1px solid rgba(var(--ink),.2)", background: on ? "rgba(99,102,241,.18)" : "transparent" }}>{on ? "✓ " : ""}{n}</button>; })}
      </div>
      <Field label="Other classes (comma separated, optional)"><input style={ui.input} placeholder="Matric Science, O Level" value={extra} onChange={(e) => setExtra(e.target.value)} /></Field>
      <Field label="Sections per class">
        <select style={{ ...ui.input, width: 240 }} value={sections} onChange={(e) => setSections(Number(e.target.value))}>
          <option value={1}>No sections</option><option value={2}>2 sections (A, B)</option><option value={3}>3 sections (A, B, C)</option><option value={4}>4 sections (A–D)</option>
        </select>
      </Field>
      <button style={ui.btn} disabled={names.length === 0} onClick={create}>Create {names.length * secs.length} class(es)</button>
      <p style={ui.sub}>Classes that already exist are skipped, so it is safe to run twice.</p>
    </>
  );
}

function FeesStep({ setError, setNotice, reload }: StepProps) {
  const { data: classes, reload: reloadClasses } = useApi<ClassRow[]>("/api/school/classes", []);
  const { data: heads, reload: reloadHeads } = useApi<{ heads: Head[]; classFees: { classId: string; headId: string; amount: number }[] }>("/api/school/fee-heads", { heads: [], classFees: [] });
  const tuition = heads.heads.find((h) => h.name === "Tuition Fee");
  const amountOf = (classId: string) => heads.classFees.find((f) => f.classId === classId && f.headId === tuition?.id)?.amount ?? 0;
  async function seed() {
    const r = await api<{ created: number }>("/api/school/fee-heads", { method: "POST", body: { action: "seed" } });
    if (!r.ok) return setError(r.error); setNotice(`${r.data.created} fee types added (tuition, admission, annual, exam, transport and more).`); void reloadHeads(); void reload();
  }
  async function setFee(classId: string, value: string) {
    if (!tuition) return;
    const amount = Number(value || 0);
    if (amount === amountOf(classId)) return;
    const r = await api("/api/school/fee-heads", { method: "POST", body: { action: "set_class_fee", classId, headId: tuition.id, amount } });
    if (!r.ok) return setError(r.error); void reloadHeads(); void reloadClasses(); void reload();
  }
  return (
    <>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>1. Fee types</div>
      {heads.heads.length === 0 ? <button style={ui.btn} onClick={seed}>Add common fee types</button> : <div style={{ fontSize: 13 }}>✓ {heads.heads.length} fee types: {heads.heads.map((h) => h.name).join(", ")}</div>}
      {tuition && (
        <>
          <div style={{ fontWeight: 600, margin: "20px 0 8px" }}>2. Monthly tuition per class (Rs)</div>
          {classes.length === 0 ? <div style={ui.sub}>Create your classes in the previous step first.</div> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 10 }}>
              {classes.map((c) => <label key={c.id} style={{ fontSize: 12.5 }}>{className(c)}<input key={`${c.id}-${amountOf(c.id)}`} style={{ ...ui.input, marginTop: 4 }} type="number" min={0} placeholder="0" defaultValue={amountOf(c.id) || ""} onBlur={(e) => setFee(c.id, e.target.value)} /></label>)}
            </div>
          )}
          <p style={ui.sub}>Type an amount and click away to save. Other fees (transport, annual, exam…) are set later under <Link href="/dashboard/school/fee-structure" style={{ color: "#818cf8" }}>Fee Structure</Link>.</p>
        </>
      )}
    </>
  );
}

function SubjectsStep({ setError, setNotice, reload }: StepProps) {
  const { data: subjects, reload: reloadSubjects } = useApi<{ id: string; name: string }[]>("/api/school/subjects", []);
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  async function seed() {
    const r = await api<{ created: number }>("/api/school/subjects", { method: "POST", body: { action: "seed" } });
    if (!r.ok) return setError(r.error); setNotice(`${r.data.created} common subjects added.`); void reloadSubjects(); void reload();
  }
  async function giveAll() {
    let n = 0;
    for (const c of classes) { const r = await api<{ added: number }>("/api/school/allocations", { method: "POST", body: { action: "bulk", classId: c.id, subjectIds: subjects.map((s) => s.id) } }); if (!r.ok) return setError(r.error); n += r.data.added; }
    setNotice(`${n} subject placements created. Choose teachers for them next.`); void reload();
  }
  return (
    <>
      {subjects.length === 0 ? <button style={ui.btn} onClick={seed}>Add common subjects</button> : <div style={{ fontSize: 13, marginBottom: 14 }}>✓ {subjects.length} subjects: {subjects.map((s) => s.name).join(", ")}</div>}
      {subjects.length > 0 && classes.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button style={ui.ghost} onClick={giveAll}>Give all subjects to every class</button>
          <p style={ui.sub}>You can remove the ones a class does not study, and pick teachers, on <Link href="/dashboard/school/subjects" style={{ color: "#818cf8" }}>Subjects &amp; Teachers</Link>.</p>
        </div>
      )}
    </>
  );
}

function PeopleCard({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div style={{ ...ui.card, flex: 1, minWidth: 240 }}><div style={{ fontWeight: 700 }}>{title}</div><div style={{ fontSize: 26, fontWeight: 700, margin: "6px 0" }}>{count}</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div></div>
  );
}

function PeopleStep({ setup }: { setup: Setup | null }) {
  const c = setup?.counts ?? {};
  const lk = { ...ui.ghost, textDecoration: "none" } as const;
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      <PeopleCard title="Teachers" count={c.teachers ?? 0}><Link href="/dashboard/school/teachers" style={lk}>+ Add teachers</Link></PeopleCard>
      <PeopleCard title="Students" count={c.students ?? 0}><Link href="/dashboard/school/import" style={lk}>Import from Excel</Link><Link href="/dashboard/school/students" style={lk}>Add one by one</Link></PeopleCard>
    </div>
  );
}

function FinishStep({ setup, goTo, onFinish }: { setup: Setup | null; goTo: (i: number) => void; onFinish: () => void }) {
  if (!setup) return <div>Loading…</div>;
  const pending = STEPS.filter((s) => s.key !== "finish" && !setup.steps.find((x) => x.key === s.key)?.done);
  return (
    <>
      {pending.length === 0 ? <div style={{ padding: 14, borderRadius: 10, background: "rgba(34,197,94,.1)" }}><b>🎉 Everything is set up.</b> Your school is ready to use.</div> : (
        <>
          <div style={{ marginBottom: 10 }}>Still to do (you can finish these any time):</div>
          {pending.map((s) => <div key={s.key} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(var(--ink),.06)" }}><span>{s.title}</span><button style={ui.ghost} onClick={() => goTo(STEPS.findIndex((x) => x.key === s.key))}>Do this</button></div>)}
        </>
      )}
      <div style={{ marginTop: 18 }}><button style={ui.btn} onClick={onFinish}>Go to my school dashboard</button></div>
      <p style={ui.sub}>Next steps: build the timetable, then start marking attendance and collecting fees.</p>
    </>
  );
}
