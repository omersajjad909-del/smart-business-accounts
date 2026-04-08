import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId, resolveBranchIdOrDefault } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  const branchId = await resolveBranchId(req, companyId);

  const { searchParams } = new URL(req.url);

  // Auto-generate next GRN number
  if (searchParams.get("nextNo") === "true") {
    const last = await prisma.goodsReceiptNote.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: { grnNo: true },
    });
    let nextNum = 1;
    if (last?.grnNo) {
      const match = last.grnNo.match(/\d+$/);
      if (match) nextNum = parseInt(match[0]) + 1;
    }
    const grnNo = `GRN-${String(nextNum).padStart(3, "0")}`;
    return NextResponse.json({ grnNo });
  }

  const poId = searchParams.get("poId");

  const grns = await prisma.goodsReceiptNote.findMany({
    where: { companyId, deletedAt: null, ...(poId ? { poId } : {}), ...(branchId ? { branchId } : {}) },
    include: {
      supplier: { select: { id: true, name: true } },
      po: { select: { id: true, poNo: true } },
      items: { include: { item: { select: { id: true, name: true, unit: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(grns);
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const branchId = await resolveBranchIdOrDefault(req, companyId);
  const userId = req.headers.get("x-user-id") || undefined;

  const { grnNo, date, poId, supplierId, items, remarks } = await req.json();

  if (!grnNo || !date || !supplierId || !items?.length) {
    return NextResponse.json({ error: "GRN No, date, supplier, and items required" }, { status: 400 });
  }

  const supplier = await prisma.account.findFirst({ where: { id: supplierId, companyId } });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const grn = await prisma.goodsReceiptNote.create({
    data: {
      companyId,
      branchId,
      grnNo,
      date: new Date(date),
      poId: poId || null,
      supplierId,
      remarks,
      status: "RECEIVED",
      createdBy: userId,
      items: {
        create: items.map((i: { itemId: string; orderedQty: number; receivedQty: number; rate: number; remarks?: string }) => ({
          itemId: i.itemId,
          orderedQty: i.orderedQty,
          receivedQty: i.receivedQty,
          rate: i.rate,
          amount: i.receivedQty * i.rate,
          remarks: i.remarks,
        })),
      },
    },
    include: { items: true },
  });

  // Update PO received qty if linked
  if (poId) {
    for (const grnItem of grn.items) {
      await prisma.purchaseOrderItem.updateMany({
        where: { poId, itemId: grnItem.itemId },
        data: { invoicedQty: { increment: grnItem.receivedQty } },
      });
    }
  }

  return NextResponse.json(grn, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  const branchId = await resolveBranchId(req, companyId);

  await prisma.goodsReceiptNote.update({
    where: { id, companyId, ...(branchId ? { branchId } : {}) },
    data: { deletedAt: new Date(), deletedBy: req.headers.get("x-user-id") || undefined },
  });

  return NextResponse.json({ success: true });
}
