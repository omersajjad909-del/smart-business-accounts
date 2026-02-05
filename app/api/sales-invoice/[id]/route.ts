import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

type SaleReturnWithItems = Prisma.SaleReturnGetPayload<{
  include: {
    items: true;
  };
}>;

type SaleReturnItem = Prisma.SaleReturnItemGetPayload<Prisma.SaleReturnItemDefaultArgs>;

type SalesInvoiceItemWithItem = Prisma.SalesInvoiceItemGetPayload<{
  include: {
    item: true;
  };
}>;

type SaleReturn = Prisma.SaleReturnGetPayload<{
  select: {
    returnNo: true;
  };
}>;

type TxClient = Prisma.TransactionClient;



type PendingItem = {
  itemId: string;
  name: string;
  qty: number;
  rate: number;
  maxQty: number;
};




const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

// ================= GET FUNCTION =================
// انوائس کی تفصیل لانا اور چیک کرنا کہ کتنا مال باقی ہے
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ error: "Invoice ID is missing" }, { status: 400 });
    }

    const invoice = await prisma.salesInvoice.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        items: { include: { item: true } },
        returns: { include: { items: true } } // تمام پرانی ریٹرنز بھی شامل کریں
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // 1. حساب لگائیں کہ کون سا آئٹم کتنا واپس ہو چکا ہے
    const returnedQtyMap: Record<string, number> = {};
    invoice.returns.forEach((ret: SaleReturnWithItems) => {
  ret.items.forEach((item: SaleReturnItem) => {
    returnedQtyMap[item.itemId] =
      (returnedQtyMap[item.itemId] || 0) + Number(item.qty || 0);
  });
});

const pendingItems = invoice.items
  .map(
    (i: SalesInvoiceItemWithItem): PendingItem => {
      const alreadyReturned = returnedQtyMap[i.itemId] || 0;
      const remainingQty = i.qty - alreadyReturned;

      return {
        itemId: i.itemId,
        name: i.item?.name || "Unknown Item",
        qty: remainingQty,
        rate: i.rate,
        maxQty: remainingQty,
      };
    }
  )
  .filter((it: PendingItem) => it.qty > 0);



    return NextResponse.json({
      customerId: invoice.customerId,
      customerName: invoice.customer?.name || "Unknown",
      items: pendingItems,
    });

  } catch (e: any) {
    console.error("DETAIL FETCH ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ================= POST FUNCTION =================
// سیلز ریٹرن کو سیو کرنا، اسٹاک اپ ڈیٹ کرنا اور واؤچر بنانا
export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const { customerId, invoiceId, date, freight = 0, items } = body;

    if (invoiceId) {
      const invoice = await prisma.salesInvoice.findFirst({
        where: { id: invoiceId, companyId },
        select: { id: true },
      });
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
    }

    // 1. اگلا SR نمبر جنریٹ کرنا (SR-1, SR-2...)
    const allReturns = await prisma.saleReturn.findMany({
      where: { returnNo: { startsWith: 'SR-' }, companyId },
      select: { returnNo: true }
    });

    let nextNo = "SR-1";
    if (allReturns.length > 0) {
      const numbers = allReturns.map((r: SaleReturn) => {
  const n = parseInt(r.returnNo.replace("SR-", ""));
  return isNaN(n) ? 0 : n;
});

      const maxNum = Math.max(...numbers);
      nextNo = `SR-${maxNum + 1}`;
    }

    const result = await prisma.$transaction(async (tx: TxClient) => {
      const subtotal = items.reduce((s: number, i: any) => s + Number(i.qty) * Number(i.rate), 0);
      const total = subtotal + Number(freight);

      // 2. سیلز ریٹرن ریکارڈ بنانا
      const saleReturn = await tx.saleReturn.create({
        data: {
          returnNo: nextNo,
          date: new Date(date),
          customerId,
          invoiceId,
          companyId,
          total: total,
          items: {
            create: items.map((i: any) => ({
              itemId: i.itemId,
              qty: Number(i.qty),
              rate: Number(i.rate),
              amount: Number(i.qty) * Number(i.rate),
            })),
          },
        },
      });

      // 3. اسٹاک میں واپسی (Inventory Transaction)
      for (const i of items) {
        await tx.inventoryTxn.create({
          data: {
            type: "SALE_RETURN",
            date: new Date(date),
            itemId: i.itemId,
            qty: Number(i.qty),
            rate: Number(i.rate),
            amount: Number(i.qty) * Number(i.rate),
            partyId: customerId,
            companyId,
          },
        });
      }

      // 4. اکاؤنٹنگ واؤچر اینٹری
      await tx.voucher.create({
        data: {
          voucherNo: nextNo,
          type: "SR",
          date: new Date(date),
          narration: `Sales Return ${nextNo} against Invoice ID ${invoiceId}`,
          companyId,
          entries: {
            create: [
              { accountId: "SALES_RETURN_ACC_ID", amount: total }, // Debit (Replace with real ID)
              { accountId: customerId, amount: -total },           // Credit
            ],
          },
        },
      });

      return saleReturn;
    });

    return NextResponse.json({ success: true, returnNo: nextNo, id: result.id });

  } catch (e: any) {
    console.error("POST ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}



