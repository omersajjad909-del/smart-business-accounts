import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const bankAccountId = searchParams.get('bankAccountId');
    const isReconciled = searchParams.get('isReconciled');

    const filter: any = { bankAccount: { companyId } };
    if (bankAccountId) filter.bankAccountId = bankAccountId;
    if (isReconciled !== null) filter.isReconciled = isReconciled === 'true';

    const statements = await prisma.bankStatement.findMany({
      where: filter,
      include: { bankAccount: true },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(statements);
  } catch (error) {
    console.error('Error fetching bank statements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank statements' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const {
      bankAccountId,
      statementNo,
      date,
      amount,
      description,
      referenceNo,
    } = body;

    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id: bankAccountId, companyId },
      select: { id: true },
    });
    if (!bankAccount) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    const statement = await prisma.bankStatement.create({
      data: {
        bankAccountId,
        statementNo,
        date: new Date(date),
        amount,
        description,
        referenceNo,
      },
      include: { bankAccount: true },
    });

    return NextResponse.json(statement, { status: 201 });
  } catch (error) {
    console.error('Error creating bank statement:', error);
    return NextResponse.json(
      { error: 'Failed to create bank statement' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const existing = await prisma.bankStatement.findFirst({
      where: { id, bankAccount: { companyId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    const statement = await prisma.bankStatement.update({
      where: { id },
      data: updateData,
      include: { bankAccount: true },
    });

    return NextResponse.json(statement);
  } catch (error) {
    console.error('Error updating bank statement:', error);
    return NextResponse.json(
      { error: 'Failed to update bank statement' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Statement ID is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.bankStatement.findFirst({
      where: { id, bankAccount: { companyId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    await prisma.bankStatement.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Statement deleted successfully' });
  } catch (error) {
    console.error('Error deleting bank statement:', error);
    return NextResponse.json(
      { error: 'Failed to delete bank statement' },
      { status: 500 }
    );
  }
}

