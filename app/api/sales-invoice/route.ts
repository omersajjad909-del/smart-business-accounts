import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
type SalesInvoiceNoOnly = Prisma.SalesInvoiceGetPayload<{
  select: { invoiceNo: true };
}>;

type SalesInvoiceFull = Prisma.SalesInvoiceGetPayload<{
  include: {
    customer: true;
    items: { include: { item: true } };
    returns: { include: { items: true } };
  };
}>;

type TxClient = Prisma.TransactionClient;


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
      PERMISSIONS.CREATE_SALES_INVOICE
    );

    if (!allowed) {
      return NextResponse.json({ error: "No Access" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const inv = await prisma.salesInvoice.findUnique({
        where: { id },
        include: {
          customer: true,
          items: { include: { item: true } },
          returns: { include: { items: true } }
        }
      });
      if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
      
      return NextResponse.json({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        customerId: inv.customerId,
        customerName: inv.customer?.name || "Unknown",
        date: inv.date,
        total: inv.total,
        items: inv.items,
        customer: inv.customer,
        driverName: inv.driverName,
        vehicleNo: inv.vehicleNo,
        location: inv.location
      });
    }

    // Calculate next invoice number
    const allInvoices = await prisma.salesInvoice.findMany({
      where: { invoiceNo: { startsWith: "SI-" } },
      select: { invoiceNo: true }
    });

    let nextNo = "SI-1";
    if (allInvoices.length > 0) {
      const numbers = allInvoices.map((inv: SalesInvoiceNoOnly) => {
        const n = parseInt(inv.invoiceNo.replace("SI-", ""));
        return isNaN(n) ? 0 : n;
      });

      const maxNum = Math.max(...numbers);
      nextNo = `SI-${maxNum + 1}`;
    }

    const invoices = await prisma.salesInvoice.findMany({
      include: {
        customer: true,
        items: { include: { item: true } },
        returns: { include: { items: true } }
      },
      orderBy: { date: "desc" }
    });

    const formattedInvoices = invoices.map((inv: SalesInvoiceFull) => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      customerId: inv.customerId,
      customerName: inv.customer?.name || "Unknown",
      date: inv.date,
      total: inv.total,
      items: inv.items,
      customer: inv.customer,
      driverName: inv.driverName,
      vehicleNo: inv.vehicleNo,
    }));



    return NextResponse.json({
      nextNo,
      invoices: formattedInvoices
    });
  } catch (e: any) {
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
      PERMISSIONS.CREATE_SALES_INVOICE
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { invoiceNo, customerId, date, location, freight = 0, items, applyTax = false, taxConfigId = null, driverName = null, vehicleNo = null } = body;

    const total = items.reduce(
      (s: number, i: any) => s + i.qty * i.rate,
      0
    );

    // Calculate tax if applied
    let taxAmount = 0;
    if (applyTax && taxConfigId) {
      const tax = await prisma.taxConfiguration.findUnique({
        where: { id: taxConfigId }
      });
      if (tax) {
        taxAmount = (total * tax.taxRate) / 100;
      }
    }

    const invoice = await prisma.salesInvoice.create({
      data: {
        invoiceNo,
        date: new Date(date),
        customerId,
        driverName,
        vehicleNo,
        total: total + freight + taxAmount,
        items: {
          create: items.map((i: any) => ({
            itemId: i.itemId,
            qty: i.qty,
            rate: i.rate,
            amount: i.qty * i.rate,
          })),
        },
        taxConfigId: applyTax ? taxConfigId : null,
      },
    });

    let salesAcc = await prisma.account.findFirst({
      where: { name: { equals: "Sales", mode: "insensitive" } },
    });

    if (!salesAcc) {
      salesAcc = await prisma.account.create({
        data: { code: "SALES", name: "Sales", type: "INCOME" },
      });
    }

    await prisma.voucher.create({
      data: {
        voucherNo: invoice.invoiceNo,
        type: "SI",
        date: new Date(date),
        narration: "Sales Invoice",
        entries: {
          create: [
            { accountId: customerId, amount: total + freight + taxAmount },
            { accountId: salesAcc.id, amount: -(total + freight + taxAmount) },
          ],
        },
      },
    });

    for (const i of items) {
      await prisma.inventoryTxn.create({
        data: {
          type: "SALE",
          date: new Date(date),
          itemId: i.itemId,
          qty: -i.qty,
          rate: i.rate,
          amount: i.qty * i.rate,
          location,
        },
      });
    }

    // Fetch the created invoice with customer details for preview
    const savedInvoice = await prisma.salesInvoice.findUnique({
      where: { id: invoice.id },
      include: {
        customer: true,
        items: { include: { item: true } },
        taxConfig: true
      }
    });

    return NextResponse.json({
      success: true,
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      invoice: savedInvoice
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - Update Sales Invoice
export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.CREATE_SALES_INVOICE
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, customerId, date, location, freight = 0, items, applyTax = false, taxConfigId = null, driverName = null, vehicleNo = null } = body;

    if (!id) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    const existing = await prisma.salesInvoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const total = items.reduce((s: number, i: any) => s + i.qty * i.rate, 0);

    // Calculate tax if applied
    let taxAmount = 0;
    if (applyTax && taxConfigId) {
      const tax = await prisma.taxConfiguration.findUnique({
        where: { id: taxConfigId }
      });
      if (tax) {
        taxAmount = (total * tax.taxRate) / 100;
      }
    }

    const result = await prisma.$transaction(async (tx: TxClient) => {
      await tx.salesInvoiceItem.deleteMany({ where: { invoiceId: id } });

      const invoice = await tx.salesInvoice.update({
        where: { id },
        data: {
          date: new Date(date),
          driverName,
          vehicleNo,
          total: total + freight + taxAmount,
          taxConfigId: applyTax ? taxConfigId : null,
          items: {
            create: items.map((i: any) => ({
              itemId: i.itemId,
              qty: i.qty,
              rate: i.rate,
              amount: i.qty * i.rate,
            })),
          },
        },
        include: {
          customer: true,
          items: { include: { item: true } },
          taxConfig: true
        },
      });

      return invoice;
    });

    return NextResponse.json({ success: true, invoice: result });
  } catch (e: any) {
    console.error("Sales Invoice PUT Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - Delete Sales Invoice
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.CREATE_SALES_INVOICE
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    await prisma.$transaction(async (tx: TxClient) => {
      await tx.salesInvoiceItem.deleteMany({ where: { invoiceId: id } });
      await tx.salesInvoice.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Sales Invoice DELETE Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
