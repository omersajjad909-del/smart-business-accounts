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

  const [caseRecords, clientRecords, invoiceRecords, timeRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "legal_case" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "legal_client" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "legal_invoice" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "time_entry" }, orderBy: { createdAt: "desc" } }),
  ]);

  const cases = caseRecords.map((record) => ({
    id: record.id,
    caseNo: String(record.data?.caseNo || record.id),
    title: record.title,
    client: String(record.data?.client || ""),
    type: String(record.data?.type || "Civil"),
    court: String(record.data?.court || ""),
    fileDate: String(record.date || record.data?.fileDate || ""),
    nextHearing: String(record.data?.nextHearing || ""),
    status: String(record.status || "Active"),
    lawyer: String(record.data?.lawyer || ""),
  }));
  const clients = clientRecords.map((record) => ({
    id: record.id,
    clientId: String(record.data?.clientId || record.id),
    name: record.title,
    type: String(record.data?.type || "Individual"),
    phone: String(record.data?.phone || ""),
    email: String(record.data?.email || ""),
    city: String(record.data?.city || ""),
    totalCases: Number(record.data?.totalCases || 0),
    activeCases: Number(record.data?.activeCases || 0),
    totalBilled: Number(record.amount || record.data?.totalBilled || 0),
    outstanding: Number(record.data?.outstanding || 0),
    joined: String(record.date || record.data?.joined || ""),
    status: String(record.status || "Active"),
  }));
  const invoices = invoiceRecords.map((record) => ({
    id: record.id,
    invoiceId: String(record.data?.invoiceId || record.id),
    caseId: String(record.data?.caseId || ""),
    client: record.title,
    description: String(record.data?.description || ""),
    hours: Number(record.data?.hours || 0),
    rate: Number(record.data?.rate || 0),
    amount: Number(record.data?.amount || 0),
    disbursements: Number(record.data?.disbursements || 0),
    total: Number(record.amount || record.data?.total || 0),
    status: String(record.status || "Draft"),
    dueDate: String(record.date || record.data?.dueDate || ""),
  }));
  const entries = timeRecords.map((record) => ({
    id: record.id,
    entryId: String(record.data?.entryId || record.id),
    date: String(record.date || record.data?.date || ""),
    lawyer: record.title,
    caseId: String(record.data?.caseId || ""),
    caseTitle: String(record.data?.caseTitle || ""),
    task: String(record.data?.task || ""),
    hours: Number(record.data?.hours || 0),
    rate: Number(record.data?.rate || 0),
    amount: Number(record.amount || record.data?.amount || 0),
    billable: Boolean(record.data?.billable),
    billed: String(record.status || "pending") === "billed",
  }));

  const now = new Date();
  const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return NextResponse.json({
    summary: {
      cases: cases.length,
      activeCases: cases.filter((item) => item.status === "Active").length,
      hearingsThisWeek: cases.filter((item) => {
        if (!item.nextHearing) return false;
        const diff = new Date(item.nextHearing).getTime() - todayTs;
        return diff >= 0 && diff <= 7 * 86400000;
      }).length,
      clients: clients.length,
      outstanding: clients.reduce((sum, item) => sum + item.outstanding, 0),
      paidRevenue: invoices.filter((item) => item.status === "Paid").reduce((sum, item) => sum + item.total, 0),
      totalBilled: invoices.reduce((sum, item) => sum + item.total, 0),
      billableHours: entries.filter((item) => item.billable).reduce((sum, item) => sum + item.hours, 0),
      unbilledTime: entries.filter((item) => item.billable && !item.billed).reduce((sum, item) => sum + item.amount, 0),
    },
    cases,
    clients,
    invoices,
    entries,
  });
}
