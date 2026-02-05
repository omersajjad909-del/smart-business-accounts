import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    // صرف ADMIN backup دیکھ سکتا ہے
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const backups = await prisma.systemBackup.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(backups);
  } catch (e: any) {
    console.error("Backup GET Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.CREATE_ACCOUNTS,
      companyId
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { backupType = "FULL" } = body;

    // Create backup record
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup-${timestamp}.json`;
    const backup = await prisma.systemBackup.create({
      data: {
        fileName,
        backupType,
        status: "PENDING",
        createdBy: userId || null,
      },
    });

    try {
      // Export all data
      const data = {
        accounts: await prisma.account.findMany({ where: { companyId } }),
        items: await prisma.itemNew.findMany({ where: { companyId } }),
        vouchers: await prisma.voucher.findMany({
          where: { companyId },
          include: { entries: true },
        }),
        salesInvoices: await prisma.salesInvoice.findMany({
          where: { companyId },
          include: { items: true },
        }),
        purchaseInvoices: await prisma.purchaseInvoice.findMany({
          where: { companyId },
          include: { items: true },
        }),
        bankAccounts: await prisma.bankAccount.findMany({ where: { companyId } }),
        budgets: await prisma.budget.findMany({ where: { companyId } }),
        recurringTransactions: await prisma.recurringTransaction.findMany({
          where: { companyId },
        }),
        financialYears: await prisma.financialYear.findMany({ where: { companyId } }),
        timestamp: new Date().toISOString(),
      };

      // Save to file (in production, save to cloud storage)
      const backupDir = join(process.cwd(), "backups");
      try {
        await mkdir(backupDir, { recursive: true });
      } catch (e: any) {
        // Directory might already exist
      }

      const filePath = join(backupDir, fileName);
      await writeFile(filePath, JSON.stringify(data, null, 2));

      const stats = await import("fs").then((fs) =>
        fs.promises.stat(filePath)
      );

      // Update backup record
      await prisma.systemBackup.update({
        where: { id: backup.id },
        data: {
          status: "COMPLETED",
          filePath,
          fileSize: stats.size,
          metadata: JSON.stringify({
            recordCount: {
              accounts: data.accounts.length,
              items: data.items.length,
              vouchers: data.vouchers.length,
            },
          }),
        },
      });

      return NextResponse.json({
        success: true,
        backup: {
          ...backup,
          status: "COMPLETED",
          filePath,
          fileSize: stats.size,
        },
      });
    } catch (error: any) {
      await prisma.systemBackup.update({
        where: { id: backup.id },
        data: {
          status: "FAILED",
          metadata: JSON.stringify({ error: error.message }),
        },
      });

      throw error;
    }
  } catch (e: any) {
    console.error("Backup POST Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
