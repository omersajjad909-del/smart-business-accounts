import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // ── Overdue Receivables (Sales invoices past due date) ──
    const salesInvoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true, invoiceNo: true, date: true, total: true,
        customer: { select: { id: true, name: true, creditDays: true } },
      },
      orderBy: { date: "asc" },
      take: 50,
    });

    const overdueReceivables = salesInvoices
      .map(inv => {
        const credit = inv.customer?.creditDays ?? 30;
        const due = new Date(inv.date);
        due.setDate(due.getDate() + credit);
        const daysOverdue = Math.floor((now.getTime() - due.getTime()) / 86400000);
        return { id: inv.id, invoiceNo: inv.invoiceNo, party: inv.customer?.name || "—", amount: Number(inv.total || 0), dueDate: due.toISOString().slice(0, 10), daysOverdue };
      })
      .filter(r => r.daysOverdue > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // ── Due Soon (Purchase invoices due within 7 days, not yet overdue) ──
    const purchaseInvoices = await prisma.purchaseInvoice.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true, invoiceNo: true, date: true, total: true,
        supplier: { select: { id: true, name: true, creditDays: true } },
      },
      orderBy: { date: "asc" },
      take: 100,
    });

    const dueSoon = purchaseInvoices
      .map(inv => {
        const credit = inv.supplier?.creditDays ?? 30;
        const due = new Date(inv.date);
        due.setDate(due.getDate() + credit);
        const daysLeft = Math.floor((due.getTime() - now.getTime()) / 86400000);
        return { id: inv.id, invoiceNo: inv.invoiceNo, party: inv.supplier?.name || "—", amount: Number(inv.total || 0), dueDate: due.toISOString().slice(0, 10), daysLeft };
      })
      .filter(r => r.daysLeft >= 0 && r.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);

    // ── Bank Balances ──
    const banks = await prisma.bankAccount.findMany({
      where: { companyId },
      select: { id: true, bankName: true, accountName: true, balance: true },
      orderBy: { balance: "desc" },
      take: 4,
    });

    return NextResponse.json({ overdueReceivables, dueSoon, banks });
  } catch (e: any) {
    console.error("DUE THIS WEEK ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
