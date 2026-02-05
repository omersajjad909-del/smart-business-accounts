import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const bankAccountId = searchParams.get('bankAccountId');

    if (bankAccountId) {
      const reconciliation = await prisma.bankReconciliation.findMany({
        where: { bankAccountId, companyId },
        include: {
          bankAccount: true,
          statements: true,
        },
        orderBy: { reconcileDate: 'desc' },
      });
      return NextResponse.json(reconciliation);
    }

    const allReconciliations = await prisma.bankReconciliation.findMany({
      where: { companyId },
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
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

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

    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id: bankAccountId, companyId },
      select: { id: true },
    });
    if (!bankAccount) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    if (statementIds && statementIds.length > 0) {
      const validStatements = await prisma.bankStatement.findMany({
        where: { id: { in: statementIds }, companyId, bankAccountId },
        select: { id: true },
      });
      if (validStatements.length !== statementIds.length) {
        return NextResponse.json(
          { error: "One or more statements not found for this bank account" },
          { status: 404 }
        );
      }
    }

    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        bankAccountId,
        reconcileDate: new Date(reconcileDate),
        systemBalance,
        bankBalance,
        difference,
        narration,
        companyId,
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
        where: { id: { in: statementIds }, companyId },
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
