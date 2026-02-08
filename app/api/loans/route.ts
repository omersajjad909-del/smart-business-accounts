import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");

    if (!companyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const loans = await prisma.loan.findMany({
      where: { companyId },
      include: {
        account: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(loans);
  } catch (error) {
    console.error("Error fetching loans:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    const companyId = req.headers.get("x-company-id");

    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const body = await req.json();
    const { loanType, accountId, principalAmount, interestRate, tenure, startDate } = body;

    const count = await prisma.loan.count({ where: { companyId } });
    const loanNumber = `LN-${String(count + 1).padStart(4, '0')}`;

    // Simple EMI calculation (if not provided, we can calc roughly or leave 0)
    // Formula: [P x R x (1+R)^N]/[(1+R)^N-1] where R is monthly rate
    let emi = 0;
    if (principalAmount && interestRate && tenure) {
      const r = interestRate / 12 / 100;
      emi = (principalAmount * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1);
    }

    const loan = await prisma.loan.create({
      data: {
        companyId,
        loanNumber,
        loanType,
        accountId,
        principalAmount,
        interestRate,
        tenure,
        emi,
        startDate: new Date(startDate),
        outstandingAmount: principalAmount, // Initial outstanding is principal
        status: "ACTIVE"
      }
    });

    return NextResponse.json(loan);
  } catch (error) {
    console.error("Error creating loan:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    const companyId = req.headers.get("x-company-id");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId || !id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await prisma.loan.delete({
      where: { id, companyId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting loan:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
