import { NextRequest, NextResponse } from "next/server";
import { PrismaClient,Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
const prisma =
  (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}


export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const { poNo, supplierId, date, items, remarks } = await req.json();

  const supplier = await prisma.account.findFirst({ where: { id: supplierId, companyId } });
  if (!supplier) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const po = await prisma.purchaseOrder.create({
    data: {
      poNo,
      supplierId,
      date: new Date(date),
      remarks: remarks || "",
      companyId,
      status: "PENDING", // 🔴 یہ لائن شامل کرنا ضروری تھی جو مسنگ تھی
      items: {
        create: items.map((i: any) => ({
          itemId: i.itemId,
          qty: Number(i.qty),
          rate: Number(i.rate || 0),
        })),
      },
    },
  });

  return NextResponse.json(po);
}

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // If ID provided, return single PO
  if (id) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        items: {
          include: { item: true },
        },
      },
    });
    return NextResponse.json(po || { error: "Not found" }, { status: po ? 200 : 404 });
  }

  // Check if requesting next PO number
  const nextNo = searchParams.get("nextNo");
  if (nextNo === "true") {
    const last = await prisma.purchaseOrder.findFirst({
      where: { poNo: { startsWith: "PO #" }, companyId },
      orderBy: { createdAt: "desc" },
      select: { poNo: true },
    });
    let next = 1;
    if (last?.poNo) {
      const n = parseInt(last.poNo.replace(/\D/g, ""));
      if (!isNaN(n)) next = n + 1;
    }
    return NextResponse.json({ poNo: `PO # ${next}` });
  }

  // Return all POs
  const pos = await prisma.purchaseOrder.findMany({
    where: { companyId },
    include: {
      supplier: true,
      items: {
        include: { item: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(pos);
}

// PUT - Update Purchase Order
export async function PUT(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const { id, poNo, supplierId, date, items, remarks } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "PO ID required" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {

    const existing = await tx.purchaseOrder.findFirst({ where: { id, companyId } });
    if (!existing) {
      throw new Error("PO not found");
    }

    // Delete old items
    await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });

    // Update PO
    const po = await tx.purchaseOrder.update({
      where: { id },
      data: {
        poNo,
        supplierId,
        date: new Date(date),
        remarks: remarks || "",
        companyId,
        items: {
          create: items.map((i: any) => ({
            itemId: i.itemId,
            qty: Number(i.qty),
            rate: Number(i.rate || 0),
          })),
        },
      },
      include: {
        supplier: true,
        items: {
          include: { item: true },
        },
      },
    });

    return po;
  });

  return NextResponse.json(result);
}

// DELETE - Delete Purchase Order
export async function DELETE(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "PO ID required" }, { status: 400 });
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.purchaseOrder.findFirst({ where: { id, companyId } });
    if (!existing) {
      throw new Error("PO not found");
    }
    await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });
    await tx.purchaseOrder.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}


