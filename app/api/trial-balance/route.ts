import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

type Account = Prisma.AccountGetPayload<Prisma.AccountDefaultArgs>;
type Voucher = Prisma.VoucherGetPayload<{
  include: { entries: true };
}>;

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Both queries used to run unscoped, so this report returned every account
  // and voucher in the database — one tenant's trial balance listed other
  // companies' parties by name. Everything here is now bound to the caller's
  // company.
  const companyId = await resolveCompanyId(req);
  if (!companyId || companyId === "system") {
    return NextResponse.json({ error: "Company context required" }, { status: 400 });
  }

  const [accounts, vouchers] = await Promise.all([
    prisma.account.findMany({ where: { companyId, deletedAt: null } }),
    prisma.voucher.findMany({
      where: { companyId, deletedAt: null },
      include: { entries: true },
    }),
  ]);

  // Index the entries by account so the report is a single pass instead of
  // accounts × vouchers × entries.
  const totals = new Map<string, { debit: number; credit: number }>();
  for (const v of vouchers as Voucher[]) {
    if (v.type !== "CRV" && v.type !== "CPV") continue;
    for (const e of v.entries) {
      const row = totals.get(e.accountId) || { debit: 0, credit: 0 };
      if (e.amount > 0) row.debit += e.amount;
      else row.credit += Math.abs(e.amount);
      totals.set(e.accountId, row);
    }
  }

  const result = (accounts as Account[]).map((acc) => ({
    name: acc.name,
    debit: totals.get(acc.id)?.debit ?? 0,
    credit: totals.get(acc.id)?.credit ?? 0,
  }));

  return NextResponse.json(result);
}
