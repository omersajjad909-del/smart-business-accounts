// FILE: lib/rateFormula.ts
//
// Formula-driven line rates for trading documents.
//
// Some trades do not quote a rate per unit — they quote a rate per *dimension*
// and the line rate falls out of a formula. A PVC roll house prices a roll as
//
//     rate per mm × gauge × width × length ÷ 54
//
// and types the gauge, width and length on every invoice line. Their old Oracle
// system did this; a plain "Qty × Rate" grid cannot.
//
// Nothing here knows about PVC. The company defines its own fields, its own
// expression and which documents use it. The only value that ships with a
// default is the divisor (54), because that is the one constant the trade
// treats as fixed.
//
// Off by default, everywhere. A company that never opens the settings page has
// no `rateFormula` key in its settings JSON, gets `enabled: false`, and every
// document renders exactly as it did before this file existed.

import { checkExpression, runFormula, validateKey } from "@/lib/formulaEngine";

/* ─────────────────────────── Shape ─────────────────────────── */

/**
 * How a column is typed in.
 *
 * "text" exists because trade codes are not numbers. A shade is "15-L" or
 * "15-F"; a batch is "B/2026-04". Forcing those through a number box either
 * loses the suffix or stops the operator entering what is printed on the
 * supplier's bill. A text column can never feed the rate — there is no
 * arithmetic to do on "15-L" — so the two travel together.
 */
export type RateFormulaFieldKind = "number" | "text";

/** What one column holds on one line. "" means the operator left it blank. */
export type RateFormulaValue = number | string | "";

/** One column the operator types on each document line. */
export type RateFormulaField = {
  /** Identifier used inside the expression. Letters, digits, underscore. */
  key: string;
  /** Column heading on screen and on print. */
  label: string;
  /** Free text, shown as a hint. "mm", "in", "m" — display only. */
  unit: string;
  /** Number box or free text. Defaults to a number box. */
  kind: RateFormulaFieldKind;
  /** Pre-filled on a fresh line. A string when `kind` is "text". */
  defaultValue: RateFormulaValue;
  /** Grid/print column width in px. */
  width: number;
  /**
   * false = recorded and printed but not part of the maths. A shade code or
   * a PHR reading belongs on the bill without touching the rate. Always false
   * for a text column.
   */
  affectsRate: boolean;
  showOnPrint: boolean;
  /** Blocks saving the document while empty. */
  required: boolean;
  /**
   * The cursor lands in this column the moment an item is picked on a document
   * line.
   *
   * Most columns are a property of the item and come across with it. One
   * usually is not — a PHR reading belongs to the batch being ordered, not to
   * the product — so it is the one thing the operator still has to type. Naming
   * it here means the keyboard is already there instead of the operator
   * reaching for the mouse on every line. At most one column may claim it.
   *
   * Such a column is also never pre-filled — not from its own default, not
   * from the item. Landing the cursor on a value the operator must replace
   * anyway only invites a stale number surviving into the order.
   */
  focusOnPick: boolean;
  /**
   * The value is a property of the item and is set on the item, not typed on
   * the line. It still shows on every document and still prints; it is simply
   * read-only there, so a shade code cannot drift between the item master and
   * the order that quotes it.
   */
  lockedToItem: boolean;
};

/** Longest a text column's value may be — a code, not a paragraph. */
export const RATE_FORMULA_TEXT_MAX = 32;

/**
 * Documents the formula can drive. Each is opt-in.
 *
 * Only documents whose grid actually renders the columns belong here — a
 * checkbox that saves a preference nothing reads is worse than no checkbox.
 * Add the entry at the same time as the wiring, not before.
 */
