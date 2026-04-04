import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { Products, CountryCode } from 'plaid';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    const configs = {
      user: { client_user_id: userId },
      client_name: 'FinovaOS',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us], // Can be dynamic based on company country
      language: 'en',
    };

    const createTokenResponse = await plaidClient.linkTokenCreate(configs);
    return NextResponse.json(createTokenResponse.data);
  } catch (error: any) {
    console.error('Plaid Link Token Error:', error.response?.data || error.message);
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 });
  }
}
