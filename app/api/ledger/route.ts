import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";


export async function GET(req: Request) {
  try {
    const role = req.headers.get("x-user-role");
    const companyId = req.headers.get("x-company-id");

    if (!companyId) {
      return NextResponse.json({ error: "Company context required" }, { status: 400 });
    }

    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    if (!accountId) return NextResponse.json([]);

    const entries = await prisma.voucherEntry.findMany({
      where: { 
        accountId,
        voucher: { companyId } // Enforce company scoping
      },
      include: { voucher: true },
      orderBy: { voucher: { date: "asc" } },
    });

    type LedgerEntry = Prisma.VoucherEntryGetPayload<{
  include: {
    voucher: true;
  };
}>;


    let balance = 0;

    const rows = entries.map((e: LedgerEntry) => {

      const debit = e.amount > 0 ? e.amount : 0;
      const credit = e.amount < 0 ? Math.abs(e.amount) : 0;
      balance += debit - credit;

      return {
        date: e.voucher.date.toISOString().slice(0, 10),
        voucherNo: e.voucher.voucherNo,
        narration: e.voucher.narration || "",
        debit,
        credit,
        balance,
      };
    });

    return NextResponse.json(rows);
  } catch (e) {
    console.error("LEDGER ERROR:", e);
    return NextResponse.json({ error: "Ledger failed" }, { status: 500 });
  }
}

