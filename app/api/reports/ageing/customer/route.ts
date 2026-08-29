import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";

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
    const branchId = await resolveBranchId(req, companyId);

    const customerId = req.nextUrl.searchParams.get("customerId");
    const asOnParam  = req.nextUrl.searchParams.get("date");
    if (!customerId) return NextResponse.json([]);

    const customer = await prisma.account.findFirst({
      where: { id: customerId, companyId },
      select: { id: true, openDebit: true, openCredit: true, openDate: true },
    });
    if (!customer) return NextResponse.json([]);

    const asOn = asOnParam ? new Date(asOnParam + "T23:59:59.999") : new Date();

    // Every posting on the party account is the bill universe. A sales invoice
    // posts a voucher of its own (voucherNo = invoice no), so reading the
    // vouchers covers imported SV bills, JVs and formal invoices alike, with
    // nothing counted twice. The old code branched — formal invoices *or*
    // vouchers — so one new invoice hid every imported bill behind it and was
    // then wiped out by a lifetime of receipts.
    const entries = await prisma.voucherEntry.findMany({
      where: {
        accountId: customerId,
        voucher: { date: { lte: asOn }, companyId, ...(branchId ? { branchId } : {}) },
      },
      include: { voucher: { select: { date: true, voucherNo: true, narration: true, type: true } } },
      orderBy: { voucher: { date: "asc" } },
    });

    const bills: Bill[] = [];
    let availableCredit = 0;

    // Master opening balance — the same one the ledger carries forward.
    const opening     = Number(customer.openDebit || 0) - Number(customer.openCredit || 0);
    const openingDate = customer.openDate ? new Date(customer.openDate) : null;
    if (!openingDate || openingDate <= asOn) {
      if (opening > 0) {
        bills.push({
          numType:   "---",
          date:      openingDate ?? (entries[0] ? new Date(entries[0].voucher.date) : asOn),
          narration: "OPENING BALANCE B/F",
          amount:    opening,
        });
      } else if (opening < 0) {
        availableCredit += Math.abs(opening);
      }
    }

    for (const e of entries) {
      const amount = Number(e.amount);
      const v = e.voucher;
      if (amount > 0) {
        // Debit on a customer = amount receivable = a bill.
        bills.push({
          numType:   v.voucherNo || v.type || "JV",
          date:      new Date(v.date),
          narration: v.narration || `Voucher # ${v.voucherNo}`,
          amount,
        });
      } else if (amount < 0) {
        // Credit = receipt / return — adjusted oldest-bill-first below.
        availableCredit += Math.abs(amount);
      }
    }

    bills.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    const rows: any[] = [];

    for (const bill of bills) {
      let billBalance = bill.amount;
      const applied = Math.min(availableCredit, billBalance);
      availableCredit -= applied;
      billBalance     -= applied;
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

    // Receipts beyond every bill — shown so the report ties back to the ledger.
    if (availableCredit > EPS) {
      runningBalance -= availableCredit;
      rows.push({
        numType:      "---",
        date:         asOn.toISOString().slice(0, 10),
        narration:    "UNADJUSTED CREDIT / ADVANCE",
        billAmount:   -availableCredit,
        billBalance:  -availableCredit,
        days:         0,
        totalBalance: runningBalance,
      });
    }

    return NextResponse.json(rows);
  } catch (e) {
    console.error("❌ CUSTOMER AGEING ERROR:", e);
    return NextResponse.json([]);
  }
}
