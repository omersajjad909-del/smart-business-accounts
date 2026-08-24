// FILE: lib/importEngine.ts
//
// What every importer in the product agrees on: which columns mean what, and
// what an account's category is called once it is inside FinovaOS.
//
// The first version of the wizard carried an exact column map per source —
// `{ "Ledger Name": "name" }` for Tally, `{ "Account Name": "name" }` for Xero.
// That works for a demo file and fails on the real thing, because a company
// ten years into an Oracle install is not exporting Oracle's stock columns:
// they are exporting a report somebody in their IT department wrote in 2016
// with headings like `ACCOUNT_NAME`, `Party Name` or `Ledger Description`.
//
// So the mapping is by *alias list* instead: every spelling any of these
// systems is known to emit, matched loosely (case, spaces, underscores and
// dots ignored — see `normalizeHeader`). Picking a source in the wizard then
// only changes the on-screen instructions and a couple of quirks, not whether
// the file can be read at all. A column nobody anticipated is handled by
// renaming it in Excel, which is a thirty-second fix rather than a support
// ticket.

import { pick, parseAmount, parseImportDate, type CsvRow } from "@/lib/csvParse";

/* ─────────────────────────── Sources ─────────────────────────── */

export type ImportSourceId =
  | "oracle"
  | "quickbooks"
  | "xero"
  | "sage"
  | "tally"
  | "peachtree"
  | "csv";

export type ImportSource = {
  id: ImportSourceId;
  name: string;
  /** Two-letter tile badge. */
  badge: string;
  color: string;
  /** One line under the tile. */
  desc: string;
  /** How to get the file out, shown once the source is picked. */
  steps: string[];
};

export const IMPORT_SOURCES: ImportSource[] = [
  {
    id: "oracle",
    name: "Oracle",
    badge: "OR",
    color: "#c74634",
    desc: "Oracle EBS, Oracle Financials, Oracle Fusion or any Oracle-database system",
    steps: [
      "Open SQL Developer / TOAD and connect to the Oracle database.",
      "Run the query for the data you are importing (see the Oracle Migration Guide).",
      "Right-click the results grid → Export → Format: CSV → Encoding: UTF-8.",
      "Or, from a report screen: Actions → Download → CSV.",
      "Dates come out as 15-JAN-2024 and negatives as (500) — both are read correctly.",
    ],
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    badge: "QB",
    color: "#2ca01c",
    desc: "QuickBooks Desktop or Online",
    steps: [
      "Reports → find the list report (Chart of Accounts, Customer Contact List, Item Listing).",
      "Export → Export to Excel / CSV.",
      "If it saves as .xlsx, open it and use File → Save As → CSV UTF-8.",
    ],
  },
  {
    id: "xero",
    name: "Xero",
    badge: "XE",
    color: "#13b5ea",
    desc: "Xero accounting",
    steps: [
      "Accounting → Chart of Accounts → Export (for accounts).",
      "Contacts → Export (for customers and suppliers).",
      "Business → Products and Services → Export (for items).",
    ],
  },
  {
    id: "sage",
    name: "Sage",
    badge: "SA",
    color: "#00d639",
    desc: "Sage 50 / Sage 200 / Sage One",
    steps: [
      "File → Import/Export → Export.",
      "Choose the data type, then CSV as the output format.",
      "Include the header row when prompted.",
    ],
  },
  {
    id: "tally",
    name: "Tally",
    badge: "TL",
    color: "#7e22ce",
    desc: "Tally ERP 9 / TallyPrime",
    steps: [
      "Gateway of Tally → Display → List of Accounts (or Stock Summary for items).",
      "Press Alt+E → Export → Format: Excel / CSV.",
      "Tally writes balances as '500 Cr' — the Cr tag is read as a credit.",
    ],
  },
  {
    id: "peachtree",
    name: "Peachtree / Sage 50 US",
    badge: "PT",
    color: "#0ea5e9",
    desc: "Peachtree Accounting",
    steps: [
      "File → Select Import/Export.",
      "Pick the list, then Export, and keep the default comma-separated layout.",
    ],
  },
  {
    id: "csv",
    name: "Generic CSV / Excel",
    badge: "CS",
    color: "#64748b",
    desc: "Any spreadsheet — download a template below and paste your data in",
    steps: [
      "Download the template for the data type you are importing.",
      "Paste your data under the headings, keeping the heading row.",
      "Save as CSV UTF-8 (Excel: File → Save As → CSV UTF-8).",
    ],
  },
];

