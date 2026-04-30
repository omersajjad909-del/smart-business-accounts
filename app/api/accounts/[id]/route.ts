import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

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
    const role = req.headers.get("x-user-role");

    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Tenant isolation: companyId MUST be present and match
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company context required" }, { status: 400 });
    }

    const invoices = await prisma.salesInvoice.findMany({
      where: {
        customerId: params.id,
        companyId,            // ← tenant isolation: only this company's invoices
      },
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
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 });
  }
}
