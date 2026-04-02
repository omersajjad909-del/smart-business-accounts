/**
 * GET /api/external/expenses           — list purchase invoices (expenses)
 * GET /api/external/expenses?id=<id>   — single purchase invoice with line items
 *
 * Auth: x-api-key or Authorization: Bearer <key>
 *
 * Query params:
 *   from        YYYY-MM-DD
 *   to          YYYY-MM-DD
 *   supplier    string      partial name match
 *   limit       number      default 50, max 200
 *   offset      number
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiSession, unauthResponse, enforceApiPlan } from "../_auth";

export async function GET(req: NextRequest) {
  const session = await resolveApiSession(req);
  if (!session) return unauthResponse();

  const blocked = enforceApiPlan(session, "GET");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // ── Single expense ──────────────────────────────────────────────────
  if (id) {
    const inv = await prisma.purchaseInvoice.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true } },
        items: { include: { item: { select: { name: true, code: true } } } },
      },
    }).catch(() => null);

    if (!inv) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    return NextResponse.json({
      id:        inv.id,
      invoiceNo: inv.invoiceNo,
      date:      inv.date,
      supplier:  inv.supplier,
      items: inv.items.map((li: any) => ({
        id:       li.id,
        itemName: li.item?.name ?? li.itemName ?? "",
        itemCode: li.item?.code ?? "",
        qty:      li.qty,
        price:    li.price,
        total:    Number(li.qty) * Number(li.price),
      })),
      subtotal:  (inv as any).subtotal ?? null,
      tax:       (inv as any).tax ?? null,
      total:     inv.total,
      createdAt: inv.createdAt,
    });
  }

  // ── List expenses ───────────────────────────────────────────────────
  const from     = searchParams.get("from");
  const to       = searchParams.get("to");
  const supplier = searchParams.get("supplier");
  const limit    = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset   = parseInt(searchParams.get("offset") || "0");

  const where: any = {
    companyId: session.companyId,
    deletedAt: null,
  };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to)   where.date.lte = new Date(to);
  }
  if (supplier) {
    where.supplier = { name: { contains: supplier, mode: "insensitive" } };
  }

  const [invoices, total] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.purchaseInvoice.count({ where }),
  ]);

  return NextResponse.json({
    total,
    limit,
    offset,
    expenses: invoices.map((inv: any) => ({
      id:           inv.id,
      invoiceNo:    inv.invoiceNo,
      date:         inv.date,
      supplierId:   inv.supplierId,
      supplierName: inv.supplier?.name ?? "",
      total:        inv.total,
      createdAt:    inv.createdAt,
    })),
  });
}
