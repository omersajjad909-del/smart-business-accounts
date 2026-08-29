/**
 * POST /api/import
 *
 * One endpoint for every kind of migration file: masters, opening balances,
 * opening stock and open documents. Send `dryRun: true` and nothing is written
 * — the response is the same mapping the commit would perform, so the wizard
 * can show the operator their own data, already interpreted, before they
 * agree to it.
 *
 * The dry run is the point of this route. Importing five thousand accounts
 * from a ten-year-old system with no way to look first, and no way to undo, is
 * how a migration turns into a restore-from-backup.
 *
 * GET returns the sources and data types the wizard renders.
 */

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchIdOrDefault } from "@/lib/tenant";
import { safeEncryptField } from "@/lib/fieldEncrypt";
import { parseCsv, type CsvRow } from "@/lib/csvParse";
import {
  flattenRepeatedReportExport,
  flattenLedgerExport,
  flattenHeaderPrefixExport,
} from "@/lib/reportFlatten";
import {
  IMPORT_SOURCES,
  IMPORT_DATA_TYPES,
  IMPORT_DATA_TYPE_IDS,
  findDataType,
  mapRows,
  readAccountRow,
  readItemRow,
  readOpeningBalanceRow,
  readOpeningStockRow,
  readOpenDocumentRow,
  readLedgerHistoryRow,
  flagSummaryRows,
  flagAmbiguousItemCodes,
  inheritGroupsFromHierarchy,
  type ImportDataType,
  type MappedRow,
  type AccountRow,
  type ItemRow,
  type OpeningBalanceRow,
  type OpeningStockRow,
  type OpenDocumentRow,
  type LedgerHistoryRow,
} from "@/lib/importEngine";
import { WHOLE_FILE_TYPES } from "@/lib/importChunker";

/**
 * Long enough for the largest slice the wizard will send, and inside what every
 * hosting tier allows. The wizard cuts a big file into pieces precisely so that
 * no single request has to run near this — a slice that needs more than a
 * minute is a slice that was sent too large, not a limit to raise.
 */
export const maxDuration = 60;

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT"]);

/** Rows shown in the preview. Enough to spot a mis-read column, not a dump. */
const PREVIEW_ROWS = 25;
/**
 * Rows one *request* may carry. Not a limit on the file any more: the wizard
 * cuts anything larger into slices of `CHUNK_ROWS` and sends them one after
 * another, so a two-hundred-thousand-row item master arrives as forty requests
 * that each answer in a second or two.
 *
 * This ceiling now only catches a caller that ignored the chunking — a script
 * posting straight at the endpoint — and it is set where a single request still
 * comfortably finishes.
 */
const MAX_ROWS = 20000;
/**
 * Ledger history is the exception. It is one row per posting rather than one
 * per account, so a single export covering every party for five years is
 * six figures of rows and there is nothing sensible to split it on — splitting
 * by date would cut each party off from the opening line the writer needs.
 * The rows are also the cheapest kind, written in batches of 500.
 */
const MAX_LEDGER_ROWS = 250000;

/**
 * Data types whose checks read the whole file at once and cannot be shown a
 * slice of it.
 *
 * A hierarchical trial balance is only recognisable as hierarchical when the
 * group row and the accounts under it are in front of the same pass; cut the
 * file between them and the group row stops looking like a subtotal and gets
 * imported as a real account, doubling the money it stood for. The same goes
 * for a chart of accounts, where an account takes its category from a heading
 * that may be thousands of rows above it.
 *
 * Neither is ever the big file — a chart of accounts and a trial balance are
 * one row per account, and thirty thousand accounts is a large multinational.
 * So they are refused rather than silently degraded, and the caller is told to
 * send the file whole.
 *
 * Taken from the splitter rather than restated here. The two have to agree
 * exactly: a type the splitter cuts up and this rejects is a file that uploads
 * and then fails at the last step, having already written the earlier slices.
 */
const WHOLE_FILE_SET = new Set<ImportDataType>(WHOLE_FILE_TYPES);

/** Files whose code column is a ledger account code, and may be a flexfield combination. */
const SEGMENTED_TYPES = new Set<ImportDataType>([
  "accounts", "customers", "suppliers", "opening_balances", "ledger_history",
]);

type Outcome = {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
};

const emptyOutcome = (total: number): Outcome => ({
  total, imported: 0, updated: 0, skipped: 0, errors: [],
});

/** Keeps the error list readable when a whole file is wrong. */
function note(outcome: Outcome, line: number, message: string) {
  if (outcome.errors.length < 50) outcome.errors.push(`Row ${line}: ${message}`);
}

/* ─────────────────────── Shape of the file ─────────────────────── */

/**
 * Refuses a file whose first line is not a heading row, with an explanation of
 * what to do instead. Returns null when the file looks tabular.
 *
 * Reporting tools do not all export a grid. Some write one line per printed
 * page, with every field on that page flattened into it in layout order, so
 * the first line comes out as a heading row followed by the whole of page one —
 * amounts, account names, "Report Total:" and all. Parsed as a table that gives
 * a plausible-looking result: a large column count, a row per page, and every
 * row carrying the repeated page header as its values.
 *
 * That case previously reached the preview reporting "359 rows, 359 will
 * import, 0 skipped", because every row had a name and no rule it broke — the
 * name was just the literal text "A c c o u n t D e s c r i p t i o n". Pressing
 * Import would have created hundreds of accounts named after a column heading.
 * A preview that cannot tell the operator the file is unusable is worse than no
 * preview, since it invites the very click it exists to prevent.
 *
 * A heading is text. Numbers, money and blanks in the heading row mean the
 * first line is data, or the file was never a grid.
 */
