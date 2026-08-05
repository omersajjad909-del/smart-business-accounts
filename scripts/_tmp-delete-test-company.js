// One-off script mirroring app/api/admin/companies/actions/route.ts (action=DELETE)
// Target: ONLY the test "Sajjad Enterprises" created 2026-08-04 (owner umersajjad981@gmail.com)
// NOT the real, long-standing "Sajjad Enterprises" (owner mrsumer981@gmail.com, since April).
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const companyId = "201a6684-c3ab-44f0-831a-01e35c16d278";

async function main() {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, createdAt: true } });
  if (!company) { console.log("Company not found — already deleted?"); return; }
  const owner = await prisma.userCompany.findFirst({ where: { companyId }, select: { user: { select: { email: true } } } });
  console.log("About to delete:", company.name, company.id, "created", company.createdAt, "owner:", owner?.user?.email);
  if (company.createdAt.toISOString() < "2026-08-01") {
    throw new Error("SAFETY ABORT: this company predates the test signup window — refusing to delete.");
  }

  const orphanUsers = await prisma.userCompany.findMany({ where: { companyId }, select: { userId: true } });
  const orphanUserIds = orphanUsers.map((u) => u.userId);

  await prisma.user.updateMany({ where: { defaultCompanyId: companyId }, data: { defaultCompanyId: null } });

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
    prisma.advanceAdjustment?.deleteMany?.({ where: { advancePayment: { companyId } } }),
    prisma.goodsReceiptNoteItem?.deleteMany?.({ where: { grn: { companyId } } }),
    prisma.leave?.deleteMany?.({ where: { employee: { companyId } } }),
    prisma.employeeDocument?.deleteMany?.({ where: { employee: { companyId } } }),
    prisma.opportunityActivity?.deleteMany?.({ where: { opportunity: { contact: { companyId } } } }),
    prisma.opportunity?.deleteMany?.({ where: { contact: { companyId } } }),
    prisma.interaction?.deleteMany?.({ where: { contact: { companyId } } }),
    prisma.contactDocument?.deleteMany?.({ where: { contact: { companyId } } }),
    prisma.contactNote?.deleteMany?.({ where: { contact: { companyId } } }),
  ]);

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
    prisma.goodsReceiptNote?.deleteMany?.({ where: { companyId } }),
    prisma.systemBackup?.deleteMany?.({ where: { companyId } }),
  ]);

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

  await prisma.company.delete({ where: { id: companyId } });

  if (orphanUserIds.length > 0) {
    const stillLinked = await prisma.userCompany.findMany({ where: { userId: { in: orphanUserIds } }, select: { userId: true } });
    const stillLinkedIds = new Set(stillLinked.map((u) => u.userId));
    const toDelete = orphanUserIds.filter((id) => !stillLinkedIds.has(id));
    if (toDelete.length > 0) {
      await Promise.allSettled([
        prisma.session.deleteMany({ where: { userId: { in: toDelete } } }),
        prisma.loginLog.deleteMany({ where: { userId: { in: toDelete } } }),
        prisma.auditLog.deleteMany({ where: { userId: { in: toDelete } } }),
        prisma.activityLog.deleteMany({ where: { userId: { in: toDelete } } }),
      ]);
      await prisma.user.deleteMany({ where: { id: { in: toDelete } } });
    }
    console.log("Deleted orphan users:", toDelete);
  }

  console.log("Company deleted successfully:", company.name);
}

main().catch((e) => { console.error("ERROR:", e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
