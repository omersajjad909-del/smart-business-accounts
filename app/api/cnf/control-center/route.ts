import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const [jobs, salesInvoices, recentCustoms] = await Promise.all([
    prisma.businessRecord.findMany({
      where: { companyId, category: "cnf_job" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salesInvoice.aggregate({
      where: { companyId, deletedAt: null },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.businessRecord.findMany({
      where: { companyId, category: "customs_declaration" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const activeJobs    = jobs.filter(j => !["INVOICED","CLOSED"].includes(j.status || ""));
  const pendingCustoms = jobs.filter(j => j.status === "CUSTOMS_PENDING");
  const unbilled      = jobs.filter(j => j.status === "DELIVERED");
  const totalRevenue  = jobs.reduce((s, j) => s + Number(j.amount || 0), 0);

  return NextResponse.json({
    summary: {
      totalJobs: jobs.length,
      activeJobs: activeJobs.length,
      pendingCustoms: pendingCustoms.length,
      unbilledJobs: unbilled.length,
      totalRevenue,
      totalInvoiced: Number(salesInvoices._sum.total || 0),
      totalInvoiceCount: salesInvoices._count._all,
    },
    recentJobs: jobs.slice(0, 8).map(j => ({
      id: j.id,
      jobNo: j.title,
      clientName: String((j.data as Record<string, unknown>)?.clientName || ""),
      shipmentRef: String((j.data as Record<string, unknown>)?.shipmentRef || ""),
      mode: String((j.data as Record<string, unknown>)?.mode || "Sea"),
      status: j.status || "DRAFT",
      amount: Number(j.amount || 0),
      date: j.date?.toISOString().slice(0, 10) || "",
    })),
  });
}