function describeNonTabular(parsed: { headers: string[]; rows: CsvRow[] }): string | null {
  const headers = parsed.headers;
  if (headers.length === 0) return "The file has no heading row.";

  const looksNumeric = (h: string) => /^[\s(]*[-+]?[\d,. ]+\)?$/.test(h.trim()) && /\d/.test(h);
  const blanks = headers.filter((h) => h.trim() === "").length;
  const numeric = headers.filter(looksNumeric).length;

  if (numeric + blanks > headers.length / 5) {
    return (
      `The first line of this file is not a row of column headings — ${numeric} of its ` +
      `${headers.length} values are amounts. This usually means the report was exported ` +
      `one line per printed page rather than one line per row. Look for a plain list or ` +
      `"listing" version of the report, export that, and check in a text editor that the ` +
      `first line reads like headings (Code, Account Description, …) before uploading.`
    );
  }

  // The same tell from the other side: a page-per-line export repeats the page
  // header inside every line, so every row carries identical leading values.
  if (parsed.rows.length >= 3) {
    const first = headers[0];
    const sample = parsed.rows.slice(0, 20);
    const identical = sample.every((r) => r[first] === sample[0][first] && (r[first] ?? "") !== "");
    if (identical && sample[0][first]?.trim().toLowerCase() === String(first).trim().toLowerCase()) {
      return (
        `Every row in this file repeats the column headings instead of holding data — the ` +
        `first column reads "${first}" on all of them. The report was exported one line per ` +
        `printed page. Export a plain list version of the report instead.`
      );
    }
  }

  return null;
}

/* ─────────────────────────── Lookups ─────────────────────────── */

/**
 * Accounts keyed by both code and lowercased name.
 *
 * Built once per import rather than queried per row: a five-thousand-row file
 * was five thousand round trips to a database that is not on this machine,
 * which is what made the old importer time out on anything real.
 */
async function loadAccountIndex(companyId: string) {
  const rows = await prisma.account.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, code: true, name: true },
  });
  const byCode = new Map<string, { id: string; name: string }>();
  const byName = new Map<string, { id: string; name: string }>();
  for (const r of rows) {
    if (r.code) byCode.set(r.code.trim().toLowerCase(), { id: r.id, name: r.name });
    if (r.name) byName.set(r.name.trim().toLowerCase(), { id: r.id, name: r.name });
  }
  return { byCode, byName };
}

async function loadItemIndex(companyId: string) {
  const rows = await prisma.itemNew.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, code: true, name: true, unit: true },
  });
  const byCode = new Map<string, { id: string; name: string; unit: string }>();
  const byName = new Map<string, { id: string; name: string; unit: string }>();
  for (const r of rows) {
    if (r.code) byCode.set(r.code.trim().toLowerCase(), { id: r.id, name: r.name, unit: r.unit });
    if (r.name) byName.set(r.name.trim().toLowerCase(), { id: r.id, name: r.name, unit: r.unit });
  }
  return { byCode, byName };
}

function lookup<T>(
  index: { byCode: Map<string, T>; byName: Map<string, T> },
  code: string,
  name: string,
): T | null {
  if (code) {
    const hit = index.byCode.get(code.trim().toLowerCase());
    if (hit) return hit;
  }
  if (name) {
    const hit = index.byName.get(name.trim().toLowerCase());
    if (hit) return hit;
  }
  return null;
}

/* ─────────────────────────── Mapping ─────────────────────────── */

/** Runs the reader for one data type. No database, no writes. */
function mapForType(dataType: ImportDataType, rows: CsvRow[], lineOffset = 0) {
  switch (dataType) {
    case "accounts":
      return mapRows(rows, (r) => readAccountRow(r), lineOffset);
    case "customers":
      return mapRows(rows, (r) => readAccountRow(r, "customer"), lineOffset);
    case "suppliers":
      return mapRows(rows, (r) => readAccountRow(r, "supplier"), lineOffset);
    case "items":
      return mapRows(rows, (r) => readItemRow(r), lineOffset);
    case "opening_balances":
      return mapRows(rows, (r) => readOpeningBalanceRow(r), lineOffset);
    case "opening_stock":
      return mapRows(rows, (r) => readOpeningStockRow(r), lineOffset);
    case "open_invoices":
      return mapRows(rows, (r) => readOpenDocumentRow(r, "invoice"), lineOffset);
    case "open_bills":
      return mapRows(rows, (r) => readOpenDocumentRow(r, "bill"), lineOffset);
    case "ledger_history":
      return mapRows(rows, (r, line) => readLedgerHistoryRow(r, line), lineOffset);
    default:
      return mapRows(rows, () => ({ value: null, error: "Unsupported data type" }), lineOffset);
  }
}

/** The three fields annotation looks at, whichever row shape it is given. */
type Identifiable = { code?: string; name?: string; party?: string };

/**
 * The second half of validation — the part that needs the database.
 *
 * Only runs for the dry run. A balance pointed at an account that does not
 * exist, or an invoice for a customer nobody imported yet, is the single most
 * common migration mistake and the one worth catching before the write rather
 * than in a list of errors afterwards.
 */
async function annotateAgainstDb(
  companyId: string,
  dataType: ImportDataType,
  mapped: MappedRow<Identifiable>[],
) {
  if (dataType === "opening_balances" || dataType === "open_invoices" || dataType === "open_bills") {
    const index = await loadAccountIndex(companyId);
    for (const row of mapped) {
      if (row.error || !row.value) continue;
      const isBalance = dataType === "opening_balances";
      const code = isBalance ? row.value.code ?? "" : "";
      const name = (isBalance ? row.value.name : row.value.party) ?? "";
      const hit = lookup(index, code, name);
      if (!hit) {
        row.error = isBalance
          ? `No account matches code "${code}" or name "${name}" — import the Chart of Accounts first`
          : `No account matches "${name}" — import Customers/Suppliers first`;
      } else {
        row.matched = hit.name;
      }
    }
  }

  if (dataType === "opening_stock") {
    const index = await loadItemIndex(companyId);
    for (const row of mapped) {
      if (row.error || !row.value) continue;
      const hit = lookup(index, row.value.code ?? "", row.value.name ?? "");
      if (!hit) {
        row.error = `No item matches code "${row.value.code}" or name "${row.value.name}" — import Products & Items first`;
      } else {
        row.matched = `${hit.name} (${hit.unit})`;
      }
    }
  }

  // Re-tally: annotation turns some previously-ok rows into failures.
  let ok = 0;
  let failed = 0;
  for (const row of mapped) {
    if (row.error) failed += 1;
    else ok += 1;
  }
  return { ok, failed };
}

/* ─────────────────────────── Writers ─────────────────────────── */