export const IMPORT_SOURCE_IDS = IMPORT_SOURCES.map((s) => s.id);

/* ─────────────────────────── Data types ─────────────────────────── */

export type ImportDataType =
  | "accounts"
  | "customers"
  | "suppliers"
  | "items"
  | "opening_balances"
  | "opening_stock"
  | "open_invoices"
  | "open_bills";

export type ImportDataTypeDef = {
  id: ImportDataType;
  name: string;
  icon: string;
  desc: string;
  /** Column headings our own template offers. */
  template: string[];
  /** Which of those the row is rejected without. */
  required: string[];
  /** Migration order — a lower number has to be imported first. */
  order: number;
  /** Shown on the page as the reason this step exists. */
  why: string;
};

export const IMPORT_DATA_TYPES: ImportDataTypeDef[] = [
  {
    id: "accounts",
    name: "Chart of Accounts",
    icon: "📊",
    desc: "Ledger accounts — cash, bank, expenses, income, capital",
    template: ["code", "name", "type", "description"],
    required: ["name"],
    order: 1,
    why: "Everything else hangs off an account. Import this first.",
  },
  {
    id: "customers",
    name: "Customers",
    icon: "🧑‍💼",
    desc: "Customer / debtor accounts with their contact details",
    template: ["code", "name", "phone", "email", "city", "address", "ntn", "strn", "creditLimit", "creditDays"],
    required: ["name"],
    order: 2,
    why: "Needed before open invoices, which point at a customer by name or code.",
  },
  {
    id: "suppliers",
    name: "Suppliers",
    icon: "🏭",
    desc: "Supplier / creditor accounts with their contact details",
    template: ["code", "name", "phone", "email", "city", "address", "ntn", "strn"],
    required: ["name"],
    order: 3,
    why: "Needed before open bills.",
  },
  {
    id: "items",
    name: "Products & Items",
    icon: "📦",
    desc: "Stock items with unit, sale rate and purchase rate",
    template: ["code", "name", "unit", "rate", "purchaseRate", "category", "minStock", "barcode"],
    required: ["name"],
    order: 4,
    why: "Needed before opening stock.",
  },
  {
    id: "opening_balances",
    name: "Opening Balances",
    icon: "⚖️",
    desc: "The trial balance on your cutover date — the accounting truth",
    template: ["code", "name", "debit", "credit"],
    required: [],
    order: 5,
    why: "This is what makes your books agree with Oracle on day one.",
  },
  {
    id: "opening_stock",
    name: "Opening Stock",
    icon: "📥",
    desc: "Quantity and cost of every item on hand at cutover",
    template: ["code", "name", "qty", "rate", "location"],
    required: [],
    order: 6,
    why: "Items import brings the item; this brings the quantity sitting in the godown.",
  },
  {
    id: "open_invoices",
    name: "Open Sales Invoices",
    icon: "🧾",
    desc: "Unpaid customer invoices, so receivables ageing works from day one",
    template: ["invoiceNo", "customer", "date", "dueDate", "amount"],
    required: ["invoiceNo", "customer"],
    order: 7,
    why: "Ageing needs the individual bills, not just the party total.",
  },
  {
    id: "open_bills",
    name: "Open Purchase Bills",
    icon: "📄",
    desc: "Unpaid supplier bills, so payables ageing works from day one",
    template: ["billNo", "supplier", "date", "dueDate", "amount"],
    required: ["billNo", "supplier"],
    order: 8,
    why: "Same as above, on the payables side.",
  },
];

export const IMPORT_DATA_TYPE_IDS = IMPORT_DATA_TYPES.map((d) => d.id);

export function findDataType(id: string): ImportDataTypeDef | null {
  return IMPORT_DATA_TYPES.find((d) => d.id === id) ?? null;
}

/* ─────────────────────── Column aliases ─────────────────────── */

/**
 * Every heading we have seen mean the same thing, in rough order of how
 * specific it is. `pick` takes the first that is present and non-empty, so a
 * file carrying both "Account Code" and "Code" resolves to the specific one.
 */
