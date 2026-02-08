import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { apiHasPermission as _apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS as _PERMISSIONS } from "@/lib/permissions";
import { readFile } from "fs/promises";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function POST(req: NextRequest) {
  try {
    const _userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    // صرف ADMIN restore کر سکتا ہے
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { backupId } = body;

    if (!backupId) {
      return NextResponse.json(
        { error: "Backup ID required" },
        { status: 400 }
      );
    }

    // Get backup record
    const backup = await prisma.systemBackup.findUnique({
      where: { id: backupId },
    });

    if (!backup || !backup.filePath) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    // Read backup file
    let backupData: string;
    try {
      backupData = await readFile(backup.filePath, "utf-8");
    } catch (err: any) {
      console.error("File read error:", err);
      return NextResponse.json(
        { error: `Cannot read backup file: ${err.message}` },
        { status: 500 }
      );
    }

    let data;
    try {
      data = JSON.parse(backupData);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Invalid backup file format: ${err.message}` },
        { status: 400 }
      );
    }

    console.log("Backup data loaded:", {
      hasAccounts: !!data.accounts,
      hasItems: !!data.items,
      hasVouchers: !!data.vouchers,
    });

    // Clear all data and restore from backup
    try {
      console.log("Starting data deletion...");
      
      // Delete in correct order (respecting foreign keys)
      // Delete records that depend on others FIRST
      await prisma.voucherEntry.deleteMany({});
      console.log("Deleted VoucherEntries");
      
      await prisma.voucher.deleteMany({});
      console.log("Deleted Vouchers");
      
      await prisma.salesInvoiceItem.deleteMany({});
      console.log("Deleted SalesInvoiceItems");
      
      await prisma.salesInvoice.deleteMany({});
      console.log("Deleted SalesInvoices");
      
      await prisma.purchaseInvoiceItem.deleteMany({});
      console.log("Deleted PurchaseInvoiceItems");
      
      await prisma.purchaseInvoice.deleteMany({});
      console.log("Deleted PurchaseInvoices");
      
      await prisma.recurringTransaction.deleteMany({});
      console.log("Deleted RecurringTransactions");
      
      await prisma.budget.deleteMany({});
      console.log("Deleted Budgets");

      // BankStatement and BankReconciliation depend on BankAccount
      await prisma.bankStatement.deleteMany({});
      console.log("Deleted BankStatements");
      
      await prisma.bankReconciliation.deleteMany({});
      console.log("Deleted BankReconciliations");
      
      await prisma.bankAccount.deleteMany({});
      console.log("Deleted BankAccounts");
      
      await prisma.itemNew.deleteMany({});
      console.log("Deleted Items");
      
      await prisma.account.deleteMany({});
      console.log("Deleted Accounts");

      console.log("Starting data restoration...");

      // Restore data in correct order
      if (data.accounts && Array.isArray(data.accounts)) {
        console.log(`Restoring ${data.accounts.length} accounts...`);
        for (const account of data.accounts) {
          try {
            await prisma.account.create({ data: account });
          } catch (e: any) {
            console.warn("Error creating account:", e.message);
          }
        }
      }

      if (data.items && Array.isArray(data.items)) {
        console.log(`Restoring ${data.items.length} items...`);
        for (const item of data.items) {
          try {
            await prisma.itemNew.create({ data: item });
          } catch (e: any) {
            console.warn("Error creating item:", e.message);
          }
        }
      }

      if (data.bankAccounts && Array.isArray(data.bankAccounts)) {
        console.log(`Restoring ${data.bankAccounts.length} bank accounts...`);
        for (const ba of data.bankAccounts) {
          try {
            await prisma.bankAccount.create({ data: ba });
          } catch (e: any) {
            console.warn("Error creating bank account:", e.message);
          }
        }
      }

      if (data.budgets && Array.isArray(data.budgets)) {
        console.log(`Restoring ${data.budgets.length} budgets...`);
        for (const budget of data.budgets) {
          try {
            await prisma.budget.create({ data: budget });
          } catch (e: any) {
            console.warn("Error creating budget:", e.message);
          }
        }
      }

      if (data.recurringTransactions && Array.isArray(data.recurringTransactions)) {
        console.log(`Restoring ${data.recurringTransactions.length} recurring transactions...`);
        for (const rt of data.recurringTransactions) {
          try {
            await prisma.recurringTransaction.create({ data: rt });
          } catch (e: any) {
            console.warn("Error creating recurring transaction:", e.message);
          }
        }
      }

      if (data.financialYears && Array.isArray(data.financialYears)) {
        console.log(`Restoring ${data.financialYears.length} financial years...`);
        for (const fy of data.financialYears) {
          try {
            await prisma.financialYear.create({ data: fy });
          } catch (e: any) {
            console.warn("Error creating financial year:", e.message);
          }
        }
      }

      if (data.salesInvoices && Array.isArray(data.salesInvoices)) {
        console.log(`Restoring ${data.salesInvoices.length} sales invoices...`);
        for (const si of data.salesInvoices) {
          try {
            const { items, ...invoiceData } = si;
            const created = await prisma.salesInvoice.create({
              data: invoiceData,
            });
            if (items && Array.isArray(items)) {
              for (const item of items) {
                try {
                  await prisma.salesInvoiceItem.create({
                    data: { ...item, invoiceId: created.id },
                  });
                } catch (e: any) {
                  console.warn("Error creating sales invoice item:", e.message);
                }
              }
            }
          } catch (e: any) {
            console.warn("Error creating sales invoice:", e.message);
          }
        }
      }

      if (data.purchaseInvoices && Array.isArray(data.purchaseInvoices)) {
        console.log(`Restoring ${data.purchaseInvoices.length} purchase invoices...`);
        for (const pi of data.purchaseInvoices) {
          try {
            const { items, ...invoiceData } = pi;
            const created = await prisma.purchaseInvoice.create({
              data: invoiceData,
            });
            if (items && Array.isArray(items)) {
              for (const item of items) {
                try {
                  await prisma.purchaseInvoiceItem.create({
                    data: { ...item, invoiceId: created.id },
                  });
                } catch (e: any) {
                  console.warn("Error creating purchase invoice item:", e.message);
                }
              }
            }
          } catch (e: any) {
            console.warn("Error creating purchase invoice:", e.message);
          }
        }
      }

      if (data.vouchers && Array.isArray(data.vouchers)) {
        console.log(`Restoring ${data.vouchers.length} vouchers...`);
        for (const voucher of data.vouchers) {
          try {
            const { entries, ...voucherData } = voucher;
            const created = await prisma.voucher.create({
              data: voucherData,
            });
            if (entries && Array.isArray(entries)) {
              for (const entry of entries) {
                try {
                  await prisma.voucherEntry.create({
                    data: { ...entry, voucherId: created.id },
                  });
                } catch (e: any) {
                  console.warn("Error creating voucher entry:", e.message);
                }
              }
            }
          } catch (e: any) {
            console.warn("Error creating voucher:", e.message);
          }
        }
      }

      console.log("Restore completed successfully");

      return NextResponse.json({
        success: true,
        message: "Data restored successfully",
      });
    } catch (error: any) {
      console.error("Restore error:", error);
      return NextResponse.json(
        { error: `Restore failed: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (e: any) {
    console.error("Restore Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