export const RATE_FORMULA_DOCS = [
  // First in the list on purpose: this is where the operator starts. Setting an
  // item's usual gauge and width once means every document that picks the item
  // starts filled in, instead of the same six numbers being retyped per line.
  { key: "items",           label: "Item Coding",         route: "/dashboard/items-new",
    note: "Save each item's usual values once — every document fills them in when the item is picked." },
  { key: "purchaseOrder",   label: "Purchase Order",      route: "/dashboard/purchase-order",
    note: "Columns on every order line; the rate is worked out as you type." },
  { key: "grn",             label: "GRN / Goods Receipt", route: "/dashboard/grn",
    note: "Carries the order's values across, or takes fresh ones on arrival." },
  { key: "purchaseInvoice", label: "Purchase Invoice",    route: "/dashboard/purchase-invoice",
    note: "Inherits from the order or GRN it was raised against." },
  { key: "salesInvoice",    label: "Sales Invoice",       route: "/dashboard/sales-invoice",
    note: "Columns on every invoice line; the rate is worked out as you type." },
  { key: "saleReturn",      label: "Sale Return",         route: "/dashboard/sale-return",
    note: "Shows what the invoice was priced at — read-only, so a return cannot disagree with the sale." },
  { key: "inventory",       label: "Stock Ledger",        route: "/dashboard/reports/stock-ledger",
    note: "Every stock movement shows the dimensions it was priced from." },
] as const;

export type RateFormulaDocKey = (typeof RATE_FORMULA_DOCS)[number]["key"];

export type RateFormulaDocMap = Record<RateFormulaDocKey, boolean>;

export type RateFormulaSettings = {
  /** Master switch. Off means this file changes nothing anywhere. */
  enabled: boolean;
  /**
   * Hides the settings page from the sidebar once the company has finished
   * setting it up. It never blocks the route itself — a hidden page is still
   * reachable at its URL, so a company cannot lock itself out of its own
   * configuration.
   */
  hidden: boolean;
  /** Shown as the column-group heading on documents, e.g. "PVC Roll". */
  profileName: string;
  fields: RateFormulaField[];
  /** Expression over the field keys plus `divisor`. */
  expression: string;
  /** The one value with a default, because the trade treats it as fixed. */
  divisor: number;
  /** Decimals the computed rate is rounded to before Amount = Rate × Qty. */
  rateDecimals: number;
  /** Lets the operator overwrite the computed rate by hand. */
  rateEditable: boolean;
  documents: RateFormulaDocMap;
};

export const DEFAULT_RATE_FORMULA_DOCS: RateFormulaDocMap = {
  items: false,
  purchaseOrder: false,
  grn: false,
  purchaseInvoice: false,
  salesInvoice: false,
  saleReturn: false,
  inventory: false,
};

export const DEFAULT_RATE_FORMULA: RateFormulaSettings = {
  enabled: false,
  hidden: false,
  profileName: "",
  fields: [],
  expression: "",
  divisor: 54,
  rateDecimals: 0,
  rateEditable: true,
  documents: { ...DEFAULT_RATE_FORMULA_DOCS },
};

/* ────────────────────────── Presets ────────────────────────── */

/**
 * A worked example, not a product rule. Every number below is editable and the
 * company is expected to bend it to their own trade — it exists only so the
 * first screen is not an empty table.
 */
export const RATE_FORMULA_PRESETS: Array<{
  id: string;
  name: string;
  summary: string;
  settings: Pick<
    RateFormulaSettings,
    "profileName" | "divisor" | "rateDecimals" | "rateEditable" | "expression" | "fields"
  >;
}> = [
  {
    id: "pvc-roll",
    name: "PVC Roll",
    summary: "Rate per mm × Gauge × Width × Length ÷ 54. Qty stays in rolls.",
    settings: {
      profileName: "PVC Roll",
      divisor: 54,
      rateDecimals: 0,
      rateEditable: true,
      expression: "rtmm * gauge * width * length / divisor",
      fields: [
        { key: "gauge",  label: "Gauge",   unit: "",       kind: "number", defaultValue: 0, width: 60, affectsRate: true,  showOnPrint: true, required: true,  focusOnPick: false, lockedToItem: false },
        { key: "width",  label: "Width",   unit: "in",     kind: "number", defaultValue: 0, width: 60, affectsRate: true,  showOnPrint: true, required: true,  focusOnPick: false, lockedToItem: false },
        { key: "length", label: "Length",  unit: "m",      kind: "number", defaultValue: 0, width: 60, affectsRate: true,  showOnPrint: true, required: true,  focusOnPick: false, lockedToItem: false },
        // PHR belongs to the batch being ordered, not to the product, so it is
        // typed on every order — blank on a fresh line, and where the cursor
        // lands after picking an item.
        { key: "phr",    label: "PHR",     unit: "",       kind: "number", defaultValue: 0, width: 55, affectsRate: false, showOnPrint: true, required: false, focusOnPick: true,  lockedToItem: false },
        // A shade is a code, not a quantity — "15-L", "15-F". Text, so the
        // suffix survives; never part of the maths; and set on the item, so an
        // order can never quote a shade the item master does not carry.
        { key: "shade",  label: "Shade #", unit: "",       kind: "text",   defaultValue: "", width: 65, affectsRate: false, showOnPrint: true, required: false, focusOnPick: false, lockedToItem: true },
        { key: "rtmm",   label: "RT/MM",   unit: "per mm", kind: "number", defaultValue: 0, width: 60, affectsRate: true,  showOnPrint: true, required: true,  focusOnPick: false, lockedToItem: false },
      ],
    },
  },
];

