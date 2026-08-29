// FILE: lib/importGuides.ts
//
// The whole of "how do I get my data out of the system I am on now", written
// down per system and per file, in the product rather than in a PDF somebody
// has to be emailed.
//
// It is here because the honest answer to "can you import from our Oracle?" is
// not yes or no, it is a procedure — and the procedure is different for every
// system, different for each of the nine files, and the part that goes wrong is
// never the import. It is somebody exporting the Trial Balance when they needed
// the Aged Debtors, or exporting the right report with the wrong option ticked
// and not finding out until the receivables are double. Every one of those is
// cheap to prevent with a sentence in the right place and expensive to unpick
// afterwards.
//
// Two rules this content is written to:
//
//   * name the exact screen. "Export your customers" is not guidance; "Reports
//     → Customers & Receivables → Customer Contact List, then the Excel button"
//     is. Where a version genuinely differs, both are given.
//   * say what the file must contain, not just where it comes from. The most
//     common failed import in this product is a report exported with subtotals
//     and page headers still in it, which is a tick-box on the report screen.
//
// The importer reads columns by alias, not by position (lib/importEngine.ts), so
// none of this asks anybody to rename or reorder anything. It only has to be
// the right report, as a grid, with its heading row.

import type { ImportDataType, ImportSourceId } from "@/lib/importEngine";

/** One file, out of one system. */
export type Extraction = {
  dataType: ImportDataType;
  /** The exact menu path, screen or report. */
  where: string;
  /** Options that have to be set on that screen before exporting. */
  options?: string[];
  /** What goes wrong with this particular file, in this particular system. */
  notes?: string[];
  /** For systems that can be queried directly. */
  sql?: string;
};

export type SourceGuide = {
  id: ImportSourceId;
  /** Sits under the page title. */
  summary: string;
  /** Which releases this was written against. */
  versions: string;
  /** Done once, before any file is exported. */
  before: string[];
  /** The ways out of this system, in the order they should be considered. */
  routes: { title: string; who: string; steps: string[] }[];
  /** File by file, in import order. */
  extraction: Extraction[];
  /** How this system writes things, and why that is already handled. */
  quirks: { what: string; why: string }[];
  /** Symptom the operator will actually see, and what to do. */
  troubles: { symptom: string; fix: string }[];
};

/* ═══════════════════════════ Oracle ═══════════════════════════ */

