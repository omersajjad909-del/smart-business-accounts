import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const today = new Date();

    // Get all sales invoices
    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, creditDays: true } },
      },
      orderBy: { date: "asc" },
    });

    // Get total payments received per customer (positive entries on customer accounts)
    const receipts = await prisma.paymentReceipt.findMany({
      where: { companyId, deletedAt: null },
      select: { partyId: true, amount: true, date: true },
    });

    const paidByCustomer = new Map<string, number>();
    for (const r of receipts) {
      if (r.partyId) {
        paidByCustomer.set(r.partyId, (paidByCustomer.get(r.partyId) || 0) + r.amount);
      }
    }

    // Get returns to subtract
    const returns = await prisma.saleReturn.findMany({
      where: { companyId },
      select: { customerId: true, total: true },
    });
    const returnsByCustomer = new Map<string, number>();
    for (const r of returns) {
      returnsByCustomer.set(r.customerId, (returnsByCustomer.get(r.customerId) || 0) + r.total);
    }

    // Build outstanding picture per invoice
    const totalInvoicedByCustomer = new Map<string, number>();
    for (const inv of invoices) {
      totalInvoicedByCustomer.set(inv.customerId, (totalInvoicedByCustomer.get(inv.customerId) || 0) + inv.total);
    }

    const rows: any[] = [];

    for (const inv of invoices) {
      const creditDays = inv.customer?.creditDays || 30;
      const dueDate = new Date(inv.date);
      dueDate.setDate(dueDate.getDate() + creditDays);

      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue <= 0) continue;

      const totalInvoiced = totalInvoicedByCustomer.get(inv.customerId) || 0;
      const totalPaid = paidByCustomer.get(inv.customerId) || 0;
      const totalReturned = returnsByCustomer.get(inv.customerId) || 0;
      const outstanding = totalInvoiced - totalPaid - totalReturned;

      if (outstanding <= 0) continue;

      const status = daysOverdue > 180 ? "Bad Debt" : daysOverdue > 90 ? "Doubtful" : "Overdue";

      rows.push({
        customerName: inv.customer?.name || "Unknown",
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.date,
        dueDate,
        amount: outstanding,
        daysOverdue,
        status,
      });
    }

    rows.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return NextResponse.json({ rows: rows.slice(0, 100) });
  } catch (e: any) {
    console.error("BAD DEBTS ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
