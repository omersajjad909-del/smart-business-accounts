import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/businessModules";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const { businessType } = await req.json() as { businessType: BusinessType };
    if (!businessType) return NextResponse.json({ error: "businessType required" }, { status: 400 });

    const meta = BUSINESS_TYPES.find(b => b.id === businessType);
    if (!meta) return NextResponse.json({ error: "Invalid business type" }, { status: 400 });

    // Check existing accounts to avoid duplicates
    const existingCodes = await prisma.account.findMany({
      where: { companyId },
      select: { code: true },
    });
    const existingCodeSet = new Set(existingCodes.map(a => a.code));

    // Create default accounts that don't already exist
    const toCreate = meta.defaultAccounts.filter(a => !existingCodeSet.has(a.code));

    if (toCreate.length > 0) {
      await prisma.account.createMany({
        data: toCreate.map(a => ({
          companyId,
          code: a.code,
          name: a.name,
          type: a.type,
        })),
        skipDuplicates: true,
      });
    }

    // Save business type and mark setup done
    await prisma.company.update({
      where: { id: companyId },
      data: { businessType, businessSetupDone: true },
    });

    return NextResponse.json({
      success: true,
      businessType,
      accountsCreated: toCreate.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