export const FIELD_ALIASES: Record<string, string[]> = {
  // Deliberately no bare "no", "number" or "id" at the end. Those match by
  // containment against half the columns in a real export — "NTN Number" and
  // "Invoice Number" both contain "number" — and the account code silently
  // becoming the tax number is the kind of error nobody finds until an audit.
  code: [
    "item code", "account code", "accountcode", "acct code", "ledger code", "gl code",
    "party code", "customer code", "supplier code", "vendor code", "product code",
    "stock code", "account number", "acno", "a/c code", "part no", "partno",
    "segment1", "sku", "code",
  ],
  name: [
    "name", "account name", "accountname", "ledger name", "gl account name",
    "account description", "description of account", "party name", "customer name",
    "supplier name", "vendor name", "contact name", "item name", "product name",
    "stock item", "particulars", "title", "description",
  ],
  type: [
    "type", "account type", "accounttype", "account category", "category",
    "group", "ledger group", "under", "parent group", "class", "account class",
    "nature", "gl type",
  ],
  description: ["description", "notes", "remarks", "narration", "comments", "memo"],

  phone: ["phone", "telephone", "tel", "mobile", "cell", "contact no", "phone number", "contact number"],
  email: ["email", "e-mail", "email address", "mail"],
  city: ["city", "town", "location city"],
  address: ["address", "address1", "address line 1", "street", "billing address", "postal address"],
  ntn: ["ntn", "national tax number", "tax number", "tax id", "taxid", "tin"],
  strn: ["strn", "sales tax number", "gst no", "gstin", "sales tax reg", "srtn"],
  creditLimit: ["credit limit", "creditlimit", "limit"],
  creditDays: ["credit days", "creditdays", "payment terms days", "terms days", "days"],

  unit: ["unit", "uom", "unit of measure", "primary unit", "base unit", "measure"],
  rate: ["rate", "sale rate", "selling price", "sales price", "unit price", "price", "list price", "mrp"],
  purchaseRate: ["purchase rate", "purchaserate", "cost", "cost price", "unit cost", "buying price", "purchase price", "std cost", "standard cost"],
  minStock: ["min stock", "minstock", "reorder level", "reorder point", "minimum qty", "safety stock"],
  barcode: ["barcode", "bar code", "ean", "upc"],

  debit: ["debit", "dr", "opening debit", "opendebit", "debit amount", "debit balance"],
  credit: ["credit", "cr", "opening credit", "opencredit", "credit amount", "credit balance"],
  balance: ["balance", "opening balance", "openingbalance", "closing balance", "amount", "net balance", "begin balance", "ending balance"],

  qty: ["qty", "quantity", "stock", "on hand", "onhand", "closing qty", "closing stock", "balance qty", "quantity on hand", "available qty"],
  location: ["location", "warehouse", "godown", "store", "subinventory", "site"],

  invoiceNo: ["invoice no", "invoiceno", "invoice number", "invoice #", "bill no", "billno", "bill number", "doc no", "document number", "trx number", "transaction number", "voucher no", "reference"],
  party: ["customer", "customer name", "supplier", "supplier name", "vendor", "vendor name", "party", "party name", "account name", "bill to", "name"],
  date: ["date", "invoice date", "bill date", "document date", "trx date", "transaction date", "gl date"],
  dueDate: ["due date", "duedate", "maturity date", "payment due", "due on"],
  amount: ["amount", "outstanding", "outstanding amount", "balance due", "amount due", "open amount", "invoice amount", "total", "net amount", "grand total", "balance"],
};

/** Reads one logical field out of a row, trying every known alias. */
export function field(row: CsvRow, key: keyof typeof FIELD_ALIASES | string): string {
  const aliases = FIELD_ALIASES[key];
  return aliases ? pick(row, ...aliases) : pick(row, key);
}

/* ────────────────────── Account classification ────────────────────── */

/**
 * partyType is the category an account is filed under; `type` is derived from
 * it. Kept identical to CATEGORY_TYPE_MAP in app/api/accounts/route.ts, which
 * is what the app writes when a human creates an account by hand.
 */
export const CATEGORY_TYPE_MAP: Record<string, string> = {
  CUSTOMER: "ASSET",
  SUPPLIER: "LIABILITY",
  BANKS: "ASSET",
  CASH: "ASSET",
  "FIXED ASSETS": "ASSET",
  "ACCUMULATED DEPRECIATION": "CONTRA_ASSET",
  EXPENSE: "EXPENSE",
  INCOME: "INCOME",
  EQUITY: "EQUITY",
  LIABILITIES: "LIABILITY",
  STOCK: "ASSET",
  GENERAL: "ASSET",
  CONTRA: "CONTRA_ASSET",
};

