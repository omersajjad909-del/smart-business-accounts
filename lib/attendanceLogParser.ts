/**
 * Parser for the attendance logs vendor tools export — ZKTime, eSSL
 * eTimeTrack, iVMS and the various rebadges of each.
 *
 * There is no standard here. Every tool picks its own delimiter, its own column
 * names, and its own date order, so the parser sniffs rather than assumes: it
 * needs an enrollment number and a timestamp, and it will find them by header
 * name if there is a header and by position if there is not.
 *
 * Pure and dependency-free so it can be tested on its own.
 */

export const MAX_ROWS = 20_000;

/** Column names these exports actually use, lower-cased and stripped. */
const ENROLL_KEYS = ["userid", "user", "empid", "employeeid", "enrollno", "enrollmentno", "acno", "id", "pin"];
const DATETIME_KEYS = ["datetime", "date/time", "punchtime", "recordtime", "checktime", "timestamp"];
const DATE_KEYS = ["date", "punchdate"];
const TIME_KEYS = ["time", "punchtime", "clock"];
const STATE_KEYS = ["state", "status", "inout", "direction", "checktype"];

export type ParsedPunch = {
  biometricId: string;
  time: string;
  direction: string;
  raw: string;
};

/**
 * Header cells only. Punctuation is stripped so "AC-No.", "AC_No" and "acno"
 * all land on the same key — vendor tools spell the same column three ways.
 */
function norm(s: string): string {
  return s.toLowerCase().replace(/[\s_.\-"']/g, "");
}

function splitLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
}

function detectDelimiter(line: string): string {
  const counts: [string, number][] = [
    ["\t", (line.match(/\t/g) || []).length],
    [",", (line.match(/,/g) || []).length],
    [";", (line.match(/;/g) || []).length],
  ];
  const best = counts.sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ",";
}

function indexOfAny(headers: string[], keys: string[]): number {
  for (const key of keys) {
    const i = headers.indexOf(key);
    if (i >= 0) return i;
  }
  return -1;
}

/** ZKTeco writes 0/4 for in and 1/5 for out; anything else we leave to the rules. */
function directionFrom(state: string | undefined): string {
  const v = String(state ?? "").trim().toUpperCase();
  if (v === "IN" || v === "0" || v === "4") return "IN";
  if (v === "OUT" || v === "1" || v === "5") return "OUT";
  return "AUTO";
}

/**
 * Normalise a timestamp cell to `YYYY-MM-DD HH:MM[:SS]`.
 *
 * DD-MM-YYYY is what the local tools emit and what the rest of FinovaOS shows,
 * so it wins the ambiguous cases. A four-digit leading group means the string
 * was already year-first.
 */
export function normalizeStamp(value: string): string {
  let time = value.trim().replace(/\//g, "-");

  const dmy = time.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(.*)$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}${dmy[4]}`;
  }

  const ymd = time.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}${ymd[4]}`;
  }

  return time;
}

export function parseAttendanceLog(text: string): { rows: ParsedPunch[]; malformed: number } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [], malformed: 0 };

  const delimiter = detectDelimiter(lines[0]);
  const firstCells = splitLine(lines[0], delimiter).map(norm);

  // A header row names an enrollment column and carries no date of its own.
  const hasHeader =
    indexOfAny(firstCells, ENROLL_KEYS) >= 0 && !/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(lines[0]);

  let iEnroll = 0;
  let iDateTime = 1;
  let iDate = -1;
  let iTime = -1;
  let iState = -1;

  if (hasHeader) {
    iEnroll = indexOfAny(firstCells, ENROLL_KEYS);
    iDateTime = indexOfAny(firstCells, DATETIME_KEYS);
    iDate = indexOfAny(firstCells, DATE_KEYS);
    iTime = indexOfAny(firstCells, TIME_KEYS);
    iState = indexOfAny(firstCells, STATE_KEYS);
    // Separate "Date" and "Time" columns beat a single combined one.
    if (iDate >= 0 && iTime >= 0) iDateTime = -1;
  }

  const rows: ParsedPunch[] = [];
  let malformed = 0;

  for (const line of lines.slice(hasHeader ? 1 : 0)) {
    const cells = splitLine(line, delimiter);
    const biometricId = String(cells[iEnroll] ?? "").trim();

    let stamp = "";
    if (iDateTime >= 0 && cells[iDateTime]) {
      stamp = cells[iDateTime];
    } else if (iDate >= 0 && iTime >= 0) {
      stamp = `${cells[iDate] ?? ""} ${cells[iTime] ?? ""}`.trim();
    } else {
      stamp = String(cells[1] ?? "").trim();
    }

    const time = normalizeStamp(stamp);

    if (!biometricId || !/^\d{4}-\d{2}-\d{2}/.test(time)) {
      malformed += 1;
      continue;
    }

    rows.push({
      biometricId,
      time,
      direction: directionFrom(iState >= 0 ? cells[iState] : undefined),
      raw: line.slice(0, 500),
    });
    if (rows.length >= MAX_ROWS) break;
  }

  return { rows, malformed };
}
