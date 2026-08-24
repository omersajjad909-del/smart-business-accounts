/**
 * GET /api/import/template?dataType=accounts
 *
 * The blank file for one import step — headings plus one example row, so
 * nobody has to guess what "type" wants or whether the date is day-first.
 *
 * Two of them come back pre-filled instead of blank. Opening balances and
 * opening stock have to match rows that already exist, and typing account
 * codes back in by hand is exactly where a migration picks up its first
 * mismatch. Downloading the list already filled in, with a zero to overwrite,
 * removes that step entirely.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { toCsv } from "@/lib/csvParse";
import { findDataType, type ImportDataType } from "@/lib/importEngine";

/** One illustrative row per type, in the shape the reader expects. */
const EXAMPLES: Record<ImportDataType, string[][]> = {
  accounts: [
    ["1001", "Cash in Hand", "Cash", "Main cash counter"],
    ["5010", "Electricity Expense", "Expense", ""],
    ["4001", "Sales Revenue", "Income", ""],
  ],
  customers: [
    ["CUS-0001", "M/s Ali Traders, Karachi", "0300-1234567", "ali@example.com", "Karachi", "Plot 4, S.I.T.E.", "1234567-8", "17-00-9999", "500000", "30"],
  ],
  suppliers: [
    ["SUP-0001", "Star Polymers (Pvt) Ltd", "021-34567890", "info@example.com", "Lahore", "12-KM Multan Road", "7654321-0", "17-00-1111"],
  ],
  items: [
    ["RM-0001", "PVC Roll 54in 10 gauge", "roll", "0", "5000", "RAW_MATERIAL", "5", ""],
    ["FG-0001", "Simple PVC Bag", "pcs", "20", "0", "FINISHED", "100", ""],
  ],
  opening_balances: [
    ["1001", "Cash in Hand", "150000", "0"],
    ["2001", "Accounts Payable", "0", "480000"],
  ],
  opening_stock: [
    ["RM-0001", "PVC Roll 54in 10 gauge", "12", "5000", "MAIN"],
  ],
  open_invoices: [
    ["SI-2024-0091", "M/s Ali Traders, Karachi", "15-JAN-2024", "14-FEB-2024", "125000"],
  ],
  open_bills: [
    ["PO-2024-0044", "Star Polymers (Pvt) Ltd", "20-JAN-2024", "19-FEB-2024", "310000"],
  ],
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requested = String(searchParams.get("dataType") || "accounts").toLowerCase();
    const def = findDataType(requested);
    if (!def) {
      return NextResponse.json({ error: `Unknown data type "${requested}"` }, { status: 400 });
    }

    const companyId = await resolveCompanyId(req);
    let rows: unknown[][] = EXAMPLES[def.id] ?? [];

    // Pre-filled variants. Fall back to the example rows when the company has
    // nothing yet, so the template is never an empty file with one heading.
    if (companyId && def.id === "opening_balances") {
      const accounts = await prisma.account.findMany({
        where: { companyId, deletedAt: null },
        select: { code: true, name: true, openDebit: true, openCredit: true },
        orderBy: [{ code: "asc" }, { name: "asc" }],
      });
      if (accounts.length) {
        rows = accounts.map((a) => [a.code, a.name, a.openDebit || 0, a.openCredit || 0]);
      }
    }

    if (companyId && def.id === "opening_stock") {
      const items = await prisma.itemNew.findMany({
        where: { companyId, deletedAt: null },
        select: { code: true, name: true, purchaseRate: true },
        orderBy: { name: "asc" },
      });
      if (items.length) {
        rows = items.map((i) => [i.code, i.name, 0, i.purchaseRate || 0, "MAIN"]);
      }
    }

    const csv = toCsv(def.template, rows as unknown[][]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=finovaos-${def.id.replace(/_/g, "-")}-template.csv`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not build the template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