/* ───────────────────────── Normalising ─────────────────────── */

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeField(raw: unknown): RateFormulaField | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Partial<RateFormulaField>;
  const key = String(f.key || "").trim();
  if (validateKey(key)) return null; // unusable as an identifier — drop it

  const kind: RateFormulaFieldKind = f.kind === "text" ? "text" : "number";

  return {
    key,
    label: String(f.label || key),
    unit: String(f.unit || ""),
    kind,
    defaultValue: kind === "text"
      ? String(f.defaultValue ?? "").slice(0, RATE_FORMULA_TEXT_MAX)
      : num(f.defaultValue, 0),
    width: Math.min(200, Math.max(40, Math.round(num(f.width, 60)))),
    // A text column can never feed the rate, whatever the stored flag says —
    // the expression would be handed "15-L" and fail on every line.
    affectsRate: kind === "text" ? false : f.affectsRate !== false,
    showOnPrint: f.showOnPrint !== false,
    required: Boolean(f.required),
    focusOnPick: Boolean(f.focusOnPick),
    lockedToItem: Boolean(f.lockedToItem),
  };
}

export function normalizeRateFormula(value: unknown): RateFormulaSettings {
  const parsed = (value && typeof value === "object")
    ? value as Partial<RateFormulaSettings>
    : {};

  const seen = new Set<string>();
  const fields = (Array.isArray(parsed.fields) ? parsed.fields : [])
    .map((f) => normalizeField(f))
    .filter((f): f is RateFormulaField => {
      if (!f) return false;
      if (seen.has(f.key)) return false; // a duplicate key would shadow itself
      seen.add(f.key);
      return true;
    })
    .slice(0, 12); // a document line has to stay readable

  // The cursor can only land in one place. If more than one column claims it,
  // the first wins — silently, because there is nothing sensible to ask.
  let focusTaken = false;
  for (const f of fields) {
    if (!f.focusOnPick) continue;
    if (focusTaken) f.focusOnPick = false;
    focusTaken = true;
  }

  const docsRaw = (parsed.documents && typeof parsed.documents === "object")
    ? parsed.documents as Partial<RateFormulaDocMap>
    : {};

  return {
    enabled: Boolean(parsed.enabled),
    hidden: Boolean(parsed.hidden),
    profileName: String(parsed.profileName || ""),
    fields,
    expression: String(parsed.expression || ""),
    divisor: num(parsed.divisor, DEFAULT_RATE_FORMULA.divisor) || DEFAULT_RATE_FORMULA.divisor,
    rateDecimals: Math.min(4, Math.max(0, Math.round(num(parsed.rateDecimals, 0)))),
    rateEditable: parsed.rateEditable !== false,
    documents: Object.fromEntries(
      RATE_FORMULA_DOCS.map((d) => [d.key, Boolean(docsRaw[d.key])])
    ) as RateFormulaDocMap,
  };
}

/* ──────────────────────── Asking questions ─────────────────── */

/** The column the cursor jumps to after an item is picked, if any. */
export function rateFormulaFocusKey(settings: RateFormulaSettings): string | null {
  return settings.fields.find((f) => f.focusOnPick)?.key ?? null;
}

/** True only when this company should see formula columns on this document. */
export function isRateFormulaActive(
  settings: RateFormulaSettings | null | undefined,
  doc: RateFormulaDocKey
): boolean {
  if (!settings?.enabled) return false;
  if (!settings.expression.trim()) return false;
  if (!settings.fields.length) return false;
  return Boolean(settings.documents[doc]);
}

