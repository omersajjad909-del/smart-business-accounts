import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

import { resolveCompanyId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";
type OutwardWithItems = Prisma.OutwardGetPayload<{
  include: {
    items: true;
  };
}>;

type OutwardItem = Prisma.OutwardItemGetPayload<Prisma.OutwardItemDefaultArgs>;


export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_OUTWARD, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 🔎 FILTERS
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const customerId = req.nextUrl.searchParams.get("customerId");

    const fromDate = from ? new Date(from + "T00:00:00") : undefined;
    const toDate = to ? new Date(to + "T23:59:59") : undefined;

    // 📦 DATA
    const data = await prisma.outward.findMany({
      where: {
        companyId,
        date: { gte: fromDate, lte: toDate },
        customerId: customerId && customerId !== "" ? customerId : undefined,
      },
      include: {
        customer: true,
        items: {
          include: { item: true },
        },
      },
      orderBy: { outwardNo: "desc" },
    });
    const reportRows: any[] = [];

    data.forEach((out: OutwardWithItems) => {
      out.items.forEach((line: OutwardItem) => {
        reportRows.push({
          id: out.id,
          date: out.date.toISOString().slice(0, 10),
          outwardNo: out.outwardNo,
          itemId: line.itemId,
          qty: Number(line.qty),
          rate: Number(line.rate),
          amount: Number(line.amount),
        });
      });
    });


    return NextResponse.json(reportRows);
  } catch (e: any) {
    console.error("OUTWARD REPORT ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


