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

    const filter: any = {};
    if (status) filter.approvalStatus = status;

    const vouchers = await prisma.expenseVoucher.findMany({
      where: filter,
      include: {
        items: true,
        attachments: true,
        approvals: true,
        expenseAccount: true,
        paymentAccount: true,
        voucher: { include: { entries: true } },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(vouchers);
  } catch (error) {
    console.error('Error fetching expense vouchers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense vouchers' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      voucherNo,
      date,
      description,
      totalAmount,
      expenseAccountId,
      paymentAccountId,
      items,
    } = body;

    // Validation
    if (!voucherNo || !date || !expenseAccountId || !paymentAccountId) {
      return NextResponse.json(
        { error: 'Voucher No, Date, Expense Account, and Payment Account are required' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one expense item is required' },
        { status: 400 }
      );
    }

    // Check if voucher number already exists
    const existing = await prisma.expenseVoucher.findUnique({
      where: { voucherNo },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Voucher number already exists' },
        { status: 400 }
      );
    }

    // Validate accounts exist
    const expenseAccount = await prisma.account.findUnique({
      where: { id: expenseAccountId },
    });

    const paymentAccount = await prisma.account.findUnique({
      where: { id: paymentAccountId },
    });

    if (!expenseAccount || !paymentAccount) {
      return NextResponse.json(
        { error: 'One or both accounts not found' },
        { status: 404 }
      );
    }

    // Calculate total from items
    const calculatedTotal = items.reduce((sum: number, item: any) => 
      sum + parseFloat(item.amount || 0), 0
    );

    // Create expense voucher with items
    const voucher = await prisma.expenseVoucher.create({
      data: {
        voucherNo,
        date: new Date(date),
        description,
        totalAmount: calculatedTotal,
        expenseAccountId,
        paymentAccountId,
        approvalStatus: 'DRAFT',
        items: {
          create: items.map((item: any) => ({
            description: item.description || '',
            amount: parseFloat(item.amount || 0),
            category: item.category || 'OTHER',
          })),
        },
      },
      include: {
        items: true,
        attachments: true,
        approvals: true,
        expenseAccount: true,
        paymentAccount: true,
      },
    });

    return NextResponse.json(voucher, { status: 201 });
  } catch (error) {
    console.error('Error creating expense voucher:', error);
    return NextResponse.json(
      { error: 'Failed to create expense voucher: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, items, date, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID required' },
        { status: 400 }
      );
    }

    // First, delete old items if new items are provided
    if (items && items.length > 0) {
      await prisma.expenseItem.deleteMany({
        where: { expenseVoucherId: id },
      });

      // Calculate new total
      const newTotal = items.reduce((sum: number, item: any) => 
        sum + parseFloat(item.amount || 0), 0
      );

      updateData.totalAmount = newTotal;
    }

    if (date) {
      updateData.date = new Date(date);
    }

    // Update voucher
    const voucher = await prisma.expenseVoucher.update({
      where: { id },
      data: {
        ...updateData,
        ...(items && items.length > 0 && {
          items: {
            create: items.map((item: any) => ({
              description: item.description || '',
              amount: parseFloat(item.amount || 0),
              category: item.category || 'OTHER',
            })),
          },
        }),
      },
      include: {
        items: true,
        attachments: true,
        approvals: true,
        expenseAccount: true,
        paymentAccount: true,
      },
    });

    return NextResponse.json(voucher);
  } catch (error) {
    console.error('Error updating expense voucher:', error);
    return NextResponse.json(
      { error: 'Failed to update expense voucher: ' + (error as Error).message },
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

    await prisma.expenseVoucher.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense voucher:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense voucher' },
      { status: 500 }
    );
  }
}