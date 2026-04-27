import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const today = new Date();

    // All customer accounts with credit limit
    const customers = await prisma.account.findMany({
      where: { companyId, type: "RECEIVABLE", deletedAt: null },
      select: { id: true, name: true, creditLimit: true, creditDays: true },
    });

    // Total invoiced per customer
    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null },
      select: { customerId: true, total: true, date: true },
    });

    // Total received per customer
    const receipts = await prisma.paymentReceipt.findMany({
      where: { companyId, deletedAt: null },
      select: { partyId: true, amount: true, date: true },
    });

    const invoicedByCustomer = new Map<string, { total: number; invoices: { date: Date; total: number }[] }>();
    for (const inv of invoices) {
      if (!invoicedByCustomer.has(inv.customerId)) invoicedByCustomer.set(inv.customerId, { total: 0, invoices: [] });
      const rec = invoicedByCustomer.get(inv.customerId)!;
      rec.total += inv.total;
      rec.invoices.push({ date: inv.date, total: inv.total });
    }

    const receivedByCustomer = new Map<string, { total: number; dates: Date[] }>();
    for (const r of receipts) {
      if (!r.partyId) continue;
      if (!receivedByCustomer.has(r.partyId)) receivedByCustomer.set(r.partyId, { total: 0, dates: [] });
      receivedByCustomer.get(r.partyId)!.total += r.amount;
      receivedByCustomer.get(r.partyId)!.dates.push(r.date);
    }

    const rows = customers
      .map((c) => {
        const invoicedData = invoicedByCustomer.get(c.id);
        const receivedData = receivedByCustomer.get(c.id);
        const totalInvoiced = invoicedData?.total || 0;
        const totalReceived = receivedData?.total || 0;
        const outstanding = Math.max(0, totalInvoiced - totalReceived);
        const creditLimit = c.creditLimit || 0;
        const utilizationPct = creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0;

        // Overdue: invoices past creditDays with no payment
        const creditDays = c.creditDays || 30;
        let overdueAmount = 0;
        for (const inv of (invoicedData?.invoices || [])) {
          const dueDate = new Date(inv.date);
          dueDate.setDate(dueDate.getDate() + creditDays);
          if (today > dueDate) overdueAmount += inv.total;
        }
        overdueAmount = Math.max(0, overdueAmount - totalReceived);

        const avgDaysToPay = creditDays;
        const riskRating = utilizationPct > 100 ? "HIGH" : utilizationPct > 70 ? "MEDIUM" : overdueAmount > 0 ? "MEDIUM" : "LOW";

        return { customerName: c.name, creditLimit, outstanding, utilizationPct, avgDaysToPay, overdueAmount, riskRating };
      })
      .filter((r) => r.outstanding > 0 || r.creditLimit > 0)
      .sort((a, b) => b.outstanding - a.outstanding);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("CREDIT ANALYSIS ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
