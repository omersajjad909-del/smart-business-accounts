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

/**
 * What one item is searched against: its text as written, and again with the
 * unit letters taken out. Both, because "white" has to keep working as well as
 * "e1060".
 */
export function itemSearchKeys(...parts: Array<string | undefined | null>): string[] {
  const full = alnum(parts.filter(Boolean).join(" "));
  if (!full) return [];
  const stripped = stripUnits(full);
  return stripped === full ? [full] : [full, stripped];
}

/**
 * Every word of the query has to appear somewhere in the item, so "white 60"
 * narrows in the order the person thinks of it rather than the order the name
 * happens to be written in.
 */
export function itemMatches(query: string, keys: string[]): boolean {
  const words = String(query ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  if (keys.length === 0) return false;

  return words.every((word) => {
    const needle = alnum(word);
    if (!needle) return true;
    const bare = stripUnits(needle);
    return keys.some((key) => key.includes(needle) || (bare !== needle && key.includes(bare)));
  });
}
