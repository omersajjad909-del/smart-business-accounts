import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function normalizeRole(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

export async function GET(req: NextRequest) {
  const role = normalizeRole(req.headers.get("x-user-role"));
  if (!["ADMIN", "ACCOUNTANT", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const [outlets, royalties] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "franchise_outlet" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "franchise_royalty" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedOutlets = outlets.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      outletName: String(data.outletName ?? record.title ?? ""),
      location: String(data.location || ""),
      franchisee: String(data.franchisee || ""),
      openDate: String(data.openDate || ""),
      employees: Number(data.employees || 0),
      monthlySales: Number(record.amount || 0),
      status: String(record.status || "Active"),
    };
  });

  const mappedRoyalties = royalties.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      outlet: record.title,
      month: String(data.month || ""),
      rate: Number(data.rate || 0),
      amount: Number(record.amount || 0),
      status: String(record.status || "calculated"),
    };
  });

  return NextResponse.json({
    summary: {
      outlets: mappedOutlets.length,
      activeOutlets: mappedOutlets.filter((item) => item.status === "Active").length,
      monthlySales: mappedOutlets.reduce((sum, item) => sum + item.monthlySales, 0),
      royaltyValue: mappedRoyalties.reduce((sum, item) => sum + item.amount, 0),
      receivedCycles: mappedRoyalties.filter((item) => item.status === "received").length,
    },
    outlets: mappedOutlets,
    royalties: mappedRoyalties,
  });
}