const ORACLE: SourceGuide = {
  id: "oracle",
  summary:
    "Oracle E-Business Suite, Oracle Financials, Oracle Fusion, or an in-house Forms application " +
    "sitting on an Oracle database. All four export the same way in the end.",
  versions: "Written against EBS R12 and Fusion. The report route works on any of them, including a custom Forms app.",
  before: [
    "Decide the cutover date first — in Pakistan, 1 July. Every file below is 'as at' that date, and a set of files taken on different dates will not reconcile.",
    "Find out which of the two Oracles you have. If your screens are grey Forms windows, it is EBS or an in-house Forms app; if it is a browser with an Oracle logo, it is Fusion. It changes only the menu paths.",
    "Ask whoever runs the database whether you may read from it. The SQL route is one afternoon; the report route is two days and needs nobody's permission.",
    "Set the same cutover date in FinovaOS under Financial Year before importing opening balances.",
  ],
  routes: [
    {
      title: "A · From the standard reports",
      who: "Anyone with report access. No DBA, no database password, works on a custom Forms application too.",
      steps: [
        "Open the report named for the file you want, from the list below.",
        "Set the As-Of date to your cutover date.",
        "Turn OFF page headers, subtotals and group breaks if the report offers them — the importer wants a plain list.",
        "EBS Forms: File → Export. Fusion: Actions → Export → Download → CSV or Excel.",
        "Upload the file straight into the Import Wizard. An .xlsx is read directly; it does not need saving as CSV.",
      ],
    },
    {
      title: "B · Straight from the database",
      who: "A DBA, or anyone with a read-only login and SQL Developer / TOAD.",
      steps: [
        "Connect in SQL Developer or TOAD.",
        "Run the query given for each file below, substituting your ledger, org and cutover date for the bind variables.",
        "Right-click the results grid → Export → Format: CSV → Encoding: UTF-8.",
        "Eight queries, one afternoon, and no report options to get wrong.",
        "If your Oracle is a custom Forms application the table names are your own — the queries below are a shape to hand your developer, not something that will run unmodified.",
      ],
    },
  ],
  extraction: [
    {
      dataType: "accounts",
      where: "General Ledger → Reports → Chart of Accounts Listing (EBS). Fusion: Setup and Maintenance → Manage Chart of Accounts Value Sets.",
      options: [
        "Enabled accounts only — a disabled combination from 2013 is not worth bringing.",
        "No summary / parent rows if the report can suppress them.",
      ],
      notes: [
        "An EBS account is a segment combination — 01-000-1110-0000. What you want as the account code is the natural account segment, usually segment3, not the whole string. Exporting the whole combination gives you one account per cost centre, which is thousands of accounts that mean the same thing.",
        "If you can only run the standard report and it prints the whole combination, you do not have to edit the file: the wizard has a 'codes look like 01-000-1110-0000' option on the upload step. Set it to segment 3 (or whichever is your natural account) and the code is cut for you. The preview shows the codes after the cut.",
        "If you do want cost centres kept apart, leave the option off. They come in as separate accounts and the trial balance is still right, just longer.",
      ],
      sql: `SELECT gcc.segment3            AS code,
       ffvt.description       AS name,
       ffv.attribute1         AS type
FROM   gl_code_combinations gcc
       JOIN fnd_flex_values      ffv  ON ffv.flex_value = gcc.segment3
       JOIN fnd_flex_values_tl   ffvt ON ffvt.flex_value_id = ffv.flex_value_id
                                     AND ffvt.language = 'US'
WHERE  gcc.enabled_flag = 'Y'
ORDER  BY gcc.segment3;`,
    },
    {
      dataType: "customers",
      where: "Receivables → Reports → Customer Listing – Detail.",
      options: ["Active customers only.", "Include the primary address and phone — they are separate flags on the report."],
      notes: [
        "A customer with several sites prints once per site, so the same customer appears three times. That is harmless — the importer matches on code then name and updates rather than duplicating — but the address that lands is whichever site printed last.",
      ],
      sql: `SELECT hca.account_number      AS code,
       hp.party_name           AS name,
       hp.primary_phone_number AS phone,
       hp.email_address        AS email,
       loc.city                AS city,
       loc.address1            AS address
FROM   hz_cust_accounts hca
       JOIN hz_parties hp ON hp.party_id = hca.party_id
       LEFT JOIN hz_cust_acct_sites_all  sites ON sites.cust_account_id = hca.cust_account_id
       LEFT JOIN hz_party_sites          ps    ON ps.party_site_id = sites.party_site_id
       LEFT JOIN hz_locations            loc   ON loc.location_id = ps.location_id
WHERE  hca.status = 'A';`,
    },
    {
      dataType: "suppliers",
      where: "Payables → Reports → Supplier Listing.",
      options: ["Enabled suppliers only."],
      sql: `SELECT aps.segment1      AS code,
       aps.vendor_name   AS name,
       loc.city          AS city,
       loc.address_line1 AS address
FROM   ap_suppliers aps
       LEFT JOIN ap_supplier_sites_all sites ON sites.vendor_id = aps.vendor_id
       LEFT JOIN hz_locations loc ON loc.location_id = sites.location_id
WHERE  NVL(aps.enabled_flag,'Y') = 'Y';`,
    },
    {
      dataType: "items",
      where: "Inventory → Reports → Item Definition, or the Item Listing.",
      options: ["One organization at a time — pick the one whose stock you are moving."],
      notes: [
        "Oracle holds an item once per organization. Exporting every org gives you the same item several times with different costs; pick the org you are actually migrating.",
      ],
      sql: `SELECT msi.segment1            AS code,
       msi.description         AS name,
       msi.primary_uom_code    AS unit,
       msi.list_price_per_unit AS rate
FROM   mtl_system_items_b msi
WHERE  msi.organization_id = :ORG_ID
  AND  msi.enabled_flag = 'Y';`,
    },
    {
      dataType: "opening_balances",
      where: "General Ledger → Reports → Trial Balance (Detail), as at the cutover date.",
      options: [
        "Actual balances, not budget or encumbrance.",
        "Your primary ledger only.",
        "Detail, not summary — summary prints the parent rows and none of the accounts.",
      ],
      notes: [
        "Use the CLOSING balance on the cutover date. Yesterday's closing is today's opening; a report showing both opening and closing columns will have both read, and the importer prefers closing for exactly this reason.",
        "Do not import income and expense accounts. They start a new year at zero; their history has already closed into retained earnings, and importing them makes the first profit-and-loss report show last year's trading as this year's.",
        "The preview holds back rows that look like group subtotals and tells you which. Read that list — if a real account was held back, give it a code that is not the start of another account's code.",
      ],
      sql: `SELECT gcc.segment3                                   AS code,
       SUM(GREATEST(NVL(gb.begin_balance_dr,0)
                  - NVL(gb.begin_balance_cr,0), 0))        AS debit,
       SUM(GREATEST(NVL(gb.begin_balance_cr,0)
                  - NVL(gb.begin_balance_dr,0), 0))        AS credit
FROM   gl_balances gb
       JOIN gl_code_combinations gcc
            ON gcc.code_combination_id = gb.code_combination_id
WHERE  gb.period_name  = :CUTOVER_PERIOD      -- e.g. 'JUL-26'
  AND  gb.actual_flag  = 'A'
  AND  gb.ledger_id    = :LEDGER_ID
GROUP  BY gcc.segment3;`,
    },
    {
      dataType: "opening_stock",
      where: "Inventory → Reports → Onhand Quantity, plus the Item Cost report for the rate.",
      options: ["As at the cutover date.", "One organization."],
      notes: [
        "Reconcile this against the physical count before importing, not after. The cutover is the one moment when correcting the stock figure costs nothing.",
        "Stock is held in whole units. If on-hand shows 12.4 rolls, the unit should probably be metres — decide before importing, because the preview will tell you what it rounded to and by then the decision is already made.",
      ],
      sql: `SELECT msi.segment1                  AS code,
       msi.description               AS name,
       SUM(moq.transaction_quantity) AS qty,
       cic.item_cost                 AS rate,
       'MAIN'                        AS location
FROM   mtl_onhand_quantities_detail moq
       JOIN mtl_system_items_b msi
            ON msi.inventory_item_id = moq.inventory_item_id
           AND msi.organization_id   = moq.organization_id
       LEFT JOIN cst_item_costs cic
            ON cic.inventory_item_id = msi.inventory_item_id
           AND cic.organization_id   = msi.organization_id
           AND cic.cost_type_id      = 1
WHERE  moq.organization_id = :ORG_ID
GROUP  BY msi.segment1, msi.description, cic.item_cost;`,
    },
    {
      dataType: "open_invoices",
      where: "Receivables → Reports → Aging – 7 Buckets, as at the cutover date.",
      options: ["Detail, by invoice — not the summary that prints one line per customer.", "Open items only."],
      notes: [
        "This does not post to the ledger. The money is already in the trial balance under Accounts Receivable; these documents exist so ageing works from day one. Importing both is not double counting.",
        "If the ageing total does not equal the AR control account on the trial balance, that difference existed in Oracle too — find it before cutover, not after.",
      ],
      sql: `SELECT rct.trx_number           AS "invoiceNo",
       hp.party_name            AS customer,
       aps.trx_date             AS date,
       aps.due_date             AS "dueDate",
       aps.amount_due_remaining AS amount
FROM   ar_payment_schedules_all aps
       JOIN ra_customer_trx_all rct ON rct.customer_trx_id = aps.customer_trx_id
       JOIN hz_cust_accounts hca    ON hca.cust_account_id = aps.customer_id
       JOIN hz_parties hp           ON hp.party_id = hca.party_id
WHERE  aps.status = 'OP'
  AND  aps.amount_due_remaining <> 0
  AND  aps.trx_date <= :CUTOVER_DATE;`,
    },
    {
      dataType: "open_bills",
      where: "Payables → Reports → Invoice Aging.",
      options: ["Detail, by invoice.", "Unpaid and partly paid only."],
      sql: `SELECT ai.invoice_num         AS "billNo",
       aps.vendor_name        AS supplier,
       ai.invoice_date        AS date,
       apsch.due_date         AS "dueDate",
       apsch.amount_remaining AS amount
FROM   ap_invoices_all ai
       JOIN ap_suppliers aps ON aps.vendor_id = ai.vendor_id
       JOIN ap_payment_schedules_all apsch ON apsch.invoice_id = ai.invoice_id
WHERE  apsch.payment_status_flag <> 'Y'
  AND  apsch.amount_remaining <> 0
  AND  ai.invoice_date <= :CUTOVER_DATE;`,
    },
    {
      dataType: "ledger_history",
      where: "General Ledger → Reports → Account Analysis, one party at a time; or Receivables → Customer Account Statement.",
      options: ["Include the opening / brought-forward line.", "Include the running balance column if the report offers one."],
      notes: [
        "Optional, and the only step that is. Everything needed to trade from day one is already in the eight files above; this is for the customer who wants to open a party in FinovaOS and see 2019 in it.",
        "The file must start with the party's opening or B/F line, or carry a running-balance column. Without one of the two it is refused — not out of strictness, but because posting the transactions without knowing where the account started is how a balance ends up counted twice.",
        "A file covering many parties is fine and is cut on party boundaries automatically. A file covering one party does not need a party column — type the party name into the wizard instead.",
      ],
    },
  ],
  quirks: [
    { what: "Dates print as 15-JAN-2024", why: "Read correctly as-is. No reformatting, and specifically no round trip through Excel, which is what turns them into something else." },
    { what: "Negatives print as (500)", why: "Read as −500. Under a column already headed Credit, the brackets are treated as Oracle's formatting rather than a second sign flip." },
    { what: "Amounts carry thousand separators — 1,234.56", why: "Read correctly, including inside a quoted CSV field." },
    { what: "A report exported one line per printed page", why: "Recognised and unwrapped before anything else looks at the file. If it cannot be unwrapped you are told the file is not a grid, rather than being shown 359 accounts named after a column heading." },
  ],
  troubles: [
    {
      symptom: "The preview says the first line is not a row of headings.",
      fix: "The report was exported page-by-page rather than as a list. Go back to the report screen, turn off page headers and group breaks, and look for a 'listing' version of the same report. Open the file in Notepad first — the first line should read Code, Account Description, … and nothing else.",
    },
    {
      symptom: "Every account came in under the wrong category.",
      fix: "The export had no account type column, so categories were inherited from the heading rows above each account. If your chart is flat, add a type column to the export — or fix the categories in bulk afterwards in Chart of Accounts.",
    },
    {
      symptom: "The trial balance is out by exactly one account's balance.",
      fix: "That account was held back as a group subtotal. The preview named it and said why. Give it a code that is not the beginning of another account's code, and import that one row again.",
    },
    {
      symptom: "Thousands of accounts, most of them the same name.",
      fix: "You exported the full segment combination instead of the natural account segment. Re-export with segment3 (or whichever segment is your natural account) as the code.",
    },
  ],
};

