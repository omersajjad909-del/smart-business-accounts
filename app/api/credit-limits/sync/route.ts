import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

// Returns the current outstanding receivable for a customer account, used to sync credit limit usage.
export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const customerId = req.nextUrl.searchParams.get("customerId");
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });

  const account = await prisma.account.findFirst({
    where: { id: customerId, companyId },
    select: { openDebit: true, openCredit: true },
  });

  if (!account) return NextResponse.json({ used: 0 });

  const used = Math.max(Number(account.openDebit || 0) - Number(account.openCredit || 0), 0);
  return NextResponse.json({ used });
}
