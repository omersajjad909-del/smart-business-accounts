import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
type VoucherEntry = Prisma.VoucherEntryGetPayload<Prisma.VoucherEntryDefaultArgs>;


const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

/* ================= CATEGORY RESOLVER ================= */
function resolveCategory(acc: Any) {
  if (acc.partyType === "EMPLOYES" || acc.partyType === "EMPLOYEE") return "EMPLOYEES";
  if (acc.partyType === "CUSTOMER") return "CUSTOMERS";
  if (acc.partyType === "SUPPLIER") return "SUPPLIERS";

  if (acc.type === "ASSET") return "ASSETS";
  if (acc.type === "LIABILITY") return "LIABILITIES";
  if (acc.type === "INCOME") return "INCOME";
  if (acc.type === "EXPENSE") return "EXPENSES";

  return "OTHERS";
}

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const fromDate = from ? new Date(from + "T00:00:00") : new Date("2000-01-01");
    const toDate = to ? new Date(to + "T23:59:59.999") : new Date();

    const accounts = await prisma.account.findMany({
      where: { companyId },
      orderBy: [{ name: "asc" }],
    });

    const rows: Any[] = [];

    for (const acc of accounts) {
      /* ---------- OPENING: Opening balance + vouchers before period ---------- */
      const opVouchers = await prisma.voucherEntry.aggregate({
        where: {
          accountId: acc.id,
          voucher: { date: { lt: fromDate }, companyId },
        },
        _sum: { amount: true },
      });

      const openingFromVouchers = Number(opVouchers._sum.amount || 0);
      const openingFromMaster =
        Number(acc.openDebit || 0) - Number(acc.openCredit || 0);
      const openingNet = openingFromMaster + openingFromVouchers;

      /* ---------- PERIOD TRANSACTIONS ---------- */
      /* ---------- PERIOD TRANSACTIONS (Voucher-based only) ---------- */
      const periodVouchers = await prisma.voucherEntry.findMany({
        where: {
          accountId: acc.id,
          voucher: { date: { gte: fromDate, lte: toDate }, companyId },
        },
      });
      const transDebit = periodVouchers
        .filter((v: VoucherEntry) => Number(v.amount) > 0)
        .reduce(
          (s: number, v: VoucherEntry) => s + Number(v.amount),
          0
        );

      const transCredit = periodVouchers
        .filter((v: VoucherEntry) => Number(v.amount) < 0)
        .reduce(
          (s: number, v: VoucherEntry) => s + Math.abs(Number(v.amount)),
          0
        );


      const closingNet = openingNet + (transDebit - transCredit);

      if (openingNet === 0 && transDebit === 0 && transCredit === 0) continue;

      rows.push({
        code: acc.code,
        name: acc.name,
        category: resolveCategory(acc),

        opDebit: openingNet > 0 ? openingNet : 0,
        opCredit: openingNet < 0 ? Math.abs(openingNet) : 0,

        transDebit,
        transCredit,

        clDebit: closingNet > 0 ? closingNet : 0,
        clCredit: closingNet < 0 ? Math.abs(closingNet) : 0,
      });
    }

    const totals = rows.reduce(
      (a, r) => ({
        opDebit: a.opDebit + r.opDebit,
        opCredit: a.opCredit + r.opCredit,
        transDebit: a.transDebit + r.transDebit,
        transCredit: a.transCredit + r.transCredit,
        clDebit: a.clDebit + r.clDebit,
        clCredit: a.clCredit + r.clCredit,
      }),
      { opDebit: 0, opCredit: 0, transDebit: 0, transCredit: 0, clDebit: 0, clCredit: 0 }
    );

    return NextResponse.json({ rows, totals });
  } catch (e) {
    console.error("TRIAL BALANCE ERROR:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