async function writeAccounts(
  companyId: string,
  mapped: MappedRow<AccountRow>[],
  hint: "account" | "customer" | "supplier",
): Promise<Outcome> {
  const outcome = emptyOutcome(mapped.length);
  const index = await loadAccountIndex(companyId);
  const prefix = hint === "customer" ? "CUS" : hint === "supplier" ? "SUP" : "ACC";
  let sequence = await prisma.account.count({ where: { companyId } });

  for (const row of mapped) {
    if (row.error || !row.value) { outcome.skipped += 1; continue; }
    const v = row.value;
    try {
      const existing = lookup(index, v.code, v.name);
      // `undefined` rather than a conditional spread, because Prisma reads it
      // the way both branches need: on update it means "leave this alone", and
      // on create it means "use the column default". A masters file with no
      // city column must not blank the city somebody already typed in, and a
      // file with no balance column must not zero an opening balance.
      const data = {
        name: v.name,
        type: v.type,
        partyType: v.partyType,
        description: v.description || undefined,
        email: v.email || undefined,
        // Party phones sit in the encrypted-field set like every other one in
        // the product; importing them in clear would be the single place they
        // were not.
        phone: v.phone ? safeEncryptField(v.phone) : undefined,
        city: v.city || undefined,
        address: v.address || undefined,
        ntn: v.ntn || undefined,
        strn: v.strn || undefined,
        creditLimit: v.creditLimit ?? undefined,
        creditDays: v.creditDays ?? undefined,
        openDebit: v.openDebit || v.openCredit ? v.openDebit : undefined,
        openCredit: v.openDebit || v.openCredit ? v.openCredit : undefined,
      };

      if (existing) {
        await prisma.account.update({ where: { id: existing.id }, data });
        outcome.updated += 1;
        continue;
      }

      sequence += 1;
      const code = v.code || `${prefix}-${String(sequence).padStart(4, "0")}`;
      const created = await prisma.account.create({
        data: { companyId, code, ...data },
        select: { id: true, code: true, name: true },
      });
      index.byCode.set(code.trim().toLowerCase(), { id: created.id, name: created.name });
      index.byName.set(v.name.trim().toLowerCase(), { id: created.id, name: created.name });
      outcome.imported += 1;
    } catch (e) {
      outcome.skipped += 1;
      note(outcome, row.line, e instanceof Error ? e.message : "Could not save this account");
    }
  }
  return outcome;
}

async function writeItems(companyId: string, mapped: MappedRow<ItemRow>[]): Promise<Outcome> {
  const outcome = emptyOutcome(mapped.length);
  const index = await loadItemIndex(companyId);
  let sequence = await prisma.itemNew.count({ where: { companyId } });

  for (const row of mapped) {
    if (row.error || !row.value) { outcome.skipped += 1; continue; }
    const v = row.value;
    try {
      const existing = lookup(index, v.code, v.name);
      const data = {
        name: v.name,
        unit: v.unit,
        rate: v.rate,
        purchaseRate: v.purchaseRate,
        category: v.category,
        minStock: v.minStock,
        // barcode is globally unique in the schema, so a duplicate would abort
        // the row. Left off rather than risking the whole item for a field
        // almost nothing reads at migration time.
      };
      if (existing) {
        await prisma.itemNew.update({ where: { id: existing.id }, data });
        outcome.updated += 1;
        continue;
      }
      sequence += 1;
      const code = v.code || `IT-${String(sequence).padStart(4, "0")}`;
      const created = await prisma.itemNew.create({
        data: { companyId, code, ...data },
        select: { id: true, code: true, name: true, unit: true },
      });
      index.byCode.set(code.trim().toLowerCase(), { id: created.id, name: created.name, unit: created.unit });
      index.byName.set(v.name.trim().toLowerCase(), { id: created.id, name: created.name, unit: created.unit });
      outcome.imported += 1;
    } catch (e) {
      outcome.skipped += 1;
      note(outcome, row.line, e instanceof Error ? e.message : "Could not save this item");
    }
  }
  return outcome;
}

async function writeOpeningBalances(
  companyId: string,
  mapped: MappedRow<OpeningBalanceRow>[],
  openDate: Date,
): Promise<Outcome> {
  const outcome = emptyOutcome(mapped.length);
  const index = await loadAccountIndex(companyId);

  for (const row of mapped) {
    if (row.error || !row.value) { outcome.skipped += 1; continue; }
    const v = row.value;
    const hit = lookup(index, v.code, v.name);
    if (!hit) {
      outcome.skipped += 1;
      note(outcome, row.line, `No account matches "${v.code || v.name}"`);
      continue;
    }
    try {
      await prisma.account.update({
        where: { id: hit.id },
        data: { openDebit: v.debit, openCredit: v.credit, openDate },
      });
      outcome.updated += 1;
    } catch (e) {
      outcome.skipped += 1;
      note(outcome, row.line, e instanceof Error ? e.message : "Could not set the balance");
    }
  }
  return outcome;
}

/**
 * Opening stock as an `OPENING` inventory movement.
 *
 * Not a purchase: there is no supplier and no bill, and pricing it as a
 * purchase would put a payable on the books that was already settled in the
 * old system. `OPENING` is a cost-bearing inbound type
 * (lib/manufacturingPosting.ts) so the weighted-average cost every downstream
 * calculation reads starts at the right number.
 *
 * No voucher is posted. The value of that stock is already in the trial
 * balance under Stock / Inventory, and posting again would count it twice.
 */
