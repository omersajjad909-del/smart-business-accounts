import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getBaseAmounts, resolveAmount, sumWithCurrency } from "@/lib/currencyHelper";

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(req: NextRequest) {
  try {
    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company context required" }, { status: 400 });

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_FINANCIAL_REPORTS, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    if (!customerId) return NextResponse.json({ error: "customerId is required" }, { status: 400 });

    const fromDate = from ? new Date(from + "T00:00:00") : new Date(new Date().getFullYear() + "-01-01T00:00:00");
    const toDate   = to   ? new Date(to + "T23:59:59.999") : new Date();

    const customer = await prisma.account.findFirst({
      where: { id: customerId, companyId, partyType: "CUSTOMER", deletedAt: null },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    // Opening balance = invoices - payments BEFORE fromDate (currency-aware)
    const [prevInvoices, prevPmtAgg] = await Promise.all([
      prisma.salesInvoice.findMany({
        where: { customerId, companyId, date: { lt: fromDate }, deletedAt: null },
        select: { id: true, total: true },
      }),
      prisma.paymentReceipt.aggregate({
        where: { partyId: customerId, companyId, date: { lt: fromDate }, deletedAt: null },
        _sum: { amount: true },
      }),
    ]);
    const prevBaseAmounts = await getBaseAmounts(prevInvoices.map((i) => i.id));
    const prevInvTotal = sumWithCurrency(prevInvoices, prevBaseAmounts);
    const openingBalance = prevInvTotal - Number(prevPmtAgg._sum.amount || 0);

    // Period transactions
    const [invoices, payments] = await Promise.all([
      prisma.salesInvoice.findMany({
        where: { customerId, companyId, date: { gte: fromDate, lte: toDate }, deletedAt: null },
        orderBy: { date: "asc" },
      }),
      prisma.paymentReceipt.findMany({
        where: { partyId: customerId, companyId, date: { gte: fromDate, lte: toDate }, deletedAt: null },
        orderBy: { date: "asc" },
      }),
    ]);

    // Resolve base-currency amounts for period invoices
    const periodBaseAmounts = await getBaseAmounts(invoices.map((i) => i.id));

    type RawRow = { date: string; ref: string; type: "Invoice" | "Payment"; description: string; debit: number; credit: number };
    const raw: RawRow[] = [
      ...invoices.map((inv) => ({ date: new Date(inv.date).toISOString().slice(0, 10), ref: inv.invoiceNo, type: "Invoice" as const, description: "Sales Invoice", debit: resolveAmount(inv.id, Number(inv.total), periodBaseAmounts), credit: 0 })),
      ...payments.map((pmt) => ({ date: new Date(pmt.date).toISOString().slice(0, 10), ref: pmt.receiptNo, type: "Payment" as const, description: pmt.narration || "Payment Received", debit: 0, credit: Number(pmt.amount) })),
    ];
    raw.sort((a, b) => a.date.localeCompare(b.date));

    let running = openingBalance;
    const rows = raw.map((r) => { running += r.debit - r.credit; return { ...r, balance: running }; });

    const totalInvoiced = sumWithCurrency(invoices, periodBaseAmounts);
    const totalReceived = payments.reduce((s, p) => s + Number(p.amount), 0);

    // Ageing (FIFO allocation across all time, currency-aware)
    const [allInv, allPmt] = await Promise.all([
      prisma.salesInvoice.findMany({ where: { customerId, companyId, deletedAt: null }, orderBy: { date: "asc" } }),
      prisma.paymentReceipt.findMany({ where: { partyId: customerId, companyId, deletedAt: null }, orderBy: { date: "asc" } }),
    ]);
    const allBaseAmounts = await getBaseAmounts(allInv.map((i) => i.id));
    let remainingCredit = allPmt.reduce((s, p) => s + Number(p.amount), 0);
    const ageing = { current: 0, days30: 0, days60: 0, days90plus: 0 };
    const today  = new Date();
    for (const inv of allInv) {
      const invAmt    = resolveAmount(inv.id, Number(inv.total), allBaseAmounts);
      const applied   = Math.min(remainingCredit, invAmt);
      remainingCredit = Math.max(0, remainingCredit - invAmt);
      const outstanding = invAmt - applied;
      if (outstanding <= 0) continue;
      const effectiveAge = Math.max(0, daysBetween(new Date(inv.date), today) - Number(customer.creditDays || 0));
      if      (effectiveAge <= 30) ageing.current += outstanding;
      else if (effectiveAge <= 60) ageing.days30  += outstanding;
      else if (effectiveAge <= 90) ageing.days60  += outstanding;
      else                         ageing.days90plus += outstanding;
    }

    return NextResponse.json({
      customer: { id: customer.id, name: customer.name, email: customer.email || null, phone: customer.phone || null, city: customer.city || null, creditDays: customer.creditDays || 0, creditLimit: customer.creditLimit || 0 },
      period: { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
      openingBalance, totalInvoiced, totalReceived, closingBalance: running, rows, ageing,
    });
  } catch (err) {
    console.error("CUSTOMER STATEMENT ERROR:", err);
    return NextResponse.json({ error: "Failed to generate customer statement" }, { status: 500 });
  }
}
