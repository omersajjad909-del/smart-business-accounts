import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const records = await prisma.businessRecord.findMany({
      where: { category: "sales_order", companyId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(records);
  } catch (err) {
    console.error("[sales-order GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const { customerId, customerName, items, notes, date } = body;

    if (!customerName || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "customerName and items are required" }, { status: 400 });
    }

    const amount = items.reduce(
      (s: number, i: { qty: number; unitPrice: number }) => s + i.qty * i.unitPrice,
      0
    );
    const orderNo = "SO-" + Date.now().toString().slice(-6);

    const record = await prisma.businessRecord.create({
      data: {
        category: "sales_order",
        title: orderNo + " · " + customerName,
        status: "PENDING",
        amount,
        companyId,
        data: { orderNo, customerId, customerName, items, notes, date },
        date: new Date(date),
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error("[sales-order POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    const allowed = ["PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const existing = await prisma.businessRecord.findFirst({
      where: { id, companyId, category: "sales_order" },
    });
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const updated = await prisma.businessRecord.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[sales-order PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
