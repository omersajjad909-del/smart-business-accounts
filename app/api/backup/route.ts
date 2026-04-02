import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function GET(req: NextRequest) {
  const userRole = req.headers.get("x-user-role");
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const backups = await prisma.systemBackup.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(backups);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { backupType = "FULL" } = body;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup-${companyId.slice(0, 8)}-${timestamp}.json`;

  const backup = await prisma.systemBackup.create({
    data: { companyId, fileName, backupType, status: "PENDING", createdBy: userId || null },
  });

  try {
    // Full company data export
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

    const data = {
      companyId,
      exportedAt: new Date().toISOString(),
      accounts, items, vouchers, salesInvoices, purchaseInvoices,
      purchaseOrders, bankAccounts, budgets, recurringTransactions,
      financialYears, branches, costCenters, currencies, taxConfigs,
      expenseVouchers, paymentReceipts, employees, payrolls, loans,
      pettyCash, fixedAssets, crmContacts, opportunities,
    };

    const backupDir = join(process.cwd(), "backups");
    await mkdir(backupDir, { recursive: true });
    const filePath = join(backupDir, fileName);
    await writeFile(filePath, JSON.stringify(data, null, 2));
    const stats = await import("fs").then((fs) => fs.promises.stat(filePath));

    await prisma.systemBackup.update({
      where: { id: backup.id },
      data: {
        status: "COMPLETED",
        filePath,
        fileSize: stats.size,
        metadata: JSON.stringify({
          recordCount: {
            accounts: accounts.length,
            items: items.length,
            vouchers: vouchers.length,
            salesInvoices: salesInvoices.length,
            purchaseInvoices: purchaseInvoices.length,
            employees: employees?.length ?? 0,
            loans: loans?.length ?? 0,
          },
        }),
      },
    });

    return NextResponse.json({
      success: true,
      backup: { ...backup, status: "COMPLETED", filePath, fileSize: stats.size },
    });
  } catch (error: any) {
    await prisma.systemBackup.update({
      where: { id: backup.id },
      data: { status: "FAILED", metadata: JSON.stringify({ error: error.message }) },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
