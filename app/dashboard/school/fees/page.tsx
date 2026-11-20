"use client";
import { useState } from "react";
import { api, Badge, ClassRow, ClassSelect, className, ErrorLine, Field, Modal, money, Stat, thisPeriod, today, ui, useApi } from "../_ui";

type Payment = { id: string; receiptNo: string; amount: number; method: string; paidAt: string };
type Invoice = {
  id: string; period: string; title: string; payable: number; paid: number; balance: number; status: string; dueDate: string; lateFee: number;
  payments: Payment[]; student: { name: string; admissionNo: string; class: { name: string; section: string } | null };
};
type Head = { id: string; name: string; frequency: string; optional: boolean; active: boolean };
type Resp = { invoices: Invoice[]; summary: { billed: number; collected: number; outstanding: number } };

export default function FeesPage() {
  const [period, setPeriod] = useState(thisPeriod());
  const [status, setStatus] = useState("");
  const [classId, setClassId] = useState("");
  const qs = new URLSearchParams({ ...(period && { period }), ...(status && { status }), ...(classId && { classId }) }).toString();
  const { data, loading, reload } = useApi<Resp>(`/api/school/fees?${qs}`, { invoices: [], summary: { billed: 0, collected: 0, outstanding: 0 } });
  const { data: classes } = useApi<ClassRow[]>("/api/school/classes", []);

  const { data: headData } = useApi<{ heads: Head[] }>("/api/school/fee-heads", { heads: [] });
  const activeHeads = headData.heads.filter((h) => h.active);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [gen, setGen] = useState(false);
  const [genForm, setGenForm] = useState({ classId: "", dueDate: today() });
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [challan, setChallan] = useState<Invoice | null>(null);
  const [pay, setPay] = useState({ amount: "", method: "CASH" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function generate() {
    const r = await api<{ created: number; skipped: number; noFee: number }>("/api/school/fees", { method: "POST", body: { action: "generate", period, ...genForm, headIds: picked ?? activeHeads.filter((h) => h.frequency === "MONTHLY").map((h) => h.id) } });
    if (!r.ok) return setError(r.error);
    setGen(false); setError("");
    setNotice(`${r.data.created} invoices created, ${r.data.skipped} already existed${r.data.noFee ? `, ${r.data.noFee} fee line(s) skipped because the class has no amount set` : ""}.`);
    void reload();
  }
  async function lateFee() {
    const v = prompt(`Late fee to add on all overdue unpaid ${period} invoices (Rs):`);
    if (!v) return;
    const r = await api<{ updated: number }>("/api/school/fees", { method: "POST", body: { action: "late_fee", period, amount: Number(v) } });
    setNotice(r.ok ? `Late fee applied to ${r.data.updated} invoices.` : r.error); void reload();
  }
  async function syncBooks() {
    const r = await api<{ posted: number; total: number }>("/api/school/fees", { method: "POST", body: { action: "sync_books" } });
    setNotice(r.ok ? `${r.data.posted} receipt(s) posted to the ledger (${r.data.total} total).` : r.error);
  }
  async function collect() {
    if (!payFor) return;
    const r = await api<{ receiptNo: string; booked?: boolean }>("/api/school/fees", { method: "POST", body: { action: "pay", invoiceId: payFor.id, ...pay, amount: Number(pay.amount) } });
    if (!r.ok) return setError(r.error);
    setNotice(`Receipt ${r.data.receiptNo} issued${r.data.booked === false ? " — but posting to the ledger failed, use Sync to books." : " and posted to the ledger."}`); setPayFor(null); setError(""); void reload();
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>Fee Ledger</h1><p style={ui.sub}>Invoices, receipts and balances per student</p></div>
        <div style={{ display: "flex", gap: 10 }}><button style={ui.ghost} onClick={syncBooks}>Sync to books</button><button style={ui.ghost} onClick={lateFee}>Apply late fee</button><button style={ui.btn} onClick={() => setGen(true)}>Generate {period} invoices</button></div>
      </div>
      {notice && <div style={{ ...ui.card, marginBottom: 16, padding: 12, fontSize: 13 }}>{notice}</div>}
      <div style={ui.grid}>
        <Stat label="Billed" value={money(data.summary.billed)} /><Stat label="Collected" value={money(data.summary.collected)} /><Stat label="Outstanding" value={money(data.summary.outstanding)} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input style={{ ...ui.input, width: 160 }} type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        <ClassSelect classes={classes} value={classId} onChange={setClassId} allLabel="All classes" />
        <select style={{ ...ui.input, width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option><option value="OUTSTANDING">Outstanding</option><option value="PAID">Paid</option><option value="OVERDUE">Overdue</option>
        </select>
      </div>
      <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Adm #", "Student", "Class", "Fee", "Due", "Payable", "Paid", "Balance", "Status", ""].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!loading && data.invoices.length === 0 && <tr><td colSpan={10} style={{ ...ui.td, textAlign: "center", padding: 32 }}>No invoices. Set class fees, then generate this month&apos;s invoices.</td></tr>}
            {data.invoices.map((i) => (
              <tr key={i.id}>
                <td style={ui.td}>{i.student.admissionNo}</td><td style={{ ...ui.td, fontWeight: 600 }}>{i.student.name}</td><td style={ui.td}>{className(i.student.class)}</td>
                <td style={ui.td}>{i.title}</td><td style={ui.td}>{i.dueDate.slice(0, 10)}</td>
                <td style={ui.td}>{money(i.payable)}</td><td style={ui.td}>{money(i.paid)}</td><td style={{ ...ui.td, fontWeight: 700 }}>{money(i.balance)}</td>
                <td style={ui.td}><Badge value={i.status} /></td>
                <td style={ui.td}><div style={{ display: "flex", gap: 6 }}><button style={ui.ghost} onClick={() => setChallan(i)}>Challan</button>{i.balance > 0 && <button style={ui.ghost} onClick={() => { setPayFor(i); setPay({ amount: String(i.balance), method: "CASH" }); setError(""); }}>Collect</button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {gen && (
        <Modal title={`Generate ${period} invoices`} onClose={() => setGen(false)}>
          <ErrorLine text={error} />
          <Field label="Class"><ClassSelect classes={classes} value={genForm.classId} onChange={(v) => setGenForm({ ...genForm, classId: v })} allLabel="All classes" /></Field>
          <Field label="Due date"><input style={ui.input} type="date" value={genForm.dueDate} onChange={(e) => setGenForm({ ...genForm, dueDate: e.target.value })} /></Field>
          {activeHeads.length > 0 ? (
            <Field label="Fees to bill">
              {activeHeads.map((h) => {
                const sel = picked ?? activeHeads.filter((x) => x.frequency === "MONTHLY").map((x) => x.id);
                return (
                  <label key={h.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, padding: "4px 0" }}>
                    <input type="checkbox" checked={sel.includes(h.id)} onChange={() => setPicked(sel.includes(h.id) ? sel.filter((x) => x !== h.id) : [...sel, h.id])} />
                    {h.name} <span style={ui.sub}>· {h.frequency.replace("_", " ").toLowerCase()}{h.optional ? " · enrolled students only" : ""}</span>
                  </label>
                );
              })}
            </Field>
          ) : <p style={ui.sub}>No fee types set up yet — this bills each class&apos;s single monthly fee. Add more under Fee Structure.</p>}
          <p style={ui.sub}>One-time and annual fees are never billed twice to the same student. Existing invoices are never duplicated.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}><button style={ui.ghost} onClick={() => setGen(false)}>Cancel</button><button style={ui.btn} onClick={generate}>Generate</button></div>
        </Modal>
      )}
      {payFor && (
        <Modal title={`Collect fee — ${payFor.student.name}`} onClose={() => setPayFor(null)}>
          <ErrorLine text={error} />
          <p style={ui.sub}>{payFor.title} · {payFor.period} · balance {money(payFor.balance)}</p>
          <Field label="Amount"><input style={ui.input} type="number" min={1} max={payFor.balance} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
          <Field label="Method"><select style={ui.input} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{["CASH", "BANK", "JAZZCASH", "EASYPAISA", "OTHER"].map((m) => <option key={m}>{m}</option>)}</select></Field>
          {payFor.payments.length > 0 && <p style={ui.sub}>Earlier: {payFor.payments.map((p) => `${p.receiptNo} (${money(p.amount)})`).join(", ")}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}><button style={ui.ghost} onClick={() => setPayFor(null)}>Cancel</button><button style={ui.btn} onClick={collect}>Receive payment</button></div>
        </Modal>
      )}
      {challan && (
        <Modal title="Fee Challan" onClose={() => setChallan(null)} width={640}>
          <div id="school-fee-challan" style={{ background: "#fff", color: "#172033", borderRadius: 10, padding: 28, fontFamily: "Arial,sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #4f46e5", paddingBottom: 14, marginBottom: 18 }}><div><div style={{ fontSize: 20, fontWeight: 800 }}>School Fee Challan</div><div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Keep this copy as payment reference</div></div><div style={{ textAlign: "right", fontSize: 12 }}><b>Period:</b> {challan.period}<br/><b>Due date:</b> {challan.dueDate.slice(0, 10)}</div></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13, marginBottom: 20 }}><div><b>Student</b><br/>{challan.student.name}<br/><span style={{ color: "#64748b" }}>Admission # {challan.student.admissionNo}</span></div><div><b>Class</b><br/>{className(challan.student.class)}<br/><span style={{ color: "#64748b" }}>Reference: {challan.id.slice(0, 8).toUpperCase()}</span></div></div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody><tr><td style={{ padding: "10px 0", borderTop: "1px solid #dbe2ef" }}>{challan.title}</td><td style={{ textAlign: "right", borderTop: "1px solid #dbe2ef" }}>{money(challan.payable)}</td></tr>{challan.paid > 0 && <tr><td style={{ padding: "10px 0" }}>Already paid</td><td style={{ textAlign: "right" }}>{money(challan.paid)}</td></tr>}<tr><td style={{ padding: "12px 0", fontWeight: 800, borderTop: "2px solid #4f46e5" }}>Amount payable</td><td style={{ textAlign: "right", fontWeight: 800, borderTop: "2px solid #4f46e5" }}>{money(challan.balance)}</td></tr></tbody></table>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 20, lineHeight: 1.6 }}>Pay at the school office or through the payment methods accepted by the school. Quote the admission number and challan reference when paying.</div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}><button style={ui.ghost} onClick={() => setChallan(null)}>Close</button><button style={ui.btn} onClick={() => window.print()}>Print challan</button></div>
        </Modal>
      )}
    </div>
  );
}
