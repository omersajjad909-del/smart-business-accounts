// FILE: lib/csvParse.ts
//
// One CSV reader for every importer in the product.
//
// Each import route used to carry its own three-line parser built on
// `line.split(",")`. That is fine for a file somebody typed by hand and wrong
// for every file a real accounting system produces:
//
//     "M/s Ali Traders, Karachi",DEBTOR,150000
//
// split(",") turns that one row into four columns, shifts every value one place
// left, and the balance that lands in the database is a different number from
// the one on the customer's ledger. A migration that gets the first row wrong is
// a migration nobody trusts, so the parser is the first thing that had to be
// right.
//
// What a ten-year Oracle / Tally / Sage export actually contains, all of which
// the old parser mangled and this one handles:
//
//   * quoted fields containing the delimiter        "Ali Traders, Karachi"
//   * doubled quotes inside a quoted field          "M/s ""Star"" Mills"
//   * newlines inside a quoted address field
//   * a UTF-8 BOM at the head of the file (Excel writes one every time)
//   * CRLF line endings from Windows
//   * semicolon or tab delimiters (Excel on a European locale, Oracle spool)
//   * amounts as "1,234.56", "(500)" for negatives, "500 Cr", "Rs 500"
//   * dates as 15-JAN-2024 (Oracle default), 15-01-2024, 2024-01-15

/** A parsed row: header name -> cell value, both already trimmed. */
export type CsvRow = Record<string, string>;

export type ParsedCsv = {
  headers: string[];
  rows: CsvRow[];
  /** Which delimiter was detected - surfaced so the UI can say so. */
  delimiter: string;
};

/** Excel writes a UTF-8 BOM on every CSV it saves. */
const BOM = "﻿";

const DELIMITERS = [",", ";", "\t", "|"] as const;

/**
 * Picks the delimiter by counting candidates in the header line only.
 *
 * The header is the one line guaranteed not to contain free-text punctuation,
 * so counting there beats counting over the whole file: a comma-delimited file
 * full of semicolons in address fields would otherwise be read as semicolon
 * delimited and collapse into one column.
 */
function detectDelimiter(text: string): string {
  const breakAt = text.search(/\r?\n/);
  const firstLine = breakAt === -1 ? text : text.slice(0, breakAt);

  let best = ",";
  let bestCount = 0;
  for (const d of DELIMITERS) {
    // Count only outside quotes, same reason as above.
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i += 1) {
      const ch = firstLine[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === d && !inQuotes) count += 1;
    }
    if (count > bestCount) { best = d; bestCount = count; }
  }
  return best;
}

/**
 * RFC 4180 CSV, read one character at a time.
 *
 * A character loop rather than a regex because the thing that breaks naive
 * parsers - a newline inside a quoted field - cannot be handled by anything
 * that splits the text into lines first.
 */
export function parseCsv(input: string, opts?: { delimiter?: string }): ParsedCsv {
  // Left in place the BOM becomes part of the first header name, so "code"
  // arrives as an invisible-prefixed string and never matches anything.
  const text = input.startsWith(BOM) ? input.slice(1) : input;
  if (!text.trim()) return { headers: [], rows: [], delimiter: opts?.delimiter || "," };

  const delimiter = opts?.delimiter || detectDelimiter(text);

  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // "" inside a quoted field is one literal quote, not the end of it.
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') { inQuotes = true; continue; }
    if (ch === delimiter) { record.push(field); field = ""; continue; }
    if (ch === "\r") {
      // CRLF - swallow the pair, and treat a lone CR as a line break too.
      if (text[i + 1] === "\n") i += 1;
      record.push(field); field = "";
      records.push(record); record = [];
      continue;
    }
    if (ch === "\n") {
      record.push(field); field = "";
      records.push(record); record = [];
      continue;
    }
    field += ch;
  }
  // Whatever is still in hand when the text ends is the last field.
  record.push(field);
  records.push(record);

  // Drop rows that are entirely empty - a trailing newline produces one, and
  // Oracle spool files pad the end with blanks.
  const nonEmpty = records.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [], delimiter };

  const headers = nonEmpty[0].map((h) => h.trim());
  const rows: CsvRow[] = [];
  for (let i = 1; i < nonEmpty.length; i += 1) {
    const cells = nonEmpty[i];
    const row: CsvRow = {};
    headers.forEach((h, idx) => { row[h] = (cells[idx] ?? "").trim(); });
    rows.push(row);
  }

  return { headers, rows, delimiter };
}

/**
 * Header text reduced to something two spellings of the same column share.
 *
 * Slashes count as separators alongside spaces, dots, dashes and underscores.
 * Forms-era packages punctuate their headings — "Main / Head Title", "A\C
 * Code", "N.T.N. NO." — and leaving the slash in meant "Main / Head Title"
 * squashed to "main/headtitle", matching no alias anyone would think to write.
 * Dropping it also lets "a/c code", "a\c code" and "ac code" converge.
 */
export function normalizeHeader(header: string): string {
  const raw = String(header || "");
  const noBom = raw.startsWith(BOM) ? raw.slice(1) : raw;
  return noBom.trim().toLowerCase().replace(/[\s_\-./\\]+/g, "");
}

/**
 * The same header as separated words, padded with spaces so a containment test
 * is a whole-word test. "PRIMARY_PHONE_NUMBER" becomes " primary phone number ".
 */
