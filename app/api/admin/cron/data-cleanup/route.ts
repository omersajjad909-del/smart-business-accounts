/**
 * Data Cleanup Cron — POST /api/admin/cron/data-cleanup
 *
 * Deletes business data for companies whose dataRetentionUntil has passed.
 * Only admin role or a secret cron key can trigger this.
 *
 * Recommended: call this daily via external cron (e.g. GitHub Actions, EasyCron):
 *   POST https://finovaos.app/api/admin/cron/data-cleanup
 *   Header: x-cron-secret: <CRON_SECRET>
 *
 * What gets deleted:
 *   - All financial records (invoices, ledger, vouchers, inventory, etc.)
 *   - Employees, payroll, contacts, CRM data
 *   - Users linked to this company (UserCompany rows)
 *   - The Company record itself is marked PURGED (not deleted, for audit trail)
 *
 * What is KEPT forever (audit trail):
 *   - ActivityLog entries (anonymized — companyId kept, no business data)
 *   - The Company shell row with status=PURGED and purgedAt timestamp
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function POST(req: NextRequest) {
  // Allow admin role OR valid cron secret
  const userRole = req.headers.get("x-user-role");
  const cronSecret = req.headers.get("x-cron-secret");
  const isAdmin = userRole?.toUpperCase() === "ADMIN";
  const isCron = CRON_SECRET && cronSecret === CRON_SECRET;

  if (!isAdmin && !isCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    // Find all companies past their retention window
    const expiredCompanies = await prisma.company.findMany({
      where: {
        subscriptionStatus: "CANCELED",
        dataRetentionUntil: { lte: now },
      },
      select: { id: true, name: true, dataRetentionUntil: true },
    });

    if (expiredCompanies.length === 0) {
      return NextResponse.json({ purged: 0, message: "No expired accounts found." });
    }

    const results: { id: string; name: string; status: string; error?: string }[] = [];

    for (const company of expiredCompanies) {
      try {
        // Delete all business data in order (respecting FK constraints)
        await prisma.$transaction([
          // Financial
          prisma.ledgerEntry.deleteMany({ where: { companyId: company.id } }),
          prisma.voucherEntry.deleteMany({ where: { companyId: company.id } }),
          prisma.voucher.deleteMany({ where: { companyId: company.id } }),
          prisma.salesInvoice.deleteMany({ where: { companyId: company.id } }),
          prisma.purchaseInvoice.deleteMany({ where: { companyId: company.id } }),
          prisma.purchaseOrder.deleteMany({ where: { companyId: company.id } }),
          prisma.expenseVoucher.deleteMany({ where: { companyId: company.id } }),
          prisma.paymentReceipt.deleteMany({ where: { companyId: company.id } }),
          prisma.advancePayment.deleteMany({ where: { companyId: company.id } }),
          prisma.creditNote.deleteMany({ where: { companyId: company.id } }),
          prisma.debitNote.deleteMany({ where: { companyId: company.id } }),
          // Inventory
          prisma.inventoryTxn.deleteMany({ where: { companyId: company.id } }),
          prisma.itemNew.deleteMany({ where: { companyId: company.id } }),
          prisma.stockRate.deleteMany({ where: { companyId: company.id } }),
          prisma.outward.deleteMany({ where: { companyId: company.id } }),
          // HR & Payroll
          prisma.payroll.deleteMany({ where: { companyId: company.id } }),
          prisma.attendance.deleteMany({ where: { companyId: company.id } }),
          prisma.advanceSalary.deleteMany({ where: { companyId: company.id } }),
          prisma.employee.deleteMany({ where: { companyId: company.id } }),
          // CRM
          prisma.contact.deleteMany({ where: { companyId: company.id } }),
          prisma.quotation.deleteMany({ where: { companyId: company.id } }),
          prisma.deliveryChallan.deleteMany({ where: { companyId: company.id } }),
          // Banking
          prisma.bankStatement.deleteMany({ where: { companyId: company.id } }),
          prisma.bankAccount.deleteMany({ where: { companyId: company.id } }),
          // Accounts & Reports
          prisma.account.deleteMany({ where: { companyId: company.id } }),
          prisma.budget.deleteMany({ where: { companyId: company.id } }),
          prisma.costCenter.deleteMany({ where: { companyId: company.id } }),
          prisma.fixedAsset.deleteMany({ where: { companyId: company.id } }),
          prisma.loan.deleteMany({ where: { companyId: company.id } }),
          // System
          prisma.session.deleteMany({ where: { companyId: company.id } }),
          prisma.systemBackup.deleteMany({ where: { companyId: company.id } }),
          prisma.backupSchedule.deleteMany({ where: { companyId: company.id } }),
          prisma.businessRecord.deleteMany({ where: { companyId: company.id } }),
          prisma.userCompany.deleteMany({ where: { companyId: company.id } }),
          // Mark company as PURGED (keep shell for audit trail)
          prisma.company.update({
            where: { id: company.id },
            data: {
              subscriptionStatus: "PURGED",
              isActive: false,
              name: `[PURGED] ${company.name}`,
            },
          }),
          // Log the purge event
          prisma.activityLog.create({
            data: {
              companyId: company.id,
              userId: null,
              action: "DATA_PURGED",
              details: JSON.stringify({
                purgedAt: now.toISOString(),
                retentionExpired: company.dataRetentionUntil?.toISOString(),
                triggeredBy: isCron ? "CRON" : "ADMIN",
              }),
            },
          }),
        ]);

        results.push({ id: company.id, name: company.name, status: "purged" });
      } catch (err: any) {
        results.push({ id: company.id, name: company.name, status: "error", error: err.message });
      }
    }

    const purged = results.filter(r => r.status === "purged").length;
    const errors = results.filter(r => r.status === "error").length;

    return NextResponse.json({
      purged,
      errors,
      total: expiredCompanies.length,
      results,
      ranAt: now.toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET — preview which companies are due for cleanup (dry run)
export async function GET(req: NextRequest) {
  const userRole = req.headers.get("x-user-role");
  const cronSecret = req.headers.get("x-cron-secret");
  const isAdmin = userRole?.toUpperCase() === "ADMIN";
  const isCron = CRON_SECRET && cronSecret === CRON_SECRET;
  if (!isAdmin && !isCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const upcoming = await prisma.company.findMany({
    where: {
      subscriptionStatus: "CANCELED",
      dataRetentionUntil: { not: null },
    },
    select: {
      id: true,
      name: true,
      cancelledAt: true,
      dataRetentionUntil: true,
    },
    orderBy: { dataRetentionUntil: "asc" },
  });

  return NextResponse.json({
    total: upcoming.length,
    overdue: upcoming.filter(c => c.dataRetentionUntil! <= now).length,
    upcoming: upcoming.map(c => ({
      ...c,
      daysUntilPurge: Math.ceil((c.dataRetentionUntil!.getTime() - now.getTime()) / 86400000),
      overdue: c.dataRetentionUntil! <= now,
    })),
  });
}
