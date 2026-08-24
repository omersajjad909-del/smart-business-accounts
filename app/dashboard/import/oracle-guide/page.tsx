"use client";
// FILE: app/dashboard/import/oracle-guide/page.tsx
//
// The migration plan, in the product rather than in a PDF somebody emails.
//
// It lives here because the question it answers — "we have ten years in Oracle,
// what happens to it?" — is asked before anyone signs, and the honest answer is
// long enough that it has to be written down: you do not import ten years of
// transactions into a new ledger. Nobody does, including Oracle when they move
// a customer from EBS to Fusion. You import the position on a cutover date and
// keep the old system read-only behind you.
//
// Two extraction paths are given because Pakistani mid-market "Oracle" is
// usually one of two very different things: a real EBS install, or a custom
// Oracle Forms application somebody wrote in 2011 on an Oracle database. The
// report route works for both and needs nobody's help; the SQL route is faster
// and needs a DBA. Recommending only the SQL route would strand every customer
// whose tables are their own.

import Link from "next/link";
import { useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";

const FONT = "'Outfit','Inter',sans-serif";
const MONO = "ui-monospace,'Cascadia Code','SF Mono',Consolas,monospace";

const card: React.CSSProperties = {
  background: "var(--panel-bg)",
  border: "1px solid var(--border)",
  borderRadius: 14,
};

/** Oracle EBS R12 sources for each import step. */
const EBS_QUERIES: { step: string; dataType: string; report: string; sql: string }[] = [
  {
    step: "1 · Chart of Accounts",
    dataType: "accounts",
    report: "General Ledger → Reports → Account Analysis, or the Chart of Accounts Listing",
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
    step: "2 · Customers",
    dataType: "customers",
    report: "Receivables → Reports → Customer Listing – Detail",
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
    step: "3 · Suppliers",
    dataType: "suppliers",
    report: "Payables → Reports → Supplier Listing",
    sql: `SELECT aps.segment1     AS code,
       aps.vendor_name  AS name,
       loc.city         AS city,
       loc.address_line1 AS address
FROM   ap_suppliers aps
       LEFT JOIN ap_supplier_sites_all sites ON sites.vendor_id = aps.vendor_id
       LEFT JOIN hz_locations loc ON loc.location_id = sites.location_id
WHERE  NVL(aps.enabled_flag,'Y') = 'Y';`,
  },
  {
    step: "4 · Items",
    dataType: "items",
    report: "Inventory → Reports → Item Definition / Item Listing",
    sql: `SELECT msi.segment1                AS code,
       msi.description             AS name,
       msi.primary_uom_code        AS unit,
       msi.list_price_per_unit     AS rate
FROM   mtl_system_items_b msi
WHERE  msi.organization_id = :ORG_ID
  AND  msi.enabled_flag = 'Y';`,
  },
  {
    step: "5 · Opening Balances",
    dataType: "opening_balances",
    report: "General Ledger → Reports → Trial Balance (Detail), as at your cutover date",
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
    step: "6 · Opening Stock",
    dataType: "opening_stock",
    report: "Inventory → Reports → Onhand Quantity, plus the Item Cost report for the rate",
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
    step: "7 · Open Sales Invoices",
    dataType: "open_invoices",
    report: "Receivables → Reports → Aging – 7 Buckets, as at your cutover date",
    sql: `SELECT rct.trx_number       AS "invoiceNo",
       hp.party_name        AS customer,
       aps.trx_date         AS date,
       aps.due_date         AS "dueDate",
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
    step: "8 · Open Purchase Bills",
    dataType: "open_bills",
    report: "Payables → Reports → Invoice Aging",
    sql: `SELECT ai.invoice_num       AS "billNo",
       aps.vendor_name      AS supplier,
       ai.invoice_date      AS date,
       apsch.due_date       AS "dueDate",
       apsch.amount_remaining AS amount
FROM   ap_invoices_all ai
       JOIN ap_suppliers aps          ON aps.vendor_id = ai.vendor_id
       JOIN ap_payment_schedules_all apsch
            ON apsch.invoice_id = ai.invoice_id
WHERE  apsch.payment_status_flag <> 'Y'
  AND  apsch.amount_remaining <> 0
  AND  ai.invoice_date <= :CUTOVER_DATE;`,
  },
];

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...card, padding: "20px 22px", marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 12 }}>
        <span style={{
          fontSize: 12, fontWeight: 800, color: "#818cf8",
          fontFamily: MONO, flexShrink: 0,
        }}>{n}</span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h2>
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75 }}>{children}</div>
    </div>
  );
}

export default function OracleGuidePage() {
  const { isMobile } = useResponsive();
  const [openSql, setOpenSql] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      /* Clipboard is blocked in some embedded browsers; the SQL is selectable. */
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--app-bg)", color: "var(--text-primary)",
      padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: FONT,
    }}>
      <style>{`@media print {
        .no-print { display: none !important; }
        body { background: #fff !important; color: #000 !important; }
      }`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <div style={{ maxWidth: 720 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", letterSpacing: -0.5 }}>
            Migration Guide
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.65 }}>
            How to move a business off Oracle — or QuickBooks, Tally, Sage, or a system written
            in-house — without losing anything and without stopping work.
          </p>
        </div>
        <div className="no-print" style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.print()} style={{
            padding: "9px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)",
            fontFamily: FONT,
          }}>🖨️ Print / PDF</button>
          <Link href="/dashboard/import" style={{
            padding: "9px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
            border: "1px solid var(--border)", color: "var(--text-muted)", textDecoration: "none",
          }}>← Import Center</Link>
        </div>
      </div>

      {/* ── The premise ── */}
      <div style={{
        ...card, borderColor: "rgba(99,102,241,.3)", background: "rgba(99,102,241,.08)",
        padding: "20px 22px", marginBottom: 18,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
          The question everyone asks first
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8 }}>
          <i>&ldquo;We have run Oracle for ten years. What happens to all that data?&rdquo;</i>
          <br /><br />
          It stays where it is, and you keep it. What moves into FinovaOS is your{" "}
          <b style={{ color: "var(--text-primary)" }}>position on a cutover date</b> — the trial
          balance, the parties, the items, the stock on hand, and the invoices still unpaid. That is
          how every accounting migration is done, including the ones Oracle runs when it moves a
          customer from E-Business Suite to Fusion.
          <br /><br />
          Old transactions are needed for three reasons, and each has its own answer:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10, marginTop: 14 }}>
          {[
            { q: "Audit / FBR", a: "Keep Oracle running read-only. The licence is already paid, and an auditor is entitled to the original system." },
            { q: "What a party owes", a: "Comes across in full — as the opening balance, and as the individual unpaid bills for ageing." },
            { q: "Multi-year trends", a: "Optional. Historical GL can be loaded as journals if you want it; scope and cost are quoted separately." },
          ].map((item) => (
            <div key={item.q} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--app-bg)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>{item.q}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Plan ── */}
      <Section n="01" title="Pick the cutover date">
        Use the first day of a financial year — in Pakistan, <b>1 July</b>. A mid-year cutover works
        but forces you to reconcile a part-year in two systems, and every report for that year has to
        be stitched together by hand. Set the same date in{" "}
        <Link href="/dashboard/financial-year" style={{ color: "#818cf8" }}>Financial Year</Link>{" "}
        so the reports agree with the balances.
      </Section>

      <Section n="02" title="Do not switch Oracle off">
        Run both systems in parallel for one to two months. Enter the same transactions in each and
        reconcile at the end of every month. This is the single thing that turns a migration from a
        leap into a decision — nobody is committed until they have watched the two systems agree.
        Once they do, Oracle goes read-only. It is never deleted.
      </Section>

      <Section n="03" title="Get the files out of the old system">
        Your data is not locked in. Oracle stores it in an Oracle <i>database</i>, which is the most
        exportable place it could be. Two ways out:
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <div style={{ padding: "14px 16px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--app-bg)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
              A · From the reports (no DBA needed)
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              Open the standard report, then <b>Actions → Download → CSV</b> (Fusion) or{" "}
              <b>File → Export</b> (EBS Forms). Works whatever your Oracle is, including a
              Forms application written in-house. Slower, but nobody has to touch the database.
            </div>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--app-bg)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
              B · Straight from the database
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              In SQL Developer or TOAD, run the query, then right-click the results grid →{" "}
              <b>Export → CSV, encoding UTF-8</b>. Eight queries, one afternoon. The SQL for
              Oracle EBS R12 is below.
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
          Oracle writes dates as <code style={{ fontFamily: MONO }}>15-JAN-2024</code> and negatives
          as <code style={{ fontFamily: MONO }}>(500)</code>. Both are read correctly — no
          reformatting needed.
        </div>
      </Section>

      {/* ── The eight files ── */}
      <div style={{ ...card, padding: "20px 22px", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#818cf8", fontFamily: MONO }}>04</span>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>The eight files, in order</h2>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16 }}>
          Import them top to bottom. Each one needs the ones above it — an opening balance cannot
          attach to an account that is not in the system yet.
          <br />
          <span style={{ fontSize: 12, opacity: 0.8 }}>
            SQL below is for Oracle EBS R12. If your Oracle is a custom Forms application, the
            table names are your own — ask whoever maintains it for the equivalent, or use path A.
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {EBS_QUERIES.map((q) => (
            <div key={q.step} style={{ border: "1px solid var(--border)", borderRadius: 11, overflow: "hidden" }}>
              <div style={{
                padding: "12px 15px", display: "flex", gap: 12,
                alignItems: "center", flexWrap: "wrap", background: "var(--app-bg)",
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{q.step}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.55 }}>
                    Report: {q.report}
                  </div>
                </div>
                <div className="no-print" style={{ display: "flex", gap: 7 }}>
                  <button onClick={() => setOpenSql(openSql === q.step ? null : q.step)} style={{
                    padding: "7px 13px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--text-muted)", fontFamily: FONT, whiteSpace: "nowrap",
                  }}>{openSql === q.step ? "Hide SQL" : "Show SQL"}</button>
                  <Link href={`/dashboard/import-wizard?dataType=${q.dataType}`} style={{
                    padding: "7px 13px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                    background: "#6366f1", color: "#fff", textDecoration: "none", whiteSpace: "nowrap",
                  }}>Import →</Link>
                </div>
              </div>
              {openSql === q.step && (
                <div style={{ borderTop: "1px solid var(--border)", position: "relative" }}>
                  <button
                    className="no-print"
                    onClick={() => copy(q.sql, q.step)}
                    style={{
                      position: "absolute", top: 9, right: 9, zIndex: 1,
                      padding: "5px 11px", borderRadius: 7, fontSize: 11, cursor: "pointer",
                      border: "1px solid var(--border)", background: "var(--panel-bg)",
                      color: copied === q.step ? "#22c55e" : "var(--text-muted)", fontFamily: FONT,
                    }}
                  >{copied === q.step ? "Copied" : "Copy"}</button>
                  <pre style={{
                    margin: 0, padding: "15px 16px", overflowX: "auto",
                    fontFamily: MONO, fontSize: 11.5, lineHeight: 1.65,
                    color: "var(--text-primary)", background: "transparent",
                  }}>{q.sql}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Section n="05" title="Preview every file before committing it">
        The wizard reads your file and shows you every row as it understood it — which column it took
        as the name, what it made of the amount, and which existing account each row matched. Nothing
        is written until you press Import. Do this on all eight files before you commit any of them.
      </Section>

      <Section n="06" title="Prove it, then stop using the old system">
        Three reports have to match Oracle exactly. If they do, the migration is finished:
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { r: "Trial Balance", href: "/dashboard/reports/trial-balance", m: "Every account, to the rupee, on the cutover date. If it is out, one account did not come across or came in on the wrong side." },
            { r: "Stock Report", href: "/dashboard/reports/stock", m: "Quantity and value against Oracle's on-hand report and against the physical count." },
            { r: "Receivables Ageing", href: "/dashboard/reports/ageing", m: "Party by party against Oracle's ageing. Bucket totals should line up too." },
          ].map((item) => (
            <div key={item.r} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span style={{ color: "#22c55e", fontWeight: 800, fontSize: 13 }}>✓</span>
              <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>
                <Link href={item.href} style={{ color: "#818cf8", fontWeight: 700 }}>{item.r}</Link>
                {" — "}{item.m}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Traps ── */}
      <div style={{ ...card, borderColor: "rgba(245,158,11,.3)", padding: "20px 22px", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b", fontFamily: MONO }}>07</span>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Five things that go wrong</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {[
            {
              t: "Counting receivables twice",
              d: "If your trial balance already carries the Accounts Receivable total, the open invoices you import must not be posted to the ledger again — and in FinovaOS they are not. Open invoices create the bills that ageing reads; they do not touch the ledger. The balance comes from the trial balance alone.",
            },
            {
              t: "Importing the same file twice",
              d: "Accounts, customers, suppliers and items are matched on code then name, so a second run updates rather than duplicates. Opening stock refuses an item that already has an opening row, and open invoices refuse a document number that already exists.",
            },
            {
              t: "Income and expense opening balances",
              d: "Do not import them. Profit-and-loss accounts start at zero in a new year — their history closed into retained earnings. Import balance sheet accounts only, plus the retained earnings figure.",
            },
            {
              t: "Fractional stock quantities",
              d: "Stock is held in whole units. If your Oracle on-hand shows 12.4 rolls, decide before importing whether the unit should be metres instead — the preview tells you what a quantity was rounded to.",
            },
            {
              t: "Excel silently reformatting",
              d: "Opening a CSV in Excel turns 0300-1234567 into a number and 15-JAN-2024 into a date in Excel's own format. If a file has to pass through Excel, import it with the Text Import Wizard and set every column to Text.",
            },
          ].map((item) => (
            <div key={item.t} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span style={{ color: "#f59e0b", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>!</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{item.t}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>{item.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
        <Link href="/dashboard/import" style={{
          padding: "12px 24px", borderRadius: 10, background: "#6366f1", color: "#fff",
          fontSize: 13.5, fontWeight: 700, textDecoration: "none",
        }}>Start the migration →</Link>
      </div>
    </div>
  );
}
