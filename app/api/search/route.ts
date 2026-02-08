﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

type AccountSearch = Prisma.AccountGetPayload<{
  select: {
    id: true;
    name: true;
    code: true;
    type: true;
    partyType: true;
  };
}>;

type ItemSearch = Prisma.ItemNewGetPayload<{
  select: {
    id: true;
    name: true;
    code: true;
    unit: true;
  };
}>;

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = req.headers.get("x-company-id") || "";
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({
        accounts: [],
        items: [],
        salesInvoices: [],
        purchaseInvoices: [],
        vouchers: [],
      });
    }

    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        partyType: true,
      },
    });

    const items = await prisma.itemNew.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: {
        id: true,
        name: true,
        code: true,
        unit: true,
      },
    });

    const salesInvoices = await prisma.salesInvoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        invoiceNo: { contains: query, mode: "insensitive" },
      },
      take: 10,
      select: {
        id: true,
        invoiceNo: true,
        date: true,
        total: true,
        customer: { select: { name: true } },
      },
    });

    const purchaseInvoices = await prisma.purchaseInvoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        invoiceNo: { contains: query, mode: "insensitive" },
      },
      take: 10,
      select: {
        id: true,
        invoiceNo: true,
        date: true,
        total: true,
        supplier: { select: { name: true } },
      },
    });

    const vouchers = await prisma.voucher.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { voucherNo: { contains: query, mode: "insensitive" } },
          { narration: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: {
        id: true,
        voucherNo: true,
        type: true,
        date: true,
        narration: true,
      },
    });

    return NextResponse.json({
      accounts: accounts.map((a: AccountSearch) => ({
        type: "account",
        id: a.id,
        title: a.name,
        subtitle: `${a.code} - ${a.type}${a.partyType ? ` (${a.partyType})` : ""}`,
        url: `/dashboard/accounts`,
      })),

      items: items.map((i: ItemSearch) => ({
        type: "item",
        id: i.id,
        title: i.name,
        subtitle: `${i.code} - ${i.unit}`,
        url: `/dashboard/items-new`,
      })),

      salesInvoices: salesInvoices.map(
        (inv: {
          id: string;
          invoiceNo: string;
          date: Date;
          total: number;
          customer?: { name: string } | null;
        }) => ({
          type: "sales-invoice",
          id: inv.id,
          title: inv.invoiceNo,
          subtitle: `${inv.customer?.name || "N/A"} - ${new Date(
            inv.date
          ).toLocaleDateString()} - Rs. ${inv.total}`,
          url: `/dashboard/sales-invoice?id=${inv.id}`,
        })
      ),

      purchaseInvoices: purchaseInvoices.map(
        (inv: {
          id: string;
          invoiceNo: string;
          date: Date;
          total: number;
          supplier?: { name: string } | null;
        }) => ({
          type: "purchase-invoice",
          id: inv.id,
          title: inv.invoiceNo,
          subtitle: `${inv.supplier?.name || "N/A"} - ${new Date(
            inv.date
          ).toLocaleDateString()} - Rs. ${inv.total}`,
          url: `/dashboard/purchase-invoice?id=${inv.id}`,
        })
      ),

      vouchers: vouchers.map(
        (v: {
          id: string;
          voucherNo: string;
          type: string;
          date: Date;
          narration?: string | null;
        }) => ({
          type: "voucher",
          id: v.id,
          title: v.voucherNo,
          subtitle: `${v.type} - ${new Date(
            v.date
          ).toLocaleDateString()}${v.narration ? ` - ${v.narration}` : ""}`,
          url:
            v.type === "CPV"
              ? `/dashboard/cpv`
              : v.type === "CRV"
              ? `/dashboard/crv`
              : `/dashboard/jv`,
        })
      ),
    });
  } catch (e: any) {
    console.error("SEARCH ERROR:", e);
    return NextResponse.json({ error: e.message || "Search failed" }, { status: 500 });
  }
}
