import { prisma } from "@/lib/prisma";

export type BackupResult = {
  companyId: string;
  backupId: string;
  fileName: string;
  fileSize: number;
  jsonStr: string;
  counts: {
    accounts: number;
    items: number;
    vouchers: number;
    salesInvoices: number;
  };
};

/**
 * Snapshot one company's data into a SystemBackup row.
 *
 * The record is created up-front as PENDING so a crash mid-collection still
 * leaves a visible trail, then flipped to COMPLETED / FAILED. Callers get the
 * raw JSON back so they can email or download it without re-reading the blob.
 */
export async function createCompanyBackup(
  companyId: string,
  opts: { backupType?: string; createdBy?: string | null; keepLast?: number } = {}
): Promise<BackupResult> {
  const backupType = opts.backupType || "FULL";
  const createdBy = opts.createdBy ?? null;
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const fileName = `backup-${companyId.slice(0, 8)}-${timestamp}.json`;

  const backup = await prisma.systemBackup.create({
    data: { companyId, fileName, backupType, status: "PENDING", createdBy },
  });

  try {
    const [
      accounts, items, vouchers, salesInvoices, purchaseInvoices,
      purchaseOrders, bankAccounts, budgets, recurringTransactions,
      financialYears, branches, costCenters, currencies, taxConfigs,
      expenseVouchers, paymentReceipts, employees, payrolls, loans,
      pettyCash, fixedAssets, crmContacts, opportunities,
    ] = await Promise.all([
      prisma.account.findMany({ where: { companyId } }),
      prisma.itemNew.findMany({ where: { companyId } }),
      prisma.voucher.findMany({ where: { companyId }, include: { entries: true } }),
      prisma.salesInvoice.findMany({ where: { companyId }, include: { items: true } }),
      prisma.purchaseInvoice.findMany({ where: { companyId }, include: { items: true } }),
      prisma.purchaseOrder.findMany({ where: { companyId }, include: { items: true } }),
      prisma.bankAccount.findMany({ where: { companyId } }),
      prisma.budget.findMany({ where: { companyId } }),
      prisma.recurringTransaction.findMany({ where: { companyId } }),
      prisma.financialYear.findMany({ where: { companyId } }),
      prisma.branch.findMany({ where: { companyId } }),
      prisma.costCenter.findMany({ where: { companyId } }),
      prisma.currency.findMany({ where: { companyId } }),
      prisma.taxConfiguration.findMany({ where: { companyId } }),
      prisma.expenseVoucher.findMany({ where: { companyId }, include: { items: true } }),
      prisma.paymentReceipt.findMany({ where: { companyId } }),
      (prisma as any).employee?.findMany({ where: { companyId } }).catch(() => []),
      (prisma as any).payroll?.findMany({ where: { companyId } }).catch(() => []),
      (prisma as any).loan?.findMany({ where: { companyId } }).catch(() => []),
      (prisma as any).pettyCash?.findMany({ where: { companyId } }).catch(() => []),
      (prisma as any).fixedAsset?.findMany({ where: { companyId } }).catch(() => []),
      (prisma as any).contact?.findMany({ where: { companyId } }).catch(() => []),
      (prisma as any).opportunity?.findMany({ where: { companyId } }).catch(() => []),
    ]);

    const exportData = {
      companyId,
      exportedAt: now.toISOString(),
      version: "2.0",
      accounts, items, vouchers, salesInvoices, purchaseInvoices,
      purchaseOrders, bankAccounts, budgets, recurringTransactions,
      financialYears, branches, costCenters, currencies, taxConfigs,
      expenseVouchers, paymentReceipts, employees, payrolls, loans,
      pettyCash, fixedAssets, crmContacts, opportunities,
    };

    const jsonStr = JSON.stringify(exportData);
    const fileSize = Buffer.byteLength(jsonStr, "utf8");

    await prisma.systemBackup.update({
      where: { id: backup.id },
      data: { status: "COMPLETED", fileSize, metadata: jsonStr },
    });

    if (opts.keepLast && opts.keepLast > 0) {
      await pruneCompanyBackups(companyId, backupType, opts.keepLast);
    }

    return {
      companyId,
      backupId: backup.id,
      fileName,
      fileSize,
      jsonStr,
      counts: {
        accounts: accounts.length,
        items: (items as any[]).length,
        vouchers: (vouchers as any[]).length,
        salesInvoices: (salesInvoices as any[]).length,
      },
    };
  } catch (err: any) {
    await prisma.systemBackup
      .update({
        where: { id: backup.id },
        data: { status: "FAILED", metadata: JSON.stringify({ error: String(err?.message || err) }) },
      })
      .catch(() => {});
    throw err;
  }
}

/** Drop everything past the newest `keepLast` snapshots of one type. */
export async function pruneCompanyBackups(companyId: string, backupType: string, keepLast: number) {
  const all = await prisma.systemBackup.findMany({
    where: { companyId, backupType },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (all.length > keepLast) {
    const toDelete = all.slice(keepLast).map((b) => b.id);
    await prisma.systemBackup.deleteMany({ where: { id: { in: toDelete } } });
  }
}

/**
 * Companies a platform-wide backup should cover: live tenants only — demo
 * sandboxes and internal test workspaces are throwaway by design.
 */
export async function getBackupTargetCompanies() {
  return prisma.company.findMany({
    where: { isActive: true, isDemo: false, isInternalTest: false },
    select: { id: true, name: true },
  });
}
