"use client";
import { Suspense, useState, type CSSProperties, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { api, money, ui, useApi } from "../_ui";

type School = { name: string; logoUrl: string | null };
const ink = "#111", line = "#999";
const dmy = (d: string | Date) => new Date(d).toLocaleDateString("en-GB", { timeZone: "UTC" });

/** Letterhead line from the school's saved settings; edits made here are saved back to them. */
function useLetterhead() {
  const { data } = useApi<{ address: string; city: string; phone: string } | null>("/api/school/settings", null);
  const [edited, setEdited] = useState<string | null>(null);
  const saved = data ? [data.address, data.city, data.phone].filter(Boolean).join(" · ") : "";
  const text = edited ?? saved;
  // Typing changes the preview; leaving the box saves it as the school's address.
  const save = (v: string) => setEdited(v);
  const persist = () => { if (edited !== null && edited !== saved) void api("/api/school/settings", { method: "PUT", body: { address: edited, city: "", phone: "" } }); };
  return [text, save, persist] as const;
}

function Letterhead({ school, address, small }: { school: School; address: string; small?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: `2px solid ${ink}`, paddingBottom: 6, marginBottom: 8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {school.logoUrl && <img src={school.logoUrl} alt="" style={{ height: small ? 34 : 52, width: "auto", objectFit: "contain" }} />}
      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: small ? 15 : 22, letterSpacing: ".3px" }}>{school.name}</div>
        {address && <div style={{ fontSize: small ? 9 : 11 }}>{address}</div>}
      </div>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: ReactNode }) => <div style={{ display: "flex", gap: 6, fontSize: 12.5, padding: "3px 0" }}><span style={{ width: 120, color: "#444" }}>{k}</span><b style={{ flex: 1 }}>{v}</b></div>;
const Sign = ({ label }: { label: string }) => <div style={{ borderTop: `1px solid ${ink}`, paddingTop: 3, fontSize: 11, textAlign: "center", width: 150 }}>{label}</div>;

/* ───────────────────────── Receipt ───────────────────────── */
type Receipt = { receiptNo: string; paidAt: string; amount: number; method: string; student: string; admissionNo: string; guardian: string | null; className: string; feeTitle: string; period: string; payable: number; paidTotal: number; balance: number };

function ReceiptDoc({ school, r, address }: { school: School; r: Receipt; address: string }) {
  return (
    <div>
      {["Office Copy", "Parent Copy"].map((copy, i) => (
        <div key={copy} style={{ border: `1px solid ${ink}`, padding: 14, margin: "0 0 16px", pageBreakInside: "avoid", borderStyle: i ? "solid" : "solid" }}>
          <Letterhead school={school} address={address} />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginBottom: 6 }}><span>FEE RECEIPT</span><span style={{ fontSize: 11 }}>{copy}</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 20 }}>
            <div><Row k="Receipt no." v={r.receiptNo} /><Row k="Date" v={dmy(r.paidAt)} /><Row k="Payment method" v={r.method} /></div>
            <div><Row k="Student" v={r.student} /><Row k="Admission no." v={r.admissionNo} /><Row k="Class" v={r.className || "—"} /><Row k="Guardian" v={r.guardian || "—"} /></div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", margin: "10px 0", fontSize: 12.5 }}>
            <thead><tr>{["Description", "Period", "Fee payable", "Received now"].map((h, k) => <th key={h} style={{ border: `1px solid ${line}`, padding: 5, textAlign: k > 1 ? "right" : "left", background: "#eee" }}>{h}</th>)}</tr></thead>
            <tbody><tr>
              <td style={{ border: `1px solid ${line}`, padding: 5 }}>{r.feeTitle}</td><td style={{ border: `1px solid ${line}`, padding: 5 }}>{r.period}</td>
              <td style={{ border: `1px solid ${line}`, padding: 5, textAlign: "right" }}>{money(r.payable)}</td><td style={{ border: `1px solid ${line}`, padding: 5, textAlign: "right", fontWeight: 700 }}>{money(r.amount)}</td>
            </tr></tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}><span>Total paid so far: <b>{money(r.paidTotal)}</b></span><span>Balance due: <b>{money(r.balance)}</b></span></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30 }}><Sign label="Received by" /><Sign label="Stamp" /></div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Challan ───────────────────────── */
type Challan = { student: string; admissionNo: string; guardian: string | null; className: string; dueDate: string; lines: { title: string; amount: number; discount: number; lateFee: number; paid: number; balance: number }[] };

