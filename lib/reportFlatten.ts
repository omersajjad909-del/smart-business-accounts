// FILE: lib/reportFlatten.ts
//
// Turns a flattened report export back into a table.
//
// Oracle Reports — and the Forms-era packages built on it, AHC SOFT among them
// — do not always write a grid when asked for delimited output. When the report
// layout has grouping frames, each detail record comes out on one line carrying
// its whole layout context: the column headings, the report totals, every group
// code and name it sits inside, and the totals of each of those groups. One
// account per line, but forty-one fields, only eight of which are the account.
//
// A trial balance for one company arrives like this, every line identical up to
// field 13:
//
//   Code | A c c o u n t  D e s c r i p t i o n | Opening Debit | … | Closing Credit
//        ^ 0 .. 7   the column headings, repeated on every single line
//   13,000 | 13,000 | 2,748,820,620 | 3,017,292,899 | 18,719,249 | 287,191,528
//        ^ 8 .. 13  report totals, repeated on every single line
//   03 | 0303 | 03030001 | AKRAM (SALARY) | 0 | 0 | 1,126,000 | 1,077,000 | 49,000 | 0
//        ^ 14,15 group codes  ^ 16 code  ^ 17 name  ^ 18 .. 23 THIS account's figures
//   EMPLOYEES | 0 | 0 | 31,461,818 | …
//        ^ 24 the control head this account is under, then its totals
//   SHORT TERM LIABILITIES | Report Total: | …
//        ^ 31 the main head, then the report footer
//
// Read as an ordinary CSV that is a disaster: line one becomes a forty-one
// column header, and all 359 remaining lines read as data whose first column is
// the literal word "Code". The preview cheerfully reported "359 rows, 359 will
// import" — hundreds of accounts about to be created named after a column
// heading.
//
// It is, however, perfectly regular, so it can be read exactly rather than
// guessed at. And it is better than a plain export would have been: the group
// names are right there on every line, so each account arrives already knowing
// it belongs under SUPPLIERS inside SHORT TERM LIABILITIES, and classifies
// correctly without any hierarchy having to be inferred.

import { parseCsvRecords, toCsv } from "@/lib/csvParse";

export type FlattenResult = {
  /** CSV to feed the ordinary importer. Unchanged input when nothing matched. */
  text: string;
  /** True when the input was recognised and rewritten. */
  converted: boolean;
  /** Shown in the preview so the operator knows what happened to their file. */
  note?: string;
  /** Column headings recovered from the repeated prefix. */
  headers?: string[];
};

/** Blank, or something that is only digits, separators and a sign. */
function isAmountish(value: string): boolean {
  const s = String(value ?? "").trim();
  if (s === "") return true;
  return /^[(+-]?[\d,. ]+\)?$/.test(s) && /\d/.test(s);
}

/** Has at least one letter — a name or a heading rather than a figure. */
function isTextish(value: string): boolean {
  return /[A-Za-z]/.test(String(value ?? ""));
}

/** The footer labels a report puts after the last group. */
function isFooterLabel(value: string): boolean {
  return /\b(report\s*total|grand\s*total|total|difference|page)\b/i.test(String(value ?? ""));
}

/**
 * Some reports letter-space a heading for looks — "A c c o u n t
 * D e s c r i p t i o n". Left alone it is still matched by the importer's
 * containment pass, but it reads as nonsense in the preview, so single letters
 * separated by single spaces are pushed back together.
 */
