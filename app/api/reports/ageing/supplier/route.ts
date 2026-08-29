import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { BILL_EPS, billDays, collectPartyBills, settleBills } from "@/lib/billAgeing";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const supplierId = req.nextUrl.searchParams.get("supplierId");
    const asOnParam  = req.nextUrl.searchParams.get("date");
    if (!supplierId) return NextResponse.json([]);

    const supplier = await prisma.account.findFirst({
      where: { id: supplierId, companyId },
      select: { id: true, openDebit: true, openCredit: true, openDate: true },
    });
    if (!supplier) return NextResponse.json([]);

    const asOn = asOnParam ? new Date(asOnParam + "T23:59:59.999") : new Date();

    // Same rule as the customer side: every posting on the party account is a
    // bill or a payment. A purchase invoice posts its own voucher, so reading
    // the vouchers covers imported bills, JVs and formal invoices alike without
    // double counting — and without one new invoice hiding all the older ones.
    const entries = await prisma.voucherEntry.findMany({
      where: {
        accountId: supplierId,
        voucher: { date: { lte: asOn }, companyId },
      },
      include: { voucher: { select: { date: true, voucherNo: true, narration: true, type: true } } },
      orderBy: { voucher: { date: "asc" } },
    });

    const { bills, credit } = collectPartyBills({
      entries,
      // A credit opening on a supplier is money owed.
      opening:     Number(supplier.openCredit || 0) - Number(supplier.openDebit || 0),
      openingDate: supplier.openDate ? new Date(supplier.openDate) : null,
      asOn,
      side: "PAYABLE",
    });

    const { settled, unapplied } = settleBills(bills, credit);

    let runningBalance = 0;
    const rows: any[] = [];

    for (const bill of settled) {
      if (bill.balance <= BILL_EPS) continue;
      runningBalance += bill.balance;
      rows.push({
        numType:      bill.numType,
        date:         bill.date.toISOString().slice(0, 10),
        narration:    bill.narration,
        billAmount:   bill.amount,
        billBalance:  bill.balance,
        days:         billDays(bill.date, asOn),
        totalBalance: runningBalance,
      });
    }

    // Payments beyond every bill — shown so the report ties back to the ledger.
    if (unapplied > BILL_EPS) {
      runningBalance -= unapplied;
      rows.push({
        numType:      "---",
        date:         asOn.toISOString().slice(0, 10),
        narration:    "ADVANCE PAID / UNADJUSTED",
        billAmount:   -unapplied,
        billBalance:  -unapplied,
        days:         0,
        totalBalance: runningBalance,
      });
    }

    return NextResponse.json(rows);
  } catch (e) {
    console.error("❌ SUPPLIER AGEING ERROR:", e);
    return NextResponse.json([]);
  }
}
