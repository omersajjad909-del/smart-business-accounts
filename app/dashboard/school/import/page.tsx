"use client";
import Link from "next/link";
import { useState } from "react";
import { api, ErrorLine, Guide, PlanUsage, Stat, StepTitle, ui } from "../_ui";

const COLUMNS = ["admission_no", "name", "gender", "dob", "b_form", "religion", "class", "section", "guardian_name", "guardian_relation", "guardian_cnic", "guardian_phone", "mother_name", "address", "city", "previous_school", "admission_date", "discount", "status"];
const SAMPLE = ["", "Ali Raza", "Male", "2012-05-21", "3520112345671", "Islam", "Class 6", "A", "Raza Ahmed", "Father", "3520212345679", "03001234567", "Amina Bibi", "House 12, Model Town", "Lahore", "City Grammar School", "2026-04-01", "0", "Active"];
const ALIASES: Record<string, string> = {
  student_name: "name", full_name: "name", student: "name", adm_no: "admission_no", admission_number: "admission_no", roll_no: "admission_no", gr_no: "admission_no",
  date_of_birth: "dob", birth_date: "dob", bform: "b_form", b_form_no: "b_form", crc: "b_form", grade: "class", class_name: "class",
  father_name: "guardian_name", guardian: "guardian_name", parent_name: "guardian_name", father: "guardian_name", relation: "guardian_relation",
  cnic: "guardian_cnic", father_cnic: "guardian_cnic", phone: "guardian_phone", mobile: "guardian_phone", contact: "guardian_phone", guardian_mobile: "guardian_phone", father_phone: "guardian_phone",
  mother: "mother_name", previous_institute: "previous_school", date_of_admission: "admission_date",
};

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, commas and newlines inside quotes, BOM. */
function parseCsv(text: string): string[][] {
  const out: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && src[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((c) => c.trim())) out.push(row); row = []; }
    else cell += ch;
  }
  row.push(cell); if (row.some((c) => c.trim())) out.push(row);
  return out;
}

const norm = (h: string) => { const k = h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); return ALIASES[k] ?? k; };

type Report = { line: number; name: string; errors: string[]; warnings: string[] };
type Check = { summary: { total: number; valid: number; invalid: number; missingClasses: string[][]; seatsNeeded: number; limitError: string | null }; report: Report[] };