/* ═══════════════════════════ QuickBooks ═══════════════════════════ */

const QUICKBOOKS: SourceGuide = {
  id: "quickbooks",
  summary: "QuickBooks Desktop (Pro, Premier, Enterprise) and QuickBooks Online. The reports differ in name but not in what they contain.",
  versions: "Desktop 2016 onwards, and current QuickBooks Online.",
  before: [
    "Decide the cutover date, and close the period in QuickBooks up to it so the figures stop moving while you migrate.",
    "In Desktop, run File → Utilities → Rebuild Data first if the file has never been rebuilt. A damaged file exports rows that do not add up, and you will spend the migration chasing a difference that was there before you started.",
    "Desktop exports through Excel. That is fine — upload the .xlsx straight to the wizard rather than saving it as CSV, which is the step that damages phone numbers and dates.",
  ],
  routes: [
    {
      title: "A · Desktop — the Excel button on any report",
      who: "Anyone who can open the company file.",
      steps: [
        "Open the report from the list below.",
        "Set the report date to your cutover date.",
        "Click Excel → Create New Worksheet → Export.",
        "Upload the .xlsx to the Import Wizard.",
      ],
    },
    {
      title: "B · Desktop — the list exporter",
      who: "For the master lists, which come out cleaner this way than as a report.",
      steps: [
        "File → Utilities → Export → Lists to IIF Files gives you an IIF, which is not what you want.",
        "Instead use File → Export → Items / Customers, or run the list report and use the Excel button.",
        "IIF files are not read by the importer — they are QuickBooks' own interchange format and they carry no headings.",
      ],
    },
    {
      title: "C · QuickBooks Online",
      who: "Anyone with reports access.",
      steps: [
        "Open the report, set the date, then the Export icon → Export to Excel.",
        "For lists, Sales → Customers → the export icon above the table.",
        "Upload the .xlsx straight to the wizard.",
      ],
    },
  ],
  extraction: [
    {
      dataType: "accounts",
      where: "Desktop: Reports → List → Account Listing. Online: Accounting → Chart of Accounts → the export icon.",
      options: ["Show the Account Type column — it is what files each account under the right head."],
      notes: ["QuickBooks account types (Bank, Accounts Receivable, Other Current Asset, Cost of Goods Sold …) are recognised and mapped."],
    },
    {
      dataType: "customers",
      where: "Desktop: Reports → Customers & Receivables → Customer Contact List. Online: Sales → Customers → export icon.",
      options: ["Add the columns you want kept: phone, email, bill-to address, terms."],
      notes: ["Customer:Job sub-customers export as 'Parent:Child'. They import as separate accounts under that full name, which keeps their balances apart."],
    },
    {
      dataType: "suppliers",
      where: "Desktop: Reports → Vendors & Payables → Vendor Contact List. Online: Expenses → Vendors → export icon.",
      notes: ["QuickBooks calls them vendors; the column headings VENDOR and VENDOR NAME are recognised as the supplier name."],
    },
    {
      dataType: "items",
      where: "Desktop: Reports → List → Item Listing. Online: Sales → Products and Services → export icon.",
      options: ["Include Description, Sales Price, Cost and Preferred Vendor."],
      notes: [
        "The Item Listing includes non-inventory items, services and subtotals. Delete the service and subtotal rows before importing unless you want them as stock items.",
      ],
    },
    {
      dataType: "opening_balances",
      where: "Desktop: Reports → Company & Financial → Trial Balance. Online: Reports → Trial Balance.",
      options: ["Report date = cutover date.", "Accrual basis, unless your books are genuinely kept on cash basis.", "Collapse turned OFF — collapsed rows print parents instead of accounts."],
      notes: ["Leave out income and expense rows; they belong to the closed year."],
    },
    {
      dataType: "opening_stock",
      where: "Desktop: Reports → Inventory → Inventory Valuation Summary. Online: Reports → Inventory Valuation Summary.",
      options: ["As of the cutover date."],
      notes: ["The Asset Value column divided by quantity is the rate. If the report gives you value but no unit cost, that is fine — the importer reads a value column and works the rate out."],
    },
    {
      dataType: "open_invoices",
      where: "Desktop: Reports → Customers & Receivables → A/R Aging Detail. Online: Reports → Accounts receivable ageing detail.",
      options: ["As of the cutover date.", "Detail, not summary."],
    },
    {
      dataType: "open_bills",
      where: "Desktop: Reports → Vendors & Payables → A/P Aging Detail. Online: Reports → Accounts payable ageing detail.",
      options: ["As of the cutover date.", "Detail, not summary."],
    },
    {
      dataType: "ledger_history",
      where: "Desktop: Reports → Customers & Receivables → Customer Balance Detail, or Reports → Accountant & Taxes → Transaction Detail by Account.",
      notes: ["Optional. Include the opening balance line, or a running balance column."],
    },
  ],
  quirks: [
    { what: "Reports export with a title block above the headings", why: "Two or three lines of report name and date before the real heading row. Delete them, or the first line of the file is the company name and the import is refused with an explanation." },
    { what: "Subtotal and 'Total' rows inside the report", why: "A row named 'Total Accounts Receivable' will be spotted as a subtotal on a trial balance. On other files, delete them before importing." },
    { what: "Negatives print as -500 or (500)", why: "Both are read." },
    { what: "Blank rows between groups", why: "Dropped automatically." },
  ],
  troubles: [
    {
      symptom: "The import is refused because the first line is not headings.",
      fix: "Delete the report title rows above the heading row in Excel, then upload again. The first line must be Account, Type, Balance … and nothing above it.",
    },
    {
      symptom: "An IIF file will not upload.",
      fix: "IIF is QuickBooks' own format and is not read. Run the equivalent report instead and use the Excel button.",
    },
    {
      symptom: "Sub-customers came in with colons in their names.",
      fix: "That is the parent:child path and it is deliberate — it keeps two customers of the same name under different parents apart. Rename them in Chart of Accounts if you would rather not have it.",
    },
  ],
};

