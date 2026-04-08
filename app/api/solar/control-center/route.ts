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

  const [projects, equipment, amc] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "solar_project" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "solar_equipment" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "solar_amc" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedProjects = projects.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      project: record.title,
      customer: String(data.customer || ""),
      site: String(data.site || ""),
      capacity: Number(data.capacityKw || 0),
      deadline: String(data.deadline || "").slice(0, 10),
      budget: Number(record.amount || 0),
      status: String(record.status || "planned"),
    };
  });
  const mappedEquipment = equipment.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      item: record.title,
      sku: String(data.sku || ""),
      quantity: Number(data.quantity || 0),
      reorderLevel: Number(data.reorderLevel || 0),
      warehouse: String(data.warehouse || ""),
      status: String(record.status || "in_stock"),
    };
  });
  const mappedAmc = amc.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      contract: record.title,
      customer: String(data.customer || ""),
      nextVisit: String(record.date || "").slice(0, 10),
      technician: String(data.technician || ""),
      value: Number(record.amount || 0),
      status: String(record.status || "scheduled"),
    };
  });

  return NextResponse.json({
    summary: {
      projects: mappedProjects.length,
      liveProjects: mappedProjects.filter((item) => item.status === "installing").length,
      commissionedProjects: mappedProjects.filter((item) => item.status === "commissioned").length,
      equipmentItems: mappedEquipment.length,
      lowStockEquipment: mappedEquipment.filter((item) => item.status === "low_stock" || item.quantity <= item.reorderLevel).length,
      amcContracts: mappedAmc.length,
      pendingVisits: mappedAmc.filter((item) => item.status === "scheduled" || item.status === "due").length,
      pipelineBudget: mappedProjects.reduce((sum, item) => sum + item.budget, 0),
    },
    projects: mappedProjects,
    equipment: mappedEquipment,
    amc: mappedAmc,
  });
}
