import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    
    // Allow payment creation by authorized roles
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { loanId, paymentDate, amount } = body;

    const loan = await prisma.loan.findUnique({
      where: { id: loanId }
    });

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    // Simple interest logic for payment split (can be improved)
    // For now, assuming payment goes to interest first then principal? 
    // Or just simple deduction. Frontend doesn't send split, so we calculate.
    // Let's keep it simple: just track payment.
    // Real logic would calculate interest accrued since last payment.
    
    // For this MVP: 
    // 1. Calculate new outstanding
    const newOutstanding = loan.outstandingAmount - amount;

    // 2. Create Payment Record
    const payment = await prisma.loanPayment.create({
      data: {
        loanId,
        paymentDate: new Date(paymentDate),
        amount,
        principalPaid: amount, // Simplifying for now
        interestPaid: 0,
        outstandingBalance: newOutstanding
      }
    });

    // 3. Update Loan Outstanding
    await prisma.loan.update({
      where: { id: loanId },
      data: { 
        outstandingAmount: newOutstanding,
        status: newOutstanding <= 0 ? "CLOSED" : "ACTIVE"
      }
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error creating loan payment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
