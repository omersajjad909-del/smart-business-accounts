"use client";
import { useState } from "react";
import { api, ClassRow, className, ErrorLine, Field, Modal, money, ui, useApi, Guide } from "../_ui";

type Head = { id: string; name: string; frequency: string; optional: boolean; defaultAmount: number; active: boolean };
type Data = { heads: Head[]; classFees: { classId: string; headId: string; amount: number }[] };
const FREQ: Record<string, string> = { MONTHLY: "Every month", TERM: "Per term / exam", ANNUAL: "Once a year", ONE_TIME: "One time" };
const FREQ_HINT: Record<string, string> = {
  MONTHLY: "Added to every monthly invoice (e.g. Tuition, Bus fee).",
  TERM: "Billed once per term or exam session (e.g. Exam fee).",
  ANNUAL: "Billed once a year. Never charged twice to the same student in a year.",
  ONE_TIME: "Billed once in a student's life at the school (e.g. Admission fee).",
};
const SUGGESTIONS: { name: string; frequency: string; optional?: boolean }[] = [
  { name: "Science Lab Fee", frequency: "ANNUAL" }, { name: "Registration Fee", frequency: "ONE_TIME" },
  { name: "Bus Fee", frequency: "MONTHLY", optional: true }, { name: "Late Fee", frequency: "MONTHLY" },
  { name: "Event / Trip Fee", frequency: "ONE_TIME", optional: true }, { name: "Diary & Stationery", frequency: "ANNUAL" },
];

export default function FeeStructurePage() {
  const { data, loading, reload } = useApi<Data>("/api/school/fee-heads", { heads: [], classFees: [] });
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);
  const [open, setOpen] = useState(false);
  const blank = { name: "", frequency: "MONTHLY", optional: false, defaultAmount: "", allClassAmount: "" };
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");

  const classHeads = data.heads.filter((h) => !h.optional && h.active);
  const amountOf = (classId: string, headId: string) => data.classFees.find((f) => f.classId === classId && f.headId === headId)?.amount ?? 0;

  async function seed() {
    const r = await api<{ created: number }>("/api/school/fee-heads", { method: "POST", body: { action: "seed" } });
    setNotice(r.ok ? `${r.data.created} common fee types added.` : r.error); void reload();
  }
  function openNew() { setEditId(null); setForm(blank); setError(""); setOpen(true); }
  function openEdit(h: Head) {
    setEditId(h.id); setError("");
    setForm({ name: h.name, frequency: h.frequency, optional: h.optional, defaultAmount: h.defaultAmount ? String(h.defaultAmount) : "", allClassAmount: "" });
    setOpen(true);
  }
  async function create() {
    if (!form.name.trim()) return setError("Enter a name for the fee, e.g. Science Lab Fee");
    const body = { ...form, name: form.name.trim(), defaultAmount: Number(form.defaultAmount || 0), allClassAmount: Number(form.allClassAmount || 0) };
    const r = editId
      ? await api("/api/school/fee-heads", { method: "PATCH", body: { id: editId, name: body.name, frequency: body.frequency, defaultAmount: body.defaultAmount } })
      : await api("/api/school/fee-heads", { method: "POST", body: { action: "create", ...body } });
    if (!r.ok) return setError(r.error);
    setOpen(false); setError(""); setEditId(null); setForm(blank);
    setNotice(editId ? "Fee type updated." : body.allClassAmount > 0 && !body.optional ? `Fee type added with ${money(body.allClassAmount)} for every class. You can change each class below.` : "Fee type added. Now enter what each class pays in the grid below.");
    void reload();
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
          <button style={ui.btn} onClick={openNew}>+ New fee type</button>
        </div>
      </div>
      <Guide title="How the fee structure works" steps={["Add your fee types — start with “Add common fee types”.", "Enter what each class pays for each fee in the grid.", "For transport or hostel, enrol only the students who use it from their profile.", "Then generate invoices from the Fee Ledger."]} />
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
                <td style={{ ...ui.td, textAlign: "right", whiteSpace: "nowrap" }}><button style={ui.ghost} onClick={() => openEdit(h)}>Edit</button>{" "}<button style={ui.ghost} onClick={() => toggle(h)}>{h.active ? "Pause" : "Activate"}</button>{" "}<button style={ui.ghost} onClick={() => remove(h)}>Delete</button></td>
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

      <DueAndLateFee />
      <AccountingMethod />

      {open && (
        <Modal title={editId ? "Edit fee type" : "New fee type"} subtitle="For example Science Lab Fee, Bus Fee, Registration Fee" onClose={() => setOpen(false)} footer={<><button style={ui.ghost} onClick={() => setOpen(false)}>Cancel</button><button style={ui.btn} onClick={create}>{editId ? "Save changes" : "Create"}</button></>}>
          <ErrorLine text={error} />
          <Field label="Name">
            <input style={ui.input} autoFocus value={form.name} placeholder="e.g. Science Lab Fee" onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {!editId && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {SUGGESTIONS.filter((x) => !data.heads.some((h) => h.name.toLowerCase() === x.name.toLowerCase())).map((x) => (
                  <button type="button" key={x.name} style={{ ...ui.ghost, padding: "5px 10px", fontSize: 12 }} onClick={() => setForm({ ...form, name: x.name, frequency: x.frequency, optional: x.optional ?? false })}>{x.name}</button>
                ))}
              </div>
            )}
          </Field>
          <Field label="How often is it billed?">
            <select style={ui.input} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>{Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <div style={{ fontSize: 12, color: "rgba(var(--ink),.5)", marginTop: 6 }}>{FREQ_HINT[form.frequency]}</div>
          </Field>
          <Field label="Who pays it?">
            <select style={ui.input} disabled={Boolean(editId)} value={form.optional ? "opt" : "all"} onChange={(e) => setForm({ ...form, optional: e.target.value === "opt" })}>
              <option value="all">Every student of a class (amount set per class)</option><option value="opt">Only students I enrol (e.g. transport, hostel)</option>
            </select>
            <div style={{ fontSize: 12, color: "rgba(var(--ink),.5)", marginTop: 6 }}>{editId ? "This cannot be changed after the fee is created." : form.optional ? "Charged only to students you enrol from their profile, each with their own amount." : "Charged to every active student of each class that has an amount below."}</div>
          </Field>
          {form.optional
            ? <Field label="Suggested amount (optional)"><input style={ui.input} type="number" min={0} value={form.defaultAmount} placeholder="e.g. 3000" onChange={(e) => setForm({ ...form, defaultAmount: e.target.value })} /></Field>
            : !editId && <Field label="Same amount for all classes (optional)"><input style={ui.input} type="number" min={0} value={form.allClassAmount} placeholder="Leave empty to set each class separately" onChange={(e) => setForm({ ...form, allClassAmount: e.target.value })} /></Field>}
        </Modal>
      )}
    </div>
  );
}

