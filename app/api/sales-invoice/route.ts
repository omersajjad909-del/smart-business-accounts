import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId, resolveBranchId, resolveBranchIdOrDefault } from "@/lib/tenant";
import { ensureOpenPeriod } from "@/lib/financialLock";
import { requireActiveSubscription } from "@/lib/subscriptionGuard";
import { logAuditFromReq } from "@/lib/auditLogger";
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


export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const branchId = await resolveBranchId(req, companyId);

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_SALES_INVOICE, companyId);

    if (!allowed) {
      return NextResponse.json({ error: "No Access" }, { status: 403 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const inv = await prisma.salesInvoice.findFirst({
        where: { id, companyId },
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
        // location removed (not on SalesInvoice)
      });
    }

    // Calculate next invoice number
    const allInvoices = await prisma.salesInvoice.findMany({
      where: { invoiceNo: { startsWith: "SI-" }, companyId, ...(branchId ? { branchId } : {}) },
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
      where: { companyId, ...(branchId ? { branchId } : {}) },
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
    const sub = await requireActiveSubscription(req);
    if (sub) return sub;
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const branchId = await resolveBranchIdOrDefault(req, companyId);

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_SALES_INVOICE, companyId);

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const {
      invoiceNo,
      customerId,
      date,
      dueDate = null,
      location,
      freight = 0,
      discount = 0,
      discountType = "flat",
      items,
      applyTax = false,
      taxConfigId = null,
      driverName = null,
      vehicleNo = null,
      salesmanId = null,
      currencyId = null,
      exchangeRate = 1,
      soId = null,
      notes = null,
      termsConditions = null,
      reference = null,
      paymentMethod = null,
      paymentTerms = null,
    } = body;

    await ensureOpenPeriod(prisma, companyId, new Date(date));

    const subtotal = items.reduce((s: number, i: any) => s + i.qty * i.rate, 0);
    const discountAmt = discountType === "percent" ? subtotal * Number(discount) / 100 : Number(discount);
    const itemsTax = items.reduce((s: number, i: any) => {
      const lineBase = i.qty * i.rate * (1 - (i.discountPercent || 0) / 100);
      return s + lineBase * (i.taxPercent || 0) / 100;
    }, 0);
    let globalTax = 0;
    if (applyTax && taxConfigId) {
      const tax = await prisma.taxConfiguration.findFirst({ where: { id: taxConfigId, companyId } });
      if (tax) globalTax = (subtotal - discountAmt) * tax.taxRate / 100;
    }
    const taxAmount = itemsTax + globalTax;
    const total = subtotal - discountAmt + taxAmount + Number(freight);

    // ── Stock availability check ──────────────────────────────────────────────
    for (const i of items) {
      if (!i.itemId) continue;
      try {
        const agg = await prisma.inventoryTxn.aggregate({
          where: { itemId: i.itemId, companyId },
          _sum: { qty: true },
        });
        const available = Number(agg._sum.qty ?? 0);
        const required = Number(i.qty);
        // Only block if stock has ever been tracked (available !== 0) AND is insufficient
        if (available > 0 && available < required) {
          const itm = await prisma.itemNew.findUnique({ where: { id: i.itemId }, select: { name: true } });
          return NextResponse.json(
            { error: `Insufficient stock for "${itm?.name || i.itemId}". Available: ${available}, Required: ${required}` },
            { status: 400 }
          );
        }
      } catch {
        // If stock check fails, allow the invoice (don't block on DB errors)
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const invoice = await prisma.salesInvoice.create({
      data: {
        companyId,
        branchId,
        invoiceNo,
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : null,
        customerId,
        driverName,
        vehicleNo,
        salesmanId: salesmanId || null,
        location: location || "MAIN",
        linkedSoId: soId || null,
        discount: Number(discount),
        discountType,
        freight: Number(freight),
        notes,
        termsConditions,
        reference,
        paymentMethod,
        paymentTerms,
        total,
        approvalStatus: "PENDING",
        items: {
          create: items.map((i: any) => {
            const lineBase = i.qty * i.rate;
            const lineDisc = lineBase * (i.discountPercent || 0) / 100;
            const lineTax = (lineBase - lineDisc) * (i.taxPercent || 0) / 100;
            return {
              itemId: i.itemId,
              qty: i.qty,
              rate: i.rate,
              discountPercent: i.discountPercent || 0,
              taxPercent: i.taxPercent || 0,
              amount: lineBase - lineDisc + lineTax,
            };
          }),
        },
        taxConfigId: applyTax ? taxConfigId : null,
      },
    });

    if (currencyId) {
      await prisma.currencyTransaction.create({
        data: {
          transactionType: "INVOICE",
          transactionId: invoice.id,
          currencyId,
          amountInLocal: total + taxAmount + Number(freight || 0),
          amountInBase: (total + taxAmount + Number(freight || 0)) * Number(exchangeRate || 1),
          exchangeRate: Number(exchangeRate || 1),
          conversionDate: new Date(date),
        },
      });
    }

    let salesAcc = await prisma.account.findFirst({
      where: { name: { equals: "Sales", mode: "insensitive" }, companyId },
    });

    if (!salesAcc) {
      salesAcc = await prisma.account.create({
        data: { companyId, code: "SALES", name: "Sales", type: "INCOME" },
      });
    }

    await prisma.voucher.create({
      data: {
        companyId,
        branchId,
        voucherNo: invoice.invoiceNo,
        type: "SI",
        date: new Date(date),
        narration: "Sales Invoice",
        entries: {
          create: [
            { companyId, accountId: customerId, amount: total + freight + taxAmount },
            { companyId, accountId: salesAcc.id, amount: -(total + freight + taxAmount) },
          ],
        },
      },
    });

    for (const i of items) {
      await prisma.inventoryTxn.create({
        data: {
          companyId,
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

    // If invoice is linked to a Sales Order, mark SO as CONFIRMED
    if (soId) {
      await prisma.businessRecord.updateMany({
        where: { id: soId, companyId, category: "sales_order" },
        data: { status: "CONFIRMED" },
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

    await logAuditFromReq(req, {
      companyId,
      entity: "SalesInvoice",
      entityId: invoice.id,
      action: "CREATE",
      afterValues: savedInvoice,
      description: `Created sales invoice ${invoice.invoiceNo} for ${savedInvoice?.customer?.name}`,
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

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_SALES_INVOICE, companyId);

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const {
      id,
      customerId: _customerId,
      date,
      dueDate = null,
      location: _location,
      freight = 0,
      discount = 0,
      discountType = "flat",
      items,
      applyTax = false,
      taxConfigId = null,
      driverName = null,
      vehicleNo = null,
      salesmanId = null,
      currencyId = null,
      exchangeRate = 1,
      notes = null,
      termsConditions = null,
      reference = null,
      paymentMethod = null,
      paymentTerms = null,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    await ensureOpenPeriod(prisma, companyId, new Date(date));

    const existing = await prisma.salesInvoice.findFirst({
      where: { id, companyId },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const subtotal = items.reduce((s: number, i: any) => s + i.qty * i.rate, 0);
    const discountAmt = discountType === "percent" ? subtotal * Number(discount) / 100 : Number(discount);
    const itemsTax = items.reduce((s: number, i: any) => {
      const lineBase = i.qty * i.rate * (1 - (i.discountPercent || 0) / 100);
      return s + lineBase * (i.taxPercent || 0) / 100;
    }, 0);
    let globalTax = 0;
    if (applyTax && taxConfigId) {
      const tax = await prisma.taxConfiguration.findFirst({ where: { id: taxConfigId, companyId } });
      if (tax) globalTax = (subtotal - discountAmt) * tax.taxRate / 100;
    }
    const taxAmount = itemsTax + globalTax;
    const total = subtotal - discountAmt + taxAmount + Number(freight);

    const result = await prisma.$transaction(async (tx: TxClient) => {
      // Reverse old inventory txns (SALE stored negative qty; reversal restores stock)
      for (const oldItem of existing.items) {
        if (!oldItem.itemId) continue;
        await tx.inventoryTxn.create({
          data: {
            companyId,
            type: "SALE_RETURN",
            date: new Date(date),
            itemId: oldItem.itemId,
            qty: Number(oldItem.qty),
            rate: Number(oldItem.rate),
            amount: Number(oldItem.qty) * Number(oldItem.rate),
            location: existing.location || "MAIN",
          },
        });
      }

      await tx.salesInvoiceItem.deleteMany({ where: { invoiceId: id } });

      const invoice = await tx.salesInvoice.update({
        where: { id },
        data: {
          date: new Date(date),
          dueDate: dueDate ? new Date(dueDate) : null,
          driverName,
          vehicleNo,
          salesmanId: salesmanId || null,
          discount: Number(discount),
          discountType,
          freight: Number(freight),
          notes,
          termsConditions,
          reference,
          paymentMethod,
          paymentTerms,
          total,
          taxConfigId: applyTax ? taxConfigId : null,
          items: {
            create: items.map((i: any) => {
              const lineBase = i.qty * i.rate;
              const lineDisc = lineBase * (i.discountPercent || 0) / 100;
              const lineTax = (lineBase - lineDisc) * (i.taxPercent || 0) / 100;
              return {
                itemId: i.itemId,
                qty: i.qty,
                rate: i.rate,
                discountPercent: i.discountPercent || 0,
                taxPercent: i.taxPercent || 0,
                amount: lineBase - lineDisc + lineTax,
              };
            }),
          },
        },
        include: {
          customer: true,
          items: { include: { item: true } },
          taxConfig: true
        },
      });

      // Create new inventory transactions for updated items
      for (const i of items) {
        if (!i.itemId) continue;
        await tx.inventoryTxn.create({
          data: {
            companyId,
            type: "SALE",
            date: new Date(date),
            itemId: i.itemId,
            qty: -Number(i.qty),
            rate: Number(i.rate),
            amount: Number(i.qty) * Number(i.rate),
            location: _location || "MAIN",
          },
        });
      }

      // Update GL voucher to reflect new totals
      const voucher = await tx.voucher.findFirst({
        where: { voucherNo: existing.invoiceNo, type: "SI", companyId },
      });
      if (voucher) {
        await tx.voucherEntry.deleteMany({ where: { voucherId: voucher.id } });
        const salesAcc = await tx.account.findFirst({
          where: { name: { equals: "Sales", mode: "insensitive" }, companyId },
        });
        if (salesAcc) {
          const customerId = _customerId || existing.customerId;
          await tx.voucherEntry.createMany({
            data: [
              { voucherId: voucher.id, companyId, accountId: customerId, amount: total + Number(freight) + taxAmount },
              { voucherId: voucher.id, companyId, accountId: salesAcc.id, amount: -(total + Number(freight) + taxAmount) },
            ],
          });
        }
        await tx.voucher.update({
          where: { id: voucher.id },
          data: { date: new Date(date) },
        });
      }

      await tx.currencyTransaction.deleteMany({
        where: { transactionType: "INVOICE", transactionId: id },
      });
      if (currencyId) {
        await tx.currencyTransaction.create({
          data: {
            transactionType: "INVOICE",
            transactionId: id,
            currencyId,
            amountInLocal: total + taxAmount + Number(freight || 0),
            amountInBase: (total + taxAmount + Number(freight || 0)) * Number(exchangeRate || 1),
            exchangeRate: Number(exchangeRate || 1),
            conversionDate: new Date(date),
          },
        });
      }

      return invoice;
    }, { timeout: 30000 });

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

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_SALES_INVOICE, companyId);

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    const existing = await prisma.salesInvoice.findFirst({
      where: { id, companyId },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx: TxClient) => {
      const voucher = await tx.voucher.findFirst({
        where: { voucherNo: existing.invoiceNo, type: "SI", companyId },
        select: { id: true },
      });
      if (voucher) {
        await tx.voucherEntry.deleteMany({ where: { voucherId: voucher.id } });
        await tx.voucher.delete({ where: { id: voucher.id } });
      }

      // Reverse inventory transactions on delete
      for (const oldItem of existing.items) {
        if (!oldItem.itemId) continue;
        await tx.inventoryTxn.create({
          data: {
            companyId,
            type: "SALE_RETURN",
            date: new Date(),
            itemId: oldItem.itemId,
            qty: Number(oldItem.qty),
            rate: Number(oldItem.rate),
            amount: Number(oldItem.qty) * Number(oldItem.rate),
            location: existing.location || "MAIN",
          },
        });
      }

      await tx.salesInvoiceItem.deleteMany({ where: { invoiceId: id } });
      await tx.salesInvoice.delete({ where: { id } });
    }, { timeout: 30000 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Sales Invoice DELETE Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