async function writeOpeningStock(
  companyId: string,
  mapped: MappedRow<OpeningStockRow>[],
  date: Date,
): Promise<Outcome> {
  const outcome = emptyOutcome(mapped.length);
  const index = await loadItemIndex(companyId);

  const existing = await prisma.inventoryTxn.findMany({
    where: { companyId, type: "OPENING" },
    select: { itemId: true, location: true, date: true },
  });
  const alreadyOpened = new Set(existing.map((r) => `${r.itemId}@${r.location}`));

  // The date the godown was last counted, if it ever was.
  const openedBefore = existing.length > 0
    ? new Date(Math.min(...existing.map((r) => new Date(r.date).getTime())))
    : null;

  // One item can hold several lines on a stock report. A PVC code is fixed by
  // quality, gauge, width, length and shade, and the report then splits it again
  // by PHR — code 975 comes out twice, 20 rolls at 26 PHR and 5 at 22. Both are
  // the same item here, because stock is held per item and location.
  //
  // Written a line at a time the first would be created and the second refused
  // as a duplicate opening, quietly losing five rolls. So the file is added up
  // first and each item written once, at the cost the whole quantity averages
  // out to.
  type Bucket = {
    line: number; itemId: string; itemName: string;
    location: string; qty: number; value: number; rows: number;
  };
  const buckets = new Map<string, Bucket>();

  for (const row of mapped) {
    if (row.error || !row.value) { outcome.skipped += 1; continue; }
    const v = row.value;
    const hit = lookup(index, v.code, v.name);
    if (!hit) {
      outcome.skipped += 1;
      note(outcome, row.line, `No item matches "${v.code || v.name}"`);
      continue;
    }
    const key = `${hit.id}@${v.location}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.qty += v.qty;
      bucket.value += v.qty * v.rate;
      bucket.rows += 1;
    } else {
      buckets.set(key, {
        line: row.line, itemId: hit.id, itemName: hit.name,
        location: v.location, qty: v.qty, value: v.qty * v.rate, rows: 1,
      });
    }
  }

  let openedNow = 0;

  for (const [key, b] of buckets) {
    // Running the same file twice is a normal thing to do during a migration
    // dry run; doubling everybody's opening stock is not.
    if (alreadyOpened.has(key)) {
      outcome.skipped += b.rows;
      note(outcome, b.line, `${b.itemName} already has opening stock at ${b.location}`);
      continue;
    }
    if (b.qty === 0) {
      outcome.skipped += b.rows;
      note(outcome, b.line, `${b.itemName} nets to zero quantity — nothing to bring in`);
      continue;
    }
    // Weighted average, not the last line's rate: two lots of the same item at
    // different costs have one cost between them once they are in the godown.
    const rate = Math.round((b.value / b.qty) * 10000) / 10000;
    try {
      await prisma.inventoryTxn.create({
        data: {
          companyId,
          type: "OPENING",
          date,
          itemId: b.itemId,
          qty: b.qty,
          rate,
          amount: Math.round(b.value * 100) / 100,
          location: b.location,
        },
      });
      alreadyOpened.add(key);
      // Every line that went into the bucket was imported, even though they
      // share one movement — counting one would report rows as missing.
      outcome.imported += b.rows;
      openedNow += 1;
      if (b.rows > 1) {
        note(outcome, b.line, `${b.itemName}: ${b.rows} lines combined into ${b.qty} at ${rate}`);
      }
    } catch (e) {
      outcome.skipped += b.rows;
      note(outcome, b.line, e instanceof Error ? e.message : "Could not write the stock row");
    }
  }

  // An item sitting at zero on cutover day is skipped, correctly — there is
  // nothing to bring in. The trap is what happens next: stock arrives a week
  // later, the same report is exported again, and this time that item has a
  // quantity. Re-run, it would be written as OPENING and dated back to the
  // cutover, so a purchase made after the cutover appears to have been in the
  // godown all along. Every item that was already opened is refused, so the
  // file looks like it behaved — only the new ones slip through, and those are
  // exactly the wrong ones.
  //
  // Not blocked, because opening a godown in batches is a real thing to do on a
  // migration. Said out loud, because the two cases are indistinguishable from
  // here and only the operator knows which one this is.
  if (openedNow > 0 && openedBefore) {
    note(
      outcome,
      0,
      `${openedNow} item(s) opened now, but this company already had opening stock ` +
        `from ${openedBefore.toISOString().slice(0, 10)}. Opening stock is what was in ` +
        `the godown on the cutover date. If this stock arrived after that, cancel and ` +
        `enter it as a purchase instead.`,
    );
  }

  return outcome;
}

/**
 * The account the other half of every legacy entry goes to.
 *
 * Not the real bank, not the real sales account. Those already carry their
 * cutover opening balance, and posting five years of movement on top of an
 * opening that already contains it counts the same money twice. The party is
 * the only account whose opening gets rolled back, so the party is the only
 * account that may receive the history.
 *
 * The contra therefore lands in one clearing account, whose own opening is set
 * — at the end of the import — to exactly cancel what was posted to it. It
 * carries a balance through the historical years, which is honest: it stands
 * for the rest of the old system, which was not imported. It reaches zero on
 * the cutover date, so the trial balance from cutover onwards is untouched.
 */
const SUSPENSE_CODE = "LEGACY-SUSPENSE";
const SUSPENSE_NAME = "LEGACY MIGRATION SUSPENSE";

async function ensureSuspenseAccount(companyId: string) {
  const existing = await prisma.account.findFirst({
    where: { companyId, code: SUSPENSE_CODE, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing;
  return prisma.account.create({
    data: {
      companyId,
      code: SUSPENSE_CODE,
      name: SUSPENSE_NAME,
      type: "EQUITY",
      partyType: "EQUITY",
      description:
        "Holds the other side of imported ledger history. Nets to zero on the cutover date.",
    },
    select: { id: true },
  });
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * A party's ledger from the old system, posted as real vouchers.
 *
 * Real ones, deliberately — not an archive table nothing reads. The ledger
 * report (app/api/reports/ledger/route.ts) builds its running balance from
 * `account.openDebit/openCredit` plus every VoucherEntry, so history written
 * this way sits in the same column as the vouchers written tomorrow and the
 * balance carries straight through the cutover with no seam.
 *
 * Two things make that safe:
 *
 *  1. The B/F line replaces the party's opening balance. The opening imported
 *     at cutover already *is* the sum of this history; leaving it in place and
 *     posting the history behind it would double every party. So the opening
 *     is rolled back to where the file starts, and the postings bring it
 *     forward to the same number it had before. A party whose file carries no
 *     B/F line is refused rather than doubled.
 *
 *  2. The contra leg goes to the suspense account above, never to the bank or
 *     the sales account named on the voucher. A party ledger prints one side
 *     only; the bank it appears to name is a cheque number, not an account.
 *
 * Re-running the same file is a no-op: a row is skipped when a voucher with
 * the same number, date and amount is already on the party.
 */
async function writeLedgerHistory(
  companyId: string,
  branchId: string | null,
  mapped: MappedRow<LedgerHistoryRow>[],
  fallbackParty: string,
  /** Party keys already opened by an earlier slice of the same file. */
  continuedParties: string[] = [],
): Promise<Outcome> {
  const outcome = emptyOutcome(mapped.length);
  const index = await loadAccountIndex(companyId);
  const continued = new Set(continuedParties.map((p) => p.trim().toLowerCase()));

  // Grouped by party, so a file holding one party and a file holding fifty go
  // down the same path.
  const groups = new Map<string, MappedRow<LedgerHistoryRow>[]>();
  for (const row of mapped) {
    if (row.error || !row.value) { outcome.skipped += 1; continue; }
    const key = (row.value.partyCode || row.value.party || fallbackParty).trim().toLowerCase();
    if (!key) {
      outcome.skipped += 1;
      note(outcome, row.line, "No party on this row, and no party given for the file");
      continue;
    }
    const list = groups.get(key);
    if (list) list.push(row); else groups.set(key, [row]);
  }

  const suspense = await ensureSuspenseAccount(companyId);

  // Five hundred parties over five years is six figures of vouchers, and a
  // create() per row is a round trip per row. Everything is collected first and
  // written in batches; the ids are generated here so the two entries can point
  // at their voucher before either exists.
  type PendingVoucher = {
    id: string; companyId: string; branchId?: string;
    voucherNo: string; type: string; date: Date; narration: string;
  };
  const vouchers: PendingVoucher[] = [];
  const entries: { companyId: string; voucherId: string; accountId: string; amount: number }[] = [];
  const lines: number[] = [];

  for (const [key, rows] of groups) {
    const first = rows[0].value;
    const code = first.partyCode;
    const name = first.party || fallbackParty;
    const hit = lookup(index, code, name);
    if (!hit) {
      outcome.skipped += rows.length;
      note(outcome, rows[0].line, `No account matches "${code || name}" — import the party first`);
      continue;
    }

    // Where this party stood before the file starts. Getting it wrong is the
    // one error that cannot be spotted afterwards — the ledger still adds up,
    // it is just wrong by the opening — so it is taken from the file two ways
    // and refused when the file says neither.
    //
    // Unless an earlier slice of this same file already settled it, in which
    // case these rows are the continuation of a ledger whose head has been
    // read, and the opening is not theirs to touch.
    const carriedOver = continued.has(key);
    const openingRows = rows.filter((r) => r.value.isOpening);
    const firstPosting = rows.find((r) => !r.value.isOpening)?.value ?? null;
    let openDebit = 0;
    let openCredit = 0;
    let openDate: Date | undefined;

    if (carriedOver) {
      // Nothing to decide, and nothing to write to the account.
    } else if (openingRows.length > 0) {
      openDebit = openingRows[0].value.debit;
      openCredit = openingRows[0].value.credit;
      openDate = openingRows[0].value.date ?? undefined;
    } else if (firstPosting && firstPosting.balanceAfter !== null) {
      // No B/F line — which is normal for a ledger run from the account's
      // inception — but the running balance column answers the same question:
      // the balance after the first posting, less that posting itself. An
      // account opened inside the period comes out at zero, which is right.
      const before = Number(
        (firstPosting.balanceAfter - (firstPosting.debit - firstPosting.credit)).toFixed(2),
      );
      openDebit = before > 0 ? before : 0;
      openCredit = before < 0 ? -before : 0;
      openDate = firstPosting.date ?? undefined;
    } else {
      outcome.skipped += rows.length;
      note(
        outcome,
        rows[0].line,
        `"${name || code}" has no opening / B/F line and no running-balance column — ` +
          `without one of the two, importing it would count the balance twice`,
      );
      continue;
    }

    // What is already on this account, so a second run of the same file writes
    // nothing rather than doubling the party.
    const seen = new Set<string>();
    const existing = await prisma.voucherEntry.findMany({
      where: { accountId: hit.id, voucher: { companyId, deletedAt: null } },
      select: { amount: true, voucher: { select: { voucherNo: true, date: true } } },
    });
    for (const e of existing) {
      seen.add(
        `${e.voucher.voucherNo}|${dayKey(new Date(e.voucher.date))}|${Number(e.amount).toFixed(2)}`,
      );
    }

    if (!carriedOver) {
      try {
        await prisma.account.update({
          where: { id: hit.id },
          data: { openDebit, openCredit, openDate },
        });
        outcome.updated += 1;
      } catch (e) {
        outcome.skipped += rows.length;
        note(
          outcome,
          (openingRows[0] ?? rows[0]).line,
          e instanceof Error ? e.message : "Could not roll the opening balance back",
        );
        continue;
      }
    }

    for (const row of rows) {
      const v = row.value;
      if (v.isOpening) continue;
      if (!v.date) { outcome.skipped += 1; continue; }

      // A row carrying both sides is a formatting artefact rather than a contra
      // entry — the net is what the old ledger's running balance moved by.
      const amount = Number((v.debit - v.credit).toFixed(2));
      if (amount === 0) {
        outcome.skipped += 1;
        note(outcome, row.line, "Debit and credit cancel out — nothing to post");
        continue;
      }

      // AHC prints the number and the type in one column — "401 CRV" — and our
      // ledger report has no type column of its own, so they are folded into
      // the number. It reads the way the operator remembers it, and a legacy
      // "CRV-401" cannot be mistaken for a voucher this system numbered itself.
      const rawNo = v.voucherNo || String(row.line);
      const voucherNo = v.voucherType ? `${v.voucherType}-${rawNo}` : rawNo;
      // Matched against what was in the database before this run only, never
      // against what this run has already queued. A ledger legitimately repeats
      // a posting — the same cash voucher number entered twice on one day for
      // two amounts is normal — and adding to the set as we go would drop the
      // second of any genuine pair while doing nothing extra about re-runs,
      // which are caught by the rows already on the account.
      const key = `${voucherNo}|${dayKey(v.date)}|${amount.toFixed(2)}`;
      if (seen.has(key)) { outcome.skipped += 1; continue; }

      const voucherId = randomUUID();
      vouchers.push({
        id: voucherId,
        companyId,
        branchId: branchId ?? undefined,
        voucherNo,
        type: v.voucherType || "JV",
        date: v.date,
        narration: v.narration || "Imported from previous system",
      });
      // Two per voucher, in this order, which is what lets the flush below
      // slice the entries alongside their vouchers without a lookup.
      entries.push({ companyId, voucherId, accountId: hit.id, amount });
      entries.push({ companyId, voucherId, accountId: suspense.id, amount: -amount });
      lines.push(row.line);
    }
  }

  // Vouchers and their entries go in together, so a chunk that fails leaves no
  // half-written voucher behind — a one-legged entry is a broken trial balance
  // that nothing in the app would flag.
  const CHUNK = 500;
  let posted = false;
  for (let i = 0; i < vouchers.length; i += CHUNK) {
    const slice = vouchers.slice(i, i + CHUNK);
    try {
      await prisma.$transaction([
        prisma.voucher.createMany({ data: slice }),
        prisma.voucherEntry.createMany({ data: entries.slice(i * 2, (i + slice.length) * 2) }),
      ]);
      outcome.imported += slice.length;
      posted = true;
    } catch (e) {
      outcome.skipped += slice.length;
      note(outcome, lines[i] ?? 0, e instanceof Error ? e.message : "Could not post this batch of vouchers");
    }
  }

  // Read back from the database rather than accumulated in the loop above, so
  // a second run over the same file lands on the same number instead of
  // doubling it, and a partly-failed run still leaves the trial balance square.
  if (posted) {
    const agg = await prisma.voucherEntry.aggregate({
      where: { accountId: suspense.id, voucher: { companyId, deletedAt: null } },
      _sum: { amount: true },
    });
    const net = Number(agg._sum.amount ?? 0);
    await prisma.account.update({
      where: { id: suspense.id },
      data: {
        openDebit: net < 0 ? Number((-net).toFixed(2)) : 0,
        openCredit: net > 0 ? Number(net.toFixed(2)) : 0,
      },
    });
  }

  return outcome;
}

/**
 * Open invoices and bills, as documents with no lines.
 *
 * Deliberately no voucher and no stock movement. The receivables *balance*
 * arrives with the trial balance; what the ageing report needs on top of that
 * is the individual bills and their dates, and it reads those straight off
 * SalesInvoice / PurchaseInvoice (see app/api/reports/ageing/customer). Posting
 * these to the ledger as well would double the debtors on the balance sheet.
 *
 * They carry no items because the goods left the building years ago under the
 * old system — inventing lines would move stock that was already sold.
 */
async function writeOpenDocuments(
  companyId: string,
  branchId: string | null,
  mapped: MappedRow<OpenDocumentRow>[],
  kind: "invoice" | "bill",
): Promise<Outcome> {
  const outcome = emptyOutcome(mapped.length);
  const index = await loadAccountIndex(companyId);

  const existingDocs = kind === "invoice"
    ? await prisma.salesInvoice.findMany({
        where: { companyId, deletedAt: null }, select: { invoiceNo: true },
      })
    : await prisma.purchaseInvoice.findMany({
        where: { companyId, deletedAt: null }, select: { invoiceNo: true },
      });
  const seen = new Set(existingDocs.map((d) => String(d.invoiceNo).trim().toLowerCase()));

  for (const row of mapped) {
    if (row.error || !row.value) { outcome.skipped += 1; continue; }
    const v = row.value;
    // readOpenDocumentRow already rejects a row with no readable date, so this
    // is belt and braces — but a document with no date cannot be aged, and
    // defaulting it to today would silently put a 2019 invoice in the current
    // bucket, which is worse than skipping it.
    if (!v.date) {
      outcome.skipped += 1;
      note(outcome, row.line, `${v.docNo} has no readable date`);
      continue;
    }
    const hit = lookup(index, "", v.party);
    if (!hit) {
      outcome.skipped += 1;
      note(outcome, row.line, `No account matches "${v.party}"`);
      continue;
    }
    const key = String(v.docNo).trim().toLowerCase();
    if (seen.has(key)) {
      outcome.skipped += 1;
      note(outcome, row.line, `${v.docNo} already exists`);
      continue;
    }
    try {
      if (kind === "invoice") {
        await prisma.salesInvoice.create({
          data: {
            companyId, branchId,
            invoiceNo: v.docNo,
            date: v.date,
            dueDate: v.dueDate,
            total: v.amount,
            customerId: hit.id,
            approvalStatus: "APPROVED",
            notes: "Opening balance — migrated from previous system",
            reference: v.docNo,
          },
        });
      } else {
        await prisma.purchaseInvoice.create({
          data: {
            companyId, branchId,
            invoiceNo: v.docNo,
            date: v.date,
            dueDate: v.dueDate,
            total: v.amount,
            supplierId: hit.id,
            approvalStatus: "APPROVED",
            notes: "Opening balance — migrated from previous system",
            reference: v.docNo,
          },
        });
      }
      seen.add(key);
      outcome.imported += 1;
    } catch (e) {
      outcome.skipped += 1;
      note(outcome, row.line, e instanceof Error ? e.message : "Could not save this document");
    }
  }
  return outcome;
}

/* ─────────────────────────── Route ─────────────────────────── */

type ImportBody = {
  csv: string;
  source: string;
  dataType: string;
  dryRun: boolean;
  date: string;
  /** Party for a ledger-history file that names its party in the report header, not a column. */
  party: string;
  /**
   * Data rows of the original file that came before this slice. Zero for a file
   * sent whole. Row numbers in every message are reported against the original,
   * so "Row 41,208" is a row the operator can find in their own export.
   */
  lineOffset: number;
  /** How many slices the file was cut into. One means it was sent whole. */
  chunkCount: number;
  /** Which slice this is, from one. */
  chunkIndex: number;
  /**
   * Item codes a full-file scan found to be shared by two items. Only the
   * sender has seen the whole file once it has been cut up, so the finding
   * travels with each slice. See `scanAmbiguousItemCodes`.
   */
  ambiguousCodes: string[];
  /**
   * Parties whose ledger rows began in an earlier slice.
   *
   * A party's opening balance is decided once, from the B/F line or the running
   * balance at the top of its ledger. A second slice carrying more of the same
   * party has neither at its head — its first row is a posting from the middle
   * of the year — so left to itself it would either refuse the party for having
   * no opening, or worse, read that mid-year balance as one and overwrite the
   * opening the first slice got right. Naming the parties that are already
   * under way says: post these rows, the opening is settled.
   */
  continuedParties: string[];
  /**
   * Which piece of a segmented account code is the account.
   *
   * An Oracle EBS code is a flexfield combination — 01-000-1110-0000 is company,
   * cost centre, natural account, future use — and only one segment of it names
   * an account. Imported whole, the same account arrives once per cost centre:
   * a chart of four hundred accounts becomes twelve thousand, all of them called
   * the same thing, and the trial balance is unreadable.
   *
   * Anyone who can query the database exports `segment3` and never meets this.
   * Anyone who can only run the standard report gets the whole combination and
   * cannot change it — so it is cut here instead. Zero means take it whole,
   * which is what every other system needs.
   */
  codeSegment: number;
  /** What the segments are separated by. Hyphen on every EBS install we have seen. */
  codeSeparator: string;
  error?: string;
};

const EMPTY_BODY: ImportBody = {
  csv: "", source: "csv", dataType: "", dryRun: false, date: "", party: "",
  lineOffset: 0, chunkCount: 1, chunkIndex: 1, ambiguousCodes: [], continuedParties: [],
  codeSegment: 0, codeSeparator: "-",
};

/** A count from an untrusted caller, kept sane and non-negative. */
function counted(raw: unknown, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function stringList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch { return []; }
  }
  return [];
}

async function readBody(req: NextRequest): Promise<ImportBody> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const csv = file instanceof File ? await file.text() : String(form.get("csv") || "");
    return {
      csv,
      source: String(form.get("source") || "csv"),
      dataType: String(form.get("dataType") || ""),
      dryRun: String(form.get("dryRun") || "") === "true",
      date: String(form.get("date") || ""),
      party: String(form.get("party") || ""),
      lineOffset: counted(form.get("lineOffset"), 0),
      chunkCount: Math.max(1, counted(form.get("chunkCount"), 1)),
      chunkIndex: Math.max(1, counted(form.get("chunkIndex"), 1)),
      ambiguousCodes: stringList(form.get("ambiguousCodes")),
      continuedParties: stringList(form.get("continuedParties")),
      codeSegment: counted(form.get("codeSegment"), 0),
      codeSeparator: String(form.get("codeSeparator") || "-"),
    };
  }

  const json = await req.json().catch(() => null);
  if (!json) return { ...EMPTY_BODY, error: "Invalid request body" };
  return {
    csv: String(json.csv || ""),
    source: String(json.source || "csv"),
    dataType: String(json.dataType || ""),
    dryRun: json.dryRun === true,
    date: String(json.date || ""),
    party: String(json.party || ""),
    lineOffset: counted(json.lineOffset, 0),
    chunkCount: Math.max(1, counted(json.chunkCount, 1)),
    chunkIndex: Math.max(1, counted(json.chunkIndex, 1)),
    ambiguousCodes: stringList(json.ambiguousCodes),
    continuedParties: stringList(json.continuedParties),
    codeSegment: counted(json.codeSegment, 0),
    codeSeparator: String(json.codeSeparator || "-"),
  };
}

/**
 * Replaces each row's code with one segment of it.
 *
 * Runs before every whole-file pass, because those passes read codes as a tree
 * — `0303` is the head of `03030001` — and a combination code has no tree in it
 * until the account segment has been cut out of it.
 *
 * A row whose code has fewer segments than asked for is left alone rather than
 * blanked. That is usually the report's own total line, and emptying its code
 * would turn a row that gets held back into a row that imports as a nameless
 * account.
 */
function applyCodeSegment(
  dataType: ImportDataType,
  rows: MappedRow<{ code?: string; partyCode?: string }>[],
  segment: number,
  separator: string,
) {
  // Ledger accounts only. A flexfield combination is a GL account code; an item
  // code that happens to contain a hyphen is just an item code, and cutting it
  // would also put the code the server writes out of step with the duplicate
  // scan the browser ran over the whole file before splitting it.
  if (!SEGMENTED_TYPES.has(dataType)) return;
  if (segment < 1) return;
  const sep = separator || "-";
  for (const row of rows) {
    if (!row.value) continue;
    for (const key of ["code", "partyCode"] as const) {
      const raw = row.value[key];
      if (!raw) continue;
      const parts = String(raw).split(sep);
      if (parts.length < segment) continue;
      row.value[key] = parts[segment - 1].trim();
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json(
        { error: "Only an Admin or Accountant can import data" },
        { status: 403 },
      );
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await readBody(req);
    if (body.error) return NextResponse.json({ error: body.error }, { status: 400 });

    const dataType = body.dataType.toLowerCase() as ImportDataType;
    if (!IMPORT_DATA_TYPE_IDS.includes(dataType)) {
      return NextResponse.json(
        { error: `Unknown data type "${body.dataType}"` },
        { status: 400 },
      );
    }
    if (!body.csv.trim()) {
      return NextResponse.json({ error: "The file is empty" }, { status: 400 });
    }

    if (body.chunkCount > 1 && WHOLE_FILE_SET.has(dataType)) {
      const def = findDataType(dataType);
      return NextResponse.json(
        {
          error:
            `${def?.name ?? dataType} has to be imported as one file. Its checks read the ` +
            `whole chart at once — which rows are group totals, and which heading each ` +
            `account sits under — and neither question can be answered from part of the ` +
            `file. Send the export whole; one row per account is never large enough to ` +
            `need splitting.`,
        },
        { status: 400 },
      );
    }

    // Some report writers flatten their layout onto one line per record instead
    // of writing a grid. Recognise and unwrap that before anything else looks at
    // the file; anything unrecognised comes back untouched.
    // The party-ledger shape is checked first because it is the more specific
    // of the two: it insists on its own markers on every line, so anything else
    // falls straight through to the general unwrapper.
    // Tried most specific first. Each one insists on its own shape and hands
    // the file back untouched when it is not that shape, so the order only
    // decides which gets to look first, never what a file is read as.
    //
    // Skipped for a slice. A file that needs unwrapping is unwrapped in the
    // browser before it is cut up, because these readers look for markers
    // across the whole export and a slice would only show them part of it.
    // Running them again here would be at best a no-op and at worst a second
    // reshape of text that has already been reshaped once.
    const shapes = [flattenLedgerExport, flattenRepeatedReportExport, flattenHeaderPrefixExport];
    let flattened = { text: body.csv, converted: false } as ReturnType<typeof flattenLedgerExport>;
    if (body.chunkCount === 1) {
      for (const shape of shapes) {
        const result = shape(body.csv);
        if (result.converted) { flattened = result; break; }
      }
    }
    const parsed = parseCsv(flattened.text);
    if (parsed.rows.length === 0) {
      return NextResponse.json(
        { error: "No data rows found — the file needs a heading row and at least one row under it" },
        { status: 400 },
      );
    }

    const shape = describeNonTabular(parsed);
    if (shape) {
      return NextResponse.json({ error: shape }, { status: 400 });
    }
    const rowCap = dataType === "ledger_history" ? MAX_LEDGER_ROWS : MAX_ROWS;
    if (parsed.rows.length > rowCap) {
      return NextResponse.json(
        { error: `${parsed.rows.length.toLocaleString()} rows is too many for one request. The Import Wizard splits a file this size automatically — upload it there rather than posting it here, or send it in pieces of ${rowCap.toLocaleString()} rows or fewer.` },
        { status: 400 },
      );
    }

    const mapped = mapForType(dataType, parsed.rows, body.lineOffset);

    // Before the whole-file passes below, which read codes as a hierarchy.
    applyCodeSegment(
      dataType,
      mapped.rows as MappedRow<{ code?: string; partyCode?: string }>[],
      body.codeSegment,
      body.codeSeparator,
    );

    // Whole-file pass, so it cannot live in a per-row reader: a hierarchical
    // trial balance prints group subtotals as ordinary rows, and importing
    // those alongside their children counts the same money two or three times.
    // Runs before both the preview and the commit, so the operator sees the
    // rows that will be held back and why.
    if (dataType === "opening_balances") {
      const { summaries } = flagSummaryRows(mapped.rows as MappedRow<OpeningBalanceRow>[]);
      if (summaries > 0) {
        mapped.ok -= summaries;
        mapped.failed += summaries;
      }
    }

    // Whole-file pass: one code standing for two items cannot be seen from
    // inside a single row.
    if (dataType === "items") {
      const { flagged } = flagAmbiguousItemCodes(
        mapped.rows as MappedRow<ItemRow>[], body.ambiguousCodes,
      );
      if (flagged > 0) {
        mapped.ok -= flagged;
        mapped.failed += flagged;
      }
    }

    // Also a whole-file pass. A trial balance exported as a chart of accounts
    // carries no type column, so every row reads as GENERAL; the group rows
    // above each account are the only statement of what it is.
    if (dataType === "accounts") {
      inheritGroupsFromHierarchy(mapped.rows as MappedRow<AccountRow>[]);
    }

    // ── Dry run: interpret, check against the database, write nothing ──
    if (body.dryRun) {
      // Every row shape carries some subset of code / name / party, which is
      // all annotation reads.
      const tally = await annotateAgainstDb(
        companyId, dataType, mapped.rows as MappedRow<Identifiable>[],
      );
      const def = findDataType(dataType);
      return NextResponse.json({
        preview: true,
        dataType,
        dataTypeName: def?.name ?? dataType,
        headers: parsed.headers,
        delimiter: parsed.delimiter === "\t" ? "tab" : parsed.delimiter,
        // Says so when the file was not a table and had to be unwrapped, so
        // nobody is left wondering why the columns are not the ones they saw.
        reshaped: flattened.converted ? flattened.note : undefined,
        total: mapped.rows.length,
        ok: tally.ok,
        failed: tally.failed,
        warnings: mapped.warnings,
        rows: mapped.rows.slice(0, PREVIEW_ROWS),
        // Every failure, not just the ones inside the preview window — the row
        // that breaks an import is rarely in the first twenty-five.
        issues: mapped.rows
          .filter((r) => r.error)
          .slice(0, 100)
          .map((r) => ({ line: r.line, error: r.error })),
      });
    }

    // ── Commit ──
    const date = body.date ? new Date(body.date) : new Date();
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid cutover date" }, { status: 400 });
    }

    // `mapForType` returns the union of every row shape, so each branch narrows
    // to the one its reader actually produced. The pairing of data type to
    // reader is fixed in `mapForType` directly above, which is what makes each
    // of these assertions safe.
    const rows = mapped.rows;
    let outcome: Outcome;
    switch (dataType) {
      case "accounts":
        outcome = await writeAccounts(companyId, rows as MappedRow<AccountRow>[], "account");
        break;
      case "customers":
        outcome = await writeAccounts(companyId, rows as MappedRow<AccountRow>[], "customer");
        break;
      case "suppliers":
        outcome = await writeAccounts(companyId, rows as MappedRow<AccountRow>[], "supplier");
        break;
      case "items":
        outcome = await writeItems(companyId, rows as MappedRow<ItemRow>[]);
        break;
      case "opening_balances":
        outcome = await writeOpeningBalances(companyId, rows as MappedRow<OpeningBalanceRow>[], date);
        break;
      case "opening_stock":
        outcome = await writeOpeningStock(companyId, rows as MappedRow<OpeningStockRow>[], date);
        break;
      case "open_invoices":
        outcome = await writeOpenDocuments(
          companyId, await resolveBranchIdOrDefault(req, companyId),
          rows as MappedRow<OpenDocumentRow>[], "invoice",
        );
        break;
      case "open_bills":
        outcome = await writeOpenDocuments(
          companyId, await resolveBranchIdOrDefault(req, companyId),
          rows as MappedRow<OpenDocumentRow>[], "bill",
        );
        break;
      case "ledger_history":
        outcome = await writeLedgerHistory(
          companyId, await resolveBranchIdOrDefault(req, companyId),
          rows as MappedRow<LedgerHistoryRow>[], body.party.trim(),
          body.continuedParties,
        );
        break;
      default:
        return NextResponse.json({ error: "Unsupported data type" }, { status: 400 });
    }

    // Rows the mapper itself rejected never reached a writer, so their reasons
    // have to be folded in or the operator sees "skipped 12" with no why.
    for (const row of mapped.rows) {
      if (row.error) note(outcome, row.line, row.error);
    }

    return NextResponse.json({
      success: true,
      source: body.source,
      dataType,
      ...outcome,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Import failed";
    console.error("IMPORT ERROR:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    sources: IMPORT_SOURCES,
    dataTypes: IMPORT_DATA_TYPES,
  });
}