function headerWords(header: string): string {
  const raw = String(header || "");
  const noBom = raw.startsWith(BOM) ? raw.slice(1) : raw;
  return ` ${noBom.trim().toLowerCase().replace(/[\s_\-./\\]+/g, " ").replace(/\s+/g, " ")} `;
}

/**
 * Reads a row by any of several possible column names.
 *
 * Every source spells the same column differently - "Ledger Name", "Account
 * Name", "ACCOUNT_NAME", "Name" - and asking for them one at a time is what
 * made each importer grow its own mapping table.
 *
 * Two passes, because an exact list can never be long enough. Oracle in
 * particular decorates its columns: the phone is `PRIMARY_PHONE_NUMBER`, the
 * unit `PRIMARY_UOM_CODE`, the outstanding `AMOUNT_DUE_REMAINING`. No
 * hand-written alias list catches all of those, and a customer whose phone
 * numbers silently did not import is a customer who stops trusting the rest.
 *
 *   1. exact match on the squashed header
 *   2. whole-word containment on the spaced header
 *
 * Containment is by whole word on purpose. A plain substring test matches
 * "code" inside "barcode" and files every barcode as an account code; " code "
 * matches inside " bar code " and not inside " barcode ".
 *
 * Candidates are tried in order within each pass, so an alias list written
 * specific-to-generic resolves "Item Code" to the item code rather than to
 * whatever else happens to contain the word.
 */
export function pick(row: CsvRow, ...candidates: string[]): string {
  const entries = Object.entries(row);

  // Pass 1 — exact, on the squashed header.
  const squashed = new Map<string, string>();
  for (const [key, value] of entries) {
    const k = normalizeHeader(key);
    if (!squashed.has(k)) squashed.set(k, value);
  }
  for (const candidate of candidates) {
    const hit = squashed.get(normalizeHeader(candidate));
    if (hit !== undefined && hit !== "") return hit;
  }

  // Pass 2 — whole-word containment, on the spaced header.
  const worded = entries.map(([key, value]) => [headerWords(key), value] as const);
  for (const candidate of candidates) {
    const needle = headerWords(candidate);
    if (needle.trim() === "") continue;
    for (const [header, value] of worded) {
      if (header.includes(needle) && value !== "") return value;
    }
  }

  return "";
}

/**
 * Money as an accounting system writes it, not as JavaScript wants it.
 *
 *     "1,234.56"  ->  1234.56    thousands separators
 *     "(500)"     -> -500        accounting negatives, Oracle's default
 *     "500 Cr"    -> -500        Tally and older Oracle reports tag the side
 *     "500 Dr"    ->  500
 *     "Rs. 500"   ->  500        currency prefixes survive most exports
 *     "-" or ""   ->  0          a blank cell is zero, not NaN
 *
 * `parseFloat("1,234.56")` returns 1 - silently, with no error - which is how a
 * ledger ends up out by a factor of a thousand.
 */
export function parseAmount(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  let s = String(raw ?? "").trim();
  if (!s || s === "-" || s === "--") return 0;

  let negative = false;

  // Accounting parentheses.
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }

  // Dr / Cr tag, either side of the number.
  if (/\bcr\b/i.test(s)) negative = true;
  s = s.replace(/\b(dr|cr)\b/gi, "");

  // Currency symbols, codes and spaces.
  s = s.replace(/(rs\.?|pkr|usd|aed|₨|\$|€|£)/gi, "");
  s = s.replace(/\s+/g, "");

  if (s.startsWith("-")) { negative = true; s = s.slice(1); }
  if (s.startsWith("+")) s = s.slice(1);

  // Thousands separators. A European export writes 1.234,56 - detect it by the
  // comma sitting to the right of the last dot.
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1 && lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Dates in the shapes an export actually produces.
 *
 * Oracle's default `DD-MON-YYYY` (15-JAN-2024) is the one that matters most:
 * `new Date("15-JAN-2024")` is Invalid Date in Node, so a straight
 * pass-through silently dropped every dated row. Ambiguous numeric dates are
 * read day-first, which is what Pakistan, the UK and Oracle's NLS default all
 * use; an ISO string is unambiguous and read as-is.
 *
 * Returns null when nothing matches, so the caller can report the row instead
 * of writing today's date onto a ten-year-old invoice.
 */
export function parseImportDate(raw: unknown): Date | null {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  const s = String(raw ?? "").trim();
  if (!s) return null;

  // ISO first - unambiguous, and what our own templates emit.
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Oracle: 15-JAN-2024, 15-JAN-24, 15 Jan 2024.
  const mon = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{2,4})/);
  if (mon) {
    const month = MONTHS[mon[2].slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    let year = +mon[3];
    if (year < 100) year += year < 50 ? 2000 : 1900;
    const d = new Date(Date.UTC(year, month, +mon[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Numeric, day first: 15-01-2024, 15/01/2024, 15.01.2024.
  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmy) {
    let year = +dmy[3];
    if (year < 100) year += year < 50 ? 2000 : 1900;
    const d = new Date(Date.UTC(year, +dmy[2] - 1, +dmy[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/** Quotes a value for a CSV we generate, so our own templates round-trip. */
export function csvCell(value: unknown): string {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds a CSV body from a header list and rows of plain values. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  return [
    headers.map(csvCell).join(","),
    ...rows.map((r) => r.map(csvCell).join(",")),
  ].join("\n");
}
