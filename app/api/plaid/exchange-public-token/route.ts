import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { prisma } from '@/lib/prisma';
import { getTokenFromRequest, verifyJwt } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { publicToken, companyId } = await req.json();

    // Verify user is authorized for this company
    const token = getTokenFromRequest(req);
    const payload = token ? verifyJwt(token) : null;
    if (!payload || payload.companyId !== companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Exchange public token for access token
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const { access_token, item_id } = response.data;

    // Get account details from Plaid to create local bank accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token,
    });

    const plaidAccounts = accountsResponse.data.accounts;

    // Create/Update bank accounts in our database
    for (const acc of plaidAccounts) {
      const accountNo = String(acc.mask || acc.account_id);
      const bankName = String(acc.official_name || acc.name || "Bank");
      const accountName = String(acc.name || bankName);
      const balance = Number(acc.balances.available ?? acc.balances.current ?? 0);

      let ledgerAccount = await prisma.account.findFirst({
        where: { name: `${bankName} - ${accountNo}`, companyId },
      });

      if (!ledgerAccount) {
        const bankCount = await prisma.account.count({
          where: { type: "BANK", companyId },
        });
        const bankCode = `BNK-${String(bankCount + 1).padStart(4, "0")}`;
        ledgerAccount = await prisma.account.create({
          data: {
            code: bankCode,
            name: `${bankName} - ${accountNo}`,
            type: "BANK",
            partyType: "BANKS",
            openDebit: balance || 0,
            companyId,
          },
        });
      }

      const existing = await prisma.bankAccount.findFirst({
        where: { companyId, institutionId: acc.account_id },
        select: { id: true },
      });

      if (existing?.id) {
        await prisma.bankAccount.update({
          where: { id: existing.id },
          data: {
            bankName,
            accountNo,
            accountName,
            balance,
            accountId: ledgerAccount.id,
            plaidAccessToken: access_token,
            plaidItemId: item_id,
            institutionId: acc.account_id,
            isPlaidLinked: true,
          },
        });
      } else {
        await prisma.bankAccount.create({
          data: {
            companyId,
            bankName,
            accountNo,
            accountName,
            balance,
            accountId: ledgerAccount.id,
            plaidAccessToken: access_token,
            plaidItemId: item_id,
            institutionId: acc.account_id,
            isPlaidLinked: true,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Plaid Exchange Error:', error.response?.data || error.message);
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 });
  }
}
