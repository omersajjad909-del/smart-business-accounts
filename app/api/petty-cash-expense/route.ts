import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const pettyCashId = searchParams.get("pettyCashId");

    if (!pettyCashId) {
      return NextResponse.json({ error: "Petty Cash ID required" }, { status: 400 });
    }

    const expenses = await prisma.expenseVoucher.findMany({
      where: {
        companyId,
        paymentAccountId: pettyCashId,
      },
      include: {
        items: true,
      },
      orderBy: { date: "desc" },
    });

    const formatted = expenses.map((exp) => ({
      id: exp.id,
      pettyCashId: exp.paymentAccountId,
      date: exp.date.toISOString().split("T")[0],
      voucherNumber: exp.voucherNo,
      description: exp.description,
      amount: exp.totalAmount,
      category: exp.items[0]?.category || "OTHER",
      createdAt: exp.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching petty cash expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}