export default function ImportStudentsPage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [unknown, setUnknown] = useState<string[]>([]);
  const [check, setCheck] = useState<Check | null>(null);
  const [createClasses, setCreateClasses] = useState(true);
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ imported: number; skipped: number; classesCreated: number } | null>(null);

  function downloadTemplate() {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [COLUMNS, SAMPLE].map((r) => r.map(esc).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "students-import-template.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  async function onFile(file?: File) {
    setCheck(null); setDone(null); setError("");
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) return setError("Please choose a .csv file. In Excel: File → Save As → CSV.");
    if (file.size > 5 * 1024 * 1024) return setError("File is too large (max 5MB).");
    const table = parseCsv(await file.text());
    if (table.length < 2) return setError("The file has no student rows.");
    const headers = table[0].map(norm);
    setUnknown(headers.filter((h) => h && !COLUMNS.includes(h)));
    const data = table.slice(1).map((cells) => Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? "").trim()])));
    setRows(data); setFileName(file.name);
  }

  async function runCheck() {
    setBusy(true); setError("");
    const r = await api<Check>("/api/school/import", { method: "POST", body: { rows, dryRun: true } });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setCheck(r.data);
  }

  async function runImport() {
    if (!check) return;
    if (!confirm(`Import ${check.summary.valid} student(s) now?`)) return;
    setBusy(true); setError("");
    const r = await api<{ imported: number; skipped: number; classesCreated: number }>("/api/school/import", { method: "POST", body: { rows, dryRun: false, createClasses, skipInvalid } });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDone(r.data); setCheck(null); setRows([]); setFileName("");
  }

  const bad = check?.report.filter((r) => r.errors.length) ?? [];
  const blocked = !check || Boolean(check.summary.limitError) || check.summary.valid === 0 || (check.summary.invalid > 0 && !skipInvalid) || (check.summary.missingClasses.length > 0 && !createClasses);

  return (
    <div style={ui.page}>
      <div style={ui.head}>
        <div><h1 style={ui.h1}>Import Students</h1><p style={ui.sub}>Bring your existing student records in from Excel — no need to type each one</p></div>
        <Link href="/dashboard/school/students" style={{ ...ui.ghost, textDecoration: "none" }}>← Back to students</Link>
      </div>
      <Guide title="How importing works" steps={["Download the template and fill it in Excel (one student per row), then save as CSV.", "Choose the file here. We check every row before anything is saved.", "Fix any rows we flag, or skip them, then import."]} note="Only name, class, guardian name and guardian phone are required. Leave admission_no empty and we number the students for you. Dates can be 2012-05-21 or 21/05/2012." />
      <PlanUsage compact />

      {done && (
        <div style={{ ...ui.card, marginBottom: 20, borderColor: "rgba(34,197,94,.4)", background: "rgba(34,197,94,.08)" }}>
          <strong>✓ {done.imported} student(s) imported.</strong>
          <div style={{ ...ui.sub, marginTop: 6 }}>{done.skipped ? `${done.skipped} row(s) skipped. ` : ""}{done.classesCreated ? `${done.classesCreated} new class(es) created — set their fees under Classes & Fee Plan. ` : ""}<Link href="/dashboard/school/students" style={{ color: "#818cf8" }}>View students →</Link></div>
        </div>
      )}

      <div style={{ ...ui.card, marginBottom: 20 }}>
        <StepTitle n={1} title="Get the template" hint="It has every column we understand, with one example row." done={rows.length > 0} />
        <button style={ui.ghost} onClick={downloadTemplate}>⬇ Download CSV template</button>
        <div style={{ ...ui.sub, marginTop: 10 }}>Columns: {COLUMNS.join(", ")}</div>
      </div>

      <div style={{ ...ui.card, marginBottom: 20 }}>
        <StepTitle n={2} title="Choose your filled file" hint="A .csv file, up to 2,000 students at a time." done={Boolean(check)} />
        <label style={{ ...ui.ghost, display: "inline-block", cursor: "pointer" }}>
          {fileName ? "Choose a different file" : "Choose CSV file"}
          <input type="file" accept=".csv,text/csv" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {fileName && <span style={{ marginLeft: 12, fontSize: 13 }}>{fileName} — {rows.length} row(s)</span>}
        {unknown.length > 0 && <div style={{ fontSize: 12.5, color: "#fbbf24", marginTop: 10 }}>These columns are not recognised and will be ignored: {unknown.join(", ")}</div>}
        <ErrorLine text={error} />
        {rows.length > 0 && !check && <div style={{ marginTop: 14 }}><button style={ui.btn} disabled={busy} onClick={runCheck}>{busy ? "Checking…" : "Check file"}</button></div>}
      </div>

      {check && (
        <div style={{ ...ui.card, marginBottom: 20 }}>
          <StepTitle n={3} title="Review, then import" hint="Nothing has been saved yet." />
          <div style={ui.grid}>
            <Stat label="Rows in file" value={check.summary.total} /><Stat label="Ready to import" value={check.summary.valid} />
            <Stat label="With errors" value={check.summary.invalid} hint={check.summary.invalid ? "Fix or skip them" : undefined} />
            <Stat label="Seats needed" value={check.summary.seatsNeeded} hint="Active students only" />
          </div>
          {check.summary.limitError && <div style={{ padding: 12, borderRadius: 10, background: "rgba(220,38,38,.1)", border: "1px solid rgba(220,38,38,.4)", marginBottom: 14, fontSize: 13 }}>{check.summary.limitError}</div>}
          {check.summary.missingClasses.length > 0 && (
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10, fontSize: 13 }}>
              <input type="checkbox" checked={createClasses} onChange={(e) => setCreateClasses(e.target.checked)} />
              <span>Create the {check.summary.missingClasses.length} class(es) that do not exist yet: <b>{check.summary.missingClasses.map(([n, s]) => (s ? `${n} - ${s}` : n)).join(", ")}</b></span>
            </label>
          )}
          {check.summary.invalid > 0 && (
            <label style={{ display: "flex", gap: 8, marginBottom: 14, fontSize: 13 }}>
              <input type="checkbox" checked={skipInvalid} onChange={(e) => setSkipInvalid(e.target.checked)} />Skip the {check.summary.invalid} row(s) with errors and import the rest
            </label>
          )}
          {bad.length > 0 && (
            <div style={{ overflowX: "auto", border: "1px solid rgba(var(--ink),.1)", borderRadius: 12, marginBottom: 14, maxHeight: 320, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Row", "Student", "Problem"].map((h) => <th key={h} style={ui.th}>{h}</th>)}</tr></thead>
                <tbody>{bad.slice(0, 200).map((r) => <tr key={r.line}><td style={ui.td}>{r.line}</td><td style={{ ...ui.td, fontWeight: 600 }}>{r.name || "—"}</td><td style={{ ...ui.td, color: "#f87171" }}>{r.errors.join(" · ")}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={{ ...ui.btn, opacity: blocked ? 0.5 : 1 }} disabled={blocked || busy} onClick={runImport}>{busy ? "Importing…" : `Import ${check.summary.valid} student(s)`}</button>
            <button style={ui.ghost} onClick={() => setCheck(null)}>Re-check file</button>
          </div>
        </div>
      )}
    </div>
  );
}