/**
 * Turns whatever the source called an account group into one of ours.
 *
 * The old importer mapped everything it did not recognise to "EXPENSE" and
 * wrote contacts as `type: "DEBTOR"` with no partyType at all. Neither
 * "DEBTOR" nor "CREDITOR" is a type the balance sheet knows
 * (app/api/reports/balance-sheet/route.ts classifies on ASSET / LIABILITY /
 * EQUITY / INCOME / EXPENSE plus partyType), so every imported customer was
 * invisible on the balance sheet — present in the database, absent from the
 * accounts. Matching on substrings and defaulting to GENERAL, which maps to
 * ASSET, means an unrecognised group is merely filed in the wrong place
 * instead of vanishing.
 */
export function normalizePartyType(raw: string, hint?: "customer" | "supplier"): string {
  if (hint === "customer") return "CUSTOMER";
  if (hint === "supplier") return "SUPPLIER";

  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "GENERAL";

  const has = (...needles: string[]) => needles.some((n) => s.includes(n));
  /**
   * Whole-word test, for the two-letter abbreviations only.
   *
   * "AR" and "AP" as substrings are a trap: SHARE CAPITAL contains AR, and
   * CAPITAL contains AP, so a substring test filed share capital under
   * customers and the balance sheet showed the owner's equity as a debtor.
   */
  const hasWord = (...needles: string[]) =>
    needles.some((n) => new RegExp(`\\b${n}\\b`).test(s));

  // Order matters: "ACCOUNTS RECEIVABLE" contains both "RECEIVABLE" and
  // "ACCOUNT", and "ACCUMULATED DEPRECIATION" must not be read as an asset.
  if (has("ACCUM", "DEPREC")) return "ACCUMULATED DEPRECIATION";
  if (has("RECEIVABLE", "DEBTOR", "CUSTOMER", "SUNDRY DR", "TRADE DEBT") || hasWord("AR")) return "CUSTOMER";
  if (has("PAYABLE", "CREDITOR", "SUPPLIER", "VENDOR", "SUNDRY CR", "TRADE CRED") || hasWord("AP")) return "SUPPLIER";
  if (has("BANK")) return "BANKS";
  if (has("CASH", "PETTY")) return "CASH";
  if (has("FIXED ASSET", "PLANT", "MACHINERY", "EQUIPMENT", "VEHICLE", "BUILDING", "FURNITURE", "PROPERTY")) return "FIXED ASSETS";
  if (has("STOCK", "INVENTOR", "GOODS", "MATERIAL")) return "STOCK";
  if (has("CAPITAL", "EQUITY", "RESERVE", "RETAINED", "SHARE")) return "EQUITY";
  if (has("INCOME", "REVENUE", "SALES", "TURNOVER", "EARNING")) return "INCOME";
  if (has("EXPENSE", "COST", "PURCHASE", "SALAR", "WAGE", "RENT", "UTILIT", "OVERHEAD", "COGS")) return "EXPENSE";
  if (has("LIABILIT", "LOAN", "PAYABLE", "PROVISION", "ACCRUAL", "TAX", "DUTY")) return "LIABILITIES";
  if (has("ASSET", "ADVANCE", "DEPOSIT", "PREPAID")) return "GENERAL";

  return "GENERAL";
}

/** The `type` column that goes with a partyType. */
export function typeForPartyType(partyType: string): string {
  return CATEGORY_TYPE_MAP[partyType] || "ASSET";
}

/* ─────────────────────── Row mapping ─────────────────────── */

/** One row after mapping, with whatever went wrong attached to it. */
export type MappedRow<T> = {
  /** 1-based row number in the file, header excluded — what the user sees. */
  line: number;
  value: T;
  /** Blocks the write. */
  error?: string;
  /** Written anyway, but worth showing. */
  warning?: string;
  /**
   * The existing account or item this row resolved to, filled in during the
   * dry run. Shown in the preview so "Ali Traders" being matched to "M/s Ali
   * Traders & Co" is caught by the person who knows, before the write.
   */
  matched?: string;
};

