import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

type LoyaltyRecord = {
  title: string;
  amount: number | null;
  data: Record<string, unknown>;
};

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function normalizePhone(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "");
}

function matchLoyaltyPoints(
  account: { name: string; email: string | null; phone: string | null },
  loyaltyRecords: LoyaltyRecord[],
) {
  const email = normalizeText(account.email);
  const phone = normalizePhone(account.phone);
  const name = normalizeText(account.name);

  const match = loyaltyRecords.find((record) => {
    const data = record.data || {};
    const loyaltyEmail = normalizeText(typeof data.email === "string" ? data.email : "");
    const loyaltyPhone = normalizePhone(typeof data.phone === "string" ? data.phone : "");
    const loyaltyName = normalizeText(record.title);

    return (
      (email && loyaltyEmail === email) ||
      (phone && loyaltyPhone === phone) ||
      (!email && !phone && loyaltyName === name)
    );
  });

  return Number(match?.amount || 0);
}

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const [accounts, salesSummary, loyaltyRecords] = await Promise.all([
    prisma.account.findMany({
      where: { companyId, deletedAt: null, partyType: "CUSTOMER" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        email: true,
        city: true,
        creditLimit: true,
        openDebit: true,
        openCredit: true,
      },
    }),
    prisma.salesInvoice.groupBy({
      by: ["customerId"],
      where: { companyId, deletedAt: null },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.businessRecord.findMany({
      where: { companyId, category: "loyalty_member" },
      select: { title: true, amount: true, data: true },
    }),
  ]);

  const salesMap = new Map(
    salesSummary.map((row) => [
      row.customerId,
      {
        totalSales: Number(row._sum.total || 0),
        transactions: row._count._all,
      },
    ]),
  );

  const rows = accounts.map((account) => {
    const summary = salesMap.get(account.id);
    const loyaltyPoints = matchLoyaltyPoints(account, loyaltyRecords as LoyaltyRecord[]);
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      phone: account.phone || "",
      email: account.email || "",
      city: account.city || "",
      creditLimit: Number(account.creditLimit || 0),
      balance: Number(account.openDebit || 0) - Number(account.openCredit || 0),
      totalSales: summary?.totalSales || 0,
      transactions: summary?.transactions || 0,
      loyaltyPoints,
      status: "active",
    };
  });

  return NextResponse.json({
    customers: rows,
    summary: {
      totalCustomers: rows.length,
      activeCustomers: rows.length,
      outstandingBalance: rows.reduce((sum, row) => sum + row.balance, 0),
      totalSales: rows.reduce((sum, row) => sum + row.totalSales, 0),
      loyaltyMembers: rows.filter((row) => row.loyaltyPoints > 0).length,
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
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }

  const lastCustomer = await prisma.account.findFirst({
    where: { companyId, partyType: "CUSTOMER", code: { startsWith: "CUS-" } },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  const nextNumber = lastCustomer?.code?.match(/(\d+)$/)?.[1]
    ? Number(lastCustomer.code.match(/(\d+)$/)?.[1]) + 1
    : 1;

  const created = await prisma.account.create({
    data: {
      companyId,
      code: `CUS-${String(nextNumber).padStart(3, "0")}`,
      name,
      type: "ASSET",
      partyType: "CUSTOMER",
      phone: body.phone ? String(body.phone).trim() : null,
      email: body.email ? String(body.email).trim().toLowerCase() : null,
      city: body.city ? String(body.city).trim() : null,
      creditLimit: Number(body.creditLimit || 0),
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
      creditLimit: true,
    },
  });

  return NextResponse.json({
    id: created.id,
    code: created.code,
    name: created.name,
    phone: created.phone || "",
    email: created.email || "",
    city: created.city || "",
    creditLimit: Number(created.creditLimit || 0),
    balance: 0,
    totalSales: 0,
    transactions: 0,
    loyaltyPoints: 0,
    status: "active",
  });
}
