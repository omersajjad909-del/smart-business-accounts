import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId, resolveBranchId, resolveBranchIdOrDefault } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

// GET — list vouchers with all their party entries
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    const branchId = await resolveBranchId(req, companyId);

    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed  = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_CRV, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    const where: any = { type: "CRV", companyId, deletedAt: null, ...(branchId ? { branchId } : {}) };
    if (from && to) {
      where.date = { gte: new Date(from + "T00:00:00"), lte: new Date(to + "T23:59:59") };
    }

    const vouchers = await prisma.voucher.findMany({
      where,
      include: { entries: { include: { account: true } } },
      orderBy: { date: "desc" },
    });

    const formatted = vouchers.map((v: any) => {
      // cash/bank entry = positive (debit)
      const cashEntry = v.entries.find((e: any) => e.amount > 0);
      // party entries = negative (credit) — could be multiple
      const partyEntries = v.entries
        .filter((e: any) => e.amount < 0)
        .map((e: any) => ({
          accountId:   e.accountId,
          accountName: e.account?.name || "",
          accountCode: e.account?.code || "",
          amount:      Math.abs(e.amount),
          narration:   v.narration,
        }));

      const total = partyEntries.reduce((s: number, e: any) => s + e.amount, 0);

      return {
        id:            v.id,
        voucherNo:     v.voucherNo,
        date:          v.date.toISOString().split("T")[0],
        narration:     v.narration,
        paymentMode:   cashEntry?.account?.name?.toLowerCase().includes("cash") ? "CASH" : "BANK",
        paymentAccId:  cashEntry?.accountId || "",
        paymentAccName:cashEntry?.account?.name || "",
        totalAmount:   total,
        entries:       partyEntries,
      };
    });

    return NextResponse.json(formatted);
  } catch (e: any) {
    console.error("CRV GET Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — create multi-entry CRV
export async function POST(req: Request) {
  try {
    const companyId = await resolveCompanyId(req as NextRequest);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    const branchId = await resolveBranchIdOrDefault(req as any, companyId);

    const userId   = (req as any).headers.get("x-user-id");
    const userRole = (req as any).headers.get("x-user-role");
    const allowed  = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_CRV, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { date, paymentMode, bankAccountId, narration, entries } = body;
    // entries = [{ accountId, amount, narration }]

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

    const count     = await prisma.voucher.count({ where: { type: "CRV", companyId } });
    const voucherNo = `CRV-${count + 1}`;

    const result = await prisma.$transaction(async (tx: any) => {
      const voucherEntries = [
        // Cash/Bank DEBIT (+) — one entry for total
        { accountId: paymentAccount.id, amount: totalAmount, companyId },
        // Each party CREDIT (-)
        ...validEntries.map((e: any) => ({
          accountId: e.accountId,
          amount:    -Number(e.amount),
          companyId,
        })),
      ];

      const voucher = await tx.voucher.create({
        data: {
          voucherNo,
          type:      "CRV",
          date:      new Date(date),
          narration: narration || "Cash Receipt",
          companyId,
          branchId,
          entries:   { create: voucherEntries },
        },
        include: { entries: { include: { account: true } } },
      });

      // Update bank balance if bank mode
      if (paymentMode === "BANK" && bankAccountRecord) {
        await tx.bankAccount.update({
          where: { id: bankAccountRecord.id },
          data:  { balance: { increment: totalAmount } },
        });
      }

      return voucher;
    });

    return NextResponse.json({ ok: true, voucherNo: result.voucherNo, id: result.id });
  } catch (e: any) {
    console.error("CRV POST Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — soft delete
export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.$transaction(async (tx: any) => {
      await tx.voucherEntry.deleteMany({ where: { voucherId: id } });
      await tx.voucher.delete({ where: { id, companyId } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
