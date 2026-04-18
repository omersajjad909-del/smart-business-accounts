import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

type DebitEntry = Prisma.VoucherEntryGetPayload<{ include: { voucher: true } }>;

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

    const supplier = await prisma.account.findFirst({ where: { id: supplierId, companyId }, select: { id: true } });
    if (!supplier) return NextResponse.json([]);

    const asOn = asOnParam ? new Date(asOnParam + "T23:59:59.999") : new Date();

    // ── 1. Try formal purchase invoices first ──────────────────────────────
    const invoices = await prisma.purchaseInvoice.findMany({
      where: { supplierId, date: { lte: asOn }, companyId },
      orderBy: { date: "asc" },
    });

    // ── 2. Debit entries = payments made to supplier (amount > 0 on supplier account) ─
    const debitEntries = await prisma.voucherEntry.findMany({
      where: {
        accountId: supplierId,
        amount: { gt: 0 },
        voucher: { date: { lte: asOn }, companyId },
      },
      include: { voucher: true },
    });
    let availableDebit = debitEntries.reduce((s: number, d: DebitEntry) => s + Number(d.amount), 0);

    let runningBalance = 0;
    const rows: any[] = [];

    if (invoices.length > 0) {
      // ── Path A: formal purchase invoices exist ────────────────────────────
      for (const inv of invoices) {
        const billAmount = Number(inv.total) || 0;
        let billBalance = billAmount;

        if (availableDebit >= billBalance) { availableDebit -= billBalance; billBalance = 0; }
        else { billBalance -= availableDebit; availableDebit = 0; }

        if (billBalance > 0) {
          const days = Math.floor((asOn.getTime() - new Date(inv.date).getTime()) / 86400000);
          runningBalance += billBalance;
          rows.push({ numType: "PI", date: inv.date.toISOString().slice(0, 10), narration: `PURCHASE # ${inv.invoiceNo}`, billAmount, billBalance, days, totalBalance: runningBalance });
        }
      }
    } else {
      // ── Path B: no formal invoices → fall back to VoucherEntry credits ────
      // Credit entries (amount < 0) on supplier account = bills / amounts owed
      const creditEntries = await prisma.voucherEntry.findMany({
        where: {
          accountId: supplierId,
          amount: { lt: 0 },
          voucher: { date: { lte: asOn }, companyId },
        },
        include: { voucher: true },
        orderBy: { voucher: { date: "asc" } },
      });

      for (const entry of creditEntries) {
        const billAmount = Math.abs(Number(entry.amount));
        let billBalance = billAmount;

        if (availableDebit >= billBalance) { availableDebit -= billBalance; billBalance = 0; }
        else { billBalance -= availableDebit; availableDebit = 0; }

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
    console.error("❌ SUPPLIER AGEING ERROR:", e);
    return NextResponse.json([]);
  }
}
