import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fixedAssetId = searchParams.get("fixedAssetId");

    if (!fixedAssetId) {
      return NextResponse.json({ error: "Fixed Asset ID required" }, { status: 400 });
    }

    const depreciations = await prisma.depreciation.findMany({
      where: { fixedAssetId },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(depreciations);
  } catch (error) {
    console.error("Error fetching depreciations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Note: Same issue with headers in frontend potentially
    const body = await req.json();
    const { fixedAssetId, date, amount } = body;

    const asset = await prisma.fixedAsset.findUnique({
      where: { id: fixedAssetId }
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const newCurrentValue = asset.currentValue - amount;
    const accumulatedDepreciation = (asset.purchaseValue - newCurrentValue); // Approx

    const depreciation = await prisma.depreciation.create({
      data: {
        fixedAssetId,
        date: new Date(date),
        amount,
        accumulatedDepreciation: accumulatedDepreciation, 
        bookValue: newCurrentValue
      }
    });

    // Update Asset Current Value
    await prisma.fixedAsset.update({
      where: { id: fixedAssetId },
      data: { currentValue: newCurrentValue }
    });

    return NextResponse.json(depreciation);
  } catch (error) {
    console.error("Error creating depreciation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
