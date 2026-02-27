import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
import { logActivity } from "@/lib/audit";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || null;
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const created: Record<string, number> = { accounts: 0, items: 0 };

    const existingCustomer = await prisma.account.findFirst({
      where: { name: { equals: "Demo Customer", mode: "insensitive" }, companyId },
    });
    if (!existingCustomer) {
      await prisma.account.create({
        data: { name: "Demo Customer", code: "CUST-DEMO", type: "ASSET", companyId },
      });
      created.accounts += 1;
    }

    const existingSupplier = await prisma.account.findFirst({
      where: { name: { equals: "Demo Supplier", mode: "insensitive" }, companyId },
    });
    if (!existingSupplier) {
      await prisma.account.create({
        data: { name: "Demo Supplier", code: "SUPP-DEMO", type: "LIABILITY", companyId },
      });
      created.accounts += 1;
    }

    const existingCash = await prisma.account.findFirst({
      where: { name: { equals: "Cash", mode: "insensitive" }, companyId },
    });
    if (!existingCash) {
      await prisma.account.create({
        data: { name: "Cash", code: "CASH-DEMO", type: "ASSET", companyId },
      });
      created.accounts += 1;
    }

    const existingItem = await prisma.itemNew.findFirst({
      where: { name: { equals: "Demo Widget", mode: "insensitive" }, companyId },
    });
    if (!existingItem) {
      await prisma.itemNew.create({
        data: {
          companyId,
          name: "Demo Widget",
          code: "ITEM-DEMO",
          description: "Sample item for demo",
          unit: "PCS",
          rate: 100,
          minStock: 0,
          barcode: null,
        },
      });
      created.items += 1;
    }

    await logActivity(prisma, {
      companyId,
      userId,
      action: "DEMO_SEED",
      details: JSON.stringify(created),
    });

    return NextResponse.json({ success: true, created });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Seed failed" }, { status: 500 });
  }
}
