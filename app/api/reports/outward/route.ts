import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
type OutwardWithItems = Prisma.OutwardGetPayload<{
  include: {
    items: true;
  };
}>;

type OutwardItem = Prisma.OutwardItemGetPayload<Prisma.OutwardItemDefaultArgs>;


const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    // 🔐 ROLE CHECK
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
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
    const reportRows: Any[] = [];

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
  } catch (e: Any) {
    console.error("OUTWARD REPORT ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


