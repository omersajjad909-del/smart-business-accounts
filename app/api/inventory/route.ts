import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

import { resolveCompanyId } from "@/lib/tenant";


export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  type ItemWithTxns = Prisma.ItemNewGetPayload<{
  include: { inventoryTxns: true };
}>;

  const items = await prisma.itemNew.findMany({
    where: { companyId },
    include: { inventoryTxns: { where: { companyId } } },
  });

  const stock = items.map((item: ItemWithTxns) => ({
    itemId:   item.id,
    code:     item.code,
    name:     item.name,
    unit:     item.unit,
    rate:     item.rate,
    minStock: item.minStock,
    barcode:  item.barcode || "",
    qty:      item.inventoryTxns.reduce((s, t) => s + t.qty, 0),
  }));


  return NextResponse.json(stock);
}

