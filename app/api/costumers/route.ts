import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { resolveCompanyId } from "@/lib/tenant";
import { safeDecryptField } from "@/lib/fieldEncrypt";

// ✅ Prisma singleton (dev safe)
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

    return NextResponse.json(customers.map(c => ({ ...c, phone: safeDecryptField(c.phone) })));
  } catch (err) {
    console.error("❌ CUSTOMERS API ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 }
    );
  }
}