function unspaceHeading(heading: string): string {
  const s = String(heading ?? "").trim();
  if (!/^(?:[A-Za-z]\s+)+[A-Za-z]$/.test(s.replace(/\s{2,}/g, "  "))) {
    // Not uniformly letter-spaced; only collapse runs of single letters.
    return s.replace(/\b(?:[A-Za-z]\s){2,}[A-Za-z]\b/g, (run) => run.replace(/\s+/g, ""))
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return s.replace(/\s+/g, "");
}

/**
 * How many leading fields are the same text on every record.
 *
 * Stops at the first field that is a number even if it repeats — the report
 * totals sit right behind the headings and are identical on every line too, so
 * "identical" alone would swallow them and take the heading count with it.
 */
function repeatedHeadingWidth(records: string[][]): number {
  if (records.length < 2) return 0;
  const first = records[0];
  let width = 0;
  while (width < first.length) {
    const cell = first[width];
    if (!isTextish(cell) || isAmountish(cell)) break;
    if (!records.every((r) => (r[width] ?? "") === cell)) break;
    width += 1;
  }
  return width;
}

/**
 * Rewrites a flattened export into a table, or hands back the input untouched.
 *
 * Everything is checked rather than assumed. If any expectation fails the file
 * is returned as it came, and the ordinary reader — and the not-a-table guard
 * in /api/import — deal with it. Silently half-converting a file nobody
 * recognised would be worse than refusing it.
 */
export function flattenRepeatedReportExport(input: string): FlattenResult {
  const unchanged: FlattenResult = { text: input, converted: false };

  const { records } = parseCsvRecords(input);
  // One line per detail record, so a real one of these is never two lines long,
  // and the headings have to repeat to be detected at all.
  if (records.length < 3) return unchanged;

  const width = repeatedHeadingWidth(records);
  // Needs at least a code, a description and one figure to be worth rewriting.
  if (width < 3) return unchanged;

  const headings = records[0].slice(0, width).map(unspaceHeading);
  // The layout is [code, description, …figures]; anything else is a shape this
  // function has not seen and must not guess at.
  const amountCols = width - 2;
  if (amountCols < 1) return unchanged;

  const rows: string[][] = [];
  const groupsPerRow: string[][] = [];

  for (const record of records) {
    // Find the detail block: a name, immediately followed by exactly this
    // report's number of figures. The group codes sit just before it and are
    // all digits, so the first field with a letter in it that is trailed by a
    // full run of figures is the account's own name.
    let nameAt = -1;
    for (let i = width; i < record.length; i += 1) {
      if (!isTextish(record[i]) || isFooterLabel(record[i])) continue;
      let allAmounts = true;
      for (let k = 1; k <= amountCols; k += 1) {
        if (!isAmountish(record[i + k] ?? "")) { allAmounts = false; break; }
      }
      if (allAmounts && i - 1 >= width) { nameAt = i; break; }
    }
    if (nameAt === -1) return unchanged;

    const code = (record[nameAt - 1] ?? "").trim();
    const name = (record[nameAt] ?? "").trim();
    if (!code || !name) return unchanged;

    const figures: string[] = [];
    for (let k = 1; k <= amountCols; k += 1) figures.push((record[nameAt + k] ?? "").trim());

    // Past the detail block the same shape repeats once per enclosing group,
    // innermost first: a group name, then that group's own figures.
    const groups: string[] = [];
    let cursor = nameAt + amountCols + 1;
    while (cursor < record.length) {
      const label = (record[cursor] ?? "").trim();
      if (!label || !isTextish(label) || isFooterLabel(label)) break;
      groups.push(label);
      cursor += amountCols + 1;
    }

    rows.push([code, name, ...figures]);
    groupsPerRow.push(groups);
  }

  // Every account came out of the same report, so they all sit the same number
  // of groups deep. A ragged count means the shape was misread.
  const depth = Math.max(0, ...groupsPerRow.map((g) => g.length));

  const outHeaders = [...headings];
  if (depth >= 1) outHeaders.push("Control Head");
  if (depth >= 2) outHeaders.push("Main Head Title");

  const outRows = rows.map((row, index) => {
    const groups = groupsPerRow[index];
    const out = [...row];
    // Innermost group first, outermost last — SUPPLIERS inside SHORT TERM
    // LIABILITIES. The inner one classifies; the outer is the fallback. Both
    // are named to match the aliases readAccountRow already looks for.
    if (depth >= 1) out.push(groups[0] ?? "");
    if (depth >= 2) out.push(groups[groups.length - 1] ?? "");
    return out;
  });

  const note =
    `This file was exported one line per record with the report layout wrapped ` +
    `around it. ${outRows.length.toLocaleString()} records were unwrapped into ` +
    `${outHeaders.length} columns` +
    (depth >= 1 ? `, and the group each account sits under was recovered.` : `.`);

  return { text: toCsv(outHeaders, outRows), converted: true, note, headers: outHeaders };
}
