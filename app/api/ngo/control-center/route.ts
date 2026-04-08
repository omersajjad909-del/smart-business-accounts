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

  const donors = donorRecords.map((record) => ({
    id: record.id, donorId: String(record.data?.donorId || record.id), name: record.title,
    phone: String(record.data?.phone || ""), email: String(record.data?.email || ""), type: String(record.data?.type || "individual"),
    totalDonated: Number(record.amount || record.data?.totalDonated || 0), lastDonation: Number(record.data?.lastDonation || 0),
    frequency: String(record.data?.frequency || "monthly"), status: String(record.status || "active"), category: String(record.data?.category || ""),
  }));
  const grants = grantRecords.map((record) => ({
    id: record.id, grantNo: String(record.data?.grantNo || record.id), title: record.title, donor: String(record.data?.donor || ""),
    amount: Number(record.amount || record.data?.amount || 0), currency: String(record.data?.currency || "PKR"), startDate: String(record.date || record.data?.startDate || ""),
    endDate: String(record.data?.endDate || ""), purpose: String(record.data?.purpose || ""), spent: Number(record.data?.spent || 0),
    status: String(record.status || "active"), reportDue: record.data?.reportDue ? String(record.data.reportDue) : undefined,
  }));
  const beneficiaries = beneficiaryRecords.map((record) => ({
    id: record.id, benefId: String(record.data?.benefId || record.id), name: record.title, cnic: String(record.data?.cnic || ""),
    phone: String(record.data?.phone || ""), address: String(record.data?.address || ""), category: String(record.data?.category || "family"),
    assistance: Array.isArray(record.data?.assistance) ? (record.data?.assistance as string[]) : [],
    monthlyAid: Number(record.amount || record.data?.monthlyAid || 0), status: String(record.status || "active"), enrollDate: String(record.date || record.data?.enrollDate || ""),
  }));
  const funds = fundRecords.map((record) => ({
    id: record.id, name: record.title, purpose: String(record.data?.purpose || ""), balance: Number(record.amount || record.data?.balance || 0),
    totalReceived: Number(record.data?.totalReceived || 0), totalSpent: Number(record.data?.totalSpent || 0), donors: Number(record.data?.donors || 0),
    status: String(record.status || "active"),
  }));
  const transactions = transactionRecords.map((record) => ({
    id: record.id, fund: String(record.data?.fund || ""), type: String(record.status || "receipt"), amount: Number(record.amount || 0),
    description: record.title, date: String(record.date || ""), reference: String(record.data?.reference || ""),
  }));

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
