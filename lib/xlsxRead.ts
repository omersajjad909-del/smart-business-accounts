// FILE: lib/xlsxRead.ts
//
// Reads an .xlsx workbook in the browser and hands back the CSV the rest of the
// importer already knows how to read.
//
// The wizard used to answer an Excel file with an instruction: open it, File →
// Save As → CSV UTF-8, come back. That is a correct instruction and it was
// still the most common place a migration stalled, because .xlsx is what every
// one of these systems actually produces — QuickBooks exports it, Tally's Alt+E
// offers it first, and an Oracle report downloaded from a browser arrives as
// one. Worse, the round trip through Excel is where data quietly changes:
// re-saving as CSV is what turns 0300-1234567 into 3001234567 and 15-JAN-2024
// into whatever the machine's locale prefers. Reading the workbook directly
// avoids the trip that damages the file.
//
// Written against the file format rather than a library. The npm package that
// does this is no longer published there, and a migration importer is the last
// place to take a dependency that cannot be updated. What is needed is a small
// part of the format — a stored or deflated ZIP entry, the shared string table,
// one worksheet, and enough of the number formats to know a date from a number
// — and the platform supplies the only hard piece, decompression, itself.
//
// Everything it reads still goes through the wizard's preview before a single
// row is written, which is what makes reading the format ourselves a reasonable
// thing to do at all: a cell this misreads is a cell the operator sees.

/* ─────────────────────────── ZIP ─────────────────────────── */

type ZipEntry = {
  name: string;
  offset: number;
  method: number;
  /** Bytes on disk. Says where this entry's deflate stream ends. */
  compressedSize: number;
  /** Bytes once inflated. Says how much of the stream belongs to this entry. */
  size: number;
};

/**
 * The central directory, read back to front the way the format intends.
 *
 * Sizes come from here rather than from the local header because a writer is
 * allowed to leave the local header's sizes at zero and put the real ones in a
 * descriptor after the data. Excel does not, but other producers of .xlsx do,
 * and the central directory is correct either way.
 */
function readZipIndex(buf: ArrayBuffer): Map<string, ZipEntry> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // End of central directory: fixed 22 bytes plus a comment of up to 64KB.
  let eocd = -1;
  const from = Math.max(0, bytes.length - 22 - 0xffff);
  for (let i = bytes.length - 22; i >= from; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error("not a zip");

  const count = view.getUint16(eocd + 10, true);
  let pos = view.getUint32(eocd + 16, true);

  const entries = new Map<string, ZipEntry>();
  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const method = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const size = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const offset = view.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
    entries.set(name, { name, method, compressedSize, size, offset });
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readZipEntry(buf: ArrayBuffer, entry: ZipEntry): Promise<string> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  if (view.getUint32(entry.offset, true) !== 0x04034b50) throw new Error("bad zip entry");
  const nameLen = view.getUint16(entry.offset + 26, true);
  const extraLen = view.getUint16(entry.offset + 28, true);
  const start = entry.offset + 30 + nameLen + extraLen;

  // Stored, which is what a tiny entry often is.
  if (entry.method === 0) {
    return new TextDecoder().decode(bytes.subarray(start, start + entry.size));
  }
  if (entry.method !== 8) throw new Error(`unsupported compression (${entry.method})`);

  // A ZIP holds a raw deflate stream with no zlib wrapper around it. Sliced to
  // this entry's own compressed length: the next entry's bytes follow it
  // immediately, and feeding those to the decompressor is how a reader that
  // otherwise works throws on the second file it opens.
  const compressed = bytes.subarray(start, start + entry.compressedSize);
  const stream = new Blob([compressed as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));

  const out = new Uint8Array(entry.size);
  let written = 0;
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const room = Math.min(value.length, entry.size - written);
    out.set(value.subarray(0, room), written);
    written += room;
    if (written >= entry.size) { await reader.cancel().catch(() => {}); break; }
  }
  return new TextDecoder().decode(out.subarray(0, written));
}

/* ─────────────────────────── Number formats ─────────────────────────── */

