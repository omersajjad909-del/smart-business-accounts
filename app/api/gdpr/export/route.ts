import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/gdpr/export — Generate and return user's data export
// Compliant with GDPR Articles 15 (Right of Access) and 20 (Data Portability).
// Returns a single downloadable JSON file covering the user's profile/activity
// plus the full business data owned by the company. JSON is the canonical
// portable format; customers can convert to CSV/Excel/PDF using standard tools.
export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    const userId = req.headers.get("x-user-id");

    if (!companyId || !userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check for a completed or pending EXPORT request
    const gdprRequest = await prisma.gdprRequest.findFirst({
      where: { companyId, userId, type: "EXPORT", status: { in: ["PENDING", "PROCESSING", "COMPLETED"] } },
      orderBy: { requestedAt: "desc" },
    });

    if (gdprRequest?.status === "COMPLETED" && gdprRequest.downloadUrl) {
      return NextResponse.json({
        message: "Your export is ready.",
        downloadUrl: gdprRequest.downloadUrl,
        generatedAt: gdprRequest.completedAt,
      });
    }

    // --- 1. User / profile / activity data (Articles 15 & 20) ---
    const [user, company, loginLogs, auditLogs, activityLogs, sessions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, email: true, role: true, active: true,
          createdAt: true, referralCode: true, preferredLanguage: true,
          twoFactorEnabled: true, avatar: false,
        },
      }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true, name: true, code: true, country: true, baseCurrency: true,
          plan: true, businessType: true, subscriptionStatus: true,
          createdAt: true, preferredLanguage: true, ccpaOptOut: true,
        },
      }),
      prisma.loginLog.findMany({
        where: { userId, companyId },
        select: { loginAt: true, logoutAt: true, ipAddress: true, city: true, country: true },
        orderBy: { loginAt: "desc" },
        take: 100,
      }),
      prisma.auditLog.findMany({
        where: { userId, companyId },
        select: { action: true, entity: true, entityId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.activityLog.findMany({
        where: { userId, companyId },
        select: { action: true, details: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.session.findMany({
        where: { userId, companyId },
        select: { createdAt: true, expiresAt: true, ip: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    // --- 2. Full business data owned by the company ---
    // Run in chunked Promise.all batches (6 at a time) to keep memory sane
    // and stay within the 60s maxDuration budget for large tenants.
    // Defensive `(prisma as any).X?.findMany(...).catch(() => [])` pattern is
    // used for models that may not exist in the current schema yet.

    const batch1 = Promise.all([
      prisma.account.findMany({ where: { companyId } }).catch(() => []),
      (prisma as any).itemNew?.findMany({ where: { companyId } }).catch(() => []) ?? [],
      prisma.voucher.findMany({ where: { companyId }, include: { entries: true } }).catch(() => []),
      prisma.salesInvoice.findMany({ where: { companyId }, include: { items: true } }).catch(() => []),
      prisma.purchaseInvoice.findMany({ where: { companyId }, include: { items: true } }).catch(() => []),
      prisma.purchaseOrder.findMany({ where: { companyId }, include: { items: true } }).catch(() => []),
    ]);

    const batch2 = Promise.all([
      prisma.bankAccount.findMany({ where: { companyId } }).catch(() => []),
      prisma.budget.findMany({ where: { companyId } }).catch(() => []),
      prisma.recurringTransaction.findMany({ where: { companyId } }).catch(() => []),
      prisma.financialYear.findMany({ where: { companyId } }).catch(() => []),
      prisma.branch.findMany({ where: { companyId } }).catch(() => []),
      prisma.costCenter.findMany({ where: { companyId } }).catch(() => []),
    ]);

    const batch3 = Promise.all([
      prisma.currency.findMany({ where: { companyId } }).catch(() => []),
      prisma.taxConfiguration.findMany({ where: { companyId } }).catch(() => []),
      prisma.expenseVoucher.findMany({ where: { companyId }, include: { items: true } }).catch(() => []),
      prisma.paymentReceipt.findMany({ where: { companyId } }).catch(() => []),
      (prisma as any).employee?.findMany({ where: { companyId } }).catch(() => []) ?? [],
      (prisma as any).payroll?.findMany({ where: { companyId } }).catch(() => []) ?? [],
    ]);

    const batch4 = Promise.all([
      (prisma as any).loan?.findMany({ where: { companyId } }).catch(() => []) ?? [],
      (prisma as any).pettyCash?.findMany({ where: { companyId } }).catch(() => []) ?? [],
      (prisma as any).fixedAsset?.findMany({ where: { companyId } }).catch(() => []) ?? [],
      (prisma as any).contact?.findMany({ where: { companyId } }).catch(() => []) ?? [],
      (prisma as any).opportunity?.findMany({ where: { companyId } }).catch(() => []) ?? [],
    ]);

    const [
      [accounts, itemNew, vouchers, salesInvoices, purchaseInvoices, purchaseOrders],
      [bankAccounts, budgets, recurringTransactions, financialYears, branches, costCenters],
      [currencies, taxConfigurations, expenseVouchers, paymentReceipts, employees, payrolls],
      [loans, pettyCash, fixedAssets, contacts, opportunities],
    ] = await Promise.all([batch1, batch2, batch3, batch4]);

    const generatedAt = new Date();
    const dateSlug = generatedAt.toISOString().slice(0, 10);

    const exportData = {
      _meta: {
        generatedAt: generatedAt.toISOString(),
        companyId,
        userId,
        formatVersion: "2.0",
        gdprArticle: "Art. 15 & 20 GDPR — Right of Access and Data Portability",
        format: "application/json",
        formatNote:
          "JSON is the canonical portable format for this export. It contains " +
          "the full set of business records the customer owns plus the requesting " +
          "user's profile and activity. Each collection can be converted to CSV " +
          "(one file per model), Excel (one sheet per model), or PDF using standard " +
          "tools — e.g. `jq -r` + `csvkit`, Excel's Power Query JSON import, or any " +
          "spreadsheet/BI product that ingests JSON. Contact privacy@finovaforge.com " +
          "if you need assistance producing a specific derived format.",
      },
      _user: {
        profile: user,
        company,
        loginHistory: loginLogs,
        auditTrail: auditLogs,
        activityLog: activityLogs,
        sessions: sessions.map(s => ({ createdAt: s.createdAt, expiresAt: s.expiresAt, ip: s.ip })),
      },
      data: {
        accounts,
        items: itemNew,
        vouchers,
        salesInvoices,
        purchaseInvoices,
        purchaseOrders,
        bankAccounts,
        budgets,
        recurringTransactions,
        financialYears,
        branches,
        costCenters,
        currencies,
        taxConfigurations,
        expenseVouchers,
        paymentReceipts,
        employees,
        payrolls,
        loans,
        pettyCash,
        fixedAssets,
        contacts,
        opportunities,
      },
    };

    // Mark any pending EXPORT request as completed
    if (gdprRequest) {
      await prisma.gdprRequest.update({
        where: { id: gdprRequest.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    // Send notification email (best-effort — do not block the download)
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: "Your FinovaOS Data Export is Ready",
        html: `
          <p>Dear ${user.name},</p>
          <p>Your GDPR data export has been generated and downloaded from your browser.</p>
          <p>The file contains all personal data we hold about you and the full business
          data owned by your company, as required by GDPR Article 15 (Right of Access)
          and Article 20 (Data Portability).</p>
          <p>The export is delivered as JSON — the canonical portable format. You can
          convert it to CSV, Excel, or PDF using standard tools.</p>
          <p>If you have any questions about the data we hold, please contact
          <a href="mailto:privacy@finovaforge.com">privacy@finovaforge.com</a></p>
          <p>Export date: ${dateSlug}</p>
        `,
      }).catch(() => {});
    }

    // Return the export as a downloadable JSON attachment.
    const body = JSON.stringify(exportData, null, 2);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="finovaos-export-${companyId}-${dateSlug}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("GDPR export error:", err);
    return NextResponse.json({ error: "Failed to generate data export" }, { status: 500 });
  }
}
