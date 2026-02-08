import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

/* GET – list */
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

    const rates = await prisma.stockRate.findMany({
      where: { companyId },
      include: { item: true },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(rates);
  } catch (error: any) {
    console.error("STOCK-RATE GET ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/* POST – add rate */
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

    const { itemId, rate, date } = await req.json();

    if (!itemId || !rate) {
      return NextResponse.json(
        { error: "Item & rate required" },
        { status: 400 }
      );
    }

    const item = await prisma.itemNew.findFirst({
      where: { id: itemId, companyId },
      select: { id: true },
    });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const stockRate = await prisma.stockRate.create({
      data: {
        itemId,
        rate: Number(rate),
        date: date ? new Date(date) : new Date(),
        companyId,
      },
    });

    return NextResponse.json(stockRate);
  } catch (error: any) {
    console.error("STOCK-RATE POST ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/* PUT – update rate */
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

    const { id, itemId, rate, date } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Rate ID required" },
        { status: 400 }
      );
    }

    if (!itemId || !rate) {
      return NextResponse.json(
        { error: "Item & rate required" },
        { status: 400 }
      );
    }

    const existing = await prisma.stockRate.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Rate not found" }, { status: 404 });
    }

    const item = await prisma.itemNew.findFirst({
      where: { id: itemId, companyId },
      select: { id: true },
    });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const stockRate = await prisma.stockRate.update({
      where: { id },
      data: {
        itemId,
        rate: Number(rate),
        date: date ? new Date(date) : new Date(),
      },
      include: { item: true },
    });

    return NextResponse.json(stockRate);
  } catch (error: any) {
    console.error("STOCK-RATE PUT ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/* DELETE – delete rate */
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
      return NextResponse.json(
        { error: "Rate ID required" },
        { status: 400 }
      );
    }

    const existing = await prisma.stockRate.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Rate not found" }, { status: 404 });
    }

    await prisma.stockRate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("STOCK-RATE DELETE ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

