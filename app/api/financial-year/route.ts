import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.VIEW_REPORTS
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const years = await prisma.financialYear.findMany({
      orderBy: { year: "desc" },
    });

    return NextResponse.json(years);
  } catch (e: any) {
    console.error("Financial Year GET Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.CREATE_ACCOUNTS
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { year, startDate, endDate } = body;

    if (!year || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Year, start date, and end date required" },
        { status: 400 }
      );
    }

    // Deactivate all other years
    await prisma.financialYear.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const financialYear = await prisma.financialYear.create({
      data: {
        year: parseInt(year),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true,
      },
    });

    return NextResponse.json(financialYear);
  } catch (e: any) {
    console.error("Financial Year POST Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.CREATE_ACCOUNTS
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, isClosed, closedBy } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const updateData: any = {};
    if (isClosed !== undefined) {
      updateData.isClosed = isClosed;
      if (isClosed) {
        updateData.closedAt = new Date();
        updateData.closedBy = closedBy || userId;
      }
    }

    const financialYear = await prisma.financialYear.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(financialYear);
  } catch (e: any) {
    console.error("Financial Year PUT Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