/* ═══════════════════════════ Xero ═══════════════════════════ */

const XERO: SourceGuide = {
  id: "xero",
  summary: "Xero, which exports cleanly and needs less correction than anything else on this list.",
  versions: "Current Xero. The menus have been stable for years.",
  before: [
    "Decide the cutover date and lock the period in Xero (Advanced → Financial settings → Lock dates) so figures stop moving mid-migration.",
    "Xero exports CSV directly — no Excel step, and nothing to reformat.",
  ],
  routes: [
    {
      title: "A · The list exports",
      who: "Anyone with Standard access or above.",
      steps: [
        "Open the list screen from the table below.",
        "Use the Export button on that screen.",
        "Xero downloads a .csv with a proper heading row. Upload it as it is.",
      ],
    },
    {
      title: "B · The reports",
      who: "For balances and ageing, which are reports rather than lists.",
      steps: [
        "Accounting → Reports → open the report.",
        "Set the date to your cutover date.",
        "Export → CSV (not PDF).",
      ],
    },
  ],
  extraction: [
    {
      dataType: "accounts",
      where: "Accounting → Chart of Accounts → Export.",
      notes: ["Xero's Type column (Current Asset, Revenue, Direct Costs …) maps straight through."],
    },
    { dataType: "customers", where: "Contacts → All Contacts → filter to Customers → Export.", options: ["Export selected, or all — Xero exports every field either way."] },
    { dataType: "suppliers", where: "Contacts → All Contacts → filter to Suppliers → Export." },
    { dataType: "items", where: "Business → Products and Services → Export." },
    {
      dataType: "opening_balances",
      where: "Accounting → Reports → Trial Balance.",
      options: ["Date = cutover date.", "Export → CSV."],
      notes: ["Xero's trial balance prints YTD and closing columns; the closing balance is the one taken."],
    },
    {
      dataType: "opening_stock",
      where: "Business → Products and Services → Export, which carries quantity on hand and average cost for tracked items.",
      notes: ["Only tracked inventory items carry a quantity. Untracked items export with a blank quantity and are skipped, which is correct."],
    },
    { dataType: "open_invoices", where: "Accounting → Reports → Aged Receivables Detail.", options: ["As at the cutover date.", "Export → CSV."] },
    { dataType: "open_bills", where: "Accounting → Reports → Aged Payables Detail.", options: ["As at the cutover date.", "Export → CSV."] },
    { dataType: "ledger_history", where: "Accounting → Reports → Account Transactions, filtered to one contact.", notes: ["Optional. Include the opening balance row."] },
  ],
  quirks: [
    { what: "Dates export as ISO or as d MMM yyyy", why: "Both are read." },
    { what: "Contacts export carries dozens of columns", why: "Unrecognised columns are ignored, so there is nothing to trim." },
    { what: "Tracking categories appear as extra columns", why: "Ignored. FinovaOS has branches rather than tracking categories; if you need them kept, import per branch." },
  ],
  troubles: [
    {
      symptom: "Contacts imported but with no balances.",
      fix: "That is correct. The contact export carries no balance — balances come from the Trial Balance, and the individual unpaid invoices from Aged Receivables Detail.",
    },
    {
      symptom: "Aged Receivables exported as a PDF.",
      fix: "Use Export → CSV rather than the print or PDF button. A PDF cannot be read.",
    },
  ],
};

