import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

// Process recurring transactions that are due
export async function POST(_req: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all active recurring transactions due today or earlier
    const dueTransactions = await prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        nextDate: { lte: today },
      },
      include: { account: true },
    });

    const results = [];

    for (const transaction of dueTransactions) {
      try {
        // Calculate next date based on frequency
        const nextDate = calculateNextDate(transaction.nextDate, transaction.frequency);

        // Create the actual transaction based on type
        let created = null;
        if (transaction.type === "CPV") {
          created = await createCPV(transaction);
        } else if (transaction.type === "CRV") {
          created = await createCRV(transaction);
        } else if (transaction.type === "EXPENSE") {
          created = await createExpense(transaction);
        }

        // Update recurring transaction
        await prisma.recurringTransaction.update({
          where: { id: transaction.id },
          data: {
            lastRun: new Date(),
            nextDate: nextDate,
          },
        });

        results.push({
          id: transaction.id,
          status: "success",
          created,
        });
      } catch (error: Any) {
        results.push({
          id: transaction.id,
          status: "error",
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (e: Any) {
    console.error("Process Recurring Transactions Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function calculateNextDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}

async function createCPV(transaction: Any) {
  // Generate voucher number
  const count = await prisma.voucher.count({ where: { type: "CPV" } });
  const voucherNo = `CPV-${count + 1}`;

  const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};

  const voucher = await prisma.voucher.create({
    data: {
      voucherNo,
      type: "CPV",
      date: new Date(),
      narration: transaction.narration || transaction.description,
      entries: {
        create: [
          {
            accountId: transaction.accountId,
            amount: -transaction.amount,
          },
          {
            accountId: metadata.paymentAccountId || transaction.accountId,
            amount: transaction.amount,
          },
        ],
      },
    },
  });

  return voucher;
}

async function createCRV(transaction: Any) {
  const count = await prisma.voucher.count({ where: { type: "CRV" } });
  const voucherNo = `CRV-${count + 1}`;

  const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};

  const voucher = await prisma.voucher.create({
    data: {
      voucherNo,
      type: "CRV",
      date: new Date(),
      narration: transaction.narration || transaction.description,
      entries: {
        create: [
          {
            accountId: transaction.accountId,
            amount: transaction.amount,
          },
          {
            accountId: metadata.receiptAccountId || transaction.accountId,
            amount: -transaction.amount,
          },
        ],
      },
    },
  });

  return voucher;
}

async function createExpense(transaction: Any) {
  const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};

  const expense = await prisma.expenseVoucher.create({
    data: {
      voucherNo: `EXP-${Date.now()}`,
      date: new Date(),
      accountId: transaction.accountId,
      paymentAccountId: metadata.paymentAccountId || transaction.accountId,
      totalAmount: transaction.amount,
      items: {
        create: [
          {
            description: transaction.description,
            amount: transaction.amount,
          },
        ],
      },
    },
  });

  return expense;
}

