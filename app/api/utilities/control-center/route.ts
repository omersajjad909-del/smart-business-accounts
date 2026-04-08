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

  const [connections, meters, bills] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "utility_connection" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "utility_meter" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "utility_billing" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedConnections = connections.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      account: record.title,
      customer: String(data.customer || ""),
      area: String(data.area || ""),
      tariff: String(data.tariff || ""),
      status: String(record.status || "pending"),
    };
  });

  const mappedMeters = meters.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      meter: record.title,
      account: String(data.account || ""),
      readingDate: String(record.date || "").slice(0, 10),
      units: Number(data.units || 0),
      status: String(record.status || "captured"),
    };
  });

  const mappedBills = bills.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      invoice: record.title,
      account: String(data.account || ""),
      billingMonth: String(data.billingMonth || ""),
      dueDate: String(record.date || "").slice(0, 10),
      amount: Number(record.amount || 0),
      status: String(record.status || "open"),
    };
  });

  return NextResponse.json({
    summary: {
      activeAccounts: mappedConnections.filter((item) => item.status === "active").length,
      pendingAccounts: mappedConnections.filter((item) => item.status === "pending").length,
      suspendedAccounts: mappedConnections.filter((item) => item.status === "suspended").length,
      meters: mappedMeters.length,
      verifiedReadings: mappedMeters.filter((item) => item.status === "verified").length,
      openBills: mappedBills.filter((item) => item.status === "open").length,
      billedValue: mappedBills.reduce((sum, item) => sum + item.amount, 0),
      unitsLogged: mappedMeters.reduce((sum, item) => sum + item.units, 0),
    },
    connections: mappedConnections,
    meters: mappedMeters,
    bills: mappedBills,
  });
}
