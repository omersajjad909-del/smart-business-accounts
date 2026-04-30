import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
type ItemWithTxns = Prisma.ItemNewGetPayload<{
  include: {
    inventoryTxns: true;
  };
}>;


export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const items = await prisma.itemNew.findMany({
    where: { companyId },
    include: { inventoryTxns: { where: { companyId } } },
  });

const report = items.map((item: ItemWithTxns) => {
  const stock = item.inventoryTxns.reduce(
    (s: number, t: { qty: number }) => s + Number(t.qty || 0),
    0
  );

  return {
    item: item.name,
    stock,
  };
});

  return NextResponse.json(report);
}

