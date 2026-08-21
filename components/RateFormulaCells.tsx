"use client";

// The extra line columns a rate formula adds to a document grid.
//
// Every document that supports the formula draws its own table — a purchase
// invoice, a GRN and a quotation do not share one grid component — so this file
// hands out cells rather than a table. Head cells, body cells and a mobile
// block, all driven by the company's own column list.
//
// When the company has no formula set up none of this is rendered at all and
// the grid is byte-for-byte what it always was.

import type { CSSProperties } from "react";
import type { RateFormulaField, RateFormulaSettings } from "@/lib/rateFormula";

const FONT = "'Outfit','Inter',sans-serif";
const ACCENT = "#6366f1";
const BORDER = "var(--border)";
const TEXT = "var(--text-primary)";
const MUTED = "var(--text-muted)";
const BG = "var(--app-bg)";

/** The values one line carries, keyed by the company's column keys. */
export type RateFormulaMeta = Record<string, number | "">;

function cellInput(extra?: CSSProperties): CSSProperties {
  return {
    padding: "5px 6px",
    borderRadius: 7,
    border: `1.5px solid ${BORDER}`,
    background: BG,
    color: TEXT,
    fontFamily: FONT,
    fontSize: 12.5,
    textAlign: "right",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    ...extra,
  };
}

/** Header cells. Render inside the document's own `<tr>`. */
export function RateFormulaHeadCells({ settings }: { settings: RateFormulaSettings }) {
  return (
    <>
      {settings.fields.map((f) => (
        <th
          key={f.key}
          title={f.unit ? `${f.label} (${f.unit})` : f.label}
          style={{
            padding: "9px 8px",
            textAlign: "center",
            color: MUTED,
            fontWeight: 700,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            whiteSpace: "nowrap",
            borderBottom: `1px solid ${BORDER}`,
            width: f.width,
          }}
        >
          {f.label}
          {f.required && <span style={{ color: ACCENT }}> *</span>}
        </th>
      ))}
    </>
  );
}

/** Body cells for one line. Render inside the document's own `<tr>`. */
export function RateFormulaRowCells({
  settings,
  meta,
  onChange,
  disabled,
}: {
  settings: RateFormulaSettings;
  meta: RateFormulaMeta | undefined;
  onChange: (key: string, value: number | "") => void;
  disabled?: boolean;
}) {
  return (
    <>
      {settings.fields.map((f) => {
        const value = meta?.[f.key] ?? "";
        const missing = f.required && value === "";
        return (
          <td key={f.key} style={{ padding: "7px 8px", width: f.width }}>
            <input
              type="number"
              value={value}
              disabled={disabled}
              onChange={(e) =>
                onChange(f.key, e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder={f.defaultValue ? String(f.defaultValue) : "0"}
              title={f.unit ? `${f.label} — ${f.unit}` : f.label}
              style={cellInput(
                missing ? { borderColor: "rgba(248,113,113,.55)" } : undefined
              )}
            />
          </td>
        );
      })}
    </>
  );
}

/** The same inputs stacked, for a document's mobile card layout. */
export function RateFormulaMobileFields({
  settings,
  meta,
  onChange,
  disabled,
}: {
  settings: RateFormulaSettings;
  meta: RateFormulaMeta | undefined;
  onChange: (key: string, value: number | "") => void;
  disabled?: boolean;
}) {
  return (
    <>
      {settings.fields.map((f) => (
        <div key={f.key}>
          <div
            style={{
              fontSize: 10.5,
              color: MUTED,
              fontWeight: 700,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            {f.label}
            {f.unit ? ` (${f.unit})` : ""}
          </div>
          <input
            type="number"
            value={meta?.[f.key] ?? ""}
            disabled={disabled}
            onChange={(e) =>
              onChange(f.key, e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder={f.defaultValue ? String(f.defaultValue) : "0"}
            style={cellInput({ padding: "7px 9px" })}
          />
        </div>
      ))}
    </>
  );
}

/**
 * The one-line explanation under a computed rate, e.g.
 * "12 × 7 × 56 × 100 ÷ 54". Shows the operator why the number is what it is,
 * which is the difference between trusting the grid and re-checking it on a
 * calculator.
 */
export function RateFormulaHint({
  settings,
  meta,
}: {
  settings: RateFormulaSettings;
  meta: RateFormulaMeta | undefined;
}) {
  const parts = settings.fields
    .filter((f) => f.affectsRate)
    .map((f) => meta?.[f.key])
    .filter((v): v is number => typeof v === "number");

  if (parts.length !== settings.fields.filter((f) => f.affectsRate).length) return null;

  return (
    <div
      style={{
        fontSize: 9.5,
        color: MUTED,
        marginTop: 2,
        textAlign: "right",
        whiteSpace: "nowrap",
      }}
    >
      {parts.join(" × ")} ÷ {settings.divisor}
    </div>
  );
}

/** Column definitions for the shared A4 print document. */
export function rateFormulaPrintColumns(
  settings: RateFormulaSettings
): Array<{ key: string; label: string; align: "center"; width: number }> {
  return settings.fields
    .filter((f) => f.showOnPrint)
    .map((f) => ({ key: `rf_${f.key}`, label: f.label, align: "center" as const, width: f.width }));
}

/** The matching print row values for one line. */
export function rateFormulaPrintValues(
  settings: RateFormulaSettings,
  meta: RateFormulaMeta | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of settings.fields) {
    if (!f.showOnPrint) continue;
    const v = meta?.[f.key];
    out[`rf_${f.key}`] = v === "" || v === undefined ? "—" : String(v);
  }
  return out;
}

/** True when a required column on this line is still blank. */
export function rateFormulaLineIncomplete(
  settings: RateFormulaSettings,
  meta: RateFormulaMeta | undefined
): RateFormulaField | null {
  for (const f of settings.fields) {
    if (!f.required) continue;
    const v = meta?.[f.key];
    if (v === "" || v === undefined || v === null) return f;
  }
  return null;
}
