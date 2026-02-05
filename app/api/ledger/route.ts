import { NextResponse } from "next/server";
import { PrismaClient , Prisma } from "@prisma/client";

const prisma =
  (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: Request) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    if (!accountId) return NextResponse.json([]);

    const entries = await prisma.voucherEntry.findMany({
      where: { accountId },
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