function ChallanSheet({ school, c, period, address }: { school: School; c: Challan; period: string; address: string }) {
  const total = c.lines.reduce((s, l) => s + l.balance, 0);
  return (
    <div style={{ display: "flex", gap: 10, pageBreakAfter: "always", pageBreakInside: "avoid", marginBottom: 12 }}>
      {["Bank Copy", "School Copy", "Student Copy"].map((copy) => (
        <div key={copy} style={{ flex: 1, border: `1px solid ${ink}`, padding: 8, fontSize: 11 }}>
          <Letterhead school={school} address={address} small />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginBottom: 4 }}><span>FEE CHALLAN — {period}</span><span>{copy}</span></div>
          <div>Student: <b>{c.student}</b></div><div>Adm no.: <b>{c.admissionNo}</b> · Class: <b>{c.className || "—"}</b></div><div>Guardian: {c.guardian || "—"}</div><div>Due date: <b>{dmy(c.dueDate)}</b></div>
          <table style={{ width: "100%", borderCollapse: "collapse", margin: "6px 0" }}>
            <tbody>
              {c.lines.map((l) => <tr key={l.title}><td style={{ border: `1px solid ${line}`, padding: 3 }}>{l.title}{l.discount ? ` (−${money(l.discount)})` : ""}{l.lateFee ? ` (+${money(l.lateFee)} late)` : ""}</td><td style={{ border: `1px solid ${line}`, padding: 3, textAlign: "right" }}>{money(l.balance)}</td></tr>)}
              <tr><td style={{ border: `1px solid ${ink}`, padding: 3, fontWeight: 800 }}>TOTAL PAYABLE</td><td style={{ border: `1px solid ${ink}`, padding: 3, textAlign: "right", fontWeight: 800 }}>{money(total)}</td></tr>
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}><Sign label="Cashier" /><Sign label="Stamp / date" /></div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── ID cards ───────────────────────── */
type IdStudent = { name: string; admissionNo: string; photoUrl: string | null; guardianName: string | null; phone: string | null; bloodGroup: string | null; className: string };
function validTill() { const n = new Date(); return `31 Mar ${n.getMonth() >= 3 ? n.getFullYear() + 1 : n.getFullYear()}`; }

function IdCard({ school, s }: { school: School; s: IdStudent }) {
  const box: CSSProperties = { width: "85.6mm", height: "54mm", border: `1px solid ${ink}`, borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column", pageBreakInside: "avoid", background: "#fff", color: ink, boxSizing: "border-box" };
  return (
    <div style={box}>
      <div style={{ background: "#1e3a8a", color: "#fff", padding: "4px 8px", display: "flex", alignItems: "center", gap: 6, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {school.logoUrl && <img src={school.logoUrl} alt="" style={{ height: 20, background: "#fff", borderRadius: 3 }} />}
        <div style={{ fontWeight: 800, fontSize: 11, flex: 1, textAlign: "center" }}>{school.name}</div>
      </div>
      <div style={{ display: "flex", gap: 8, padding: 8, flex: 1 }}>
        <div style={{ width: "22mm", height: "27mm", border: `1px solid ${line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#777", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {s.photoUrl ? <img src={s.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "PHOTO"}
        </div>
        <div style={{ fontSize: 9.5, lineHeight: 1.5, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 2 }}>{s.name}</div>
          <div>Class: <b>{s.className || "—"}</b></div><div>Adm no.: <b>{s.admissionNo}</b></div>
          {s.guardianName && <div>Guardian: {s.guardianName}</div>}{s.phone && <div>Phone: {s.phone}</div>}{s.bloodGroup && <div>Blood group: <b>{s.bloodGroup}</b></div>}
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${line}`, fontSize: 8.5, display: "flex", justifyContent: "space-between", padding: "2px 8px" }}><span>Valid till: {validTill()}</span><span>Principal</span></div>
    </div>
  );
}

/* ───────────────────────── Certificate ───────────────────────── */
type Cert = { name: string; admissionNo: string; guardianName: string | null; guardianRelation: string | null; dob: string | null; gender: string | null; admissionDate: string; className: string };

function Certificate({ school, s, type, address, extra }: { school: School; s: Cert; type: string; address: string; extra: { date: string; conduct: string; remarks: string } }) {
  const child = s.gender === "FEMALE" ? "daughter" : s.gender === "MALE" ? "son" : "child";
  const he = s.gender === "FEMALE" ? "She" : s.gender === "MALE" ? "He" : "The student";
  const who = `${s.name}, ${child} of ${s.guardianName || "—"}`;
  return (
    <div style={{ border: `3px double ${ink}`, padding: "28px 36px", minHeight: "250mm", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <Letterhead school={school} address={address} />
      <div style={{ textAlign: "center", fontSize: 24, fontWeight: 800, letterSpacing: 2, margin: "34px 0 26px", textDecoration: "underline" }}>{type === "leaving" ? "SCHOOL LEAVING CERTIFICATE" : "CHARACTER CERTIFICATE"}</div>
      <div style={{ fontSize: 15, lineHeight: 2.1, textAlign: "justify" }}>
        {type === "leaving" ? (
          <p>This is to certify that <b>{who}</b>, bearing Admission No. <b>{s.admissionNo}</b>{s.dob ? <>, date of birth <b>{dmy(s.dob)}</b></> : null}, was admitted to this school on <b>{dmy(s.admissionDate)}</b> and was studying in <b>{s.className || "—"}</b>. {he} left the school on <b>{dmy(extra.date)}</b>. {he} has cleared all dues to the school. {he} bore a <b>{extra.conduct || "good"}</b> character during the stay at this school.</p>
        ) : (
          <p>This is to certify that <b>{who}</b>, bearing Admission No. <b>{s.admissionNo}</b>, is a student of <b>{s.className || "—"}</b> in this school since <b>{dmy(s.admissionDate)}</b>. To the best of my knowledge, {he.toLowerCase() === "the student" ? "the student" : he.toLowerCase()} bears a <b>{extra.conduct || "good"}</b> moral character and conduct.</p>
        )}
        {extra.remarks && <p>Remarks: {extra.remarks}</p>}
      </div>
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", paddingTop: 80 }}><div style={{ fontSize: 13 }}>Date: <b>{dmy(extra.date)}</b></div><Sign label="Principal" /></div>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */
function PrintInner() {
  const sp = useSearchParams();
  const kind = sp.get("kind") ?? "";
  const type = sp.get("type") ?? "leaving";
  const { data, loading, error } = useApi<Record<string, unknown> | null>(kind ? `/api/school/print?${sp.toString()}` : null, null);
  const [address, setAddress, persistAddress] = useLetterhead();
  const [extra, setExtra] = useState({ date: new Date().toISOString().slice(0, 10), conduct: "Good", remarks: "" });
  const school = (data?.school as School | undefined) ?? { name: "", logoUrl: null };
  const page = kind === "challan" ? "A4 landscape" : "A4 portrait";

  return (
    <div style={{ ...ui.page, padding: 16 }}>
      <style>{`@media print { @page { size: ${page}; margin: ${kind === "idcards" ? "8mm" : "10mm"}; } .print-doc-a4 { color: #111 !important; } }`}</style>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <button style={ui.btn} onClick={() => window.print()}>🖨 Print</button>
        <button style={ui.ghost} onClick={() => window.history.back()}>← Back</button>
        <input style={{ ...ui.input, width: 340 }} placeholder="School address & phone for the letterhead" value={address} onChange={(e) => setAddress(e.target.value)} onBlur={persistAddress} />
        {kind === "certificate" && (
          <>
            <input style={{ ...ui.input, width: 160 }} type="date" value={extra.date} onChange={(e) => setExtra({ ...extra, date: e.target.value })} />
            <input style={{ ...ui.input, width: 140 }} placeholder="Conduct" value={extra.conduct} onChange={(e) => setExtra({ ...extra, conduct: e.target.value })} />
            <input style={{ ...ui.input, width: 220 }} placeholder="Remarks (optional)" value={extra.remarks} onChange={(e) => setExtra({ ...extra, remarks: e.target.value })} />
          </>
        )}
      </div>
      {loading && <div>Loading…</div>}
      {error && <div style={{ color: "#f87171" }}>{error}</div>}
      {data && (
        <div className="print-doc-a4" style={{ background: "#fff", color: ink, padding: kind === "challan" ? 8 : 16, maxWidth: kind === "challan" ? "297mm" : "210mm", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
          {kind === "receipt" && <ReceiptDoc school={school} r={data.receipt as Receipt} address={address} />}
          {kind === "challan" && ((data.challans as Challan[]).length === 0
            ? <div style={{ padding: 30 }}>No unpaid fees for this selection — there is nothing to print.</div>
            : (data.challans as Challan[]).map((c) => <ChallanSheet key={c.admissionNo} school={school} c={c} period={String(data.period)} address={address} />))}
          {kind === "idcards" && ((data.students as IdStudent[]).length === 0
            ? <div style={{ padding: 30 }}>No active students to print.</div>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 85.6mm)", gap: "6mm", justifyContent: "center" }}>{(data.students as IdStudent[]).map((s) => <IdCard key={s.admissionNo} school={school} s={s} />)}</div>)}
          {kind === "certificate" && <Certificate school={school} s={data.student as Cert} type={type} address={address} extra={extra} />}
        </div>
      )}
    </div>
  );
}

export default function PrintPage() {
  return <Suspense fallback={<div style={ui.page}>Loading…</div>}><PrintInner /></Suspense>;
}
