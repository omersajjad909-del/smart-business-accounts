"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api, Avatar, ClassRow, className, ErrorLine, Guide, money, StepTitle, ui, useApi } from "../../_ui";

type Row = { id: string; admissionNo: string; name: string; photoUrl: string | null; balance: number };

/** Class number from a name like "Class 9" / "Grade 10" / "9th"; null for Nursery, Prep and so on. */
const gradeNo = (c: ClassRow) => { const m = /(\d+)/.exec(c.name); return m ? Number(m[1]) : null; };

export default function PromotePage() {
  const { data: classes, loading } = useApi<ClassRow[]>("/api/school/classes", []);
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const { data: students, reload } = useApi<Row[]>(from ? `/api/school/students/promote?classId=${from}` : null, []);
  const [skip, setSkip] = useState<Set<string>>(new Set());
  // Per-student override: a class id, "GRADUATE", or "" for the default chosen in step 2.
  const [dest, setDest] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [error, setError] = useState(""); const [done, setDone] = useState<{ moved: number; graduated: number; skipped: number; from: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const fromClass = classes.find((c) => c.id === from);
  // Suggest the same section of the next grade (Class 9 - A → Class 10 - A), else the next grade in any section.
  const suggested = useMemo(() => {
    if (!fromClass) return null;
    const n = gradeNo(fromClass);
    if (n === null) return null;
    const next = classes.filter((c) => gradeNo(c) === n + 1);
    return next.find((c) => c.section === fromClass.section) ?? next[0] ?? null;
  }, [fromClass, classes]);

  const picked = students.filter((s) => !skip.has(s.id));
  const effective = (id: string) => dest[id] || to;                       // where this student actually goes
  const nameOf = (target: string) => (target === "GRADUATE" ? "Graduated" : className(classes.find((c) => c.id === target)));
  const jump = (target: string) => {                                       // how many classes above the current one (null if unknown)
    const t = classes.find((c) => c.id === target);
    const a = fromClass ? gradeNo(fromClass) : null, z = t ? gradeNo(t) : null;
    return a !== null && z !== null ? z - a : null;
  };
  const isSkip = (target: string) => (jump(target) ?? 0) >= 2;
  const groups = picked.reduce<Record<string, number>>((m, st) => { const k = effective(st.id); m[k] = (m[k] ?? 0) + 1; return m; }, {});
  const withDues = picked.filter((s) => s.balance > 0.005);
  const visible = students.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.admissionNo.includes(q));
  const targetName = to === "GRADUATE" ? "Graduated (leave school)" : className(classes.find((c) => c.id === to));

  function chooseFrom(id: string) { setFrom(id); setTo(""); setSkip(new Set()); setDest({}); setReasons({}); setDone(null); setError(""); setQ(""); }
  const toggle = (id: string) => setSkip((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function run() {
    const lines = Object.entries(groups).map(([t, n]) => `${n} → ${nameOf(t)}`).join("\n");
    if (!confirm(`Confirm these moves from ${className(fromClass)}?\n\n${lines}`)) return;
    setBusy(true);
    const moves = picked.map((st) => ({ studentId: st.id, toClassId: effective(st.id), reason: isSkip(effective(st.id)) || effective(st.id) === "GRADUATE" ? reasons[st.id] ?? "" : "" }));
    const r = await api<{ moved: number; graduated: number; skipped: number }>("/api/school/students/promote", { method: "POST", body: { fromClassId: from, moves } });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setError(""); setDone({ moved: r.data.moved, graduated: r.data.graduated, skipped: r.data.skipped, from: className(fromClass) });
    setFrom(""); setTo(""); setDest({}); setReasons({}); void reload();
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>Promote Students</h1><p style={ui.sub}>Move a whole class to the next class at the end of the session, or graduate the final class</p></div>
        <Link href="/dashboard/school/students" style={{ ...ui.ghost, textDecoration: "none" }}>← Back to students</Link>
      </div>

      <Guide
        title="How promotion works"
        steps={["Pick the class you want to promote.", "Pick the class most students are moving into — or Graduate for your last class.", "Review the list. Untick anyone staying back, and use the dropdown on a row to send a student somewhere different — for example a brilliant student jumping two classes."]}
        note="Fee history, attendance and exam results stay with each student. Unpaid fees carry over. From the next billing, fees are charged at the new class's amounts."
      />

      {done && (
        <div style={{ ...ui.card, marginBottom: 20, borderColor: "rgba(34,197,94,.4)", background: "rgba(34,197,94,.08)" }}>
          <strong>✓ Promotion saved for {done.from}.</strong>
          <div style={{ ...ui.sub, marginTop: 6 }}>
            {done.moved} moved up{done.skipped ? ` (${done.skipped} skipped a class)` : ""}{done.graduated ? ` · ${done.graduated} graduated` : ""}. Each change is recorded in the student&apos;s class history.{" "}
            <Link href="/dashboard/school/students" style={{ color: "#818cf8" }}>View students</Link>
          </div>
        </div>
      )}

      <div style={{ ...ui.card, marginBottom: 20 }}>
        <StepTitle n={1} title="Which class are you promoting?" hint="Only active students are moved. Pick one class at a time." done={Boolean(from)} />
        {!loading && classes.length === 0 ? (
          <div style={ui.sub}>You have no classes yet. <Link href="/dashboard/school/classes" style={{ color: "#818cf8" }}>Add your classes first →</Link></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 12 }}>
            {classes.map((c) => {
              const on = c.id === from;
              return (
                <button key={c.id} onClick={() => chooseFrom(c.id)} disabled={c.activeStudents === 0} style={{ textAlign: "left", padding: 14, borderRadius: 12, cursor: c.activeStudents ? "pointer" : "not-allowed", opacity: c.activeStudents ? 1 : 0.45, color: "inherit", border: on ? "2px solid #6366f1" : "1px solid rgba(var(--ink),.14)", background: on ? "rgba(99,102,241,.14)" : "rgba(var(--ink),.03)" }}>
                  <div style={{ fontWeight: 700 }}>{className(c)}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(var(--ink),.55)", marginTop: 4 }}>{c.activeStudents} active student{c.activeStudents === 1 ? "" : "s"}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {from && (
        <div style={{ ...ui.card, marginBottom: 20 }}>
          <StepTitle n={2} title={`Where should ${className(fromClass)} go?`} hint="Choose the class they move into, or graduate them." done={Boolean(to)} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 12 }}>
            {suggested && (
              <Choice on={to === suggested.id} onClick={() => setTo(suggested.id)} tag="Suggested" title={className(suggested)} sub={`${suggested.activeStudents} students already there`} />
            )}
            {classes.filter((c) => c.id !== from && c.id !== suggested?.id).map((c) => (
              <Choice key={c.id} on={to === c.id} onClick={() => setTo(c.id)} title={className(c)} sub={`${c.activeStudents} students already there`} />
            ))}
            <Choice on={to === "GRADUATE"} onClick={() => setTo("GRADUATE")} tag="Final class" title="🎓 Graduate" sub="Mark as passed out — leaves school" />
          </div>
          {!suggested && <p style={{ ...ui.sub, marginTop: 10 }}>The next class could not be worked out from the name — choose it yourself above.</p>}
        </div>
      )}

      {from && to && (
        <div style={{ ...ui.card, marginBottom: 20, padding: 0 }}>
          <div style={{ padding: "18px 20px 6px" }}>
            <StepTitle n={3} title="Review the students" hint="Untick anyone who should stay in this class — for example students who did not pass." />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
              <input style={{ ...ui.input, width: 240 }} placeholder="Search name or admission no." value={q} onChange={(e) => setQ(e.target.value)} />
              <button style={ui.ghost} onClick={() => setSkip(new Set())}>Select all</button>
              <button style={ui.ghost} onClick={() => setSkip(new Set(students.map((s) => s.id)))}>Select none</button>
              <span style={ui.sub}>{picked.length} of {students.length} selected</span>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["", "Adm #", "Student", "Unpaid fees", "Moves to"].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
              <tbody>
                {visible.length === 0 && <tr><td colSpan={5} style={{ ...ui.td, textAlign: "center", padding: 24 }}>No students match.</td></tr>}
                {visible.map((s) => {
                  const on = !skip.has(s.id);
                  return (
                    <tr key={s.id} style={{ opacity: on ? 1 : 0.45 }}>
                      <td style={ui.td}><input type="checkbox" checked={on} onChange={() => toggle(s.id)} /></td>
                      <td style={ui.td}>{s.admissionNo}</td>
                      <td style={{ ...ui.td, fontWeight: 600 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Avatar url={s.photoUrl} name={s.name} size={30} />{s.name}</span></td>
                      <td style={{ ...ui.td, color: s.balance > 0 ? "#fbbf24" : undefined }}>{s.balance > 0 ? money(s.balance) : "Clear"}</td>
                      <td style={{ ...ui.td, minWidth: 250 }}>
                        {!on ? <span style={ui.sub}>Stays in {className(fromClass)}</span> : (
                          <>
                            <select style={{ ...ui.input, height: 36, borderColor: isSkip(effective(s.id)) ? "rgba(251,191,36,.7)" : undefined }} value={dest[s.id] ?? ""} onChange={(e) => setDest({ ...dest, [s.id]: e.target.value })}>
                              <option value="">→ {targetName} (same as class)</option>
                              {classes.filter((c) => c.id !== from && c.id !== to).map((c) => { const j = jump(c.id); return <option key={c.id} value={c.id}>{className(c)}{j !== null && j >= 2 ? ` — skips ${j - 1} class${j - 1 > 1 ? "es" : ""}` : ""}</option>; })}
                              {to !== "GRADUATE" && <option value="GRADUATE">🎓 Graduate</option>}
                            </select>
                            {(isSkip(effective(s.id)) || effective(s.id) === "GRADUATE") && (
                              <input style={{ ...ui.input, height: 34, marginTop: 6, fontSize: 12.5 }} placeholder={isSkip(effective(s.id)) ? "Reason, e.g. outstanding progress (optional)" : "Note (optional)"} value={reasons[s.id] ?? ""} onChange={(e) => setReasons({ ...reasons, [s.id]: e.target.value })} />
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {from && to && (
        <div style={{ ...ui.card, position: "sticky", bottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", boxShadow: "0 8px 30px rgba(0,0,0,.25)", background: "var(--dk-1a1d2e, #1a1d2e)" }}>
          <div>
            <div style={{ fontWeight: 700 }}>
              From {className(fromClass)}: {Object.entries(groups).map(([t, n], i) => <span key={t}>{i > 0 ? " · " : ""}{n} → {nameOf(t)}{isSkip(t) ? " ⏫" : ""}</span>)}
              {students.length - picked.length > 0 && <span> · {students.length - picked.length} staying</span>}
            </div>
            {withDues.length > 0 && <div style={{ fontSize: 12.5, color: "#fbbf24", marginTop: 3 }}>⚠ {withDues.length} of them have unpaid fees ({money(withDues.reduce((s, x) => s + x.balance, 0))}). The dues stay on their account.</div>}
            <ErrorLine text={error} />
          </div>
          <button style={{ ...ui.btn, opacity: picked.length ? 1 : 0.5 }} disabled={busy || picked.length === 0} onClick={run}>Confirm {picked.length} move(s)</button>
        </div>
      )}
    </div>
  );
}

function Choice({ on, onClick, title, sub, tag }: { on: boolean; onClick: () => void; title: string; sub: string; tag?: string }) {
  return (
    <button onClick={onClick} style={{ textAlign: "left", padding: 14, borderRadius: 12, cursor: "pointer", color: "inherit", border: on ? "2px solid #6366f1" : "1px solid rgba(var(--ink),.14)", background: on ? "rgba(99,102,241,.14)" : "rgba(var(--ink),.03)", position: "relative" }}>
      {tag && <span style={{ position: "absolute", top: 8, right: 8, fontSize: 10, fontWeight: 700, background: "#16a34a", color: "#fff", borderRadius: 10, padding: "2px 8px" }}>{tag}</span>}
      <div style={{ fontWeight: 700 }}>{title}</div><div style={{ fontSize: 12.5, color: "rgba(var(--ink),.55)", marginTop: 4 }}>{sub}</div>
    </button>
  );
}
