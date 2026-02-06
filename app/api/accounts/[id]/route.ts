import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// ✅ Prisma singleton (dev safe)
const prisma =
  (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    // ✅ ROLE FROM HEADER
    const role = req.headers.get("x-user-role");

    // ✅ ACCOUNTS ACCESS
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const invoices = await prisma.salesInvoice.findMany({
      where: { customerId: params.id },
      orderBy: { date: "desc" },
      select: {
        id: true,
        invoiceNo: true,
        date: true,
      },
    });

    return NextResponse.json(invoices);
  } catch (err) {
    console.error("❌ INVOICES ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load invoices" },
      { status: 500 }
    );
  }
}
