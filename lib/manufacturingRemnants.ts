/**
 * Part-used material — the arithmetic half.
 *
 * A production run needing 12.66 rolls has to take 13 off the rack, and the
 * balance of the thirteenth used to vanish into the cost of that batch: the next
 * order for ten bags began by opening a fourteenth roll. The balance is kept
 * instead, and the next run eats it before it touches stock.
 *
 * This file is deliberately free of the database and of Prisma, so the rule that
 * decides what a run consumes can be read, reasoned about and tested on its own.
 * lib/manufacturingPosting.ts is what actually moves the stock and posts the
 * ledger, and re-exports everything here so callers see one module.
 */

/** One part-used piece of material, held as a BusinessRecord. */
export type RemnantPiece = {
  id: string;
  itemId: string;
  qty: number;
  unitCost: number;
  location: string;
};

/** BusinessRecord category the open pieces live in. */
export const MATERIAL_REMNANT_CATEGORY = "material_remnant";

/** Below this a remnant is float dust, not material. */
export const REMNANT_EPSILON = 1e-6;

/** Quantities carry six decimals; money carries two. */
export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export type LinePlan = {
  exactQty: number;
  fromRemnantQty: number;
  fromRemnantCost: number;
  /** Which open pieces to draw down, and by how much. */
  takes: { recordId: string; qty: number }[];
  /** Whole units that must leave stock. */
  issueQty: number;
  leftoverQty: number;
  leftoverCost: number;
  /** What the batch is charged — the leftover is not part of it. */
  materialCost: number;
};

/**
 * Works out where one BOM line's material comes from.
 *
 * Pure arithmetic, no database — both the quote and the posting run it, so the
 * screen can never promise a different consumption from the one that happens.
 *
 *   non-divisible : whole units, exactly as it always worked.
 *   divisible     : open pieces first, then whole units off the rack, and the
 *                   unused part of the last one comes back as a new open piece.
 */
export function planLineConsumption(opts: {
  exactQty: number;
  divisible: boolean;
  unitCost: number;
  remnants: RemnantPiece[];
}): LinePlan {
  const need = round6(Math.max(0, opts.exactQty));

  if (!opts.divisible) {
    const issueQty = Math.ceil(need);
    return {
      exactQty: need,
      fromRemnantQty: 0,
      fromRemnantCost: 0,
      takes: [],
      issueQty,
      leftoverQty: 0,
      leftoverCost: 0,
      materialCost: issueQty * opts.unitCost,
    };
  }

  let remaining = need;
  const takes: { recordId: string; qty: number }[] = [];
  let fromRemnantQty = 0;
  let fromRemnantCost = 0;

  for (const piece of opts.remnants) {
    if (remaining <= REMNANT_EPSILON) break;
    const use = Math.min(piece.qty, remaining);
    if (use <= REMNANT_EPSILON) continue;
    takes.push({ recordId: piece.id, qty: round6(use) });
    fromRemnantQty = round6(fromRemnantQty + use);
    // Each piece is valued at what it cost when it was set aside, not at
    // today's average — the value was fixed the day the roll was opened.
    fromRemnantCost += use * piece.unitCost;
    remaining = round6(remaining - use);
  }

  const issueQty = Math.ceil(round6(remaining));
  const leftoverQty = round6(issueQty - remaining);

  return {
    exactQty: need,
    fromRemnantQty,
    fromRemnantCost,
    takes,
    issueQty,
    leftoverQty,
    leftoverCost: leftoverQty * opts.unitCost,
    materialCost: fromRemnantCost + remaining * opts.unitCost,
  };
}
