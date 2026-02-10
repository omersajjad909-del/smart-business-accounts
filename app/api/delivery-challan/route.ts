﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { resolveCompanyId } from "@/lib/tenant";

// VALIDATION SCHEMA
const challanSchema = z.object({
  id: z.string().optional(),
  date: z.string(),
  customerId: z.string(),
  driverName: z.string().optional().nullable(),
  vehicleNo: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  items: z.array(
    z.object({
      itemId: z.string(),
      qty: z.number().min(1),
      rate: z.number().optional().nullable(), // Optional in Challan
    })
  ),
  status: z.enum(["PENDING", "DELIVERED", "INVOICED"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const challan = await prisma.deliveryChallan.findUnique({
        where: { id, companyId },
        include: {
          customer: true,
          items: {
            include: { item: true },
          },
        },
      });
      if (!challan) return NextResponse.json({ error: "Delivery Challan not found" }, { status: 404 });
      return NextResponse.json(challan);
    }

    const challans = await prisma.deliveryChallan.findMany({
      where: { companyId },
      include: {
        customer: true,
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

    const body = await req.json();
    const data = challanSchema.parse(body);

    // Auto-generate Challan No
    const count = await prisma.deliveryChallan.count({ where: { companyId } });
    const challanNo = `DC-${String(count + 1).padStart(4, "0")}`;

    const challan = await prisma.deliveryChallan.create({
      data: {
        companyId,
        challanNo,
        date: new Date(data.date),
        customerId: data.customerId,
        driverName: data.driverName || null,
        vehicleNo: data.vehicleNo || null,
        remarks: data.remarks || null,
        status: data.status || "PENDING",
        items: {
          create: data.items.map((item) => ({
            itemId: item.itemId,
            qty: item.qty,
            rate: item.rate || 0, // Store 0 if not provided
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: { item: true },
        },
      },
    });

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

    const body = await req.json();
    const data = challanSchema.parse(body);

    if (!data.id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Transaction to update: delete old items, create new ones
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Delete existing items
      await tx.deliveryChallanItem.deleteMany({
        where: { challanId: data.id, challan: { companyId } },
      });

      // 2. Update Challan
      return await tx.deliveryChallan.update({
        where: { id: data.id, companyId },
        data: {
          date: new Date(data.date),
          customerId: data.customerId,
          driverName: data.driverName || null,
          vehicleNo: data.vehicleNo || null,
          remarks: data.remarks || null,
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
          items: {
            include: { item: true },
          },
        },
      });
    });

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

