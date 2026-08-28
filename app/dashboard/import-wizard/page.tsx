"use client";
// FILE: app/dashboard/import-wizard/page.tsx
//
// Upload a file from the old system, see exactly how it was read, then commit.
//
// The preview step is the reason this screen was rewritten. The first version
// took a file and wrote it straight to the database — no look, no undo. That is
// tolerable for twenty rows a shopkeeper typed and indefensible for five
// thousand accounts out of a system somebody has run for a decade: one column
// read wrong is a whole chart of accounts filed under the wrong heads, and the
// only way back is a database restore.
//
// So nothing is written until the operator has seen their own data mapped. The
// dry run is the same code path as the commit (see app/api/import/route.ts), so
// the preview cannot promise one thing and the import do another.

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { getCurrentUser } from "@/lib/auth";
import { useResponsive } from "@/hooks/useResponsive";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import {
  IMPORT_SOURCES,
  IMPORT_DATA_TYPES,
  type ImportSourceId,
  type ImportDataType,
} from "@/lib/importEngine";
import { planImport, type ImportChunk, type ImportPlan } from "@/lib/importChunker";
import { readXlsx } from "@/lib/xlsxRead";

const FONT = "'Outfit','Inter',sans-serif";
const MONO = "ui-monospace,'Cascadia Code','SF Mono',Consolas,monospace";

const card: React.CSSProperties = {
  background: "var(--panel-bg)",
  border: "1px solid var(--border)",
  borderRadius: 14,
};

/** Which data types need a date, and what that date means for each. */
const DATE_LABEL: Partial<Record<ImportDataType, string>> = {
  opening_balances: "Cutover date — the balances are as at this date",
  opening_stock: "Cutover date — the stock count is as at this date",
};

/**
 * Ledger history is per party, and a ledger printed for one party names it in
 * the report header rather than in a column — which the export drops. Typed
 * here it stands in for every row that has no party of its own.
 */
const PARTY_TYPES = new Set<ImportDataType>(["ledger_history"]);

type PreviewRow = {
  line: number;
  value: Record<string, unknown> | null;
  error?: string;
  warning?: string;
  matched?: string;
};

type Preview = {
  preview: true;
  dataType: ImportDataType;
  dataTypeName: string;
  headers: string[];
  delimiter: string;
  total: number;
  ok: number;
  failed: number;
  warnings: number;
  rows: PreviewRow[];
  issues: { line: number; error: string }[];
  reshaped?: string;
};

type Result = {
  success: true;
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
};

/** What a long upload is doing, so a big file is not a frozen button. */
type Progress = { label: string; done: number; total: number };

/**
 * Where a part-finished import got to, kept so closing the tab mid-migration
 * does not mean starting a two-hundred-thousand-row file again.
 *
 * The file itself is not kept — it is far too big for browser storage and it is
 * the operator's own file, sitting where they left it. What is kept is enough
 * to recognise it when they pick it again, and the point to carry on from.
 */
type Resume = {
  fileName: string;
  dataType: ImportDataType;
  chunkCount: number;
  totalRows: number;
  /** Chunks already committed. The next request starts here. */
  done: number;
  outcome: { imported: number; updated: number; skipped: number; total: number };
  at: number;
};

const RESUME_KEY = "finova.import.resume";

function loadResume(): Resume | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Resume;
    // A week is longer than any migration takes and short enough that a stale
    // offer never appears next to an unrelated file.
    if (!parsed?.fileName || Date.now() - (parsed.at ?? 0) > 7 * 864e5) return null;
    return parsed;
  } catch { return null; }
}

function saveResume(state: Resume | null) {
  try {
    if (state) localStorage.setItem(RESUME_KEY, JSON.stringify(state));
    else localStorage.removeItem(RESUME_KEY);
  } catch { /* private browsing, or storage switched off — resume is a convenience */ }
}

