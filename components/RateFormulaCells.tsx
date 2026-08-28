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
import { RATE_FORMULA_TEXT_MAX } from "@/lib/rateFormula";
import type {
  RateFormulaField,
  RateFormulaSettings,
  RateFormulaValue,
} from "@/lib/rateFormula";

const FONT = "'Outfit','Inter',sans-serif";
const ACCENT = "#6366f1";
const BORDER = "var(--border)";
const TEXT = "var(--text-primary)";
const MUTED = "var(--text-muted)";
const BG = "var(--app-bg)";

/** The values one line carries, keyed by the company's column keys. */
export type RateFormulaMeta = Record<string, RateFormulaValue>;

/**
 * Turns what the operator typed into what the line stores.
 *
 * A number column keeps a real number so the formula can multiply it; a text
 * column keeps the string exactly as typed, because "15-L" loses its meaning
 * the moment anything tries to make a number of it.
 */
function readInput(field: RateFormulaField, raw: string): RateFormulaValue {
  if (raw === "") return "";
  if (field.kind === "text") return raw.slice(0, RATE_FORMULA_TEXT_MAX);
  const n = Number(raw);
  return Number.isFinite(n) ? n : "";
}

/** Marks a cell so the item-pick handler can find it again. */
const cellId = (rowIndex: number | undefined, key: string) =>
  rowIndex === undefined ? undefined : `rf-${rowIndex}-${key}`;

/**
 * Puts the cursor in one line's column and selects what is there, so the
 * operator types over it rather than behind it.
 *
 * Called in the same tick React re-renders the row in — hence the frame's
 * delay. A missing cell is not an error: the company may have removed that
 * column since, and a document that quietly does not move the cursor is far
 * better than one that throws.
 */
export function focusRateFormulaCell(rowIndex: number, key: string | null) {
  if (!key || typeof document === "undefined") return;
  requestAnimationFrame(() => {
    const el = document.getElementById(`rf-${rowIndex}-${key}`) as HTMLInputElement | null;
    if (!el) return;
    el.focus();
    el.select?.();
  });
}

/**
 * Enter on an item picker jumps to the column the company nominated.
 *
 * Two things make this necessary. The dashboard installs a global Enter
 * handler that walks to the next focusable element in DOM order, which from an
 * item select is the first formula column — never the one that actually needs
 * typing. And the jump cannot hang off the select's `change` event instead:
 * a closed `<select>` fires `change` on every arrow key and every letter typed
 * to find an option, so the cursor would be yanked away mid-search.
 *
 * Enter is the moment the operator has settled on an item, and the only moment
 * the jump is wanted. Propagation is stopped so the global handler does not
 * then walk the cursor on from where this put it.
 */
export function rateFormulaEnterHandler(
  settings: RateFormulaSettings,
  active: boolean,
  rowIndex: number,
  /**
   * The values the line is about to carry. Read through a function because the
   * picker calls this straight after its own onChange, before React has
   * committed the new row — the caller keeps the freshly resolved values in a
   * ref and hands them over here.
   */
  pickedMeta?: () => RateFormulaMeta | null | undefined
) {
  return (e: KeyboardEvent | { key: string; shiftKey: boolean; preventDefault(): void; stopPropagation(): void }) => {
    if (!active || e.key !== "Enter" || e.shiftKey) return;
    const key = settings.fields.find((f) => f.focusOnPick)?.key;
    if (!key) return; // no column claims the cursor — leave Enter alone
    // The item just picked may have answered that column itself. Parking the
    // cursor on a filled box makes the operator tab past a number they never
    // needed to touch, so let Enter walk on to the next thing that is blank.
    const already = pickedMeta?.()?.[key];
    if (already !== undefined && already !== "") return;
    e.preventDefault();
    e.stopPropagation();
    focusRateFormulaCell(rowIndex, key);
  };
}

/**
 * Smallest an input may get before it stops being usable.
 *
 * A document grid can carry twenty columns, and `table-layout: auto` treats a
 * `width` on a cell as a suggestion — under pressure it will squeeze the
 * narrowest column to a few pixels. A `min-width` on the input itself is not a
 * suggestion, so the column holds its ground and the row scrolls sideways
 * instead of collapsing into a box nothing can be typed into.
 */
