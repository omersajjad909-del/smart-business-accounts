import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bankAccountId = searchParams.get('bankAccountId');

    if (bankAccountId) {
      const reconciliation = await prisma.bankReconciliation.findMany({
        where: { bankAccountId },
        include: {
          bankAccount: true,
          statements: true,
        },
        orderBy: { reconcileDate: 'desc' },
      });
      return NextResponse.json(reconciliation);
    }

    const allReconciliations = await prisma.bankReconciliation.findMany({
      include: {
        bankAccount: true,
        statements: true,
      },
      orderBy: { reconcileDate: 'desc' },
    });

    return NextResponse.json(allReconciliations);
  } catch (error) {
    console.error('Error fetching reconciliations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reconciliations' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      bankAccountId,
      reconcileDate,
      systemBalance,
      bankBalance,
      statementIds,
      narration,
    } = body;

    const difference = Math.abs(systemBalance - bankBalance);

    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        bankAccountId,
        reconcileDate: new Date(reconcileDate),
        systemBalance,
        bankBalance,
        difference,
        narration,
        statements: {
          connect: statementIds?.map((id: string) => ({ id })) || [],
        },
      },
      include: {
        bankAccount: true,
        statements: true,
      },
    });

    // Update bank statements as reconciled
    if (statementIds && statementIds.length > 0) {
      await prisma.bankStatement.updateMany({
        where: { id: { in: statementIds } },
        data: { isReconciled: true },
      });
    }

    return NextResponse.json(reconciliation, { status: 201 });
  } catch (error) {
    console.error('Error creating reconciliation:', error);
    return NextResponse.json(
      { error: 'Failed to create reconciliation' },
      { status: 500 }
    );
  }
}
