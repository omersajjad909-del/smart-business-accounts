import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron: daily at 02:00 UTC. Fire-and-forget: response returns immediately
// while backup snapshots are created + emailed in the background.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    await runBackups();
  });

  return NextResponse.json({ ok: true, started: true });
}

async function runBackups() {
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const dayOfMonth = today.getUTCDate();

  const schedules = await prisma.backupSchedule.findMany({
    where: { isActive: true },
  });

  const results: { companyId: string; status: string; error?: string }[] = [];

  for (const schedule of schedules) {
    // Check if backup should run today
    const shouldRun =
      schedule.frequency === "DAILY" ||
      (schedule.frequency === "WEEKLY" && schedule.dayOfWeek === dayOfWeek) ||
      (schedule.frequency === "MONTHLY" && schedule.dayOfMonth === dayOfMonth);

    if (!shouldRun) continue;

    try {
      const companyId = schedule.companyId;

      // Collect all company data
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
        exportedAt: today.toISOString(),
        version: "2.0",
        accounts, items, vouchers, salesInvoices, purchaseInvoices,
        purchaseOrders, bankAccounts, budgets, recurringTransactions,
        financialYears, branches, costCenters, currencies, taxConfigs,
        expenseVouchers, paymentReceipts, employees, payrolls, loans,
        pettyCash, fixedAssets, crmContacts, opportunities,
      };

      const jsonStr = JSON.stringify(exportData);
      const fileSize = Buffer.byteLength(jsonStr, "utf8");
      const timestamp = today.toISOString().replace(/[:.]/g, "-");
      const fileName = `backup-${companyId.slice(0, 8)}-${timestamp}.json`;

      // Save to DB
      await prisma.systemBackup.create({
        data: {
          companyId,
          fileName,
          fileSize,
          backupType: "SCHEDULED",
          status: "COMPLETED",
          metadata: jsonStr,
          createdBy: "CRON",
        },
      });

      // Update schedule lastRun
      await prisma.backupSchedule.update({
        where: { companyId },
        data: { lastRunAt: today },
      });

      // Send backup via email if configured
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const adminEmail = process.env.EMAIL_ADMIN || smtpUser;

      if (smtpUser && smtpPass && adminEmail) {
        try {
          const transport = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: process.env.SMTP_SECURE === "true",
            auth: { user: smtpUser, pass: smtpPass },
          });

          const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
          const dateStr = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

          await transport.sendMail({
            from: `"FinovaOS Backup" <${smtpUser}>`,
            to: adminEmail,
            subject: `✅ FinovaOS Auto Backup — ${dateStr}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
                <h2 style="color:#0f172a;margin:0 0 16px;">🗄️ Scheduled Backup Complete</h2>
                <p style="color:#475569;font-size:14px;">Your FinovaOS database backup has been created successfully.</p>
                <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                  <tr style="background:#e2e8f0;">
                    <td style="padding:10px 14px;font-weight:700;font-size:13px;color:#475569;">Date</td>
                    <td style="padding:10px 14px;font-size:13px;color:#0f172a;">${dateStr}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;font-weight:700;font-size:13px;color:#475569;">File</td>
                    <td style="padding:10px 14px;font-size:13px;color:#0f172a;">${fileName}</td>
                  </tr>
                  <tr style="background:#e2e8f0;">
                    <td style="padding:10px 14px;font-weight:700;font-size:13px;color:#475569;">Size</td>
                    <td style="padding:10px 14px;font-size:13px;color:#0f172a;">${fileSizeMB} MB</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;font-weight:700;font-size:13px;color:#475569;">Records</td>
                    <td style="padding:10px 14px;font-size:13px;color:#0f172a;">
                      ${accounts.length} accounts · ${(salesInvoices as any[]).length} invoices · ${(vouchers as any[]).length} vouchers · ${(items as any[]).length} items
                    </td>
                  </tr>
                </table>
                <p style="color:#64748b;font-size:12px;margin-top:20px;">
                  Backup file is attached to this email. Store it safely.<br/>
                  You can also download it from Dashboard → Backup & Restore.
                </p>
                <p style="color:#94a3b8;font-size:11px;">FinovaOS · Automated Backup System</p>
              </div>
            `,
            attachments: [
              {
                filename: fileName,
                content: jsonStr,
                contentType: "application/json",
              },
            ],
          });
        } catch (emailErr) {
          console.error("Backup email failed:", emailErr);
          // Don't fail the backup if email fails
        }
      }

      // Keep only last 30 backups per company (cleanup old ones)
      const allBackups = await prisma.systemBackup.findMany({
        where: { companyId, backupType: "SCHEDULED" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (allBackups.length > 30) {
        const toDelete = allBackups.slice(30).map((b) => b.id);
        await prisma.systemBackup.deleteMany({ where: { id: { in: toDelete } } });
      }

      results.push({ companyId, status: "success" });
    } catch (err: any) {
      console.error(`Backup failed for ${schedule.companyId}:`, err);
      results.push({ companyId: schedule.companyId, status: "failed", error: err.message });
    }
  }

  console.log(`[cron] backup complete: ${results.length} runs`, results);
}
