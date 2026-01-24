import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

type Account = Prisma.AccountGetPayload<{}>;
type Voucher = Prisma.VoucherGetPayload<{
  include: { entries: true };
}>;

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accounts = await prisma.account.findMany();
  const vouchers = await prisma.voucher.findMany({
    include: { entries: true },
  });

  const result = accounts.map((acc: Account) => {
    let debit = 0;
    let credit = 0;

    vouchers.forEach((v: Voucher) => {
      v.entries.forEach((e) => {
        if (e.accountId !== acc.id) return;

        if (v.type === "CRV") {
          if (e.amount > 0) debit += e.amount;
          else credit += Math.abs(e.amount);
        }

        if (v.type === "CPV") {
          if (e.amount > 0) debit += e.amount;
          else credit += Math.abs(e.amount);
        }
      });
    });

    return {
      name: acc.name,
      debit,
      credit,
    };
  });

  return NextResponse.json(result);
}
