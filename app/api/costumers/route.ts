import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

// ✅ Prisma singleton (dev safe)
const prisma =
  (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    // ✅ ROLE FROM HEADER (SINGLE SOURCE OF TRUTH)
    const role = req.headers.get("x-user-role");

    // ✅ ALLOW ADMIN + ACCOUNTANT ONLY
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    // ✅ DATA
    const customers = await prisma.account.findMany({
      where: { partyType: "CUSTOMER", companyId },
      select: {
        id: true,
        name: true,
        phone: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(customers);
  } catch (err) {
    console.error("❌ CUSTOMERS API ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 }
    );
  }
}
