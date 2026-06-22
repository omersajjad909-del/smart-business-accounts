import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const userRole = req.headers.get("x-user-role");
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  let data: any;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON file. Please upload a valid backup file." }, { status: 400 });
  }

  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Backup file is empty or invalid." }, { status: 400 });
  }

  // Safety: reject if backup belongs to a different company
  if (data.companyId && data.companyId !== companyId) {
    return NextResponse.json({ error: "This backup belongs to a different company and cannot be restored here." }, { status: 403 });
  }

  // Basic structure check — must have at least one recognisable key
  const knownKeys = ["accounts", "items", "vouchers", "salesInvoices", "purchaseInvoices", "bankAccounts"];
  const hasKnownKey = knownKeys.some(k => Array.isArray(data[k]));
  if (!hasKnownKey) {
    return NextResponse.json({ error: "File does not appear to be a valid FinovaOS backup." }, { status: 400 });
  }

  try {
    // Delete current company data (scoped — no other company affected)
    await prisma.voucherEntry.deleteMany({ where: { voucher: { companyId } } });
    await prisma.voucher.deleteMany({ where: { companyId } });
    await prisma.salesInvoiceItem.deleteMany({ where: { invoice: { companyId } } });
    await prisma.salesInvoice.deleteMany({ where: { companyId } });
    await prisma.purchaseInvoiceItem.deleteMany({ where: { invoice: { companyId } } });
    await prisma.purchaseInvoice.deleteMany({ where: { companyId } });
    await prisma.purchaseOrderItem.deleteMany({ where: { po: { companyId } } });
    await prisma.purchaseOrder.deleteMany({ where: { companyId } });
    await prisma.expenseItem.deleteMany({ where: { expenseVoucher: { companyId } } });
    await prisma.expenseVoucher.deleteMany({ where: { companyId } });
    await prisma.paymentReceipt.deleteMany({ where: { companyId } });
    await prisma.bankStatement.deleteMany({ where: { companyId } });
    await prisma.bankReconciliation.deleteMany({ where: { bankAccount: { companyId } } });
    await prisma.bankAccount.deleteMany({ where: { companyId } });
    await prisma.recurringTransaction.deleteMany({ where: { companyId } });
    await prisma.budget.deleteMany({ where: { companyId } });
    await prisma.itemNew.deleteMany({ where: { companyId } });
    await prisma.account.deleteMany({ where: { companyId } });

    const restore = async (items: any[], creator: (d: any) => Promise<any>) => {
      for (const item of (items || [])) {
        try { await creator(item); } catch (e: any) {
          console.warn("Restore skip:", e.message);
        }
      }
    };

    await restore(data.accounts,             (d) => prisma.account.create({ data: { ...d, companyId } }));
    await restore(data.items,                (d) => prisma.itemNew.create({ data: { ...d, companyId } }));
    await restore(data.bankAccounts,         (d) => prisma.bankAccount.create({ data: { ...d, companyId } }));
    await restore(data.budgets,              (d) => prisma.budget.create({ data: { ...d, companyId } }));
    await restore(data.recurringTransactions,(d) => prisma.recurringTransaction.create({ data: { ...d, companyId } }));

    for (const si of (data.salesInvoices || [])) {
      try {
        const { items: siItems, ...inv } = si;
        const created = await prisma.salesInvoice.create({ data: { ...inv, companyId } });
        await restore(siItems, (d) => prisma.salesInvoiceItem.create({ data: { ...d, invoiceId: created.id } }));
      } catch (e: any) { console.warn("SI restore skip:", e.message); }
    }

    for (const pi of (data.purchaseInvoices || [])) {
      try {
        const { items: piItems, ...inv } = pi;
        const created = await prisma.purchaseInvoice.create({ data: { ...inv, companyId } });
        await restore(piItems, (d) => prisma.purchaseInvoiceItem.create({ data: { ...d, invoiceId: created.id } }));
      } catch (e: any) { console.warn("PI restore skip:", e.message); }
    }

    for (const v of (data.vouchers || [])) {
      try {
        const { entries, ...vd } = v;
        const created = await prisma.voucher.create({ data: { ...vd, companyId } });
        await restore(entries, (d) => prisma.voucherEntry.create({ data: { ...d, voucherId: created.id } }));
      } catch (e: any) { console.warn("Voucher restore skip:", e.message); }
    }

    return NextResponse.json({ success: true, message: "Data restored successfully from uploaded file." });
  } catch (error: any) {
    return NextResponse.json({ error: `Restore failed: ${error.message}` }, { status: 500 });
  }
}
