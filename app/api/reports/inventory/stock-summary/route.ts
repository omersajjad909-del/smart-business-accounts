import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

type ItemWithInventory = Prisma.ItemNewGetPayload<{
  include: {
    inventoryTxns: true;
  };
}>;

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

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const asOn = dateParam ? new Date(`${dateParam}T23:59:59.999`) : new Date();

    const items = await prisma.itemNew.findMany({
      where: { companyId, deletedAt: null },
      include: {
        inventoryTxns: {
          where: {
            companyId,
            date: { lte: asOn },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const rows = items.map((item: ItemWithInventory) => ({
      itemId: item.id,
      itemName: item.name,
      description: item.description || "",
      unit: item.unit || "",
      stockQty: item.inventoryTxns.reduce((sum, txn) => sum + Number(txn.qty || 0), 0),
    }));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[stock-summary] Failed to load stock summary.", error);
    return NextResponse.json([], { status: 500 });
  }
}
