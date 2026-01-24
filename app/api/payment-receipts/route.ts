import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const partyId = searchParams.get('partyId');

    const filter: any = {};
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
    const body = await req.json();
    const {
      receiptNo: providedReceiptNo,
      date,
      amount,
      paymentMode,
      partyId,
      referenceNo,
      narration,
      bankAccountId, // New: which bank/cash account received this
    } = body;

    // Validation
    if (!partyId || !amount || !date) {
      return NextResponse.json(
        { error: 'Party, amount, and date are required' },
        { status: 400 }
      );
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get party (customer)
    const party = await prisma.account.findUnique({
      where: { id: partyId },
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
      const count = await prisma.paymentReceipt.count();
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
      bankAccountRecord = await prisma.bankAccount.findUnique({
        where: { id: bankAccountId },
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
        },
      });

      if (!paymentAccount) {
        // Create Cash account if doesn't exist
        paymentAccount = await prisma.account.create({
          data: {
            code: 'CASH',
            name: 'Cash',
            type: 'ASSET',
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
        },
        include: {
          party: true,
          voucher: { include: { entries: true } },
        },
      });

      // 3. Update bank balance if bank payment
      if ((paymentMode === 'BANK_TRANSFER' || paymentMode === 'CHEQUE') && bankAccountRecord) {
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
            isReconciled: false,
          },
        });
      }

      return receipt;
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
    const body = await req.json();
    const { id, ...updateData } = body;

    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const receipt = await prisma.paymentReceipt.update({
      where: { id },
      data: updateData,
      include: {
        party: true,
        voucher: { include: { entries: true } },
      },
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID required' },
        { status: 400 }
      );
    }

    await prisma.paymentReceipt.delete({
      where: { id },
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