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

/**
 * Files whose code column is a ledger account code, and so may arrive as an
 * Oracle flexfield combination. Mirrors SEGMENTED_TYPES in the route.
 */
const SEGMENTED_TYPES = new Set<ImportDataType>([
  "accounts", "customers", "suppliers", "opening_balances", "ledger_history",
]);

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
  /** 0 = take the code whole. See `codeSegment` in app/api/import/route.ts. */
  const [codeSegment, setCodeSegment] = useState(0);

  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);

  useEffect(() => { setResume(loadResume()); }, []);

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
    setError("");
    setNotice("");
    setPreview(null);
    setResult(null);
    setPlan(null);

    // An Excel workbook is read here rather than sent back to Excel to be
    // re-saved. That round trip is where a phone number loses its leading zero
    // and a date turns into whatever the machine's locale prefers, so the file
    // that arrives is worse than the one that was exported.
    if (/\.xlsx$/i.test(file.name)) {
      try {
        const workbook = await readXlsx(await file.arrayBuffer());
        setFileName(file.name);
        setCsv(workbook.csv);
        setNotice(
          `Read sheet "${workbook.sheetName}" out of the workbook` +
            (workbook.sheetNames.length > 1
              ? ` (of ${workbook.sheetNames.length}: ${workbook.sheetNames.join(", ")}). ` +
                `Only the first sheet is read — if the data is on another one, move it to the front or save that sheet as CSV.`
              : ".") +
            " Check the preview before importing.",
        );
      } catch (e) {
        setError(
          `That workbook could not be read here (${e instanceof Error ? e.message : "unknown format"}). ` +
            `Open it in Excel and use File → Save As → CSV UTF-8, then upload the .csv.`,
        );
      }
      return;
    }

    // .xls is the old binary format, which is a different thing entirely and
    // not worth reading badly.
    if (/\.xls$/i.test(file.name)) {
      setError(
        "That is an old-format .xls workbook. Open it in Excel and use File → Save As → CSV UTF-8 (or .xlsx), then upload that.",
      );
      return;
    }

    setFileName(file.name);
    setCsv(await file.text());
  }

  /** One request. The chunk carries everything the server cannot see for itself. */
  const send = useCallback(
    async (chunk: ImportChunk, current: ImportPlan, dryRun: boolean) => {
      const res = await fetch("/api/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({
          csv: chunk.text,
          source: source || "csv",
          dataType,
          dryRun,
          date: dryRun ? "" : date,
          party,
          lineOffset: chunk.lineOffset,
          chunkIndex: chunk.index,
          chunkCount: current.chunks.length,
          ambiguousCodes: current.ambiguousCodes,
          continuedParties: chunk.continuedParties,
          codeSegment,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "The server refused the file.");
      return body;
    },
    [headers, source, dataType, date, party, codeSegment],
  );

  async function runPreview() {
    if (!dataType) { setError("Pick what you are importing first."); return; }
    if (!csv.trim()) { setError("Upload a file, or paste the rows in."); return; }

    setBusy(true);
    setError("");
    try {
      const built = planImport(csv, dataType, party.trim());
      if (built.error) throw new Error(built.error);
      setPlan(built);

      // Every chunk is read, not just the first. A preview that had only looked
      // at the first five thousand rows would report "0 will be skipped" on a
      // file whose trouble starts at row nine thousand, which is the one number
      // the operator is about to trust.
      //
      // The first chunk supplies everything that describes the file as a whole
      // — the headings, the delimiter, and the rows shown, which come from the
      // top of the file because that is where a mis-read column shows itself.
      // The counts are added up across every chunk, and the issue list keeps
      // collecting, because the row that breaks an import is rarely near the
      // top.
      let first: Preview | undefined;
      let total = 0;
      let ok = 0;
      let failed = 0;
      let warnings = 0;
      const issues: Preview["issues"] = [];

      for (const chunk of built.chunks) {
        setProgress({
          label: built.chunks.length > 1 ? "Checking the file" : "Reading the file",
          done: chunk.index - 1,
          total: built.chunks.length,
        });
        const part = (await send(chunk, built, true)) as Preview;
        if (!first) first = part;
        total += part.total;
        ok += part.ok;
        failed += part.failed;
        warnings += part.warnings;
        for (const issue of part.issues) {
          if (issues.length >= 200) break;
          issues.push(issue);
        }
      }
      if (!first) throw new Error("The file has no rows to read.");

      setPreview({
        ...first,
        total, ok, failed, warnings, issues,
        reshaped: built.reshaped ?? first.reshaped,
      });
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file.");
    } finally {
      setProgress(null);
      setBusy(false);
    }
  }

  async function commit(from = 0) {
    if (!preview || !plan) return;
    setBusy(true);
    setError("");

    const running: Result = {
      success: true,
      total: from > 0 ? resume?.outcome.total ?? 0 : 0,
      imported: from > 0 ? resume?.outcome.imported ?? 0 : 0,
      updated: from > 0 ? resume?.outcome.updated ?? 0 : 0,
      skipped: from > 0 ? resume?.outcome.skipped ?? 0 : 0,
      errors: [],
    };

    try {
      for (const chunk of plan.chunks.slice(from)) {
        setProgress({
          label: plan.chunks.length > 1 ? "Importing" : "Writing to your books",
          done: chunk.index - 1,
          total: plan.chunks.length,
        });
        const part = (await send(chunk, plan, false)) as Result;
        running.total += part.total;
        running.imported += part.imported;
        running.updated += part.updated;
        running.skipped += part.skipped;
        running.errors = running.errors.concat(part.errors).slice(0, 200);

        // Written after every chunk, so an interruption loses at most the one
        // that was in flight — and that one is safe to send again, because
        // every writer matches on what is already there before it creates.
        if (plan.chunks.length > 1 && dataType) {
          saveResume({
            fileName, dataType, chunkCount: plan.chunks.length, totalRows: plan.totalRows,
            done: chunk.index,
            outcome: {
              imported: running.imported, updated: running.updated,
              skipped: running.skipped, total: running.total,
            },
            at: Date.now(),
          });
        }
      }
      saveResume(null);
      setResume(null);
      setResult(running);
      setStep(5);
      toast.success(`${(running.imported + running.updated).toLocaleString("en-PK")} rows imported`);
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : "Import failed."}` +
          (plan.chunks.length > 1
            ? " The rows already written are saved. Pick the same file again to carry on from where this stopped."
            : ""),
      );
    } finally {
      setProgress(null);
      setBusy(false);
    }
  }

  /** True when the file on screen is the one a half-finished import was using. */
  const resumable =
    resume !== null &&
    plan !== null &&
    resume.dataType === dataType &&
    resume.fileName === fileName &&
    resume.chunkCount === plan.chunks.length &&
    resume.totalRows === plan.totalRows &&
    resume.done < plan.chunks.length;

  function restart() {
    setStep(1); setSource(""); setDataType(""); setCsv(""); setFileName("");
    setPreview(null); setResult(null); setError(""); setNotice("");
    setPlan(null); setProgress(null);
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

      {notice && !error && (
        <div style={{
          ...card, borderColor: "rgba(99,102,241,.3)", background: "rgba(99,102,241,.08)",
          padding: "12px 16px", marginBottom: 18, fontSize: 12.5, lineHeight: 1.65,
          color: "var(--text-muted)",
        }}>{notice}</div>
      )}

      {/* A big file is many requests. Saying which one is in flight is the
          difference between a slow import and an import that looks stuck. */}
      {progress && (
        <div style={{ ...card, padding: "14px 16px", marginBottom: 18 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", gap: 12,
            fontSize: 12.5, marginBottom: 9, flexWrap: "wrap",
          }}>
            <span style={{ fontWeight: 700 }}>
              {progress.label}
              {progress.total > 1 && ` — part ${Math.min(progress.done + 1, progress.total)} of ${progress.total}`}
            </span>
            <span style={{ color: "var(--text-muted)", fontFamily: MONO }}>
              {Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%
            </span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: "var(--app-bg)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 999, background: "#6366f1",
              width: `${(progress.done / Math.max(progress.total, 1)) * 100}%`,
              transition: "width .25s ease",
            }} />
          </div>
          {progress.total > 1 && (
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.6 }}>
              The file was too large for one request, so it is being sent in {progress.total} parts.
              Leave this tab open — if it is interrupted, everything already written is kept and
              you can carry on from the same point.
            </div>
          )}
        </div>
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
          <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
            Not sure which report to run in your old system?{" "}
            <Link href="/dashboard/import/guide" style={{ color: "#818cf8", fontWeight: 700 }}>
              The import guides
            </Link>{" "}
            name the exact screen and options for every file, in each of these systems.
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
                accept=".csv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
              />
              <div style={{ fontSize: 26, marginBottom: 6 }}>📄</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>
                {fileName || "Choose a CSV or Excel file"}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                .csv (comma, semicolon or tab separated) or .xlsx — an Excel workbook is read
                directly, no Save As needed. Any size: a large file is sent in parts.
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

            {SEGMENTED_TYPES.has(typeDef.id) && (
              <div style={{ marginTop: 14, maxWidth: 460 }}>
                <label style={{
                  display: "block", fontSize: 11.5, color: "var(--text-muted)",
                  marginBottom: 6, fontWeight: 600,
                }}>
                  Account codes look like <code style={{ fontFamily: MONO }}>01-000-1110-0000</code>?
                </label>
                <select
                  value={codeSegment}
                  onChange={(e) => setCodeSegment(Number(e.target.value))}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 9,
                    background: "var(--app-bg)", border: "1px solid var(--border)",
                    color: "var(--text-primary)", fontSize: 13, fontFamily: FONT, outline: "none",
                  }}
                >
                  <option value={0}>No — use the code exactly as it is (normal)</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>Yes — use segment {n} as the account code</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.6 }}>
                  Only for Oracle EBS and systems like it, where a code is a combination of company,
                  cost centre and account. The account is usually segment 3. Left whole, the same
                  account arrives once per cost centre — four hundred accounts become twelve
                  thousand. The preview shows the codes after the cut, so check them there.
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
                <Link href={`/dashboard/import/guide/${sourceDef.id}`} style={{
                  display: "inline-block", marginTop: 11, fontSize: 12,
                  fontWeight: 700, color: "#818cf8", textDecoration: "none",
                }}>
                  The exact report for {typeDef.name}, and what to set on it →
                </Link>
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
            {plan && plan.chunks.length > 1 && (
              <> · read in <b style={{ color: "var(--text-primary)" }}>{plan.chunks.length} parts</b>,
                because the file is larger than one request can carry</>
            )}
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

          {resumable && resume && (
            <div style={{
              ...card, borderColor: "rgba(245,158,11,.32)", background: "rgba(245,158,11,.07)",
              padding: "16px 18px", marginBottom: 14,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#f59e0b" }}>
                This file was already partly imported
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 12 }}>
                {resume.done} of {resume.chunkCount} parts went in before it stopped —{" "}
                {(resume.outcome.imported + resume.outcome.updated).toLocaleString("en-PK")} rows are
                already in your books. Carry on from part {resume.done + 1}, or start the file again:
                nothing is duplicated either way, because every row is matched against what is
                already there before it is written.
              </div>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                <button onClick={() => commit(resume.done)} disabled={busy} style={{
                  padding: "10px 18px", borderRadius: 9, border: "none", background: "#f59e0b",
                  color: "#1c1917", fontSize: 12.5, fontWeight: 700,
                  cursor: busy ? "not-allowed" : "pointer", fontFamily: FONT,
                }}>Carry on from part {resume.done + 1}</button>
                <button onClick={() => { saveResume(null); setResume(null); }} disabled={busy} style={{
                  padding: "10px 18px", borderRadius: 9, fontSize: 12.5,
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--text-muted)", cursor: busy ? "not-allowed" : "pointer", fontFamily: FONT,
                }}>Start the file again</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => commit(0)} disabled={busy || preview.ok === 0 || resumable} style={{
              padding: "12px 24px", borderRadius: 10, border: "none",
              background: busy || preview.ok === 0 || resumable ? "rgba(34,197,94,.4)" : "#22c55e",
              color: "#fff", fontSize: 13.5, fontWeight: 700,
              cursor: busy || preview.ok === 0 || resumable ? "not-allowed" : "pointer", fontFamily: FONT,
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
