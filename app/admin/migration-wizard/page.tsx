"use client";

/**
 * Migration Wizard — read a customer's old export, produce a file our importer
 * accepts.
 *
 * The page is built around the mapping table, because that is the artefact the
 * operator has to check. Everything else — the detected system, the converted
 * preview, the warnings — exists to make that table easy to trust or easy to
 * distrust. The converted CSV is deliberately the last thing on the page, not
 * the first.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, CopyButton, Empty, ErrorNote, Loading, PageHeader, Pill, Section,
  aiKitCss, card, fmtDate, getJson, inputStyle, pageStyle, postJson, type Tone,
} from "@/app/admin/components/AiKit";

type DataTypeDef = {
  id: string; name: string; icon: string; desc: string;
  template: string[]; required: string[]; order: number; why: string;
};

type Config = {
  aiConfigured: boolean;
  dataTypes: DataTypeDef[];
  sources: Array<{ id: string; name: string; badge: string; color: string }>;
};

type Mapping = {
  sourceColumn: string;
  targetField: string | null;
  confidence: "high" | "medium" | "low";
  reason: string;
};

type Result = {
  analysis: {
    dataType: string;
    dataTypeConfidence: "high" | "medium" | "low";
    detectedSystem: string;
    mappings: Mapping[];
    problems: string[];
    notes: string;
  };
  source: { headers: string[]; rowCount: number; delimiter: string; sample: string[][] };
  converted: { headers: string[]; rowCount: number; preview: string[][]; csv: string };
  dataType: { id: string; name: string; template: string[]; required: string[]; why: string } | null;
  warnings: {
    missingRequired: string[];
    droppedColumns: string[];
    unmappedHeadings: string[];
    invalidSourceColumns: string[];
    duplicateTargets: string[];
  };
  generatedAt: string;
};

const CONF_TONE: Record<Mapping["confidence"], Tone> = {
  high: "green", medium: "amber", low: "red",
};

export default function MigrationWizardPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [csv, setCsv] = useState("");
  const [hintType, setHintType] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<Config>("/api/admin/migration-wizard")
      .then(setConfig)
      .catch((e: Error) => setError(e.message));
  }, []);

  const readFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ""));
    reader.onerror = () => setError("That file could not be read.");
    reader.readAsText(file);
  }, []);

  const analyse = useCallback(async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await postJson<Result>("/api/admin/migration-wizard", {
        csv, hintType: hintType || undefined, hint: hint.trim() || undefined,
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [csv, hintType, hint]);

  const lineCount = csv ? csv.trim().split(/\r?\n/).length : 0;

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Migration Wizard"
        subtitle="Paste a customer's export from Tally, QuickBooks, Oracle or a hand-kept Excel sheet. The model decides what each column means; the conversion itself is done in code, cell by cell, so no amount or name can be altered on the way through."
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      <Section title="1 · The customer's file">
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
            padding: "9px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
            background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)",
            color: "rgba(255,255,255,.6)",
          }}>
            Choose a file
            <input
              type="file"
              accept=".csv,.txt,.tsv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
              style={{ display: "none" }}
            />
          </label>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>
            or paste below · {lineCount ? `${lineCount.toLocaleString()} lines loaded` : "nothing loaded"}
          </span>
          {csv ? (
            <button onClick={() => { setCsv(""); setResult(null); }} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,.3)", fontSize: 11.5, padding: 0,
            }}>
              Clear
            </button>
          ) : null}
        </div>

        <textarea
          value={csv}
          onChange={(e) => { setCsv(e.target.value); setResult(null); }}
          rows={9}
          placeholder={"Account Code,A/C TITLE,Op Bal Dr,Op Bal Cr\n1001,Cash In Hand,50000,0\n1002,M/s Ali Traders — Karachi,\"1,25,000\",0"}
          style={{
            ...inputStyle, resize: "vertical", fontSize: 12,
            fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", lineHeight: 1.6,
          }}
        />

        <div className="ai-two" style={{ marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>
              WHAT IS THIS FILE? (OPTIONAL)
            </div>
            <select
              value={hintType}
              onChange={(e) => setHintType(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Let it work it out</option>
              {(config?.dataTypes || []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>
              ANYTHING THAT WOULD HELP (OPTIONAL)
            </div>
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Tally export, amounts in lakhs, last row is a total"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          {config?.aiConfigured ? (
            <Button onClick={analyse} busy={busy} disabled={!csv.trim()}>
              {result ? "Analyse again" : "Read this file"}
            </Button>
          ) : (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
              Set GROQ_API_KEY or OPENAI_API_KEY to use the wizard.
            </div>
          )}
        </div>
      </Section>

      {busy ? <Loading label="Working out what each column means…" /> : null}

      {result ? (
        <>
          <Section title="2 · What it is">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <Pill tone={CONF_TONE[result.analysis.dataTypeConfidence]}>
                {result.dataType?.name || result.analysis.dataType} · {result.analysis.dataTypeConfidence} confidence
              </Pill>
              <Pill tone="grey">Looks like {result.analysis.detectedSystem}</Pill>
              <Pill tone="grey">{result.source.rowCount.toLocaleString()} rows</Pill>
              <Pill tone="grey">{result.source.headers.length} columns</Pill>
              <Pill tone="grey">delimiter {JSON.stringify(result.source.delimiter)}</Pill>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.7 }}>
              {result.analysis.notes}
            </div>
            {result.dataType ? (
              <div style={{ fontSize: 12, color: "rgba(129,140,248,.7)", marginTop: 10, lineHeight: 1.6 }}>
                {result.dataType.why}
              </div>
            ) : null}
          </Section>

          {(result.warnings.missingRequired.length
            || result.warnings.duplicateTargets.length
            || result.warnings.invalidSourceColumns.length
            || result.analysis.problems.length) ? (
            <div style={{
              ...card,
              background: "rgba(248,113,113,.06)", borderColor: "rgba(248,113,113,.28)",
              marginBottom: 18,
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fca5a5", marginBottom: 11 }}>
                Deal with these before you import
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "rgba(252,165,165,.9)", lineHeight: 1.85 }}>
                {result.warnings.missingRequired.map((f) => (
                  <li key={`req-${f}`}>
                    <strong>{f}</strong> is required and nothing maps to it — every row would be
                    rejected. Find the column that holds it, or add it to the file.
                  </li>
                ))}
                {result.warnings.duplicateTargets.map((f) => (
                  <li key={`dup-${f}`}>
                    Two columns both claimed <strong>{f}</strong>. The first one was used; check the
                    table below and re-run with a hint if it picked the wrong one.
                  </li>
                ))}
                {result.warnings.invalidSourceColumns.map((f) => (
                  <li key={`bad-${f}`}>
                    The mapping referred to a column called <strong>{f}</strong> which is not in the
                    file. It was ignored.
                  </li>
                ))}
                {result.analysis.problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          ) : null}

          <Section title={`3 · Column mapping (${result.analysis.mappings.length})`}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ color: "rgba(255,255,255,.35)", textAlign: "left" }}>
                    <th style={{ padding: "7px 10px", fontWeight: 700 }}>Their column</th>
                    <th style={{ padding: "7px 10px", fontWeight: 700 }}>→</th>
                    <th style={{ padding: "7px 10px", fontWeight: 700 }}>Our field</th>
                    <th style={{ padding: "7px 10px", fontWeight: 700 }}>Why</th>
                  </tr>
                </thead>
                <tbody>
                  {result.analysis.mappings.map((m) => (
                    <tr key={m.sourceColumn} style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                      <td style={{
                        padding: "9px 10px", color: "#e2e8f0",
                        fontFamily: "ui-monospace,monospace", fontSize: 11.5,
                      }}>
                        {m.sourceColumn}
                      </td>
                      <td style={{ padding: "9px 10px", color: "rgba(255,255,255,.2)" }}>→</td>
                      <td style={{ padding: "9px 10px" }}>
                        {m.targetField ? (
                          <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
                            <span style={{ color: "#6ee7b7", fontWeight: 700, fontFamily: "ui-monospace,monospace", fontSize: 11.5 }}>
                              {m.targetField}
                            </span>
                            <Pill tone={CONF_TONE[m.confidence]}>{m.confidence}</Pill>
                          </span>
                        ) : (
                          <span style={{ color: "rgba(255,255,255,.28)", fontStyle: "italic" }}>dropped</span>
                        )}
                      </td>
                      <td style={{ padding: "9px 10px", color: "rgba(255,255,255,.45)", fontSize: 11.5 }}>
                        {m.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.warnings.unmappedHeadings.length ? (
              <div style={{ fontSize: 11.5, color: "rgba(251,191,36,.7)", marginTop: 12, lineHeight: 1.6 }}>
                {result.warnings.unmappedHeadings.length} heading(s) were not mentioned in the
                mapping at all and carry nothing into the output:{" "}
                {result.warnings.unmappedHeadings.join(", ")}
              </div>
            ) : null}
          </Section>

          <Section
            title={`4 · Converted file (${result.converted.rowCount.toLocaleString()} rows)`}
            right={result.converted.csv ? <CopyButton text={result.converted.csv} label="Copy converted CSV" /> : null}
          >
            {result.converted.headers.length === 0 ? (
              <Empty>
                Nothing mapped, so there is nothing to convert. Check the mapping table above.
              </Empty>
            ) : (
              <>
                <div style={{ overflowX: "auto", marginBottom: 12 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                    <thead>
                      <tr style={{ color: "#6ee7b7", textAlign: "left" }}>
                        {result.converted.headers.map((h) => (
                          <th key={h} style={{ padding: "7px 10px", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.converted.preview.map((row, i) => (
                        <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                          {row.map((cell, j) => (
                            <td key={j} style={{
                              padding: "7px 10px", color: "rgba(255,255,255,.62)",
                              maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {cell || <span style={{ color: "rgba(255,255,255,.15)" }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{
                  fontSize: 12.5, color: "rgba(255,255,255,.55)", lineHeight: 1.75,
                  padding: "12px 15px", borderRadius: 11,
                  background: "rgba(52,211,153,.05)", border: "1px solid rgba(52,211,153,.2)",
                }}>
                  <strong style={{ color: "#6ee7b7" }}>Next:</strong> copy this CSV, open the
                  customer&apos;s Import Wizard, pick{" "}
                  <strong>{result.dataType?.name || "the matching data type"}</strong> and run it as a
                  dry run first. The dry run shows every row already interpreted, and writes nothing
                  until it is approved.
                  <div style={{ marginTop: 7, color: "rgba(255,255,255,.4)" }}>
                    Showing the first {result.converted.preview.length} of{" "}
                    {result.converted.rowCount.toLocaleString()} rows. Every cell above is copied
                    unchanged from the source file — no value was rewritten by a model.
                  </div>
                </div>
              </>
            )}
          </Section>

          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", lineHeight: 1.7 }}>
            Analysed {fmtDate(result.generatedAt)}. The model saw the headings and the first{" "}
            {result.source.sample.length} rows only; the remaining{" "}
            {Math.max(0, result.source.rowCount - result.source.sample.length).toLocaleString()} rows
            were converted in code without ever reaching it.
          </div>
        </>
      ) : null}
    </div>
  );
}
