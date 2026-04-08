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
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const [packageRecords, connectionRecords, billRecords, ticketRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "isp_package" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "isp_connection" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "isp_bill" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "isp_ticket" }, orderBy: { createdAt: "desc" } }),
  ]);

  const packages = packageRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      name: record.title,
      speed: String(data.speed || ""),
      quota: String(data.quota || "Unlimited"),
      price: Number(record.amount || 0),
      status: String(record.status || "active"),
    };
  });

  const connections = connectionRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      customer: record.title,
      phone: String(data.phone || ""),
      packageId: String(data.packageId || ""),
      packageName: String(data.packageName || ""),
      address: String(data.address || ""),
      status: String(record.status || "pending"),
      installedAt: String(record.date || data.installedAt || ""),
    };
  });

  const bills = billRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      invoiceNo: String(data.invoiceNo || `BILL-${record.id.slice(-6).toUpperCase()}`),
      customer: record.title,
      connectionId: String(data.connectionId || ""),
      amount: Number(record.amount || 0),
      dueDate: String(data.dueDate || record.date || ""),
      status: String(record.status || "generated"),
      cycle: String(data.cycle || ""),
    };
  });

  const tickets = ticketRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      customer: record.title,
      issue: String(data.issue || ""),
      connectionId: String(data.connectionId || ""),
      priority: String(data.priority || "Normal"),
      status: String(record.status || "open"),
      openedAt: String(record.date || data.openedAt || ""),
    };
  });

  return NextResponse.json({
    summary: {
      packages: packages.length,
      activePackages: packages.filter((item) => item.status === "active").length,
      connections: connections.length,
      activeConnections: connections.filter((item) => item.status === "active").length,
      suspendedConnections: connections.filter((item) => item.status === "suspended").length,
      bills: bills.length,
      overdueBills: bills.filter((item) => item.status === "overdue").length,
      paidRevenue: bills.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0),
      tickets: tickets.length,
      openTickets: tickets.filter((item) => item.status === "open" || item.status === "assigned").length,
    },
    packages,
    connections,
    bills,
    tickets,
  });
}
