// FILE: lib/formulaUnits.ts
//
// Inch / centimetre switch for the costing screens.
//
// Formulas are written, saved and worked out in inches — the roll cost's
// weight divisor (rate x gauge x width x length / 54) is only right for a
// width in inches, and every saved formula already holds inch values. So the
// switch never touches the maths. It is a lens: anything whose unit is "in"
// is shown and typed in centimetres while cm is picked, and turned back into
// inches on the way into the engine.

import type { CostingFormula, FormulaRun, FormulaValue } from "@/lib/formulaEngine";

export type LengthUnit = "in" | "cm";

const CM_PER_IN = 2.54;
const INCH = new Set(["in", "inch", "inches", '"']);

export const isInchUnit = (unit?: string) => INCH.has((unit ?? "").trim().toLowerCase());

// Four places is well past anything a ruler reads, and stops 11.5in from
// coming back as 29.209999999999997cm.
const tidy = (n: number) => Math.round(n * 1e4) / 1e4;

function convert(v: FormulaValue, from: LengthUnit, to: LengthUnit): FormulaValue {
  if (from === to) return v;
  const f = (n: number) => tidy(to === "cm" ? n * CM_PER_IN : n / CM_PER_IN);
  return Array.isArray(v) ? v.map(f) : f(v);
}

/** The formula as the screen should show it: inch boxes relabelled and their values in cm. */
export function inLengthUnit<T extends CostingFormula>(formula: T, unit: LengthUnit): T {
  if (unit === "in") return formula;
  return {
    ...formula,
    inputs: formula.inputs.map((i) =>
      isInchUnit(i.unit)
        ? {
            ...i,
            unit: "cm",
            ...(i.defaultValue != null ? { defaultValue: convert(i.defaultValue, "in", "cm") as number } : {}),
            ...(i.listValue ? { listValue: convert(i.listValue, "in", "cm") as number[] } : {}),
          }
        : i),
    steps: formula.steps.map((s) => (isInchUnit(s.unit) ? { ...s, unit: "cm" } : s)),
    outputs: formula.outputs.map((o) => (isInchUnit(o.unit) ? { ...o, unit: "cm" } : o)),
  };
}

/** Typed values moved between units — for the switch itself, and for handing cm values to the engine. */
export function convertValues(
  formula: CostingFormula,
  values: Record<string, FormulaValue>,
  from: LengthUnit,
  to: LengthUnit,
): Record<string, FormulaValue> {
  if (from === to) return values;
  const next = { ...values };
  for (const i of formula.inputs) {
    if (isInchUnit(i.unit) && next[i.key] != null) next[i.key] = convert(next[i.key], from, to);
  }
  return next;
}

/** A run worked out in inches, with every inch figure read back out in the picked unit. */
export function runInLengthUnit(run: FormulaRun, formula: CostingFormula, unit: LengthUnit): FormulaRun {
  if (unit === "in") return run;
  const inch = new Set(
    [...formula.inputs, ...formula.steps, ...formula.outputs].filter((r) => isInchUnit(r.unit)).map((r) => r.key),
  );
  const values: Record<string, FormulaValue> = {};
  for (const [k, v] of Object.entries(run.values)) values[k] = inch.has(k) ? convert(v, "in", "cm") : v;
  return {
    ...run,
    values,
    steps: run.steps.map((s) =>
      inch.has(s.key)
        ? { ...s, unit: "cm", value: s.value == null ? s.value : convert(s.value, "in", "cm") }
        : s),
  };
}

const STORE_KEY = "finova.costing.lengthUnit";

/** The last unit this browser picked — a convenience, so an export desk stays on cm. */
export function loadLengthUnit(): LengthUnit {
  try {
    return window.localStorage.getItem(STORE_KEY) === "cm" ? "cm" : "in";
  } catch {
    return "in";
  }
}

export function saveLengthUnit(unit: LengthUnit) {
  try {
    window.localStorage.setItem(STORE_KEY, unit);
  } catch {
    /* private window or blocked storage — the switch still works for this visit */
  }
}