/* ═══════════════════════════ Sage ═══════════════════════════ */

const SAGE: SourceGuide = {
  id: "sage",
  summary: "Sage 50 (UK), Sage 200 and Sage Business Cloud. Sage 50 US is Peachtree — see its own guide.",
  versions: "Sage 50 v24 onwards and Sage 200 Professional.",
  before: [
    "Decide the cutover date and run Sage's own month-end up to it, so the nominal balances are settled.",
    "Take a Sage backup before exporting anything. Exporting is read-only, but a migration is a good moment to have one.",
  ],
  routes: [
    {
      title: "A · File → Import/Export",
      who: "Sage 50, for the master lists.",
      steps: [
        "File → Import/Export → Export (in some versions, File → Maintenance → Data Export).",
        "Pick the data type, then CSV as the output.",
        "Tick 'Include header row' when prompted — without it the first customer becomes the column names.",
      ],
    },
    {
      title: "B · The reports, exported to CSV",
      who: "For balances and ageing.",
      steps: [
        "Open the report from the list below.",
        "Set the date to the cutover date.",
        "Export → CSV, or Print → Export → Comma Separated.",
      ],
    },
  ],
  extraction: [
    {
      dataType: "accounts",
      where: "Nominal codes: Nominal Ledger → Reports → Nominal List. Or File → Import/Export → Nominal Records.",
      notes: ["Sage nominal codes are numeric ranges — 4000s income, 5000s cost of sales, 7000s overheads. The importer reads the category column if the export has one; otherwise it inherits from the heading rows."],
    },
    { dataType: "customers", where: "Customers → Reports → Customer List (Detailed), or File → Import/Export → Customer Records." },
    { dataType: "suppliers", where: "Suppliers → Reports → Supplier List (Detailed), or File → Import/Export → Supplier Records." },
    { dataType: "items", where: "Products → Reports → Product List, or File → Import/Export → Stock Records." },
    {
      dataType: "opening_balances",
      where: "Nominal Ledger → Reports → Trial Balance.",
      options: ["Period = the period ending on your cutover date.", "Export → CSV."],
      notes: ["Sage's trial balance prints a period and a year-to-date pair. The year-to-date closing figures are the ones you want."],
    },
    { dataType: "opening_stock", where: "Products → Reports → Stock Valuation (Detailed).", options: ["As at the cutover date."] },
    { dataType: "open_invoices", where: "Customers → Reports → Aged Debtors Analysis (Detailed).", options: ["Detailed, not summary.", "As at the cutover date."] },
    { dataType: "open_bills", where: "Suppliers → Reports → Aged Creditors Analysis (Detailed).", options: ["Detailed, not summary."] },
    { dataType: "ledger_history", where: "Customers → Activity, or Nominal Ledger → Reports → Nominal Activity for one account.", notes: ["Optional. Include the brought-forward line."] },
  ],
  quirks: [
    { what: "Semicolon delimiters on a European regional setting", why: "Detected automatically, as are tabs and pipes." },
    { what: "The header row is optional in Sage's exporter", why: "It is not optional here. Tick it — the importer reads columns by name, and without names the first row of data becomes the headings." },
    { what: "Sage 50 writes dates as dd/mm/yyyy", why: "Read as day-first, which is what it means." },
  ],
  troubles: [
    {
      symptom: "Every row failed with 'no name'.",
      fix: "The export went out without its header row. Re-export with 'Include header row' ticked.",
    },
    {
      symptom: "The columns are all in one cell.",
      fix: "The file is semicolon-delimited and something re-saved it. Upload the original file Sage produced rather than one that has been through Excel.",
    },
  ],
};

