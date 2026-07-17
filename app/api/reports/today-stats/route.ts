import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const branchId = await resolveBranchId(req, companyId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const branchClause = branchId ? Prisma.sql`AND si."branchId" = ${branchId}` : Prisma.empty;

    const [[salesRow], [pendingRow], [lowStockRow]] = await Promise.all([
      prisma.$queryRaw<[{ total: number; count: bigint }]>`
        SELECT
          COALESCE(SUM(COALESCE(ct."amountInBase", si."total")), 0)::float AS total,
          COUNT(si."id") AS count
        FROM "SalesInvoice" si
        LEFT JOIN "CurrencyTransaction" ct
          ON ct."transactionId" = si."id" AND ct."transactionType" = 'INVOICE'
        WHERE si."companyId" = ${companyId}
          AND si."deletedAt" IS NULL
          AND si."date" >= ${todayStart}
          AND si."date" < ${todayEnd}
          ${branchClause}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(si."id") AS count
        FROM "SalesInvoice" si
        LEFT JOIN "Account" a ON a."id" = si."customerId"
        WHERE si."companyId" = ${companyId}
          AND si."deletedAt" IS NULL
          AND (si."date" + ((COALESCE(a."creditDays", 30))::text || ' days')::interval) < ${now}
          ${branchClause}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(i."id") AS count
        FROM "ItemNew" i
        LEFT JOIN (
          SELECT "itemId", COALESCE(SUM("qty"), 0)::float AS qty
          FROM "InventoryTxn"
          WHERE "companyId" = ${companyId}
          GROUP BY "itemId"
        ) stock ON stock."itemId" = i."id"
        WHERE i."companyId" = ${companyId}
          AND i."deletedAt" IS NULL
          AND i."minStock" > 0
          AND COALESCE(stock.qty, 0) < i."minStock"
      `,
    ]);

    return NextResponse.json({
      todaySales: Number(salesRow.total || 0),
      todayOrders: Number(salesRow.count || 0),
      pendingCount: Number(pendingRow.count || 0),
      lowStockCount: Number(lowStockRow.count || 0),
    });
  } catch (e: any) {
    console.error("TODAY STATS ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
