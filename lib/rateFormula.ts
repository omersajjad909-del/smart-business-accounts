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

/** One column the operator types on each document line. */
export type RateFormulaField = {
  /** Identifier used inside the expression. Letters, digits, underscore. */
  key: string;
  /** Column heading on screen and on print. */
  label: string;
  /** Free text, shown as a hint. "mm", "in", "m" — display only. */
  unit: string;
  /** Pre-filled on a fresh line. */
  defaultValue: number;
  /** Grid/print column width in px. */
  width: number;
  /**
   * false = recorded and printed but not part of the maths. A shade number or
   * a PHR reading belongs on the bill without touching the rate.
   */
  affectsRate: boolean;
  showOnPrint: boolean;
  /** Blocks saving the document while empty. */
  required: boolean;
};

/** Documents the formula can drive. Each is opt-in. */
export const RATE_FORMULA_DOCS = [
  { key: "purchaseOrder",   label: "Purchase Order",      route: "/dashboard/purchase-order" },
  { key: "grn",             label: "GRN / Goods Receipt", route: "/dashboard/grn" },
  { key: "purchaseInvoice", label: "Purchase Invoice",    route: "/dashboard/purchase-invoice" },
  { key: "purchaseReturn",  label: "Purchase Return",     route: "/dashboard/purchase-return" },
  { key: "salesOrder",      label: "Sales Order",         route: "/dashboard/sales-order" },
  { key: "salesInvoice",    label: "Sales Invoice",       route: "/dashboard/sales-invoice" },
  { key: "saleReturn",      label: "Sale Return",         route: "/dashboard/sale-return" },
  { key: "quotation",       label: "Quotation",           route: "/dashboard/quotation" },
  { key: "deliveryChallan", label: "Delivery Challan",    route: "/dashboard/delivery-challan" },
  { key: "outward",         label: "Outward / Dispatch",  route: "/dashboard/outward" },
  { key: "inventory",       label: "Inventory & Stock",   route: "/dashboard/inventory" },
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
  purchaseOrder: false,
  grn: false,
  purchaseInvoice: false,
  purchaseReturn: false,
  salesOrder: false,
  salesInvoice: false,
  saleReturn: false,
  quotation: false,
  deliveryChallan: false,
  outward: false,
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
        { key: "gauge",  label: "Gauge",   unit: "",       defaultValue: 0, width: 60, affectsRate: true,  showOnPrint: true, required: true },
        { key: "width",  label: "Width",   unit: "in",     defaultValue: 0, width: 60, affectsRate: true,  showOnPrint: true, required: true },
        { key: "length", label: "Length",  unit: "m",      defaultValue: 0, width: 60, affectsRate: true,  showOnPrint: true, required: true },
        { key: "phr",    label: "PHR",     unit: "",       defaultValue: 0, width: 55, affectsRate: false, showOnPrint: true, required: false },
        { key: "shade",  label: "Shade #", unit: "",       defaultValue: 0, width: 60, affectsRate: false, showOnPrint: true, required: false },
        { key: "rtmm",   label: "RT/MM",   unit: "per mm", defaultValue: 0, width: 60, affectsRate: true,  showOnPrint: true, required: true },
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
  return {
    key,
    label: String(f.label || key),
    unit: String(f.unit || ""),
    defaultValue: num(f.defaultValue, 0),
    width: Math.min(200, Math.max(40, Math.round(num(f.width, 60)))),
    affectsRate: f.affectsRate !== false,
    showOnPrint: f.showOnPrint !== false,
    required: Boolean(f.required),
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
): Record<string, number | ""> {
  const out: Record<string, number | ""> = {};
  for (const f of settings.fields) out[f.key] = f.defaultValue || "";
  return out;
}

/** Reads a stored `meta` JSON blob back into editable line values. */
export function readRateFormulaMeta(
  settings: RateFormulaSettings,
  meta: unknown
): Record<string, number | ""> {
  const source = (meta && typeof meta === "object") ? meta as Record<string, unknown> : {};
  const out: Record<string, number | ""> = {};
  for (const f of settings.fields) {
    const raw = source[f.key];
    out[f.key] = raw === "" || raw === null || raw === undefined ? "" : num(raw, 0);
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
    provided[field.key] = num(values[field.key], 0);
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
          defaultValue: f.defaultValue,
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
 * column: it is flattened to plain numbers under identifier-safe keys, capped
 * in size, and reduced to `undefined` when there is nothing worth storing.
 * `undefined` rather than `null` because that is what Prisma reads as "leave
 * this column alone", which on a create is the NULL every ordinary line has —
 * a company that does not use the feature stays byte-identical to before.
 */
export function sanitizeLineMeta(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const out: Record<string, number> = {};
  let count = 0;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= 12) break;
    if (validateKey(key)) continue;
    if (value === "" || value === null || value === undefined) continue;
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    out[key] = n;
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

  // Every name in the expression has to resolve, or a line silently shows no
  // rate at data-entry time with nothing on screen explaining why. Probing with
  // 1s rather than the defaults keeps a legitimate divide-by-a-default-of-0 from
  // being reported as a formula error.
  const probe = computeRateFromFormula(
    settings,
    Object.fromEntries(settings.fields.map((f) => [f.key, f.defaultValue || 1]))
  );
  if (!probe.ok && probe.error) {
    problems.push({ field: "expression", message: probe.error });
  }

  return problems;
}
