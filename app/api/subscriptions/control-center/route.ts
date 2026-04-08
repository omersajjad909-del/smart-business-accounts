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

  const [plans, subscribers, billings] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "subscription_plan" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "subscription_subscriber" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "subscription_billing" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedPlans = plans.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      planCode: String(data.planCode || `PLAN-${record.id.slice(-4).toUpperCase()}`),
      name: record.title,
      interval: String(data.interval || "Monthly"),
      price: Number(record.amount || 0),
      trialDays: Number(data.trialDays || 0),
      seats: Number(data.seats || 1),
      status: String(record.status || "active"),
      subscribers: Number(data.subscribers || 0),
    };
  });

  const mappedSubscribers = subscribers.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      company: record.title,
      contact: String(data.contact || ""),
      email: String(data.email || ""),
      planId: String(data.planId || ""),
      planName: String(data.planName || ""),
      interval: String(data.interval || "Monthly"),
      amount: Number(record.amount || 0),
      status: String(record.status || "trial"),
      renewalDate: String(data.renewalDate || ""),
      joinedAt: String(record.date || data.joinedAt || "").slice(0, 10),
    };
  });

  const mappedBillings = billings.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      invoiceNo: String(data.invoiceNo || `INV-${record.id.slice(-6).toUpperCase()}`),
      subscriberId: String(data.subscriberId || ""),
      company: record.title,
      planName: String(data.planName || ""),
      amount: Number(record.amount || 0),
      dueDate: String(data.dueDate || ""),
      paidAt: String(data.paidAt || ""),
      status: String(record.status || "scheduled"),
    };
  });

  const mrr = mappedSubscribers
    .filter((item) => item.status === "active" || item.status === "past_due")
    .reduce((sum, item) => sum + (item.interval === "Yearly" ? item.amount / 12 : item.interval === "Quarterly" ? item.amount / 3 : item.amount), 0);

  return NextResponse.json({
    summary: {
      plans: mappedPlans.length,
      activePlans: mappedPlans.filter((item) => item.status === "active").length,
      subscribers: mappedSubscribers.length,
      activeSubscribers: mappedSubscribers.filter((item) => item.status === "active").length,
      trialSubscribers: mappedSubscribers.filter((item) => item.status === "trial").length,
      pastDueSubscribers: mappedSubscribers.filter((item) => item.status === "past_due").length,
      cancelledSubscribers: mappedSubscribers.filter((item) => item.status === "cancelled").length,
      mrr,
      arr: mrr * 12,
      collectedThisCycle: mappedBillings.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0),
      failedBillings: mappedBillings.filter((item) => item.status === "failed").length,
    },
    plans: mappedPlans,
    subscribers: mappedSubscribers,
    billings: mappedBillings,
  });
}
