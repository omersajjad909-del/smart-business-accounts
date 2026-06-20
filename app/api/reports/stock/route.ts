import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const asOn       = searchParams.get("asOn");
    const unitFilter = searchParams.get("unit");

    const asOnDate = asOn ? new Date(asOn + "T23:59:59.999") : new Date();

    const items = await prisma.itemNew.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        unit: true,
        description: true,
        code: true,
        inventoryTxns: {
          where: { companyId, date: { lte: asOnDate } },
          select: { qty: true, rate: true, type: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = items
      .filter(item => !unitFilter || (item.unit || "").toUpperCase() === unitFilter.toUpperCase())
      .map(item => {
        let purchasedQty  = 0;
        let soldQty       = 0;
        let purchasedAmt  = 0;
        let soldAmt       = 0;

        item.inventoryTxns.forEach(t => {
          const q = Number(t.qty || 0);
          const r = Number(t.rate || 0);
          if (q > 0) {
            // PURCHASE or SALE_RETURN — inward
            purchasedQty += q;
            purchasedAmt += q * r;
          } else if (q < 0) {
            // SALE — outward (qty stored as negative)
            soldQty  += Math.abs(q);
            soldAmt  += Math.abs(q) * r;
          }
        });

        const remainingQty = purchasedQty - soldQty;
        // Weighted average rate for remaining value
        const avgRate      = purchasedQty > 0 ? purchasedAmt / purchasedQty : 0;
        const remainingAmt = remainingQty > 0 ? Math.round(remainingQty * avgRate) : 0;

        return {
          itemId:       item.id,
          itemCode:     item.code || "",
          itemName:     item.name,
          unit:         item.unit,
          description:  item.description || "",
          purchasedQty,
          soldQty,
          remainingQty,
          purchasedAmt: Math.round(purchasedAmt),
          soldAmt:      Math.round(soldAmt),
          remainingAmt,
          // legacy fields kept for backward compat
          stockQty:     remainingQty,
          stockValue:   remainingAmt,
        };
      });

    return NextResponse.json(result);
  } catch (e) {
    console.error("STOCK REPORT ERROR:", e);
    return NextResponse.json([], { status: 500 });
  }
}
