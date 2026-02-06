import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const companyId = await resolveCompanyId(request);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const advances = await prisma.advancePayment.findMany({
      where: { companyId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        adjustments: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(advances);
  } catch (error) {
    console.error("Error fetching advances:", error);
    return NextResponse.json(
      { error: "Failed to fetch advances" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const companyId = await resolveCompanyId(request);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await request.json();
    const { advanceNo, date, amount, supplierId, narration } = body;

    // Validate
    if (!advanceNo || !date || !amount || !supplierId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check for duplicate advanceNo
    const existing = await prisma.advancePayment.findUnique({
      where: { advanceNo },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Advance number already exists" },
        { status: 400 }
      );
    }

    const advance = await prisma.advancePayment.create({
      data: {
        companyId,
        advanceNo,
        date: new Date(date),
        amount,
        balance: amount,
        adjustedAmount: 0,
        status: "OPEN",
        supplierId,
        narration,
      },
    });

    return NextResponse.json(advance);
  } catch (error) {
    console.error("Error creating advance:", error);
    return NextResponse.json(
      { error: "Failed to create advance" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, invoiceNo, adjustedAmount, date, remarks } = body;

    if (!id || !invoiceNo || !adjustedAmount || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const advance = await prisma.advancePayment.findUnique({
      where: { id },
    });

    if (!advance) {
      return NextResponse.json(
        { error: "Advance payment not found" },
        { status: 404 }
      );
    }

    if (adjustedAmount > advance.balance) {
      return NextResponse.json(
        { error: "Adjusted amount exceeds balance" },
        { status: 400 }
      );
    }

    // Transaction to update advance and create adjustment
    const result = await prisma.$transaction(async (tx) => {
      // Create adjustment
      await tx.advanceAdjustment.create({
        data: {
          advancePaymentId: id,
          invoiceNo,
          amount: adjustedAmount,
          date: new Date(date),
          remarks,
        },
      });

      // Update advance
      const newAdjustedAmount = advance.adjustedAmount + adjustedAmount;
      const newBalance = advance.amount - newAdjustedAmount;
      const newStatus = newBalance <= 0 ? "CLOSED" : "ADJUSTED";

      const updatedAdvance = await tx.advancePayment.update({
        where: { id },
        data: {
          adjustedAmount: newAdjustedAmount,
          balance: newBalance,
          status: newStatus,
        },
      });

      return updatedAdvance;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error adjusting advance:", error);
    return NextResponse.json(
      { error: "Failed to adjust advance" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id" },
        { status: 400 }
      );
    }

    await prisma.advancePayment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting advance:", error);
    return NextResponse.json(
      { error: "Failed to delete advance" },
      { status: 500 }
    );
  }
}
