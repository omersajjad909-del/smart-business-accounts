"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AddChargeModal } from "../fees/_AddCharge";
import { api, Avatar, className, ErrorLine, Field, money, Stat, StepTitle, ui, useApi } from "../_ui";

type Match = { id: string; name: string; admissionNo: string; guardianName: string | null; phone: string | null; photoUrl: string | null; class: { name: string; section: string } | null };
type Invoice = { id: string; period: string; title: string; dueDate: string; payable: number; paid: number; balance: number; lateFee: number; daysOverdue?: number; status: string };
type Result = { receiptNo: string; paymentId: string; amount: number; title: string; period: string };

export default function CollectFeePage() {
  return <Suspense fallback={<div style={ui.page}>Loading…</div>}><CollectFee /></Suspense>;
}

function CollectFee() {
  const presetId = useSearchParams().get("student");
  const [q, setQ] = useState("");
  const [student, setStudent] = useState<Match | null>(null);
  // Arriving from a new admission (or a student profile): the student is already chosen.
  const { data: preset } = useApi<{ student: Match } | null>(presetId ? `/api/school/students/${presetId}` : null, null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (preset?.student) setStudent((cur) => cur ?? preset.student); }, [preset]);
  const { data: matches } = useApi<Match[]>(!student && q.trim().length >= 2 ? `/api/school/students?status=ACTIVE&q=${encodeURIComponent(q.trim())}` : null, []);
  const { data: fees, loading, reload } = useApi<{ invoices: Invoice[] }>(student ? `/api/school/fees?studentId=${student.id}` : null, { invoices: [] });

  const [charge, setCharge] = useState(false);
  const [flash, setFlash] = useState<{ msg: string; paymentId?: string } | null>(null);
  // Before anyone is chosen: everyone who owes something, so the page is never an empty box.
  const { data: owing } = useApi<{ invoices: (Invoice & { studentId: string; student: { name: string; admissionNo: string; class: { name: string; section: string } | null } })[] }>(student ? null : "/api/school/fees?status=OUTSTANDING", { invoices: [] });
  const debtors = [...owing.invoices.reduce((m, i) => { const c = m.get(i.studentId) ?? { id: i.studentId, name: i.student.name, admissionNo: i.student.admissionNo, class: i.student.class, total: 0, overdue: false }; c.total += i.balance; if ((i.daysOverdue ?? 0) > 0) c.overdue = true; m.set(i.studentId, c); return m; }, new Map<string, { id: string; name: string; admissionNo: string; class: { name: string; section: string } | null; total: number; overdue: boolean }>()).values()].sort((a, b) => b.total - a.total);

  async function billThisMonth() {
    if (!student) return;
    const now = new Date(); const period = now.toISOString().slice(0, 7);
    const settings = await api<{ feeDueDay: number }>("/api/school/settings");
    const day = String(settings.ok ? settings.data.feeDueDay : 10).padStart(2, "0");
    const heads = await api<{ heads: { id: string; frequency: string; active: boolean }[] }>("/api/school/fee-heads");
    const headIds = heads.ok ? heads.data.heads.filter((h) => h.active && h.frequency === "MONTHLY").map((h) => h.id) : [];
    const r = await api<{ created: number; skipped: number; noFee: number }>("/api/school/fees", { method: "POST", body: { action: "generate", period, dueDate: `${period}-${day}`, studentId: student.id, headIds } });
    if (!r.ok) return setError(r.error);
    setError("");
    setFlash({ msg: r.data.created > 0 ? `${r.data.created} fee line(s) billed for ${period}.` : r.data.noFee > 0 ? "Nothing was billed: this student's class has no fee amount set yet. Set it under Fee Structure." : `${period} fees were already billed for this student.` });
    void reload();
  }

  const due = fees.invoices.filter((i) => i.balance > 0.005).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const [off, setOff] = useState<Set<string>>(new Set());                  // invoices un-ticked by the cashier
  const chosen = due.filter((i) => !off.has(i.id));
  const totalChosen = chosen.reduce((s, i) => s + i.balance, 0);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Result[] | null>(null);

  const pay = amount === "" ? totalChosen : Number(amount);
  function pickStudent(m: Match) { setFlash(null); setStudent(m); setQ(""); setOff(new Set()); setAmount(""); setError(""); setDone(null); }
  const toggle = (id: string) => setOff((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function receive() {
    if (!(pay > 0)) return setError("Enter the amount received");
    if (pay > totalChosen + 0.005) return setError(`The amount is more than the selected dues (${money(totalChosen)})`);
    setBusy(true); setError("");
    // Money goes to the oldest due date first; each invoice gets its own receipt.
    let left = pay; const results: Result[] = [];
    for (const inv of chosen) {
      if (left <= 0.005) break;
      const part = Math.min(left, inv.balance);
      const r = await api<{ id: string; receiptNo: string }>("/api/school/fees", { method: "POST", body: { action: "pay", invoiceId: inv.id, amount: part, method } });
      if (!r.ok) { setError(`${inv.title} (${inv.period}): ${r.error}${results.length ? ` — ${results.length} receipt(s) were already issued.` : ""}`); break; }
      results.push({ receiptNo: r.data.receiptNo, paymentId: r.data.id, amount: part, title: inv.title, period: inv.period });
      left -= part;
    }
    setBusy(false);
    if (results.length) { setDone(results); setAmount(""); void reload(); }
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>Collect Fee</h1><p style={ui.sub}>Find the student, see what is due, take the payment and print the receipt</p></div>
        <Link href="/dashboard/school/fees" style={{ ...ui.ghost, textDecoration: "none" }}>Fee Ledger →</Link>
      </div>

      <div style={{ ...ui.card, marginBottom: 20 }}>
        <StepTitle n={1} title="Find the student" hint="Type the name, admission number, guardian name or phone number" done={Boolean(student)} />
        {student ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar url={student.photoUrl} name={student.name} size={48} />
              <div><div style={{ fontWeight: 700, fontSize: 16 }}>{student.name}</div><div style={ui.sub}>Adm {student.admissionNo} · {className(student.class)} · Guardian: {student.guardianName || "—"}{student.phone ? ` · ${student.phone}` : ""}</div></div>
            </div>
            <button style={ui.ghost} onClick={() => { setStudent(null); setDone(null); }}>Change student</button>
          </div>
        ) : (
          <>
            <input style={{ ...ui.input, maxWidth: 460 }} placeholder="Start typing…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            {q.trim().length >= 2 && (
              <div style={{ border: "1px solid rgba(var(--ink),.12)", borderRadius: 12, marginTop: 8, maxWidth: 560, overflow: "hidden" }}>
                {matches.length === 0 && <div style={{ padding: 12, fontSize: 13 }}>No active student found.</div>}
                {matches.slice(0, 8).map((m) => (
                  <button key={m.id} onClick={() => pickStudent(m)} style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderBottom: "1px solid rgba(var(--ink),.06)", background: "transparent", color: "inherit", cursor: "pointer" }}>
                    <Avatar url={m.photoUrl} name={m.name} size={34} />
                    <span><b>{m.name}</b> <span style={ui.sub}>· Adm {m.admissionNo} · {className(m.class)}</span><br /><span style={{ fontSize: 12, opacity: 0.6 }}>Guardian: {m.guardianName || "—"}{m.phone ? ` · ${m.phone}` : ""}</span></span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {!student && (
        <div style={{ ...ui.card, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Students with unpaid fees</div>
          <p style={{ ...ui.sub, marginTop: 0 }}>Click a name to collect. Not listed? The student may have no invoice yet — search above, then use <b>+ Add charge</b> or <b>Bill this month&apos;s fees</b>.</p>
          {debtors.length === 0 ? <div style={ui.sub}>No unpaid fees right now. To bill a student, search for them above, or generate the month&apos;s invoices from the <Link href="/dashboard/school/fees" style={{ color: "#818cf8" }}>Fee Ledger</Link>.</div> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
              {debtors.slice(0, 18).map((d) => (
                <button key={d.id} onClick={() => pickStudent({ id: d.id, name: d.name, admissionNo: d.admissionNo, guardianName: null, phone: null, photoUrl: null, class: d.class })} style={{ textAlign: "left", padding: 12, borderRadius: 12, cursor: "pointer", color: "inherit", border: "1px solid rgba(var(--ink),.14)", background: "rgba(var(--ink),.03)" }}>
                  <div style={{ fontWeight: 700 }}>{d.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>Adm {d.admissionNo} · {className(d.class)}</div>
                  <div style={{ marginTop: 4, fontWeight: 700, color: d.overdue ? "#f87171" : undefined }}>{money(d.total)}{d.overdue ? " · overdue" : ""}</div>
                </button>
              ))}
            </div>
          )}
          <p style={{ ...ui.sub, marginBottom: 0 }}>New student? <Link href="/dashboard/school/students" style={{ color: "#818cf8" }}>Admit a student →</Link></p>
        </div>
      )}

      {flash && (
        <div style={{ ...ui.card, marginBottom: 20, borderColor: "rgba(34,197,94,.4)", background: "rgba(34,197,94,.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>✓ {flash.msg}</span>
          {flash.paymentId && <Link href={`/dashboard/school/print?kind=receipt&id=${flash.paymentId}`} target="_blank" style={{ ...ui.ghost, textDecoration: "none" }}>🖨 Print receipt</Link>}
        </div>
      )}

      {done && (
        <div style={{ ...ui.card, marginBottom: 20, borderColor: "rgba(34,197,94,.4)", background: "rgba(34,197,94,.08)" }}>
          <strong>✓ {money(done.reduce((s, r) => s + r.amount, 0))} received from {student?.name}.</strong>
          <div style={{ marginTop: 8 }}>
            {done.map((r) => (
              <div key={r.paymentId} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", fontSize: 13, borderBottom: "1px solid rgba(var(--ink),.08)" }}>
                <span>{r.receiptNo} · {r.title} ({r.period}) · {money(r.amount)}</span>
                <Link href={`/dashboard/school/print?kind=receipt&id=${r.paymentId}`} style={{ ...ui.ghost, textDecoration: "none", padding: "3px 10px" }} target="_blank">🖨 Print receipt</Link>
              </div>
            ))}
          </div>
          <button style={{ ...ui.btn, marginTop: 12 }} onClick={() => { setStudent(null); setDone(null); }}>Collect from another student</button>
        </div>
      )}

      {student && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <button style={ui.btn} onClick={() => setCharge(true)}>+ Add charge</button>
            <button style={ui.ghost} onClick={billThisMonth}>🧾 Bill this month&apos;s fees</button>
            <Link href={`/dashboard/school/students/${student.id}`} style={{ ...ui.ghost, textDecoration: "none" }}>Student profile</Link>
          </div>
          <div style={ui.grid}>
            <Stat label="Total due" value={money(due.reduce((s, i) => s + i.balance, 0))} hint={`${due.length} unpaid invoice${due.length === 1 ? "" : "s"}`} />
            <Stat label="Selected to pay" value={money(totalChosen)} hint={`${chosen.length} invoice${chosen.length === 1 ? "" : "s"}`} />
          </div>

          <div style={{ ...ui.card, padding: 0, overflowX: "auto", marginBottom: 20 }}>
            <div style={{ padding: "16px 20px 4px" }}><StepTitle n={2} title="What is due" hint="Untick anything the parent is not paying today" /></div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["", "Fee", "Month", "Due date", "Fee", "Late fee", "Balance"].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
              <tbody>
                {!loading && due.length === 0 && <tr><td colSpan={7} style={{ ...ui.td, textAlign: "center", padding: 28 }}>🎉 Nothing is due for {student.name}. To bill something, use <b>+ Add charge</b> (a one-off like a trip or fine) or <b>Bill this month&apos;s fees</b> above.</td></tr>}
                {due.map((i) => (
                  <tr key={i.id} style={{ opacity: off.has(i.id) ? 0.45 : 1 }}>
                    <td style={ui.td}><input type="checkbox" checked={!off.has(i.id)} onChange={() => toggle(i.id)} /></td>
                    <td style={{ ...ui.td, fontWeight: 600 }}>{i.title}</td><td style={ui.td}>{i.period}</td>
                    <td style={ui.td}>{i.dueDate.slice(0, 10)}{(i.daysOverdue ?? 0) > 0 && <div style={{ fontSize: 11, color: "#f87171" }}>{i.daysOverdue} day(s) late</div>}</td>
                    <td style={ui.td}>{money(i.payable - i.lateFee - i.paid < 0 ? 0 : i.payable - i.lateFee)}</td>
                    <td style={{ ...ui.td, color: i.lateFee > 0 ? "#f87171" : undefined }}>{i.lateFee > 0 ? `+ ${money(i.lateFee)}` : "—"}</td>
                    <td style={{ ...ui.td, fontWeight: 700 }}>{money(i.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {chosen.length > 0 && (
            <div style={{ ...ui.card, position: "sticky", bottom: 12, background: "var(--dk-1a1d2e, #1a1d2e)", boxShadow: "0 8px 30px rgba(0,0,0,.25)" }}>
              <StepTitle n={3} title="Receive payment" hint="Pay in full, or enter a smaller amount — the oldest dues are cleared first" />
              <ErrorLine text={error} />
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
                <Field label="Amount received (Rs)"><input style={{ ...ui.input, width: 190 }} type="number" min={1} max={totalChosen} placeholder={String(Math.round(totalChosen))} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
                <Field label="Method"><select style={{ ...ui.input, width: 170 }} value={method} onChange={(e) => setMethod(e.target.value)}>{["CASH", "BANK", "JAZZCASH", "EASYPAISA", "OTHER"].map((m) => <option key={m}>{m}</option>)}</select></Field>
                <div style={{ marginBottom: 14 }}><button style={ui.btn} disabled={busy} onClick={receive}>{busy ? "Saving…" : `Receive ${money(pay)}`}</button></div>
                {pay > 0 && pay < totalChosen - 0.005 && <div style={{ marginBottom: 18, fontSize: 13, color: "#fbbf24" }}>Balance after this: {money(totalChosen - pay)}</div>}
              </div>
            </div>
          )}
        </>
      )}
      {charge && student && <AddChargeModal student={{ id: student.id, name: student.name }} onClose={() => setCharge(false)} onSaved={(m, pid) => { setCharge(false); setFlash({ msg: m, paymentId: pid }); void reload(); }} />}
    </div>
  );
}
