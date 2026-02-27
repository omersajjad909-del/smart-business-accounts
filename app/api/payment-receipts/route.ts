import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from "zod";
import { resolveCompanyId } from "@/lib/tenant";
import { ensureOpenPeriod } from "@/lib/financialLock";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";
import { logActivity } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";
import { requireActiveSubscription } from "@/lib/subscriptionGuard";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

const receiptSchema = z.object({
  receiptNo: z.string().optional(),
  date: z.string(),
  amount: z.union([z.number(), z.string()]),
  paymentMode: z.enum(["CASH", "CHEQUE", "BANK_TRANSFER"]),
  partyId: z.string(),
  bankAccountId: z.string().optional(),
  referenceNo: z.string().optional(),
  narration: z.string().optional(),
  currencyId: z.string().optional(),
  exchangeRate: z.union([z.number(), z.string()]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.PAYMENT_RECEIPTS, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const partyId = searchParams.get('partyId');

    const filter: any = { companyId };
    if (status) filter.status = status;
    if (partyId) filter.partyId = partyId;

    const receipts = await prisma.paymentReceipt.findMany({
      where: filter,
      include: {
        party: true,
        voucher: { include: { entries: true } },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(receipts);
  } catch (error) {
    console.error('Error fetching payment receipts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment receipts' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sub = await requireActiveSubscription(req);
    if (sub) return sub;
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const companyIdKey = req.headers.get("x-company-id") || "unknown";
    const rl = rateLimit(`receipt:${companyIdKey}:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.PAYMENT_RECEIPTS, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = receiptSchema.parse(body);
    const {
      receiptNo: providedReceiptNo,
      date,
      amount,
      paymentMode,
      partyId,
      referenceNo,
      narration,
      bankAccountId,
      currencyId,
      exchangeRate = 1,
    } = parsed;

    // Validation
    if (!partyId || !amount || !date) {
      return NextResponse.json({ error: 'Party, amount, and date are required' }, { status: 400 });
    }

    await ensureOpenPeriod(prisma, companyId, new Date(date));

    const amountNum = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Get party (customer)
    const party = await prisma.account.findFirst({
      where: { id: partyId, companyId },
    });

    if (!party) {
      return NextResponse.json(
        { error: 'Party not found' },
        { status: 404 }
      );
    }

    // Auto-generate receipt number if not provided
    let receiptNo = providedReceiptNo;
    if (!receiptNo) {
      const count = await prisma.paymentReceipt.count({ where: { companyId } });
      receiptNo = `REC-${count + 1}`;
    }

    // Get payment account (bank or cash)
    let paymentAccount;
    let bankAccountRecord = null;

    if (paymentMode === 'BANK_TRANSFER' || paymentMode === 'CHEQUE') {
      if (!bankAccountId) {
        return NextResponse.json(
          { error: 'Bank account required for bank/cheque payments' },
          { status: 400 }
        );
      }

      // Find bank account
      bankAccountRecord = await prisma.bankAccount.findFirst({
        where: { id: bankAccountId, companyId },
        include: { account: true },
      });

      if (!bankAccountRecord) {
        return NextResponse.json(
          { error: 'Bank account not found' },
          { status: 404 }
        );
      }

      paymentAccount = bankAccountRecord.account;
    } else {
      // CASH mode - find Cash account
      paymentAccount = await prisma.account.findFirst({
        where: {
          OR: [
            { name: { contains: 'Cash', mode: 'insensitive' } },
            { code: { contains: 'CASH', mode: 'insensitive' } },
          ],
          companyId,
        },
      });

      if (!paymentAccount) {
        // Create Cash account if doesn't exist
        paymentAccount = await prisma.account.create({
          data: {
            code: 'CASH',
            name: 'Cash',
            type: 'ASSET',
            companyId,
          },
        });
      }
    }

    // Create voucher and payment receipt in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create voucher (like CRV)
      const voucher = await tx.voucher.create({
        data: {
          voucherNo: receiptNo,
          type: 'CRV', // Payment Receipt = Cash Receipt Voucher
          date: new Date(date),
          narration: narration || `Payment received from ${party.name}`,
          companyId,
          entries: {
            create: [
              { accountId: party.id, amount: -amountNum }, // Customer debit (they owe less)
              { accountId: paymentAccount.id, amount: amountNum }, // Cash/Bank credit (we received)
            ],
          },
        },
      });

      // 2. Create payment receipt
      // Determine status based on payment mode
      let status = 'CLEARED'; // Default: CLEARED for cash and bank transfers
      if (paymentMode === 'CHEQUE') {
        status = 'PENDING'; // Cheque pending until it clears
      }

      const receipt = await tx.paymentReceipt.create({
        data: {
          receiptNo,
          date: new Date(date),
          amount: amountNum,
          paymentMode,
          partyId,
          referenceNo,
          narration,
          voucherId: voucher.id,
          status,
          companyId,
        },
        include: {
          party: true,
          voucher: { include: { entries: true } },
        },
      });

      if (currencyId) {
        await tx.currencyTransaction.create({
          data: {
            transactionType: "PAYMENT",
            transactionId: receipt.id,
            currencyId,
            amountInLocal: amountNum,
            amountInBase: amountNum * Number(exchangeRate || 1),
            exchangeRate: Number(exchangeRate || 1),
            conversionDate: new Date(date),
          },
        });
      }

      // 3. Update bank balance if bank transfer (cheque will be applied on clearing)
      if (paymentMode === 'BANK_TRANSFER' && bankAccountRecord) {
        await tx.bankAccount.update({
          where: { id: bankAccountRecord.id },
          data: {
            balance: { increment: amountNum },
          },
        });

        // Create bank statement entry
        await tx.bankStatement.create({
          data: {
            bankAccountId: bankAccountRecord.id,
            statementNo: `STMT-${Date.now()}`,
            date: new Date(date),
            amount: amountNum, // Positive for receipt
            description: narration || `Receipt ${receiptNo} from ${party.name}`,
            referenceNo: receiptNo,
            isReconciled: true,
            companyId,
          },
        });
      } else if (paymentMode === 'CHEQUE' && bankAccountRecord) {
        // Record pending cheque statement without affecting balance
        await tx.bankStatement.create({
          data: {
            bankAccountId: bankAccountRecord.id,
            statementNo: `STMT-${Date.now()}`,
            date: new Date(date),
            amount: amountNum,
            description: narration || `Cheque ${referenceNo || receiptNo} from ${party.name}`,
            referenceNo: receiptNo,
            isReconciled: false,
            companyId,
          },
        });
      }

      return receipt;
    });

    await logActivity(prisma, {
      companyId,
      userId,
      action: "PAYMENT_RECEIPT_CREATED",
      details: `receiptNo=${result.receiptNo} amount=${amountNum}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error creating payment receipt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment receipt' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sub = await requireActiveSubscription(req);
    if (sub) return sub;
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.PAYMENT_RECEIPTS, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const existing = await prisma.paymentReceipt.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const receipt = await prisma.paymentReceipt.update({
      where: { id },
      data: updateData,
      include: {
        party: true,
        voucher: { include: { entries: true } },
      },
    });

    // If clearing a cheque, apply bank balance and reconcile statement
    if (updateData.status === "CLEARED") {
      const current = await prisma.paymentReceipt.findUnique({
        where: { id },
        include: {
          voucher: true,
        },
      });
      if (current?.paymentMode === "CHEQUE") {
        // Find the bank statement by referenceNo
        const stmt = await prisma.bankStatement.findFirst({
          where: {
            referenceNo: current.receiptNo,
            bankAccount: { companyId },
            isReconciled: false,
          },
          include: {
            bankAccount: true,
          },
        });
        if (stmt?.bankAccount?.id) {
          await prisma.bankAccount.update({
            where: { id: stmt.bankAccount.id },
            data: { balance: { increment: Number(current.amount || 0) } },
          });
          await prisma.bankStatement.update({
            where: { id: stmt.id },
            data: { isReconciled: true },
          });
        }
      }
    }

    await logActivity(prisma, {
      companyId,
      userId,
      action: "PAYMENT_RECEIPT_UPDATED",
      details: `id=${id}`,
    });

    return NextResponse.json(receipt);
  } catch (error) {
    console.error('Error updating payment receipt:', error);
    return NextResponse.json(
      { error: 'Failed to update payment receipt' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sub = await requireActiveSubscription(req);
    if (sub) return sub;
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.PAYMENT_RECEIPTS, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID required' },
        { status: 400 }
      );
    }

    const existing = await prisma.paymentReceipt.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    await prisma.paymentReceipt.delete({
      where: { id },
    });

    await logActivity(prisma, {
      companyId,
      userId,
      action: "PAYMENT_RECEIPT_DELETED",
      details: `id=${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment receipt:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment receipt' },
      { status: 500 }
    );
  }
}