/** How fee income reaches the books — and the one-way switch from cash to accrual. */
function AccountingMethod() {
  const { data, reload } = useApi<{ feeAccounting: "CASH" | "ACCRUAL" } | null>("/api/school/settings", null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (!data) return null;
  const accrual = data.feeAccounting === "ACCRUAL";

  async function convert() {
    if (!confirm("Switch to accrual accounting?\n\n• Every invoice already issued will be booked as income, with the unpaid part in Fee Receivable.\n• Receipts already posted will credit Fee Receivable instead of Fee Income, so income is not counted twice.\n• This cannot be undone from here.\n\nYour accountant should agree before you continue.")) return;
    setBusy(true);
    const r = await api<{ receiptsMoved: number; vouchers: number; invoices: number }>("/api/school/fees", { method: "POST", body: { action: "convert_to_accrual" } });
    setBusy(false);
    setMsg(r.ok ? `Done: ${r.data.invoices} invoice(s) booked in ${r.data.vouchers} voucher(s); ${r.data.receiptsMoved} receipt(s) re-pointed to Fee Receivable.` : r.error);
    void reload();
  }

  return (
    <div style={{ ...ui.card, marginTop: 24 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>4. How fees are recorded in your books</div>
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "3px 12px", color: "#fff", background: accrual ? "#16a34a" : "#6366f1" }}>{accrual ? "ACCRUAL" : "CASH BASIS"}</span>
      </div>
      {accrual ? (
        <p style={{ ...ui.sub, margin: 0 }}>Fee is income when it is <b>billed</b>. Unpaid fees show as <b>Fee Receivable</b> on your Balance Sheet, and collecting a fee reduces the receivable. Each billing run posts one voucher (SFB-…), each receipt one voucher (SFR-…).</p>
      ) : (
        <>
          <p style={{ ...ui.sub, margin: 0 }}>Fee is income on the day it is <b>received</b>. This is simple and fine for most schools. Unpaid fees are tracked in the Fee Ledger but do <b>not</b> appear on the Balance Sheet.</p>
          <p style={{ ...ui.sub }}>Switch to <b>accrual</b> if your accountant or auditor wants income recognised when fees are billed, with a Fee Receivable balance. Existing invoices and receipts are converted for you.</p>
          <button style={ui.ghost} disabled={busy} onClick={convert}>{busy ? "Converting…" : "Switch to accrual accounting"}</button>
        </>
      )}
      {msg && <div style={{ fontSize: 13, marginTop: 10 }}>{msg}</div>}
    </div>
  );
}

/** The school's due date and what happens to a student who pays after it. */
function DueAndLateFee() {
  const { data, reload } = useApi<{ feeDueDay: number; lateFeeType: string; lateFeeAmount: number; lateFeeGraceDays: number; lateFeeCap: number } | null>("/api/school/settings", null);
  const [edit, setEdit] = useState<{ dueDay: string; type: string; amount: string; grace: string; cap: string } | null>(null);
  const [msg, setMsg] = useState("");
  if (!data) return null;
  const f = edit ?? { dueDay: String(data.feeDueDay), type: data.lateFeeType, amount: String(data.lateFeeAmount || ""), grace: String(data.lateFeeGraceDays), cap: String(data.lateFeeCap || "") };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setEdit({ ...f, [k]: e.target.value });

  async function save() {
    const r = await api("/api/school/settings", { method: "PUT", body: { feeDueDay: Number(f.dueDay), lateFeeType: f.type, lateFeeAmount: Number(f.amount || 0), lateFeeGraceDays: Number(f.grace || 0), lateFeeCap: Number(f.cap || 0) } });
    setMsg(r.ok ? "Saved." : r.error); if (r.ok) { setEdit(null); void reload(); }
  }
  const day = Number(f.dueDay) || 10, amt = Number(f.amount || 0), grace = Number(f.grace || 0), cap = Number(f.cap || 0);
  const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
  const lastFree = day + grace;
  const fineAfter = (late: number) => (f.type === "FLAT" ? amt : f.type === "PER_DAY" ? (cap > 0 ? Math.min(cap, amt * late) : amt * late) : 0);

  return (
    <div style={{ ...ui.card, marginTop: 24 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>3. Due date &amp; late fee</div>
      <p style={{ ...ui.sub, marginTop: 0 }}>Students pay between the 1st and the due day. Whoever pays after it gets the late fee automatically — no need to add it by hand.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0 14px" }}>
        <Field label="Fee due on the … of every month"><input style={ui.input} type="number" min={1} max={28} value={f.dueDay} onChange={set("dueDay")} /></Field>
        <Field label="Late fee">
          <select style={ui.input} value={f.type} onChange={set("type")}>
            <option value="NONE">No late fee</option><option value="FLAT">One fixed fine after the due date</option><option value="PER_DAY">Fine for every day late</option>
          </select>
        </Field>
        {f.type !== "NONE" && <Field label={f.type === "FLAT" ? "Fine (Rs)" : "Fine per day (Rs)"}><input style={ui.input} type="number" min={0} value={f.amount} onChange={set("amount")} /></Field>}
        {f.type !== "NONE" && <Field label="Grace days after due date"><input style={ui.input} type="number" min={0} max={60} value={f.grace} onChange={set("grace")} /></Field>}
        {f.type === "PER_DAY" && <Field label="Maximum fine (Rs, optional)"><input style={ui.input} type="number" min={0} value={f.cap} onChange={set("cap")} placeholder="No limit" /></Field>}
      </div>
      <div style={{ padding: 12, borderRadius: 10, background: "rgba(99,102,241,.08)", fontSize: 13, marginBottom: 12 }}>
        {f.type === "NONE" ? <>Fee is due on the <b>{ord(day)}</b>. Students who pay later are not fined.</> : (
          <>
            Fee is due on the <b>{ord(day)}</b>{grace > 0 ? <> (fine starts after the <b>{ord(lastFree)}</b>)</> : null}.<br />
            Pays on the 3rd, 4th or 5th → <b>no fine</b>. Pays on the {ord(lastFree)} → <b>no fine</b>.<br />
            Pays on the {ord(lastFree + 1)} → <b>Rs {fineAfter(1).toLocaleString("en-PK")}</b>{f.type === "PER_DAY" ? <>; on the {ord(lastFree + 5)} → <b>Rs {fineAfter(5).toLocaleString("en-PK")}</b></> : null}.
          </>
        )}
      </div>
      <button style={ui.btn} onClick={save}>Save rule</button>
      {msg && <span style={{ marginLeft: 12, fontSize: 13 }}>{msg}</span>}
    </div>
  );
}
