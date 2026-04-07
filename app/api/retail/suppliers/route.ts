import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const [accounts, purchasesSummary] = await Promise.all([
    prisma.account.findMany({
      where: { companyId, deletedAt: null, partyType: "SUPPLIER" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        email: true,
        city: true,
        openDebit: true,
        openCredit: true,
      },
    }),
    prisma.purchaseInvoice.groupBy({
      by: ["supplierId"],
      where: { companyId, deletedAt: null },
      _sum: { total: true },
      _count: { _all: true },
    }),
  ]);

  const purchasesMap = new Map(
    purchasesSummary.map((row) => [
      row.supplierId,
      {
        totalPurchases: Number(row._sum.total || 0),
        transactions: row._count._all,
      },
    ]),
  );

  const rows = accounts.map((account) => {
    const summary = purchasesMap.get(account.id);
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      phone: account.phone || "",
      email: account.email || "",
      city: account.city || "",
      balance: Number(account.openCredit || 0) - Number(account.openDebit || 0),
      totalPurchases: summary?.totalPurchases || 0,
      transactions: summary?.transactions || 0,
      status: "active",
    };
  });

  return NextResponse.json({
    suppliers: rows,
    summary: {
      totalSuppliers: rows.length,
      activeSuppliers: rows.length,
      totalPayable: rows.reduce((sum, row) => sum + row.balance, 0),
      totalPurchases: rows.reduce((sum, row) => sum + row.totalPurchases, 0),
    },
  });
}

export async function POST(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
  }

  const lastSupplier = await prisma.account.findFirst({
    where: { companyId, partyType: "SUPPLIER", code: { startsWith: "SUP-" } },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  const nextNumber = lastSupplier?.code?.match(/(\d+)$/)?.[1]
    ? Number(lastSupplier.code.match(/(\d+)$/)?.[1]) + 1
    : 1;

  const created = await prisma.account.create({
    data: {
      companyId,
      code: `SUP-${String(nextNumber).padStart(3, "0")}`,
      name,
      type: "LIABILITY",
      partyType: "SUPPLIER",
      phone: body.phone ? String(body.phone).trim() : null,
      email: body.email ? String(body.email).trim().toLowerCase() : null,
      city: body.city ? String(body.city).trim() : null,
      openDate: new Date(),
      openDebit: 0,
      openCredit: 0,
    },
    select: {
      id: true,
      code: true,
      name: true,
      phone: true,
      email: true,
      city: true,
    },
  });

  return NextResponse.json({
    id: created.id,
    code: created.code,
    name: created.name,
    phone: created.phone || "",
    email: created.email || "",
    city: created.city || "",
    balance: 0,
    totalPurchases: 0,
    transactions: 0,
    status: "active",
  });
}
