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

  const [contractRecords, scheduleRecords, jobRecords, partRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "maintenance_contract" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "maintenance_schedule" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "maintenance_job" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "maintenance_part" }, orderBy: { createdAt: "desc" } }),
  ]);

  const contracts = contractRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      contract: record.title,
      client: String(data.client || ""),
      asset: String(data.asset || ""),
      visitsPerYear: Number(data.visitsPerYear || 0),
      value: Number(record.amount || 0),
      renewalDate: String(record.date || "").slice(0, 10),
      status: String(record.status || "active"),
    };
  });

  const schedules = scheduleRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      visit: record.title,
      client: String(data.client || ""),
      site: String(data.site || ""),
      team: String(data.team || ""),
      visitType: String(data.visitType || ""),
      scheduledDate: String(record.date || "").slice(0, 10),
      status: String(record.status || "scheduled"),
    };
  });

  const jobs = jobRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      job: record.title,
      client: String(data.client || ""),
      technician: String(data.assignedTo || ""),
      priority: String(data.priority || ""),
      scheduledDate: String(record.date || "").slice(0, 10),
      status: String(record.status || "Pending"),
    };
  });

  const parts = partRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      part: record.title,
      job: String(data.job || ""),
      supplier: String(data.supplier || ""),
      quantity: Number(data.quantity || 0),
      reorderLevel: Number(data.reorderLevel || 0),
      cost: Number(record.amount || 0),
      status: String(record.status || "available"),
    };
  });

  return NextResponse.json({
    summary: {
      contracts: contracts.length,
      activeContracts: contracts.filter((item) => item.status === "active").length,
      renewalDue: contracts.filter((item) => item.status === "renewal_due").length,
      schedules: schedules.length,
      scheduledVisits: schedules.filter((item) => item.status === "scheduled" || item.status === "due_today").length,
      completedVisits: schedules.filter((item) => item.status === "completed").length,
      jobs: jobs.length,
      openJobs: jobs.filter((item) => !["Completed", "Cancelled"].includes(String(item.status))).length,
      urgentJobs: jobs.filter((item) => item.priority === "Urgent" && !["Completed", "Cancelled"].includes(String(item.status))).length,
      parts: parts.length,
      lowStockParts: parts.filter((item) => item.status === "low_stock" || item.quantity <= item.reorderLevel).length,
      contractValue: contracts.reduce((sum, item) => sum + item.value, 0),
    },
    contracts,
    schedules,
    jobs,
    parts,
  });
}
