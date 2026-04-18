import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;

  if (!payload?.userId || payload.role !== "ADMIN" || !payload.isTestMode) {
    return NextResponse.json({ error: "Only callable in test mode" }, { status: 403 });
  }

  const companyId = payload.companyId as string;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Ledger entries
      await tx.ledgerEntry.deleteMany({ where: { companyId } });

      // 2. Audit logs
      await tx.auditLog.deleteMany({ where: { companyId } });

      // 3. Login logs
      await tx.loginLog.deleteMany({ where: { companyId } });

      // 4. VoucherEntry (companyId nullable, must be before Voucher + Account)
      await tx.voucherEntry.deleteMany({ where: { companyId } });

      // 5. BulkPaymentBatch (cascades BulkPaymentRow)
      await tx.bulkPaymentBatch.deleteMany({ where: { companyId } });

      // 6. PaymentFollowUpLog
      await tx.paymentFollowUpLog.deleteMany({ where: { companyId } });

      // 7. BusinessRecord
      await tx.businessRecord.deleteMany({ where: { companyId } });

      // 8. TeamInvite
      await tx.teamInvite.deleteMany({ where: { companyId } });

      // 9. BackupSchedule
      await tx.backupSchedule.deleteMany({ where: { companyId } });

      // 10. SystemBackup
      await tx.systemBackup.deleteMany({ where: { companyId } });

      // 11. DepartmentBudget
      await tx.departmentBudget.deleteMany({ where: { companyId } });

      // 12. FinancialYear
      await tx.financialYear.deleteMany({ where: { companyId } });

      // 13. Currency (delete CurrencyTransaction first — no companyId on it)
      const currencies = await tx.currency.findMany({ where: { companyId }, select: { id: true } });
      if (currencies.length > 0) {
        await tx.currencyTransaction.deleteMany({ where: { currencyId: { in: currencies.map(c => c.id) } } });
      }
      await tx.currency.deleteMany({ where: { companyId } });

      // 14. TaxConfiguration (TaxAccount cascades, but InvoiceTax does not)
      const taxConfigs = await tx.taxConfiguration.findMany({ where: { companyId }, select: { id: true } });
      if (taxConfigs.length > 0) {
        await tx.invoiceTax.deleteMany({ where: { taxConfigurationId: { in: taxConfigs.map(t => t.id) } } });
      }
      await tx.taxConfiguration.deleteMany({ where: { companyId } });

      // 15. ExpenseVoucher (cascades ExpenseItem, ExpenseAttachment, ExpenseApproval)
      await tx.expenseVoucher.deleteMany({ where: { companyId } });

      // 16. PaymentReceipt
      await tx.paymentReceipt.deleteMany({ where: { companyId } });

      // 17. BankAccount children, then BankAccount
      const bankAccounts = await tx.bankAccount.findMany({ where: { companyId }, select: { id: true } });
      if (bankAccounts.length > 0) {
        const baIds = bankAccounts.map(b => b.id);
        await tx.bankStatement.deleteMany({ where: { bankAccountId: { in: baIds } } });
        await tx.bankReconciliation.deleteMany({ where: { bankAccountId: { in: baIds } } });
      }
      await tx.bankAccount.deleteMany({ where: { companyId } });

      // 18. AdvancePayment children, then AdvancePayment
      const advances = await tx.advancePayment.findMany({ where: { companyId }, select: { id: true } });
      if (advances.length > 0) {
        await tx.advanceAdjustment.deleteMany({ where: { advancePaymentId: { in: advances.map(a => a.id) } } });
      }
      await tx.advancePayment.deleteMany({ where: { companyId } });

      // 19. Contact (cascades Interaction, Opportunity, OpportunityActivity, ContactDocument, ContactNote)
      await tx.contact.deleteMany({ where: { companyId } });

      // 20. Employee (cascades Attendance, Leave, Payroll, AdvanceSalary, EmployeeDocument)
      await tx.employee.deleteMany({ where: { companyId } });

      // 21. Budget (accountId FK — must be before Account)
      await tx.budget.deleteMany({ where: { companyId } });

      // 22. RecurringTransaction
      await tx.recurringTransaction.deleteMany({ where: { companyId } });

      // 23. Loan (cascades LoanPayment)
      await tx.loan.deleteMany({ where: { companyId } });

      // 24. FixedAsset (cascades Depreciation)
      await tx.fixedAsset.deleteMany({ where: { companyId } });

      // 25. CreditNote / DebitNote
      await tx.creditNote.deleteMany({ where: { companyId } });
      await tx.debitNote.deleteMany({ where: { companyId } });

      // 26. GoodsReceiptNote (cascades GoodsReceiptNoteItem)
      await tx.goodsReceiptNote.deleteMany({ where: { companyId } });

      // 27. Outward + OutwardItem (no cascade on OutwardItem)
      const outwards = await tx.outward.findMany({ where: { companyId }, select: { id: true } });
      if (outwards.length > 0) {
        await tx.outwardItem.deleteMany({ where: { outwardId: { in: outwards.map(o => o.id) } } });
      }
      await tx.outward.deleteMany({ where: { companyId } });

      // 28. SaleReturn + SaleReturnItem
      const saleReturns = await tx.saleReturn.findMany({ where: { companyId }, select: { id: true } });
      if (saleReturns.length > 0) {
        await tx.saleReturnItem.deleteMany({ where: { returnId: { in: saleReturns.map(r => r.id) } } });
      }
      await tx.saleReturn.deleteMany({ where: { companyId } });

      // 29. SalesInvoice + SalesInvoiceItem
      const salesInvoices = await tx.salesInvoice.findMany({ where: { companyId }, select: { id: true } });
      if (salesInvoices.length > 0) {
        await tx.salesInvoiceItem.deleteMany({ where: { invoiceId: { in: salesInvoices.map(i => i.id) } } });
      }
      await tx.salesInvoice.deleteMany({ where: { companyId } });

      // 30. DeliveryChallan (cascades DeliveryChallanItem)
      await tx.deliveryChallan.deleteMany({ where: { companyId } });

      // 31. Quotation (cascades QuotationItem)
      await tx.quotation.deleteMany({ where: { companyId } });

      // 32. PurchaseInvoice + PurchaseInvoiceItem
      const purchaseInvoices = await tx.purchaseInvoice.findMany({ where: { companyId }, select: { id: true } });
      if (purchaseInvoices.length > 0) {
        await tx.purchaseInvoiceItem.deleteMany({ where: { invoiceId: { in: purchaseInvoices.map(i => i.id) } } });
      }
      await tx.purchaseInvoice.deleteMany({ where: { companyId } });

      // 33. PurchaseOrder + PurchaseOrderItem
      const purchaseOrders = await tx.purchaseOrder.findMany({ where: { companyId }, select: { id: true } });
      if (purchaseOrders.length > 0) {
        await tx.purchaseOrderItem.deleteMany({ where: { poId: { in: purchaseOrders.map(p => p.id) } } });
      }
      await tx.purchaseOrder.deleteMany({ where: { companyId } });

      // 34. InventoryTxn + StockRate
      await tx.inventoryTxn.deleteMany({ where: { companyId } });
      await tx.stockRate.deleteMany({ where: { companyId } });

      // 35. Voucher (VoucherEntry already gone)
      await tx.voucher.deleteMany({ where: { companyId } });

      // 36. Account + ItemNew (all transactional FKs are gone now)
      await tx.account.deleteMany({ where: { companyId } });
      await tx.itemNew.deleteMany({ where: { companyId } });

      // 37. Branch + CostCenter
      await tx.branch.deleteMany({ where: { companyId } });
      await tx.costCenter.deleteMany({ where: { companyId } });

      // 38. Permissions
      await tx.userPermission.deleteMany({ where: { companyId } });
      await tx.rolePermission.deleteMany({ where: { companyId } });

      // 39. Subscription
      await tx.subscription.deleteMany({ where: { companyId } });

      // 40. ActivityLog — keep the DEV TEST COMPANY marker, delete everything else
      await tx.activityLog.deleteMany({
        where: { companyId, action: { not: "ADMIN_DEV_TEST_COMPANY" } },
      });
    }, { timeout: 60_000 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[dev-test/clear]", err);
    return NextResponse.json({ error: err.message || "Clear failed" }, { status: 500 });
  }
}
