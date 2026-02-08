import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        partyType: "CASH",
        deletedAt: null,
      },
      orderBy: { name: "asc" },
    });

    const formatted = accounts.map((acc) => ({
      id: acc.id,
      accountName: acc.name,
      openingBalance: acc.openDebit,
      currentBalance: acc.openDebit, // TODO: Calculate real balance from Vouchers
      description: "",
      isActive: true,
      createdAt: acc.createdAt.toISOString(),
      updatedAt: acc.createdAt.toISOString(), // simplified
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching petty cash accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch petty cash accounts" },
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
    const { accountName, openingBalance, description } = body;

    if (!accountName) {
      return NextResponse.json(
        { error: "Account name is required" },
        { status: 400 }
      );
    }

    // Generate a simple code if not provided logic exists
    const count = await prisma.account.count({
      where: { companyId, partyType: "CASH" },
    });
    const code = `CASH-${String(count + 1).padStart(3, "0")}`;

    const account = await prisma.account.create({
      data: {
        companyId,
        code,
        name: accountName,
        type: "ASSET",
        partyType: "CASH",
        openDebit: Number(openingBalance) || 0,
        openDate: new Date(),
        // description is not in Account model, ignoring or could store in metadata if needed
      },
    });

    return NextResponse.json({
      id: account.id,
      accountName: account.name,
      openingBalance: account.openDebit,
      currentBalance: account.openDebit,
      description: description || "",
      isActive: true,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating petty cash account:", error);
    return NextResponse.json(
      { error: "Failed to create petty cash account" },
      { status: 500 }
    );
  }
}
