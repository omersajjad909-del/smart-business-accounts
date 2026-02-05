import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

// GET: Fetch all currencies
export async function GET(_req: NextRequest) {
  try {
    const currencies = await prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });
    return NextResponse.json(currencies);
  } catch (error) {
    console.error("Error fetching currencies:", error);
    return NextResponse.json({ error: "Failed to fetch currencies" }, { status: 500 });
  }
}

// POST: Create new currency
export async function POST(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const body = await req.json();
    const { code, name, symbol, exchangeRate } = body;

    if (!code || !name || !symbol) {
      return NextResponse.json(
        { error: "Code, name, and symbol are required" },
        { status: 400 }
      );
    }

    const currency = await prisma.currency.create({
      data: {
        code: code.toUpperCase(),
        name,
        symbol,
        exchangeRate: exchangeRate || 1.0,
      },
    });

    return NextResponse.json(currency, { status: 201 });
  } catch (error: Any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Currency code already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating currency:", error);
    return NextResponse.json({ error: "Failed to create currency" }, { status: 500 });
  }
}

// PUT: Update currency
export async function PUT(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { name, symbol, exchangeRate, isActive } = body;

    const currency = await prisma.currency.update({
      where: { id },
      data: {
        name,
        symbol,
        exchangeRate,
        isActive,
      },
    });

    return NextResponse.json(currency);
  } catch (error: Any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Currency not found" }, { status: 404 });
    }
    console.error("Error updating currency:", error);
    return NextResponse.json({ error: "Failed to update currency" }, { status: 500 });
  }
}

// DELETE: Delete currency
export async function DELETE(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.currency.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Currency deleted successfully" });
  } catch (error: Any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Currency not found" }, { status: 404 });
    }
    console.error("Error deleting currency:", error);
    return NextResponse.json({ error: "Failed to delete currency" }, { status: 500 });
  }
}
