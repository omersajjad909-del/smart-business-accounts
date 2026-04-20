import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!role || (role !== "ADMIN" && role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    const branchId = await resolveBranchId(req, companyId);

    const { searchParams } = new URL(req.url);
    const from           = searchParams.get("from");
    const to             = searchParams.get("to");
    const customerId     = searchParams.get("customerId") || undefined;
    const itemSearch     = searchParams.get("item") || "";       // item name search
    const unitFilter     = searchParams.get("unit") || "";       // unit filter
    const statusFilter   = searchParams.get("status") || "";     // approvalStatus filter

    const fromDate = from ? new Date(from + "T00:00:00") : undefined;
    const toDate   = to   ? new Date(to   + "T23:59:59.999") : undefined;

    const invoices = await prisma.salesInvoice.findMany({
      where: {
        deletedAt: null,
        date: { gte: fromDate, lte: toDate },
        customerId: customerId && customerId !== "all" ? customerId : undefined,
        companyId,
        ...(branchId ? { branchId } : {}),
        ...(statusFilter ? { approvalStatus: statusFilter } : {}),
      },
      include: {
        customer: { select: { name: true } },
        items: {
          include: { item: { select: { name: true, unit: true } } },
        },
      },
      orderBy: { date: "asc" },
    });

    const rows = invoices.flatMap(inv =>
      inv.items
        .filter(it => {
          if (itemSearch && !it.item?.name?.toLowerCase().includes(itemSearch.toLowerCase())) return false;
          if (unitFilter && it.item?.unit !== unitFilter) return false;
          return true;
        })
        .map(it => ({
          date:       inv.date.toISOString().slice(0, 10),
          invoiceNo:  inv.invoiceNo,
          customer:   inv.customer?.name || "",
          item:       it.item?.name || "",
          unit:       it.item?.unit || "",
          qty:        Number(it.qty),
          rate:       Number(it.rate),
          amount:     Number(it.amount),
          status:     inv.approvalStatus,
        }))
    );

    return NextResponse.json(rows);
  } catch (e) {
    console.error("SALES REPORT ERROR:", e);
    return NextResponse.json([], { status: 500 });
  }
}
