import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function normalizeRole(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

function normalizeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : new Date().toISOString();
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

  const [catalogRecords, projectRecords, deliveryRecords, timesheetRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "service_catalog" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "service_project" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "service_delivery" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "service_timesheet" }, orderBy: { createdAt: "desc" } }),
  ]);

  const catalog = catalogRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      name: row.title,
      billingType: String(data.billingType || "fixed"),
      rate: Number(row.amount || 0),
      turnaroundDays: Number(data.turnaroundDays || 0),
      scope: String(data.scope || ""),
    };
  });

  const projects = projectRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      projectCode: String(data.projectCode || row.title),
      name: row.title,
      client: String(data.client || ""),
      manager: String(data.manager || ""),
      dueDate: normalizeDate(row.date || row.createdAt).slice(0, 10),
      budget: Number(row.amount || 0),
      status: String(row.status || "active"),
    };
  });

  const deliveries = deliveryRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      deliveryNo: String(data.deliveryNo || row.title),
      projectCode: String(data.projectCode || ""),
      client: String(data.client || ""),
      milestone: row.title,
      dueDate: normalizeDate(row.date || row.createdAt).slice(0, 10),
      status: String(row.status || "planned"),
    };
  });

  const timesheets = timesheetRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      entryNo: String(data.entryNo || row.title),
      projectCode: String(data.projectCode || ""),
      consultant: String(data.consultant || ""),
      billableHours: Number(data.billableHours || 0),
      billingRate: Number(row.amount || 0),
      workDate: normalizeDate(row.date || row.createdAt).slice(0, 10),
      status: String(row.status || "draft"),
    };
  });

  const billableHours = timesheets.reduce((sum, item) => sum + item.billableHours, 0);
  const billableValue = timesheets.reduce((sum, item) => sum + item.billableHours * item.billingRate, 0);
  const activeClients = new Set(projects.map((item) => item.client).filter(Boolean)).size;
  const todayKey = new Date().toISOString().slice(0, 10);

  return NextResponse.json({
    summary: {
      catalog: catalog.length,
      activeProjects: projects.filter((item) => item.status !== "completed").length,
      completedProjects: projects.filter((item) => item.status === "completed").length,
      deliveries: deliveries.length,
      overdueDeliveries: deliveries.filter((item) => item.status !== "completed" && item.dueDate && item.dueDate < todayKey).length,
      reviewDeliveries: deliveries.filter((item) => item.status === "in_review").length,
      timesheets: timesheets.length,
      draftTimesheets: timesheets.filter((item) => item.status === "draft").length,
      billableHours,
      billableValue,
      activeClients,
    },
    catalog,
    projects,
    deliveries,
    timesheets,
  });
}
