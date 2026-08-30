import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import {
  BILL_EPS,
  asOnWindow,
  billDays,
  collectPartyBills,
  creditFilter,
  settleBills,
} from "@/lib/billAgeing";

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
    if (!supplierId) return NextResponse.json({ rows: [] });

    const supplier = await prisma.account.findFirst({
      where: { id: supplierId, companyId },
      select: {
        id: true, openDebit: true, openCredit: true, openDate: true,
        creditDays: true, creditLimit: true,
      },
    });
    if (!supplier) return NextResponse.json({ rows: [] });

    const asOnKey = asOnParam || new Date().toISOString().slice(0, 10);
    const { before, lastDay } = asOnWindow(asOnKey);

    // Same rule as the customer side: every posting on the party account is a
    // bill or a payment. A purchase invoice posts its own voucher, so reading
    // the vouchers covers imported bills, JVs and formal invoices alike without
    // double counting — and without one new invoice hiding all the older ones.
    const entries = await prisma.voucherEntry.findMany({
      where: {
        accountId: supplierId,
        voucher: { date: { lt: before }, companyId },
      },
      include: { voucher: { select: { date: true, voucherNo: true, narration: true, type: true } } },
      orderBy: { voucher: { date: "asc" } },
    });

    const { bills, credit } = collectPartyBills({
      entries,
      // A credit opening on a supplier is money owed.
      opening:     Number(supplier.openCredit || 0) - Number(supplier.openDebit || 0),
      openingDate: supplier.openDate ? new Date(supplier.openDate) : null,
      asOn: lastDay,
      side: "PAYABLE",
    });

    const { settled, unapplied } = settleBills(bills, credit);

    const open = settled.filter(b => b.balance > BILL_EPS);
    const outstanding = open.reduce((s, b) => s + b.balance, 0) - unapplied;

    const terms = creditFilter({
      creditDays:  supplier.creditDays ?? null,
      creditLimit: supplier.creditLimit ?? null,
      outstanding,
    });

    let runningBalance = 0;
    const rows: any[] = [];

    for (const bill of open) {
      const days = billDays(bill.date, lastDay);
      if (!terms.shows(days)) continue;

      runningBalance += bill.balance;
      rows.push({
        numType:      bill.numType,
        date:         bill.date.toISOString().slice(0, 10),
        narration:    bill.narration,
        billAmount:   bill.amount,
        billBalance:  bill.balance,
        days,
        totalBalance: runningBalance,
      });
    }

    // Payments beyond every bill — nothing is owed, so the credit terms have
    // no say in whether this is reported.
    if (unapplied > BILL_EPS) {
      runningBalance -= unapplied;
      rows.push({
        numType:      "---",
        date:         lastDay.toISOString().slice(0, 10),
        narration:    "ADVANCE PAID / UNADJUSTED",
        billAmount:   -unapplied,
        billBalance:  -unapplied,
        days:         0,
        totalBalance: runningBalance,
      });
    }

    return NextResponse.json({
      rows,
      creditDays:  supplier.creditDays ?? null,
      creditLimit: supplier.creditLimit ?? null,
      outstanding,
      openBills:   open.length,
      hasTerms:    terms.hasTerms,
      overLimit:   terms.overLimit,
    });
  } catch (e) {
    console.error("❌ SUPPLIER AGEING ERROR:", e);
    return NextResponse.json({ rows: [] });
  }
}
