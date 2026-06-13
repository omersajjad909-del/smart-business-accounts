import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

// Creates a SalesInvoice document for a completed POS sale.
// Inventory txns and GL voucher are already created by /api/pos-checkout — this only records the document.
export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { receiptNo, date, items, total, discount, taxAmt, payMethod, customerId } = await req.json();

    if (!receiptNo || !items?.length || total == null) {
      return NextResponse.json({ error: "receiptNo, items and total required" }, { status: 400 });
    }

    // Resolve customer: use provided customerId, or fall back to any CUSTOMER account
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId) {
      const cashCustomer = await prisma.account.findFirst({
        where: { companyId, partyType: "CUSTOMER", name: { contains: "walk", mode: "insensitive" } },
      });
      const anyCustomer = cashCustomer ?? await prisma.account.findFirst({
        where: { companyId, partyType: "CUSTOMER" },
      });
      if (!anyCustomer) return NextResponse.json({ skipped: true, reason: "No customer account found" });
      resolvedCustomerId = anyCustomer.id;
    }

    // Validate all items exist
    const validItems = [];
    for (const i of items) {
      if (!i.itemId) continue;
      const item = await prisma.itemNew.findFirst({ where: { id: i.itemId, companyId } });
      if (item) validItems.push({ ...i, item });
    }
    if (validItems.length === 0) return NextResponse.json({ skipped: true, reason: "No valid items" });

    // Auto-number SI if receiptNo is taken
    const existing = await prisma.salesInvoice.findFirst({ where: { invoiceNo: receiptNo, companyId } });
    const invoiceNo = existing ? `${receiptNo}-POS` : receiptNo;

    const invoice = await prisma.salesInvoice.create({
      data: {
        companyId,
        invoiceNo,
        date: date ? new Date(date) : new Date(),
        customerId: resolvedCustomerId,
        total: Number(total),
        discount: Number(discount ?? 0),
        freight: 0,
        paymentMethod: payMethod || "cash",
        approvalStatus: "APPROVED",
        items: {
          create: validItems.map(i => ({
            itemId: i.itemId,
            qty: Number(i.qty),
            rate: Number(i.rate),
            amount: Number(i.qty) * Number(i.rate),
            discountPercent: Number(i.discountPercent ?? 0),
            taxPercent: Number(i.taxPercent ?? 0),
          })),
        },
      },
    });

    return NextResponse.json({ success: true, id: invoice.id, invoiceNo: invoice.invoiceNo });
  } catch (e: any) {
    console.error("POS Invoice error (non-fatal):", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