/* ═══════════════════════════ Tally ═══════════════════════════ */

const TALLY: SourceGuide = {
  id: "tally",
  summary: "Tally ERP 9 and TallyPrime — the most common system this product replaces in Pakistan and India.",
  versions: "Tally ERP 9 release 6 onwards, and TallyPrime 2.x / 3.x.",
  before: [
    "Decide the cutover date and set the period in Tally to match before exporting anything, or every report comes out for Tally's current period instead of yours.",
    "In TallyPrime, export format is chosen at export time — pick Excel or CSV, never PDF.",
    "Tally's exports are wide and repetitive. That is fine; unrecognised columns are ignored.",
  ],
  routes: [
    {
      title: "A · Alt+E from any display screen",
      who: "Anyone at the Gateway.",
      steps: [
        "Open the report or list from the table below.",
        "Press Alt+E (ERP 9: Export; TallyPrime: Export → Current).",
        "Format: Excel (Spreadsheet) or CSV. Not PDF, not ASCII.",
        "Set the period to end on your cutover date.",
        "Upload the file to the Import Wizard — an .xlsx is read directly.",
      ],
    },
    {
      title: "B · Detailed mode first",
      who: "Anyone exporting a balance or ageing report.",
      steps: [
        "Press Alt+F1 (ERP 9) or F5 (TallyPrime) to switch the report to Detailed before exporting.",
        "In condensed mode Tally prints group totals and hides the ledgers under them, which is a file of subtotals and no accounts.",
      ],
    },
  ],
  extraction: [
    {
      dataType: "accounts",
      where: "Gateway of Tally → Display (More Reports) → List of Accounts → Ledgers.",
      options: ["Detailed mode (Alt+F1 / F5) so ledgers print, not just groups."],
      notes: ["Tally's group names — Sundry Debtors, Sundry Creditors, Bank Accounts, Indirect Expenses — are recognised and mapped to the right category."],
    },
    {
      dataType: "customers",
      where: "Display → Statements of Accounts → Outstandings → Receivables, or List of Accounts filtered to Sundry Debtors.",
      notes: ["Tally has no separate customer master — a customer is a ledger under Sundry Debtors. Export that group."],
    },
    { dataType: "suppliers", where: "List of Accounts filtered to Sundry Creditors, or Display → Outstandings → Payables." },
    { dataType: "items", where: "Gateway → Display → Inventory Books → Stock Items, or Stock Summary in Detailed mode." },
    {
      dataType: "opening_balances",
      where: "Gateway → Display → Trial Balance.",
      options: ["Alt+F1 / F5 for Detailed — this is the one that matters most here.", "Period ending on the cutover date.", "F12 → show closing balances."],
      notes: [
        "Tally writes balances as '5,00,000 Dr' and '2,50,000 Cr'. The Dr / Cr suffix is read as the side, and the Indian digit grouping is read correctly.",
        "Leave out the income and expense ledgers — Tally's trial balance includes them and they belong to the closed year.",
      ],
    },
    {
      dataType: "opening_stock",
      where: "Gateway → Display → Stock Summary, in Detailed mode.",
      options: ["Period ending on the cutover date.", "F12 → show quantities, rates and values."],
    },
    {
      dataType: "open_invoices",
      where: "Display → Statements of Accounts → Outstandings → Receivables.",
      options: ["Detailed, so each bill prints rather than one line per party.", "F6 → Age-wise if you want the ageing columns; they are not needed."],
      notes: ["Tally's bill-wise details are exactly what this file wants — one row per unpaid bill, with its date and amount."],
    },
    { dataType: "open_bills", where: "Display → Statements of Accounts → Outstandings → Payables.", options: ["Detailed."] },
    {
      dataType: "ledger_history",
      where: "Display → Account Books → Ledger → pick the party → set the period → Alt+E.",
      notes: [
        "Optional. Tally's ledger prints the opening balance as its first line, which is exactly what this file needs.",
        "One party per file is fine — type the party name into the wizard. A multi-party export works too.",
      ],
    },
  ],
  quirks: [
    { what: "'5,00,000 Dr' — Indian grouping with a side suffix", why: "Both read. Dr becomes a debit, Cr a credit, and the lakh grouping is parsed correctly." },
    { what: "Condensed mode hides the detail", why: "Always press Alt+F1 / F5 first. A condensed export is a file of group totals with nothing underneath, and the importer will hold every one of them back as a subtotal — correctly, but you will have imported nothing." },
    { what: "Tally exports .xls that is really HTML", why: "Older Tally releases write an .xls that is an HTML table. If the wizard cannot read it, re-export choosing CSV instead." },
    { what: "The export has a title block above the headings", why: "Delete the company name and report title rows so the heading row is first." },
  ],
  troubles: [
    {
      symptom: "Every row was held back as a group total.",
      fix: "The report was exported in condensed mode. Press Alt+F1 (ERP 9) or F5 (TallyPrime) to switch to Detailed and export again.",
    },
    {
      symptom: "Balances all came in on the wrong side.",
      fix: "The Dr / Cr column did not export. Re-export with F12 → 'Show Dr/Cr' turned on, or use a report that prints separate Debit and Credit columns.",
    },
    {
      symptom: "The .xls file will not open.",
      fix: "Older Tally writes HTML with an .xls name. Export again and choose CSV.",
    },
  ],
};

/* ═══════════════════════════ Peachtree ═══════════════════════════ */

