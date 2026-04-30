import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const txns = await prisma.inventoryTxn.findMany({
      where: { companyId },
      include: { item: { select: { name: true, unit: true } } },
    });

    const map: Record<string, Any> = {};

    for (const t of txns) {
      // Key format: Location-ItemID
      const key = `${t.location}_${t.itemId}`;

      if (!map[key]) {
        map[key] = {
          location: t.location,
          itemName: t.item.name,
          unit: t.item.unit,
          qty: 0,
        };
      }

      // If sales quantities are already stored as negative values, simply sum them.
      // Otherwise use the existing type-based logic below:
      map[key].qty += t.qty; 
    }

    // Show only items with a non-zero stock balance.
    const result = Object.values(map).filter((r: any) => r.qty !== 0);
    
    // Sort by location.
    result.sort((a: any, b: any) => a.location.localeCompare(b.location));

    return NextResponse.json(result);
  } catch (e) {
    console.error("LOCATION STOCK ERROR:", e);
    return NextResponse.json([]);
  }
}

