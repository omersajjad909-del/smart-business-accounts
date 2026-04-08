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

  const [jobs, technicians, parts, warranties] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "repair_job" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "repair_technician" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "repair_part" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "repair_warranty" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedJobs = jobs.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      job: record.title,
      customer: String(data.customer || ""),
      device: String(data.device || ""),
      dueDate: String(record.date || "").slice(0, 10),
      amount: Number(record.amount || 0),
      status: String(record.status || "diagnosis"),
    };
  });

  const mappedTechnicians = technicians.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      technician: record.title,
      specialty: String(data.specialty || ""),
      phone: String(data.phone || ""),
      workload: String(data.workload || ""),
      status: String(record.status || "active"),
    };
  });

  const mappedParts = parts.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      part: record.title,
      job: String(data.job || ""),
      quantity: Number(data.quantity || 0),
      supplier: String(data.supplier || ""),
      cost: Number(record.amount || 0),
      status: String(record.status || "available"),
    };
  });

  const mappedWarranties = warranties.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      claim: record.title,
      customer: String(data.customer || ""),
      device: String(data.device || ""),
      expiryDate: String(record.date || "").slice(0, 10),
      amount: Number(record.amount || 0),
      status: String(record.status || "covered"),
    };
  });

  return NextResponse.json({
    summary: {
      jobs: mappedJobs.length,
      activeJobs: mappedJobs.filter((item) => item.status === "diagnosis" || item.status === "repairing").length,
      readyJobs: mappedJobs.filter((item) => item.status === "ready").length,
      technicians: mappedTechnicians.length,
      activeTechnicians: mappedTechnicians.filter((item) => item.status === "active").length,
      partsCost: mappedParts.reduce((sum, item) => sum + item.cost * Math.max(1, item.quantity), 0),
      warrantyClaims: mappedWarranties.length,
      warrantyExposure: mappedWarranties.reduce((sum, item) => sum + item.amount, 0),
    },
    jobs: mappedJobs,
    technicians: mappedTechnicians,
    parts: mappedParts,
    warranties: mappedWarranties,
  });
}