const PEACHTREE: SourceGuide = {
  id: "peachtree",
  summary: "Peachtree Accounting and its current name, Sage 50 US.",
  versions: "Peachtree 2010 onwards, Sage 50 US 2015 onwards.",
  before: [
    "Decide the cutover date and close the period in Peachtree so figures stop moving.",
    "Peachtree's exporter lets you choose which fields go out. Take more rather than fewer — unrecognised columns are ignored.",
  ],
  routes: [
    {
      title: "A · File → Select Import/Export",
      who: "The main route, and the one that produces clean files.",
      steps: [
        "File → Select Import/Export.",
        "Pick the module (General Ledger, Accounts Receivable, Accounts Payable, Inventory) then the list.",
        "Click Export, then the Fields tab, and include every field you want.",
        "On the Options tab, tick 'Include Headings'. Keep the comma separator.",
        "Export, then upload the .csv.",
      ],
    },
    {
      title: "B · Reports → Excel",
      who: "For balances and ageing, which are reports rather than lists.",
      steps: [
        "Reports & Forms → open the report → set the date → Excel button.",
        "Delete the title rows above the heading row before uploading.",
      ],
    },
  ],
  extraction: [
    { dataType: "accounts", where: "File → Select Import/Export → General Ledger → Chart of Accounts List.", options: ["Include Account ID, Description and Account Type."] },
    { dataType: "customers", where: "File → Select Import/Export → Accounts Receivable → Customer List.", options: ["Include Customer ID, Name, Bill-to address, Telephone, E-mail, Terms."] },
    { dataType: "suppliers", where: "File → Select Import/Export → Accounts Payable → Vendor List." },
    { dataType: "items", where: "File → Select Import/Export → Inventory → Inventory Item List.", options: ["Include Item ID, Description, Unit, Sales Price, Last Cost."] },
    {
      dataType: "opening_balances",
      where: "Reports & Forms → General Ledger → General Ledger Trial Balance.",
      options: ["As of the cutover date.", "Excel button, then delete the title rows."],
    },
    { dataType: "opening_stock", where: "Reports & Forms → Inventory → Inventory Valuation Report.", options: ["As of the cutover date."] },
    { dataType: "open_invoices", where: "Reports & Forms → Accounts Receivable → Aged Receivables.", options: ["Detail, not summary.", "As of the cutover date."] },
    { dataType: "open_bills", where: "Reports & Forms → Accounts Payable → Aged Payables.", options: ["Detail, not summary."] },
    { dataType: "ledger_history", where: "Reports & Forms → Accounts Receivable → Customer Ledgers, for one customer.", notes: ["Optional. Include the beginning balance line."] },
  ],
  quirks: [
    { what: "'Include Headings' is off by default", why: "Tick it. Without it the first customer becomes the column names and every row fails." },
    { what: "Reports carry three title rows above the headings", why: "Delete them so the heading row is the first line of the file." },
    { what: "Account IDs may contain dashes and letters", why: "Read as-is; codes are text, not numbers." },
  ],
  troubles: [
    {
      symptom: "The first row of data is missing and the column names look like a customer.",
      fix: "'Include Headings' was not ticked. Export again with it on.",
    },
    {
      symptom: "The file is refused as not being a grid.",
      fix: "Delete the report title rows above the heading row.",
    },
  ],
};

/* ═══════════════════════════ Anything else ═══════════════════════════ */

const GENERIC: SourceGuide = {
  id: "csv",
  summary:
    "Any other system — a spreadsheet somebody has kept for fifteen years, a FoxPro or Access application, " +
    "a bespoke program nobody has the source for, or a printout that has to be typed.",
  versions: "Anything that can produce a CSV, an .xlsx, or a screen you can copy from.",
  before: [
    "Download the template for the file you are importing. It is the shortest route: the headings are already right.",
    "If the old system can print a report but not export one, check whether it can 'print to file' — most can, and a text print is usually a grid with spaces instead of commas, which Excel will split for you.",
    "If nothing can be exported, type the trial balance and the party list. Those two are the migration; everything else can be added as you trade.",
  ],
  routes: [
    {
      title: "A · Use the template",
      who: "Everyone, unless the old system exports something already close.",
      steps: [
        "Download the template from the Import Wizard for the file you are on.",
        "Paste your data under the headings. Keep the heading row.",
        "Save as CSV UTF-8, or leave it as .xlsx — both are read.",
      ],
    },
    {
      title: "B · Use whatever the old system produces",
      who: "When there is an export, however untidy.",
      steps: [
        "Export it, in any delimiter — comma, semicolon, tab or pipe are all detected.",
        "Do not rename the columns. Headings are matched by alias, so ACCOUNT_NAME, Account Name and Ledger Name all resolve.",
        "Upload it and read the preview. It will tell you which column it took as what.",
      ],
    },
    {
      title: "C · Copy off the screen",
      who: "For a small chart of accounts or party list with no export at all.",
      steps: [
        "Select the grid in the old system and copy.",
        "Paste into the wizard's text box directly — it takes tab-separated text, which is what a copied grid is.",
        "Add a heading row above it if the paste did not bring one.",
      ],
    },
  ],
  extraction: [
    { dataType: "accounts", where: "Whatever the old system calls its chart of accounts, ledger list, or account master.", notes: ["Only the name is required. A code makes later files match more reliably, so include it if there is one."] },
    { dataType: "customers", where: "The customer, debtor or party master.", notes: ["Only the name is required."] },
    { dataType: "suppliers", where: "The supplier, creditor or vendor master." },
    { dataType: "items", where: "The item, product or stock master.", notes: ["Give every item a unique code, or none at all. Two items sharing a code are refused, because importing them would silently merge two products into one."] },
    { dataType: "opening_balances", where: "The trial balance as at your cutover date.", notes: ["Either a Debit and a Credit column, or one signed Balance column — both are read."] },
    { dataType: "opening_stock", where: "The stock valuation or on-hand report as at the cutover date." },
    { dataType: "open_invoices", where: "The list of unpaid sales invoices — the receivables ageing, in detail." },
    { dataType: "open_bills", where: "The list of unpaid purchase bills." },
    { dataType: "ledger_history", where: "A party's ledger printout, with its opening line.", notes: ["Optional."] },
  ],
  quirks: [
    { what: "Any delimiter", why: "Comma, semicolon, tab and pipe are detected from the heading row." },
    { what: "Quoted fields, embedded newlines, doubled quotes", why: "All read properly. An address field containing a line break is one row, not two." },
    { what: "Excel's UTF-8 marker at the start of the file", why: "Stripped, so the first column name still matches." },
    { what: "A file too big for one upload", why: "Split automatically and sent in parts, with a progress bar. Nothing to do." },
  ],
  troubles: [
    {
      symptom: "A column was not picked up.",
      fix: "Rename that column in Excel to the plain word — code, name, debit, credit, qty, rate — and upload again. The full list of accepted spellings is on the Column Reference page.",
    },
    {
      symptom: "Numbers came in as zero.",
      fix: "The column is probably text with a currency symbol or a stray space. 'Rs 500', '500 Cr', '(500)' and '1,234.56' are all read; anything else should be made a plain number.",
    },
    {
      symptom: "Dates came in wrong by a month.",
      fix: "A date like 03/04/2024 is genuinely ambiguous. Change the column to a plain 2024-04-03 style in the source, which cannot be misread.",
    },
  ],
};