/** A blank line's starting values. */
export function emptyRateFormulaMeta(
  settings: RateFormulaSettings
): Record<string, RateFormulaValue> {
  const out: Record<string, RateFormulaValue> = {};
  for (const f of settings.fields) out[f.key] = f.defaultValue || "";
  return out;
}

/** Reads a stored `meta` JSON blob back into editable line values. */
export function readRateFormulaMeta(
  settings: RateFormulaSettings,
  meta: unknown
): Record<string, RateFormulaValue> {
  const source = (meta && typeof meta === "object") ? meta as Record<string, unknown> : {};
  const out: Record<string, RateFormulaValue> = {};
  for (const f of settings.fields) {
    const raw = source[f.key];
    if (raw === "" || raw === null || raw === undefined) {
      out[f.key] = "";
    } else if (f.kind === "text") {
      out[f.key] = String(raw).slice(0, RATE_FORMULA_TEXT_MAX);
    } else {
      out[f.key] = num(raw, 0);
    }
  }
  return out;
}

/**
 * Line values for a freshly picked item.
 *
 * The item's saved defaults win, because picking an item is the operator saying
 * "this is that product" — a stale gauge left over from the previous item on
 * the line would be worse than useless. Columns the item has nothing for keep
 * whatever is already on the line.
 */
export function metaFromItem(
  settings: RateFormulaSettings,
  itemMeta: unknown,
  currentMeta: Record<string, RateFormulaValue> | undefined
): Record<string, RateFormulaValue> {
  const fromItem = readRateFormulaMeta(settings, itemMeta);
  const out: Record<string, RateFormulaValue> = {};
  for (const f of settings.fields) {
    const saved = fromItem[f.key];
    out[f.key] = saved === "" ? (currentMeta?.[f.key] ?? "") : saved;
  }
  return out;
}

/* ─────────────────────────── Maths ─────────────────────────── */

export type RateFormulaResult = {
  ok: boolean;
  /** Rounded to `rateDecimals`; null when the formula could not run. */
  rate: number | null;
  error?: string;
};

/**
 * Runs the company's expression over one line's values.
 *
 * The expression goes through lib/formulaEngine — a real parser over a fixed
 * grammar, never `eval`. The author is a customer, and a customer's string must
 * not be able to reach the process.
 */
export function computeRateFromFormula(
  settings: RateFormulaSettings,
  values: Record<string, unknown>
): RateFormulaResult {
  const expression = settings.expression.trim();
  if (!expression) return { ok: false, rate: null, error: "No formula set" };

  const provided: Record<string, number> = { divisor: settings.divisor };
  for (const field of settings.fields) {
    // Text columns are still declared to the engine — as 0 — so an expression
    // that names one gets a clean "not a number" outcome rather than an
    // "unknown name" error the author would have no way to read.
    provided[field.key] = field.kind === "text" ? 0 : num(values[field.key], 0);
  }

  // A rate-affecting field left blank means the operator is still typing, not
  // that the rate is zero. Staying quiet beats flashing a wrong number.
  for (const field of settings.fields) {
    if (!field.affectsRate) continue;
    const raw = values[field.key];
    if (raw === "" || raw === null || raw === undefined) {
      return { ok: false, rate: null };
    }
  }

  const run = runFormula(
    {
      inputs: [
        { key: "divisor", label: "Divisor", defaultValue: settings.divisor },
        ...settings.fields.map((f) => ({
          key: f.key,
          label: f.label,
          unit: f.unit,
          // The engine only speaks numbers. A text column's default is a code,
          // so it is declared as 0 — `provided` above already pins it to 0 too,
          // and the validator refuses any expression that names one.
          defaultValue: typeof f.defaultValue === "number" ? f.defaultValue : 0,
        })),
      ],
      steps: [{ key: "computedRate", label: "Rate", expression }],
    },
    provided
  );

  const value = run.values["computedRate"];
  if (!run.ok || typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, rate: null, error: run.error || "Formula could not be calculated" };
  }

  const factor = Math.pow(10, settings.rateDecimals);
  return { ok: true, rate: Math.round(value * factor) / factor };
}