export type MapReport<T> = {
  rows: MappedRow<T>[];
  ok: number;
  failed: number;
  warnings: number;
};

/** Runs a per-row mapper and tallies the outcome. */
export function mapRows<T>(
  rows: CsvRow[],
  mapper: (row: CsvRow, line: number) => { value: T; error?: string; warning?: string },
): MapReport<T> {
  const out: MappedRow<T>[] = [];
  let ok = 0;
  let failed = 0;
  let warnings = 0;

  rows.forEach((row, index) => {
    const line = index + 1;
    try {
      const result = mapper(row, line);
      const mapped: MappedRow<T> = { line, value: result.value };
      if (result.error) { mapped.error = result.error; failed += 1; }
      else { ok += 1; }
      if (result.warning) { mapped.warning = result.warning; warnings += 1; }
      out.push(mapped);
    } catch (e) {
      failed += 1;
      out.push({
        line,
        value: undefined as unknown as T,
        error: e instanceof Error ? e.message : "Could not read this row",
      });
    }
  });

  return { rows: out, ok, failed, warnings };
}

/* ─────────────────── Per-type row readers ─────────────────── */

export type AccountRow = {
  code: string;
  name: string;
  partyType: string;
  type: string;
  description: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  ntn: string;
  strn: string;
  creditLimit: number | null;
  creditDays: number | null;
  openDebit: number;
  openCredit: number;
};

/**
 * An account, a customer and a supplier are all Account rows — they differ
 * only in which partyType they are forced to, so one reader covers all three.
 */
export function readAccountRow(row: CsvRow, hint?: "customer" | "supplier"): {
  value: AccountRow;
  error?: string;
  warning?: string;
} {
  const name = field(row, "name").trim();
  const rawType = field(row, "type");
  const partyType = normalizePartyType(rawType, hint);

  // As in readOpeningBalanceRow: a headed Debit/Credit column has already said
  // which side it is, so a parenthesised amount there is Oracle's formatting,
  // not a sign flip. Only an unheaded single balance column uses the sign —
  // positive a debit, negative a credit, which is what all of them emit.
  const debit = Math.abs(parseAmount(field(row, "debit")));
  const credit = Math.abs(parseAmount(field(row, "credit")));
  const balanceRaw = field(row, "balance");
  let openDebit = debit;
  let openCredit = credit;
  if (!debit && !credit && balanceRaw) {
    const balance = parseAmount(balanceRaw);
    if (balance >= 0) openDebit = balance;
    else openCredit = Math.abs(balance);
  }

  const creditLimitRaw = field(row, "creditLimit");
  const creditDaysRaw = field(row, "creditDays");

  const value: AccountRow = {
    code: field(row, "code").trim(),
    name,
    partyType,
    type: typeForPartyType(partyType),
    description: field(row, "description"),
    phone: field(row, "phone"),
    email: field(row, "email"),
    city: field(row, "city"),
    address: field(row, "address"),
    ntn: field(row, "ntn"),
    strn: field(row, "strn"),
    creditLimit: creditLimitRaw ? parseAmount(creditLimitRaw) : null,
    creditDays: creditDaysRaw ? Math.round(parseAmount(creditDaysRaw)) : null,
    openDebit,
    openCredit,
  };

  if (!name) return { value, error: "No account name in this row" };
  if (!hint && rawType && partyType === "GENERAL") {
    return { value, warning: `Group "${rawType}" was not recognised — filed under General` };
  }
  return { value };
}

export type ItemRow = {
  code: string;
  name: string;
  unit: string;
  rate: number;
  purchaseRate: number;
  category: string;
  minStock: number;
  barcode: string;
};

const ITEM_CATEGORIES = new Set(["TRADING", "RAW_MATERIAL", "FINISHED", "SERVICE"]);

export function readItemRow(row: CsvRow): { value: ItemRow; error?: string; warning?: string } {
  const name = field(row, "name").trim();
  const rawCategory = pick(row, "category", "item category", "item type", "type").toUpperCase().replace(/[\s-]+/g, "_");
  const category = ITEM_CATEGORIES.has(rawCategory) ? rawCategory : "TRADING";

  const value: ItemRow = {
    code: field(row, "code").trim(),
    name,
    unit: field(row, "unit").trim() || "PCS",
    rate: parseAmount(field(row, "rate")),
    purchaseRate: parseAmount(field(row, "purchaseRate")),
    category,
    minStock: Math.max(0, Math.round(parseAmount(field(row, "minStock")))),
    barcode: field(row, "barcode").trim(),
  };

  if (!name) return { value, error: "No item name in this row" };
  return { value };
}

