import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Note: FixedAssets page doesn't send headers in fetchAssets in the provided code snippet!
    // But it's better to secure it. If frontend fails, I might need to fix frontend headers too.
    // Looking at the code: fetch('/api/fixed-assets') in app/dashboard/fixed-assets/page.tsx
    // It DOES NOT send headers. I should fix the frontend too, OR check if I can get user from session here?
    // Usually API routes don't have access to client cookies easily without helpers.
    // BUT wait, let's look at `app/dashboard/fixed-assets/page.tsx` again.
    // Line 75: const response = await fetch('/api/fixed-assets');
    // It's missing headers! I should fix that too to be consistent.
    // However, for now, if I enforce headers here, it will break.
    // But I can't get companyId without headers (unless I infer from session which might be complex here).
    // Let's assume I will fix the frontend headers for fixed-assets too.
    
    const companyId = req.headers.get("x-company-id");

    if (!companyId) {
      // Fallback: If no header, maybe return empty or error?
      // Since I am fixing the system, I should fix the frontend.
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const assets = await prisma.fixedAsset.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error("Error fetching fixed assets:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    const companyId = req.headers.get("x-company-id");

    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const body = await req.json();
    const { 
      assetName, assetCode, category, purchaseDate, purchaseValue, 
      depreciationMethod, depreciationRate, usefulLife, salvageValue, location 
    } = body;

    const asset = await prisma.fixedAsset.create({
      data: {
        companyId,
        assetName,
        assetCode,
        category,
        purchaseDate: new Date(purchaseDate),
        purchaseValue,
        currentValue: purchaseValue, // Initial value
        depreciationMethod,
        depreciationRate,
        usefulLife,
        salvageValue,
        location,
        status: "ACTIVE"
      }
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Error creating fixed asset:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    const companyId = req.headers.get("x-company-id");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId || !id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await prisma.fixedAsset.delete({
      where: { id, companyId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fixed asset:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