/**
 * Amount for one line. Deliberately the same shape the documents already use —
 * the formula changes where `rate` comes from, never what is done with it, so
 * totals, ledgers and stock valuation stay exactly as they were.
 */
export function rateFormulaLineAmount(rate: number, qty: number): number {
  return (Number(rate) || 0) * (Number(qty) || 0);
}

/* ────────────────────── Server-side line meta ──────────────── */

/**
 * Cleans a line's `meta` before it reaches the database.
 *
 * The client sends this, so it is not to be trusted with the shape of a JSONB
 * column: it is flattened to plain numbers and short strings under
 * identifier-safe keys, capped in size, and reduced to `undefined` when there
 * is nothing worth storing. `undefined` rather than `null` because that is what
 * Prisma reads as "leave this column alone", which on a create is the NULL
 * every ordinary line has — a company that does not use the feature stays
 * byte-identical to before.
 *
 * Strings are kept because a trade code is not a number: a shade is "15-L",
 * a batch is "B/2026-04". They are trimmed and length-capped rather than
 * rejected, so a stray paste cannot grow the row.
 */
export function sanitizeLineMeta(
  raw: unknown
): Record<string, number | string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const out: Record<string, number | string> = {};
  let count = 0;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= 12) break;
    if (validateKey(key)) continue;
    if (value === "" || value === null || value === undefined) continue;

    if (typeof value === "number") {
      if (!Number.isFinite(value)) continue;
      out[key] = value;
    } else if (typeof value === "string") {
      const trimmed = value.trim().slice(0, RATE_FORMULA_TEXT_MAX);
      if (!trimmed) continue;
      // A string that is plainly a number is stored as one, so a line typed
      // into a number column and a line pulled from an older document compare
      // and total the same way.
      const n = Number(trimmed);
      out[key] = Number.isFinite(n) && trimmed !== "" ? n : trimmed;
    } else {
      continue; // booleans, nested objects, arrays — not a line value
    }
    count++;
  }

  return count ? out : undefined;
}

/* ─────────────────────── Editor validation ─────────────────── */

export type RateFormulaProblem = {
  field: "expression" | "fields" | "profileName";
  message: string;
};

/** What the settings page shows before letting the company turn the switch on. */
export function validateRateFormula(settings: RateFormulaSettings): RateFormulaProblem[] {
  const problems: RateFormulaProblem[] = [];

  if (!settings.profileName.trim()) {
    problems.push({
      field: "profileName",
      message: "Give this setup a name — it labels the columns on your documents.",
    });
  }
  if (!settings.fields.length) {
    problems.push({ field: "fields", message: "Add at least one column." });
  } else if (!settings.fields.some((f) => f.affectsRate)) {
    problems.push({ field: "fields", message: "At least one column has to feed the rate." });
  }

  const expression = settings.expression.trim();
  if (!expression) {
    problems.push({ field: "expression", message: "Write the formula that works out the rate." });
    return problems;
  }

  const syntax = checkExpression(expression);
  if (syntax) {
    problems.push({ field: "expression", message: syntax });
    return problems;
  }

  // A text column named in the expression is always a mistake, and a quiet one:
  // it resolves to 0, so the rate comes out 0 (or the whole product does) with
  // no error anywhere. Say so plainly instead.
  for (const f of settings.fields) {
    if (f.kind !== "text") continue;
    if (new RegExp(`\\b${f.key}\\b`).test(expression)) {
      problems.push({
        field: "expression",
        message: `"${f.key}" is a text column, so it cannot be part of the maths. Switch it to Number, or take it out of the formula.`,
      });
    }
  }

  // Every name in the expression has to resolve, or a line silently shows no
  // rate at data-entry time with nothing on screen explaining why. Probing with
  // 1s rather than the defaults keeps a legitimate divide-by-a-default-of-0 from
  // being reported as a formula error.
  const probe = computeRateFromFormula(
    settings,
    Object.fromEntries(
      settings.fields.map((f) => [f.key, f.kind === "text" ? f.defaultValue : f.defaultValue || 1])
    )
  );
  if (!probe.ok && probe.error) {
    problems.push({ field: "expression", message: