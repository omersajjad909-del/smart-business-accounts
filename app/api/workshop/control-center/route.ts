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

  const [jobs, mechanics, parts, warranties] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "workshop_job" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "workshop_mechanic" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "workshop_part" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "workshop_warranty" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedJobs = jobs.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      job: record.title,
      customer: String(data.customer || ""),
      vehicle: String(data.vehicle || ""),
      promisedDate: String(record.date || "").slice(0, 10),
      amount: Number(record.amount || 0),
      status: String(record.status || "open"),
    };
  });

  const mappedMechanics = mechanics.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      mechanic: record.title,
      specialty: String(data.specialty || ""),
      phone: String(data.phone || ""),
      bay: String(data.bay || ""),
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
      status: String(record.status || "issued"),
    };
  });

  const mappedWarranties = warranties.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      claim: record.title,
      vehicle: String(data.vehicle || ""),
      customer: String(data.customer || ""),
      expiryDate: String(record.date || "").slice(0, 10),
      amount: Number(record.amount || 0),
      status: String(record.status || "active"),
    };
  });

  return NextResponse.json({
    summary: {
      jobs: mappedJobs.length,
      openJobs: mappedJobs.filter((item) => item.status === "open" || item.status === "in_progress").length,
      readyJobs: mappedJobs.filter((item) => item.status === "ready").length,
      mechanics: mappedMechanics.length,
      activeMechanics: mappedMechanics.filter((item) => item.status === "active").length,
      partsCost: mappedParts.reduce((sum, item) => sum + item.cost * Math.max(1, item.quantity), 0),
      warrantyClaims: mappedWarranties.length,
      warrantyExposure: mappedWarranties.reduce((sum, item) => sum + item.amount, 0),
    },
    jobs: mappedJobs,
    mechanics: mappedMechanics,
    parts: mappedParts,
    warranties: mappedWarranties,
  });
}
