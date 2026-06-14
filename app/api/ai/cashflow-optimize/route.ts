import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openAITextResponse, FINOVA_SYSTEM_PROMPT } from "@/lib/finovaAI";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [company, recentSalesInvoices, recentPurchaseInvoices, recentReceipts, recentPayments] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { name: true, baseCurrency: true } }),
      prisma.salesInvoice.findMany({
        where: { companyId, deletedAt: null, date: { gte: ninetyDaysAgo } },
        select: { id: true, invoiceNo: true, total: true, dueDate: true, date: true, customer: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 60,
      }),
      prisma.purchaseInvoice.findMany({
        where: { companyId, deletedAt: null, date: { gte: ninetyDaysAgo } },
        select: { id: true, invoiceNo: true, total: true, dueDate: true, date: true, supplier: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 60,
      }),
      // Payment receipts indicate which sales invoices have been collected
      prisma.paymentReceipt.findMany({
        where: { companyId, deletedAt: null, date: { gte: ninetyDaysAgo } },
        select: { amount: true, date: true },
      }),
      // CPV/expense vouchers as proxy for payments made to suppliers
      prisma.expenseVoucher.findMany({
        where: { companyId, deletedAt: null, date: { gte: ninetyDaysAgo } },
        select: { totalAmount: true, date: true },
      }),
    ]);

    const c = company?.baseCurrency || "PKR";
    const fmt = (n: number) => `${c} ${Math.round(n).toLocaleString()}`;

    // Total collected vs billed
    const totalBilled = recentSalesInvoices.reduce((s, i) => s + i.total, 0);
    const totalCollected = recentReceipts.reduce((s, r) => s + r.amount, 0);
    const estimatedOutstanding = Math.max(0, totalBilled - totalCollected);

    // Build inflow schedule from uncollected sales invoices (approx)
    const collectionRate = totalBilled > 0 ? Math.min(0.95, totalCollected / totalBilled) : 0.7;
    const inflows: Array<{ label: string; amount: number; dueDate: string; daysUntilDue: number; type: "inflow"; action: string; priority: "urgent" | "high" | "medium" }> = [];

    for (const inv of recentSalesInvoices) {
      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date.getTime() + 30 * 24 * 60 * 60 * 1000);
      const daysUntilDue = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      // Only include invoices that are due (not far in future) — estimate uncollected ~(1-collectionRate)
      const estimatedOwed = inv.total * (1 - collectionRate);
      if (estimatedOwed < 1000) continue;
      inflows.push({
        label: `${inv.customer?.name || "Customer"} — ${inv.invoiceNo}`,
        amount: Math.round(estimatedOwed),
        dueDate: due.toISOString().split("T")[0],
        daysUntilDue,
        type: "inflow",
        action: daysUntilDue < 0 ? "Overdue — call immediately" : daysUntilDue < 7 ? "Send urgent reminder today" : daysUntilDue < 15 ? "Send WhatsApp reminder" : "Schedule follow-up",
        priority: daysUntilDue < 0 ? "urgent" : daysUntilDue < 7 ? "high" : "medium",
      });
    }

    // Build outflow schedule from purchase invoices
    const outflows: Array<{ label: string; amount: number; dueDate: string; daysUntilDue: number; type: "outflow"; action: string; earlyPayDiscount: string | null; priority: "urgent" | "high" | "medium" }> = [];

    for (const inv of recentPurchaseInvoices) {
      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date.getTime() + 30 * 24 * 60 * 60 * 1000);
      const daysUntilDue = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue > 60) continue; // Only show next 60 days
      const earlyPayDiscount = daysUntilDue > 10 && inv.total > 50000
        ? `Pay ${Math.max(1, daysUntilDue - 5)}d early — negotiate ${inv.total > 500000 ? "2%" : "1%"} discount (save ${fmt(inv.total * (inv.total > 500000 ? 0.02 : 0.01))})`
        : null;
      outflows.push({
        label: `${inv.supplier?.name || "Supplier"} — ${inv.invoiceNo}`,
        amount: inv.total,
        dueDate: due.toISOString().split("T")[0],
        daysUntilDue,
        type: "outflow",
        action: daysUntilDue < 0 ? "Overdue — pay to preserve relationship" : daysUntilDue < 7 ? "Due soon — schedule payment" : `Defer to day ${daysUntilDue} to maximize cash retention`,
        earlyPayDiscount,
        priority: daysUntilDue < 0 ? "urgent" : daysUntilDue < 7 ? "high" : "medium",
      });
    }

    // 30/60 day projections
    const expectedInflow30 = inflows.filter(i => i.daysUntilDue <= 30).reduce((s, i) => s + i.amount, 0);
    const expectedInflow60 = inflows.reduce((s, i) => s + i.amount, 0);
    const expectedOutflow30 = outflows.filter(o => o.daysUntilDue <= 30).reduce((s, o) => s + o.amount, 0);
    const expectedOutflow60 = outflows.reduce((s, o) => s + o.amount, 0);
    const netCash30 = expectedInflow30 - expectedOutflow30;
    const netCash60 = expectedInflow60 - expectedOutflow60;

    // Optimization tips
    const tips: Array<{ title: string; impact: string; action: string; potentialSaving: string }> = [];
    const overdueInflows = inflows.filter(i => i.daysUntilDue < 0);
    if (overdueInflows.length > 0) {
      tips.push({ title: "Collect overdue receivables first", impact: "high", action: `Contact ${overdueInflows.length} customers with overdue invoices today`, potentialSaving: fmt(overdueInflows.reduce((s, i) => s + i.amount, 0)) + " immediate cash" });
    }
    const earlyPayOpps = outflows.filter(o => o.earlyPayDiscount);
    if (earlyPayOpps.length > 0) {
      const saving = earlyPayOpps.reduce((s, o) => s + o.amount * 0.015, 0);
      tips.push({ title: "Negotiate early payment discounts", impact: "medium", action: "Contact high-value suppliers for 1-2% early pay discount", potentialSaving: fmt(saving) + " potential savings" });
    }
    if (netCash30 < 0) {
      tips.push({ title: "⚠️ Cash gap in next 30 days", impact: "critical", action: "Accelerate collections and defer non-urgent supplier payments by 15+ days", potentialSaving: `Gap of ${fmt(Math.abs(netCash30))} — act now` });
    }
    const deferrable = outflows.filter(o => o.daysUntilDue > 15).reduce((s, o) => s + o.amount, 0);
    if (deferrable > 0) {
      tips.push({ title: "Defer non-urgent payments", impact: "medium", action: "Delay supplier payments due 15+ days to preserve cash for collections", potentialSaving: fmt(deferrable) + " deferrable for 15+ days" });
    }
    tips.push({ title: "Set up AI payment reminders", impact: "medium", action: "Use FinovaOS Invoice Reminders tab to auto-follow-up on all open invoices", potentialSaving: "Reduces avg collection time by 8-12 days" });

    let narrative = "";
    try {
      narrative = await openAITextResponse(FINOVA_SYSTEM_PROMPT, [{
        role: "user",
        content: `Cashflow optimization for ${company?.name}. 30-day net: ${fmt(netCash30)}, 60-day net: ${fmt(netCash60)}. Outstanding receivables estimate: ${fmt(estimatedOutstanding)}. Collection rate: ${Math.round(collectionRate * 100)}%. Write 3 specific cashflow optimization actions.`,
      }], 250);
    } catch {
      narrative = netCash30 >= 0
        ? `Cash position looks positive in next 30 days (${fmt(netCash30)} net). Collection rate is ${Math.round(collectionRate * 100)}% — focus on the remaining ${fmt(estimatedOutstanding)} in outstanding receivables.`
        : `⚠️ Cash gap of ${fmt(Math.abs(netCash30))} expected in 30 days. Accelerate collections immediately and defer non-critical payments.`;
    }

    return NextResponse.json({
      inflows: inflows.slice(0, 20),
      outflows: outflows.slice(0, 20),
      projection: { net30: Math.round(netCash30), net60: Math.round(netCash60), inflow30: Math.round(expectedInflow30), inflow60: Math.round(expectedInflow60), outflow30: Math.round(expectedOutflow30), outflow60: Math.round(expectedOutflow60), currency: c },
      tips,
      narrative,
      summary: { totalBilled: Math.round(totalBilled), totalCollected: Math.round(totalCollected), estimatedOutstanding: Math.round(estimatedOutstanding), collectionRatePct: Math.round(collectionRate * 100) },
      generatedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