export type OpeningBalanceRow = {
  code: string;
  name: string;
  debit: number;
  credit: number;
};

export function readOpeningBalanceRow(row: CsvRow): {
  value: OpeningBalanceRow;
  error?: string;
  warning?: string;
} {
  const code = field(row, "code").trim();
  const name = field(row, "name").trim();

  // A column headed Debit or Credit has already declared its side, so the sign
  // is formatting rather than meaning. Oracle prints every amount on a trial
  // balance in parentheses when the report is defined that way, and reading
  // "(3,410,900)" in the CREDIT column as a debit flips the entry, doubles the
  // error and leaves a trial balance out by twice the amount.
  const debit = Math.abs(parseAmount(field(row, "debit")));
  const credit = Math.abs(parseAmount(field(row, "credit")));
  const balanceRaw = field(row, "balance");

  let finalDebit = debit;
  let finalCredit = credit;

  // A single unheaded balance column is the opposite case: there the sign is
  // the only thing saying which side the amount belongs on.
  if (!debit && !credit && balanceRaw) {
    const balance = parseAmount(balanceRaw);
    if (balance >= 0) finalDebit = balance;
    else finalCredit = Math.abs(balance);
  }

  const value: OpeningBalanceRow = { code, name, debit: finalDebit, credit: finalCredit };

  if (!code && !name) return { value, error: "Row has neither an account code nor a name" };
  if (finalDebit && finalCredit) {
    return { value, warning: "Row has both a debit and a credit — both were kept" };
  }
  return { value };
}

export type OpeningStockRow = {
  code: string;
  name: string;
  qty: number;
  rate: number;
  location: string;
};

export function readOpeningStockRow(row: CsvRow): {
  value: OpeningStockRow;
  error?: string;
  warning?: string;
} {
  const code = field(row, "code").trim();
  const name = field(row, "name").trim();
  const exactQty = parseAmount(field(row, "qty"));
  // InventoryTxn.qty is an Int. Rounding here rather than at the write means
  // the preview shows the number that will actually be stored.
  const qty = Math.round(exactQty);
  const rate = parseAmount(field(row, "purchaseRate")) || parseAmount(field(row, "rate"));

  const value: OpeningStockRow = {
    code,
    name,
    qty,
    rate,
    location: field(row, "location").trim().toUpperCase() || "MAIN",
  };

  if (!code && !name) return { value, error: "Row has neither an item code nor a name" };
  if (qty === 0) return { value, error: "Quantity is zero — nothing to bring in" };
  if (Math.abs(exactQty - qty) > 1e-9) {
    return { value, warning: `Quantity ${exactQty} rounded to ${qty} — stock is held in whole units` };
  }
  if (rate <= 0) return { value, warning: "No cost given — stock comes in at zero value" };
  return { value };
}

export type OpenDocumentRow = {
  docNo: string;
  party: string;
  date: Date | null;
  dueDate: Date | null;
  amount: number;
};

export function readOpenDocumentRow(row: CsvRow, kind: "invoice" | "bill"): {
  value: OpenDocumentRow;
  error?: string;
  warning?: string;
} {
  const docNo = field(row, "invoiceNo").trim();
  const party = field(row, "party").trim();
  const rawDate = field(row, "date");
  const date = parseImportDate(rawDate);
  const dueDate = parseImportDate(field(row, "dueDate"));
  const amount = parseAmount(field(row, "amount"));

  const value: OpenDocumentRow = { docNo, party, date, dueDate, amount };

  const label = kind === "invoice" ? "invoice" : "bill";
  if (!docNo) return { value, error: `No ${label} number in this row` };
  if (!party) return { value, error: `No ${kind === "invoice" ? "customer" : "supplier"} in this row` };
  if (amount === 0) return { value, error: "Outstanding amount is zero — this document is not open" };
  if (!date) {
    if (rawDate) return { value, error: `Could not read the date "${rawDate}"` };
    return { value, error: "No date in this row — ageing cannot be calculated without it" };
  }
  if (amount < 0) {
    return { value, warning: "Negative amount — this looks like a credit note" };
  }
  return { value };
}
