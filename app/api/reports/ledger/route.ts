import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const userId    = req.headers.get("x-user-id");
    const userRole  = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const branchId = await resolveBranchId(req, companyId);

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_LEDGER_REPORT, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const from      = searchParams.get("from");
    const to        = searchParams.get("to");

    if (!accountId) return NextResponse.json([]);

    const account = await prisma.account.findFirst({
      where: { id: accountId, companyId },
      select: { id: true, openDebit: true, openCredit: true },
    });
    if (!account) return NextResponse.json([]);

    const fromDate = from ? new Date(from + "T00:00:00") : new Date("2024-01-01");
    const toDate   = to   ? new Date(to   + "T23:59:59.999") : new Date();

    // ── 1. Opening balance: master opening + all voucher entries before period ──
    const prevEntries = await prisma.voucherEntry.findMany({
      where: {
        accountId,
        voucher: {
          companyId,
          date: { lt: fromDate },
          ...(branchId ? { branchId } : {}),
        },
      },
      select: { amount: true },
    });

    const openingFromMaster   = Number(account.openDebit || 0) - Number(account.openCredit || 0);
    const openingFromVouchers = prevEntries.reduce((s, e) => s + Number(e.amount), 0);
    const openingBal          = openingFromMaster + openingFromVouchers;

    // ── 2. Period entries — join voucher for date/voucherNo/narration ──
    const periodEntries = await prisma.voucherEntry.findMany({
      where: {
        accountId,
        voucher: {
          companyId,
          date: { gte: fromDate, lte: toDate },
          ...(branchId ? { branchId } : {}),
        },
      },
      include: {
        voucher: { select: { date: true, voucherNo: true, narration: true } },
      },
      orderBy: { voucher: { date: "asc" } },
    });

    // ── 3. Build running balance rows ──
    let runningBalance = openingBal;

    const finalRows = [
      {
        date:      fromDate.toISOString().slice(0, 10),
        voucherNo: "---",
        narration: "OPENING BALANCE B/F",
        debit:     openingBal > 0 ? openingBal  : 0,
        credit:    openingBal < 0 ? Math.abs(openingBal) : 0,
        balance:   openingBal,
      },
      ...periodEntries.map(e => {
        const amount = Number(e.amount);
        runningBalance += amount;
        return {
          date:      new Date(e.voucher.date).toISOString().slice(0, 10),
          voucherNo: e.voucher.voucherNo,
          narration: e.voucher.narration || "Voucher Entry",
          debit:     amount > 0 ? amount        : 0,
          credit:    amount < 0 ? Math.abs(amount) : 0,
          balance:   runningBalance,
        };
      }),
    ];

    return NextResponse.json(finalRows);

  } catch (e: any) {
    console.error("LEDGER ERROR:", e);
    return NextResponse.json({ error: "Ledger generation failed" }, { status: 500 });
  }
}