export const SOURCE_GUIDES: SourceGuide[] = [
  ORACLE, QUICKBOOKS, XERO, SAGE, TALLY, PEACHTREE, GENERIC,
];

export function findSourceGuide(id: string): SourceGuide | null {
  return SOURCE_GUIDES.find((g) => g.id === id) ?? null;
}

/* ═══════════════════ What each column means ═══════════════════ */

/**
 * A plain-language line per field, for the Column Reference page.
 *
 * The accepted spellings are not repeated here — they are read straight off
 * FIELD_ALIASES, so the page cannot drift from what the importer actually does.
 * What is here is the part the alias list cannot say: what the value is for, and
 * what happens when it is left out.
 */
export const FIELD_NOTES: Record<string, string> = {
  code: "The account or item code from the old system. Optional, but it is what makes later files match reliably — an opening balance finds its account by code first and by name second.",
  name: "What the account or item is called. Required on every master file; a row without one is skipped.",
  type: "The category — customer, supplier, bank, cash, expense, income, equity. If the file has no type column, categories are inherited from the heading rows above each account.",
  typeGroup: "An outer grouping, where the export carries two levels of category. Read as the type when the inner one says nothing.",
  description: "Free text kept against the account. Never interpreted.",
  phone: "Kept as text, so a leading zero survives. This is the field Excel damages when a CSV is re-saved.",
  email: "Kept as text.",
  city: "Used for filtering and on printed documents.",
  address: "Kept as text, including when it contains a line break.",
  ntn: "National Tax Number. Needed on a sales tax invoice, so a blank one is worth fixing before the first invoice goes out.",
  strn: "Sales Tax Registration Number.",
  creditLimit: "The ceiling a customer may run up. On an account master, a column headed 'Credit Amount' means this, not a credit balance.",
  creditDays: "Days the customer gets to clear a bill.",
  unit: "Unit of measure — pcs, kg, m, roll. Defaults sensibly when absent.",
  rate: "Selling price per unit.",
  purchaseRate: "Cost price per unit.",
  minStock: "Reorder level, used by low-stock alerts.",
  barcode: "Scanned at the counter. Read as text so leading zeros survive.",
  category: "Item grouping.",
  qty: "Quantity on hand at cutover. Held in whole units — check the preview for what a fractional quantity was rounded to.",
  stockValue: "Total value of the stock line. Used to work out the rate when the report gives value but no unit cost.",
  location: "Warehouse, godown or subinventory.",
  debit: "Debit balance. Where a report carries opening, movement and closing columns, the CLOSING figure is taken — yesterday's closing is today's opening.",
  credit: "Credit balance, read the same way.",
  balance: "A single signed balance column, for reports that do not split debit from credit. Positive is a debit, negative a credit.",
  invoiceNo: "The document number. Required on open invoices and bills — it is what stops the same bill importing twice.",
  party: "The customer or supplier the document belongs to. Matched against accounts already imported, by code then name.",
  date: "Document date. 15-JAN-2024, 15/01/2024 and 2024-01-15 are all read.",
  dueDate: "When the document falls due. Drives the ageing buckets. Defaults to the document date when absent.",
  amount: "The amount still outstanding — not the original invoice total, unless nothing has been paid against it.",
  voucherNo: "The voucher number on a ledger row. Kept apart from the invoice number on purpose: a ledger prints both, and the voucher is the one that identifies the posting.",
  voucherType: "CRV, CPV, SV, GPV, JV — the letters that say where the other half of the entry came from. Without one, the other side goes to suspense.",
  currency: "The currency the document was raised in — USD, EUR, AED. Leave it out when the file is already in your own currency, which is the usual case. A row that names a currency must carry a rate beside it, or it is refused rather than posted at par.",
  fxRate: "What one unit of that currency was worth in your own, on the document's date — 280 for a USD document in a PKR company. The amount is converted at this rate before it reaches the ledger, so receivables ageing still adds up to the receivables account on the trial balance. The original figure is kept in the document's notes.",
  narration: "Particulars, description or remarks against a ledger row.",
  gauge: "PVC roll gauge. One of the five dimensions the rate formula prices a line from.",
  dimWidth: "Roll width.",
  dimLength: "Roll length.",
  shade: "Shade or colour number.",
  phr: "Parts per hundred resin.",
};
