/**
 * GET /api/import/status
 *
 * How far the migration has actually got, counted from the data rather than
 * from a checklist somebody ticks.
 *
 * A migration runs over days and usually over two people — whoever exports
 * from the old system and whoever loads it here. "Customers: 0" on the screen
 * is the only reliable way for either of them to know that the file they
 * thought went in did not.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const live = { companyId, deletedAt: null };

    const [
      accounts,
      customers,
      suppliers,
      items,
      withBalances,
      openingStock,
      openInvoices,
      openBills,
      balanceTotals,
      earliestOpenDate,
    ] = await Promise.all([
      prisma.account.count({ where: live }),
      prisma.account.count({ where: { ...live, partyType: "CUSTOMER" } }),
      prisma.account.count({ where: { ...live, partyType: "SUPPLIER" } }),
      prisma.itemNew.count({ where: live }),
      prisma.account.count({
        where: { ...live, OR: [{ openDebit: { not: 0 } }, { openCredit: { not: 0 } }] },
      }),
      prisma.inventoryTxn.count({ where: { companyId, type: "OPENING" } }),
      prisma.salesInvoice.count({ where: live }),
      prisma.purchaseInvoice.count({ where: live }),
      prisma.account.aggregate({
        where: live,
        _sum: { openDebit: true, openCredit: true },
      }),
      prisma.account.findFirst({
        where: { ...live, openDate: { not: null } },
        select: { openDate: true },
        orderBy: { openDate: "asc" },
      }),
    ]);

    const totalDebit = Math.round((balanceTotals._sum.openDebit || 0) * 100) / 100;
    const totalCredit = Math.round((balanceTotals._sum.openCredit || 0) * 100) / 100;

    return NextResponse.json({
      counts: {
        accounts,
        customers,
        suppliers,
        items,
        opening_balances: withBalances,
        opening_stock: openingStock,
        open_invoices: openInvoices,
        open_bills: openBills,
      },
      // The one number that decides whether a migration is finished: an
      // unbalanced opening trial balance means something did not come across,
      // and it is far cheaper to see that here than in the balance sheet.
      trialBalance: {
        debit: totalDebit,
        credit: totalCredit,
        difference: Math.round((totalDebit - totalCredit) * 100) / 100,
        balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      },
      cutoverDate: earliestOpenDate?.openDate ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not read migration status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
