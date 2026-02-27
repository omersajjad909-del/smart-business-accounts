import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function requireEntitlement(req: Request, entitlement: string) {
  const companyId = await resolveCompanyId(req as any);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true, subscriptionStatus: true },
  });

  const plan = (company?.plan || "STARTER").toUpperCase();
  const status = (company?.subscriptionStatus || "ACTIVE").toUpperCase();

  if (status !== "ACTIVE") {
    return NextResponse.json({ error: "Subscription inactive" }, { status: 402 });
  }

  // MVP: only PRO plan unlocks advanced reports/features
  if (entitlement === "proReports" && plan !== "PRO") {
    return NextResponse.json({ error: "Upgrade required" }, { status: 402 });
  }

  return null;
}

