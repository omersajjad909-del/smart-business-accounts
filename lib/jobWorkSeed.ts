/**
 * Costing formula → job work challan.
 *
 * The manufacturing side already has this bridge: a costing run's "Produce
 * this" hands Manufacturing → Bill of Materials the numbers it worked out, and
 * production then consumes against them. Job work had no such bridge, so the
 * operator was asked to type the one number the formula computes exactly —
 * how much material one finished piece takes — and typing it turned an exact
 * figure into a guess.
 *
 * This module reads that figure, and the few around it, off a formula run:
 *
 *     units per batch      →  pieces that come off one roll
 *     1 / units per batch  →  material per piece — the standard
 *     std × order qty      →  rolls the job actually needs   (12.6)
 *     ceil(that)           →  whole rolls that must go out   (13)
 *     the difference       →  leftover — stock, never scrap  (0.4)
 *
 * Those last three are the answer to "12.5 ya 12.6 ya 12.7": all three are
 * right, for three different sizes, and the formula says which. The number was
 * never unknowable — job work simply had no way to ask for it.
 *
 * Nothing here writes anything. It is arithmetic over a run the costing screen
 * has already done, so the same numbers can seed a challan and be stamped on it
 * for the receipt to compare against later.
 */

import type { CostingFormula, FormulaRun } from "@/lib/formulaEngine";

/** Charges named in money units read as conversion cost, not material. */
const LABOUR_CHARGE = /lab(o|ou)r|wage|stitch|sewing|making/i;
const MONEY_UNIT = /^(rs|pkr|inr|usd|eur|gbp|aed|sar|\$|₨|₹|£|€)$/i;

function isMoneyUnit(unit?: string): boolean {
  return MONEY_UNIT.test(String(unit || "").trim());
}

/**
 * An input whose value is the size of the order being costed.
 *
 * There is no output role for this — roles describe what a formula *computes*,
 * and the order quantity is something the operator typed. Matching on the key
 * is therefore best-effort and deliberately narrow: a wrong guess here would
 * pre-fill a challan with somebody else's quantity, which is worse than
 * pre-filling nothing.
 */
const ORDER_QTY_KEY = /^(order|total|batch)?_?(qty|quantity|pcs|pieces)$/i;

export type JobWorkSeed = {
  formulaId: string;
  formulaName: string;
  formulaVersion: number;
  /** Pieces one batch of material yields — piecesPerRoll and its cousins. */
  unitsPerBatch: number | null;
  /** Material per finished piece. The standard the whole module turns on. */
  stdPerPc: number | null;
  /** What the formula says one piece costs, to compare the real cost against. */
  costPerUnit: number | null;
  /** What one batch of material costs. */
  costPerBatch: number | null;
  /** Conversion charges per piece — the job worker's rate, when the formula names one. */
  labourPerUnit: number | null;
  /** Trim loss the formula expects per batch. Genuine waste, unlike leftover. */
  wastePerBatch: number | null;
  /** Order size, when the formula was run against one. */
  orderQty: number | null;
};

/** What one order needs, in whole units of material and the part left over. */
export type IssuePlan = {
  /** Exactly what the job consumes — 12.6, and fractional on purpose. */
  needed: number;
  /** Whole units that must physically leave the rack — 13. */
  toIssue: number;
  /**
   * The part of the last unit the job never touches — 0.4.
   *
   * Not wastage. It comes back, or it stays on the worker's floor for the next
   * order; either way it is still the company's material and must never be
   * charged to this batch.
   */
  leftover: number;
};

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

/**
 * Turns a standard and an order size into what actually has to go out.
 *
 * Shared by the seed and by the challan screen, which re-runs it whenever the
 * operator changes the expected pieces — so the two can never disagree about
 * how many rolls a job needs.
 */
export function planIssue(stdPerPc: number | null, pcs: number): IssuePlan | null {
  if (!stdPerPc || !Number.isFinite(stdPerPc) || stdPerPc <= 0) return null;
  if (!Number.isFinite(pcs) || pcs <= 0) return null;
  const needed = r4(stdPerPc * pcs);
  const toIssue = Math.ceil(r4(needed));
  return { needed, toIssue, leftover: r4(toIssue - needed) };
}

