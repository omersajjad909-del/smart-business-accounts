import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

type CreditEntry = Prisma.VoucherEntryGetPayload<{ include: { voucher: true } }>;

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

    const customer = await prisma.account.findFirst({ where: { id: customerId, companyId }, select: { id: true } });
    if (!customer) return NextResponse.json([]);

    const asOn = asOnParam ? new Date(asOnParam + "T23:59:59.999") : new Date();

    // ── 1. Try formal sales invoices first ───────────────────────────────
    const invoices = await prisma.salesInvoice.findMany({
      where: { customerId, date: { lte: asOn }, companyId, ...(branchId ? { branchId } : {}) },
      orderBy: { date: "asc" },
    });

    // ── 2. Credit entries = receipts / payments received (amount < 0 on customer account) ─
    const creditEntries = await prisma.voucherEntry.findMany({
      where: {
        accountId: customerId,
        amount: { lt: 0 },
        voucher: { date: { lte: asOn }, companyId, ...(branchId ? { branchId } : {}) },
      },
      include: { voucher: true },
    });
    let availableCredit = creditEntries.reduce((s: number, c: CreditEntry) => s + Math.abs(Number(c.amount)), 0);

    let runningBalance = 0;
    const rows: any[] = [];

    if (invoices.length > 0) {
      // ── Path A: formal sales invoices exist ──────────────────────────────
      for (const inv of invoices) {
        const billAmount = Number(inv.total) || 0;
        let billBalance = billAmount;

        if (availableCredit >= billBalance) { availableCredit -= billBalance; billBalance = 0; }
        else { billBalance -= availableCredit; availableCredit = 0; }

        if (billBalance > 0) {
          const days = Math.floor((asOn.getTime() - new Date(inv.date).getTime()) / 86400000);
          runningBalance += billBalance;
          rows.push({ numType: "SI", date: inv.date.toISOString().slice(0, 10), narration: `BILL # ${inv.invoiceNo}`, billAmount, billBalance, days, totalBalance: runningBalance });
        }
      }
    } else {
      // ── Path B: no formal invoices → fall back to VoucherEntry debits ────
      // Debit entries (amount > 0) on customer account = amounts receivable
      const debitEntries = await prisma.voucherEntry.findMany({
        where: {
          accountId: customerId,
          amount: { gt: 0 },
          voucher: { date: { lte: asOn }, companyId, ...(branchId ? { branchId } : {}) },
        },
        include: { voucher: true },
        orderBy: { voucher: { date: "asc" } },
      });

      for (const entry of debitEntries) {
        const billAmount = Number(entry.amount);
        let billBalance = billAmount;

        if (availableCredit >= billBalance) { availableCredit -= billBalance; billBalance = 0; }
        else { billBalance -= availableCredit; availableCredit = 0; }

        if (billBalance > 0) {
          const entryDate = new Date((entry as any).voucher.date);
          const days = Math.floor((asOn.getTime() - entryDate.getTime()) / 86400000);
          runningBalance += billBalance;
          rows.push({
            numType: (entry as any).voucher.type?.slice(0, 3).toUpperCase() || "JV",
            date: entryDate.toISOString().slice(0, 10),
            narration: (entry as any).voucher.narration || `Voucher # ${(entry as any).voucher.voucherNo}`,
            billAmount,
            billBalance,
            days,
            totalBalance: runningBalance,
          });
        }
      }
    }

    return NextResponse.json(rows);
  } catch (e) {
    console.error("❌ CUSTOMER AGEING ERROR:", e);
    return NextResponse.json([]);
  }
}
