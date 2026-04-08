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

  const [projects, sites, materials, subcontractors, boq, billing, expenses, payments] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "construction_project" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "construction_site" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "construction_material" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "subcontractor" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "boq_item" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "construction_billing" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "construction_expense" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "contractor_payment" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedProjects = projects.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, name: record.title, client: String(data.client || ""), budget: Number(record.amount || 0), spent: Number(data.spent || 0), startDate: String(record.date || "").slice(0, 10), endDate: String(data.endDate || ""), location: String(data.location || ""), progress: Number(data.progress || 0), site: String(data.site || ""), status: String(record.status || "planning") };
  });
  const mappedSites = sites.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, name: record.title, location: String(data.location || ""), supervisor: String(data.supervisor || ""), workers: Number(data.workers || 0), phone: String(data.phone || ""), status: String(record.status || "active") };
  });
  const mappedMaterials = materials.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, name: record.title, unit: String(data.unit || "bags"), quantity: Number(data.quantity || 0), unitCost: Number(record.amount || 0), supplier: String(data.supplier || ""), site: String(data.site || ""), project: String(data.project || ""), status: String(record.status || "in_stock") };
  });
  const mappedSubcontractors = subcontractors.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, name: record.title, trade: String(data.trade || ""), phone: String(data.phone || ""), contractValue: Number(record.amount || 0), paid: Number(data.paid || 0), project: String(data.project || ""), site: String(data.site || ""), status: String(record.status || "active") };
  });
  const mappedBoq = boq.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, project: record.title, item: String(data.item || ""), site: String(data.site || ""), unit: String(data.unit || "sqft"), quantity: Number(data.quantity || 0), unitRate: Number(record.amount || 0), billedQuantity: Number(data.billedQuantity || 0), status: String(record.status || "open") };
  });
  const mappedBilling = billing.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, project: record.title, client: String(data.client || ""), site: String(data.site || ""), invoiceNo: String(data.invoiceNo || ""), progress: Number(data.progress || 0), certifiedValue: Number(record.amount || 0), date: String(record.date || "").slice(0, 10), status: String(record.status || "draft") };
  });
  const mappedExpenses = expenses.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, title: record.title, site: String(data.site || ""), project: String(data.project || ""), category: String(data.category || ""), vendor: String(data.vendor || ""), amount: Number(record.amount || 0), date: String(record.date || "").slice(0, 10), status: String(record.status || "open") };
  });
  const mappedPayments = payments.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, subcontractor: record.title, project: String(data.project || ""), site: String(data.site || ""), reference: String(data.reference || ""), amount: Number(record.amount || 0), date: String(record.date || "").slice(0, 10), status: String(record.status || "scheduled") };
  });

  const materialValue = mappedMaterials.reduce((sum, row) => sum + row.quantity * row.unitCost, 0);
  const contractExposure = mappedSubcontractors.reduce((sum, row) => sum + (row.contractValue - row.paid), 0);

  return NextResponse.json({
    summary: {
      projects: mappedProjects.length,
      activeProjects: mappedProjects.filter((row) => row.status === "active").length,
      sites: mappedSites.length,
      activeSites: mappedSites.filter((row) => row.status === "active").length,
      materialValue,
      lowStockMaterials: mappedMaterials.filter((row) => row.status !== "in_stock" || row.quantity <= 10).length,
      subcontractors: mappedSubcontractors.length,
      contractExposure,
      boqItems: mappedBoq.length,
      certifiedBilling: mappedBilling.reduce((sum, row) => sum + row.certifiedValue, 0),
      expenses: mappedExpenses.reduce((sum, row) => sum + row.amount, 0),
      contractorPayments: mappedPayments.reduce((sum, row) => sum + row.amount, 0),
    },
    projects: mappedProjects,
    sites: mappedSites,
    materials: mappedMaterials,
    subcontractors: mappedSubcontractors,
    boq: mappedBoq,
    billing: mappedBilling,
    expenses: mappedExpenses,
    payments: mappedPayments,
  });
}
