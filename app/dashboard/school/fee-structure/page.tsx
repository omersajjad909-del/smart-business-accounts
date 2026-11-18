"use client";
import { useState } from "react";
import { api, ClassRow, className, ErrorLine, Field, Modal, money, ui, useApi } from "../_ui";

type Head = { id: string; name: string; frequency: string; optional: boolean; defaultAmount: number; active: boolean };
type Data = { heads: Head[]; classFees: { classId: string; headId: string; amount: number }[] };
const FREQ: Record<string, string> = { MONTHLY: "Every month", TERM: "Per term / exam", ANNUAL: "Once a year", ONE_TIME: "One time" };

export default function FeeStructurePage() {
  const { data, loading, reload } = useApi<Data>("/api/school/fee-heads", { heads: [], classFees: [] });
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", frequency: "MONTHLY", optional: false, defaultAmount: "" });
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");

  const classHeads = data.heads.filter((h) => !h.optional && h.active);
  const amountOf = (classId: string, headId: string) => data.classFees.find((f) => f.classId === classId && f.headId === headId)?.amount ?? 0;

  async function seed() {
    const r = await api<{ created: number }>("/api/school/fee-heads", { method: "POST", body: { action: "seed" } });
    setNotice(r.ok ? `${r.data.created} common fee types added.` : r.error); void reload();
  }
  async function create() {
    const r = await api("/api/school/fee-heads", { method: "POST", body: { action: "create", ...form, defaultAmount: Number(form.defaultAmount || 0) } });
    if (!r.ok) return setError(r.error);
    setOpen(false); setError(""); setForm({ name: "", frequency: "MONTHLY", optional: false, defaultAmount: "" }); void reload();
  }
  async function setFee(classId: string, headId: string, value: string) {
    const amount = Number(value || 0);
    if (amount === amountOf(classId, headId)) return;
    const r = await api("/api/school/fee-heads", { method: "POST", body: { action: "set_class_fee", classId, headId, amount } });
    if (!r.ok) setNotice(r.error); void reload();
  }
  async function toggle(h: Head) { await api("/api/school/fee-heads", { method: "PATCH", body: { id: h.id, active: !h.active } }); void reload(); }
  async function remove(h: Head) {
    if (!confirm(`Delete "${h.name}"? Its class amounts are removed. Invoices already issued stay as they are.`)) return;
    const r = await api(`/api/school/fee-heads?id=${h.id}`, { method: "DELETE" });
    if (!r.ok) setNotice(r.error); void reload();
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>Fee Structure</h1><p style={ui.sub}>Define the types of fee your school charges, and what each class pays for them</p></div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={ui.ghost} onClick={seed}>Add common fee types</button>
          <button style={ui.btn} onClick={() => setOpen(true)}>+ New fee type</button>
        </div>
      </div>
      {notice && <div style={{ ...ui.card, padding: 12, fontSize: 13, marginBottom: 14 }}>{notice}</div>}

      <div style={{ ...ui.card, padding: 0, overflowX: "auto", marginBottom: 24 }}>
        <div style={{ fontWeight: 700, padding: "16px 20px 6px" }}>1. Fee types</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Fee", "Billed", "Applies to", "Status", ""].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!loading && data.heads.length === 0 && <tr><td colSpan={5} style={{ ...ui.td, textAlign: "center", padding: 28 }}>No fee types yet. Click &quot;Add common fee types&quot; to start with tuition, admission, exam, transport and more.</td></tr>}
            {data.heads.map((h) => (
              <tr key={h.id} style={{ opacity: h.active ? 1 : 0.5 }}>
                <td style={{ ...ui.td, fontWeight: 600 }}>{h.name}</td><td style={ui.td}>{FREQ[h.frequency]}</td>
                <td style={ui.td}>{h.optional ? "Only enrolled students (set on student profile)" : "Whole class (set below)"}</td>
                <td style={ui.td}>{h.active ? "Active" : "Paused"}</td>
                <td style={{ ...ui.td, textAlign: "right", whiteSpace: "nowrap" }}><button style={ui.ghost} onClick={() => toggle(h)}>{h.active ? "Pause" : "Activate"}</button>{" "}<button style={ui.ghost} onClick={() => remove(h)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {classHeads.length > 0 && (
        <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
          <div style={{ fontWeight: 700, padding: "16px 20px 2px" }}>2. Amount per class</div>
          <p style={{ ...ui.sub, padding: "0 20px 10px", margin: 0 }}>Type an amount and click away to save. Leave blank or 0 if a class does not pay that fee.</p>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead><tr><th style={ui.th}>Class</th>{classHeads.map((h) => <th key={h.id} style={ui.th}>{h.name}</th>)}</tr></thead>
            <tbody>
              {classes.length === 0 && <tr><td colSpan={classHeads.length + 1} style={{ ...ui.td, textAlign: "center", padding: 24 }}>Add classes first under Classes &amp; Fee Plan.</td></tr>}
              {classes.map((c) => (
                <tr key={c.id}>
                  <td style={{ ...ui.td, fontWeight: 600 }}>{className(c)}</td>
                  {classHeads.map((h) => (
                    <td key={h.id} style={ui.td}>
                      <input key={`${c.id}-${h.id}-${amountOf(c.id, h.id)}`} style={{ ...ui.input, width: 110, height: 36 }} type="number" min={0} defaultValue={amountOf(c.id, h.id) || ""} placeholder="—" onBlur={(e) => setFee(c.id, h.id, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ ...ui.sub, marginTop: 14 }}>Tuition Fee with no amount here falls back to the single monthly fee set on the class ({classes.slice(0, 1).map((c) => money(c.monthlyFee)).join("")}). Monthly discounts apply to Tuition Fee only.</p>

      {open && (
        <Modal title="New fee type" subtitle="For example Science Lab Fee, Bus Fee, Registration Fee" onClose={() => setOpen(false)} footer={<><button style={ui.ghost} onClick={() => setOpen(false)}>Cancel</button><button style={ui.btn} onClick={create}>Create</button></>}>
          <ErrorLine text={error} />
          <Field label="Name"><input style={ui.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="How often is it billed?"><select style={ui.input} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>{Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Who pays it?">
            <select style={ui.input} value={form.optional ? "opt" : "all"} onChange={(e) => setForm({ ...form, optional: e.target.value === "opt" })}>
              <option value="all">Every student of a class (amount set per class)</option><option value="opt">Only students I enrol (e.g. transport, hostel)</option>
            </select>
          </Field>
          {form.optional && <Field label="Suggested amount"><input style={ui.input} type="number" min={0} value={form.defaultAmount} onChange={(e) => setForm({ ...form, defaultAmount: e.target.value })} /></Field>}
        </Modal>
      )}
    </div>
  );
}
