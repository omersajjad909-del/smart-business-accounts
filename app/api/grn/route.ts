import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeLineMeta } from "@/lib/rateFormula";
import { resolveCompanyId, resolveBranchId, resolveBranchIdOrDefault } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
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
  } catch (error) {
    console.error("GRN GET failed:", error);
    return NextResponse.json({ error: "Failed to load GRNs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const branchId = await resolveBranchIdOrDefault(req, companyId);
    const userId = req.headers.get("x-user-id") || undefined;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { grnNo, date, poId, supplierId, items, remarks, partyBillNo, purchaseType, biltyNo, location, cargo, driver, vehicleNo } = body;

    if (!grnNo || !date || !supplierId || !items?.length) {
      return NextResponse.json({ error: "GRN No, date, supplier, and items required" }, { status: 400 });
    }

    const supplier = await prisma.account.findFirst({ where: { id: supplierId, companyId } });
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    const grn = await prisma.$transaction(async (tx) => {
      const created = await tx.goodsReceiptNote.create({
        data: {
          companyId,
          branchId,
          grnNo,
          date: new Date(date),
          poId: poId || null,
          supplierId,
          remarks,
          partyBillNo: partyBillNo || null,
          purchaseType: purchaseType === "CASH" || purchaseType === "CREDIT" ? purchaseType : null,
          biltyNo: biltyNo || null,
          location: location || null,
          cargo: cargo || null,
          driver: driver || null,
          vehicleNo: vehicleNo || null,
          status: "RECEIVED",
          createdBy: userId,
          items: {
            create: items.map((i: { itemId: string; orderedQty: number; receivedQty: number; rate: number; remarks?: string; meta?: unknown }) => ({
              itemId: i.itemId,
              orderedQty: i.orderedQty,
              receivedQty: i.receivedQty,
              rate: i.rate,
              amount: i.receivedQty * i.rate,
              remarks: i.remarks,
              meta: sanitizeLineMeta(i.meta),
            })),
          },
        },
        include: { items: true },
      });

      // GRN ke against PO ka status update karo
      if (poId) {
        const po = await tx.purchaseOrder.findFirst({
          where: { id: poId, companyId },
          include: { items: true },
        });

        if (po) {
          // PO ke total ordered qty vs total GRN received qty compare karo
          const allGrns = await tx.goodsReceiptNote.findMany({
            where: { poId, companyId, deletedAt: null },
            include: { items: true },
          });

          // Har item ki total received qty calculate karo (naya GRN bhi include)
          const receivedMap: Record<string, number> = {};
          for (const g of allGrns) {
            for (const gi of g.items) {
              receivedMap[gi.itemId] = (receivedMap[gi.itemId] || 0) + gi.receivedQty;
            }
          }

          const allFullyReceived = po.items.every(
            (pi) => (receivedMap[pi.itemId] || 0) >= pi.qty
          );
          const anyReceived = po.items.some(
            (pi) => (receivedMap[pi.itemId] || 0) > 0
          );

          const newStatus = allFullyReceived
            ? "RECEIVED"
            : anyReceived
            ? "PARTIALLY_RECEIVED"
            : "PENDING";

          await tx.purchaseOrder.update({
            where: { id: poId },
            data: { status: newStatus, approvalStatus: "APPROVED" },
          });
        }
      }

      return created;
    });

    return NextResponse.json(grn, { status: 201 });
  } catch (error) {
    console.error("GRN POST failed:", error);
    // A flat "GRN save failed" was all this used to say, which is why a schema
    // drift — the Inward & Transport columns existed in the Prisma schema but
    // were never added to the database — read as a mystery 500 on screen for as
    // long as it did. Prisma's own diagnosis is worth passing on: these are the
    // codes an operator or an admin can actually act on.
    const e = error as { code?: string; meta?: { column?: string } };
    if (e?.code === "P2022") {
      return NextResponse.json(
        {
          error: `Database is missing the "${e.meta?.column ?? "unknown"}" column — a migration in prisma/migrations has not been run yet.`,
          code: e.code,
        },
        { status: 500 },
      );
    }
    if (e?.code === "P2003") {
      return NextResponse.json(
        { error: "This GRN points at an item, supplier or PO that no longer exists.", code: e.code },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "GRN save failed", code: e?.code ?? null }, { status: 500 });
  }
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
