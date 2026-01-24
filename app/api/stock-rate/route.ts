import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

/* GET – list */
export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rates = await prisma.stockRate.findMany({
    include: { item: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(rates);
}

/* POST – add rate */
export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { itemId, rate, date } = await req.json();

  if (!itemId || !rate) {
    return NextResponse.json(
      { error: "Item & rate required" },
      { status: 400 }
    );
  }

  const stockRate = await prisma.stockRate.create({
    data: {
      itemId,
      rate: Number(rate),
      date: date ? new Date(date) : new Date(),
    },
  });

  return NextResponse.json(stockRate);
}

/* PUT – update rate */
export async function PUT(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
}

/* DELETE – delete rate */
export async function DELETE(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Rate ID required" },
      { status: 400 }
    );
  }

  await prisma.stockRate.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
