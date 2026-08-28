// FILE: lib/importChunker.ts
//
// Turns one file the operator picked into the sequence of requests that will
// carry it, and works out everything the server can no longer see for itself
// once the file has been cut up.
//
// Runs in the browser, on purpose. The whole file is already there — it came
// off the operator's disk — and that is the last place it exists in one piece.
// A hosting platform caps a request body at a few megabytes and a function at a
// few minutes, so a distributor's hundred-thousand-line item master or five
// years of one party's ledger never reached the importer at all: the upload
// failed, or the request timed out half-written, and there was nothing in the
// product to tell the difference. Cutting the file here lifts both ceilings at
// once, because every piece is a small fast request, and it buys a progress bar
// and a resume as a side effect.
//
// Three things the importer decides by looking at a whole file, and therefore
// cannot decide from a slice, are settled here instead and sent along:
//
//   * a report that was never a grid is unwrapped first, while its markers are
//     all still present (lib/reportFlatten.ts);
//   * an item code shared by two different items is found by scanning the file
//     end to end, and the finding travels with every slice;
//   * a party ledger is cut on party boundaries, and any party that spills past
//     one slice is named so the next slice does not read a mid-year row as its
//     opening balance.
//
// Two data types are never cut. A chart of accounts and a trial balance are
// read as trees — this row is a heading, that one is the subtotal of the four
// under it — and half a tree is not a smaller tree, it is a wrong one. They are
// also one row per account, so they are never the file that needed splitting.

import {
  parseCsv,
  splitCsvChunks,
  type CsvChunk,
  type CsvRow,
} from "@/lib/csvParse";
import {
  flattenLedgerExport,
  flattenRepeatedReportExport,
  flattenHeaderPrefixExport,
} from "@/lib/reportFlatten";
import {
  field,
  scanAmbiguousItemCodes,
  type ImportDataType,
} from "@/lib/importEngine";

/**
 * Rows per request.
 *
 * Sized by what a request can carry rather than by what the reader can do: five
 * thousand rows of a wide customer export is comfortably inside a body limit
 * and answers in about a second, which is often enough for a progress bar to
 * feel like progress. Ledger rows are narrower and cheaper, so they go in
 * larger slices — fewer round trips for a file that is mostly round trips.
 */
const CHUNK_ROWS: Partial<Record<ImportDataType, number>> = {
  ledger_history: 10000,
};
const DEFAULT_CHUNK_ROWS = 5000;

/** Below this, splitting only adds round trips. */
const SPLIT_ABOVE = 6000;

/** Data types whose whole-file checks cannot be shown a slice. See the header. */
export const WHOLE_FILE_TYPES: ImportDataType[] = ["accounts", "opening_balances"];

export type ImportChunk = CsvChunk & {
  /** Which request this is, from one. */
  index: number;
  /** Parties already opened by an earlier chunk of this same file. */
  continuedParties: string[];
};

export type ImportPlan = {
  /** The requests to send, in order. Always at least one. */
  chunks: ImportChunk[];
  /** Data rows in the file, after blanks and the heading row. */
  totalRows: number;
  /** Item codes the whole file uses for more than one item. */
  ambiguousCodes: string[];
  /** Set when the file was not a grid and had to be unwrapped first. */
  reshaped?: string;
  /** Set when the file cannot be imported at all, with the reason. */
  error?: string;
};

/** The party a ledger row belongs to, keyed the way the writer keys it. */
function partyKey(row: CsvRow, fallbackParty: string): string {
  const code = field(row, "code").trim();
  const name = field(row, "party").trim();
  return (code || name || fallbackParty).trim().toLowerCase();
}

/**
 * Unwraps a report that was exported one line per printed page, before anything
 * else looks at the file. Each reader insists on its own markers and hands the
 * text back untouched when they are absent, so the order only decides which
 * gets to look first.
 */
function reshape(text: string): { text: string; note?: string } {
  for (const shape of [flattenLedgerExport, flattenRepeatedReportExport, flattenHeaderPrefixExport]) {
    const result = shape(text);
    if (result.converted) return { text: result.text, note: result.note };
  }
  return { text };
}

/**
 * Plans the upload of one file.
 *
 * Cheap enough to run the moment a file is chosen: one parse and one scan, both
 * linear. The parse is thrown away — the server parses the text it is sent, so
 * the two never disagree about what a row was — and only the decisions survive.
 */
export function planImport(
  raw: string,
  dataType: ImportDataType,
  fallbackParty = "",
): ImportPlan {
  const flattened = reshape(raw);
  const text = flattened.text;

  const parsed = parseCsv(text);
  const totalRows = parsed.rows.length;

  const empty: ImportPlan = { chunks: [], totalRows, ambiguousCodes: [], reshaped: flattened.note };
  if (totalRows === 0) {
    return { ...empty, error: "No data rows found — the file needs a heading row and at least one row under it." };
  }

  const ambiguousCodes = dataType === "items" ? scanAmbiguousItemCodes(parsed.rows) : [];

  const one = (): ImportPlan => ({
    chunks: [{ text, lineOffset: 0, rows: totalRows, index: 1, continuedParties: [] }],
    totalRows,
    ambiguousCodes,
    reshaped: flattened.note,
  });

  if (totalRows <= SPLIT_ABOVE) return one();
  if (WHOLE_FILE_TYPES.includes(dataType)) return one();

  const size = CHUNK_ROWS[dataType] ?? DEFAULT_CHUNK_ROWS;
  const keys = dataType === "ledger_history"
    ? parsed.rows.map((row) => partyKey(row, fallbackParty))
    : undefined;

  const chunks = splitCsvChunks(text, size, keys);
  if (chunks.length === 0) return one();

  // Which parties each chunk inherits rather than opens. A party only lands
  // here when its own rows outran a single chunk, since the splitter cuts on
  // party boundaries wherever it can.
  const openedBefore = new Set<string>();
  const planned: ImportChunk[] = chunks.map((chunk, i) => {
    const continuedParties: string[] = [];
    if (keys) {
      const mine = new Set(keys.slice(chunk.lineOffset, chunk.lineOffset + chunk.rows));
      for (const key of mine) {
        if (openedBefore.has(key)) continuedParties.push(key);
        else openedBefore.add(key);
      }
    }
    return { ...chunk, index: i + 1, continuedParties };
  });

  return { chunks: planned, totalRows, ambiguousCodes, reshaped: flattened.note };
}
