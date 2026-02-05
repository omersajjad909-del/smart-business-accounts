import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";


const prisma =
  (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

// ---------- POST ----------
export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { date, customerId, driverName, vehicleNo, remarks, items } =
      await req.json();

    const customer = await prisma.account.findFirst({
      where: { id: customerId, companyId },
      select: { id: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const last = await prisma.outward.findFirst({
      where: { companyId },
      orderBy: { outwardNo: "desc" },
    });

    const nextNo = last ? last.outwardNo + 1 : 1;

    const entry = await prisma.outward.create({
      data: {
        outwardNo: nextNo,
        date: new Date(date),
        customerId,
        driverName,
        vehicleNo,
        remarks,
        companyId,
        items: {
          create: items.map((i: Any) => ({
            itemId: i.itemId,
            qty: Number(i.qty),
            rate: 0,
            amount: 0,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(entry);
  } catch (e: Any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ---------- GET ----------
export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const customerId = req.nextUrl.searchParams.get("customerId");

    const data = await prisma.outward.findMany({
      where: {
        companyId,
        date: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to + "T23:59:59") : undefined,
        },
        customerId: customerId || undefined,
      },
      include: {
        customer: true,
        items: { include: { item: true } },
      },
      orderBy: { outwardNo: "desc" },
    });

    return NextResponse.json(data);
  } catch (e: Any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - Update Outward
export async function PUT(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const { id, date, customerId, driverName, vehicleNo, remarks, items } = body;

    if (!id) {
      return NextResponse.json({ error: "Outward ID required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.outward.findFirst({
        where: { id, companyId },
        select: { id: true },
      });
      if (!existing) {
        throw new Error("Outward not found");
      }

      await tx.outwardItem.deleteMany({ where: { outwardId: id } });

      const outward = await tx.outward.update({
        where: { id },
        data: {
          date: new Date(date),
          customerId,
          driverName,
          vehicleNo,
          remarks,
          companyId,
          items: {
            create: items.map((i: Any) => ({
              itemId: i.itemId,
              qty: Number(i.qty),
              rate: 0,
              amount: 0,
            })),
          },
        },
        include: {
          customer: true,
          items: { include: { item: true } },
        },
      });

      return outward;
    });

    return NextResponse.json(result);
  } catch (e: Any) {
    console.error("Outward PUT Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - Delete Outward
export async function DELETE(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Outward ID required" }, { status: 400 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.outward.findFirst({
        where: { id, companyId },
        select: { id: true },
      });
      if (!existing) {
        throw new Error("Outward not found");
      }
      await tx.outwardItem.deleteMany({ where: { outwardId: id } });
      await tx.outward.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (e: Any) {
    console.error("Outward DELETE Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

