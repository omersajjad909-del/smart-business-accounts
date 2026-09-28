// FILE: lib/formulaUnits.ts
//
// Bag sizes typed in centimetres.
//
// Everything in costing stays in inches — the maths, the results, the stock
// widths, the cutting setup. Export parties hand over a bag's size in cm, so
// the switch only lets those size boxes be typed in cm; they are turned into
// inches on the way into the engine and nothing else on screen changes.

import type { CostingFormula, FormulaInput, FormulaValue } from "@/lib/formulaEngine";

export type LengthUnit = "in" | "cm";

const CM_PER_IN = 2.54;
const INCH = new Set(["in", "inch", "inches", '"']);

export const isInchUnit = (unit?: string) => INCH.has((unit ?? "").trim().toLowerCase());

/**
 * A size of the bag itself — what a party quotes the job by. The bag details
 * block, plus the six sealer's ear, which sits with its guezzet roll. A roll's
 * stock widths and cutting setup are the factory's own and stay in inches.
 */
export const isSizeInput = (i: Pick<FormulaInput, "key" | "unit" | "isList" | "group">) =>
  isInchUnit(i.unit) && !i.isList && ((i.group ?? "").trim() === "Bag details" || i.key === "ear");

// Four places is well past anything a ruler reads, and stops 11.5in from
// coming back as 29.209999999999997cm. For showing a number only — a typed
// value keeps its full precision, or 30cm switched to inches and back would
// come home as 29.9999.
export const tidy = (n: number) => Math.round(n * 1e4) / 1e4;

export const cmToIn = (n: number) => n / CM_PER_IN;
export const inToCm = (n: number) => n * CM_PER_IN;

/** The formula as the screen should show it: size boxes relabelled cm, their defaults in cm. */
export function inLengthUnit<T extends CostingFormula>(formula: T, unit: LengthUnit): T {
  if (unit === "in") return formula;
  return {
    ...formula,
    inputs: formula.inputs.map((i) =>
      isSizeInput(i)
        ? { ...i, unit: "cm", ...(i.defaultValue != null ? { defaultValue: tidy(inToCm(i.defaultValue)) } : {}) }
        : i),
  };
}

/** Typed sizes moved between units — for the switch itself, and for handing cm sizes to the engine. */
export function convertValues(
  formula: CostingFormula,
  values: Record<string, FormulaValue>,
  from: LengthUnit,
  to: LengthUnit,
): Record<string, FormulaValue> {
  if (from === to) return values;
  const next = { ...values };
  for (const i of formula.inputs) {
    const v = next[i.key];
    if (isSizeInput(i) && typeof v === "number") next[i.key] = to === "cm" ? inToCm(v) : cmToIn(v);
  }
  return next;
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
