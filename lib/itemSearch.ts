// FILE: lib/itemSearch.ts
//
// Finding one roll among a few thousand, the way the people who sell them
// think about it.
//
// A PVC item is named for its quality and then its dimensions — "B2 WHITE 10G
// 60in L50 White PHR26". Nobody types that. In the old system the operator
// typed `e1060` and got it: `e` is the end of WHITE, `10` the gauge, `60` the
// width. Three keystrokes of meaning, run together with no separators, because
// the old package matched against the fields concatenated end to end.
//
// A browser's own <select> type-ahead cannot do that — it matches from the
// start of the option text and gives up on the first mismatch — so the search
// has to be built rather than borrowed. The trick is only this: strip the unit
// letters that sit between the numbers, and "10G 60in L50" becomes "106050",
// which is what the operator is typing at.
//
// The same habit reaches for punctuation. A quality written "CRYSTAL SUPER
// CLEAR (DIAMOND)" ends in a bracket, so `)1060` is the operator's shorthand
// for it exactly as `e1060` is for WHITE. That only works if the bracket is
// still there to match against, which is why every item is keyed twice: once
// flattened to letters and digits, and once with its punctuation standing.

/**
 * Unit words as they appear wedged between two numbers. Longest first, because
 * they are consumed from the left and "in" would otherwise eat the front of
 * nothing while "i" is not a unit at all.
 */
const UNIT_TOKENS = ["phr", "pcs", "mm", "cm", "in", "kg", "ga", "g", "l", "m"];

/** Lowercase, letters and digits only. */
function alnum(value: string): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Lowercase with the spaces closed up but the punctuation left standing. */
function marked(value: string): string {
  return String(value ?? "").toLowerCase().replace(/\s+/g, "");
}

/** True when the whole run is unit words and nothing else. */
function isAllUnits(run: string): boolean {
  let rest = run;
  while (rest) {
    const hit = UNIT_TOKENS.find((token) => rest.startsWith(token));
    if (!hit) return false;
    rest = rest.slice(hit.length);
  }
  return true;
}

/**
 * Drops the unit letters caught between two numbers.
 *
 *   b2white10g60inl50whitephr26  ->  b2white106050whitephr26
 *
 * Only between two digits, and only when the whole run is units. "whitephr"
 * survives because "white" is not a unit — losing it would collapse two
 * different shades into one string and match the wrong roll.
 */
function stripUnits(key: string): string {
  return key.replace(/(\d)([a-z]+)(?=\d)/g, (_all, digit: string, run: string) =>
    isAllUnits(run) ? digit : digit + run,
  );
}

/** One string and, when the units fall out of it, the shortened one as well. */
function bothForms(text: string): string[] {
  if (!text) return [];
  const stripped = stripUnits(text);
  return stripped === text ? [text] : [text, stripped];
}

/**
 * What one item is searched against.
 *
 * `plain` is the text flattened to letters and digits — what a query without
 * punctuation is held to. `marked` keeps the brackets, dashes and slashes, so
 * a query that carries one is answered by the items that carry it too.
 *
 * Both are also stored with the unit letters taken out, because "white" has to
 * keep working as well as "e1060".
 */
export type ItemSearchKeys = { plain: string[]; marked: string[] };

export function itemSearchKeys(...parts: Array<string | undefined | null>): ItemSearchKeys {
  const joined = parts.filter(Boolean).join(" ");
  return { plain: bothForms(alnum(joined)), marked: bothForms(marked(joined)) };
}

/** Punctuation the operator is only ending a sentence with, never aiming at. */
function trimNoise(word: string): string {
  return word.replace(/[.,;:]+$/, "");
}

/**
 * Every word of the query has to appear somewhere in the item, so "white 60"
 * narrows in the order the person thinks of it rather than the order the name
 * happens to be written in.
 *
 * A word carrying punctuation is matched against the punctuated key alone.
 * Flattening it instead is what once made `)1060` mean plain `1060`, which is
 * every 10-gauge 60-inch roll in the godown rather than the one quality whose
 * name ends in that bracket.
 */
export function itemMatches(query: string, keys: ItemSearchKeys): boolean {
  const words = String(query ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  return words.every((word) => {
    const lowered = trimNoise(word.toLowerCase());
    if (!lowered) return true;

    const punctuated = /[^a-z0-9]/.test(lowered);
    const pool = punctuated ? keys.marked : keys.plain;
    if (pool.length === 0) return false;

    const needle = punctuated ? lowered : alnum(lowered);
    if (!needle) return true;
    const bare = stripUnits(needle);
    return pool.some((key) => key.includes(needle) || (bare !== needle && key.includes(bare)));
  });
}
