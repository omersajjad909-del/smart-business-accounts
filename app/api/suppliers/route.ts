import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { safeDecryptFields } from "@/lib/fieldEncrypt";

const ACCOUNT_PII_FIELDS = ["phone", "ntn", "strn", "bankIban"] as const;

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const suppliers = await prisma.account.findMany({
    where: { partyType: "SUPPLIER", companyId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(suppliers.map(s => safeDecryptFields(s, ACCOUNT_PII_FIELDS)));
}

