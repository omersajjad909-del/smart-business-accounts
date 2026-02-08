import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const loanId = searchParams.get("loanId");

    if (!loanId) {
      return NextResponse.json({ error: "Loan ID required" }, { status: 400 });
    }

    const payments = await prisma.loanPayment.findMany({
      where: { loanId },
      orderBy: { paymentDate: 'desc' }
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching loan payments:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
