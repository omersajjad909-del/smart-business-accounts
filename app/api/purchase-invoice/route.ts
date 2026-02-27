import { NextRequest, NextResponse } from "next/server";
import { PrismaClient ,Prisma as _Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
import { ensureOpenPeriod } from "@/lib/financialLock";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";
import { requireActiveSubscription } from "@/lib/subscriptionGuard";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

/* ================= GET: Pending POs for Selection OR All Purchase Invoices ================= */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_PURCHASE_INVOICE, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    // If id provided, return specific invoice
    if (id) {
      const invoice = await prisma.purchaseInvoice.findFirst({
        where: { id, companyId },
        include: {
          supplier: true,
          items: {
            include: { item: true },
          },
        },
      });
      if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(invoice);
    }

    // If type=invoices, return all purchase invoices
    if (type === "invoices") {
      const invoices = await prisma.purchaseInvoice.findMany({
        where: { companyId },
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
      where: { status: "PENDING", companyId },
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
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  try {
    const sub = await requireActiveSubscription(req);
    if (sub) return sub;
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_PURCHASE_INVOICE, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      supplierId,
      poId,
      date,
      items,
      location,
      freight = 0,
      applyTax = false,
      taxConfigId = null,
      currencyId = null,
      exchangeRate = 1,
    } = body;

    // 1. Validation
    if (!supplierId || !date || !items?.length) {
      return NextResponse.json({ error: "Data missing" }, { status: 400 });
    }

    await ensureOpenPeriod(prisma, companyId, new Date(date));

    const validItems = items.filter((i: any) => Number(i.qty) > 0 && i.itemId);

    // 2. Start Transaction (Disabled due to Supabase connection issues)
    // const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const tx = prisma;
      
      // A. Supplier اور Inventory Account تلاش کریں
      const supplier = await tx.account.findFirst({ where: { id: supplierId, companyId } });
      if (!supplier) throw new Error("Supplier not found");

      let inventoryAcc = await tx.account.findFirst({
        where: {
          OR: [
            { name: { equals: "Stock/Inventory", mode: "insensitive" } },
            { code: { equals: "INV001", mode: "insensitive" } },
          ],
          companyId,
        },
      });

      if (!inventoryAcc) {
        inventoryAcc = await tx.account.create({
          data: { code: "INV001", name: "Stock/Inventory", type: "ASSET", companyId },
        });
      }

      // B. Invoice Number جنریٹ کریں (PI-1, PI-2...)
      const last = await tx.purchaseInvoice.findFirst({
        where: { invoiceNo: { startsWith: "PI-" }, companyId },
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
        const tax = await tx.taxConfiguration.findFirst({
          where: { id: taxConfigId, companyId }
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
          companyId,
          total: netTotal,
          approvalStatus: "PENDING",
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

      if (currencyId) {
        await tx.currencyTransaction.create({
          data: {
            transactionType: "INVOICE",
            transactionId: invoice.id,
            currencyId,
            amountInLocal: netTotal,
            amountInBase: netTotal * Number(exchangeRate || 1),
            exchangeRate: Number(exchangeRate || 1),
            conversionDate: new Date(date),
          },
        });
      }

      // D. اسٹاک اور PO اپڈیٹ کریں
      if (poId) {
        const po = await tx.purchaseOrder.findFirst({ where: { id: poId, companyId } });
        if (!po) throw new Error("Purchase order not found");
      }
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
            companyId,
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
        const isDone = allItems.every((pi: any) => pi.invoicedQty >= pi.qty);
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
          companyId,
          entries: {
            create: [
              { accountId: inventoryAcc.id, amount: netTotal, companyId }, // Debit Inventory (Asset)
              { accountId: supplier.id, amount: -netTotal, companyId },    // Credit Supplier
            ],
          },
        },
      });

      // return invoice;
    // });
    const result = invoice;

    return NextResponse.json({ success: true, id: result.id, invoiceNo: result.invoiceNo });
  } catch (e: any) {
    console.error("PI ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - Update Purchase Invoice
export async function PUT(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_PURCHASE_INVOICE, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      supplierId: _supplierId,
      date,
      items,
      location: _location,
      freight = 0,
      applyTax = false,
      taxConfigId = null,
      currencyId = null,
      exchangeRate = 1,
      approvalStatus,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    await ensureOpenPeriod(prisma, companyId, new Date(date));

    const existing = await prisma.purchaseInvoice.findFirst({
      where: { id, companyId },
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
      const tax = await prisma.taxConfiguration.findFirst({
        where: { id: taxConfigId, companyId }
      });
      if (tax) {
        taxAmount = (totalItemsAmount * tax.taxRate) / 100;
      }
    }
    
    const netTotal = totalItemsAmount + Number(freight) + taxAmount;

    // const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const tx = prisma;

      await tx.purchaseInvoiceItem.deleteMany({ where: { invoiceId: id } });

      const invoice = await tx.purchaseInvoice.update({
        where: { id },
        data: {
          date: new Date(date),
          total: netTotal,
          approvalStatus,
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

      await tx.currencyTransaction.deleteMany({
        where: { transactionType: "INVOICE", transactionId: id },
      });
      if (currencyId) {
        await tx.currencyTransaction.create({
          data: {
            transactionType: "INVOICE",
            transactionId: id,
            currencyId,
            amountInLocal: netTotal,
            amountInBase: netTotal * Number(exchangeRate || 1),
            exchangeRate: Number(exchangeRate || 1),
            conversionDate: new Date(date),
          },
        });
      }

      // return invoice;
    // });
    const result = invoice;

    return NextResponse.json({ success: true, invoice: result });
  } catch (e: any) {
    console.error("PI PUT ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - Delete Purchase Invoice
export async function DELETE(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_PURCHASE_INVOICE, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    // await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const tx = prisma;

      const existing = await tx.purchaseInvoice.findFirst({
        where: { id, companyId },
        select: { id: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      await tx.purchaseInvoiceItem.deleteMany({ where: { invoiceId: id } });
      await tx.purchaseInvoice.delete({ where: { id } });
    // });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("PI DELETE ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
