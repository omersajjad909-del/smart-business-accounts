"use client";
import { useState } from "react";
import { api, ErrorLine, Field, today, ui } from "../_ui";

type Preview = { recipients: { studentId: string; student: string; phone: string; message: string }[]; skippedNoPhone: number; willSend: number };
type Result = { sent: number; failed: { student: string; error: string }[]; notAttempted: number };

export default function MessagesPage() {
  const [kind, setKind] = useState<"fee_due" | "absent">("fee_due");
  const [date, setDate] = useState(today());
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true); setResult(null); setError("");
    const r = await api<Preview>("/api/school/notify", { method: "POST", body: { kind, date, send: false } });
    if (!r.ok) setError(r.error); else setPreview(r.data);
    setBusy(false);
  }
  async function send() {
    if (!preview || !confirm(`Send ${preview.willSend} message(s) to guardians now? This uses your SMS balance.`)) return;
    setBusy(true);
    const r = await api<Result>("/api/school/notify", { method: "POST", body: { kind, date, send: true } });
    if (!r.ok) setError(r.error); else { setResult(r.data); setPreview(null); }
    setBusy(false);
  }

  return (
    <div style={ui.page}>
      <div style={ui.head}><div><h1 style={ui.h1}>Guardian Messages</h1><p style={ui.sub}>Fee reminders and absence alerts. You always see who will receive what before anything is sent.</p></div></div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
        <Field label="Message type">
          <select style={{ ...ui.input, minWidth: 220 }} value={kind} onChange={(e) => { setKind(e.target.value as "fee_due" | "absent"); setPreview(null); }}>
            <option value="fee_due">Overdue fee reminder</option><option value="absent">Absent today / on date</option>
          </select>
        </Field>
        {kind === "absent" && <Field label="Date"><input style={ui.input} type="date" value={date} max={today()} onChange={(e) => { setDate(e.target.value); setPreview(null); }} /></Field>}
        <div style={{ marginBottom: 14 }}><button style={ui.btn} disabled={busy} onClick={load}>Preview recipients</button></div>
      </div>
      <ErrorLine text={error} />
      {result && (
        <div style={{ ...ui.card, marginBottom: 16 }}>
          <strong>{result.sent} sent.</strong> {result.failed.length > 0 && <span style={{ color: "#f87171" }}>{result.failed.length} failed. </span>}{result.notAttempted > 0 && <span>{result.notAttempted} not attempted.</span>}
          {result.failed.slice(0, 5).map((f) => <div key={f.student} style={ui.sub}>{f.student}: {f.error}</div>)}
        </div>
      )}
      {preview && (
        <>
          <div style={{ ...ui.card, padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Student", "Phone", "Message"].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
              <tbody>
                {preview.recipients.length === 0 && <tr><td colSpan={3} style={{ ...ui.td, textAlign: "center", padding: 28 }}>Nobody to message.</td></tr>}
                {preview.recipients.map((r) => <tr key={r.studentId}><td style={{ ...ui.td, fontWeight: 600 }}>{r.student}</td><td style={ui.td}>{r.phone}</td><td style={{ ...ui.td, fontSize: 12 }}>{r.message}</td></tr>)}
              </tbody>
            </table>
          </div>
          {preview.skippedNoPhone > 0 && <p style={ui.sub}>{preview.skippedNoPhone} student(s) skipped — no guardian phone on file.</p>}
          {preview.recipients.length > 0 && <button style={{ ...ui.btn, marginTop: 14 }} disabled={busy} onClick={send}>Send {preview.willSend} message(s)</button>}
          {preview.recipients.length > preview.willSend && <p style={ui.sub}>Only the first {preview.willSend} are sent per request.</p>}
        </>
      )}
    </div>
  );
}
