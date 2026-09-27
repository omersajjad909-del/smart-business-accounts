import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { openPartyBills } from "@/lib/ledgerKpis";

/**
 * Customer bills still unpaid past their credit days, oldest first.
 *
 * Bill-wise from the customer ledger accounts (openPartyBills): receipts
 * settle the oldest bills first, and each row is what is left of one bill.
 * This used to put the customer's *whole* outstanding on every overdue invoice
 * row — three overdue invoices meant the debt counted three times — and took
 * payments from receipts only, missing journals and opening balances.
 */
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const allowed = await apiHasPermission(
      req.headers.get("x-user-id"),
      req.headers.get("x-user-role"),
      PERMISSIONS.VIEW_FINANCIAL_REPORTS,
      companyId,
    );
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const today = new Date();
    const rows = (await openPartyBills(companyId, "RECEIVABLE", today))
      .map((b) => ({ ...b, daysOverdue: Math.floor((today.getTime() - b.dueDate.getTime()) / 86_400_000) }))
      .filter((b) => b.daysOverdue > 0)
      .map((b) => ({
        customerName: b.party,
        invoiceNo: b.ref === "---" ? "Opening balance" : b.ref,
        invoiceDate: b.date,
        dueDate: b.dueDate,
        amount: b.balance,
        daysOverdue: b.daysOverdue,
        status: b.daysOverdue > 180 ? "Bad Debt" : b.daysOverdue > 90 ? "Doubtful" : "Overdue",
      }));

    rows.sort((a, b) => b.daysOverdue - a.daysOverdue);
    return NextResponse.json({ rows: rows.slice(0, 100) });
  } catch (e: any) {
    console.error("BAD DEBTS ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