/**
 * Reads a formula run for everything job work needs.
 *
 * Returns null when the run failed or the formula declares no
 * `units_per_batch` output — without that there is no standard to derive, and
 * seeding a challan with a blank standard would only look like it worked.
 */
export function buildJobWorkSeed(
  formulaId: string,
  formula: CostingFormula,
  run: FormulaRun | null,
): JobWorkSeed | null {
  if (!run?.ok) return null;

  const numberFor = (key: string | undefined): number | null => {
    if (!key) return null;
    const value = run.values[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };
  const byRole = (role: string) =>
    numberFor(formula.outputs.find((o) => o.role === role)?.key);

  const unitsPerBatch = byRole("units_per_batch");
  if (unitsPerBatch == null || unitsPerBatch <= 0) return null;

  // The charges are named in the cost-per-unit expression: an identifier there
  // that is also a money-valued input of this formula is a per-piece charge.
  // Anything nested inside another step is material working, not a charge.
  //
  // The BOM seed on the costing screen works this out the same way. The two
  // should become one helper the next time either is touched; they are kept
  // apart today so adding job work cannot disturb a BOM path already in use.
  const unitKey = formula.outputs.find((o) => o.role === "cost_per_unit")?.key;
  const unitStep = formula.steps.find((s) => s.key === unitKey);
  const inputByKey = new Map(formula.inputs.map((i) => [i.key, i]));
  let labourPerUnit = 0;
  const seen = new Set<string>();
  for (const token of unitStep?.expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []) {
    if (seen.has(token)) continue;
    seen.add(token);
    const input = inputByKey.get(token);
    if (!input || input.isList || !isMoneyUnit(input.unit)) continue;
    const value = numberFor(token);
    if (value == null || value <= 0) continue;
    if (LABOUR_CHARGE.test(token) || LABOUR_CHARGE.test(input.label || "")) {
      labourPerUnit += value;
    }
  }

  let orderQty: number | null = null;
  for (const input of formula.inputs) {
    if (input.isList || !ORDER_QTY_KEY.test(input.key)) continue;
    const value = numberFor(input.key);
    if (value != null && value > 0) {
      orderQty = Math.floor(value);
      break;
    }
  }

  return {
    formulaId,
    formulaName: formula.name,
    formulaVersion: formula.version,
    unitsPerBatch,
    stdPerPc: r4(1 / unitsPerBatch),
    costPerUnit: byRole("cost_per_unit"),
    costPerBatch: byRole("cost_per_batch"),
    labourPerUnit: labourPerUnit > 0 ? Math.round(labourPerUnit * 100) / 100 : null,
    wastePerBatch: byRole("waste_qty"),
    orderQty,
  };
}

/** Query string the costing screen hands to Job Work → Issue Challan. */
export function jobWorkHrefFrom(seed: JobWorkSeed | null): string {
  if (!seed) return "/dashboard/job-work";
  const qs = new URLSearchParams();
  qs.set("formulaId", seed.formulaId);
  qs.set("formulaName", seed.formulaName);
  qs.set("formulaVersion", String(seed.formulaVersion));
  if (seed.stdPerPc != null) qs.set("stdPerPc", String(seed.stdPerPc));
  if (seed.unitsPerBatch != null) qs.set("unitsPerBatch", String(seed.unitsPerBatch));
  if (seed.orderQty != null) qs.set("expectedPcs", String(seed.orderQty));
  if (seed.labourPerUnit != null) qs.set("ratePerPc", String(seed.labourPerUnit));
  if (seed.costPerUnit != null) qs.set("costPerUnit", String(seed.costPerUnit));
  if (seed.costPerBatch != null) qs.set("costPerBatch", String(seed.costPerBatch));
  if (seed.wastePerBatch != null) qs.set("wastePerBatch", String(seed.wastePerBatch));
  return `/dashboard/job-work?${qs.toString()}`;
}
