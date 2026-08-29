import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

type Bill = { numType: string; date: Date; narration: string; amount: number };

const EPS = 0.005;

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

    const bills: Bill[] = [];
    let availableDebit = 0;

    // Master opening balance — a credit opening on a supplier is money owed.
    const opening     = Number(supplier.openCredit || 0) - Number(supplier.openDebit || 0);
    const openingDate = supplier.openDate ? new Date(supplier.openDate) : null;
    if (!openingDate || openingDate <= asOn) {
      if (opening > 0) {
        bills.push({
          numType:   "---",
          date:      openingDate ?? (entries[0] ? new Date(entries[0].voucher.date) : asOn),
          narration: "OPENING BALANCE B/F",
          amount:    opening,
        });
      } else if (opening < 0) {
        availableDebit += Math.abs(opening);
      }
    }

    for (const e of entries) {
      const amount = Number(e.amount);
      const v = e.voucher;
      if (amount < 0) {
        // Credit on a supplier = amount payable = a bill.
        bills.push({
          numType:   v.voucherNo || v.type || "JV",
          date:      new Date(v.date),
          narration: v.narration || `Voucher # ${v.voucherNo}`,
          amount:    Math.abs(amount),
        });
      } else if (amount > 0) {
        // Debit = payment / return — adjusted oldest-bill-first below.
        availableDebit += amount;
      }
    }

    bills.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    const rows: any[] = [];

    for (const bill of bills) {
      let billBalance = bill.amount;
      const applied = Math.min(availableDebit, billBalance);
      availableDebit -= applied;
      billBalance    -= applied;
      if (billBalance <= EPS) continue;

      runningBalance += billBalance;
      rows.push({
        numType:      bill.numType,
        date:         bill.date.toISOString().slice(0, 10),
        narration:    bill.narration,
        billAmount:   bill.amount,
        billBalance,
        days:         Math.max(0, Math.floor((asOn.getTime() - bill.date.getTime()) / 86400000)),
        totalBalance: runningBalance,
      });
    }

    // Payments beyond every bill — shown so the report ties back to the ledger.
    if (availableDebit > EPS) {
      runningBalance -= availableDebit;
      rows.push({
        numType:      "---",
        date:         asOn.toISOString().slice(0, 10),
        narration:    "ADVANCE PAID / UNADJUSTED",
        billAmount:   -availableDebit,
        billBalance:  -availableDebit,
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
