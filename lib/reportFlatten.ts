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


/* ───────────────────── Party ledgers ───────────────────── */

/** Lowercased, with everything that is not a letter or a digit removed. */
function squash(value: string): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** dd-mm-yy, dd/mm/yyyy, dd-MON-yy — the shapes a ledger prints a date in. */
function isDateish(value: string): boolean {
  const s = String(value ?? "").trim();
  return /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(s) || /^\d{1,2}[-/ ][A-Za-z]{3,}[-/ ]\d{2,4}$/.test(s);
}

/** Where a field with this squashed heading sits in the record, or -1. */
function indexOfLabel(record: string[], label: string): number {
  return record.findIndex((f) => squash(f) === label);
}

const LEDGER_HEADERS = [
  "code", "party", "voucherNo", "voucherType", "date", "narration", "debit", "credit", "balance",
];

/**
 * A party ledger exported one line per posting, with the whole report wrapped
 * around each one.
 *
 * The same Forms-era flattening as flattenRepeatedReportExport above, but a
 * different shape, and the general function cannot read it: the second field is
 * the account code, which is all digits, so the repeated-prefix scan stops
 * after one column and gives up.
 *
 * Every line looks like this — headings, footer and all, repeated in full:
 *
 *   A/c Code: | 04070233 | Account Title: | US BUTTONS FAISALABAD |
 *   Num &Type | Date | N a r r a t i o n | D e b i t | C r e d i t | B a l a n c e |
 *   401 | CRV | 25-11-24 | CASH | 0 | 16,000 | -16,000 | Cr |
 *   Credit Amount : | 0 | Credit Days : | Total | Balance:- | … | Statement Ended …
 *
 * Which is far better than it looks. The account code and title are on *every
 * line*, so one export covering five hundred parties needs no splitting and no
 * file-per-party: each posting already says whose it is. That is the whole
 * reason this function exists — exporting five hundred ledgers by hand is not
 * a migration plan.
 *
 * The posting itself is found by its date rather than by counting fields. A
 * blank narration would shift every column after it, and counting from the left
 * would then read the debit as the narration and the credit as the debit, on
 * exactly the rows nobody checks.
 */
export function flattenLedgerExport(input: string): FlattenResult {
  const unchanged: FlattenResult = { text: input, converted: false };

  const { records } = parseCsvRecords(input);
  if (records.length < 2) return unchanged;

  // Every line has to carry the markers, not most of them. A file where only
  // some do is a different report that happens to share a word.
  const marked = records.filter(
    (r) => indexOfLabel(r, "accode") !== -1 && indexOfLabel(r, "accounttitle") !== -1,
  );
  if (marked.length !== records.length) return unchanged;

  const rows: string[][] = [];

  for (const record of records) {
    const codeAt = indexOfLabel(record, "accode");
    const titleAt = indexOfLabel(record, "accounttitle");
    const code = (record[codeAt + 1] ?? "").trim();
    const party = (record[titleAt + 1] ?? "").trim();
    if (!code && !party) return unchanged;

    // The posting sits between the last column heading and the first footer
    // label. Both are fixed text on every line, so the window is exact rather
    // than guessed at.
    const headingEnd = indexOfLabel(record, "balance");
    if (headingEnd === -1) return unchanged;
    const footerAt = indexOfLabel(record, "creditamount");
    const run = record
      .slice(headingEnd + 1, footerAt === -1 ? record.length : footerAt)
      .map((f) => f.trim());

    const dateAt = run.findIndex(isDateish);
    // A ledger that has been run for a party with no postings still prints the
    // headings and the footer. Nothing between them is not a failure, it is an
    // empty ledger, so the line is dropped rather than the file refused.
    if (dateAt === -1) continue;
    if (dateAt < 2) return unchanged;

    const voucherNo = run[dateAt - 2] ?? "";
    const voucherType = run[dateAt - 1] ?? "";
    const date = run[dateAt];

    const rest = run.slice(dateAt + 1).filter((f) => f !== "");
    // Narration only when the field after the date is text. On a row with no
    // narration the debit follows the date directly.
    const hasNarration = rest.length > 0 && isTextish(rest[0]) && !isAmountish(rest[0]);
    const narration = hasNarration ? rest[0] : "";
    const figures = rest.slice(hasNarration ? 1 : 0);

    const debit = figures[0] ?? "";
    const credit = figures[1] ?? "";
    let balance = figures[2] ?? "";
    if (!isAmountish(debit) || !isAmountish(credit)) return unchanged;

    // AHC prints the running balance signed *and* suffixed — "-16,000" then
    // "Cr". Other layouts print it unsigned and lean on the suffix alone. The
    // suffix is authoritative either way, because the writer works out a
    // party's opening from the first line's balance minus its own posting, and
    // an unsigned credit balance read as a debit puts the opening out by twice
    // the amount.
    const marker = squash(figures[3] ?? "");
    if (balance && (marker === "cr" || marker === "dr")) {
      const bare = balance.replace(/^[-+]/, "");
      balance = marker === "cr" ? `-${bare}` : bare;
    }

    rows.push([code, party, voucherNo, voucherType, date, narration, debit, credit, balance]);
  }

  if (rows.length === 0) return unchanged;

  const parties = new Set(rows.map((r) => r[0] || r[1])).size;
  const note =
    `This ledger was exported one line per posting with the report layout ` +
    `wrapped around it. ${rows.length.toLocaleString()} postings were unwrapped ` +
    `for ${parties.toLocaleString()} ${parties === 1 ? "party" : "parties"} — ` +
    `the account code on every line is what makes one file cover them all.`;

  return { text: toCsv(LEDGER_HEADERS, rows), converted: true, note, headers: LEDGER_HEADERS };
}


