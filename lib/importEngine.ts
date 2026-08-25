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
  | "open_bills"
  | "ledger_history";

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
  {
    id: "ledger_history",
    name: "Party Ledger History",
    icon: "📜",
    desc: "Years of CRV / CPV / SV rows from a party's old ledger, posted as real vouchers",
    template: ["party", "code", "date", "voucherNo", "voucherType", "narration", "debit", "credit"],
    required: ["date"],
    order: 9,
    why: "Brings the old system's transactions into the ledger, so vouchers you write from today carry on from them.",
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
    "stock code", "account number", "acno",
    // AHC SOFT heads this column "A\C Code", with a backslash. normalizeHeader
    // strips spaces, dots, dashes and underscores but not slashes, so both
    // spellings have to be listed to be matched exactly. Without them the
    // containment pass falls through to the neighbouring "S. Code" serial
    // column, and every account is coded by its row number.
    "a/c code", "a\\c code", "ac code",
    "part no", "partno", "segment1", "sku", "code",
  ],
  name: [
    "name", "account name", "accountname", "ledger name", "gl account name",
    "account description", "description of account", "party name", "customer name",
    "supplier name", "vendor name", "contact name", "item name", "product name",
    "stock item", "particulars", "title", "description",
  ],
  // The inner of the two head levels. Subcontinental packages — AHC SOFT among
  // them — file an account under two: a Control Head of SUPPLIERS or BANK
  // ACCOUNTS, inside a Main/Head Title of SHORT TERM LIABILITIES or CURRENT
  // ASSETS. The inner one is read first because it is the one that says what
  // the account *is*: SUPPLIERS gives a supplier, where the outer head would
  // only have given a generic liability.
  type: [
    "control head", "sub head", "subhead",
    "account type", "accounttype", "type", "account category", "category",
    "group", "ledger group", "under", "class", "account class",
    "nature", "gl type",
  ],
  // The outer head, used only when the inner one says nothing useful — a
  // Control Head of EMPLOYEES means little on its own, but SHORT TERM
  // LIABILITIES above it settles it. See readAccountRow.
  typeGroup: [
    "main head title", "head title", "main head", "mainhead",
    "parent group", "main group", "primary group", "head",
  ],
  description: ["description", "notes", "remarks", "narration", "comments", "memo"],

  phone: ["phone", "telephone", "tel", "mobile", "cell", "contact no", "phone number", "contact number"],
  email: ["email", "e-mail", "email address", "mail"],
  city: ["city", "town", "location city"],
  address: ["address", "address1", "address line 1", "street", "billing address", "postal address"],
  // "ntn no" and "str no" carry the dotted forms: AHC SOFT heads these columns
  // "N.T.N. NO." and "S.T.R. NO.", which squash to "ntnno" and "strno" once the
  // dots go. Without these two the tax numbers imported blank and nobody would
  // notice until the first sales tax invoice went out without an NTN on it.
  ntn: ["ntn", "ntn no", "ntn number", "national tax number", "tax number", "tax id", "taxid", "tin"],
  strn: ["strn", "strn no", "str no", "str number", "sales tax number", "gst no", "gstin", "sales tax reg", "srtn"],
  // "credit amount" belongs here, not on the credit balance: on an account
  // master it is the ceiling the party may run up, printed next to the days
  // they get to clear it.
  creditLimit: ["credit limit", "creditlimit", "credit amount", "limit"],
  creditDays: ["credit days", "creditdays", "payment terms days", "terms days", "days"],

  unit: ["unit", "uom", "unit of measure", "primary unit", "base unit", "measure"],
  rate: ["rate", "sale rate", "selling price", "sales price", "unit price", "price", "list price", "mrp"],
  purchaseRate: ["purchase rate", "purchaserate", "cost", "cost price", "unit cost", "buying price", "purchase price", "std cost", "standard cost"],
  minStock: ["min stock", "minstock", "reorder level", "reorder point", "minimum qty", "safety stock"],
  barcode: ["barcode", "bar code", "ean", "upc"],

  // Closing before opening, deliberately.
  //
  // A period trial balance carries all three pairs — Opening Debit, Trans.
  // Debit, Closing Debit — and the one that becomes an opening balance in the
  // new system is the CLOSING balance in the old one on the cutover date. That
  // is the whole idea of a cutover: yesterday's closing is today's opening.
  //
  // Listed the other way round, a file with both columns silently imported the
  // position at the *start* of the old system's reporting period, which on a
  // three-year report is years of movement missing. It reconciles against
  // nothing and there is no error to notice — the numbers are simply wrong.
  // "debit amount" / "credit amount" sit last on purpose. On an account master
  // screen those headings mean the credit *limit*, not a balance — AHC SOFT
  // prints "Days" and "Credit Amount" side by side, which is a limit and its
  // terms. Ranked above "opendebit" they hijacked a chart-of-accounts file
  // whose real balance columns were "Open. Debit" / "Open. Credit". Left at the
  // bottom, a file that genuinely heads its balances "Debit Amount" still
  // resolves, through the whole-word containment pass on "debit".
  debit: [
    "closing debit", "closing dr", "closing balance debit",
    "debit", "dr", "debit balance",
    "opening debit", "opendebit", "open debit",
    "debit amount",
  ],
  credit: [
    "closing credit", "closing cr", "closing balance credit",
    "credit", "cr", "credit balance",
    "opening credit", "opencredit", "open credit",
    "credit amount",
  ],
  balance: [
    "closing balance", "closingbalance", "ending balance",
    "balance", "amount", "net balance",
    "opening balance", "openingbalance", "begin balance",
  ],

  // ── Ledger history ──
  //
  // Kept apart from invoiceNo/description on purpose. A party ledger prints a
  // voucher number and an invoice number in the same row — "V.No 181" against
  // "Bill # 26" — and the one that identifies the posting is the voucher. Read
  // through the invoiceNo list the two swap places on half the rows and the
  // same voucher imports twice under two numbers.
  voucherNo: [
    "voucher no", "voucherno", "voucher number", "voucher #", "vou no", "vouno",
    "v no", "vno", "v.no", "v. no", "tran no", "transaction no", "trn no",
    "entry no", "doc no", "document no", "slip no", "ref no",
  ],
  // CRV / CPV / SV / GPV / JV — the letters that say which side of the books
  // the other half of the entry came from. "type" sits last because a chart of
  // accounts uses the same heading for something else entirely; on a ledger
  // export there is no account type column, so the fallback is safe here.
  voucherType: [
    "voucher type", "vouchertype", "vou type", "v type", "v.type", "vtype",
    "tran type", "transaction type", "trans type", "doc type", "entry type",
    "voucher code", "vou code", "type", "tt",
  ],
  narration: [
    "narration", "particulars", "description", "details", "remarks",
    "reference", "ref", "cheque no", "chq no", "chq", "against", "notes", "memo",
  ],

  // Every stock report prints a value column beside the quantity, and plenty
  // of them print no unit rate at all — the rate is left to be divided out.
  // "amount" sits last: on an open-invoice file it means something else, but
  // this key is only read by the opening-stock reader.
  stockValue: [
    "stock value", "closing value", "closing amount", "total value", "cost value",
    "inventory value", "value", "amount",
  ],
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
  // RENT whole-word: it hides inside CURRENT, so "CURRENT ASSETS" — the head
  // every bank and cash account in a subcontinental chart sits under — was
  // being classified as an expense. WAGE and COST get the same treatment for
  // the same reason.
  if (has("EXPENSE", "PURCHASE", "SALAR", "UTILIT", "OVERHEAD", "COGS")
      || hasWord("RENT", "RENTAL", "COST", "WAGE", "WAGES")) return "EXPENSE";
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

  // Two chances at classifying the account, inner head then outer. A chart
  // that carries only one type column simply has nothing in the second.
  const rawType = field(row, "type");
  const rawGroup = field(row, "typeGroup");
  let partyType = normalizePartyType(rawType, hint);
  if (!hint && partyType === "GENERAL" && rawGroup) {
    partyType = normalizePartyType(rawGroup);
  }

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
  if (!hint && (rawType || rawGroup) && partyType === "GENERAL") {
    const tried = [rawType, rawGroup].filter(Boolean).join(" / ");
    return { value, warning: `Group "${tried}" was not recognised — filed under General` };
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
  if (!field(row, "unit").trim()) {
    // Silently filing a roll as PCS is the kind of thing nobody notices until
    // the first stock report, by which point every movement is in the wrong
    // unit and there is no clean way back.
    return { value, warning: "No unit in this row — filed as PCS" };
  }
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

/**
 * Classifies accounts from the group rows above them, when the file carries no
 * type column at all.
 *
 * A period trial balance is usually just Code, Description and amounts — there
 * is no "Account Type" to read, so every row resolves to GENERAL and lands in
 * the chart as an asset. Three hundred suppliers, every expense and all the
 * sales filed as assets is not a chart of accounts, it is a mess somebody has
 * to unpick by hand.
 *
 * But the classification is in the file, spelled out in the group rows:
 *
 *     03        SHORT TERM LIABILITIES     <- says what 0303* is
 *     0303        EMPLOYEES
 *     03030001      AKRAM (SALARY)         <- inherits: a liability
 *
 * So each unclassified account walks up its own code, nearest ancestor first,
 * and takes the first grouping that means something. Nearest-first matters:
 * under CURRENT ASSETS, a SUPPLIERS control head should still win and make the
 * row a supplier rather than a bare asset.
 *
 * Only fills in rows that resolved to GENERAL, so a file that does carry a type
 * column is left alone.
 */
export function inheritGroupsFromHierarchy(rows: MappedRow<AccountRow>[]): {
  classified: number;
} {
  const coded = rows.filter((r) => !r.error && r.value?.code);
  let classified = 0;

  const hasDescendants = (row: MappedRow<AccountRow>) =>
    coded.some(
      (other) =>
        other !== row &&
        other.value.code.length > row.value.code.length &&
        other.value.code.startsWith(row.value.code),
    );

  const set = (row: MappedRow<AccountRow>, partyType: string, why: string) => {
    row.value.partyType = partyType;
    row.value.type = typeForPartyType(partyType);
    // Replaces the "not recognised, filed under General" note, which is no
    // longer true and would only worry whoever is reading the preview.
    row.warning = why;
    classified += 1;
  };

  // Shortest code first, so a heading is settled before anything under it asks
  // what it is. Do it in file order instead and 03050003 inherits from 0305
  // while 0305 is still unclassified, and every supplier lands as a plain
  // liability.
  const ordered = [...coded].sort((a, b) => a.value.code.length - b.value.code.length);

  for (const row of ordered) {
    if (row.value.partyType !== "GENERAL") continue;
    const code = row.value.code;

    // A row with accounts filed under it is a heading, and a heading's name is
    // its category — SUPPLIERS, BANK ACCOUNTS, INCOME. Read it off the name.
    //
    // Restricted to headings on purpose. Classifying ordinary accounts by their
    // own name would file a customer called "Cash & Carry Traders" under Cash,
    // and a supplier called "United Bank Suppliers" under Banks. A heading
    // never has that problem, because a heading is only ever a category.
    if (hasDescendants(row)) {
      const own = normalizePartyType(row.value.name);
      if (own !== "GENERAL") {
        set(row, own, `Read as a heading: "${row.value.name}"`);
        continue;
      }
    }

    // Otherwise inherit, nearest ancestor first: under CURRENT ASSETS a
    // CUSTOMERS control head should still win and make this a customer rather
    // than a bare asset.
    const ancestors = coded
      .filter(
        (other) =>
          other !== row &&
          other.value.code.length < code.length &&
          code.startsWith(other.value.code),
      )
      .sort((a, b) => b.value.code.length - a.value.code.length);

    for (const ancestor of ancestors) {
      // Ancestors are already settled, so read the resolved value rather than
      // re-deriving it from the name.
      const inherited = ancestor.value.partyType !== "GENERAL"
        ? ancestor.value.partyType
        : normalizePartyType(ancestor.value.name);
      if (inherited === "GENERAL") continue;
      set(row, inherited, `Filed under "${ancestor.value.name}" (code ${ancestor.value.code})`);
      break;
    }
  }

  return { classified };
}

export type LedgerHistoryRow = {
  /** Party the row belongs to. Blank when the file is one party per file. */
  party: string;
  partyCode: string;
  date: Date | null;
  voucherNo: string;
  voucherType: string;
  narration: string;
  debit: number;
  credit: number;
  /**
   * The running balance printed after this posting, when the ledger has that
   * column. It is what lets a file with no B/F line still be imported safely:
   * the opening is the first row's balance less the first row's own posting.
   */
  balanceAfter: number | null;
  /** The B/F line at the top, which sets the account's opening rather than posting. */
  isOpening: boolean;
};

const OPENING_MARKERS = [
  "opening", "op bal", "opbal", "b/f", "bf", "b / f", "brought forward",
  "balance brought", "carried forward", "previous balance", "last year",
];

/** Voucher types that mean "this is where the account stood", not a posting. */
const OPENING_TYPES = new Set(["OP", "OB", "OPB", "BF", "B/F"]);

function looksLikeOpening(voucherType: string, ...fields: string[]): boolean {
  // AHC types its B/F line OP and narrates it "Opening Balance", so either one
  // alone would do. Both are checked because a ledger whose narration column
  // was left blank still has to be recognised — read as a posting, that line
  // would post the whole opening balance a second time.
  if (OPENING_TYPES.has(voucherType.trim().toUpperCase())) return true;
  const hay = [voucherType, ...fields].join(" ").toLowerCase();
  return OPENING_MARKERS.some((m) => hay.includes(m));
}

/**
 * One line of a party's ledger from the old system.
 *
 * A ledger prints one side of a double entry: the party's. The row says the
 * party was debited 800,000 on a CPV; it does not say which bank the cheque
 * left. The voucher type is what carries that — see writeLedgerHistory in
 * app/api/import/route.ts, which is where the second leg is decided. The
 * reader's job stops at getting the party's own side right.
 *
 * The B/F line at the top is flagged rather than read as a transaction. It is
 * not a posting, it is where the account stood before the file starts, and
 * posting it as a voucher would count the opening twice over.
 */
export function readLedgerHistoryRow(row: CsvRow, line = 0): {
  value: LedgerHistoryRow;
  error?: string;
  warning?: string;
} {
  const party = field(row, "party").trim();
  const partyCode = field(row, "code").trim();
  const voucherNo = field(row, "voucherNo").trim();
  const voucherType = field(row, "voucherType").trim().toUpperCase();
  const narration = field(row, "narration").trim();
  const rawDate = field(row, "date");
  const date = parseImportDate(rawDate);

  // Same reasoning as readOpeningBalanceRow: a column headed Debit has already
  // declared its side, so a bracketed or minus-signed amount under it is
  // formatting, not a credit.
  let debit = Math.abs(parseAmount(field(row, "debit")));
  let credit = Math.abs(parseAmount(field(row, "credit")));

  // The positional fallback is limited to the first row on purpose. A ledger
  // whose B/F line is labelled nothing at all is common; a *later* row with no
  // voucher number is common too — an adjustment somebody keyed by hand — and
  // reading that one as an opening would wipe the balance and replace it with
  // a single adjustment.
  const isOpening =
    looksLikeOpening(voucherType, narration, voucherNo) ||
    (line === 1 && !voucherNo && !voucherType && !!(debit || credit));

  const balanceRaw = field(row, "balance").trim();
  const balanceAfter = balanceRaw ? parseAmount(balanceRaw) : null;

  // Only the opening line may take its *amount* from the balance column. On a
  // transaction row that column is the balance after the posting, and reading
  // it as the amount would post the running total on every line.
  if (isOpening && !debit && !credit && balanceAfter !== null) {
    if (balanceAfter >= 0) debit = balanceAfter;
    else credit = Math.abs(balanceAfter);
  }

  const value: LedgerHistoryRow = {
    party, partyCode, date, voucherNo, voucherType, narration,
    debit, credit, balanceAfter, isOpening,
  };

  // An undated B/F line still carries the number that matters, and the party
  // master keeps its existing openDate. A transaction without a date cannot be
  // placed in the ledger at all.
  if (!date && !isOpening) {
    if (rawDate) return { value, error: `Could not read the date "${rawDate}"` };
    return { value, error: "No date in this row" };
  }
  if (!debit && !credit) {
    return { value, error: "Row has neither a debit nor a credit amount" };
  }
  if (debit && credit) {
    return { value, warning: "Row has both a debit and a credit — the larger side was posted" };
  }
  if (!isOpening && !voucherType) {
    return {
      value,
      warning: "No voucher type on this row — the other side of the entry goes to suspense",
    };
  }
  return { value };
}

/**
 * Marks the subtotal rows in a hierarchical trial balance so they are not
 * imported alongside the accounts they add up.
 *
 * A period trial balance out of a Forms-based system prints the tree, not the
 * leaves:
 *
 *     03        SHORT TERM LIABILITIES     18,709,249     <- group
 *     0303        EMPLOYEES                18,709,249     <- sub-group
 *     03030001      AKRAM (SALARY)             49,000     <- real account
 *     03030002      YASIR (SALARY)             51,000     <- real account
 *
 * Import all of it and every figure is counted three times. The trial balance
 * would at least come out visibly wrong, but only after somebody has written
 * five thousand rows into a live company.
 *
 * A code alone is not proof: in a flat scheme 100, 1001 and 1002 can all be
 * real accounts, and prefix-matching would throw away 100. So the test is
 * arithmetic — a row is a subtotal when its net equals the net of its direct
 * children. A genuine account whose code happens to be a prefix of another
 * will not add up, and is only warned about.
 *
 * The residual case is a flat chart where a parent-looking code's balance
 * coincidentally equals the children's — 100 at 50,000 above 1001 at 30,000
 * and 1002 at 20,000. That row is held back wrongly. It is an acceptable
 * trade: this runs in the dry run, so the row appears in the preview with the
 * reason and the operator decides, and the alternative failure — silently
 * importing every subtotal — doubles a live trial balance instead.
 */
export function flagSummaryRows(rows: MappedRow<OpeningBalanceRow>[]): {
  summaries: number;
} {
  const coded = rows.filter((r) => !r.error && r.value?.code);
  if (coded.length < 2) return { summaries: 0 };

  const net = (r: MappedRow<OpeningBalanceRow>) => r.value.debit - r.value.credit;
  let summaries = 0;

  for (const row of coded) {
    const code = row.value.code;
    const descendants = coded.filter(
      (other) => other !== row && other.value.code.length > code.length && other.value.code.startsWith(code),
    );
    if (descendants.length === 0) continue;

    // Direct children only. Summing every descendant would add the
    // intermediate groups to the leaves under them and double-count inside the
    // check itself — which is how the top-level "03" row came out at twice its
    // own figure and escaped as a real account.
    const children = descendants.filter(
      (d) => !descendants.some(
        (p) => p !== d && d.value.code.length > p.value.code.length && d.value.code.startsWith(p.value.code),
      ),
    );

    const childTotal = children.reduce((sum, c) => sum + net(c), 0);
    // Tolerance rather than equality: these totals are printed to the rupee
    // and re-parsed from text, so a few paisa of drift is not a difference.
    if (Math.abs(childTotal - net(row)) < 1) {
      row.error =
        `Looks like a group total for the ${children.length} account` +
        `${children.length === 1 ? "" : "s"} coded under ${code} — importing it too would ` +
        `count the same money twice. If it is a real account, give it a code that is not ` +
        `the start of another one.`;
      summaries += 1;
    } else if (!row.warning) {
      row.warning =
        `${children.length} account${children.length === 1 ? "" : "s"} sit under this code. ` +
        `Check this is a real account and not a heading.`;
    }
  }

  return { summaries };
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
  let rate = parseAmount(field(row, "purchaseRate")) || parseAmount(field(row, "rate"));

  // A stock report that gives quantity and value but no rate still knows what
  // the stock cost — it is one division away. Worth doing here rather than
  // leaving it: opening stock imported at zero cost silently sets the weighted
  // average to nothing, and every margin calculated afterwards is wrong by the
  // whole cost of goods.
  //
  // Divided by the exact quantity, not the rounded one, so the unit cost is the
  // report's own figure rather than one bent by the rounding.
  let rateFromValue = false;
  if (!rate && exactQty) {
    const stockValue = parseAmount(field(row, "stockValue"));
    if (stockValue) {
      rate = Math.abs(stockValue / exactQty);
      rateFromValue = true;
    }
  }

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
  if (rateFromValue) {
    return {
      value,
      warning: `No rate column — cost of ${rate.toFixed(2)} worked out from the value`,
    };
  }
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
