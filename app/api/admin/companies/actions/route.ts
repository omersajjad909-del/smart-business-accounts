import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { companyId, action } = await req.json();

    if (!companyId || !action) {
      return NextResponse.json({ error: "companyId and action required" }, { status: 400 });
    }

    if (action === "TOGGLE_STATUS") {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const updated = await prisma.company.update({
        where: { id: companyId },
        data: { isActive: !company.isActive },
      });
      return NextResponse.json(updated);
    }

    if (action === "DELETE") {
      try {
        // Snapshot orphan users BEFORE any deletes
        const orphanUsers = await prisma.userCompany.findMany({
          where: { companyId },
          select: { userId: true },
        });
        const orphanUserIds = orphanUsers.map((u: { userId: string }) => u.userId);

        await prisma.user.updateMany({
          where: { defaultCompanyId: companyId },
          data: { defaultCompanyId: null },
        });

        // Wave 1 — child/detail rows (all independent, run in parallel)
        await Promise.allSettled([
          prisma.purchaseOrderItem.deleteMany({ where: { po: { companyId } } }),
          prisma.purchaseInvoiceItem.deleteMany({ where: { invoice: { companyId } } }),
          prisma.salesInvoiceItem.deleteMany({ where: { invoice: { companyId } } }),
          prisma.quotationItem.deleteMany({ where: { quotation: { companyId } } }),
          prisma.deliveryChallanItem.deleteMany({ where: { challan: { companyId } } }),
          prisma.outwardItem.deleteMany({ where: { outward: { companyId } } }),
          prisma.saleReturnItem.deleteMany({ where: { saleReturn: { companyId } } }),
          prisma.voucherEntry.deleteMany({ where: { companyId } }),
          prisma.ledgerEntry.deleteMany({ where: { companyId } }),
          prisma.invoiceTax.deleteMany({ where: { taxConfiguration: { companyId } } }),
          prisma.taxAccount.deleteMany({ where: { taxConfiguration: { companyId } } }),
          prisma.loanPayment.deleteMany({ where: { loan: { companyId } } }),
          prisma.depreciation.deleteMany({ where: { fixedAsset: { companyId } } }),
          prisma.expenseItem.deleteMany({ where: { expenseVoucher: { companyId } } }),
          prisma.expenseAttachment.deleteMany({ where: { expenseVoucher: { companyId } } }),
          prisma.expenseApproval.deleteMany({ where: { expenseVoucher: { companyId } } }),
          (prisma as any).advanceAdjustment?.deleteMany?.({ where: { advancePayment: { companyId } } }),
          (prisma as any).goodsReceiptNoteItem?.deleteMany?.({ where: { grn: { companyId } } }),
          (prisma as any).leave?.deleteMany?.({ where: { employee: { companyId } } }),
          (prisma as any).employeeDocument?.deleteMany?.({ where: { employee: { companyId } } }),
          (prisma as any).opportunityActivity?.deleteMany?.({ where: { opportunity: { contact: { companyId } } } }),
          (prisma as any).opportunity?.deleteMany?.({ where: { contact: { companyId } } }),
          (prisma as any).interaction?.deleteMany?.({ where: { contact: { companyId } } }),
          (prisma as any).contactDocument?.deleteMany?.({ where: { contact: { companyId } } }),
          (prisma as any).contactNote?.deleteMany?.({ where: { contact: { companyId } } }),
        ]);

        // Wave 2 — parent/header rows (run in parallel after children gone)
        await Promise.allSettled([
          prisma.paymentReceipt.deleteMany({ where: { companyId } }),
          prisma.bankReconciliation.deleteMany({ where: { bankAccount: { companyId } } }),
          prisma.bankStatement.deleteMany({ where: { companyId } }),
          prisma.expenseVoucher.deleteMany({ where: { companyId } }),
          prisma.creditNote.deleteMany({ where: { companyId } }),
          prisma.debitNote.deleteMany({ where: { companyId } }),
          prisma.advancePayment.deleteMany({ where: { companyId } }),
          prisma.loan.deleteMany({ where: { companyId } }),
          prisma.fixedAsset.deleteMany({ where: { companyId } }),
          prisma.purchaseInvoice.deleteMany({ where: { companyId } }),
          prisma.purchaseOrder.deleteMany({ where: { companyId } }),
          prisma.salesInvoice.deleteMany({ where: { companyId } }),
          prisma.saleReturn.deleteMany({ where: { companyId } }),
          prisma.quotation.deleteMany({ where: { companyId } }),
          prisma.deliveryChallan.deleteMany({ where: { companyId } }),
          prisma.outward.deleteMany({ where: { companyId } }),
          prisma.voucher.deleteMany({ where: { companyId } }),
          prisma.taxConfiguration.deleteMany({ where: { companyId } }),
          prisma.recurringTransaction.deleteMany({ where: { companyId } }),
          prisma.budget.deleteMany({ where: { companyId } }),
          prisma.inventoryTxn.deleteMany({ where: { companyId } }),
          prisma.stockRate.deleteMany({ where: { companyId } }),
          prisma.currency.deleteMany({ where: { companyId } }),
          prisma.financialYear.deleteMany({ where: { companyId } }),
          prisma.departmentBudget.deleteMany({ where: { companyId } }),
          prisma.backupSchedule.deleteMany({ where: { companyId } }),
          prisma.attendance.deleteMany({ where: { companyId } }),
          prisma.payroll.deleteMany({ where: { companyId } }),
          prisma.advanceSalary.deleteMany({ where: { companyId } }),
          prisma.employee.deleteMany({ where: { companyId } }),
          prisma.contact.deleteMany({ where: { companyId } }),
          (prisma as any).goodsReceiptNote?.deleteMany?.({ where: { companyId } }),
          (prisma as any).systemBackup?.deleteMany?.({ where: { companyId } }),
        ]);

        // Wave 3 — logs, permissions, accounts, bank (all parallel)
        await Promise.allSettled([
          prisma.activityLog.deleteMany({ where: { companyId } }),
          prisma.auditLog.deleteMany({ where: { companyId } }),
          prisma.loginLog.deleteMany({ where: { companyId } }),
          prisma.rolePermission.deleteMany({ where: { companyId } }),
          prisma.userPermission.deleteMany({ where: { companyId } }),
          prisma.session.deleteMany({ where: { companyId } }),
          prisma.userCompany.deleteMany({ where: { companyId } }),
          prisma.subscription.deleteMany({ where: { companyId } }),
          prisma.branch.deleteMany({ where: { companyId } }),
          prisma.costCenter.deleteMany({ where: { companyId } }),
          prisma.bankAccount.deleteMany({ where: { companyId } }),
          prisma.itemNew.deleteMany({ where: { companyId } }),
          prisma.account.deleteMany({ where: { companyId } }),
        ]);

        // Wave 4 — delete company itself
        await prisma.company.delete({ where: { id: companyId } });

        // Wave 5 — clean up orphan users (no remaining companies)
        if (orphanUserIds.length > 0) {
          const stillLinked = await prisma.userCompany.findMany({
            where: { userId: { in: orphanUserIds } },
            select: { userId: true },
          });
          const stillLinkedIds = new Set(stillLinked.map((u: { userId: string }) => u.userId));
          const toDelete = orphanUserIds.filter((id: string) => !stillLinkedIds.has(id));
          if (toDelete.length > 0) {
            await Promise.allSettled([
              prisma.session.deleteMany({ where: { userId: { in: toDelete } } }),
              prisma.loginLog.deleteMany({ where: { userId: { in: toDelete } } }),
              prisma.auditLog.deleteMany({ where: { userId: { in: toDelete } } }),
              prisma.activityLog.deleteMany({ where: { userId: { in: toDelete } } }),
            ]);
            await prisma.user.deleteMany({ where: { id: { in: toDelete } } });
          }
        }

        return NextResponse.json({ success: true, deletedOrphanUsers: orphanUserIds.length });
      } catch (err: any) {
        console.error("Delete Company Error:", err);
        return NextResponse.json({ error: "Deletion failed: " + err.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin Company Action Error:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