function ImportWizardInner() {
  const { isMobile } = useResponsive();
  const params = useSearchParams();

  const [step, setStep] = useState(1);
  const [source, setSource] = useState<ImportSourceId | "">("");
  const [dataType, setDataType] = useState<ImportDataType | "">("");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [party, setParty] = useState("");

  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  // Deep link from the Import Center rows: land on the file step with the data
  // type already chosen, since that is the choice the operator just made there.
  useEffect(() => {
    const wanted = params.get("dataType");
    if (wanted && IMPORT_DATA_TYPES.some((d) => d.id === wanted)) {
      setDataType(wanted as ImportDataType);
      setStep((current) => (current === 1 ? 1 : current));
    }
  }, [params]);

  const headers = useCallback((): Record<string, string> => {
    const u = getCurrentUser();
    return u
      ? { "x-user-id": u.id, "x-user-role": u.role ?? "", "x-company-id": u.companyId || "" }
      : {};
  }, []);

  const sourceDef = useMemo(() => IMPORT_SOURCES.find((s) => s.id === source) ?? null, [source]);
  const typeDef = useMemo(() => IMPORT_DATA_TYPES.find((d) => d.id === dataType) ?? null, [dataType]);
  const orderedTypes = useMemo(
    () => [...IMPORT_DATA_TYPES].sort((a, b) => a.order - b.order),
    [],
  );

  async function readFile(file: File) {
    // Excel writes .xlsx by default and the operator will try it. Say what to
    // do rather than failing with an unreadable wall of binary.
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      setError(
        "That is an Excel workbook. Open it in Excel and use File → Save As → CSV UTF-8, then upload the .csv.",
      );
      return;
    }
    setError("");
    setFileName(file.name);
    setCsv(await file.text());
    setPreview(null);
    setResult(null);
  }

  async function runPreview() {
    if (!dataType) { setError("Pick what you are importing first."); return; }
    if (!csv.trim()) { setError("Upload a file, or paste the rows in."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({ csv, source: source || "csv", dataType, dryRun: true }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Could not read the file.");
      setPreview(body);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file.");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({ csv, source: source || "csv", dataType, date, party }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Import failed.");
      setResult(body);
      setStep(5);
      toast.success(`${body.imported + body.updated} rows imported`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setStep(1); setSource(""); setDataType(""); setCsv(""); setFileName("");
    setPreview(null); setResult(null); setError("");
  }

  /* ── Chrome ─────────────────────────────────────────────────── */

  const stepLabels = ["Source", "What", "File", "Check", "Done"];

  return (
    <div style={{
      minHeight: "100vh", background: "var(--app-bg)", color: "var(--text-primary)",
      padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: FONT,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, margin: "0 0 4px", letterSpacing: -0.5 }}>Import Wizard</h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Nothing is written until you have seen how your file was read.
          </p>
        </div>
        <Link href="/dashboard/import" style={{
          padding: "8px 15px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
          border: "1px solid var(--border)", color: "var(--text-muted)", textDecoration: "none",
        }}>
          ← Import Center
        </Link>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: isMobile ? 4 : 8, marginBottom: 22, flexWrap: "wrap" }}>
        {stepLabels.map((label, index) => {
          const number = index + 1;
          const active = step === number;
          const past = step > number;
          return (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: isMobile ? "6px 10px" : "8px 14px", borderRadius: 9,
              background: active ? "rgba(99,102,241,.14)" : "transparent",
              border: `1px solid ${active ? "rgba(99,102,241,.35)" : "var(--border)"}`,
              opacity: past || active ? 1 : 0.5,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 999, fontSize: 10, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: past ? "#22c55e" : active ? "#6366f1" : "var(--border)",
                color: past || active ? "#fff" : "var(--text-muted)",
              }}>{past ? "✓" : number}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{
          ...card, borderColor: "rgba(239,68,68,.3)", background: "rgba(239,68,68,.09)",
          padding: "12px 16px", marginBottom: 18, fontSize: 12.5, color: "#fca5a5", lineHeight: 1.6,
        }}>{error}</div>
      )}

      {/* ── Step 1: source ── */}
      {step === 1 && (
        <div style={{ ...card, padding: isMobile ? "16px 14px" : "22px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Where is the data coming from?</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16 }}>
            This only changes the instructions shown. Any CSV is read the same way.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(230px,1fr))", gap: 10 }}>
            {IMPORT_SOURCES.map((s) => (
              <button key={s.id} onClick={() => { setSource(s.id); setStep(2); }} style={{
                display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left",
                padding: "14px 15px", borderRadius: 12, cursor: "pointer",
                background: source === s.id ? "rgba(99,102,241,.1)" : "transparent",
                border: `1px solid ${source === s.id ? "rgba(99,102,241,.35)" : "var(--border)"}`,
                color: "var(--text-primary)", fontFamily: FONT,
              }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: s.color,
                  color: "#fff", fontSize: 12, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{s.badge}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>{s.name}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{s.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: data type ── */}
      {step === 2 && (
        <div style={{ ...card, padding: isMobile ? "16px 14px" : "22px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>What is in this file?</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16 }}>
            One file per step. The order matters — a balance cannot attach to an account that is not
            in the system yet.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {orderedTypes.map((d, index) => (
              <button key={d.id} onClick={() => { setDataType(d.id); setStep(3); }} style={{
                display: "flex", gap: 12, alignItems: "center", textAlign: "left",
                padding: "13px 15px", borderRadius: 11, cursor: "pointer",
                background: dataType === d.id ? "rgba(99,102,241,.1)" : "transparent",
                border: `1px solid ${dataType === d.id ? "rgba(99,102,241,.35)" : "var(--border)"}`,
                color: "var(--text-primary)", fontFamily: FONT, width: "100%",
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0, fontSize: 11, fontWeight: 800,
                  background: "rgba(255,255,255,.05)", border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{index + 1}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>
                    {d.icon} {d.name}
                  </span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{d.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(1)} style={{
            marginTop: 14, padding: "8px 15px", borderRadius: 9, fontSize: 12.5,
            background: "transparent", border: "1px solid var(--border)",
            color: "var(--text-muted)", cursor: "pointer", fontFamily: FONT,
          }}>← Back</button>
        </div>
      )}

      {/* ── Step 3: file ── */}
      {step === 3 && typeDef && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 14, alignItems: "start" }}>
          <div style={{ ...card, padding: isMobile ? "16px 14px" : "22px 24px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              {typeDef.icon} {typeDef.name}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16 }}>{typeDef.desc}</div>

            <label style={{
              display: "block", padding: "26px 18px", borderRadius: 12, cursor: "pointer",
              border: "1.5px dashed var(--border)", textAlign: "center", marginBottom: 14,
            }}>
              <input
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
              />
              <div style={{ fontSize: 26, marginBottom: 6 }}>📄</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>
                {fileName || "Choose a CSV file"}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                Comma, semicolon or tab separated. Excel: File → Save As → CSV UTF-8.
              </div>
            </label>

            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>
              …or paste the rows here (heading row included)
            </div>
            <textarea
              value={csv}
              onChange={(e) => { setCsv(e.target.value); setFileName(""); setPreview(null); }}
              rows={7}
              spellCheck={false}
              placeholder={typeDef.template.join(",")}
              style={{
                width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 10,
                background: "var(--app-bg)", border: "1px solid var(--border)",
                color: "var(--text-primary)", fontFamily: MONO, fontSize: 12, lineHeight: 1.6,
                resize: "vertical", outline: "none",
              }}
            />

            {PARTY_TYPES.has(typeDef.id) && (
              <div style={{ marginTop: 14, maxWidth: 360 }}>
                <label style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>
                  Party this ledger belongs to — name or code, exactly as it is in your accounts
                </label>
                <input
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                  placeholder="US TRADERS"
                  spellCheck={false}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 9,
                    background: "var(--app-bg)", border: "1px solid var(--border)",
                    color: "var(--text-primary)", fontSize: 13, fontFamily: FONT, outline: "none",
                  }}
                />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                  Leave blank if the file already carries a party column. The file must start with the
                  party&rsquo;s opening / B/F line, or it is refused — that line replaces the opening
                  balance imported at cutover, which is what stops the balance being counted twice.
                </div>
              </div>
            )}

            {DATE_LABEL[typeDef.id] && (
              <div style={{ marginTop: 14, maxWidth: 260 }}>
                <label style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>
                  {DATE_LABEL[typeDef.id]}
                </label>
                <DateInput
                  value={date}
                  onChange={setDate}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 9,
                    background: "var(--app-bg)", border: "1px solid var(--border)",
                    color: "var(--text-primary)", fontSize: 13, fontFamily: FONT, outline: "none",
                  }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <button onClick={runPreview} disabled={busy || !csv.trim()} style={{
                padding: "11px 22px", borderRadius: 10, border: "none",
                background: busy || !csv.trim() ? "rgba(99,102,241,.4)" : "#6366f1",
                color: "#fff", fontSize: 13.5, fontWeight: 700,
                cursor: busy || !csv.trim() ? "not-allowed" : "pointer", fontFamily: FONT,
              }}>
                {busy ? "Reading…" : "Preview →"}
              </button>
              <button onClick={() => setStep(2)} style={{
                padding: "11px 18px", borderRadius: 10, fontSize: 13,
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--text-muted)", cursor: "pointer", fontFamily: FONT,
              }}>← Back</button>
              <a href={`/api/import/template?dataType=${typeDef.id}`} style={{
                padding: "11px 18px", borderRadius: 10, fontSize: 13, textDecoration: "none",
                border: "1px solid var(--border)", color: "var(--text-muted)",
              }}>⬇ Template</a>
            </div>
          </div>

          {/* Side: how to export, and which columns are looked for */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sourceDef && (
              <div style={{ ...card, padding: "16px 18px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 9 }}>
                  Getting the file out of {sourceDef.name}
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.75 }}>
                  {sourceDef.steps.map((s) => <li key={s}>{s}</li>)}
                </ol>
              </div>
            )}
            <div style={{ ...card, padding: "16px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 9 }}>Columns we look for</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {typeDef.template.map((c) => (
                  <span key={c} style={{
                    padding: "4px 9px", borderRadius: 7, fontSize: 11, fontFamily: MONO,
                    background: "rgba(255,255,255,.05)", border: "1px solid var(--border)",
                    color: typeDef.required.includes(c) ? "#f59e0b" : "var(--text-muted)",
                  }}>{c}{typeDef.required.includes(c) ? " *" : ""}</span>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Headings are matched loosely — <code style={{ fontFamily: MONO }}>ACCOUNT_NAME</code>,{" "}
                <code style={{ fontFamily: MONO }}>Account Name</code> and{" "}
                <code style={{ fontFamily: MONO }}>Ledger Name</code> all resolve to the same column.
                Anything unrecognised is ignored, so extra columns are harmless.
                <span style={{ color: "#f59e0b" }}> *</span> is required.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: preview ── */}
      {step === 4 && preview && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Rows in file", value: preview.total, color: "var(--text-primary)" },
              { label: "Will import", value: preview.ok, color: "#22c55e" },
              { label: "Will be skipped", value: preview.failed, color: preview.failed ? "#ef4444" : "var(--text-muted)" },
              { label: "Warnings", value: preview.warnings, color: preview.warnings ? "#f59e0b" : "var(--text-muted)" },
            ].map((s) => (
              <div key={s.label} style={{ ...card, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>{s.label}</div>
                <div style={{ fontSize: 21, fontWeight: 800, color: s.color }}>{s.value.toLocaleString("en-PK")}</div>
              </div>
            ))}
          </div>

          {preview.reshaped && (
            <div style={{
              ...card, borderColor: "rgba(99,102,241,.32)", background: "rgba(99,102,241,.08)",
              padding: "13px 16px", marginBottom: 14, fontSize: 12.5, lineHeight: 1.65,
            }}>
              <b>File reshaped.</b> {preview.reshaped}
            </div>
          )}

          <div style={{ ...card, padding: "12px 16px", marginBottom: 14, fontSize: 12, color: "var(--text-muted)" }}>
            Read as <b style={{ color: "var(--text-primary)" }}>{preview.dataTypeName}</b> ·
            delimiter <code style={{ fontFamily: MONO }}>{preview.delimiter}</code> ·
            columns found: {preview.headers.join(", ") || "none"}
          </div>

          {/* The rows, as they were understood */}
          <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 700 }}>
              First {Math.min(preview.rows.length, preview.total)} rows, as FinovaOS read them
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["#", "Status", "Interpreted values"].map((h) => (
                      <th key={h} style={{
                        padding: "9px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700,
                        color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6,
                        borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.line} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "9px 14px", color: "var(--text-muted)", fontFamily: MONO }}>{row.line}</td>
                      <td style={{ padding: "9px 14px", whiteSpace: "nowrap" }}>
                        {row.error
                          ? <span style={{ color: "#ef4444", fontWeight: 700 }}>✗ skip</span>
                          : row.warning
                            ? <span style={{ color: "#f59e0b", fontWeight: 700 }}>! check</span>
                            : <span style={{ color: "#22c55e", fontWeight: 700 }}>✓ ok</span>}
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.7, wordBreak: "break-word" }}>
                          {row.value
                            ? Object.entries(row.value)
                                .filter(([, v]) => v !== "" && v !== null && v !== 0)
                                // Dates arrive as ISO strings over JSON; trim
                                // them back to the day so a row of values stays
                                // readable on one line.
                                .map(([k, v]) => `${k}=${String(v).replace(/T\d{2}:.*$/, "")}`)
                                .join("  ") || "—"
                            : "—"}
                        </div>
                        {row.matched && (
                          <div style={{ fontSize: 11, color: "#22c55e", marginTop: 3 }}>
                            → matches <b>{row.matched}</b>
                          </div>
                        )}
                        {row.error && (
                          <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>{row.error}</div>
                        )}
                        {row.warning && !row.error && (
                          <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 3 }}>{row.warning}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Every failure, including the ones past the preview window */}
          {preview.issues.length > 0 && (
            <div style={{ ...card, borderColor: "rgba(239,68,68,.28)", padding: "16px 18px", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#ef4444" }}>
                {preview.failed} row{preview.failed === 1 ? "" : "s"} will be skipped
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto", fontSize: 11.5, lineHeight: 1.8, color: "var(--text-muted)" }}>
                {preview.issues.map((issue) => (
                  <div key={issue.line}>
                    <span style={{ fontFamily: MONO, color: "var(--text-primary)" }}>Row {issue.line}</span> — {issue.error}
                  </div>
                ))}
                {preview.failed > preview.issues.length && (
                  <div style={{ marginTop: 6, fontStyle: "italic" }}>
                    …and {preview.failed - preview.issues.length} more.
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={commit} disabled={busy || preview.ok === 0} style={{
              padding: "12px 24px", borderRadius: 10, border: "none",
              background: busy || preview.ok === 0 ? "rgba(34,197,94,.4)" : "#22c55e",
              color: "#fff", fontSize: 13.5, fontWeight: 700,
              cursor: busy || preview.ok === 0 ? "not-allowed" : "pointer", fontFamily: FONT,
            }}>
              {busy ? "Importing…" : `Import ${preview.ok.toLocaleString("en-PK")} rows`}
            </button>
            <button onClick={() => { setPreview(null); setStep(3); }} style={{
              padding: "12px 20px", borderRadius: 10, fontSize: 13,
              background: "transparent", border: "1px solid var(--border)",
              color: "var(--text-muted)", cursor: "pointer", fontFamily: FONT,
            }}>← Change the file</button>
          </div>
        </div>
      )}

      {/* ── Step 5: result ── */}
      {step === 5 && result && (
        <div style={{ ...card, padding: isMobile ? "20px 16px" : "28px 26px" }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>
            {typeDef?.name} imported
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>
            {result.imported.toLocaleString("en-PK")} created ·{" "}
            {result.updated.toLocaleString("en-PK")} updated ·{" "}
            {result.skipped.toLocaleString("en-PK")} skipped, out of {result.total.toLocaleString("en-PK")} rows.
          </div>

          {result.errors.length > 0 && (
            <div style={{
              borderRadius: 10, border: "1px solid rgba(245,158,11,.28)",
              background: "rgba(245,158,11,.07)", padding: "13px 15px", marginBottom: 18,
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#f59e0b", marginBottom: 6 }}>
                Skipped rows
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto", fontSize: 11.5, lineHeight: 1.75, color: "var(--text-muted)" }}>
                {result.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={restart} style={{
              padding: "11px 22px", borderRadius: 10, border: "none", background: "#6366f1",
              color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
            }}>Import another file</button>
            <Link href="/dashboard/import" style={{
              padding: "11px 20px", borderRadius: 10, fontSize: 13, textDecoration: "none",
              border: "1px solid var(--border)", color: "var(--text-muted)",
            }}>← Import Center</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImportWizardPage() {
  return (
    <Suspense fallback={null}>
      <ImportWizardInner />
    </Suspense>
  );
}
