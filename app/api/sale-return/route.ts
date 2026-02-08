import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma} from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
type SaleReturn = Prisma.SaleReturnGetPayload<{
  select: {
    returnNo: true;
  };
}>;

type TxClient = Prisma.TransactionClient;



const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

// GET - List all Sale Returns
export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const returns = await prisma.saleReturn.findMany({
      where: { companyId },
      include: {
        customer: true,
        invoice: true,
        items: {
          include: { item: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(returns);
  } catch (e: any) {
    console.error("Sale Return GET Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { customerId, invoiceId, date, items, freight = 0 } = await req.json();

    if (!customerId || !date || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (invoiceId) {
      const invoice = await prisma.salesInvoice.findFirst({
        where: { id: invoiceId, companyId },
        select: { id: true },
      });
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
    }

    // 1. تمام موجودہ SR نمبرز حاصل کر کے اگلا نمبر (SR-1, SR-2...) نکالنا
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

    // 2. ٹرانزیکشن شروع کریں تاکہ سارا ڈیٹا ایک ساتھ سیو ہو
   const result = await prisma.$transaction(async (tx: TxClient) => {
  const subtotal = items.reduce(
    (s: number, i: any) => s + Number(i.qty) * Number(i.rate),
    0
  );
  const total = subtotal + Number(freight);

  let salesReturnAcc = await tx.account.findFirst({
    where: { name: { equals: "Sales Return", mode: "insensitive" }, companyId },
  });

  if (!salesReturnAcc) {
    salesReturnAcc = await tx.account.create({
      data: { code: "SALES_RETURN", name: "Sales Return", type: "EXPENSE", companyId },
    });
  }

  const saleReturn = await tx.saleReturn.create({
    data: {
      returnNo: nextNo,
      date: new Date(date),
      customerId,
      invoiceId: invoiceId || null,
      companyId,
      total,
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

      // اسٹاک واپس پلس کرنا
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

      // اکاؤنٹنگ واؤچر بنانا
      await tx.voucher.create({
        data: {
          voucherNo: nextNo,
          type: "SR",
          date: new Date(date),
          narration: `Sales Return ${nextNo} (Invoice: ${invoiceId || 'N/A'})`,
          companyId,
          entries: {
            create: [
              { accountId: salesReturnAcc.id, amount: total, companyId }, // Debit
              { accountId: customerId, amount: -total, companyId },       // Credit
            ],
          },
        },
      });

      return saleReturn;
    });

    return NextResponse.json({ success: true, id: result.id, returnNo: nextNo });
  } catch (e: any) {
    console.error("SALE RETURN ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - Update Sale Return
export async function PUT(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const { id, customerId: _customerId, invoiceId: _invoiceId, date, items, freight = 0 } = body;

    if (!id) {
      return NextResponse.json({ error: "Return ID required" }, { status: 400 });
    }

    const existing = await prisma.saleReturn.findFirst({
      where: { id, companyId },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    const subtotal = items.reduce((s: number, i: any) => s + Number(i.qty) * Number(i.rate), 0);
    const total = subtotal + Number(freight);

    const result = await prisma.$transaction(async (tx: TxClient) => {

      await tx.saleReturnItem.deleteMany({ where: { returnId: id } });

      const saleReturn = await tx.saleReturn.update({
        where: { id },
        data: {
          date: new Date(date),
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
        include: {
          customer: true,
          items: {
            include: { item: true },
          },
        },
      });

      return saleReturn;
    });

    return NextResponse.json({ success: true, return: result });
  } catch (e: any) {
    console.error("Sale Return PUT Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - Delete Sale Return
export async function DELETE(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Return ID required" }, { status: 400 });
    }

    const existing = await prisma.saleReturn.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx : TxClient) => {
      await tx.saleReturnItem.deleteMany({ where: { returnId: id } });
      await tx.saleReturn.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Sale Return DELETE Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
