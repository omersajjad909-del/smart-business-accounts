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
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const asOn = searchParams.get("asOn");
    const unitFilter = searchParams.get("unit"); // "" or specific unit

    const asOnDate = asOn ? new Date(asOn + "T23:59:59.999") : new Date();

    const items = await prisma.itemNew.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        unit: true,
        description: true,
        inventoryTxns: {
          where: {
            companyId,
            date: { lte: asOnDate },
          },
          select: { qty: true, rate: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = items
      .filter(item => !unitFilter || item.unit === unitFilter)
      .map(item => {
        let totalQty = 0;
        let calculatedValue = 0;
        item.inventoryTxns.forEach(t => {
          totalQty += Number(t.qty || 0);
          calculatedValue += Number(t.qty || 0) * Number(t.rate || 0);
        });
        return {
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          description: item.description || "",
          stockQty: totalQty,
          stockValue: totalQty <= 0 ? 0 : Math.round(calculatedValue),
        };
      });

    return NextResponse.json(result);
  } catch (e) {
    console.error("STOCK REPORT ERROR:", e);
    return NextResponse.json([], { status: 500 });
  }
}
