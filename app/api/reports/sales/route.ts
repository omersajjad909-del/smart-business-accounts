import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";

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
    const itemSearch     = searchParams.get("item") || "";
    const unitFilter     = searchParams.get("unit") || "";
    const statusFilter   = searchParams.get("status") || "";

    const fromDate = from ? new Date(from + "T00:00:00") : undefined;
    const toDate   = to   ? new Date(to   + "T23:59:59.999") : undefined;

    // ── 1. SalesInvoice rows ─────────────────────────────────────────────────
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

    const existingInvoiceNos = new Set(invoices.map(inv => inv.invoiceNo));

    const rows = invoices.flatMap(inv =>
      inv.items
        .filter(it => {
          if (itemSearch && !it.item?.name?.toLowerCase().includes(itemSearch.toLowerCase())) return false;
          if (unitFilter && it.item?.unit?.toUpperCase() !== unitFilter.toUpperCase()) return false;
          return true;
        })
        .map(it => ({
          date:      inv.date.toISOString().slice(0, 10),
          invoiceNo: inv.invoiceNo,
          customer:  inv.customer?.name || "",
          item:      it.item?.name || "",
          unit:      it.item?.unit || "",
          qty:       Number(it.qty),
          rate:      Number(it.rate),
          amount:    Number(it.amount),
          status:    inv.approvalStatus,
        }))
    );

    // ── 2. POS business_records not yet in SalesInvoice ──────────────────────
    // statusFilter "APPROVED" matches POS sales; skip if filtering for other statuses
    if (!statusFilter || statusFilter === "APPROVED") {
      const posRecords = await prisma.businessRecord.findMany({
        where: {
          companyId,
          category: "pos_sale",
          createdAt: { gte: fromDate, lte: toDate },
          ...(branchId ? { branchId } : {}),
        },
        orderBy: { createdAt: "asc" },
      });

      // Collect all itemNewIds from carts
      const itemIds = [...new Set(
        posRecords.flatMap(r => {
          const cart = (r.data as any)?.cart as any[] | undefined;
          return (cart || []).map((i: any) => i.itemNewId).filter(Boolean);
        })
      )];

      const itemMap = new Map<string, { name: string; unit: string }>();
      if (itemIds.length > 0) {
        const itemList = await prisma.itemNew.findMany({
          where: { id: { in: itemIds }, companyId },
          select: { id: true, name: true, unit: true },
        });
        itemList.forEach(i => itemMap.set(i.id, { name: i.name, unit: i.unit || "" }));
      }

      for (const r of posRecords) {
        // Skip if already recorded as SalesInvoice
        if (existingInvoiceNos.has(r.title)) continue;
        // Skip if customer filter applied (business_records don't link to customer accounts)
        if (customerId && customerId !== "all") continue;

        const cart: any[] = (r.data as any)?.cart || [];
        const date = r.createdAt.toISOString().slice(0, 10);
        const customerName = (r.data as any)?.customerName || "Walk-in";

        for (const ci of cart) {
          if (!ci.itemNewId) continue;
          const item = itemMap.get(ci.itemNewId);
          if (itemSearch && !item?.name?.toLowerCase().includes(itemSearch.toLowerCase())) continue;
          if (unitFilter && item?.unit?.toUpperCase() !== unitFilter.toUpperCase()) continue;

          rows.push({
            date,
            invoiceNo: r.title,
            customer:  customerName,
            item:      item?.name || ci.name || "",
            unit:      item?.unit || "",
            qty:       Number(ci.qty),
            rate:      Number(ci.price),
            amount:    Number(ci.qty) * Number(ci.price),
            status:    "APPROVED",
          });
        }
      }

      rows.sort((a, b) => a.date.localeCompare(b.date) || a.invoiceNo.localeCompare(b.invoiceNo));
    }

    return NextResponse.json(rows);
  } catch (e) {
    console.error("SALES REPORT ERROR:", e);
    return NextResponse.json([], { status: 500 });
  }
}
