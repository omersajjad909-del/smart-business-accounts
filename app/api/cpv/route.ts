import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId, resolveBranchIdOrDefault } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";
import { nextVoucherNo } from "@/lib/inventoryAccounts";

// GET — list vouchers with all their party entries
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    const branchId = await resolveBranchId(req, companyId);

    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed  = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_CPV, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    const where: any = { type: "CPV", companyId, deletedAt: null, ...(branchId ? { branchId } : {}) };
    if (from && to) {
      where.date = { gte: new Date(from + "T00:00:00"), lte: new Date(to + "T23:59:59") };
    }

    const vouchers = await prisma.voucher.findMany({
      where,
      include: { entries: { include: { account: true } } },
      orderBy: { date: "desc" },
    });

    const formatted = vouchers.map((v: any) => {
      // cash/bank = negative (credit)
      const cashEntry = v.entries.find((e: any) => e.amount < 0);
      // party entries = positive (debit) — could be multiple
      const partyEntries = v.entries
        .filter((e: any) => e.amount > 0)
        .map((e: any) => ({
          accountId:   e.accountId,
          accountName: e.account?.name || "",
          accountCode: e.account?.code || "",
          amount:      Math.abs(e.amount),
          narration:   v.narration,
        }));

      const total = partyEntries.reduce((s: number, e: any) => s + e.amount, 0);

      return {
        id:             v.id,
        voucherNo:      v.voucherNo,
        date:           v.date.toISOString().split("T")[0],
        narration:      v.narration,
        paymentMode:    cashEntry?.account?.name?.toLowerCase().includes("cash") ? "CASH" : "BANK",
        paymentAccId:   cashEntry?.accountId || "",
        paymentAccName: cashEntry?.account?.name || "",
        totalAmount:    total,
        entries:        partyEntries,
      };
    });

    return NextResponse.json(formatted);
  } catch (e: any) {
    console.error("CPV GET Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — create multi-entry CPV
export async function POST(req: Request) {
  try {
    const companyId = await resolveCompanyId(req as NextRequest);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    const branchId = await resolveBranchIdOrDefault(req as any, companyId);

    const userId   = (req as any).headers.get("x-user-id");
    const userRole = (req as any).headers.get("x-user-role");
    const allowed  = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_CPV, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { date, paymentMode, bankAccountId, narration, entries } = body;

    if (!date || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "Date and at least one entry required" }, { status: 400 });
    }

    const validEntries = entries.filter((e: any) => e.accountId && Number(e.amount) > 0);
    if (validEntries.length === 0) {
      return NextResponse.json({ error: "Each entry needs a valid account and amount > 0" }, { status: 400 });
    }

    const totalAmount = validEntries.reduce((s: number, e: any) => s + Number(e.amount), 0);

    // Resolve cash/bank account
    let paymentAccount: any;
    let bankAccountRecord: any = null;

    if (paymentMode === "BANK" && bankAccountId) {
      bankAccountRecord = await prisma.bankAccount.findUnique({
        where: { id: bankAccountId, companyId },
        include: { account: true },
      });
      paymentAccount = bankAccountRecord?.account;
      if (!paymentAccount) {
        paymentAccount = await prisma.account.findUnique({ where: { id: bankAccountId, companyId } });
      }
    } else {
      paymentAccount = await prisma.account.findFirst({
        where: { name: { equals: "Cash in hand", mode: "insensitive" }, companyId },
      });
    }

    if (!paymentAccount) return NextResponse.json({ error: "Cash/Bank account not found" }, { status: 400 });

    // Same fix as CRV: a deleted voucher used to drop the count and hand the
    // next one a number already in use.
    const voucherNo = `CPV-${await nextVoucherNo(prisma, companyId, "CPV", "CPV")}`;

    const result = await prisma.$transaction(async (tx: any) => {
      const voucherEntries = [
        // Cash/Bank CREDIT (-) — one entry for total
        { accountId: paymentAccount.id, amount: -totalAmount, companyId },
        // Each party DEBIT (+)
        ...validEntries.map((e: any) => ({
          accountId: e.accountId,
          amount:    Number(e.amount),
          companyId,
        })),
      ];

      const voucher = await tx.voucher.create({
        data: {
          voucherNo,
          type:      "CPV",
          date:      new Date(date),
          narration: narration || "Cash Payment",
          companyId,
          branchId,
          entries:   { create: voucherEntries },
        },
        include: { entries: { include: { account: true } } },
      });

      if (paymentMode === "BANK" && bankAccountRecord) {
        await tx.bankAccount.update({
          where: { id: bankAccountRecord.id },
          data:  { balance: { decrement: totalAmount } },
        });
      }

      return voucher;
    });

    return NextResponse.json({ ok: true, voucherNo: result.voucherNo, id: result.id });
  } catch (e: any) {
    console.error("CPV POST Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// A CPV that was posted by another document (a payment receipt, an expense
// voucher) is that document's ledger side, not a standalone voucher — editing
// or deleting it here would leave the source paid/unpaid figures lying.
async function loadEditable(id: string, companyId: string) {
  const voucher = await prisma.voucher.findFirst({
    where: { id, companyId, type: "CPV", deletedAt: null },
    include: {
      entries: true,
      paymentReceipts: { where: { deletedAt: null }, select: { receiptNo: true } },
      expenseVouchers: { where: { deletedAt: null }, select: { voucherNo: true } },
    },
  });
  if (!voucher) return { error: "Voucher not found", status: 404 as const };
  if (voucher.paymentReceipts.length || voucher.expenseVouchers.length) {
    const src = voucher.paymentReceipts[0]?.receiptNo || voucher.expenseVouchers[0]?.voucherNo;
    return {
      error: `This voucher was posted from ${src} — edit or delete it there instead.`,
      status: 409 as const,
    };
  }
  return { voucher };
}

// Undo the bank-balance movement the original posting made, so an edit or a
// delete does not leave the bank sitting on money it already paid out.
async function restoreBankBalance(tx: any, entries: any[], companyId: string) {
  const cashEntry = entries.find((e: any) => e.amount < 0);
  if (!cashEntry) return;
  const bank = await tx.bankAccount.findFirst({ where: { accountId: cashEntry.accountId, companyId } });
  if (bank) {
    await tx.bankAccount.update({
      where: { id: bank.id },
      data:  { balance: { increment: Math.abs(cashEntry.amount) } },
    });
  }
}

// PUT — edit an existing CPV in place (same voucher no, rebuilt entries)
export async function PUT(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed  = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_CPV, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, date, paymentMode, bankAccountId, narration, entries } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    if (!date || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "Date and at least one entry required" }, { status: 400 });
    }

    const validEntries = entries.filter((e: any) => e.accountId && Number(e.amount) > 0);
    if (validEntries.length === 0) {
      return NextResponse.json({ error: "Each entry needs a valid account and amount > 0" }, { status: 400 });
    }

    const found = await loadEditable(id, companyId);
    if (found.error) return NextResponse.json({ error: found.error }, { status: found.status });
    const existing = found.voucher!;

    const totalAmount = validEntries.reduce((s: number, e: any) => s + Number(e.amount), 0);

    // Resolve cash/bank account (same rules as POST)
    let paymentAccount: any;
    let bankAccountRecord: any = null;

    if (paymentMode === "BANK" && bankAccountId) {
      bankAccountRecord = await prisma.bankAccount.findUnique({
        where: { id: bankAccountId, companyId },
        include: { account: true },
      });
      paymentAccount = bankAccountRecord?.account;
      if (!paymentAccount) {
        paymentAccount = await prisma.account.findUnique({ where: { id: bankAccountId, companyId } });
      }
    } else {
      paymentAccount = await prisma.account.findFirst({
        where: { name: { equals: "Cash in hand", mode: "insensitive" }, companyId },
      });
    }

    if (!paymentAccount) return NextResponse.json({ error: "Cash/Bank account not found" }, { status: 400 });

    await prisma.$transaction(async (tx: any) => {
      await restoreBankBalance(tx, existing.entries, companyId);
      await tx.voucherEntry.deleteMany({ where: { voucherId: id } });

      await tx.voucher.update({
        where: { id },
        data: {
          date:      new Date(date),
          narration: narration || "Cash Payment",
          entries: {
            create: [
              { accountId: paymentAccount.id, amount: -totalAmount, companyId },
              ...validEntries.map((e: any) => ({
                accountId: e.accountId,
                amount:    Number(e.amount),
                companyId,
              })),
            ],
          },
        },
      });

      if (paymentMode === "BANK" && bankAccountRecord) {
        await tx.bankAccount.update({
          where: { id: bankAccountRecord.id },
          data:  { balance: { decrement: totalAmount } },
        });
      }
    });

    return NextResponse.json({ ok: true, id, voucherNo: existing.voucherNo });
  } catch (e: any) {
    console.error("CPV PUT Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — removes the voucher and its ledger entries for good
export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed  = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_CPV, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const found = await loadEditable(id, companyId);
    if (found.error) return NextResponse.json({ error: found.error }, { status: found.status });
    const existing = found.voucher!;

    await prisma.$transaction(async (tx: any) => {
      await restoreBankBalance(tx, existing.entries, companyId);
      await tx.voucherEntry.deleteMany({ where: { voucherId: id } });
      await tx.voucher.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true, voucherNo: existing.voucherNo });
  } catch (e: any) {
    console.error("CPV DELETE Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
