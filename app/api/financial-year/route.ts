import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.VIEW_REPORTS,
      companyId
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const years = await prisma.financialYear.findMany({
      where: { companyId },
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
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.CREATE_ACCOUNTS,
      companyId
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
      where: { isActive: true, companyId },
      data: { isActive: false },
    });

    const financialYear = await prisma.financialYear.create({
      data: {
        year: parseInt(year),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true,
        companyId,
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
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.CREATE_ACCOUNTS,
      companyId
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

    const existing = await prisma.financialYear.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Financial year not found" }, { status: 404 });
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
