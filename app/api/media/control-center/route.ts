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

  const [campaigns, clients, plans] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "media_campaign" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "media_client" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "media_plan" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedCampaigns = campaigns.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      campaign: record.title,
      client: String(data.client || ""),
      channel: String(data.channel || ""),
      dueDate: String(record.date || "").slice(0, 10),
      budget: Number(record.amount || 0),
      status: String(record.status || "planning"),
    };
  });

  const mappedClients = clients.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      client: record.title,
      industry: String(data.industry || ""),
      manager: String(data.manager || ""),
      retainer: Number(record.amount || 0),
      status: String(record.status || "active"),
    };
  });

  const mappedPlans = plans.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      plan: record.title,
      campaign: String(data.campaign || ""),
      channel: String(data.channel || ""),
      startDate: String(record.date || "").slice(0, 10),
      spend: Number(record.amount || 0),
      status: String(record.status || "draft"),
    };
  });

  return NextResponse.json({
    summary: {
      campaigns: mappedCampaigns.length,
      activeCampaigns: mappedCampaigns.filter((item) => item.status === "active").length,
      clients: mappedClients.length,
      activeClients: mappedClients.filter((item) => item.status === "active").length,
      approvedPlans: mappedPlans.filter((item) => item.status === "approved" || item.status === "live").length,
      campaignBudget: mappedCampaigns.reduce((sum, item) => sum + item.budget, 0),
      retainers: mappedClients.reduce((sum, item) => sum + item.retainer, 0),
      plannedSpend: mappedPlans.reduce((sum, item) => sum + item.spend, 0),
    },
    campaigns: mappedCampaigns,
    clients: mappedClients,
    plans: mappedPlans,
  });
}
