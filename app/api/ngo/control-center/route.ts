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

  const [donorRecords, grantRecords, beneficiaryRecords, fundRecords, transactionRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "donor" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "grant" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "beneficiary" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "fund" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "fund_transaction" }, orderBy: { createdAt: "desc" } }),
  ]);

  const donors = donorRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, donorId: String(data.donorId || record.id), name: record.title,
      phone: String(data.phone || ""), email: String(data.email || ""), type: String(data.type || "individual"),
      totalDonated: Number(record.amount || data.totalDonated || 0), lastDonation: Number(data.lastDonation || 0),
      frequency: String(data.frequency || "monthly"), status: String(record.status || "active"), category: String(data.category || ""),
    };
  });
  const grants = grantRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, grantNo: String(data.grantNo || record.id), title: record.title, donor: String(data.donor || ""),
      amount: Number(record.amount || data.amount || 0), currency: String(data.currency || "PKR"), startDate: String(record.date || data.startDate || ""),
      endDate: String(data.endDate || ""), purpose: String(data.purpose || ""), spent: Number(data.spent || 0),
      status: String(record.status || "active"), reportDue: data.reportDue ? String(data.reportDue) : undefined,
    };
  });
  const beneficiaries = beneficiaryRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, benefId: String(data.benefId || record.id), name: record.title, cnic: String(data.cnic || ""),
      phone: String(data.phone || ""), address: String(data.address || ""), category: String(data.category || "family"),
      assistance: Array.isArray(data.assistance) ? (data.assistance as string[]) : [],
      monthlyAid: Number(record.amount || data.monthlyAid || 0), status: String(record.status || "active"), enrollDate: String(record.date || data.enrollDate || ""),
    };
  });
  const funds = fundRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, name: record.title, purpose: String(data.purpose || ""), balance: Number(record.amount || data.balance || 0),
      totalReceived: Number(data.totalReceived || 0), totalSpent: Number(data.totalSpent || 0), donors: Number(data.donors || 0),
      status: String(record.status || "active"),
    };
  });
  const transactions = transactionRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, fund: String(data.fund || ""), type: String(record.status || "receipt"), amount: Number(record.amount || 0),
      description: record.title, date: String(record.date || ""), reference: String(data.reference || ""),
    };
  });

  const donorRaised = donors.reduce((sum, item) => sum + item.totalDonated, 0);
  const grantBook = grants.reduce((sum, item) => sum + item.amount, 0);

  return NextResponse.json({
    summary: {
      donors: donors.length,
      beneficiaries: beneficiaries.length,
      totalRaised: donorRaised + grantBook,
      donorRaised,
      grantBook,
      fundBalance: funds.reduce((sum, item) => sum + item.balance, 0),
      pendingReports: grants.filter((item) => item.status === "pending_report").length,
      activeGrants: grants.filter((item) => item.status === "active").length,
      monthlyAid: beneficiaries.filter((item) => item.status === "active").reduce((sum, item) => sum + item.monthlyAid, 0),
      transactions: transactions.length,
    },
    donors,
    grants,
    beneficiaries,
    funds,
    transactions,
  });
}
