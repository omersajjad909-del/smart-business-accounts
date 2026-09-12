﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { resolveCompanyId, resolveBranchId, resolveBranchIdOrDefault } from "@/lib/tenant";

// VALIDATION SCHEMA
const challanSchema = z.object({
  id: z.string().optional(),
  date: z.string(),
  customerId: z.string(),
  driverName: z.string().optional().nullable(),
  vehicleNo: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  serialNo: z.string().optional().nullable(),
  orderNo: z.string().optional().nullable(),
  poNo: z.string().optional().nullable(),
  dNo: z.string().optional().nullable(),
  packagingType: z.string().optional().nullable(),
  packagingQty: z.number().optional().nullable(),
  packagingItemId: z.string().optional().nullable(),
  items: z.array(
    z.object({
      itemId: z.string(),
      qty: z.number().min(1),
      rate: z.number().optional().nullable(), // Optional in Challan
    })
  ),
  status: z.enum(["PENDING", "DELIVERED", "INVOICED"]).optional(),
});

/**
 * Everything a dispatch takes out of the godown: the goods themselves, and —
 * when the company stocks its packing material — the bags or cartons they went
 * out in. Both are written at the one moment the challan turns DELIVERED, so
 * the two can never drift apart.
 */
async function writeDispatchStock(
  companyId: string,
  data: z.infer<typeof challanSchema>
) {
  const date = new Date(data.date);

  for (const item of data.items) {
    await prisma.inventoryTxn.create({
      data: {
        companyId,
        type: "CHALLAN_OUT",
        date,
        itemId: item.itemId,
        qty: -item.qty,
        rate: item.rate || 0,
        amount: item.qty * (item.rate || 0),
        location: "MAIN",
      },
    });
  }

  // The packing material, when the company holds it as stock. Valued at cost:
  // it is consumed on the way out, not sold, so the sale rate says nothing
  // about it. A challan that names no packing item writes nothing here.
  const packQty = Number(data.packagingQty ?? 0);
  if (data.packagingItemId && packQty > 0) {
    const packItem = await prisma.itemNew.findFirst({
      where: { id: data.packagingItemId, companyId, deletedAt: null },
      select: { purchaseRate: true },
    });
    if (packItem) {
      const rate = packItem.purchaseRate || 0;
      await prisma.inventoryTxn.create({
        data: {
          companyId,
          type: "PACKING_OUT",
          date,
          itemId: data.packagingItemId,
          qty: -packQty,
          rate,
          amount: packQty * rate,
          location: "MAIN",
        },
      });
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const branchId = await resolveBranchId(req, companyId);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const challan = await prisma.deliveryChallan.findFirst({
        where: { id, companyId, ...(branchId ? { branchId } : {}) },
        include: {
          customer: true,
          packagingItem: true,
          items: {
            include: { item: true },
          },
        },
      });
      if (!challan) return NextResponse.json({ error: "Delivery Challan not found" }, { status: 404 });
      return NextResponse.json(challan);
    }

    const challans = await prisma.deliveryChallan.findMany({
      where: { companyId, ...(branchId ? { branchId } : {}) },
      include: {
        customer: true,
        packagingItem: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(challans);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch delivery challans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const branchId = await resolveBranchIdOrDefault(req, companyId);

    const body = await req.json();
    const data = challanSchema.parse(body);

    // Auto-generate Challan No
    const count = await prisma.deliveryChallan.count({ where: { companyId } });
    const challanNo = `DC-${String(count + 1).padStart(4, "0")}`;

    const challan = await prisma.deliveryChallan.create({
      data: {
        companyId,
        branchId,
        challanNo,
        date: new Date(data.date),
        customerId: data.customerId,
        driverName: data.driverName || null,
        vehicleNo: data.vehicleNo || null,
        remarks: data.remarks || null,
        serialNo: data.serialNo || null,
        orderNo: data.orderNo || null,
        poNo: data.poNo || null,
        dNo: data.dNo || null,
        packagingType: data.packagingType || null,
        packagingQty: data.packagingQty ?? null,
        packagingItemId: data.packagingItemId || null,
        status: data.status || "PENDING",
        items: {
          create: data.items.map((item) => ({
            itemId: item.itemId,
            qty: item.qty,
            rate: item.rate || 0,
          })),
        },
      },
      include: {
        customer: true,
        packagingItem: true,
        items: {
          include: { item: true },
        },
      },
    });

    // Deduct stock when challan is created as DELIVERED (immediate dispatch)
    if ((data.status || "PENDING") === "DELIVERED") {
      await writeDispatchStock(companyId, data);
    }

    return NextResponse.json(challan);
  } catch (error: any) {
    console.error("Create Delivery Challan Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create delivery challan" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!role || (role !== "ADMIN" && role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const branchId = await resolveBranchId(req, companyId);

    const body = await req.json();
    const data = challanSchema.parse(body);

    if (!data.id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existingChallan = await prisma.deliveryChallan.findFirst({
      where: { id: data.id, companyId },
      select: { status: true },
    });

    // Transaction to update: delete old items, create new ones
    const updated = await prisma.$transaction(async (tx) => {
      await tx.deliveryChallanItem.deleteMany({
        where: { challanId: data.id, challan: { companyId } },
      });

      return await tx.deliveryChallan.update({
        where: { id: data.id, companyId, ...(branchId ? { branchId } : {}) },
        data: {
          date: new Date(data.date),
          customerId: data.customerId,
          driverName: data.driverName || null,
          vehicleNo: data.vehicleNo || null,
          remarks: data.remarks || null,
          serialNo: data.serialNo || null,
          orderNo: data.orderNo || null,
          poNo: data.poNo || null,
          dNo: data.dNo || null,
          packagingType: data.packagingType || null,
          packagingQty: data.packagingQty ?? null,
          packagingItemId: data.packagingItemId || null,
          status: data.status || "PENDING",
          items: {
            create: data.items.map((item) => ({
              itemId: item.itemId,
              qty: item.qty,
              rate: item.rate || 0,
            })),
          },
        },
        include: {
          customer: true,
          packagingItem: true,
          items: { include: { item: true } },
        },
      });
    });

    // Deduct stock when status transitions to DELIVERED
    const wasNotDelivered = existingChallan?.status !== "DELIVERED";
    const nowDelivered = data.status === "DELIVERED";
    if (wasNotDelivered && nowDelivered) {
      await writeDispatchStock(companyId, data);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update Delivery Challan Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update delivery challan" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!role || (role !== "ADMIN" && role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.deliveryChallan.delete({
      where: { id, companyId },
    });

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to delete delivery challan" }, { status: 500 });
  }
}