/* ─────────────── Headings in front, footer behind ─────────────── */

/**
 * The plainest of the three flattened shapes: the column headings repeated in
 * front of every record, the record itself, and the report footer behind it.
 * A stock report comes out like this —
 *
 *   Item Code | Quality | Gauge | Width | Lngth | shade | PHR | Unit | Bal Qty | Rate | Value |
 *   965 | CRYSTAL SUPER CLEAR (DIAMOND) | 4 | 48 | 100 | 15-L | 24 | Rolls | 19 | 3,697.78 | 70,258 |
 *   Total: | 12,959 | 74,344,180
 *
 * — eleven headings, then exactly eleven fields, then a footer that is the same
 * on every line. Nothing has to be worked out about which column is which: the
 * report named them all, and they line up one for one.
 *
 * flattenRepeatedReportExport cannot read it. That one is built for a report
 * with grouping frames, so it hunts for a name followed by a fixed run of
 * figures — and a Unit column of "Rolls" sitting in the middle of the numbers
 * ends the run every time. It gives up and hands the file back, which is the
 * right thing for it to do and the reason this function exists.
 *
 * Two checks keep the two apart, and both have to hold:
 *
 *   - The field straight after the headings varies from line to line. It is the
 *     record's first column. On a trial balance the report totals sit in that
 *     position, identical the whole way down.
 *   - Everything past the second block is identical on every line, because a
 *     footer is a footer. On a trial balance the group codes and group totals
 *     are there instead, and they vary.
 */
export function flattenHeaderPrefixExport(input: string): FlattenResult {
  const unchanged: FlattenResult = { text: input, converted: false };

  const { records } = parseCsvRecords(input);
  if (records.length < 3) return unchanged;

  const width = repeatedHeadingWidth(records);
  if (width < 3) return unchanged;

  // Every record has to be the same length, or the two blocks cannot be said to
  // line up and there is nothing exact left to read.
  const length = records[0].length;
  if (records.some((r) => r.length !== length)) return unchanged;
  if (length < width * 2) return unchanged;

  // The record's own first column. Identical the whole way down means this is
  // not a record at all — see the note above.
  const firstCell = records[0][width] ?? "";
  if (records.every((r) => (r[width] ?? "") === firstCell)) return unchanged;

  // The footer, if there is one.
  for (let i = width * 2; i < length; i += 1) {
    const cell = records[0][i] ?? "";
    if (!records.every((r) => (r[i] ?? "") === cell)) return unchanged;
  }

  const headers = records[0].slice(0, width).map(unspaceHeading);
  if (headers.some((h) => !h)) return unchanged;

  const rows = records.map((r) => r.slice(width, width * 2).map((f) => f.trim()));

  const footer = length > width * 2 ? " The report footer was dropped." : "";
  const note =
    `This file was exported with the column headings repeated in front of every ` +
    `record. ${rows.length.toLocaleString()} records were unwrapped into ` +
    `${headers.length} columns.${footer}`;

  return { text: toCsv(headers, rows), converted: true, note, headers };
}
