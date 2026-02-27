import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";

export async function GET(req: Request) {
  try {
    const companyId = await resolveCompanyId(req as any);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const userId = (req as any).headers.get("x-user-id");
    const userRole = (req as any).headers.get("x-user-role");
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_DASHBOARD, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ================= TOTAL SALES =================
    const sales = await prisma.salesInvoice.aggregate({
      where: { companyId },
      _sum: { total: true },
    });

    // ================= STOCK VALUE =================
    const items = await prisma.itemNew.findMany({
      where: { companyId },
      include: { inventoryTxns: true },
    });

    type ItemWithTxns = Prisma.ItemNewGetPayload<{
  include: { inventoryTxns: true };
}>;


    let stockValue = 0;

items.forEach((item: ItemWithTxns) => {
  let qty = 0;
  let lastRate = 0;

  item.inventoryTxns.forEach((t) => {
    qty += t.qty;
    if (t.rate > 0) {
      lastRate = t.rate;
    }
  });

  stockValue += qty * lastRate;
});

    return NextResponse.json({
      totalSales: sales._sum.total || 0,
      stockValue: Math.round(stockValue),
    });

  } catch (e) {
    console.error("❌ DASHBOARD ERROR:", e);
    return NextResponse.json(
      { error: "Dashboard failed" },
      { status: 500 }
    );
  }
}

