/**
 * GET  /api/external/invoices          — list sales invoices
 * GET  /api/external/invoices?id=<id>  — single invoice with line items
 * POST /api/external/invoices          — create a new sales invoice
 *
 * Auth: x-api-key or Authorization: Bearer <key>
 *
 * Query params (GET list):
 *   from        YYYY-MM-DD  filter by date >=
 *   to          YYYY-MM-DD  filter by date <=
 *   customer    string      partial name match
 *   limit       number      max records (default 50, max 200)
 *   offset      number      pagination offset
 *
 * POST body:
 *   {
 *     customerName: string          (matches existing account by name, or creates debtor)
 *     date: string                  YYYY-MM-DD
 *     items: [{ name, qty, price }]
 *     note?: string
 *   }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiSession, unauthResponse, enforceApiPlan } from "../_auth";

type InvoiceLineInput = {
  name?: string;
  itemName?: string;
  qty?: number | string;
  price?: number | string;
};

type InvoiceCreateBody = {
  customerName?: string;
  date?: string;
  items?: InvoiceLineInput[];
  tax?: number | string;
  note?: string;
};

export async function GET(req: NextRequest) {
  const session = await resolveApiSession(req);
  if (!session) return unauthResponse();

  const blocked = enforceApiPlan(session, "GET");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // ── Single invoice ──────────────────────────────────────────────────
  if (id) {
    const inv = await prisma.salesInvoice.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        items: { include: { item: { select: { name: true, code: true } } } },
      },
    }).catch(() => null);

    if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    return NextResponse.json({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      date: inv.date,
      customer: inv.customer,
      items: inv.items.map((li) => ({
        id: li.id,
        itemName: li.item?.name ?? "",
        itemCode: li.item?.code ?? "",
        qty: li.qty,
        price: li.rate,
        total: Number(li.amount),
      })),
      subtotal: inv.items.reduce((sum, li) => sum + Number(li.amount || 0), 0),
      tax: null,
      total: inv.total,
      note: null,
      createdAt: inv.createdAt,
    });
  }

  // ── List invoices ───────────────────────────────────────────────────
  const from     = searchParams.get("from");
  const to       = searchParams.get("to");
  const customer = searchParams.get("customer");
  const limit    = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset   = parseInt(searchParams.get("offset") || "0");

  const where: {
    companyId: string;
    deletedAt: null;
    date?: { gte?: Date; lte?: Date };
    customer?: { name: { contains: string; mode: "insensitive" } };
  } = {
    companyId: session.companyId,
    deletedAt: null,
  };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to)   where.date.lte = new Date(to);
  }
  if (customer) {
    where.customer = { name: { contains: customer, mode: "insensitive" } };
  }

  const [invoices, total] = await Promise.all([
    prisma.salesInvoice.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.salesInvoice.count({ where }),
  ]);

  return NextResponse.json({
    total,
    limit,
    offset,
    invoices: invoices.map((inv) => ({
      id:          inv.id,
      invoiceNo:   inv.invoiceNo,
      date:        inv.date,
      customerId:  inv.customerId,
      customerName:inv.customer?.name ?? "",
      total:       inv.total,
      createdAt:   inv.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await resolveApiSession(req);
  if (!session) return unauthResponse();

  const blocked = enforceApiPlan(session, "POST");
  if (blocked) return blocked;

  let body: InvoiceCreateBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { customerName, date, items } = body;

  if (!customerName || !date || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "Required: customerName, date, items[]" },
      { status: 400 }
    );
  }

  // Find or create customer account
  let customer = await prisma.account.findFirst({
    where: { companyId: session.companyId, name: { equals: customerName, mode: "insensitive" }, deletedAt: null },
  }).catch(() => null);

  if (!customer) {
    // Auto-create as CUSTOMER type
    const lastCode = await prisma.account.findFirst({
      where: { companyId: session.companyId, code: { startsWith: "1100" } },
      orderBy: { code: "desc" },
    }).catch(() => null);
    const nextCode = lastCode ? `${parseInt(lastCode.code) + 1}` : "11001";
    customer = await prisma.account.create({
      data: {
        companyId: session.companyId,
        name: customerName,
        code: nextCode,
        type: "ASSET",
        partyType: "CUSTOMER",
        openDebit: 0,
        openCredit: 0,
        openDate: new Date(date),
      },
    });
  }

  // Compute totals
  const lineItems = items.map((li: InvoiceLineInput) => ({
    itemName: String(li.name ?? li.itemName ?? ""),
    qty:      Number(li.qty ?? 1),
    price:    Number(li.price ?? 0),
  }));
  const subtotal = lineItems.reduce((s, li) => s + li.qty * li.price, 0);
  const tax      = Number(body.tax ?? 0);
  const total    = subtotal + tax;

  const preparedItems = await Promise.all(
    lineItems.map(async (li: { itemName: string; qty: number; price: number }) => {
      let item = await prisma.itemNew.findFirst({
        where: {
          companyId: session.companyId,
          name: { equals: li.itemName, mode: "insensitive" },
          deletedAt: null,
        },
      });

      if (!item) {
        const codeSeed = li.itemName.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6) || "ITEM";
        item = await prisma.itemNew.create({
          data: {
            companyId: session.companyId,
            code: `${codeSeed}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: li.itemName,
            unit: "PCS",
            rate: li.price,
            minStock: 0,
          },
        });
      }

      return {
        itemId: item.id,
        qty: li.qty,
        rate: li.price,
        amount: li.qty * li.price,
      };
    })
  );

  // Next invoice number
  const last = await prisma.salesInvoice.findFirst({
    where: { companyId: session.companyId, invoiceNo: { startsWith: "SI-" } },
    orderBy: { createdAt: "desc" },
  }).catch(() => null);
  const lastNum = last ? parseInt((last.invoiceNo ?? "").replace("SI-", "")) || 0 : 0;
  const invoiceNo = `SI-${lastNum + 1}`;

  const invoice = await prisma.salesInvoice.create({
    data: {
      companyId:  session.companyId,
      customerId: customer.id,
      invoiceNo,
      date:       new Date(date),
      total,
      items: {
        create: preparedItems.map((li) => ({
          item: { connect: { id: li.itemId } },
          qty:      li.qty,
          rate:     li.rate,
          amount:   li.amount,
        })),
      },
    },
    include: {
      items: true,
      customer: { select: { id: true, name: true } },
    },
  });

  // Log API usage
  await prisma.activityLog.create({
    data: {
      action:    "API_KEY_USED",
      companyId: session.companyId,
      details:   JSON.stringify({ keyId: session.keyId, endpoint: "/api/external/invoices", method: "POST", invoiceId: invoice.id }),
    },
  }).catch(() => {});

  return NextResponse.json({ success: true, invoice }, { status: 201 });
}
