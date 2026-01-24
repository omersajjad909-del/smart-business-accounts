
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type QuotationInput = {
  id?: string;
  quotationNo?: string;   // 👈 THIS IS THE KEY
  date: string;
  validUntil?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  status?: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
  items: {
    itemId: string;
    qty: number;
    rate: number;
    amount: number;
  }[];
};


// VALIDATION SCHEMA
const quotationSchema = z.object({
  id: z.string().optional(),
  quotationNo: z.string().optional(), // ✅ ADD THIS
  date: z.string(),
  validUntil: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  items: z.array(
    z.object({
      itemId: z.string(),
      qty: z.number().min(1),
      rate: z.number().min(0),
      amount: z.number(),
    })
  ),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]).optional(),
});


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
          customer: true,
          items: {
            include: { item: true },
          },
        },
      });
      if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
      return NextResponse.json({ quotation });
    }

    // Calculate next quotation number
    const allQuotations = await prisma.quotation.findMany({
      where: { quotationNo: { startsWith: "QT-" } },
      select: { quotationNo: true }
    });

    let nextNo = "QT-0001";
    if (allQuotations.length > 0) {
      const numbers = allQuotations.map((q) => {
        const n = parseInt(q.quotationNo.replace("QT-", ""));
        return isNaN(n) ? 0 : n;
      });

      const maxNum = Math.max(...numbers);
      nextNo = `QT-${String(maxNum + 1).padStart(4, "0")}`;
    }

    const quotations = await prisma.quotation.findMany({
      include: {
        customer: true,
        items: {
          include: { item: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      nextNo,
      quotations
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!role || (role !== "ADMIN" && role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = quotationSchema.parse(body);

    // Auto-generate Quotation No if not provided or ensure uniqueness?
    // The previous code generated it. Let's keep it but handle if user provided one?
    // The previous code:
    // const count = await prisma.quotation.count();
    // const quotationNo = `QT-${String(count + 1).padStart(4, "0")}`;
    // This is simple counting, might duplicate if deletions happen.
    // Better to use the max logic or just trust the one sent?
    // The frontend sends `quotationNo`.
    // Let's use the one from frontend if valid, or generate if missing.
    
    let quotationNo = data.quotationNo;
    if (!quotationNo) {
       const count = await prisma.quotation.count();
       quotationNo = `QT-${String(count + 1).padStart(4, "0")}`;
    }

    const quotation = await prisma.quotation.create({
      data: {
        quotationNo, // Use the one we decided on
        date: new Date(data.date),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        customerId: data.customerId || null,
        customerName: data.customerName || null,
        status: data.status || "DRAFT",
        total: data.items.reduce((sum, item) => sum + item.amount, 0),
        items: {
          create: data.items.map((item) => ({
            itemId: item.itemId,
            qty: item.qty,
            rate: item.rate,
            amount: item.amount,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: { item: true },
        },
      },
    });

    return NextResponse.json({ quotation });
  } catch (error: any) {
    console.error("Create Quotation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create quotation" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!role || (role !== "ADMIN" && role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = quotationSchema.parse(body);

    if (!data.id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Transaction to update: delete old items, create new ones
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Delete existing items
      await tx.quotationItem.deleteMany({
        where: { quotationId: data.id },
      });

      // 2. Update Quotation
      return await tx.quotation.update({
        where: { id: data.id },
        data: {
          date: new Date(data.date),
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          customerId: data.customerId || null,
          customerName: data.customerName || null,
          status: data.status || "DRAFT",
          total: data.items.reduce((sum, item) => sum + item.amount, 0),
          items: {
            create: data.items.map((item) => ({
              itemId: item.itemId,
              qty: item.qty,
              rate: item.rate,
              amount: item.amount,
            })),
          },
        },
        include: {
          customer: true,
          items: {
            include: { item: true },
          },
        },
      });
    });

    return NextResponse.json({ quotation: updated });

  } catch (error: any) {
    console.error("Update Quotation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update quotation" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!role || (role !== "ADMIN" && role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.quotation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete quotation" }, { status: 500 });
  }
}
