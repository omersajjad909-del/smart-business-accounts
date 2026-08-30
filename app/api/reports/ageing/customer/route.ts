import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
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
    const branchId = await resolveBranchId(req, companyId);

    const customerId = req.nextUrl.searchParams.get("customerId");
    const asOnParam  = req.nextUrl.searchParams.get("date");
    if (!customerId) return NextResponse.json({ rows: [] });

    const customer = await prisma.account.findFirst({
      where: { id: customerId, companyId },
      select: {
        id: true, openDebit: true, openCredit: true, openDate: true,
        creditDays: true, creditLimit: true,
      },
    });
    if (!customer) return NextResponse.json({ rows: [] });

    const asOnKey = asOnParam || new Date().toISOString().slice(0, 10);
    const { before, lastDay } = asOnWindow(asOnKey);

    // Every posting on the party account is the bill universe. A sales invoice
    // posts a voucher of its own (voucherNo = invoice no), so reading the
    // vouchers covers imported SV bills, JVs and formal invoices alike, with
    // nothing counted twice. The old code branched — formal invoices *or*
    // vouchers — so one new invoice hid every imported bill behind it and was
    // then wiped out by a lifetime of receipts.
    const entries = await prisma.voucherEntry.findMany({
      where: {
        accountId: customerId,
        voucher: { date: { lt: before }, companyId, ...(branchId ? { branchId } : {}) },
      },
      include: { voucher: { select: { date: true, voucherNo: true, narration: true, type: true } } },
      orderBy: { voucher: { date: "asc" } },
    });

    const { bills, credit } = collectPartyBills({
      entries,
      // Master opening balance — the same one the ledger carries forward.
      opening:     Number(customer.openDebit || 0) - Number(customer.openCredit || 0),
      openingDate: customer.openDate ? new Date(customer.openDate) : null,
      asOn: lastDay,
      side: "RECEIVABLE",
    });

    const { settled, unapplied } = settleBills(bills, credit);

    const open = settled.filter(b => b.balance > BILL_EPS);
    const outstanding = open.reduce((s, b) => s + b.balance, 0) - unapplied;

    const terms = creditFilter({
      creditDays:  customer.creditDays ?? null,
      creditLimit: customer.creditLimit ?? null,
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

    // Receipts beyond every bill. Never within a credit limit — the party owes
    // nothing — so it is reported whatever the terms say.
    if (unapplied > BILL_EPS) {
      runningBalance -= unapplied;
      rows.push({
        numType:      "---",
        date:         lastDay.toISOString().slice(0, 10),
        narration:    "UNADJUSTED CREDIT / ADVANCE",
        billAmount:   -unapplied,
        billBalance:  -unapplied,
        days:         0,
        totalBalance: runningBalance,
      });
    }

    return NextResponse.json({
      rows,
      creditDays:  customer.creditDays ?? null,
      creditLimit: customer.creditLimit ?? null,
      outstanding,
      openBills:   open.length,
      hasTerms:    terms.hasTerms,
      overLimit:   terms.overLimit,
    });
  } catch (e) {
    console.error("❌ CUSTOMER AGEING ERROR:", e);
    return NextResponse.json({ rows: [] });
  }
}
