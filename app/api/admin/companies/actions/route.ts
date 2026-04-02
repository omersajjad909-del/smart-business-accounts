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
        await prisma.user.updateMany({
          where: { defaultCompanyId: companyId },
          data: { defaultCompanyId: null },
        });

        try { await prisma.purchaseOrderItem.deleteMany({ where: { po: { companyId } } }); } catch {}
        try { await prisma.purchaseInvoiceItem.deleteMany({ where: { invoice: { companyId } } }); } catch {}
        try { await prisma.salesInvoiceItem.deleteMany({ where: { invoice: { companyId } } }); } catch {}
        try { await prisma.quotationItem.deleteMany({ where: { quotation: { companyId } } }); } catch {}
        try { await prisma.deliveryChallanItem.deleteMany({ where: { challan: { companyId } } }); } catch {}
        try { await prisma.outwardItem.deleteMany({ where: { outward: { companyId } } }); } catch {}
        try { await prisma.saleReturnItem.deleteMany({ where: { saleReturn: { companyId } } }); } catch {}
        try { await prisma.voucherEntry.deleteMany({ where: { companyId } }); } catch {}
        try { await prisma.ledgerEntry.deleteMany({ where: { companyId } }); } catch {}
        try { await prisma.invoiceTax.deleteMany({ where: { taxConfiguration: { companyId } } }); } catch {}
        try { await prisma.taxAccount.deleteMany({ where: { taxConfiguration: { companyId } } }); } catch {}
        try { await prisma.loanPayment.deleteMany({ where: { loan: { companyId } } }); } catch {}
        try { await prisma.depreciation.deleteMany({ where: { fixedAsset: { companyId } } }); } catch {}
        try { await prisma.expenseItem.deleteMany({ where: { expenseVoucher: { companyId } } }); } catch {}
        try { await prisma.expenseAttachment.deleteMany({ where: { expenseVoucher: { companyId } } }); } catch {}
        try { await prisma.expenseApproval.deleteMany({ where: { expenseVoucher: { companyId } } }); } catch {}
        try { await (prisma as any).advanceAdjustment?.deleteMany?.({ where: { advancePayment: { companyId } } }); } catch {}

        await prisma.paymentReceipt.deleteMany({ where: { companyId } }).catch(() => {});

        await prisma.bankReconciliation.deleteMany({ where: { bankAccount: { companyId } } }).catch(() => {});
        await prisma.bankStatement.deleteMany({ where: { companyId } }).catch(() => {});

        await prisma.expenseVoucher.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.creditNote.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.debitNote.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.advancePayment.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.loan.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.fixedAsset.deleteMany({ where: { companyId } }).catch(() => {});

        await prisma.purchaseInvoice.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.purchaseOrder.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.salesInvoice.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.saleReturn.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.quotation.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.deliveryChallan.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.outward.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.voucher.deleteMany({ where: { companyId } }).catch(() => {});

        await prisma.taxConfiguration.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.recurringTransaction.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.budget.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.inventoryTxn.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.stockRate.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.currency.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.financialYear.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.departmentBudget.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.backupSchedule.deleteMany({ where: { companyId } }).catch(() => {});

        try { await (prisma as any).leave?.deleteMany?.({ where: { employee: { companyId } } }); } catch {}
        try { await (prisma as any).employeeDocument?.deleteMany?.({ where: { employee: { companyId } } }); } catch {}
        await prisma.attendance.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.payroll.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.advanceSalary.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.employee.deleteMany({ where: { companyId } }).catch(() => {});

        try { await (prisma as any).opportunityActivity?.deleteMany?.({ where: { opportunity: { contact: { companyId } } } }); } catch {}
        try { await (prisma as any).opportunity?.deleteMany?.({ where: { contact: { companyId } } }); } catch {}
        try { await (prisma as any).interaction?.deleteMany?.({ where: { contact: { companyId } } }); } catch {}
        try { await (prisma as any).contactDocument?.deleteMany?.({ where: { contact: { companyId } } }); } catch {}
        try { await (prisma as any).contactNote?.deleteMany?.({ where: { contact: { companyId } } }); } catch {}
        await prisma.contact.deleteMany({ where: { companyId } }).catch(() => {});

        await prisma.activityLog.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.auditLog.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.loginLog.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.rolePermission.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.userPermission.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.session.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.userCompany.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.subscription.deleteMany({ where: { companyId } }).catch(() => {});

        await prisma.branch.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.costCenter.deleteMany({ where: { companyId } }).catch(() => {});

        await prisma.bankAccount.deleteMany({ where: { companyId } }).catch(() => {});

        // GRN items then GRN
        try { await (prisma as any).goodsReceiptNoteItem?.deleteMany?.({ where: { grn: { companyId } } }); } catch {}
        await (prisma as any).goodsReceiptNote?.deleteMany?.({ where: { companyId } }).catch(() => {});

        // System backups
        await (prisma as any).systemBackup?.deleteMany?.({ where: { companyId } }).catch(() => {});

        await prisma.itemNew.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.account.deleteMany({ where: { companyId } }).catch(() => {});

        // Find users who ONLY belonged to this company (no other company)
        const orphanUsers = await prisma.userCompany.findMany({
          where: { companyId },
          select: { userId: true },
        });
        const orphanUserIds = orphanUsers.map((u: { userId: string }) => u.userId);

        // Delete the company
        await prisma.company.delete({ where: { id: companyId } });

        // Now delete orphan users (those with no remaining companies)
        if (orphanUserIds.length > 0) {
          const stillLinked = await prisma.userCompany.findMany({
            where: { userId: { in: orphanUserIds } },
            select: { userId: true },
          });
          const stillLinkedIds = new Set(stillLinked.map((u: { userId: string }) => u.userId));
          const toDelete = orphanUserIds.filter((id: string) => !stillLinkedIds.has(id));
          if (toDelete.length > 0) {
            await prisma.session.deleteMany({ where: { userId: { in: toDelete } } }).catch(() => {});
            await prisma.loginLog.deleteMany({ where: { userId: { in: toDelete } } }).catch(() => {});
            await prisma.auditLog.deleteMany({ where: { userId: { in: toDelete } } }).catch(() => {});
            await prisma.activityLog.deleteMany({ where: { userId: { in: toDelete } } }).catch(() => {});
            await prisma.user.deleteMany({ where: { id: { in: toDelete } } }).catch(() => {});
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