const MIN_CELL_WIDTH = 64;

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
    minWidth: MIN_CELL_WIDTH,
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
            width: Math.max(f.width, MIN_CELL_WIDTH),
            minWidth: Math.max(f.width, MIN_CELL_WIDTH),
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
  rowIndex,
}: {
  settings: RateFormulaSettings;
  meta: RateFormulaMeta | undefined;
  onChange: (key: string, value: RateFormulaValue) => void;
  disabled?: boolean;
  /** Pass the line's index to let focusRateFormulaCell() find these inputs. */
  rowIndex?: number;
}) {
  return (
    <>
      {settings.fields.map((f) => {
        const value = meta?.[f.key] ?? "";
        const missing = f.required && value === "";
        const isText = f.kind === "text";
        // Locked columns are set on the item master. They still show and still
        // print here; they are simply not the line's to change.
        const locked = f.lockedToItem;
        return (
          <td key={f.key} style={{ padding: "7px 8px", width: Math.max(f.width, MIN_CELL_WIDTH), minWidth: Math.max(f.width, MIN_CELL_WIDTH) }}>
            <input
              id={cellId(rowIndex, f.key)}
              type={isText ? "text" : "number"}
              value={value}
              disabled={disabled}
              readOnly={locked}
              tabIndex={locked ? -1 : undefined}
              maxLength={isText ? RATE_FORMULA_TEXT_MAX : undefined}
              onChange={(e) => onChange(f.key, readInput(f, e.target.value))}
              placeholder={locked ? "—" : f.defaultValue ? String(f.defaultValue) : isText ? "" : "0"}
              title={locked ? `${f.label} — set on the item` : f.unit ? `${f.label} — ${f.unit}` : f.label}
              style={cellInput({
                ...(isText ? { textAlign: "center" as const } : {}),
                ...(locked ? { opacity: 0.7, cursor: "default", background: "transparent" } : {}),
                ...(missing && !locked ? { borderColor: "rgba(248,113,113,.55)" } : {}),
              })}
            />
          </td>
        );
      })}
    </>
  );
}

/**
 * Body cells for a document that inherits its line values rather than typing
 * them — a return goes back at the rate and the dimensions the original
 * invoice was priced at, so letting the operator edit them here would let a
 * return disagree with the sale it reverses.
 */
export function RateFormulaReadonlyCells({
  settings,
  meta,
}: {
  settings: RateFormulaSettings;
  meta: RateFormulaMeta | undefined;
}) {
  return (
    <>
      {settings.fields.map((f) => {
        const value = meta?.[f.key];
        return (
          <td
            key={f.key}
            style={{
              padding: "8px",
              width: f.width,
              textAlign: "center",
              fontSize: 12.5,
              color: value === "" || value === undefined ? MUTED : TEXT,
            }}
          >
            {value === "" || value === undefined ? "—" : value}
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
  rowIndex,
  context,
}: {
  settings: RateFormulaSettings;
  meta: RateFormulaMeta | undefined;
  onChange: (key: string, value: RateFormulaValue) => void;
  disabled?: boolean;
  rowIndex?: number;
  /**
   * "item" is the item master, the one place a locked column is set. Anywhere
   * else the lock applies. Defaults to a document, so forgetting the prop
   * errs towards read-only rather than towards a silently editable field.
   */
  context?: "document" | "item";
}) {
  const onItemForm = context === "item";
  return (
    <>
      {settings.fields.map((f) => {
        const isText = f.kind === "text";
        const locked = f.lockedToItem && !onItemForm;
        return (
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
              {locked && <span style={{ fontWeight: 600 }}> — from item</span>}
            </div>
            <input
              id={cellId(rowIndex, f.key)}
              type={isText ? "text" : "number"}
              value={meta?.[f.key] ?? ""}
              disabled={disabled}
              readOnly={locked}
              tabIndex={locked ? -1 : undefined}
              maxLength={isText ? RATE_FORMULA_TEXT_MAX : undefined}
              onChange={(e) => onChange(f.key, readInput(f, e.target.value))}
              placeholder={locked ? "—" : f.defaultValue ? String(f.defaultValue) : isText ? "" : "0"}
              style={cellInput({
                padding: "7px 9px",
                ...(locked ? { opacity: 0.7, cursor: "default", background: "transparent" } : {}),
              })}
            />
          </div>
        );
      })}
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

/**
 * How much horizontal room these columns need, in px.
 *
 * A document grid already carries a dozen columns; adding six more without
 * telling the table makes every narrow one collapse to a few pixels, and an
 * input you cannot see is an input you cannot type in. Each grid adds this to
 * its own `minWidth` and lets the row scroll sideways instead.
 */
export function rateFormulaColumnsWidth(settings: RateFormulaSettings): number {
  return settings.fields.reduce(
    (sum, f) => sum + Math.max(f.width, MIN_CELL_WIDTH) + 16,
    0
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
