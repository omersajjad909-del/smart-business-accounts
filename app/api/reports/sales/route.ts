import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
type SalesInvoiceWithItems = Prisma.SalesInvoiceGetPayload<{
  include: {
    items: true;
  };
}>;

type SalesInvoiceItem = Prisma.SalesInvoiceItemGetPayload<Prisma.SalesInvoiceItemDefaultArgs>;


const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    // 🔐 ROLE CHECK - پیج سے رول ہیڈر ملنا لازمی ہے
    const role = req.headers.get("x-user-role");
    if (!role || (role !== "ADMIN" && role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    // 📅 FILTERS
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const customerId = searchParams.get("customerId") || undefined;

    const fromDate = from ? new Date(from + "T00:00:00") : undefined;
    const toDate = to ? new Date(to + "T23:59:59.999") : undefined;

    // 📄 SALES INVOICES FETCHING
    const invoices = await prisma.salesInvoice.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        customerId: customerId === "all" ? undefined : customerId,
        companyId,
      },
      include: {
        customer: { select: { name: true } },
        items: {
          include: { item: { select: { name: true } } },
        },
      },
      orderBy: { date: "asc" },
    });

    // 📊 FLATTEN ROWS - ڈیٹا کو صاف ستھرا کرنا
    const rows = invoices.flatMap((inv: SalesInvoiceWithItems) =>
  inv.items.map((it: SalesInvoiceItem) => ({
    date: inv.date.toISOString().slice(0, 10),
    invoiceNo: inv.invoiceNo,
    customerId: inv.customerId,
    itemId: it.itemId,
    qty: Number(it.qty),
    rate: Number(it.rate),
    amount: Number(it.amount),
  }))
);


    return NextResponse.json(rows);
  } catch (e) {
    console.error("❌ SALES REPORT ERROR:", e);
    return NextResponse.json([], { status: 500 });
  }
}

