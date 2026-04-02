import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const prices = await prisma.modulePrice.findMany();
    return NextResponse.json(prices);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { moduleId, price } = await req.json();
    const updated = await prisma.modulePrice.upsert({
      where: { moduleId },
      update: { price },
      create: { moduleId, price },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update price" }, { status: 500 });
  }
}
