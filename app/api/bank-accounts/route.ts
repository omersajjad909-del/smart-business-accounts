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

    // Get banks from BankAccount table (with full details)
    const bankAccountsFromTable = await prisma.bankAccount.findMany({
      where: { companyId },
      include: {
        account: true,
        statements: true,
        reconciliations: { orderBy: { reconcileDate: 'desc' }, take: 1 },
      },
    });

    // Get banks from Account table (partyType = "BANKS") jo BankAccount table mein nahi hain
    const allBankAccounts = await prisma.account.findMany({
      where: { partyType: "BANKS", companyId },
      include: {
        bankAccounts: true,
      },
    });

    // Combine both: BankAccount table se + Account table se (jo BankAccount mein nahi hain)
    const combinedAccounts = bankAccountsFromTable.map((ba: Any) => ({
      id: ba.id,
      accountNo: ba.accountNo,
      bankName: ba.bankName,
      accountName: ba.accountName,
      balance: ba.balance,
      accountId: ba.accountId,
      account: ba.account,
      statements: ba.statements,
      reconciliations: ba.reconciliations,
      source: 'BankAccount', // Track source
    }));

    // Add accounts from Account table that don't have BankAccount entry
    for (const acc of allBankAccounts) {
      if (!acc.bankAccounts || acc.bankAccounts.length === 0) {
        // Extract bank name and account number
        const nameParts = acc.name.split(" - ");
        const bankName = nameParts[0] || acc.name;
        const accountNo = nameParts[1] || acc.code;

        combinedAccounts.push({
          id: acc.id, // Use account ID as temporary ID
          accountNo: accountNo,
          bankName: bankName,
          accountName: acc.name,
          balance: acc.openDebit || 0,
          accountId: acc.id,
          account: acc,
          statements: [],
          reconciliations: [],
          source: 'Account', // Track source
        });
      }
    }

    return NextResponse.json(combinedAccounts);
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank accounts' },
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
    const { accountNo, bankName, accountName, balance } = body;

    // Validation
    if (!accountNo || !bankName || !accountName) {
      return NextResponse.json(
        { error: 'Bank Name, Account No, and Account Name are required' },
        { status: 400 }
      );
    }

    // Check if account number already exists
    const existingBank = await prisma.bankAccount.findFirst({
      where: { accountNo, companyId },
    });

    if (existingBank) {
      return NextResponse.json(
        { error: 'Bank account number already exists' },
        { status: 400 }
      );
    }

    // First create or find the parent Account in Ledger
    let account = await prisma.account.findFirst({
      where: { name: `${bankName} - ${accountNo}`, companyId },
    });

    if (!account) {
      // Generate unique code for bank (e.g., BNK-0001, BNK-0002)
      const bankCount = await prisma.account.count({
        where: { type: 'BANK', companyId },
      });
      const bankCode = `BNK-${String(bankCount + 1).padStart(4, '0')}`;

      account = await prisma.account.create({
        data: {
          code: bankCode,
          name: `${bankName} - ${accountNo}`,
          type: 'BANK',
          partyType: 'BANKS', // 🔥 یہ ledger میں show ہوگا
          openDebit: balance || 0, // شروعاتی balance
          companyId,
        },
      });
    } else {
      // Update existing account to ensure partyType is BANKS
      account = await prisma.account.update({
        where: { id: account.id },
        data: {
          partyType: 'BANKS',
          openDebit: balance || 0,
        },
      });
    }

    // Now create the BankAccount in BankAccount table
    const bankAccount = await prisma.bankAccount.create({
      data: {
        accountNo,
        bankName,
        accountName,
        accountId: account.id,
        balance: balance || 0,
        companyId,
      },
      include: { account: true },
    });

    return NextResponse.json(bankAccount, { status: 201 });
  } catch (error) {
    console.error('Error creating bank account:', error);
    return NextResponse.json(
      { error: 'Failed to create bank account: ' + (error as Error).message },
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
    const { id, accountNo, bankName, accountName, balance } = body;

    // Get the bank account first
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id, companyId },
      include: { account: true },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // Update the BankAccount
    const updated = await prisma.bankAccount.update({
      where: { id },
      data: {
        ...(accountNo && { accountNo }),
        ...(bankName && { bankName }),
        ...(accountName && { accountName }),
        ...(balance !== undefined && { balance }),
      },
      include: { account: true },
    });

    // Also update the linked Account in ledger
    if (bankAccount.accountId) {
      await prisma.account.update({
        where: { id: bankAccount.accountId },
        data: {
          ...(bankName && accountNo && { name: `${bankName} - ${accountNo}` }),
          ...(balance !== undefined && { openDebit: balance }),
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating bank account:', error);
    return NextResponse.json(
      { error: 'Failed to update bank account' },
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
        { error: 'ID required' },
        { status: 400 }
      );
    }

    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!bankAccount) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // Check if bank account has statements or reconciliations
    const hasStatements = await prisma.bankStatement.findFirst({
      where: { bankAccountId: id, companyId },
    });
    const hasReconciliations = await prisma.bankReconciliation.findFirst({
      where: { bankAccountId: id, companyId },
    });

    if (hasStatements || hasReconciliations) {
      return NextResponse.json(
        { error: 'Cannot delete: Bank account has transactions' },
        { status: 400 }
      );
    }

    await prisma.bankAccount.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json(
      { error: 'Failed to delete bank account' },
      { status: 500 }
    );
  }
}

