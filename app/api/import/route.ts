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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchIdOrDefault } from "@/lib/tenant";
import { safeEncryptField } from "@/lib/fieldEncrypt";
import { parseCsv, type CsvRow } from "@/lib/csvParse";
import { flattenRepeatedReportExport } from "@/lib/reportFlatten";
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
  flagSummaryRows,
  inheritGroupsFromHierarchy,
  type ImportDataType,
  type MappedRow,
  type AccountRow,
  type ItemRow,
  type OpeningBalanceRow,
  type OpeningStockRow,
  type OpenDocumentRow,
} from "@/lib/importEngine";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT"]);

/** Rows shown in the preview. Enough to spot a mis-read column, not a dump. */
const PREVIEW_ROWS = 25;
/** Beyond this a single file is refused — split it instead of timing out. */
const MAX_ROWS = 20000;

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
function mapForType(dataType: ImportDataType, rows: CsvRow[]) {
  switch (dataType) {
    case "accounts":
      return mapRows(rows, (r) => readAccountRow(r));
    case "customers":
      return mapRows(rows, (r) => readAccountRow(r, "customer"));
    case "suppliers":
      return mapRows(rows, (r) => readAccountRow(r, "supplier"));
    case "items":
      return mapRows(rows, (r) => readItemRow(r));
    case "opening_balances":
      return mapRows(rows, (r) => readOpeningBalanceRow(r));
    case "opening_stock":
      return mapRows(rows, (r) => readOpeningStockRow(r));
    case "open_invoices":
      return mapRows(rows, (r) => readOpenDocumentRow(r, "invoice"));
    case "open_bills":
      return mapRows(rows, (r) => readOpenDocumentRow(r, "bill"));
    default:
      return mapRows(rows, () => ({ value: null, error: "Unsupported data type" }));
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
    select: { itemId: true, location: true },
  });
  const alreadyOpened = new Set(existing.map((r) => `${r.itemId}@${r.location}`));

  for (const row of mapped) {
    if (row.error || !row.value) { outcome.skipped += 1; continue; }
    const v = row.value;
    const hit = lookup(index, v.code, v.name);
    if (!hit) {
      outcome.skipped += 1;
      note(outcome, row.line, `No item matches "${v.code || v.name}"`);
      continue;
    }
    // Running the same file twice is a normal thing to do during a migration
    // dry run; doubling everybody's opening stock is not.
    const key = `${hit.id}@${v.location}`;
    if (alreadyOpened.has(key)) {
      outcome.skipped += 1;
      note(outcome, row.line, `${hit.name} already has opening stock at ${v.location}`);
      continue;
    }
    try {
      await prisma.inventoryTxn.create({
        data: {
          companyId,
          type: "OPENING",
          date,
          itemId: hit.id,
          qty: v.qty,
          rate: v.rate,
          amount: Math.round(v.qty * v.rate * 100) / 100,
          location: v.location,
        },
      });
      alreadyOpened.add(key);
      outcome.imported += 1;
    } catch (e) {
      outcome.skipped += 1;
      note(outcome, row.line, e instanceof Error ? e.message : "Could not write the stock row");
    }
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

async function readBody(req: NextRequest): Promise<{
  csv: string;
  source: string;
  dataType: string;
  dryRun: boolean;
  date: string;
  error?: string;
}> {
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
    };
  }

  const json = await req.json().catch(() => null);
  if (!json) return { csv: "", source: "csv", dataType: "", dryRun: false, date: "", error: "Invalid request body" };
  return {
    csv: String(json.csv || ""),
    source: String(json.source || "csv"),
    dataType: String(json.dataType || ""),
    dryRun: json.dryRun === true,
    date: String(json.date || ""),
  };
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

    // Some report writers flatten their layout onto one line per record instead
    // of writing a grid. Recognise and unwrap that before anything else looks at
    // the file; anything unrecognised comes back untouched.
    const flattened = flattenRepeatedReportExport(body.csv);
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
    if (parsed.rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `${parsed.rows.length.toLocaleString()} rows is too many for one file. Split it into files of ${MAX_ROWS.toLocaleString()} rows or fewer.` },
        { status: 400 },
      );
    }

    const mapped = mapForType(dataType, parsed.rows);

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
