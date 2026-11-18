"use client";
import { useState } from "react";
import { api, ClassRow, ErrorLine, Field, Modal, money, ui, useApi } from "../_ui";

export default function ClassesPage() {
  const { data: classes, loading, reload } = useApi<ClassRow[]>("/api/school/classes", []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", section: "", monthlyFee: "" });
  const [error, setError] = useState("");

  async function save() {
    const r = await api("/api/school/classes", { method: "POST", body: { ...form, monthlyFee: Number(form.monthlyFee || 0) } });
    if (!r.ok) return setError(r.error);
    setOpen(false); setError(""); setForm({ name: "", section: "", monthlyFee: "" }); void reload();
  }
  async function remove(id: string) {
    if (!confirm("Delete this class?")) return;
    const r = await api(`/api/school/classes?id=${id}`, { method: "DELETE" });
    if (!r.ok) alert(r.error); else void reload();
  }
  async function editFee(c: ClassRow) {
    const v = prompt(`Monthly fee for ${c.name} ${c.section}`, String(c.monthlyFee));
    if (v === null) return;
    const r = await api("/api/school/classes", { method: "PATCH", body: { id: c.id, monthlyFee: Number(v) } });
    if (!r.ok) alert(r.error); else void reload();
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>Classes & Fees</h1><p style={ui.sub}>Set each class&apos;s monthly tuition fee — invoices are generated from this</p></div>
        <button style={ui.btn} onClick={() => setOpen(true)}>+ Add Class</button>
      </div>
      <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Class", "Section", "Monthly Fee", "Active Students", ""].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!loading && classes.length === 0 && <tr><td colSpan={5} style={{ ...ui.td, textAlign: "center", padding: 32 }}>No classes yet. Add your first class.</td></tr>}
            {classes.map((c) => (
              <tr key={c.id}>
                <td style={{ ...ui.td, fontWeight: 600 }}>{c.name}</td><td style={ui.td}>{c.section || "—"}</td>
                <td style={ui.td}>{money(c.monthlyFee)}</td><td style={ui.td}>{c.activeStudents}</td>
                <td style={{ ...ui.td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <button style={ui.ghost} onClick={() => editFee(c)}>Edit fee</button>{" "}
                  <button style={ui.ghost} onClick={() => remove(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal title="Add Class" onClose={() => setOpen(false)}>
          <ErrorLine text={error} />
          <Field label="Class name"><input style={ui.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Class 9" /></Field>
          <Field label="Section (optional)"><input style={ui.input} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" /></Field>
          <Field label="Monthly tuition fee"><input style={ui.input} type="number" min={0} value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button style={ui.ghost} onClick={() => setOpen(false)}>Cancel</button><button style={ui.btn} onClick={save}>Save</button></div>
        </Modal>
      )}
    </div>
  );
}
