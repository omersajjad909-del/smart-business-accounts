import { NextResponse } from "next/server";
import { PrismaClient ,Prisma } from "@prisma/client";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

/* ================= GET: Pending POs for Selection OR All Purchase Invoices ================= */
export async function GET(req: Request) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    // If type=invoices, return all purchase invoices
    if (type === "invoices") {
      const invoices = await prisma.purchaseInvoice.findMany({
        include: {
          supplier: true,
          items: {
            include: { item: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(invoices);
    }

    // Default: return pending POs
    const pos = await prisma.purchaseOrder.findMany({
      where: { status: "PENDING" },
      include: {
        supplier: true,
        items: {
          include: { item: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(pos);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* ================= POST: Create Invoice & Update Everything ================= */
export async function POST(req: Request) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { supplierId, poId, date, items, location, freight = 0, applyTax = false, taxConfigId = null } = body;

    // 1. Validation
    if (!supplierId || !date || !items?.length) {
      return NextResponse.json({ error: "Data missing" }, { status: 400 });
    }

    const validItems = items.filter((i: any) => Number(i.qty) > 0 && i.itemId);

    // 2. Start Transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {


      // A. Supplier اور Inventory Account تلاش کریں
      const supplier = await tx.account.findUnique({ where: { id: supplierId } });
      if (!supplier) throw new Error("Supplier not found");

      let inventoryAcc = await tx.account.findFirst({
        where: {
          OR: [
            { name: { equals: "Stock/Inventory", mode: "insensitive" } },
            { code: { equals: "INV001", mode: "insensitive" } },
          ],
        },
      });

      if (!inventoryAcc) {
        inventoryAcc = await tx.account.create({
          data: { code: "INV001", name: "Stock/Inventory", type: "ASSET" },
        });
      }

      // B. Invoice Number جنریٹ کریں (PI-1, PI-2...)
      const last = await tx.purchaseInvoice.findFirst({
        where: { invoiceNo: { startsWith: "PI-" } },
        orderBy: { createdAt: "desc" },
      });
      let nextNo = 1;
      if (last?.invoiceNo) {
        const n = parseInt(last.invoiceNo.replace("PI-", ""));
        if (!isNaN(n)) nextNo = n + 1;
      }
      const invoiceNo = `PI-${nextNo}`;

      const totalItemsAmount = validItems.reduce((s: number, i: any) => s + (Number(i.qty) * Number(i.rate)), 0);
      
      // Calculate tax if applied
      let taxAmount = 0;
      if (applyTax && taxConfigId) {
        const tax = await tx.taxConfiguration.findUnique({
          where: { id: taxConfigId }
        });
        if (tax) {
          taxAmount = (totalItemsAmount * tax.taxRate) / 100;
        }
      }
      
      const netTotal = totalItemsAmount + Number(freight) + taxAmount;

      // C. Purchase Invoice ریکارڈ کریں
      const invoice = await tx.purchaseInvoice.create({
        data: {
          invoiceNo,
          date: new Date(date),
          supplierId,
          poId: poId || null,
          total: netTotal,
          taxConfigId: applyTax ? taxConfigId : null,
          items: {
            create: validItems.map((i: any) => ({
              itemId: i.itemId,
              qty: Number(i.qty),
              rate: Number(i.rate),
              amount: Number(i.qty) * Number(i.rate),
            })),
          },
        },
      });

      // D. اسٹاک اور PO اپڈیٹ کریں
      for (const i of validItems) {
        // 1. Inventory میں مال داخل کریں (Stock In)
        await tx.inventoryTxn.create({
          data: {
            type: "PURCHASE",
            date: new Date(date),
            itemId: i.itemId,
            qty: Math.abs(Number(i.qty)), // پلس میں اسٹاک
            rate: Number(i.rate),
            amount: Number(i.qty) * Number(i.rate),
            location: location || "MAIN",
            partyId: supplierId,
          },
        });

        // 2. اگر PO سلیکٹڈ ہے تو اس کی invoicedQty اپڈیٹ کریں
        if (poId) {
          await tx.purchaseOrderItem.updateMany({
            where: { poId: poId, itemId: i.itemId },
            data: { invoicedQty: { increment: Number(i.qty) } },
          });
        }
      }

      // E. اگر PO ہے تو اس کا اسٹیٹس چیک کریں
      if (poId) {
        const allItems = await tx.purchaseOrderItem.findMany({ where: { poId } });
        const isDone = allItems.every(pi => pi.invoicedQty >= pi.qty);
        await tx.purchaseOrder.update({
          where: { id: poId },
          data: { status: isDone ? "COMPLETED" : "PENDING" },
        });
      }

      // F. اکاؤنٹنگ واؤچر (Double Entry) – Inventory (Asset) کو Debit کریں
      await tx.voucher.create({
        data: {
          voucherNo: invoiceNo,
          type: "PI",
          date: new Date(date),
          narration: `Purchase Invoice ${invoiceNo} from ${supplier.name}`,
          entries: {
            create: [
              { accountId: inventoryAcc.id, amount: netTotal }, // Debit Inventory (Asset)
              { accountId: supplier.id, amount: -netTotal },    // Credit Supplier
            ],
          },
        },
      });

      return invoice;
    });

    return NextResponse.json({ success: true, id: result.id, invoiceNo: result.invoiceNo });
  } catch (e: any) {
    console.error("PI ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - Update Purchase Invoice
export async function PUT(req: Request) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, supplierId, date, items, location, freight = 0, applyTax = false, taxConfigId = null } = body;

    if (!id) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    const existing = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Note: Updating purchase invoices is complex due to inventory transactions
    // For now, we'll just update the invoice data
    const validItems = items.filter((i: any) => Number(i.qty) > 0 && i.itemId);
    const totalItemsAmount = validItems.reduce((s: number, i: any) => s + (Number(i.qty) * Number(i.rate)), 0);
    
    // Calculate tax if applied
    let taxAmount = 0;
    if (applyTax && taxConfigId) {
      const tax = await prisma.taxConfiguration.findUnique({
        where: { id: taxConfigId }
      });
      if (tax) {
        taxAmount = (totalItemsAmount * tax.taxRate) / 100;
      }
    }
    
    const netTotal = totalItemsAmount + Number(freight) + taxAmount;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {

      await tx.purchaseInvoiceItem.deleteMany({ where: { invoiceId: id } });

      const invoice = await tx.purchaseInvoice.update({
        where: { id },
        data: {
          date: new Date(date),
          total: netTotal,
          taxConfigId: applyTax ? taxConfigId : null,
          items: {
            create: validItems.map((i: any) => ({
              itemId: i.itemId,
              qty: Number(i.qty),
              rate: Number(i.rate),
              amount: Number(i.qty) * Number(i.rate),
            })),
          },
        },
        include: {
          supplier: true,
          items: {
            include: { item: true },
          },
          taxConfig: true
        },
      });

      return invoice;
    });

    return NextResponse.json({ success: true, invoice: result });
  } catch (e: any) {
    console.error("PI PUT ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - Delete Purchase Invoice
export async function DELETE(req: Request) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {

      await tx.purchaseInvoiceItem.deleteMany({ where: { invoiceId: id } });
      await tx.purchaseInvoice.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("PI DELETE ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