/** The built-in format ids Excel reserves for dates and times. */
const BUILTIN_DATE_FORMATS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22,
  27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  45, 46, 47,
  50, 51, 52, 53, 54, 55, 56, 57, 58,
]);

/**
 * Whether a custom format code paints a date.
 *
 * Quoted literals and the colour / condition sections in square brackets are
 * removed first: `[Red]#,##0" days"` is a number format whose only `d` is in a
 * word, and reading that as a date would turn every amount in the column into
 * 1907.
 */
function isDateFormatCode(code: string): boolean {
  const bare = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "");
  return /[dmyhs]/i.test(bare);
}

/* ─────────────────────────── Values ─────────────────────────── */

/** Excel counts days from 1899-12-30, which absorbs its own 1900 leap-year bug. */
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/**
 * A serial date as an unambiguous string.
 *
 * ISO rather than the DD-MM-YYYY the rest of the product shows, because this
 * value is on its way into a parser, not onto a screen: `parseImportDate` reads
 * ISO exactly, and no reader anywhere can mistake 2024-01-15 for the fifteenth
 * month.
 */
function serialToDate(serial: number): string {
  const ms = EXCEL_EPOCH + Math.round(serial * 86400000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(serial);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  // A whole day carries no time; anything else keeps it, so a timestamped
  // voucher does not silently lose the hour it was posted.
  if (Number.isInteger(serial)) return stamp;
  return `${stamp} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** "BC12" -> 54. Column letters are base-26 with no zero. */
function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/i)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function text(node: Element | null): string {
  return node?.textContent ?? "";
}

/* ─────────────────────────── Workbook ─────────────────────────── */

export type XlsxSheet = { name: string; rows: string[][] };

function parseXml(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("unreadable workbook XML");
  return doc;
}

/**
 * Every string in the workbook, by index.
 *
 * A shared string is a run of pieces rather than one value — Excel splits a cell
 * on every change of formatting — so the pieces are joined. Reading only the
 * first would truncate any cell somebody bolded half of, which on a customer
 * list is a name that arrives cut in two.
 */
function readSharedStrings(xml: string): string[] {
  const doc = parseXml(xml);
  return [...doc.getElementsByTagName("si")].map((si) => {
    const runs = si.getElementsByTagName("t");
    let out = "";
    for (const t of runs) out += t.textContent ?? "";
    return out;
  });
}

/** numFmtId per style index, and which of those ids mean a date. */
function readStyles(xml: string): { dateStyles: Set<number> } {
  const doc = parseXml(xml);

  const dateFormats = new Set<number>(BUILTIN_DATE_FORMATS);
  for (const fmt of doc.getElementsByTagName("numFmt")) {
    const id = Number(fmt.getAttribute("numFmtId"));
    const code = fmt.getAttribute("formatCode") ?? "";
    if (Number.isFinite(id) && isDateFormatCode(code)) dateFormats.add(id);
  }

  const dateStyles = new Set<number>();
  const cellXfs = doc.getElementsByTagName("cellXfs")[0];
  if (cellXfs) {
    [...cellXfs.getElementsByTagName("xf")].forEach((xf, index) => {
      const id = Number(xf.getAttribute("numFmtId") ?? 0);
      if (dateFormats.has(id)) dateStyles.add(index);
    });
  }
  return { dateStyles };
}

function readSheet(xml: string, shared: string[], dateStyles: Set<number>): string[][] {
  const doc = parseXml(xml);
  const rows: string[][] = [];

  for (const row of doc.getElementsByTagName("row")) {
    const cells: string[] = [];
    for (const c of row.getElementsByTagName("c")) {
      const ref = c.getAttribute("r") ?? "";
      const at = ref ? columnIndex(ref) : cells.length;
      const type = c.getAttribute("t") ?? "n";

      let value: string;
      if (type === "inlineStr") {
        const is = c.getElementsByTagName("is")[0];
        let out = "";
        if (is) for (const t of is.getElementsByTagName("t")) out += t.textContent ?? "";
        value = out;
      } else {
        const raw = text(c.getElementsByTagName("v")[0] ?? null);
        if (type === "s") {
          value = shared[Number(raw)] ?? "";
        } else if (type === "b") {
          value = raw === "1" ? "TRUE" : "FALSE";
        } else if (type === "e") {
          // An error cell — #N/A, #REF! — is not a value. Left blank so it
          // reads as missing rather than as the literal text "#REF!".
          value = "";
        } else {
          const styleIndex = Number(c.getAttribute("s") ?? -1);
          const numeric = Number(raw);
          value = raw !== "" && dateStyles.has(styleIndex) && Number.isFinite(numeric)
            ? serialToDate(numeric)
            : raw;
        }
      }

      // Excel omits empty cells entirely, so the reference is what says which
      // column this is. Filling the gap keeps every row the same shape.
      while (cells.length < at) cells.push("");
      cells[at] = value;
    }
    rows.push(cells);
  }

  // Trailing columns Excel counted but never filled.
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  return rows.map((r) => {
    const padded = r.slice();
    while (padded.length < width) padded.push("");
    return padded;
  });
}

/* ─────────────────────────── Entry point ─────────────────────────── */

export type XlsxReadResult = {
  /** The chosen sheet as CSV, ready for the same reader a .csv goes through. */
  csv: string;
  /** The sheet that was read. */
  sheetName: string;
  /** Every sheet in the workbook, in workbook order. */
  sheetNames: string[];
};

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Reads one worksheet out of an .xlsx workbook.
 *
 * Defaults to the first sheet, which is what an export from an accounting
 * system contains. `sheetName` picks another when the operator has a workbook
 * with a tab per report.
 *
 * Throws with a plain sentence when the file is not something this can read —
 * the caller turns that back into the old advice, which still works.
 */
export async function readXlsx(
  file: ArrayBuffer,
  sheetName?: string,
): Promise<XlsxReadResult> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot open Excel files directly");
  }

  const zip = readZipIndex(file);
  const grab = async (name: string): Promise<string | null> => {
    const entry = zip.get(name);
    return entry ? readZipEntry(file, entry) : null;
  };

  const workbookXml = await grab("xl/workbook.xml");
  if (!workbookXml) throw new Error("no workbook inside this file");

  const workbook = parseXml(workbookXml);
  const sheets = [...workbook.getElementsByTagName("sheet")].map((s) => ({
    name: s.getAttribute("name") ?? "",
    // r:id, which the relationships file turns into a path.
    rid: s.getAttribute("r:id") ?? s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ?? "",
  }));
  if (sheets.length === 0) throw new Error("this workbook has no sheets");

  const wanted = sheetName
    ? sheets.find((s) => s.name === sheetName)
    : sheets[0];
  if (!wanted) throw new Error(`no sheet named "${sheetName}"`);

  // Relationships map the sheet's id to the part that holds it. Falling back to
  // sheetN.xml covers a workbook written without them, which some report
  // writers produce.
  const relsXml = await grab("xl/_rels/workbook.xml.rels");
  let target = "";
  if (relsXml) {
    const rels = parseXml(relsXml);
    for (const rel of rels.getElementsByTagName("Relationship")) {
      if (rel.getAttribute("Id") === wanted.rid) { target = rel.getAttribute("Target") ?? ""; break; }
    }
  }
  const path = target
    ? `xl/${target.replace(/^\/?xl\//, "").replace(/^\.\//, "")}`
    : `xl/worksheets/sheet${sheets.indexOf(wanted) + 1}.xml`;

  const sheetXml = await grab(path);
  if (!sheetXml) throw new Error("could not find that sheet inside the file");

  const sharedXml = await grab("xl/sharedStrings.xml");
  const stylesXml = await grab("xl/styles.xml");

  const shared = sharedXml ? readSharedStrings(sharedXml) : [];
  const { dateStyles } = stylesXml ? readStyles(stylesXml) : { dateStyles: new Set<number>() };

  const rows = readSheet(sheetXml, shared, dateStyles);
  if (rows.length === 0) throw new Error("that sheet is empty");

  return {
    csv: rows.map((r) => r.map(csvCell).join(",")).join("\n"),
    sheetName: wanted.name,
    sheetNames: sheets.map((s) => s.name),
  };
}
