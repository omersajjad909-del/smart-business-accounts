"use client";
import { useState } from "react";
import { api, ErrorLine, Field, Modal, today, ui, useApi } from "../_ui";

const SUGGESTIONS = ["Trip fee", "Fine", "Lost ID card", "Books", "Uniform", "Registration fee", "Certificate fee"];
type Match = { id: string; name: string; admissionNo: string };

/**
 * Bills one student for something outside the regular monthly fees. Pass `student` when opened from a
 * profile; without it the user searches for the student first.
 */
export function AddChargeModal({ student, onClose, onSaved }: { student?: { id: string; name: string }; onClose: () => void; onSaved: (msg: string) => void }) {
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(student ?? null);
  const [q, setQ] = useState("");
  const { data: matches } = useApi<Match[]>(!student && q.trim().length >= 2 ? `/api/school/students?status=ACTIVE&q=${encodeURIComponent(q.trim())}` : null, []);
  const [form, setForm] = useState({ title: "", amount: "", dueDate: today() });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!picked) return setError("Choose the student");
    if (!form.title.trim()) return setError("What is the charge for?");
    if (!(Number(form.amount) > 0)) return setError("Enter the amount");
    setBusy(true);
    const r = await api("/api/school/fees", { method: "POST", body: { action: "one_off", studentId: picked.id, title: form.title.trim(), amount: Number(form.amount), dueDate: form.dueDate, period: form.dueDate.slice(0, 7) } });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onSaved(`${form.title.trim()} of Rs ${Number(form.amount).toLocaleString("en-PK")} added for ${picked.name}. It is now in the Fee Ledger — collect it from there.`);
  }

  return (
    <Modal title="Add a charge" subtitle="For anything outside the regular monthly fee — a trip, a fine, a replacement card" onClose={onClose}
      footer={<><button style={ui.ghost} onClick={onClose}>Cancel</button><button style={ui.btn} disabled={busy} onClick={save}>Add charge</button></>}>
      <ErrorLine text={error} />
      {!student && (
        <Field label="Student">
          {picked ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...ui.card, padding: "8px 12px" }}><b>{picked.name}</b><button style={ui.ghost} onClick={() => { setPicked(null); setQ(""); }}>Change</button></div>
          ) : (
            <>
              <input style={ui.input} placeholder="Type the student's name or admission no." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
              {q.trim().length >= 2 && (
                <div style={{ border: "1px solid rgba(var(--ink),.12)", borderRadius: 10, marginTop: 6, maxHeight: 180, overflowY: "auto" }}>
                  {matches.length === 0 && <div style={{ padding: 10, fontSize: 13 }} className="sub">No student found.</div>}
                  {matches.slice(0, 10).map((m) => <button key={m.id} onClick={() => setPicked({ id: m.id, name: m.name })} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "transparent", color: "inherit", cursor: "pointer", fontSize: 13 }}>{m.admissionNo} · <b>{m.name}</b></button>)}
                </div>
              )}
            </>
          )}
        </Field>
      )}
      {student && <p style={{ ...ui.sub, marginTop: 0 }}>For <b>{student.name}</b></p>}
      <Field label="What is it for?">
        <input style={ui.input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Trip fee" />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {SUGGESTIONS.map((s) => <button key={s} type="button" style={{ ...ui.ghost, padding: "4px 10px", fontSize: 12 }} onClick={() => setForm({ ...form, title: s })}>{s}</button>)}
        </div>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Amount (Rs)"><input style={ui.input} type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
        <Field label="Due date"><input style={ui.input} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
